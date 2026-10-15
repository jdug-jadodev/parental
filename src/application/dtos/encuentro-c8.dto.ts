export type MensajeClienteC8 =
  | { readonly v: 1; readonly kind: 'AUTH'; readonly payloadB64: string; readonly sigB64: string }
  | { readonly v: 1; readonly kind: 'PUBLISH'; readonly offerB64: string; readonly ttlMs: number }
  | { readonly v: 1; readonly kind: 'CLAIM'; readonly code: string }
  | { readonly v: 1; readonly kind: 'SEND_PAIR'; readonly pairB64: string }
  | { readonly v: 1; readonly kind: 'CANCEL' };

export type MensajeServidorC8 =
  | { readonly v: 1; readonly kind: 'CHALLENGE'; readonly connectionId: string; readonly nonceB64: string; readonly relayOrigin: string }
  | { readonly v: 1; readonly kind: 'READY' | 'SENT' | 'UNAVAILABLE' }
  | { readonly v: 1; readonly kind: 'CODE'; readonly code: string; readonly remainingMs: number }
  | { readonly v: 1; readonly kind: 'OFFER'; readonly offerB64: string; readonly remainingMs: number }
  | { readonly v: 1; readonly kind: 'CLAIMED'; readonly parentPublicKeyB64: string; readonly remainingMs: number }
  | { readonly v: 1; readonly kind: 'PAIR'; readonly pairB64: string };

export interface SalidaEncuentroC8 {
  readonly connectionId: string;
  readonly mensaje: MensajeServidorC8;
  readonly cerrar?: boolean;
}
