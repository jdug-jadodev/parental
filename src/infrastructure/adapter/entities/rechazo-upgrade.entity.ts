export class RechazoUpgradeEntity {
  constructor(readonly status: 400 | 500 | 503) { Object.freeze(this); }
  serializar(): string {
    const razones = { 400: 'Bad Request', 500: 'Internal Server Error', 503: 'Service Unavailable' };
    return `HTTP/1.1 ${this.status} ${razones[this.status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`;
  }
}
