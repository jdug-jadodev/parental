import type { RetoAutenticacion } from '../../domain/entities/reto-autenticacion.js';
import type { RetosAutenticacionSalida } from '../../domain/ports/portout/retos-autenticacion.port.js';

export class RetosAutenticacionAdapter implements RetosAutenticacionSalida {
  private readonly retos = new Map<string, RetoAutenticacion>();
  constructor(private readonly maximo = 16) {}
  guardar(reto: RetoAutenticacion): boolean {
    if (this.retos.size >= this.maximo || this.retos.has(reto.connectionId)) return false;
    this.retos.set(reto.connectionId, reto);
    return true;
  }
  consumir(connectionId: string): RetoAutenticacion | undefined {
    const reto = this.retos.get(connectionId);
    this.retos.delete(connectionId);
    return reto;
  }
}
