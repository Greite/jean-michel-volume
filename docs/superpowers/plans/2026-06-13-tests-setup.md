# Tests Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place Vitest + Testing Library et écrire une couverture de tests complète sur `lib/`, `app/api/`, `hooks/`, et `components/`, avec un workflow CI GitHub Actions et un rapport de couverture sans seuil bloquant.

**Architecture:** Tests colocalisés (`*.test.ts(x)`) à côté des sources. Un helper `test/test-utils.tsx` fournit un `renderWithProviders` qui enveloppe les composants dans `ThemeProvider` + `I18nProvider`. Un `vitest.setup.ts` stubbe les APIs navigateur absentes de jsdom (matchMedia, ResizeObserver, etc.) et fige `navigator.language = 'fr-FR'` pour rendre les chaînes i18n déterministes (français). Le code existe déjà : chaque test décrit le comportement attendu actuel ; tout bug réel découvert est signalé, pas figé.

**Tech Stack:** Vitest, jsdom, @vitejs/plugin-react, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, @vitest/coverage-v8, Bun, GitHub Actions.

---

## File Structure

**Créés (config & helpers) :**
- `vitest.config.ts` — config Vitest (jsdom, alias `@/`, coverage v8 sans seuil)
- `vitest.setup.ts` — setup global (jest-dom, stubs navigateur, cleanup)
- `test/test-utils.tsx` — `renderWithProviders` + ré-export de Testing Library
- `test/fixtures.ts` — fixtures Spotify partagées (devices, tracks, playback state)
- `.github/workflows/test.yml` — CI lint + tests

**Créés (tests, colocalisés) :**
- `lib/constants.test.ts`, `lib/logger.test.ts`, `lib/client-logger.test.ts`, `lib/rate-limit.test.ts`, `lib/spotify-api.test.ts`
- `lib/i18n/dictionaries.test.ts`, `lib/i18n/index.test.tsx`
- `hooks/useRovingTabIndex.test.tsx`, `hooks/useVoiceVolume.test.ts`, `hooks/useSpotifyPlayback.test.tsx`
- `app/api/auth/[...nextauth]/route.test.ts`, `app/api/spotify/volume/route.test.ts`, `app/api/spotify/playback/route.test.ts`
- `components/*.test.tsx` (un par composant)
- `app/page.test.tsx`

**Modifiés :**
- `package.json` — devDependencies + scripts `test`, `test:watch`, `test:coverage`

---

## Task 1: Infrastructure de test (config, setup, helpers)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `test/test-utils.tsx`
- Create: `test/fixtures.ts`

- [ ] **Step 1: Installer les dépendances de test**

```bash
bun add -d vitest @vitest/coverage-v8 jsdom @vitejs/plugin-react @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

Expected: les paquets s'ajoutent à `devDependencies`, `bun install` se termine sans erreur.

- [ ] **Step 2: Ajouter les scripts à `package.json`**

Dans la section `"scripts"`, ajouter après la ligne `"gen:icons"` (ajouter une virgule à la ligne précédente) :

```jsonc
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 3: Créer `vitest.config.ts`**

```ts
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['lib/**', 'hooks/**', 'components/**', 'app/**'],
      exclude: [
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        'test/**',
        'app/layout.tsx',
        'lib/i18n/dictionaries.ts',
      ],
      // Pas de `thresholds` : rapport informatif, ne bloque jamais la CI.
    },
  },
});
```

- [ ] **Step 4: Créer `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Locale déterministe : detectInitialLocale() lira 'fr-FR' → français.
Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });

// matchMedia (jsdom ne l'implémente pas)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});
```

- [ ] **Step 5: Créer `test/fixtures.ts`**

```ts
import type { PlaybackState, SpotifyDevice, SpotifyTrack } from '@/types/spotify';

export const deviceFixture = (overrides: Partial<SpotifyDevice> = {}): SpotifyDevice => ({
  id: 'device-1',
  name: 'MacBook Pro',
  type: 'Computer',
  isActive: true,
  volumePercent: 50,
  supportsVolume: true,
  ...overrides,
});

export const trackFixture = (overrides: Partial<SpotifyTrack> = {}): SpotifyTrack => ({
  name: 'Voyage Voyage',
  artists: 'Desireless',
  album: 'François',
  imageUrl: 'https://i.scdn.co/image/abc',
  durationMs: 240000,
  progressMs: 12000,
  externalUrl: 'https://open.spotify.com/track/abc',
  ...overrides,
});

export const playbackStateFixture = (overrides: Partial<PlaybackState> = {}): PlaybackState => ({
  isPlaying: true,
  volume: 50,
  device: deviceFixture(),
  devices: [deviceFixture()],
  track: trackFixture(),
  ...overrides,
});
```

- [ ] **Step 6: Créer `test/test-utils.tsx`**

```tsx
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { I18nProvider } from '@/lib/i18n';

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
```

- [ ] **Step 7: Vérifier que Vitest démarre (aucun test encore)**

Run: `bun run test`
Expected: Vitest démarre, message « No test files found » (ou exit 0). Pas d'erreur de config/résolution d'alias.

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock vitest.config.ts vitest.setup.ts test/
git commit -m "Test - #JMV-NoId - Add Vitest + Testing Library infrastructure

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `lib/constants.ts`

**Files:**
- Test: `lib/constants.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
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
    // Plus la sensibilité monte, plus l’exposant baisse (réponse plus vive).
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
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test lib/constants.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
git add lib/constants.test.ts
git commit -m "Test - #JMV-NoId - Cover lib/constants invariants

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `lib/logger.ts` & `lib/client-logger.ts`

**Files:**
- Test: `lib/logger.test.ts`
- Test: `lib/client-logger.test.ts`

- [ ] **Step 1: Écrire `lib/logger.test.ts`**

```ts
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
```

- [ ] **Step 2: Écrire `lib/client-logger.test.ts`**

```ts
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
```

- [ ] **Step 3: Lancer les tests**

Run: `bun run test lib/logger.test.ts lib/client-logger.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add lib/logger.test.ts lib/client-logger.test.ts
git commit -m "Test - #JMV-NoId - Cover logger and client-logger no-op API

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `lib/rate-limit.ts`

**Files:**
- Test: `lib/rate-limit.test.ts`

- [ ] **Step 1: Écrire le test**

Note : le module garde un `Map` au niveau module. Chaque test utilise une **clé unique** pour éviter le partage d'état entre tests. On utilise des faux timers pour la fenêtre.

```ts
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
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test lib/rate-limit.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 3: Commit**

```bash
git add lib/rate-limit.test.ts
git commit -m "Test - #JMV-NoId - Cover rate-limit token bucket and client key

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `lib/spotify-api.ts`

**Files:**
- Test: `lib/spotify-api.test.ts`

- [ ] **Step 1: Écrire le test**

`fetch` est mocké via `vi.stubGlobal`. On vérifie URL, méthode, header Authorization, et le mapping.

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { controlPlayback, getPlaybackState, setSpotifyVolume, transferPlayback } from './spotify-api';

const TOKEN = 'tok-123';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPlaybackState', () => {
  it('mappe lecture en cours + devices et choisit la première image album', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          is_playing: true,
          progress_ms: 12000,
          device: { id: 'd1', name: 'Mac', type: 'Computer', is_active: true, volume_percent: 42, supports_volume: true },
          item: {
            name: 'Song',
            artists: [{ name: 'A' }, { name: 'B' }],
            album: { name: 'Alb', images: [{ url: 'big' }, { url: 'small' }] },
            duration_ms: 200000,
            external_urls: { spotify: 'https://x' },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          devices: [
            { id: 'd1', name: 'Mac', type: 'Computer', is_active: true, volume_percent: 42, supports_volume: true },
            { id: null, name: 'Ghost', type: 'Speaker', is_active: false, volume_percent: null, supports_volume: false },
          ],
        }),
      );

    const state = await getPlaybackState(TOKEN);

    expect(state).not.toBeNull();
    expect(state?.isPlaying).toBe(true);
    expect(state?.volume).toBe(42);
    expect(state?.track?.artists).toBe('A, B');
    expect(state?.track?.imageUrl).toBe('big');
    expect(state?.track?.progressMs).toBe(12000);
    // Le device sans id est filtré.
    expect(state?.devices).toHaveLength(1);
    expect(state?.devices[0].id).toBe('d1');
    // Header Authorization présent.
    const firstCall = fetchMock.mock.calls[0];
    expect((firstCall[1] as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
  });

  it('retourne un état "rien en lecture" sur 204', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ devices: [] }));

    const state = await getPlaybackState(TOKEN);
    expect(state).toEqual({ isPlaying: false, volume: 0, device: null, devices: [], track: null });
  });

  it('retourne null si le player répond une erreur', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('err', { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ devices: [] }));

    expect(await getPlaybackState(TOKEN)).toBeNull();
  });
});

describe('setSpotifyVolume', () => {
  it('clampe et arrondit le volume entre 0 et 100', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await setSpotifyVolume(TOKEN, 150.7);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/volume?volume_percent=100',
      expect.objectContaining({ method: 'PUT' }),
    );

    await setSpotifyVolume(TOKEN, -10);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/volume?volume_percent=0',
      expect.objectContaining({ method: 'PUT' }),
    );

    await setSpotifyVolume(TOKEN, 33.4);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/volume?volume_percent=33',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('controlPlayback', () => {
  it('utilise PUT pour play et pause', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await controlPlayback(TOKEN, 'play');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/play',
      expect.objectContaining({ method: 'PUT' }),
    );
    await controlPlayback(TOKEN, 'pause');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/pause',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('utilise POST pour next et previous', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await controlPlayback(TOKEN, 'next');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/next',
      expect.objectContaining({ method: 'POST' }),
    );
    await controlPlayback(TOKEN, 'previous');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/previous',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('transferPlayback', () => {
  it('envoie le device id avec play=true', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await transferPlayback(TOKEN, 'device-x');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.spotify.com/v1/me/player');
    expect((init as RequestInit).method).toBe('PUT');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ device_ids: ['device-x'], play: true });
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test lib/spotify-api.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 3: Commit**

```bash
git add lib/spotify-api.test.ts
git commit -m "Test - #JMV-NoId - Cover spotify-api mapping and request building

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `lib/i18n/dictionaries.ts` (parité des clés)

**Files:**
- Test: `lib/i18n/dictionaries.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { describe, expect, it } from 'vitest';
import { DICTIONARIES, LOCALES } from './dictionaries';

describe('dictionaries', () => {
  it('définit fr et en', () => {
    expect(LOCALES).toEqual(['fr', 'en']);
    expect(DICTIONARIES.fr).toBeDefined();
    expect(DICTIONARIES.en).toBeDefined();
  });

  it('a exactement les mêmes clés en fr et en (parité)', () => {
    const frKeys = Object.keys(DICTIONARIES.fr).sort();
    const enKeys = Object.keys(DICTIONARIES.en).sort();
    expect(enKeys).toEqual(frKeys);
  });

  it('n’a aucune valeur vide', () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(DICTIONARIES[locale])) {
        expect(value, `${locale}.${key} ne doit pas être vide`).toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test lib/i18n/dictionaries.test.ts`
Expected: PASS (3 tests). Si la parité échoue, c'est un bug réel de traduction → le signaler et corriger le dictionnaire avant de continuer.

- [ ] **Step 3: Commit**

```bash
git add lib/i18n/dictionaries.test.ts
git commit -m "Test - #JMV-NoId - Cover i18n dictionaries key parity

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `lib/i18n/index.tsx` (provider + hook)

**Files:**
- Test: `lib/i18n/index.test.tsx`

- [ ] **Step 1: Écrire le test**

```tsx
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { DICTIONARIES } from './dictionaries';
import { I18nProvider, useTranslation } from './index';

afterEach(() => {
  localStorage.clear();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('useTranslation', () => {
  it('lève une erreur hors provider', () => {
    expect(() => renderHook(() => useTranslation())).toThrow(/I18nProvider/);
  });

  it('traduit une clé dans la locale par défaut (fr via navigator.language)', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.t('app.title')).toBe(DICTIONARIES.fr['app.title']);
  });

  it('retourne la clé brute pour une clé inconnue', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    // @ts-expect-error clé volontairement invalide
    expect(result.current.t('nope.nope')).toBe('nope.nope');
  });

  it('change la locale et persiste dans localStorage', async () => {
    const user = userEvent.setup();
    function Probe() {
      const { t, setLocale } = useTranslation();
      return (
        <div>
          <span data-testid="val">{t('app.title')}</span>
          <button type="button" onClick={() => setLocale('en')}>
            en
          </button>
        </div>
      );
    }
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'en' }));
    expect(screen.getByTestId('val')).toHaveTextContent(DICTIONARIES.en['app.title']);
    expect(localStorage.getItem('jmv-locale')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('lit la locale stockée au montage', () => {
    localStorage.setItem('jmv-locale', 'en');
    const { result } = renderHook(() => useTranslation(), { wrapper });
    act(() => {});
    expect(result.current.locale).toBe('en');
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test lib/i18n/index.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 3: Commit**

```bash
git add lib/i18n/index.test.tsx
git commit -m "Test - #JMV-NoId - Cover i18n provider and useTranslation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `hooks/useRovingTabIndex.ts`

**Files:**
- Test: `hooks/useRovingTabIndex.test.tsx`

- [ ] **Step 1: Écrire le test**

On teste via un composant radiogroup minimal qui branche le handler.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useRovingTabIndex } from './useRovingTabIndex';

const VALUES = ['a', 'b', 'c'] as const;

function Group() {
  const [current, setCurrent] = useState<(typeof VALUES)[number]>('a');
  const onKeyDown = useRovingTabIndex(VALUES, current, setCurrent);
  return (
    <div>
      <span data-testid="current">{current}</span>
      <div>
        {VALUES.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={current === v}
            tabIndex={current === v ? 0 : -1}
            onKeyDown={onKeyDown}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

describe('useRovingTabIndex', () => {
  it('ArrowRight sélectionne l’élément suivant et boucle', async () => {
    const user = userEvent.setup();
    render(<Group />);
    screen.getByRole('radio', { name: 'a' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('current')).toHaveTextContent('b');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    // a -> b -> c -> a (boucle)
    expect(screen.getByTestId('current')).toHaveTextContent('a');
  });

  it('ArrowLeft recule et boucle vers la fin', async () => {
    const user = userEvent.setup();
    render(<Group />);
    screen.getByRole('radio', { name: 'a' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByTestId('current')).toHaveTextContent('c');
  });

  it('Home va au premier, End au dernier', async () => {
    const user = userEvent.setup();
    render(<Group />);
    screen.getByRole('radio', { name: 'a' }).focus();
    await user.keyboard('{End}');
    expect(screen.getByTestId('current')).toHaveTextContent('c');
    await user.keyboard('{Home}');
    expect(screen.getByTestId('current')).toHaveTextContent('a');
  });

  it('ignore les autres touches', async () => {
    const user = userEvent.setup();
    render(<Group />);
    screen.getByRole('radio', { name: 'a' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('current')).toHaveTextContent('a');
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test hooks/useRovingTabIndex.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
git add hooks/useRovingTabIndex.test.tsx
git commit -m "Test - #JMV-NoId - Cover useRovingTabIndex keyboard navigation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `hooks/useVoiceVolume.ts`

**Files:**
- Test: `hooks/useVoiceVolume.test.ts`

Ce hook touche getUserMedia, AudioContext, AnalyserNode, requestAnimationFrame, performance.now, navigator.vibrate, wakeLock. On stubbe le strict minimum et on teste les chemins observables : état initial, erreur micro, et nettoyage.

- [ ] **Step 1: Écrire le test**

```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECORDING_DURATIONS_MS } from '@/lib/constants';
import { useVoiceVolume } from './useVoiceVolume';

function installAudioMocks(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });

  class FakeAnalyser {
    fftSize = 0;
    frequencyBinCount = 128;
    getByteFrequencyData(arr: Uint8Array) {
      arr.fill(0);
    }
  }
  class FakeAudioContext {
    createAnalyser() {
      return new FakeAnalyser();
    }
    createMediaStreamSource() {
      return { connect: vi.fn() };
    }
    close() {
      return Promise.resolve();
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useVoiceVolume', () => {
  it('expose un état initial cohérent', () => {
    installAudioMocks(vi.fn());
    const { result } = renderHook(() => useVoiceVolume({ durationKey: 'short' }));
    expect(result.current.isRecording).toBe(false);
    expect(result.current.currentVolume).toBe(0);
    expect(result.current.maxVolume).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.countdownMs).toBe(RECORDING_DURATIONS_MS.short);
    expect(result.current.countdownSeconds).toBe(3);
    expect(result.current.spectrum).toBeInstanceOf(Float32Array);
  });

  it('passe isRecording=true quand le micro est accordé', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installAudioMocks(getUserMedia);

    const { result } = renderHook(() => useVoiceVolume());
    await act(async () => {
      await result.current.startRecording();
    });

    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(result.current.isRecording).toBe(true);
  });

  it('positionne error=mic-access-denied si getUserMedia rejette', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));
    installAudioMocks(getUserMedia);

    const { result } = renderHook(() => useVoiceVolume());
    await act(async () => {
      await result.current.startRecording();
    });

    await waitFor(() => expect(result.current.error).toBe('mic-access-denied'));
    expect(result.current.isRecording).toBe(false);
  });

  it('stopRecording appelle onComplete avec le pic et réinitialise', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installAudioMocks(getUserMedia);
    const onComplete = vi.fn();

    const { result } = renderHook(() => useVoiceVolume({ onComplete }));
    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.currentVolume).toBe(0);
    expect(onComplete).toHaveBeenCalledWith(expect.any(Number));
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test hooks/useVoiceVolume.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
git add hooks/useVoiceVolume.test.ts
git commit -m "Test - #JMV-NoId - Cover useVoiceVolume lifecycle and mic errors

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `hooks/useSpotifyPlayback.ts`

**Files:**
- Test: `hooks/useSpotifyPlayback.test.tsx`

Le hook utilise `useTranslation` (→ wrapper I18nProvider), `fetch`, des timers de polling, et `signOut`. On mocke `next-auth/react`. On utilise un wrapper et on contrôle `fetch`.

- [ ] **Step 1: Écrire le test**

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { playbackStateFixture } from '@/test/fixtures';
import { useSpotifyPlayback } from './useSpotifyPlayback';

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function okJson(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

describe('useSpotifyPlayback', () => {
  it('charge l’état initial via /api/spotify/playback', async () => {
    const state = playbackStateFixture();
    fetchMock.mockReturnValue(okJson(state));

    const { result } = renderHook(() => useSpotifyPlayback(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/spotify/playback', expect.any(Object));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.state.track?.name).toBe(state.track?.name);
  });

  it('setVolume poste le volume et met à jour l’état', async () => {
    fetchMock
      .mockReturnValueOnce(okJson(playbackStateFixture())) // poll initial
      .mockReturnValueOnce(okJson({ success: true, volume: 77 })); // setVolume

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    let returned: number | null = null;
    await act(async () => {
      returned = await result.current.setVolume(77);
    });

    expect(returned).toBe(77);
    expect(result.current.state.volume).toBe(77);
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/spotify/volume');
    expect(call?.[1]).toMatchObject({ method: 'POST' });
  });

  it('mappe une erreur 403 vers un message traduit', async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response(JSON.stringify({ error: 'x' }), { status: 403 })));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });
    await act(async () => {
      await result.current.setVolume(10);
    });

    expect(result.current.apiError).toBeTruthy();
  });

  it('ne lance pas de polling quand paused=true', async () => {
    fetchMock.mockReturnValue(okJson(playbackStateFixture()));
    renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clearError remet apiError à null', async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response('{}', { status: 403 })));
    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });
    await act(async () => {
      await result.current.setVolume(10);
    });
    act(() => result.current.clearError());
    expect(result.current.apiError).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test hooks/useSpotifyPlayback.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 3: Commit**

```bash
git add hooks/useSpotifyPlayback.test.tsx
git commit -m "Test - #JMV-NoId - Cover useSpotifyPlayback fetch, volume and errors

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Route `app/api/auth/[...nextauth]/route.ts`

**Files:**
- Test: `app/api/auth/[...nextauth]/route.test.ts`

On teste les callbacks `session`/`jwt` de `authOptions` et la présence des handlers GET/POST. `NextAuth` est mocké pour éviter d'exécuter le vrai handler ; `next-auth/providers/spotify` reste réel (les fallbacks `?? ''` évitent les erreurs d'env).

- [ ] **Step 1: Écrire le test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth', () => ({
  default: vi.fn(() => vi.fn()),
}));

import { authOptions, GET, POST } from './route';

describe('authOptions', () => {
  it('exporte des handlers GET et POST', () => {
    expect(GET).toBeDefined();
    expect(POST).toBeDefined();
  });

  it('configure un provider et des scopes de lecture/écriture playback', () => {
    expect(authOptions.providers).toHaveLength(1);
  });

  describe('callbacks.session', () => {
    it('copie accessToken et error du token vers la session', async () => {
      const session = { user: {}, expires: '' } as never;
      const token = { accessToken: 'abc', error: 'RefreshAccessTokenError' } as never;
      const result = await authOptions.callbacks!.session!({ session, token } as never);
      expect((result as { accessToken?: string }).accessToken).toBe('abc');
      expect((result as { error?: string }).error).toBe('RefreshAccessTokenError');
    });
  });

  describe('callbacks.jwt', () => {
    it('stocke les tokens à la connexion initiale (account présent)', async () => {
      const token = {} as never;
      const account = { access_token: 'at', refresh_token: 'rt', expires_at: 9999 } as never;
      const result = await authOptions.callbacks!.jwt!({ token, account } as never);
      expect((result as { accessToken?: string }).accessToken).toBe('at');
      expect((result as { refreshToken?: string }).refreshToken).toBe('rt');
    });

    it('retourne le token inchangé tant qu’il n’a pas expiré', async () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const token = { accessToken: 'at', expiresAt: future } as never;
      const result = await authOptions.callbacks!.jwt!({ token, account: null } as never);
      expect((result as { accessToken?: string }).accessToken).toBe('at');
    });
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test "app/api/auth/[...nextauth]/route.test.ts"`
Expected: PASS (5 tests).

- [ ] **Step 3: Commit**

```bash
git add "app/api/auth/[...nextauth]/route.test.ts"
git commit -m "Test - #JMV-NoId - Cover NextAuth session and jwt callbacks

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Route `app/api/spotify/volume/route.ts`

**Files:**
- Test: `app/api/spotify/volume/route.test.ts`

On mocke `next-auth/next` (`getServerSession`), `@/lib/spotify-api` (`setSpotifyVolume`), et le module de la route auth (pour éviter d'importer NextAuth réel via `authOptions`).

- [ ] **Step 1: Écrire le test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/spotify-api', () => ({ setSpotifyVolume: vi.fn() }));

import { getServerSession } from 'next-auth/next';
import { setSpotifyVolume } from '@/lib/spotify-api';
import { POST } from './route';

const mockedSession = vi.mocked(getServerSession);
const mockedSetVolume = vi.mocked(setSpotifyVolume);

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/spotify/volume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockedSession.mockResolvedValue({ accessToken: 'tok', user: { email: 'u@e.com' } } as never);
});
afterEach(() => vi.clearAllMocks());

describe('POST /api/spotify/volume', () => {
  it('retourne 401 sans session', async () => {
    mockedSession.mockResolvedValueOnce(null as never);
    const res = await POST(makeRequest({ volume: 50 }, { 'x-forwarded-for': '1.1.1.1' }));
    expect(res.status).toBe(401);
  });

  it('retourne 400 pour un volume hors bornes', async () => {
    const res = await POST(makeRequest({ volume: 150 }, { 'x-forwarded-for': '1.1.1.2' }));
    expect(res.status).toBe(400);
  });

  it('appelle setSpotifyVolume et retourne success+volume arrondi', async () => {
    mockedSetVolume.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await POST(makeRequest({ volume: 42.6 }, { 'x-forwarded-for': '1.1.1.3' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, volume: 43 });
    expect(mockedSetVolume).toHaveBeenCalledWith('tok', 42.6);
  });

  it('propage le statut d’erreur Spotify', async () => {
    mockedSetVolume.mockResolvedValueOnce(new Response(JSON.stringify({ error: { reason: 'NO_ACTIVE_DEVICE' } }), { status: 404 }));
    const res = await POST(makeRequest({ volume: 30 }, { 'x-forwarded-for': '1.1.1.4' }));
    expect(res.status).toBe(404);
  });

  it('retourne 429 quand le rate-limit est dépassé', async () => {
    const ip = '9.9.9.9';
    mockedSetVolume.mockResolvedValue(new Response(null, { status: 204 }));
    let last: Response | undefined;
    for (let i = 0; i < 25; i++) {
      last = await POST(makeRequest({ volume: 10 }, { 'x-forwarded-for': ip }));
    }
    expect(last?.status).toBe(429);
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test app/api/spotify/volume/route.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 3: Commit**

```bash
git add app/api/spotify/volume/route.test.ts
git commit -m "Test - #JMV-NoId - Cover volume API route auth, validation, rate-limit

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Route `app/api/spotify/playback/route.ts`

**Files:**
- Test: `app/api/spotify/playback/route.test.ts`

- [ ] **Step 1: Écrire le test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/spotify-api', () => ({
  getPlaybackState: vi.fn(),
  controlPlayback: vi.fn(),
  transferPlayback: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';
import { controlPlayback, getPlaybackState, transferPlayback } from '@/lib/spotify-api';
import { playbackStateFixture } from '@/test/fixtures';
import { GET, POST } from './route';

const mockedSession = vi.mocked(getServerSession);

function postReq(body: unknown, ip: string) {
  return new Request('http://localhost/api/spotify/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockedSession.mockResolvedValue({ accessToken: 'tok', user: { email: 'u@e.com' } } as never);
});
afterEach(() => vi.clearAllMocks());

describe('GET /api/spotify/playback', () => {
  it('401 sans session', async () => {
    mockedSession.mockResolvedValueOnce(null as never);
    expect((await GET()).status).toBe(401);
  });

  it('retourne l’état de lecture', async () => {
    vi.mocked(getPlaybackState).mockResolvedValueOnce(playbackStateFixture());
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).track.name).toBeDefined();
  });

  it('502 si getPlaybackState renvoie null', async () => {
    vi.mocked(getPlaybackState).mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(502);
  });
});

describe('POST /api/spotify/playback', () => {
  it('400 pour une action inconnue', async () => {
    const res = await POST(postReq({ action: 'fly' }, '2.2.2.1'));
    expect(res.status).toBe(400);
  });

  it('relaie une action de contrôle valide', async () => {
    vi.mocked(controlPlayback).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await POST(postReq({ action: 'pause' }, '2.2.2.2'));
    expect(res.status).toBe(200);
    expect(controlPlayback).toHaveBeenCalledWith('tok', 'pause');
  });

  it('400 pour transfer sans deviceId', async () => {
    const res = await POST(postReq({ action: 'transfer' }, '2.2.2.3'));
    expect(res.status).toBe(400);
  });

  it('relaie transfer avec deviceId', async () => {
    vi.mocked(transferPlayback).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await POST(postReq({ action: 'transfer', deviceId: 'd9' }, '2.2.2.4'));
    expect(res.status).toBe(200);
    expect(transferPlayback).toHaveBeenCalledWith('tok', 'd9');
  });
});
```

- [ ] **Step 2: Lancer le test**

Run: `bun run test app/api/spotify/playback/route.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 3: Commit**

```bash
git add app/api/spotify/playback/route.test.ts
git commit -m "Test - #JMV-NoId - Cover playback API route GET/POST actions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Composants de présentation

**Files:**
- Test: `components/Hero.test.tsx`
- Test: `components/Footer.test.tsx`
- Test: `components/HowItWorks.test.tsx`
- Test: `components/ImportantNotes.test.tsx`
- Test: `components/JeanMichelMascot.test.tsx`
- Test: `components/Spectrogram.test.tsx`
- Test: `components/WelcomeCard.test.tsx`

- [ ] **Step 1: `components/Hero.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { Hero } from './Hero';

describe('Hero', () => {
  it('affiche le titre et le corps traduits', () => {
    renderWithProviders(<Hero />);
    expect(screen.getByRole('heading', { name: DICTIONARIES.fr['hero.title'] })).toBeInTheDocument();
    expect(screen.getByText(DICTIONARIES.fr['hero.body'])).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: `components/Footer.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { Footer } from './Footer';

describe('Footer', () => {
  it('rend une nav de footer et des liens externes', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
    const spotifyLink = screen.getByRole('link', { name: /spotify/i });
    expect(spotifyLink).toHaveAttribute('target', '_blank');
    expect(spotifyLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('affiche l’année courante', () => {
    renderWithProviders(<Footer />);
    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: `components/HowItWorks.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { HowItWorks } from './HowItWorks';

describe('HowItWorks', () => {
  it('liste les 4 étapes', () => {
    renderWithProviders(<HowItWorks />);
    expect(screen.getByRole('heading', { name: DICTIONARIES.fr['how.title'] })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});
```

- [ ] **Step 4: `components/ImportantNotes.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ImportantNotes } from './ImportantNotes';

describe('ImportantNotes', () => {
  it('rend une aside avec 4 notes', () => {
    renderWithProviders(<ImportantNotes />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});
```

- [ ] **Step 5: `components/JeanMichelMascot.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JeanMichelMascot } from './JeanMichelMascot';

describe('JeanMichelMascot', () => {
  it('rend une image SVG accessible', () => {
    render(<JeanMichelMascot />);
    expect(screen.getByRole('img', { name: 'Jean-Michel' })).toBeInTheDocument();
  });

  it('accepte la prop listening sans planter', () => {
    render(<JeanMichelMascot listening />);
    expect(screen.getByRole('img', { name: 'Jean-Michel' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: `components/Spectrogram.test.tsx`**

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FFT_SIZE } from '@/lib/constants';
import { Spectrogram } from './Spectrogram';

describe('Spectrogram', () => {
  it('rend un canvas masqué aux lecteurs d’écran', () => {
    const { container } = render(<Spectrogram spectrum={new Float32Array(FFT_SIZE / 2)} active={false} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('ne plante pas quand active=true', () => {
    expect(() =>
      render(<Spectrogram spectrum={new Float32Array(FFT_SIZE / 2)} active />),
    ).not.toThrow();
  });
});
```

- [ ] **Step 7: `components/WelcomeCard.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { WelcomeCard } from './WelcomeCard';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

describe('WelcomeCard', () => {
  it('affiche le titre de bienvenue, la mascotte et un bouton de connexion', () => {
    renderWithProviders(<WelcomeCard />);
    expect(screen.getByRole('heading', { name: DICTIONARIES.fr['welcome.title'] })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Jean-Michel' })).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Lancer les tests**

Run: `bun run test components/Hero.test.tsx components/Footer.test.tsx components/HowItWorks.test.tsx components/ImportantNotes.test.tsx components/JeanMichelMascot.test.tsx components/Spectrogram.test.tsx components/WelcomeCard.test.tsx`
Expected: PASS (11 tests).

- [ ] **Step 9: Commit**

```bash
git add components/Hero.test.tsx components/Footer.test.tsx components/HowItWorks.test.tsx components/ImportantNotes.test.tsx components/JeanMichelMascot.test.tsx components/Spectrogram.test.tsx components/WelcomeCard.test.tsx
git commit -m "Test - #JMV-NoId - Cover presentational components

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Composants interactifs

**Files:**
- Test: `components/LanguageToggle.test.tsx`
- Test: `components/ThemeToggle.test.tsx`
- Test: `components/ManualVolumeSlider.test.tsx`
- Test: `components/VolumeHistory.test.tsx`
- Test: `components/DeviceSelector.test.tsx`
- Test: `components/VoiceSettings.test.tsx`
- Test: `components/NowPlaying.test.tsx`
- Test: `components/SignInButton.test.tsx`
- Test: `components/SignOutButton.test.tsx`

- [ ] **Step 1: `components/LanguageToggle.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { LanguageToggle } from './LanguageToggle';

describe('LanguageToggle', () => {
  it('rend un radiogroup FR/EN avec FR coché par défaut', () => {
    renderWithProviders(<LanguageToggle />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    const fr = screen.getByRole('radio', { name: 'FR' });
    expect(fr).toHaveAttribute('aria-checked', 'true');
  });

  it('coche EN après clic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageToggle />);
    await user.click(screen.getByRole('radio', { name: 'EN' }));
    expect(screen.getByRole('radio', { name: 'EN' })).toHaveAttribute('aria-checked', 'true');
  });
});
```

- [ ] **Step 2: `components/ThemeToggle.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('rend trois options de thème', () => {
    renderWithProviders(<ThemeToggle />);
    expect(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.light'] })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.dark'] })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.system'] })).toBeInTheDocument();
  });

  it('active "light" après clic et persiste', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);
    await user.click(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.light'] }));
    expect(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.light'] })).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('jmv-theme')).toBe('light');
  });
});
```

- [ ] **Step 3: `components/ManualVolumeSlider.test.tsx`**

```tsx
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ManualVolumeSlider } from './ManualVolumeSlider';

describe('ManualVolumeSlider', () => {
  it('affiche la valeur courante', () => {
    renderWithProviders(<ManualVolumeSlider value={40} onChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toHaveValue('40');
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('débounce et appelle onChange après déplacement', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderWithProviders(<ManualVolumeSlider value={40} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '80' } });
    expect(onChange).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(onChange).toHaveBeenCalledWith(80);
    vi.useRealTimers();
  });

  it('est désactivé quand disabled', () => {
    renderWithProviders(<ManualVolumeSlider value={40} disabled onChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toBeDisabled();
  });
});
```

- [ ] **Step 4: `components/VolumeHistory.test.tsx`**

```tsx
import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { VolumeHistory } from './VolumeHistory';

describe('VolumeHistory', () => {
  it('rend une entrée par pic et le dernier pic max', () => {
    const history = [
      { peak: 80, at: Date.now() },
      { peak: 55, at: Date.now() - 60000 },
    ];
    renderWithProviders(<VolumeHistory history={history} lastPeak={80} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('n’affiche pas le pic max quand lastPeak est null', () => {
    renderWithProviders(<VolumeHistory history={[]} lastPeak={null} />);
    expect(screen.queryByText('%', { exact: false })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: `components/DeviceSelector.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { deviceFixture } from '@/test/fixtures';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { DeviceSelector } from './DeviceSelector';

describe('DeviceSelector', () => {
  it('affiche un message quand aucun device', () => {
    renderWithProviders(<DeviceSelector devices={[]} activeDeviceId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(DICTIONARIES.fr['device.none'])).toBeInTheDocument();
  });

  it('marque le device actif et n’appelle pas onSelect au clic dessus', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const devices = [deviceFixture({ id: 'a', name: 'Mac' }), deviceFixture({ id: 'b', name: 'Phone', isActive: false })];
    renderWithProviders(<DeviceSelector devices={devices} activeDeviceId="a" onSelect={onSelect} />);

    const active = screen.getByRole('button', { name: /Mac/ });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    await user.click(active);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('appelle onSelect au clic sur un device inactif', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const devices = [deviceFixture({ id: 'a', name: 'Mac' }), deviceFixture({ id: 'b', name: 'Phone', isActive: false })];
    renderWithProviders(<DeviceSelector devices={devices} activeDeviceId="a" onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /Phone/ }));
    expect(onSelect).toHaveBeenCalledWith('b');
  });
});
```

- [ ] **Step 6: `components/VoiceSettings.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { VoiceSettings } from './VoiceSettings';

describe('VoiceSettings', () => {
  it('rend deux radiogroups (durée + sensibilité)', () => {
    renderWithProviders(
      <VoiceSettings duration="default" sensitivity="medium" onDuration={vi.fn()} onSensitivity={vi.fn()} />,
    );
    expect(screen.getAllByRole('radiogroup')).toHaveLength(2);
  });

  it('appelle onDuration au clic sur une durée', async () => {
    const user = userEvent.setup();
    const onDuration = vi.fn();
    renderWithProviders(
      <VoiceSettings duration="default" sensitivity="medium" onDuration={onDuration} onSensitivity={vi.fn()} />,
    );
    await user.click(screen.getByRole('radio', { name: /3/ }));
    expect(onDuration).toHaveBeenCalledWith('short');
  });

  it('désactive les fieldsets quand disabled', () => {
    renderWithProviders(
      <VoiceSettings duration="default" sensitivity="medium" onDuration={vi.fn()} onSensitivity={vi.fn()} disabled />,
    );
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });
});
```

- [ ] **Step 7: `components/NowPlaying.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { deviceFixture, trackFixture } from '@/test/fixtures';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { NowPlaying } from './NowPlaying';

const handlers = { onPlayPause: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() };

describe('NowPlaying', () => {
  it('affiche un skeleton en chargement sans track', () => {
    renderWithProviders(<NowPlaying track={null} device={null} isPlaying={false} isLoading {...handlers} />);
    expect(screen.getByLabelText(DICTIONARIES.fr['controller.loadingPlayback'])).toBeInTheDocument();
  });

  it('affiche l’état vide avec lien Spotify quand pas de track', () => {
    renderWithProviders(<NowPlaying track={null} device={null} isPlaying={false} {...handlers} />);
    expect(screen.getByText(DICTIONARIES.fr['track.nothing'])).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://open.spotify.com');
  });

  it('affiche le titre, l’artiste et déclenche les contrôles', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NowPlaying track={trackFixture()} device={deviceFixture()} isPlaying {...handlers} />,
    );
    expect(screen.getByRole('heading', { name: 'Voyage Voyage' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controls.pause'] }));
    expect(handlers.onPlayPause).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controls.next'] }));
    expect(handlers.onNext).toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: `components/SignInButton.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { signIn } from 'next-auth/react';
import { SignInButton } from './SignInButton';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

describe('SignInButton', () => {
  it('déclenche signIn spotify au clic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInButton />);
    await user.click(screen.getByRole('button'));
    expect(signIn).toHaveBeenCalledWith('spotify', { callbackUrl: '/' });
  });
});
```

- [ ] **Step 9: `components/SignOutButton.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { signOut } from 'next-auth/react';
import { SignOutButton } from './SignOutButton';

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

describe('SignOutButton', () => {
  it('déclenche signOut au clic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignOutButton />);
    await user.click(screen.getByRole('button'));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });
});
```

- [ ] **Step 10: Lancer les tests**

Run: `bun run test components/LanguageToggle.test.tsx components/ThemeToggle.test.tsx components/ManualVolumeSlider.test.tsx components/VolumeHistory.test.tsx components/DeviceSelector.test.tsx components/VoiceSettings.test.tsx components/NowPlaying.test.tsx components/SignInButton.test.tsx components/SignOutButton.test.tsx`
Expected: PASS (~21 tests).

- [ ] **Step 11: Commit**

```bash
git add components/LanguageToggle.test.tsx components/ThemeToggle.test.tsx components/ManualVolumeSlider.test.tsx components/VolumeHistory.test.tsx components/DeviceSelector.test.tsx components/VoiceSettings.test.tsx components/NowPlaying.test.tsx components/SignInButton.test.tsx components/SignOutButton.test.tsx
git commit -m "Test - #JMV-NoId - Cover interactive components

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Providers, effets, header, orchestrateur & page

**Files:**
- Test: `components/ThemeProvider.test.tsx`
- Test: `components/ThemeScript.test.tsx`
- Test: `components/SessionErrorHandler.test.tsx`
- Test: `components/Providers.test.tsx`
- Test: `components/Header.test.tsx`
- Test: `components/VoiceVolumeController.test.tsx`
- Test: `app/page.test.tsx`

- [ ] **Step 1: `components/ThemeProvider.test.tsx`**

```tsx
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeProvider', () => {
  it('useTheme lève hors provider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
  });

  it('démarre en préférence "system"', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.preference).toBe('system');
  });

  it('setPreference("dark") applique data-theme et persiste', async () => {
    const user = userEvent.setup();
    function Probe() {
      const { preference, setPreference } = useTheme();
      return (
        <div>
          <span data-testid="pref">{preference}</span>
          <button type="button" onClick={() => setPreference('dark')}>
            dark
          </button>
        </div>
      );
    }
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'dark' }));
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('jmv-theme')).toBe('dark');
  });
});
```

- [ ] **Step 2: `components/ThemeScript.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-nonce': 'test-nonce' })),
}));

import { ThemeScript } from './ThemeScript';

describe('ThemeScript', () => {
  it('rend un <script> avec le nonce et le contenu inline', async () => {
    const element = await ThemeScript();
    expect(element.type).toBe('script');
    expect(element.props.nonce).toBe('test-nonce');
    expect(element.props.dangerouslySetInnerHTML.__html).toContain('jmv-theme');
  });
});
```

- [ ] **Step 3: `components/SessionErrorHandler.test.tsx`**

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { signOut, useSession } from 'next-auth/react';
import { SessionErrorHandler } from './SessionErrorHandler';

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

describe('SessionErrorHandler', () => {
  it('déconnecte si la session a une RefreshAccessTokenError', () => {
    vi.mocked(useSession).mockReturnValue({ data: { error: 'RefreshAccessTokenError' } } as never);
    render(<SessionErrorHandler />);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('ne déconnecte pas pour une session saine', () => {
    vi.mocked(useSession).mockReturnValue({ data: { accessToken: 'ok' } } as never);
    render(<SessionErrorHandler />);
    expect(signOut).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: `components/Providers.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Providers } from './Providers';

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: () => ({ data: null }),
  signOut: vi.fn(),
}));

describe('Providers', () => {
  it('rend ses enfants dans l’arbre de providers', () => {
    render(
      <Providers>
        <span>child-content</span>
      </Providers>,
    );
    expect(screen.getByText('child-content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: `components/Header.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useSession } from 'next-auth/react';
import { Header } from './Header';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

describe('Header', () => {
  it('affiche SignIn quand pas de session', () => {
    vi.mocked(useSession).mockReturnValue({ data: null } as never);
    renderWithProviders(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /lang/i })).toBeInTheDocument();
  });

  it('affiche SignOut quand connecté', () => {
    vi.mocked(useSession).mockReturnValue({ data: { accessToken: 'x' } } as never);
    renderWithProviders(<Header />);
    // Un bouton de déconnexion est présent (texte traduit).
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: `components/VoiceVolumeController.test.tsx`**

On mocke les deux hooks métier pour isoler le rendu/orchestration.

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';
import { playbackStateFixture } from '@/test/fixtures';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import * as voice from '@/hooks/useVoiceVolume';
import * as playback from '@/hooks/useSpotifyPlayback';
import { VoiceVolumeController } from './VoiceVolumeController';

vi.mock('@/hooks/useVoiceVolume');
vi.mock('@/hooks/useSpotifyPlayback');

function setup(overrides: { recording?: boolean } = {}) {
  vi.mocked(voice.useVoiceVolume).mockReturnValue({
    currentVolume: 0,
    maxVolume: 0,
    isRecording: overrides.recording ?? false,
    error: null,
    countdownMs: 5000,
    countdownSeconds: 5,
    spectrum: new Float32Array(128),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  } as never);

  vi.mocked(playback.useSpotifyPlayback).mockReturnValue({
    state: playbackStateFixture(),
    apiError: null,
    isLoading: false,
    setVolume: vi.fn(),
    sendAction: vi.fn(),
    refresh: vi.fn(),
    clearError: vi.fn(),
  } as never);
}

describe('VoiceVolumeController', () => {
  it('rend le bouton de démarrage quand on n’enregistre pas', () => {
    setup({ recording: false });
    renderWithProviders(<VoiceVolumeController />);
    expect(screen.getByRole('button', { name: DICTIONARIES.fr['controller.start'] })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('démarre l’enregistrement au clic', async () => {
    const startRecording = vi.fn();
    setup({ recording: false });
    vi.mocked(voice.useVoiceVolume).mockReturnValue({
      currentVolume: 0,
      maxVolume: 0,
      isRecording: false,
      error: null,
      countdownMs: 5000,
      countdownSeconds: 5,
      spectrum: new Float32Array(128),
      startRecording,
      stopRecording: vi.fn(),
    } as never);
    const user = userEvent.setup();
    renderWithProviders(<VoiceVolumeController />);
    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controller.start'] }));
    expect(startRecording).toHaveBeenCalled();
  });

  it('affiche le bouton stop pendant l’enregistrement', () => {
    setup({ recording: true });
    renderWithProviders(<VoiceVolumeController />);
    expect(screen.getByRole('button', { name: DICTIONARIES.fr['controller.stop'] })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: `app/page.test.tsx`**

On mocke la session et les composants enfants lourds pour vérifier le branchement connecté/déconnecté.

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/components/Header', () => ({ Header: () => <header>header</header> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>footer</footer> }));
vi.mock('@/components/Hero', () => ({ Hero: () => <div>hero</div> }));
vi.mock('@/components/HowItWorks', () => ({ HowItWorks: () => <div>how</div> }));
vi.mock('@/components/ImportantNotes', () => ({ ImportantNotes: () => <div>notes</div> }));
vi.mock('@/components/WelcomeCard', () => ({ WelcomeCard: () => <div>welcome</div> }));
vi.mock('@/components/VoiceVolumeController', () => ({ VoiceVolumeController: () => <div>controller</div> }));

import { getServerSession } from 'next-auth/next';
import Home from './page';

describe('Home page', () => {
  it('affiche WelcomeCard quand déconnecté', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
    render(await Home());
    expect(screen.getByText('welcome')).toBeInTheDocument();
    expect(screen.queryByText('controller')).not.toBeInTheDocument();
  });

  it('affiche le contrôleur quand connecté', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: 'x' } as never);
    render(await Home());
    expect(screen.getByText('controller')).toBeInTheDocument();
    expect(screen.queryByText('welcome')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Lancer les tests**

Run: `bun run test components/ThemeProvider.test.tsx components/ThemeScript.test.tsx components/SessionErrorHandler.test.tsx components/Providers.test.tsx components/Header.test.tsx components/VoiceVolumeController.test.tsx app/page.test.tsx`
Expected: PASS (~15 tests).

- [ ] **Step 9: Commit**

```bash
git add components/ThemeProvider.test.tsx components/ThemeScript.test.tsx components/SessionErrorHandler.test.tsx components/Providers.test.tsx components/Header.test.tsx components/VoiceVolumeController.test.tsx app/page.test.tsx
git commit -m "Test - #JMV-NoId - Cover providers, header, orchestrator and page

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: CI GitHub Actions

**Files:**
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Créer le workflow**

```yaml
name: Lint and Test

on:
  push:
  pull_request:

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint (tsc + biome)
        run: bun run lint

      - name: Run tests with coverage
        run: bun run test:coverage
```

- [ ] **Step 2: Valider la syntaxe YAML localement**

Run: `bun run test:coverage`
Expected: la suite complète passe en local (le même script que la CI). Le rapport de couverture s'affiche en fin de sortie.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "CI - #JMV-NoId - Add lint and test workflow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: Vérification finale & couverture

**Files:** (aucun nouveau)

- [ ] **Step 1: Lancer toute la suite**

Run: `bun run test`
Expected: tous les fichiers de tests passent, exit 0.

- [ ] **Step 2: Lancer le lint complet**

Run: `bun run lint`
Expected: `tsc` sans erreur, Biome check + format sans erreur. Corriger tout problème de typage/format dans les fichiers de test (ex. lancer `bun run biome:write` si besoin).

- [ ] **Step 3: Générer le rapport de couverture**

Run: `bun run test:coverage`
Expected: un tableau de couverture s'affiche pour `lib/`, `hooks/`, `components/`, `app/`. Vérifier qu'aucune catégorie n'est à 0 % et que les modules clés (rate-limit, spotify-api, i18n, routes API) sont élevés. Noter (sans bloquer) les zones faibles éventuelles.

- [ ] **Step 4: Commit final éventuel**

Si des corrections de lint/format ont été nécessaires :

```bash
git add -A
git commit -m "Test - #JMV-NoId - Fix lint and formatting in test suite

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes d'exécution

- **Biome & fichiers de test :** Biome lint/format s'applique aussi aux `*.test.ts(x)`. Après écriture, lancer `bun run biome:write` pour conformer l'ordre des imports et le formatage avant chaque commit si nécessaire.
- **`vi.mock` est hoisté :** les appels `vi.mock(...)` sont remontés en haut du module par Vitest ; placer les `import` du module testé *après* les `vi.mock` reste lisible et fonctionne.
- **State module partagé (`rate-limit`) :** toujours utiliser des clés/IP uniques par test pour éviter les interférences via le `Map` au niveau module.
- **Bugs réels :** si un test révèle un comportement incorrect du code de prod (ex. parité i18n cassée), le signaler et corriger le code source dans un commit dédié `Fix - #JMV-NoId - ...` plutôt que d'adapter le test au bug.
```
