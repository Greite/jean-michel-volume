/**
 * Constantes partagées de l'application.
 */

export const RECORDING_DURATIONS_MS = {
  short: 3000,
  default: 5000,
  long: 10000,
} as const;

export type RecordingDurationKey = keyof typeof RECORDING_DURATIONS_MS;

export const SENSITIVITY_PRESETS = {
  low: { exponent: 5, multiplier: 2.0 },
  medium: { exponent: 4, multiplier: 2.5 },
  high: { exponent: 3, multiplier: 3.0 },
} as const;

export type SensitivityKey = keyof typeof SENSITIVITY_PRESETS;

/** Polling intervals (ms) */
export const POLL_INTERVAL_ACTIVE_MS = 5000;
export const POLL_INTERVAL_IDLE_MS = 15000;

/** Throttle UI updates pendant l'enregistrement (~30fps) */
export const VOLUME_UI_THROTTLE_MS = 33;

/** Rate-limiting API */
export const RATE_LIMIT_WINDOW_MS = 10_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

/** Codes d'erreur Spotify côté client */
export const SPOTIFY_ERROR_REASON_VOLUME_DISALLOW = 'VOLUME_CONTROL_DISALLOW';

/** Historique : nombre max de pics conservés */
export const MAX_HISTORY_ENTRIES = 5;

/** Tailles FFT pour l'analyse audio */
export const FFT_SIZE = 256;
export const FFT_TOP_PERCENT = 0.2;
