# Migration next-auth → better-auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer next-auth v4 par better-auth (provider Spotify), avec persistance SQLite gérée par Drizzle ORM sur le driver `node:sqlite`.

**Architecture:** better-auth stocke `user`/`session`/`account` (tokens Spotify) dans une base SQLite, accédée via l'adaptateur Drizzle et le driver intégré `node:sqlite` (aucun module natif). Les migrations Drizzle sont versionnées et appliquées au démarrage du serveur via `instrumentation.ts`. Le token Spotify est résolu côté serveur à chaque appel API (refresh automatique par better-auth), au lieu d'être porté par le JWT client.

**Tech Stack:** Next.js 16 (App Router, output standalone), React 19, better-auth, drizzle-orm + drizzle-kit, `node:sqlite`, Bun (gestionnaire/builder), Node 24 (runtime), Docker, Biome.

## Global Constraints

- **Runtime production = Node 24** (`node:krypton-alpine`, `CMD ["node","server.js"]`). Pas Bun. → driver `node:sqlite`, jamais `bun:sqlite`.
- **Aucun module natif** : ne pas introduire `better-sqlite3` (le build Docker utilise `--ignore-scripts` sur Alpine/musl).
- **Toolchain Drizzle = 1.0 RC (pré-release, décision utilisateur du 2026-06-18)** : `drizzle-orm` ET `drizzle-kit` épinglés **exactement** à `1.0.0-rc.4-5d5b77c` (versions liées, même hash). C'est la seule ligne Drizzle exposant `node:sqlite` ; la stable `latest` (orm 0.45.2 / kit 0.31.x) ne l'a pas. **Pas de `^`** sur ces deux dépendances.
- **Node ≥ 22.5.0** requis pour `node:sqlite` (satisfait : `.nvmrc` = `lts/krypton`).
- **Callback OAuth = `/api/auth/callback/spotify`** (identique à next-auth) → ne pas modifier le dashboard Spotify.
- **Scopes Spotify** : `user-read-email`, `user-read-playback-state`, `user-modify-playback-state`, `user-read-currently-playing` (le `user-read-email` est requis par better-auth pour créer le `user`).
- **Variables d'env** : `AUTH_SECRET` (conservée), `AUTH_URL` (standardisée, remplace le mélange `AUTH_URL`/`NEXTAUTH_URL`), `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `DATABASE_PATH` (nouvelle, défaut `./data/sqlite.db`).
- **Pas de harnais de test unitaire** dans ce repo : la vérification par tâche est `bun run tsc` (et `bun run biome:check` si pertinent). Vérification fonctionnelle = tâche finale manuelle.
- **Convention de commit** du repo : `<Type> - #JMV-NoId - <description>`, avec le trailer `Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5`.
- Chaque tâche doit laisser `bun run tsc` **vert**. `next-auth` reste installé jusqu'à la tâche de nettoyage (Tâche 7) pour que le code intermédiaire compile.

---

### Task 1: Dépendances + couche base de données

**Files:**
- Modify: `package.json` (dependencies, devDependencies, engines, scripts)
- Create: `db/schema.ts`
- Create: `db/index.ts`
- Create: `drizzle.config.ts`
- Modify: `.gitignore`
- Modify: `.dockerignore`

**Interfaces:**
- Produces: `db` (instance Drizzle exportée depuis `@/db`) consommée par `lib/auth.ts` (Tâche 2) et `instrumentation.ts` (Tâche 3).

- [ ] **Step 1: Installer les dépendances** (garder `next-auth` pour l'instant)

```bash
bun add better-auth drizzle-orm
bun add -d drizzle-kit
```

- [ ] **Step 2: Confirmer le chemin d'import de l'adaptateur Drizzle**

Vérifier l'export réel de la version installée (le défaut attendu est `better-auth/adapters/drizzle`) :

```bash
node -e "console.log(Object.keys(require('better-auth/package.json').exports))"
```

Attendu : la liste contient `./adapters/drizzle`. Si ce n'est pas le cas (package séparé), noter le chemin (`@better-auth/drizzle-adapter`) et l'utiliser dans la Tâche 2.

- [ ] **Step 3: Créer un schéma vide temporaire** `db/schema.ts`

Ce fichier sera écrasé par le CLI better-auth en Tâche 2. Placeholder pour que les imports résolvent :

```ts
// Généré par `@better-auth/cli generate` en Tâche 2 — ne pas éditer à la main ensuite.
export {};
```

- [ ] **Step 4: Créer** `db/index.ts`

```ts
import { drizzle } from 'drizzle-orm/node-sqlite';
import { DatabaseSync } from 'node:sqlite';

import * as schema from './schema';

const sqlite = new DatabaseSync(process.env.DATABASE_PATH ?? './data/sqlite.db');

export const db = drizzle({ client: sqlite, schema });
```

- [ ] **Step 5: Créer** `drizzle.config.ts`

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? './data/sqlite.db',
  },
});
```

- [ ] **Step 6: Mettre à jour** `package.json` (engines + scripts)

Dans `"engines"`, passer `"node": ">=22.5.0"`. Ajouter dans `"scripts"` :

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

- [ ] **Step 7: Ignorer la base locale** — ajouter à `.gitignore` ET `.dockerignore` :

```
# Base SQLite locale
/data
*.db
```

- [ ] **Step 8: Vérifier la compilation**

Run: `bun run tsc`
Expected: PASS (aucune erreur). Note : `db/index.ts` compile même avec un schéma vide.

- [ ] **Step 9: Commit**

```bash
git add package.json bun.lock db/ drizzle.config.ts .gitignore .dockerignore
git commit -m "$(cat <<'EOF'
Chore - #JMV-NoId - Add better-auth + drizzle deps and SQLite db layer

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

### Task 2: Config better-auth + génération du schéma et de la migration

**Files:**
- Create: `lib/auth.ts`
- Modify: `db/schema.ts` (écrasé par le CLI better-auth)
- Create: `drizzle/*.sql` + `drizzle/meta/*` (générés par drizzle-kit)
- Create: `.env` entries (ajouter `DATABASE_PATH` au `.env` local si besoin pour le CLI)

**Interfaces:**
- Consumes: `db` depuis `@/db` (Tâche 1).
- Produces: `auth` (instance better-auth exportée depuis `@/lib/auth`) consommée par les Tâches 3, 4, 5. Expose `auth.api.getSession(...)`, `auth.api.getAccessToken(...)`, et `auth.handler`.

- [ ] **Step 1: Créer** `lib/auth.ts`

(Utiliser le chemin d'import de l'adaptateur confirmé en Tâche 1 Step 2.)

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '@/db';

const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
];

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.AUTH_URL,
  socialProviders: {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
      scope: SPOTIFY_SCOPES,
    },
  },
});
```

- [ ] **Step 2: S'assurer que `DATABASE_PATH` est défini pour le CLI** (local)

Vérifier que `.env` contient `DATABASE_PATH=./data/sqlite.db` (sinon l'ajouter) et créer le dossier :

```bash
mkdir -p data
```

- [ ] **Step 3: Générer le schéma Drizzle depuis la config better-auth**

```bash
bunx @better-auth/cli@latest generate --output db/schema.ts -y
```

Attendu : `db/schema.ts` contient désormais les tables `user`, `session`, `account`, `verification` (définitions `sqliteTable`).
Si l'option `--output` diffère selon la version, exécuter `bunx @better-auth/cli@latest generate --help`, puis placer le contenu généré dans `db/schema.ts`.

- [ ] **Step 4: Générer la migration SQL**

```bash
bun run db:generate
```

Attendu : un fichier `drizzle/0000_*.sql` + `drizzle/meta/` sont créés.

- [ ] **Step 5: Vérifier que la migration crée bien la base** (sanity check local)

```bash
bun run db:migrate
```

Attendu : `data/sqlite.db` est créé sans erreur. (Ce fichier est ignoré par git.)

- [ ] **Step 6: Vérifier la compilation**

Run: `bun run tsc`
Expected: PASS. `lib/auth.ts` compile ; il n'est pas encore importé ailleurs.

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts db/schema.ts drizzle/
git commit -m "$(cat <<'EOF'
Feat - #JMV-NoId - Add better-auth server config and Drizzle schema/migration

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

### Task 3: Application des migrations au démarrage (`instrumentation.ts`)

**Files:**
- Create: `instrumentation.ts`

**Interfaces:**
- Consumes: `db` depuis `@/db`.

- [ ] **Step 1: Créer** `instrumentation.ts` (racine du projet)

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrate } = await import('drizzle-orm/node-sqlite/migrator');
    const { db } = await import('@/db');
    migrate(db, { migrationsFolder: './drizzle' });
  }
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `bun run tsc`
Expected: PASS.
Note : si le sous-chemin `drizzle-orm/node-sqlite/migrator` n'existe pas dans la version installée, lister les migrators dispo via `node -e "console.log(Object.keys(require('drizzle-orm/package.json').exports).filter(k=>k.includes('migrator')))"` et utiliser celui de `node-sqlite`.

- [ ] **Step 3: Vérifier l'exécution au boot** (dev)

```bash
bun run dev
```

Attendu : le serveur démarre, `data/sqlite.db` est présent/à jour, aucune erreur de migration dans les logs. Arrêter le serveur (Ctrl-C).

- [ ] **Step 4: Commit**

```bash
git add instrumentation.ts
git commit -m "$(cat <<'EOF'
Feat - #JMV-NoId - Apply Drizzle migrations on server startup via instrumentation

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

### Task 4: Migrer les consommateurs serveur (page + routes API Spotify)

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/api/spotify/playback/route.ts`
- Modify: `app/api/spotify/volume/route.ts`

**Interfaces:**
- Consumes: `auth` depuis `@/lib/auth` (`auth.api.getSession`, `auth.api.getAccessToken`), `headers` depuis `next/headers`.
- Note : `auth.api.getSession({ headers })` retourne `{ session, user } | null`. `auth.api.getAccessToken({ body: { providerId, ... }, headers })` retourne un objet contenant `accessToken: string` et lève une erreur si le compte est absent / le refresh échoue.

- [ ] **Step 1: Modifier** `app/page.tsx` — remplacer l'import et l'appel de session

Remplacer les lignes 1-3 et 13 :

```tsx
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { ImportantNotes } from '@/components/ImportantNotes';
import { VoiceVolumeController } from '@/components/VoiceVolumeController';
import { WelcomeCard } from '@/components/WelcomeCard';

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  // ... le reste est inchangé : `{session ? (...) : (...)}`
```

- [ ] **Step 2: Modifier** `app/api/spotify/playback/route.ts`

Remplacer l'import (lignes 2-4) :

```ts
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
```

Dans `GET()`, remplacer le bloc session/token (lignes 32-37) :

```ts
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let accessToken: string;
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: 'spotify' },
      headers: await headers(),
    });
    accessToken = token.accessToken;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = await getPlaybackState(accessToken);
    if (!state) {
      return NextResponse.json({ error: 'Failed to get playback state' }, { status: 502 });
    }
    return NextResponse.json(state);
  } catch (error) {
    logger.error('Error getting playback state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

Dans `POST(request)`, remplacer le bloc session/token/clé (lignes 49-54) :

```ts
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let accessToken: string;
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: 'spotify' },
      headers: await headers(),
    });
    accessToken = token.accessToken;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = getClientKey(request.headers, session.user.id);
  const rl = checkRateLimit(`playback:${key}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  // ... le reste est inchangé, en remplaçant `session.accessToken` par `accessToken`
  // dans les appels `transferPlayback(...)` et `controlPlayback(...)`.
```

- [ ] **Step 3: Modifier** `app/api/spotify/volume/route.ts`

Remplacer l'import (lignes 2-4) :

```ts
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
```

Remplacer le début de `POST` (lignes 20-27) :

```ts
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let accessToken: string;
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: 'spotify' },
      headers: await headers(),
    });
    accessToken = token.accessToken;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = getClientKey(request.headers, session.user.id);
  const rl = checkRateLimit(`vol:${key}`);
  // ... le reste inchangé, en remplaçant `session.accessToken` par `accessToken`
  // dans `setSpotifyVolume(accessToken, body.volume)`.
```

- [ ] **Step 4: Vérifier la compilation**

Run: `bun run tsc`
Expected: PASS. Plus aucune référence à `getServerSession`/`authOptions` hors de `app/api/auth/[...nextauth]/route.ts`.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/api/spotify/playback/route.ts app/api/spotify/volume/route.ts
git commit -m "$(cat <<'EOF'
Refactor - #JMV-NoId - Use better-auth getSession/getAccessToken in server routes

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

### Task 5: Remplacer le route handler d'authentification

**Files:**
- Delete: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/api/auth/[...all]/route.ts`

**Interfaces:**
- Consumes: `auth` depuis `@/lib/auth`, `toNextJsHandler` depuis `better-auth/next-js`.
- Important : Next.js interdit deux routes catch-all (`[...nextauth]` et `[...all]`) au même niveau. **Supprimer l'ancienne AVANT de créer la nouvelle.**

- [ ] **Step 1: Supprimer l'ancien handler**

```bash
git rm app/api/auth/[...nextauth]/route.ts
```

- [ ] **Step 2: Créer** `app/api/auth/[...all]/route.ts`

```ts
import { toNextJsHandler } from 'better-auth/next-js';

import { auth } from '@/lib/auth';

export const { POST, GET } = toNextJsHandler(auth);
```

- [ ] **Step 3: Vérifier la compilation**

Run: `bun run tsc`
Expected: PASS. Plus aucune référence à `authOptions`/`NextAuth`/`getServerSession` dans le code applicatif.

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/
git commit -m "$(cat <<'EOF'
Feat - #JMV-NoId - Replace next-auth route handler with better-auth toNextJsHandler

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

### Task 6: Migrer le client (auth-client + composants + hook)

**Files:**
- Create: `lib/auth-client.ts`
- Modify: `components/Providers.tsx`
- Modify: `components/Header.tsx`
- Modify: `components/SignInButton.tsx`
- Modify: `components/SignOutButton.tsx`
- Modify: `hooks/useSpotifyPlayback.ts`
- Delete: `components/SessionErrorHandler.tsx`

**Interfaces:**
- Produces: `authClient` depuis `@/lib/auth-client`, exposant `authClient.useSession()` (`{ data, isPending, error }`), `authClient.signIn.social(...)`, `authClient.signOut(...)`.

- [ ] **Step 1: Créer** `lib/auth-client.ts`

```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();
```

- [ ] **Step 2: Modifier** `components/Providers.tsx` — retirer `SessionProvider` et `SessionErrorHandler`

```tsx
'use client';

import { ThemeProvider } from './ThemeProvider';

import { I18nProvider } from '@/lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Modifier** `components/Header.tsx` — remplacer l'import (ligne 5) et l'usage (ligne 15)

```tsx
import { authClient } from '@/lib/auth-client';
```

```tsx
const { data: session } = authClient.useSession();
```

Le reste (`{session ? <SignOutButton /> : <SignInButton />}`) est inchangé.

- [ ] **Step 4: Modifier** `components/SignInButton.tsx` — remplacer l'import (ligne 3) et le `onClick` (ligne 12)

```tsx
import { authClient } from '@/lib/auth-client';
```

```tsx
onClick={() => authClient.signIn.social({ provider: 'spotify', callbackURL: '/' })}
```

- [ ] **Step 5: Modifier** `components/SignOutButton.tsx` — remplacer l'import (ligne 3) et le `onClick` (ligne 12)

```tsx
import { authClient } from '@/lib/auth-client';
```

```tsx
onClick={() =>
  authClient.signOut({
    fetchOptions: { onSuccess: () => { window.location.href = '/'; } },
  })
}
```

- [ ] **Step 6: Modifier** `hooks/useSpotifyPlayback.ts` — remplacer l'import (ligne 3) et l'appel `signOut` (ligne 43)

```ts
import { authClient } from '@/lib/auth-client';
```

Dans `handleAuthFailure` :

```ts
setTimeout(
  () => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/'; } } }),
  2000,
);
```

- [ ] **Step 7: Supprimer** `components/SessionErrorHandler.tsx`

```bash
git rm components/SessionErrorHandler.tsx
```

- [ ] **Step 8: Vérifier la compilation**

Run: `bun run tsc`
Expected: PASS. Plus aucune référence à `next-auth/react`.

- [ ] **Step 9: Commit**

```bash
git add lib/auth-client.ts components/ hooks/useSpotifyPlayback.ts
git commit -m "$(cat <<'EOF'
Refactor - #JMV-NoId - Migrate client auth to better-auth react client

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

### Task 7: Nettoyage final next-auth

**Files:**
- Modify: `package.json` (retrait de `next-auth`)
- Delete: `types/next-auth.d.ts`
- Modify: `app/layout.tsx` (env `NEXTAUTH_URL` → `AUTH_URL`)

**Interfaces:** aucune nouvelle.

- [ ] **Step 1: Vérifier qu'aucune référence next-auth ne subsiste dans le code**

```bash
grep -rn "next-auth" --include="*.ts" --include="*.tsx" app components hooks lib types 2>/dev/null
```

Attendu : **aucune sortie**. (Si une référence apparaît, la migrer avant de continuer.)

- [ ] **Step 2: Désinstaller next-auth**

```bash
bun remove next-auth
```

- [ ] **Step 3: Supprimer le fichier de types**

```bash
git rm types/next-auth.d.ts
```

- [ ] **Step 4: Modifier** `app/layout.tsx` (ligne 28)

```tsx
metadataBase: new URL(process.env.AUTH_URL ?? 'http://localhost:3000'),
```

- [ ] **Step 5: Vérifier la compilation + le lint complet**

Run: `bun run lint`
Expected: PASS (tsc + biome:check + biome:format).

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock types app/layout.tsx
git commit -m "$(cat <<'EOF'
Chore - #JMV-NoId - Remove next-auth dependency and types

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

### Task 8: Docker, volume et variables d'environnement

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `.env.docker.example`

**Interfaces:** aucune (config infra).

- [ ] **Step 1: Modifier** `Dockerfile` — embarquer les migrations et créer le dossier data writable

Dans le stage `runner`, après les `COPY` existants (après la ligne `COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static`) et **avant** `USER nextjs`, ajouter :

```dockerfile
# Migrations Drizzle (lues au runtime par instrumentation.ts)
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# Dossier de la base SQLite (monté en volume), writable par l'utilisateur nextjs
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
```

- [ ] **Step 2: Modifier** `docker-compose.yml` — volume + variables d'env

Remplacer le bloc `environment` et ajouter un `volumes` :

```yaml
    environment:
      # Better Auth
      - AUTH_SECRET=${AUTH_SECRET}
      - AUTH_URL=${AUTH_URL:-http://localhost:3000}

      # Base SQLite (persistée via le volume ci-dessous)
      - DATABASE_PATH=/app/data/sqlite.db

      # Spotify API Configuration
      - SPOTIFY_CLIENT_ID=${SPOTIFY_CLIENT_ID}
      - SPOTIFY_CLIENT_SECRET=${SPOTIFY_CLIENT_SECRET}

      # Debug Mode
      - DEBUG_MODE=${DEBUG_MODE:-false}
      - NEXT_PUBLIC_DEBUG_MODE=${NEXT_PUBLIC_DEBUG_MODE:-false}

      # Node Environment
      - NODE_ENV=production
    restart: unless-stopped
    volumes:
      - ./data:/app/data
```

- [ ] **Step 3: Modifier** `.env.example`

```
# Better Auth
AUTH_SECRET=your-auth-secret-here # Générez avec: openssl rand -base64 32
AUTH_URL=http://localhost:3000

# Base de données SQLite (chemin du fichier)
DATABASE_PATH=./data/sqlite.db

# Spotify API
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Debug mode (affiche les logs dans la console)
DEBUG_MODE=false
NEXT_PUBLIC_DEBUG_MODE=false
```

- [ ] **Step 4: Modifier** `.env.docker.example`

```
# Better Auth
AUTH_SECRET=your-auth-secret-here
AUTH_URL=http://localhost:3000

# Spotify API Configuration
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Debug mode
DEBUG_MODE=false
NEXT_PUBLIC_DEBUG_MODE=false

# Note: DATABASE_PATH est fixé à /app/data/sqlite.db dans docker-compose.yml (volume ./data)
# Note: Generate AUTH_SECRET with: openssl rand -base64 32
```

- [ ] **Step 5: Vérifier le build Docker**

```bash
docker build -t jmv-better-auth-test .
```

Expected: build réussi jusqu'au stage runner, dossier `drizzle/` présent dans l'image.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .env.example .env.docker.example
git commit -m "$(cat <<'EOF'
Chore - #JMV-NoId - Add SQLite volume and better-auth env to Docker setup

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

### Task 9: Documentation

**Files:**
- Modify: `README.md`
- Modify: `DOCKER.md`
- Modify: `DEPLOYMENT.md`

**Interfaces:** aucune.

- [ ] **Step 1: Mettre à jour** `README.md`

Remplacer les références `NextAuth`/`NEXTAUTH_URL` par better-auth/`AUTH_URL`, ajouter `DATABASE_PATH`, mentionner le scope `user-read-email`. Dans le tableau des variables (lignes ~155-160) :
- `AUTH_SECRET` : "Better Auth secret (généré avec `openssl rand -base64 32`)"
- Remplacer `NEXTAUTH_URL` par `AUTH_URL` : "URL de base de l'application"
- Ajouter `DATABASE_PATH` : "Chemin du fichier SQLite (défaut `./data/sqlite.db`)"

Mentionner que la persistance nécessite le volume Docker `./data`.

- [ ] **Step 2: Mettre à jour** `DOCKER.md`

Remplacer toutes les occurrences `NEXTAUTH_URL` → `AUTH_URL` (lignes ~27, 78-83, 133), documenter le volume `./data:/app/data` et la nécessité de persister la base pour conserver les sessions.

- [ ] **Step 3: Mettre à jour** `DEPLOYMENT.md`

Remplacer `NEXTAUTH_URL` → `AUTH_URL` (ligne ~66), ajouter `DATABASE_PATH` et la note sur le volume de persistance.

- [ ] **Step 4: Vérifier qu'aucune référence obsolète ne subsiste**

```bash
grep -rn "NEXTAUTH_URL\|NextAuth\|next-auth" --include="*.md" . --exclude-dir=node_modules --exclude-dir=docs 2>/dev/null
```

Attendu : aucune sortie (hors le spec/plan dans `docs/`, exclus).

- [ ] **Step 5: Commit**

```bash
git add README.md DOCKER.md DEPLOYMENT.md
git commit -m "$(cat <<'EOF'
Docs - #JMV-NoId - Update docs for better-auth, AUTH_URL and SQLite volume

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

### Task 10: Vérification fonctionnelle de bout en bout

**Files:** aucun (vérification manuelle).

**Prérequis:** `.env` local renseigné avec `AUTH_SECRET`, `AUTH_URL=http://localhost:3000`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `DATABASE_PATH=./data/sqlite.db`. Vérifier que `http://localhost:3000/api/auth/callback/spotify` est bien dans les Redirect URIs du dashboard Spotify (déjà le cas si l'app fonctionnait avec next-auth).

- [ ] **Step 1: Lint final**

Run: `bun run lint`
Expected: PASS.

- [ ] **Step 2: Démarrer l'app**

```bash
bun run dev
```

- [ ] **Step 3: Tester le flux de connexion**

Ouvrir `http://localhost:3000`, cliquer « Se connecter », autoriser sur Spotify (vérifier que l'écran demande bien l'accès email + lecture/contrôle), revenir sur l'app connecté.
Expected: l'utilisateur est connecté, `Header` affiche le bouton de déconnexion.

- [ ] **Step 4: Vérifier la persistance en base**

```bash
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('./data/sqlite.db');console.log(db.prepare('select count(*) c from account').get(), db.prepare('select count(*) c from user').get());"
```

Expected: `account` et `user` contiennent ≥ 1 ligne (le token Spotify est stocké).

- [ ] **Step 5: Tester le contrôle Spotify**

Lancer une lecture sur un appareil Spotify, vérifier que l'app affiche le morceau (`/api/spotify/playback`), puis tester le volume (slider) et play/pause.
Expected: volume et lecture/pause fonctionnent (200), pas de 401.

- [ ] **Step 6: Tester la déconnexion**

Cliquer « Se déconnecter ».
Expected: retour à l'écran d'accueil non connecté.

- [ ] **Step 7: Vérifier la persistance après redémarrage (Docker)**

```bash
docker compose up -d --build
```

Se connecter, puis :

```bash
docker compose restart
```

Recharger la page.
Expected: la session est **conservée** après le redémarrage (grâce au volume `./data`).

- [ ] **Step 8: Commit éventuel** (si des ajustements ont été nécessaires)

```bash
git add -A
git commit -m "$(cat <<'EOF'
Fix - #JMV-NoId - Adjustments from end-to-end better-auth verification

Claude-Session: https://claude.ai/code/session_01FamK7s5Yd1vdCXDNUmfrt5
EOF
)"
```

---

## Notes de vérification post-rédaction (self-review)

- **Couverture du spec** : DB Drizzle+node:sqlite (T1-2), config better-auth + scope `user-read-email` (T2), migrations au boot (T3), routes serveur `getSession`/`getAccessToken` (T4), handler `[...all]` (T5), client + suppression `SessionErrorHandler` (T6), suppression `next-auth`/types + `metadataBase` (T7), Docker volume + env + `AUTH_URL`/`DATABASE_PATH` (T8), docs (T9), vérif comportements assumés dont persistance (T10). ✅
- **Ordre / compilation** : `next-auth` reste installé jusqu'à T7 ; les consommateurs serveur (T4) sont migrés avant la suppression du handler (T5) ; pas de double catch-all (T5 supprime avant de créer). Chaque tâche laisse `bun run tsc` vert.
- **Détails à confirmer à l'install** (signalés dans les steps) : chemin d'import `better-auth/adapters/drizzle`, options exactes du CLI `@better-auth/cli generate`, sous-chemin `drizzle-orm/node-sqlite/migrator`.
