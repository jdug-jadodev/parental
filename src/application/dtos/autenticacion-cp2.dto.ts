export type RolCp2 = 'PARENT' | 'CHILD';

export interface RetoConexionCp2 {
  readonly v: 2;
  readonly kind: 'CHALLENGE';
  readonly connectionId: string;
  readonly nonce: string;
  readonly timeoutSec: 10;
}

export interface PruebaAutenticacionCp2 {
  readonly v: 2;
  readonly kind: 'AUTH_PROOF';
  readonly protocol: 'cp.v2';
  readonly pairId: string;
  readonly role: RolCp2;
  readonly connectionId: string;
  readonly nonce: string;
}

export interface AutenticacionAceptadaCp2 {
  readonly v: 2;
  readonly kind: 'AUTH_OK';
  readonly protocol: 'cp.v2';
  readonly connectionId: string;
}

export interface LatidoCp2 {
  readonly v: 2;
  readonly kind: 'PING' | 'PONG';
  readonly nonce: string;
}

export interface SobreAuthCp2 {
  readonly v: 2;
  readonly kind: 'SIGNED';
  readonly purpose: 'AUTH';
  readonly payloadB64: string;
  readonly sigB64: string;
}

export type FrameAutenticacionCp2 = RetoConexionCp2 | AutenticacionAceptadaCp2 | LatidoCp2 | SobreAuthCp2;
