export type ResultadoAckCp2 = 'APPLIED' | 'ACCEPTED_PENDING_ENFORCEMENT' | 'ENFORCEMENT_FAILED' | 'REJECTED' | 'UNKNOWN_COMMAND';
export type MotivoAckCp2 =
  | 'OK' | 'BAD_SCHEMA' | 'BAD_SIGNATURE' | 'WRONG_PAIR' | 'WRONG_ROLE' | 'UNKNOWN_VERSION' | 'PROTOCOL_MISMATCH'
  | 'STALE_BOOT' | 'STALE_SESSION' | 'STALE_NONCE' | 'STALE_REVISION' | 'STALE_SEQUENCE' | 'SEQUENCE_CONFLICT'
  | 'UNKNOWN_COMMAND' | 'NOT_DEVICE_OWNER' | 'NOT_PROVISIONED' | 'BEFORE_USER_UNLOCK' | 'STATE_CORRUPT'
  | 'KEY_UNAVAILABLE' | 'ENFORCEMENT_ERROR' | 'COUNTER_EXHAUSTED' | 'PEER_OFFLINE' | 'RATE_LIMITED';

export interface AckCp2 {
  readonly v: 2;
  readonly kind: 'ACK';
  readonly sender: 'CHILD';
  readonly pairId: string;
  readonly bootId: string;
  readonly childSessionId: string;
  readonly commandId: string;
  readonly seq: string;
  readonly commandPayloadSha256B64: string;
  readonly acceptedRevision: string | null;
  readonly evaluatedRevision: string;
  readonly result: ResultadoAckCp2;
  readonly reason: MotivoAckCp2;
  readonly resultElapsedMs: string | null;
}
