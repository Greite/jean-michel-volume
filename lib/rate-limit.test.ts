import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from './constants';
import { checkRateLimit, getClientKey } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('autorise la première requête et décrémente le restant', () => {
    const res = checkRateLimit('key-first');
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 1);
    expect(res.resetAt).toBe(Date.now() + RATE_LIMIT_WINDOW_MS);
  });

  it('bloque une fois la limite atteinte', () => {
    const key = 'key-burst';
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('réinitialise le bucket après la fenêtre', () => {
    const key = 'key-reset';
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit(key);
    }
    expect(checkRateLimit(key).allowed).toBe(false);

    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);

    const afterReset = checkRateLimit(key);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 1);
  });

  it('isole les buckets par clé', () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit('key-a');
    }
    expect(checkRateLimit('key-a').allowed).toBe(false);
    expect(checkRateLimit('key-b').allowed).toBe(true);
  });
});

describe('getClientKey', () => {
  it('utilise le premier IP de x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.1, 70.41.3.18' });
    expect(getClientKey(headers, 'fallback')).toBe('203.0.113.1');
  });

  it('retombe sur x-real-ip si pas de x-forwarded-for', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.7' });
    expect(getClientKey(headers, 'fallback')).toBe('198.51.100.7');
  });

  it('utilise le fallback quand aucun header IP', () => {
    expect(getClientKey(new Headers(), 'user@example.com')).toBe('user@example.com');
  });
});
