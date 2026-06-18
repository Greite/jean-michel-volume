# Migration next-auth → better-auth (Drizzle + node:sqlite)

**Date** : 2026-06-18
**Statut** : Design validé, en attente de relecture utilisateur avant plan d'implémentation

## Contexte

L'application (`jean-michel-volume`) utilise actuellement **next-auth v4** avec :

- OAuth Spotify uniquement, stratégie **JWT stateless** (aucune base de données)
- Logique custom de refresh du token d'accès Spotify (`refreshAccessToken`)
- Session exposant `accessToken` et `error` côté client
- Côté serveur : `getServerSession(authOptions)` dans `app/page.tsx`, `app/api/spotify/playback/route.ts`, `app/api/spotify/volume/route.ts`
- Côté client : `useSession`, `signIn('spotify')`, `signOut`, `SessionProvider`, `SessionErrorHandler`
- Déploiement Docker (build Bun, runtime **Node 24 « krypton »**, sortie Next.js `standalone`), aucune base de données

L'objectif est de migrer vers **better-auth**, qui est devenu la recommandation de référence (next-auth v4 est en maintenance).

## Décision structurante : la base de données

better-auth **exige une base de données** pour persister `user`, `session`, et surtout les tokens OAuth Spotify (`access_token`/`refresh_token`) dans une table `account`. Il n'existe pas de mode totalement stateless. C'est le changement le plus important par rapport à next-auth v4.

**Choix retenu** : **SQLite** persistée via **volume Docker**, gérée par **Drizzle ORM** avec le driver intégré **`node:sqlite`** (`DatabaseSync`).

Rationale :

- `node:sqlite` est intégré à Node ≥ 22.5 (on a Node 24) → **aucun module natif à compiler**. On évite le problème du build Docker `bun install --ignore-scripts` + Alpine/musl qu'introduirait `better-sqlite3`.
- Drizzle apporte des **migrations SQL versionnées** (revues, reproductibles), un **schéma typé qu'on possède** et l'**extensibilité** (ajout futur de tables applicatives).
- Combinaison validée dans la doc : `drizzle-orm/node-sqlite` supporte `DatabaseSync`, et better-auth fournit un adaptateur Drizzle (`provider: 'sqlite'`).

> **Addendum (2026-06-18)** : le support `node:sqlite` de Drizzle n'existe que dans la ligne **1.0 RC** (la stable `latest` = orm 0.45.2 / kit 0.31.x ne l'a pas). Décision assumée : épingler `drizzle-orm` et `drizzle-kit` **exactement** à `1.0.0-rc.4-5d5b77c` (pré-release). Compromis accepté : on garde Drizzle + migrations versionnées + zéro module natif, au prix d'une dépendance non stable.

## Bénéfices de better-auth ici

- **Provider Spotify natif** avec `scope` custom.
- **Refresh automatique** du token via `auth.api.getAccessToken()` → supprime la logique custom `refreshAccessToken`.
- Chemin de callback OAuth **`/api/auth/callback/spotify`** identique à next-auth → **aucun changement dans le dashboard Spotify**.

## Architecture cible

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `db/index.ts` | Instance Drizzle : `drizzle({ client: new DatabaseSync(DATABASE_PATH), schema })` |
| `db/schema.ts` | Schéma Drizzle généré par le CLI better-auth (`generate`), **commité** |
| `drizzle.config.ts` | Config drizzle-kit : `dialect: 'sqlite'`, `schema: './db/schema.ts'`, `out: './drizzle'` |
| `drizzle/*.sql` | Migrations SQL générées par `drizzle-kit generate`, **commitées** |
| `lib/auth.ts` | Instance better-auth serveur (adaptateur Drizzle + provider Spotify) |
| `lib/auth-client.ts` | Client better-auth (`createAuthClient`) |
| `instrumentation.ts` | Applique les migrations au démarrage du serveur (idempotent) |
| `app/api/auth/[...all]/route.ts` | Handler better-auth via `toNextJsHandler(auth)` |

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `package.json` | Retrait `next-auth` ; ajout `better-auth`, `drizzle-orm` + `drizzle-kit` (dev) ; scripts `db:generate`/`db:migrate` ; `engines.node >= 22.5.0` |
| `next.config.ts` | `serverExternalPackages` si nécessaire ; s'assurer que `./drizzle` est embarqué dans le standalone |
| `app/page.tsx` | `getServerSession` → `auth.api.getSession({ headers })` |
| `app/api/spotify/playback/route.ts` | Auth via `getSession` ; token via `getAccessToken` |
| `app/api/spotify/volume/route.ts` | Auth via `getSession` ; token via `getAccessToken` |
| `components/Providers.tsx` | Retrait de `SessionProvider` (inutile avec better-auth) |
| `components/Header.tsx` | `useSession` depuis l'auth-client |
| `components/SignInButton.tsx` | `authClient.signIn.social({ provider: 'spotify', callbackURL: '/' })` |
| `components/SignOutButton.tsx` | `authClient.signOut()` |
| `hooks/useSpotifyPlayback.ts` | `signOut` depuis l'auth-client |
| `app/layout.tsx` | `metadataBase` : env `NEXTAUTH_URL` → `AUTH_URL` |
| `Dockerfile` | `COPY --from=builder /app/drizzle ./drizzle` ; créer `/app/data` writable par l'user `nextjs` (uid 1001) |
| `docker-compose.yml` | Volume `./data:/app/data` ; `DATABASE_PATH=/app/data/sqlite.db` ; harmonisation env |
| `.env.example`, `.env.docker.example`, `README.md`, `DOCKER.md`, `DEPLOYMENT.md` | Mise à jour des variables d'env |
| `.gitignore` / `.dockerignore` | Ignorer `data/` (fichiers `*.db`) |

### Fichiers supprimés

- `app/api/auth/[...nextauth]/route.ts` (remplacé par `[...all]`)
- `types/next-auth.d.ts` (better-auth est typé par inférence)
- `components/SessionErrorHandler.tsx` (le flux `RefreshAccessTokenError` est remplacé, voir Gestion des erreurs)

## Configuration better-auth (`lib/auth.ts`)

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle'; // chemin exact confirmé à l'install
import { db } from '@/db';

const SPOTIFY_SCOPES = [
  'user-read-email',            // requis : better-auth a besoin de l'email pour créer le user
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

## Couche base de données (`db/index.ts`)

```ts
import { drizzle } from 'drizzle-orm/node-sqlite';
import { DatabaseSync } from 'node:sqlite';
import * as schema from './schema';

const sqlite = new DatabaseSync(process.env.DATABASE_PATH ?? './data/sqlite.db');
export const db = drizzle({ client: sqlite, schema });
```

## Migrations

- **Génération du schéma** : `npx @better-auth/cli generate` (sortie Drizzle) → `db/schema.ts`.
- **Génération des migrations** : `drizzle-kit generate` → `./drizzle/*.sql` (commités).
- **Application au démarrage** (`instrumentation.ts`) :

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { migrate } = await import('drizzle-orm/node-sqlite/migrator');
    const { db } = await import('@/db');
    migrate(db, { migrationsFolder: './drizzle' });
  }
}
```

- **Docker** : `migrationsFolder: './drizzle'` se résout depuis le cwd `/app`. Les fichiers SQL sont lus via le système de fichiers (et non importés), donc le tracing Next.js ne les embarque pas automatiquement → `COPY --from=builder /app/drizzle ./drizzle` dans le stage runner.

## Flux de données

**Connexion** : `authClient.signIn.social({ provider: 'spotify', callbackURL: '/' })` → redirection vers Spotify → callback `/api/auth/callback/spotify` → better-auth crée `user`/`session`/`account` et stocke les tokens → cookie de session posé → redirection vers `/`.

**Vérification serveur** : `auth.api.getSession({ headers: await headers() })` retourne la session ou `null`.

**Utilisation du token** : les routes API appellent `auth.api.getAccessToken({ body: { providerId: 'spotify' }, headers })` → renvoie un access token frais (refresh automatique depuis le refresh token stocké) → passé aux helpers `lib/spotify-api.ts`.

**Rate-limit** : clé sur `session.user.id` (plus stable que email/name).

## Gestion des erreurs

- Si Spotify a révoqué le refresh token, `getAccessToken` échoue côté serveur → la route renvoie `401`.
- Le client gère déjà ce cas : `useSpotifyPlayback.handleAuthFailure` affiche l'erreur et déclenche `signOut`. C'est pourquoi `SessionErrorHandler` (qui surveillait `session.error === 'RefreshAccessTokenError'`) devient inutile et est supprimé.

## Variables d'environnement

| Variable | Statut | Usage |
|---|---|---|
| `AUTH_SECRET` | conservée | `secret` better-auth |
| `AUTH_URL` | **standardisée** | `baseURL` better-auth + `metadataBase`. Remplace le mélange `AUTH_URL`/`NEXTAUTH_URL` |
| `SPOTIFY_CLIENT_ID` | conservée | provider Spotify |
| `SPOTIFY_CLIENT_SECRET` | conservée | provider Spotify |
| `DATABASE_PATH` | **nouvelle** | chemin du fichier SQLite (défaut `./data/sqlite.db`, Docker `/app/data/sqlite.db`) |
| `DEBUG_MODE` / `NEXT_PUBLIC_DEBUG_MODE` | conservées | logs |

## Changements de comportement assumés

1. **Sessions persistées en base** : sans volume Docker, chaque redémarrage déconnecte les utilisateurs. → couvert par le volume `./data`.
2. **Scope `user-read-email` ajouté** : les utilisateurs existants devront ré-autoriser l'application (nouvel écran de consentement Spotify).
3. **`session.accessToken` retiré du client** : le token Spotify est désormais résolu côté serveur à chaque appel API (jamais exposé au navigateur — amélioration de sécurité).
4. **Node ≥ 22.5 requis** (`node:sqlite`) : satisfait par l'image runtime Node 24 et `.nvmrc` (`lts/krypton`) ; `engines.node` passe à `>= 22.5.0`.
5. **Déconnexion sur token révoqué non proactive** : `SessionErrorHandler` (qui surveillait `session.error` en continu) est supprimé. La déconnexion automatique se déclenche désormais uniquement lorsqu'un appel API renvoie 401 (`useSpotifyPlayback.handleAuthFailure`), pas en arrière-plan à l'idle. Acceptable ici car la vue principale poll en continu.

## CSP / proxy

`proxy.ts` reste inchangé : `connect-src` couvre déjà `api.spotify.com`/`accounts.spotify.com`, `form-action` autorise `accounts.spotify.com`, et les appels de l'auth-client sont same-origin (`/api/auth/*`). À vérifier au test manuel.

## Vérification

- `bun run lint` (tsc + biome) passe sans erreur.
- `drizzle-kit generate` produit une migration ; le boot l'applique.
- Test manuel du flux complet : connexion Spotify → session persistée → contrôle volume/playback → déconnexion → **redémarrage du conteneur** (la session est conservée grâce au volume).

## Détails d'implémentation à confirmer à l'install

- Chemin d'import exact de l'adaptateur Drizzle : `better-auth/adapters/drizzle` vs `@better-auth/drizzle-adapter` (selon la version installée).
- Commande exacte du CLI better-auth pour générer le schéma Drizzle (`@better-auth/cli generate` ou `better-auth generate`).
- Nécessité éventuelle de `serverExternalPackages`/`outputFileTracingIncludes` dans `next.config.ts` pour le standalone.

## Hors scope (YAGNI)

- Pas d'autres providers que Spotify.
- Pas d'email/password, magic link, ni autres plugins better-auth.
- Pas de migration des sessions next-auth existantes (les utilisateurs se reconnectent).
- Pas de persistance d'autres données applicatives (historique, réglages voix) dans cette migration — le socle Drizzle le permettra ultérieurement.
