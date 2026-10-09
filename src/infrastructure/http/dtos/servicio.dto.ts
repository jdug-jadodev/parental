export interface ConsultaRequestDto { readonly metodo: string; readonly ruta: string }
export interface ConsultaResponseDto {
  readonly status: 200 | 404 | 503;
  readonly body: Readonly<{ ok: boolean; protocol: number } | { error: string }>;
}
