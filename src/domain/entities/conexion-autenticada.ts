export type RolAutenticado = 'PARENT' | 'CHILD';

export class ConexionAutenticada {
  constructor(readonly connectionId: string, readonly pareja: string, readonly rol: RolAutenticado) {
    Object.freeze(this);
  }
}
