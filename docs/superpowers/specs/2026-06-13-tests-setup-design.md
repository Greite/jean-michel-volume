# Mise en place des tests — Jean-Michel Volume

**Date :** 2026-06-13
**Statut :** Validé (en attente de relecture finale)

## Objectif

Mettre en place une infrastructure de test complète pour le projet (Next.js 16,
React 19, Bun, TypeScript) et atteindre une **couverture complète** : chaque
unité testable du projet (lib, routes API, hooks, composants) dispose de tests.

## Stack & outillage

- **Runner :** Vitest
- **DOM :** jsdom
- **React :** `@vitejs/plugin-react` (JSX / React 19)
- **Composants/hooks :** `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`
- **Coverage :** provider `v8`, reporters `text` + `html`, **sans seuil bloquant**

### Fichiers de configuration

- `vitest.config.ts`
  - environnement `jsdom`
  - alias `@/` → racine du projet (cohérent avec `tsconfig.json`)
  - `setupFiles: ['./vitest.setup.ts']`
  - `globals: true`
  - coverage : provider `v8`, reporters `text` + `html`, dossier `coverage/`,
    pas de `thresholds`
  - exclusions coverage : fichiers de config, `scripts/`, `types/`,
    `*.d.ts`, `app/layout.tsx`, fichiers purement déclaratifs
- `vitest.setup.ts`
  - `import '@testing-library/jest-dom'`
  - cleanup automatique entre tests
  - mocks globaux des APIs navigateur absentes de jsdom :
    `matchMedia`, `ResizeObserver`, `AudioContext`/`webkitAudioContext`,
    `navigator.mediaDevices.getUserMedia`, `requestAnimationFrame`
- `coverage/` ajouté au `.gitignore`

### Scripts `package.json`

```jsonc
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

## Conventions

- **Colocalisation** : chaque test est placé à côté du fichier source sous la
  forme `<nom>.test.ts` ou `<nom>.test.tsx`.
- Helpers de test partagés (mocks de session NextAuth, fixtures Spotify,
  factory de `Request`) regroupés dans `test/` à la racine si réutilisés.

## Périmètre — couverture complète

### `lib/`

- `lib/rate-limit.ts` — autorisation sous la limite, blocage au-delà, reset
  après fenêtre (faux timers), `getClientKey` (`x-forwarded-for`, `x-real-ip`,
  fallback), isolation par clé.
- `lib/spotify-api.ts` — `mapDevice` (via comportement public), `getPlaybackState`
  (204, erreur, lecture en cours, sélection image album, devices filtrés),
  `setSpotifyVolume` (clamp 0–100 + arrondi), `controlPlayback`
  (play/pause/next/previous → bon verbe + path), `transferPlayback`. `fetch`
  mocké via `vi.stubGlobal`.
- `lib/constants.ts` — invariants (cohérence des presets, valeurs attendues).
- `lib/logger.ts` & `lib/client-logger.ts` — surface d'API présente et appelable
  sans erreur (no-op en l'état).
- `lib/i18n/dictionaries.ts` — parité des clés entre langues (fr/en), pas de
  clé manquante.
- `lib/i18n/index.tsx` — provider + hook de traduction (langue par défaut,
  changement de langue, fallback de clé).

### Routes API (`app/api/`)

- `app/api/spotify/volume/route.ts` — validation de l'entrée `volume`,
  application du rate-limit, 401 sans session, propagation des erreurs Spotify,
  succès. `next-auth` et `lib/spotify-api` mockés.
- `app/api/spotify/playback/route.ts` — GET (état de lecture), actions POST,
  401 sans session, rate-limit, erreurs.
- `app/api/auth/[...nextauth]/route.ts` — vérification de la configuration des
  handlers (export GET/POST) ; logique d'options testée si extractible.

### Hooks (`hooks/`)

- `hooks/useRovingTabIndex.ts` — gestion focus/flèches clavier.
- `hooks/useVoiceVolume.ts` — démarrage/arrêt d'enregistrement, calcul de volume
  selon presets de sensibilité, throttle UI, nettoyage des ressources audio.
  APIs audio mockées.
- `hooks/useSpotifyPlayback.ts` — polling (intervalles actif/idle), changement
  de volume, contrôle lecture, gestion d'erreurs/session. `fetch` mocké.

### Composants (`components/`)

Render + interactions (`user-event`) + assertions accessibilité de base pour :

- Purs/présentation : `Hero`, `Footer`, `Header`, `HowItWorks`,
  `ImportantNotes`, `WelcomeCard`, `JeanMichelMascot`, `Spectrogram`.
- Interactifs : `LanguageToggle`, `ThemeToggle`, `ManualVolumeSlider`,
  `VolumeHistory`, `DeviceSelector`, `VoiceSettings`, `SignInButton`,
  `SignOutButton`, `NowPlaying`.
- Providers/effets : `Providers`, `ThemeProvider`, `ThemeScript`,
  `SessionErrorHandler`, `VoiceVolumeController` (orchestrateur — chemins
  principaux, dépendances mockées).

### Hors périmètre

- Tests E2E (Playwright) — non inclus (OAuth Spotify + micro réels trop lourds).
- Fichiers de configuration (`next.config.ts`, `proxy.ts`, `scripts/`).
- `app/layout.tsx` (coquille de mise en page).

## CI — GitHub Actions

Nouveau workflow `.github/workflows/test.yml` :

- Déclencheurs : `push` et `pull_request`.
- Étapes : checkout → setup Bun (`oven-sh/setup-bun`) → `bun install`
  → `bun run lint` (tsc + biome) → `bun run test:coverage`.
- N'affecte pas le workflow Docker existant (`docker-build.yml`).

## Approche

Le code existe déjà : on écrit des tests qui décrivent le **comportement
attendu actuel**, on vérifie qu'ils passent. Tout bug réel découvert est
**signalé** plutôt que figé comme comportement correct ; on décide alors au cas
par cas de corriger ou documenter.

## Critères de succès

- `bun run test` passe au vert.
- `bun run test:coverage` produit un rapport ; couverture élevée et homogène
  sur lib / routes / hooks / composants.
- Le workflow CI exécute lint + tests sur PR et push.
- Les conventions (colocalisation, helpers `test/`) sont documentées et suivies.
