# 🐳 Guide de déploiement Docker

Ce guide détaille comment déployer Jean-Michel Volume avec Docker.

## 📋 Prérequis

- Docker et Docker Compose installés
- Un compte Spotify Developer avec une application configurée
- Les credentials Spotify (Client ID et Client Secret)

**Note** : Le Dockerfile utilise l'image `node:22-alpine` pour garantir l'utilisation de la version LTS Jod de Node.js.

## 🚀 Déploiement rapide

### 1. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.docker.example .env
```

Éditez le fichier `.env` avec vos vraies valeurs :

```env
AUTH_SECRET=<généré avec: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
SPOTIFY_CLIENT_ID=<votre-client-id>
SPOTIFY_CLIENT_SECRET=<votre-client-secret>
```

### 2. Lancer l'application

```bash
docker-compose up -d
```

### 3. Vérifier les logs

```bash
docker-compose logs -f
```

### 4. Accéder à l'application

Ouvrez votre navigateur sur [http://localhost:3000](http://localhost:3000)

## 🔧 Commandes utiles

### Arrêter l'application
```bash
docker-compose down
```

### Redémarrer l'application
```bash
docker-compose restart
```

### Rebuild l'image
```bash
docker-compose up -d --build
```

### Voir les logs
```bash
docker-compose logs -f jean-michel-volume
```

### Nettoyer tout
```bash
docker-compose down -v
docker rmi jean-michel-volume
```

## 🌐 Déploiement en production

### 1. Modifier NEXTAUTH_URL

Pour un déploiement en production, modifiez `NEXTAUTH_URL` dans votre fichier `.env` :

```env
NEXTAUTH_URL=https://votre-domaine.com
```

### 2. Configurer un reverse proxy

Exemple avec Nginx :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Configurer HTTPS

Utilisez Certbot pour obtenir un certificat SSL gratuit :

```bash
sudo certbot --nginx -d votre-domaine.com
```

### 4. Mettre à jour Spotify Developer Dashboard

N'oubliez pas d'ajouter l'URL de callback en production :
```
https://votre-domaine.com/api/auth/callback/spotify
```

## 📦 Build manuel

Si vous préférez construire l'image manuellement :

```bash
# Build
docker build -t jean-michel-volume:latest .

# Run
docker run -d \
  -p 3000:3000 \
  -e AUTH_SECRET=<votre-secret> \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e SPOTIFY_CLIENT_ID=<votre-client-id> \
  -e SPOTIFY_CLIENT_SECRET=<votre-client-secret> \
  --name jean-michel-volume \
  --restart unless-stopped \
  jean-michel-volume:latest
```

## 🔐 Sécurité

### Variables d'environnement sensibles

- Ne commitez **jamais** votre fichier `.env` dans Git
- Utilisez des secrets managers en production (Docker Secrets, Kubernetes Secrets, etc.)
- Régénérez `AUTH_SECRET` pour chaque environnement

### Permissions

L'application s'exécute avec un utilisateur non-root (`nextjs:nodejs`) pour plus de sécurité.

## 🐛 Résolution de problèmes

### Le container ne démarre pas

Vérifiez les logs :
```bash
docker-compose logs jean-michel-volume
```

### Les variables d'environnement ne sont pas chargées

1. Vérifiez que votre fichier `.env` est à la racine
2. Redémarrez le container : `docker-compose restart`
3. Vérifiez les variables : `docker-compose exec jean-michel-volume env | grep SPOTIFY`

### L'application n'est pas accessible

1. Vérifiez que le port 3000 n'est pas déjà utilisé
2. Vérifiez que le container est bien lancé : `docker ps`
3. Testez depuis le container : `docker-compose exec jean-michel-volume curl localhost:3000`

## 📊 Surveillance

### Voir l'utilisation des ressources

```bash
docker stats jean-michel-volume
```

### Health check

Ajoutez un health check dans le `docker-compose.yml` :

```yaml
services:
  jean-michel-volume:
    # ... autres configurations
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 🔄 Mise à jour

Pour mettre à jour l'application :

```bash
# Pull les derniers changements
git pull

# Rebuild et redémarrer
docker-compose up -d --build
```

## 💡 Optimisations

### Multi-stage build

Le Dockerfile utilise déjà un build multi-stage pour optimiser la taille de l'image finale.

Taille approximative de l'image : **~150-200 MB**

### Cache des layers

Docker cache automatiquement les layers. Pour forcer un rebuild complet :

```bash
docker-compose build --no-cache
```
