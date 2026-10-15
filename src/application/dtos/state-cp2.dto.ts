import type { AccionCp2 } from './ordenes-cp2.dto.js';

export type EnforcementCp2 = 'PENDING' | 'VERIFIED' | 'FAILED' | 'UNKNOWN';
export interface RetoOrdenCp2 {
  readonly nonce: string;
  readonly action: AccionCp2;
  readonly revision: string;
  readonly issuedElapsedMs: string;
  readonly expiresElapsedMs: string;
}
export interface EfectivoCp2 {
  readonly mode: 'LOCKED' | 'ALLOWED' | 'MAINTENANCE' | 'SETUP' | 'UNKNOWN';
  readonly reason: 'OK' | 'STATE_CORRUPT' | 'ENFORCEMENT_ERROR' | 'KEY_UNAVAILABLE' | 'NOT_DEVICE_OWNER' | 'NOT_PROVISIONED'
    | 'BEFORE_USER_UNLOCK' | 'BOOT_AUTH_REQUIRED' | 'SYSTEM_KEYGUARD' | 'MAINTENANCE_ACTIVE' | 'LOCAL_LOCK' | 'PARENT_LOCK'
    | 'TIMER_EXPIRED' | 'CONTROL_UNKNOWN' | 'NETWORK_LOST';
  readonly source: 'NONE' | 'LOCAL' | 'REMOTE';
  readonly policyRevision: string | null;
  readonly action: AccionCp2 | null;
  readonly phase: 'BLOCKED' | 'PERMITTED' | 'EXPIRED' | 'NONE';
  readonly acceptedElapsedMs: string | null;
  readonly phaseStartedElapsedMs: string | null;
  readonly deadlineElapsedMs: string | null;
  readonly remainingSec: number | null;
  readonly enforcement: EnforcementCp2;
}
export interface UltimaRemotaCp2 {
  readonly commandId: string;
  readonly seq: string;
  readonly payloadSha256B64: string;
  readonly bootId: string;
  readonly childSessionId: string;
  readonly acceptedRevision: string;
  readonly result: 'APPLIED' | 'ACCEPTED_PENDING_ENFORCEMENT' | 'ENFORCEMENT_FAILED';
  readonly resultReason: 'OK' | 'ENFORCEMENT_ERROR';
  readonly resultElapsedMs: string | null;
}
export interface StateCp2 {
  readonly v: 2;
  readonly kind: 'STATE';
  readonly sender: 'CHILD';
  readonly pairId: string;
  readonly bootId: string;
  readonly childSessionId: string;
  readonly syncNonce: string;
  readonly stateSeq: string;
  readonly sampledElapsedMs: string;
  readonly controlRevision: string;
  readonly lastAcceptedSeq: string;
  readonly commandChallenge: RetoOrdenCp2 | null;
  readonly effective: EfectivoCp2;
  readonly lastRemote: UltimaRemotaCp2 | null;
  readonly permittedTime: null;
  readonly lastExpiry: null;
  readonly networkValidated: boolean | null;
  readonly channelHealthy: boolean | null;
  readonly isDeviceOwner: boolean | null;
  readonly lockTaskActive: boolean | null;
}
