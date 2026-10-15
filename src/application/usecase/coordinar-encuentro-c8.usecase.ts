import type { RelojSalida } from '../../domain/ports/portout/reloj.port.js';
import type { EntropiaEncuentroSalida } from '../../domain/ports/portout/entropia-encuentro.port.js';
import type { VerificacionEncuentroSalida } from '../../domain/ports/portout/verificacion-encuentro.port.js';
import type { IdentidadEncuentro } from '../../domain/entities/identidad-encuentro.js';
import type { OfertaEncuentro } from '../../domain/entities/oferta-encuentro.js';
import type { EntradaEncuentro } from '../../domain/entities/entrada-encuentro.js';
import { SalidaEncuentro } from '../../domain/entities/salida-encuentro.js';
import type { CoordinarEncuentroEntrada } from '../../domain/ports/portin/coordinar-encuentro.port.js';

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

export class CoordinarEncuentroC8 implements CoordinarEncuentroEntrada {
  private readonly participantes = new Map<string, Participante>();
  private readonly encuentros = new Map<string, Encuentro>();
  private ventana = 0;
  private intentos = 0;

  constructor(private readonly reloj: RelojSalida, private readonly entropia: EntropiaEncuentroSalida,
    private readonly verificar: VerificacionEncuentroSalida, private readonly origen: string) {}

  abrir(): SalidaEncuentro {
    if (this.participantes.size >= 18) throw new Error('Cupo de encuentro agotado');
    const id = this.entropia.identificador();
    if (this.participantes.has(id)) throw new Error('Identificador repetido');
    const nonce = this.entropia.nonce();
    this.participantes.set(id, { inicio: this.reloj.ahora(), nonce, pruebaConsumida: false, ocupado: false, fallos: 0 });
    return this.salida(id, 'CHALLENGE', { connectionId: id, nonceB64: nonce, relayOrigin: this.origen });
  }

  ejecutar(id: string, mensaje: EntradaEncuentro): SalidaEncuentro[] {
    const p = this.participantes.get(id);
    const ahora = this.reloj.ahora();
    if (!p || ahora >= p.inicio + 120000) throw new Error('Sesión C8 no vigente');
    if (mensaje.tipo === 'AUTH') {
      if (p.pruebaConsumida || ahora >= p.inicio + 10000) throw new Error('Prueba C8 no vigente');
      p.pruebaConsumida = true;
      const identidad = this.verificar.prueba(mensaje.carga!, mensaje.firma!, id, p.nonce, this.origen);
      if (this.reloj.ahora() >= p.inicio + 10000) throw new Error('Prueba C8 caducada');
      p.identidad = identidad;
      return [this.salida(id, 'READY')];
    }
    if (!p.identidad) throw new Error('Falta prueba C8');
    if (mensaje.tipo === 'CANCEL') return this.cerrar(id);
    if (mensaje.tipo === 'PUBLISH') {
      if (p.identidad.rol !== 'CHILD' || p.ocupado) throw new Error('Publicación no autorizada');
      if (!Number.isInteger(mensaje.plazo) || mensaje.plazo! < 1 || mensaje.plazo! > 120000) throw new Error('Plazo inválido');
      const limite = p.inicio + mensaje.plazo!;
      if (ahora >= limite || this.encuentros.size >= 16) return [this.salida(id, 'UNAVAILABLE', {}, true)];
      const oferta = this.verificar.oferta(mensaje.carga!, p.identidad.publica);
      let codigo: string | undefined;
      for (let intento = 0; intento < 16; intento++) {
        const candidato = this.entropia.codigo();
        if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(candidato)) throw new Error('Entropía C8 inválida');
        if (!this.encuentros.has(candidato)) { codigo = candidato; break; }
      }
      if (!codigo) throw new Error('Colisión de encuentro');
      const restante = Math.floor(limite - this.reloj.ahora());
      if (restante < 1) return [this.salida(id, 'UNAVAILABLE', {}, true)];
      this.encuentros.set(codigo, { limite, hijo: id, oferta, bytesOferta: mensaje.carga!, consumido: false, entregado: false });
      p.codigo = codigo;
      p.ocupado = true;
      return [this.salida(id, 'CODE', { code: codigo, remainingMs: restante })];
    }
    if (mensaje.tipo === 'CLAIM') {
      if (p.identidad.rol !== 'PARENT' || p.ocupado || p.fallos >= 5) throw new Error('Reclamación no autorizada');
      if (this.intentos === 0 || ahora >= this.ventana + 60000) { this.ventana = ahora; this.intentos = 0; }
      if (++this.intentos > 40) return [this.salida(id, 'UNAVAILABLE', {}, true)];
      const e = this.encuentros.get(mensaje.codigo!);
      if (!e?.hijo || !e.oferta || e.consumido || ahora >= e.limite || e.oferta.publica === p.identidad.publica) {
        p.fallos++;
        return [this.salida(id, 'UNAVAILABLE', {}, p.fallos >= 5)];
      }
      e.consumido = true;
      e.padre = id;
      p.codigo = mensaje.codigo!;
      p.ocupado = true;
      const remainingMs = Math.floor(e.limite - ahora);
      return [this.salida(id, 'OFFER', { offerB64: e.bytesOferta!, remainingMs }),
        this.salida(e.hijo, 'CLAIMED', { parentPublicKeyB64: p.identidad.publica, remainingMs })];
    }
    const e = p.codigo ? this.encuentros.get(p.codigo) : undefined;
    if (p.identidad.rol !== 'PARENT' || !e?.hijo || !e.oferta || e.padre !== id || e.entregado || ahora >= e.limite) {
      throw new Error('Entrega no autorizada');
    }
    if (mensaje.tipo !== 'SEND_PAIR') throw new Error('Operación C8 desconocida');
    this.verificar.aceptacion(mensaje.carga!, p.identidad.publica, e.oferta, this.origen);
    if (this.reloj.ahora() >= e.limite) throw new Error('Entrega caducada');
    e.entregado = true;
    return [this.salida(e.hijo, 'PAIR', { pairB64: mensaje.carga! }), this.salida(id, 'SENT')];
  }

  cerrar(id: string): SalidaEncuentro[] {
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
    const salidas: SalidaEncuentro[] = [];
    for (const destino of ids) {
      if (!destino) continue;
      this.participantes.delete(destino);
      salidas.push(this.salida(destino, 'UNAVAILABLE', {}, true));
    }
    return salidas;
  }

  limpiar(): SalidaEncuentro[] {
    const ahora = this.reloj.ahora();
    const salidas: SalidaEncuentro[] = [];
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

  private salida(connectionId: string, tipo: SalidaEncuentro['tipo'], datos: SalidaEncuentro['datos'] = {}, cerrar = false): SalidaEncuentro {
    return new SalidaEncuentro(connectionId, tipo, datos, cerrar);
  }
}
