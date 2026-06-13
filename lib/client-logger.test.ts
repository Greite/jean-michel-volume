import { describe, expect, it } from 'vitest';

import { clientLogger } from './client-logger';

describe('clientLogger', () => {
  it('expose log/error/warn/info appelables sans lever', () => {
    expect(() => clientLogger.log('a', 1)).not.toThrow();
    expect(() => clientLogger.error('b')).not.toThrow();
    expect(() => clientLogger.warn('c')).not.toThrow();
    expect(() => clientLogger.info('d')).not.toThrow();
  });
});
