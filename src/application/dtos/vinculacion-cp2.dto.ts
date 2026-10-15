export interface OfertaHijoCp2 {
  readonly v: 2;
  readonly kind: 'CHILD_OFFER';
  readonly protocol: 'cp.v2';
  readonly childPublicKeyB64: string;
  readonly enrollId: string;
  readonly enrollNonce: string;
}

export interface AceptacionVinculoCp2 {
  readonly v: 2;
  readonly kind: 'PAIR_ACCEPT';
  readonly protocol: 'cp.v2';
  readonly pairId: string;
  readonly enrollId: string;
  readonly enrollNonce: string;
  readonly parentPublicKeyB64: string;
  readonly childPublicKeyB64: string;
  readonly relayOrigin: string;
  readonly recoveryHashes: Readonly<Record<'MAINTENANCE' | 'RECOVER_PARENT' | 'RETIRE', string>>;
}

export interface SobrePairCp2 {
  readonly v: 2;
  readonly kind: 'SIGNED';
  readonly purpose: 'PAIR';
  readonly payloadB64: string;
  readonly sigB64: string;
}
