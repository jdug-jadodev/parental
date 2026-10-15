export class KeepaliveProceso {
  private temporizador: ReturnType<typeof setInterval> | undefined;
  private solicitud: AbortController | undefined;
  private detenido = false;

  constructor(private readonly url: string, private readonly intervaloMs: number,
    private readonly solicitar: typeof fetch, private readonly avisar: () => void,
    private readonly timeoutMs = 10000) {}

  iniciar(): void {
    if (this.temporizador || this.detenido) return;
    this.temporizador = setInterval(() => { void this.consultar(); }, this.intervaloMs);
    this.temporizador.unref();
  }

  detener(): void {
    this.detenido = true;
    clearInterval(this.temporizador);
    this.temporizador = undefined;
    this.solicitud?.abort();
  }

  private async consultar(): Promise<void> {
    if (this.detenido || this.solicitud) return;
    const controlador = new AbortController();
    this.solicitud = controlador;
    const limite = setTimeout(() => controlador.abort(), this.timeoutMs);
    limite.unref();
    try {
      const respuesta = await this.solicitar(this.url, { method: 'GET', signal: controlador.signal,
        redirect: 'error', cache: 'no-store' });
      if (!respuesta.ok && !this.detenido) this.avisar();
      await respuesta.body?.cancel();
    } catch {
      if (!this.detenido) this.avisar();
    } finally {
      clearTimeout(limite);
      this.solicitud = undefined;
    }
  }
}
