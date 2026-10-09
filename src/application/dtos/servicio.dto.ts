export interface ConsultaRequestDto { readonly tipo: 'SALUD' | 'KEEPALIVE' }
export interface ConsultaResponseDto {
  readonly status: 200 | 503;
  readonly body: Readonly<{ ok: boolean; protocol: number } | { alive: true }>;
}
