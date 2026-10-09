export class DecisionConexion {
  constructor(readonly motivo: 'SOLICITUD_INVALIDA' | 'NO_DISPONIBLE') { Object.freeze(this); }
}
