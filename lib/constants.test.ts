import { describe, expect, it } from 'vitest';

import {
  FFT_SIZE,
  FFT_TOP_PERCENT,
  MAX_HISTORY_ENTRIES,
  POLL_INTERVAL_ACTIVE_MS,
  POLL_INTERVAL_IDLE_MS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  RECORDING_DURATIONS_MS,
  SENSITIVITY_PRESETS,
} from './constants';

describe('constants', () => {
  it('expose les trois durées d’enregistrement croissantes', () => {
    expect(RECORDING_DURATIONS_MS.short).toBe(3000);
    expect(RECORDING_DURATIONS_MS.default).toBe(5000);
    expect(RECORDING_DURATIONS_MS.long).toBe(10000);
    expect(RECORDING_DURATIONS_MS.short).toBeLessThan(RECORDING_DURATIONS_MS.default);
    expect(RECORDING_DURATIONS_MS.default).toBeLessThan(RECORDING_DURATIONS_MS.long);
  });

  it('a un preset de sensibilité pour low/medium/high avec exponent + multiplier', () => {
    for (const key of ['low', 'medium', 'high'] as const) {
      expect(SENSITIVITY_PRESETS[key].exponent).toBeGreaterThan(0);
      expect(SENSITIVITY_PRESETS[key].multiplier).toBeGreaterThan(0);
    }
    expect(SENSITIVITY_PRESETS.low.exponent).toBeGreaterThan(SENSITIVITY_PRESETS.high.exponent);
  });

  it('a des intervalles de polling cohérents (idle > active)', () => {
    expect(POLL_INTERVAL_IDLE_MS).toBeGreaterThan(POLL_INTERVAL_ACTIVE_MS);
  });

  it('a des valeurs de rate-limit, FFT et historique positives', () => {
    expect(RATE_LIMIT_MAX_REQUESTS).toBeGreaterThan(0);
    expect(RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
    expect(MAX_HISTORY_ENTRIES).toBeGreaterThan(0);
    expect(FFT_SIZE).toBeGreaterThan(0);
    expect(FFT_TOP_PERCENT).toBeGreaterThan(0);
    expect(FFT_TOP_PERCENT).toBeLessThanOrEqual(1);
  });
});
