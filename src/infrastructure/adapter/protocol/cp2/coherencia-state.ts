import type { StateCp2 } from '../../../../application/dtos/state-cp2.dto.js';
import { base64, secuencia } from '../formatos.js';
import { exigir } from '../json-estricto.js';

export function validarCoherenciaState(state: StateCp2): void {
  const c = (valor: string): bigint => secuencia(valor, true);
  const sampled = c(state.sampledElapsedMs);
  const revision = c(state.controlRevision);
  const ultimaSeq = c(state.lastAcceptedSeq);
  secuencia(state.stateSeq);
  base64(state.syncNonce, 32, 32);
  const reto = state.commandChallenge;
  if (reto) {
    base64(reto.nonce, 32, 32);
    exigir(c(reto.revision) === revision && c(reto.expiresElapsedMs) === c(reto.issuedElapsedMs) + 30000n &&
      c(reto.issuedElapsedMs) <= sampled && sampled < c(reto.expiresElapsedMs), 'Reto STATE incoherente o vencido');
  }
  const e = state.effective;
  if (e.source === 'NONE') {
    exigir(e.phase === 'NONE' && [e.policyRevision, e.action, e.acceptedElapsedMs, e.phaseStartedElapsedMs,
      e.deadlineElapsedMs, e.remainingSec].every((valor) => valor === null), 'STATE sin decisión contiene permiso');
  } else {
    exigir(e.policyRevision !== null && e.action !== null && e.acceptedElapsedMs !== null &&
      e.phaseStartedElapsedMs !== null && c(e.policyRevision) <= revision &&
      c(e.acceptedElapsedMs) === c(e.phaseStartedElapsedMs) && c(e.acceptedElapsedMs) <= sampled, 'Decisión STATE incoherente');
    if (e.action === 'ALLOW_FOR') {
      exigir(e.deadlineElapsedMs !== null && e.remainingSec !== null, 'Permiso temporal sin deadline');
      const deadline = c(e.deadlineElapsedMs);
      const duracion = deadline - c(e.acceptedElapsedMs);
      exigir(duracion >= 60000n && duracion <= 86400000n && duracion % 60000n === 0n, 'Duración STATE inválida');
      const restante = deadline > sampled ? (deadline - sampled + 999n) / 1000n : 0n;
      exigir(BigInt(e.remainingSec) === restante &&
        (e.phase === 'PERMITTED' && deadline > sampled || e.phase === 'EXPIRED' && deadline <= sampled), 'Fase temporal STATE incoherente');
    } else {
      exigir(e.deadlineElapsedMs === null && e.remainingSec === null &&
        e.phase === (e.action === 'LOCK' ? 'BLOCKED' : 'PERMITTED'), 'Fase STATE incompatible con acción');
    }
  }
  if (e.mode === 'ALLOWED') exigir(e.phase === 'PERMITTED' && e.enforcement === 'VERIFIED', 'ALLOWED sin efecto verificado');
  if (e.mode === 'LOCKED') exigir(e.phase !== 'PERMITTED' && e.enforcement === 'VERIFIED', 'LOCKED sin efecto verificado');
  const r = state.lastRemote;
  if (r) {
    base64(r.payloadSha256B64, 32, 32);
    exigir(secuencia(r.seq) === ultimaSeq && secuencia(r.acceptedRevision) <= revision, 'Última remota STATE incoherente');
    if (r.resultElapsedMs !== null) c(r.resultElapsedMs);
    exigir(r.result === 'ACCEPTED_PENDING_ENFORCEMENT' ? r.resultReason === 'OK' && r.resultElapsedMs === null
      : r.resultElapsedMs !== null && r.resultReason === (r.result === 'APPLIED' ? 'OK' : 'ENFORCEMENT_ERROR'), 'Resultado remoto STATE incoherente');
  }
}
