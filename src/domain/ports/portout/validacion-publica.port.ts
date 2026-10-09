export interface ValidacionPublicaSalida {
  validarOrigen(origen: string): void;
  validarClave(rol: 'PARENT' | 'CHILD', publica: string): void;
}
