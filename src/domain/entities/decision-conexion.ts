export class DecisionConexion {
  constructor(readonly motivo: 'SOLICITUD_INVALIDA' | 'NO_DISPONIBLE' | 'AUTENTICACION_REQUERIDA') { Object.freeze(this); }
}
