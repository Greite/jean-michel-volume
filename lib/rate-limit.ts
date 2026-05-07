import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from './constants';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Rate-limiter in-memory token bucket simple, par identifiant (clé arbitraire).
 * Suffisant pour un déploiement single-instance. Pour multi-instance, remplacer
 * par un store partagé (Redis, Upstash, etc.).
 */
export function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    buckets.set(key, fresh);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: fresh.resetAt,
    };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Récupère un identifiant client à partir des headers de la requête. */
export function getClientKey(headers: Headers, fallback: string): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '';
  return forwarded || fallback;
}
