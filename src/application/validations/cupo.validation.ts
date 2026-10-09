export class Cupo {
  private tokens: number;
  private actualizado: number;
  constructor(private readonly capacidad: number, private readonly porSegundo: number, ahora: number) {
    this.tokens = capacidad;
    this.actualizado = ahora;
  }
  admitir(ahora: number): boolean {
    const transcurrido = Math.max(0, ahora - this.actualizado);
    this.tokens = Math.min(this.capacidad, this.tokens + transcurrido * this.porSegundo / 1000);
    this.actualizado = Math.max(this.actualizado, ahora);
    if (this.tokens < 1) return false;
    this.tokens--;
    return true;
  }
}
