export type ConfiguracionRequestDto = Readonly<Record<string, string | undefined>>;

export interface ConfiguracionResponseDto {
  readonly puerto: number;
  readonly origen: string;
  readonly pareja: string;
  readonly publicaPadre: string;
  readonly publicaHijo: string;
  readonly entorno: 'development' | 'test' | 'production';
  readonly nivelLog: 'error' | 'info';
}
