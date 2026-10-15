import { createPublicKey, verify } from 'node:crypto';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import type { MensajeClienteC8 } from '../../../../application/dtos/encuentro-c8.dto.js';
import type { IdentidadEncuentro } from '../../../../domain/ports/portout/verificacion-encuentro.port.js';
import { documentoCp2 } from '../cp2/documento-cp2.js';
import { firmaDerCp2 } from '../cp2/codec-vinculacion.js';
import { base64, publicaP256, origenHttps } from '../formatos.js';
import { exigir } from '../json-estricto.js';

const texto = { type: 'string', minLength: 1, maxLength: 12000 };
const objeto = (kind: string, campos: Record<string, object>): object => ({ type: 'object', additionalProperties: false,
  properties: { v: { const: 1 }, kind: { const: kind }, ...campos }, required: ['v', 'kind', ...Object.keys(campos)] });

export class CodecEncuentroC8 {
  private readonly cliente: ValidateFunction;
  private readonly prueba: ValidateFunction;

  constructor() {
    const ajv = new Ajv2020({ strict: true, coerceTypes: false, removeAdditional: false });
    this.cliente = ajv.compile({ oneOf: [
      objeto('AUTH', { payloadB64: texto, sigB64: texto }),
      objeto('PUBLISH', { offerB64: texto, ttlMs: { type: 'integer', minimum: 1, maximum: 120000 } }),
      objeto('CLAIM', { code: { type: 'string', pattern: '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' } }),
      objeto('SEND_PAIR', { pairB64: texto }), objeto('CANCEL', {}),
    ] });
    this.prueba = ajv.compile(objeto('PROOF', { connectionId: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' },
      nonceB64: texto, publicKeyB64: texto, relayOrigin: texto, role: { enum: ['CHILD', 'PARENT'] } }));
  }

  leer(bytes: Uint8Array): MensajeClienteC8 {
    const m = documentoCp2(bytes, 16384, this.cliente);
    for (const campo of ['payloadB64', 'offerB64', 'pairB64']) if (typeof m[campo] === 'string') base64(m[campo], 8192);
    if (typeof m.sigB64 === 'string') firmaDerCp2(base64(m.sigB64, 72));
    return Object.freeze(m) as unknown as MensajeClienteC8;
  }

  verificar(payloadB64: string, sigB64: string, connectionId: string, nonce: string, origen: string): IdentidadEncuentro {
    const bytes = base64(payloadB64, 8192);
    const m = documentoCp2(bytes, 8192, this.prueba);
    exigir(m.connectionId === connectionId && m.nonceB64 === nonce && m.relayOrigin === origen, 'Contexto de prueba C8 distinto');
    base64(m.nonceB64 as string, 32, 32);
    origenHttps(m.relayOrigin as string);
    const spki = base64(m.publicKeyB64 as string, 150);
    publicaP256(spki);
    const firma = base64(sigB64, 72);
    firmaDerCp2(firma);
    const clave = createPublicKey({ key: spki, format: 'der', type: 'spki' });
    exigir(verify('sha256', Buffer.concat([Buffer.from('C8v1/PROOF\n'), bytes]), clave, firma), 'Prueba C8 inválida');
    return { rol: m.role as 'CHILD' | 'PARENT', publica: m.publicKeyB64 as string };
  }
}
