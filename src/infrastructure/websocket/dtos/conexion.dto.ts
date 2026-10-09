export interface ConexionRequestDto {
  readonly metodo: string;
  readonly ruta: string;
  readonly origen: string | undefined;
  readonly subprotocolo: string | undefined;
}
export interface ConexionResponseDto { readonly status: 400 | 503 }
