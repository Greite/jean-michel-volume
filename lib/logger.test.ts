import { describe, expect, it } from 'vitest';

import { logger } from './logger';

describe('logger', () => {
  it('expose log/error/warn/info appelables sans lever', () => {
    expect(() => logger.log('a', 1)).not.toThrow();
    expect(() => logger.error('b')).not.toThrow();
    expect(() => logger.warn('c')).not.toThrow();
    expect(() => logger.info('d')).not.toThrow();
  });
});
