import type { RelojSalida } from '../../domain/ports/portout/reloj.port.js';
import type { EntropiaEncuentroSalida } from '../../domain/ports/portout/entropia-encuentro.port.js';
import type { IdentidadEncuentro, OfertaEncuentro, VerificacionEncuentroSalida } from '../../domain/ports/portout/verificacion-encuentro.port.js';
import type { MensajeClienteC8, MensajeServidorC8, SalidaEncuentroC8 } from '../dtos/encuentro-c8.dto.js';

interface Participante {
  readonly inicio: number;
  readonly nonce: string;
  pruebaConsumida: boolean;
  identidad?: IdentidadEncuentro;
  ocupado: boolean;
  fallos: number;
  codigo?: string;
}

interface Encuentro {
  readonly limite: number;
  hijo?: string;
  padre?: string;
  oferta?: OfertaEncuentro;
  bytesOferta?: string;
  consumido: boolean;
  entregado: boolean;
}

export class CoordinarEncuentroC8 {
  private readonly participantes = new Map<string, Participante>();
  private readonly encuentros = new Map<string, Encuentro>();
  private ventana = 0;
  private intentos = 0;

  constructor(private readonly reloj: RelojSalida, private readonly entropia: EntropiaEncuentroSalida,
    private readonly verificar: VerificacionEncuentroSalida, private readonly origen: string) {}

  abrir(): SalidaEncuentroC8 {
    if (this.participantes.size >= 18) throw new Error('Cupo de encuentro agotado');
    const id = this.entropia.identificador();
    if (this.participantes.has(id)) throw new Error('Identificador repetido');
    const nonce = this.entropia.nonce();
    this.participantes.set(id, { inicio: this.reloj.ahora(), nonce, pruebaConsumida: false, ocupado: false, fallos: 0 });
    return this.salida(id, { v: 1, kind: 'CHALLENGE', connectionId: id, nonceB64: nonce, relayOrigin: this.origen });
  }

  ejecutar(id: string, mensaje: MensajeClienteC8): SalidaEncuentroC8[] {
    const p = this.participantes.get(id);
    const ahora = this.reloj.ahora();
    if (!p || ahora >= p.inicio + 120000) throw new Error('Sesión C8 no vigente');
    if (mensaje.kind === 'AUTH') {
      if (p.pruebaConsumida || ahora >= p.inicio + 10000) throw new Error('Prueba C8 no vigente');
      p.pruebaConsumida = true;
      p.identidad = this.verificar.prueba(mensaje.payloadB64, mensaje.sigB64, id, p.nonce, this.origen);
      return [this.salida(id, { v: 1, kind: 'READY' })];
    }
    if (!p.identidad) throw new Error('Falta prueba C8');
    if (mensaje.kind === 'CANCEL') return this.cerrar(id);
    if (mensaje.kind === 'PUBLISH') {
      if (p.identidad.rol !== 'CHILD' || p.ocupado) throw new Error('Publicación no autorizada');
      if (!Number.isInteger(mensaje.ttlMs) || mensaje.ttlMs < 1 || mensaje.ttlMs > 120000) throw new Error('Plazo inválido');
      const limite = p.inicio + mensaje.ttlMs;
      if (ahora >= limite || this.encuentros.size >= 16) return [this.salida(id, { v: 1, kind: 'UNAVAILABLE' }, true)];
      const oferta = this.verificar.oferta(mensaje.offerB64, p.identidad.publica);
      let codigo: string | undefined;
      for (let intento = 0; intento < 16; intento++) {
        const candidato = this.entropia.codigo();
        if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(candidato)) throw new Error('Entropía C8 inválida');
        if (!this.encuentros.has(candidato)) { codigo = candidato; break; }
      }
      if (!codigo) throw new Error('Colisión de encuentro');
      this.encuentros.set(codigo, { limite, hijo: id, oferta, bytesOferta: mensaje.offerB64, consumido: false, entregado: false });
      p.codigo = codigo;
      p.ocupado = true;
      return [this.salida(id, { v: 1, kind: 'CODE', code: codigo, remainingMs: Math.floor(limite - ahora) })];
    }
    if (mensaje.kind === 'CLAIM') {
      if (p.identidad.rol !== 'PARENT' || p.ocupado || p.fallos >= 5) throw new Error('Reclamación no autorizada');
      if (this.intentos === 0 || ahora >= this.ventana + 60000) { this.ventana = ahora; this.intentos = 0; }
      if (++this.intentos > 40) return [this.salida(id, { v: 1, kind: 'UNAVAILABLE' }, true)];
      const e = this.encuentros.get(mensaje.code);
      if (!e?.hijo || !e.oferta || e.consumido || ahora >= e.limite || e.oferta.publica === p.identidad.publica) {
        p.fallos++;
        return [this.salida(id, { v: 1, kind: 'UNAVAILABLE' }, p.fallos >= 5)];
      }
      e.consumido = true;
      e.padre = id;
      p.codigo = mensaje.code;
      p.ocupado = true;
      const remainingMs = Math.floor(e.limite - ahora);
      return [this.salida(id, { v: 1, kind: 'OFFER', offerB64: e.bytesOferta!, remainingMs }),
        this.salida(e.hijo, { v: 1, kind: 'CLAIMED', parentPublicKeyB64: p.identidad.publica, remainingMs })];
    }
    const e = p.codigo ? this.encuentros.get(p.codigo) : undefined;
    if (p.identidad.rol !== 'PARENT' || !e?.hijo || !e.oferta || e.padre !== id || e.entregado || ahora >= e.limite) {
      throw new Error('Entrega no autorizada');
    }
    this.verificar.aceptacion(mensaje.pairB64, p.identidad.publica, e.oferta, this.origen);
    if (this.reloj.ahora() >= e.limite) throw new Error('Entrega caducada');
    e.entregado = true;
    return [this.salida(e.hijo, { v: 1, kind: 'PAIR', pairB64: mensaje.pairB64 }), this.salida(id, { v: 1, kind: 'SENT' })];
  }

  cerrar(id: string): SalidaEncuentroC8[] {
    const p = this.participantes.get(id);
    this.participantes.delete(id);
    const e = p?.codigo ? this.encuentros.get(p.codigo) : undefined;
    const ids = new Set([id, e?.hijo, e?.padre]);
    if (e) {
      delete e.hijo;
      delete e.padre;
      delete e.oferta;
      delete e.bytesOferta;
      e.consumido = true;
    }
    const salidas: SalidaEncuentroC8[] = [];
    for (const destino of ids) {
      if (!destino) continue;
      this.participantes.delete(destino);
      salidas.push(this.salida(destino, { v: 1, kind: 'UNAVAILABLE' }, true));
    }
    return salidas;
  }

  limpiar(): SalidaEncuentroC8[] {
    const ahora = this.reloj.ahora();
    const salidas: SalidaEncuentroC8[] = [];
    for (const [id, p] of this.participantes) {
      if (ahora >= p.inicio + (p.identidad ? 120000 : 10000)) salidas.push(...this.cerrar(id));
    }
    for (const [codigo, e] of this.encuentros) {
      if (ahora < e.limite) continue;
      if (e.hijo) salidas.push(...this.cerrar(e.hijo));
      this.encuentros.delete(codigo);
    }
    return salidas;
  }

  private salida(connectionId: string, mensaje: MensajeServidorC8, cerrar = false): SalidaEncuentroC8 {
    return { connectionId, mensaje, cerrar };
  }
}
