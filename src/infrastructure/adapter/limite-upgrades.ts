import { Cupo } from '../../application/validations/cupo.validation.js';

export class LimiteUpgradesAdapter {
  private readonly entradas = new Map<string, { cupo: Cupo; usado: number }>();
  private readonly global: Cupo;
  constructor(ahora: number, private readonly maximo = 128, private readonly ttl = 60000) {
    this.global = new Cupo(40, 10, ahora);
  }
  admitir(ip: string | undefined, ahora: number): boolean {
    for (const [clave, entrada] of this.entradas) if (ahora - entrada.usado >= this.ttl) this.entradas.delete(clave);
    if (!this.global.admitir(ahora)) return false;
    if (!ip) return false;
    let entrada = this.entradas.get(ip);
    if (!entrada) {
      if (this.entradas.size >= this.maximo) return false;
      entrada = { cupo: new Cupo(20, 2, ahora), usado: ahora };
      this.entradas.set(ip, entrada);
    }
    entrada.usado = ahora;
    return entrada.cupo.admitir(ahora);
  }
  get cantidad(): number { return this.entradas.size; }
}
