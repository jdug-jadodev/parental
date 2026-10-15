export class EntradaEncuentro {
  constructor(readonly tipo: 'AUTH' | 'PUBLISH' | 'CLAIM' | 'SEND_PAIR' | 'CANCEL',
    readonly carga?: string, readonly firma?: string, readonly plazo?: number, readonly codigo?: string) {}
}
