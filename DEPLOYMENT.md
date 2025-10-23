# Déploiement de Jean-Michel Volume

## GitHub Actions - Build automatique de l'image Docker

### Configuration

Le workflow GitHub Actions (`.github/workflows/docker-build.yml`) build et push automatiquement l'image Docker vers **GitHub Container Registry (GHCR)**.

### Déclencheurs

L'image est buildée automatiquement dans les cas suivants :
- **Push sur main/master** : Crée un tag `latest` et `main-<sha>`
- **Pull Request** : Build l'image mais ne la push pas (test uniquement)
- **Tag version** (ex: `v1.0.0`) : Crée les tags `1.0.0`, `1.0`, `1`, et `latest`

### Pas de configuration nécessaire

Le workflow utilise `GITHUB_TOKEN` qui est automatiquement fourni par GitHub Actions. **Aucun secret à configurer** !

### Tags générés

Pour chaque commit sur `main` :
```
ghcr.io/greite/jean-michel-volume:latest
ghcr.io/greite/jean-michel-volume:main
ghcr.io/greite/jean-michel-volume:main-<commit-sha>
```

Pour chaque tag version (ex: `v1.2.3`) :
```
ghcr.io/greite/jean-michel-volume:1.2.3
ghcr.io/greite/jean-michel-volume:1.2
ghcr.io/greite/jean-michel-volume:1
ghcr.io/greite/jean-michel-volume:latest
```

### Plateformes supportées

L'image est buildée pour plusieurs architectures :
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit - Raspberry Pi, Mac M1/M2, etc.)

## Utiliser l'image depuis GHCR

### 1. Authentification (si dépôt privé)

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u greite --password-stdin
```

### 2. Pull de l'image

```bash
# Dernière version
docker pull ghcr.io/greite/jean-michel-volume:latest

# Version spécifique
docker pull ghcr.io/greite/jean-michel-volume:1.0.0
```

### 3. Lancer le conteneur

Créer un fichier `.env` avec vos variables :
```bash
AUTH_SECRET=your-auth-secret
NEXTAUTH_URL=https://your-domain.com
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
DEBUG_MODE=false
NEXT_PUBLIC_DEBUG_MODE=false
```

Puis lancer :
```bash
docker run -d \
  --name jean-michel-volume \
  -p 3000:3000 \
  --env-file .env \
  ghcr.io/greite/jean-michel-volume:latest
```

Ou avec docker-compose :
```yaml
services:
  jean-michel-volume:
    image: ghcr.io/greite/jean-michel-volume:latest
    container_name: jean-michel-volume
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
```

## Build local

Si vous voulez builder l'image localement :

```bash
# Build
docker build -t jean-michel-volume .

# Run
docker run -d -p 3000:3000 --env-file .env jean-michel-volume
```

## Rendre l'image publique (optionnel)

Par défaut, les images GHCR sont **privées**. Pour la rendre publique :

1. Aller sur https://github.com/greite/jean-michel-volume/pkgs/container/jean-michel-volume
2. Cliquer sur "Package settings"
3. Scroll vers le bas jusqu'à "Danger Zone"
4. Cliquer sur "Change visibility" → "Public"

Cela permettra à tout le monde de pull l'image sans authentification.

## Créer une release avec tag

Pour créer une nouvelle version avec tag :

```bash
# Créer un tag
git tag v1.0.0
git push origin v1.0.0

# Ou créer une release via GitHub UI
# → Cela déclenchera automatiquement le build avec les tags de version
```

## Cache de build

Le workflow utilise GitHub Actions Cache pour accélérer les builds :
- Les layers Docker sont mis en cache entre les builds
- Réduit considérablement le temps de build pour les commits suivants

## Monitoring

Pour voir les builds en cours :
- Aller dans l'onglet **Actions** de votre dépôt GitHub
- Cliquer sur le workflow "Build and Push Docker Image"
- Voir les logs de chaque étape
