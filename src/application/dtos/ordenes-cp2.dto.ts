export type AccionCp2 = 'LOCK' | 'ALLOW' | 'ALLOW_FOR';

export interface SolicitudSyncCp2 {
  readonly v: 2;
  readonly kind: 'SYNC_REQUEST';
  readonly pairId: string;
  readonly sender: 'PARENT';
  readonly syncNonce: string;
  readonly requestedAction: AccionCp2 | null;
}

export interface OrdenCp2 {
  readonly v: 2;
  readonly kind: 'SET_POLICY';
  readonly sender: 'PARENT';
  readonly pairId: string;
  readonly bootId: string;
  readonly childSessionId: string;
  readonly commandId: string;
  readonly seq: string;
  readonly expectedRevision: string;
  readonly commandNonce: string;
  readonly action: AccionCp2;
  readonly durationSec: number | null;
}

export interface SobreOrdenCp2 {
  readonly v: 2;
  readonly kind: 'SIGNED';
  readonly purpose: 'MESSAGE';
  readonly payloadB64: string;
  readonly sigB64: string;
}

export type MensajePadreCp2 = SolicitudSyncCp2 | OrdenCp2;
