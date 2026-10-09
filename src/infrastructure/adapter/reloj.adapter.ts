import { performance } from 'node:perf_hooks';
import type { RelojSalida } from '../../domain/ports/portout/reloj.port.js';

export class RelojAdapter implements RelojSalida {
  ahora(): number { return performance.now(); }
}
