# 🐳 Docker deployment guide

This guide explains how to deploy Jean-Michel Volume with Docker.

## 📋 Prerequisites

- Docker and Docker Compose installed
- A Spotify Developer account with a configured application
- Spotify credentials (Client ID and Client Secret)

**Note**: The Dockerfile uses the `node:22-alpine` image to ensure usage of the Node.js LTS Jod version.

## 🚀 Quick deployment

### 1. Configure environment variables

Create a `.env` file at the project root:

```bash
cp .env.docker.example .env
```

Edit the `.env` file with your real values:

```env
AUTH_SECRET=<generated with: openssl rand -base64 32>
AUTH_URL=http://localhost:3000
SPOTIFY_CLIENT_ID=<your-client-id>
SPOTIFY_CLIENT_SECRET=<your-client-secret>
DATABASE_PATH=./data/sqlite.db
```

### 2. Run the application

```bash
docker-compose up -d
```

### 3. Check the logs

```bash
docker-compose logs -f
```

### 4. Access the application

Open your browser at [http://localhost:3000](http://localhost:3000)

## 🔧 Useful commands

### Stop the application
```bash
docker-compose down
```

### Restart the application
```bash
docker-compose restart
```

### Rebuild the image
```bash
docker-compose up -d --build
```

### View the logs
```bash
docker-compose logs -f jean-michel-volume
```

### Clean everything
```bash
docker-compose down -v
docker rmi jean-michel-volume
```

## 🌐 Production deployment

### 1. Update AUTH_URL

For a production deployment, update `AUTH_URL` in your `.env` file:

```env
AUTH_URL=https://your-domain.com
DATABASE_PATH=/app/data/sqlite.db
```

> **Persistence**: Mount the volume `./data:/app/data` to keep sessions across container restarts. Without it, the SQLite database is lost when the container stops.

### 2. Configure a reverse proxy

Example with Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

### 3. Configure HTTPS

Use Certbot to get a free SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com
```

### 4. Update Spotify Developer Dashboard

Don't forget to add the production callback URL:
```
https://your-domain.com/api/auth/callback/spotify
```

## 📦 Manual build

If you prefer to build the image manually:

```bash
# Build
docker build -t jean-michel-volume:latest .

# Run
docker run -d \
  -p 3000:3000 \
  -e AUTH_SECRET=<your-secret> \
  -e AUTH_URL=http://localhost:3000 \
  -e SPOTIFY_CLIENT_ID=<your-client-id> \
  -e SPOTIFY_CLIENT_SECRET=<your-client-secret> \
  -e DATABASE_PATH=/app/data/sqlite.db \
  -v ./data:/app/data \
  --name jean-michel-volume \
  --restart unless-stopped \
  jean-michel-volume:latest
```

## 🏠 Running on Unraid (PUID/PGID)

The image supports `PUID` and `PGID` environment variables (default: `1001`) so the container process can match the ownership of the host directory mapped to `/app/data`.

On Unraid, appdata directories are typically owned by `99:100` (user `nobody`, group `users`). Without setting `PUID`/`PGID`, the default uid 1001 cannot write to that directory and Drizzle migrations fail at boot.

Set `PUID`/`PGID` to match the owner of your host appdata directory:

```bash
# Check the owner of your appdata dir on the host
ls -lan /mnt/user/appdata/jean-michel-volume
```

Then run the container accordingly:

```bash
docker run -d \
  -p 3000:3000 \
  -e AUTH_SECRET=<generated with: openssl rand -base64 32> \
  -e AUTH_URL=http://<your-unraid-ip>:3000 \
  -e SPOTIFY_CLIENT_ID=<your-client-id> \
  -e SPOTIFY_CLIENT_SECRET=<your-client-secret> \
  -e PUID=99 \
  -e PGID=100 \
  -v /mnt/user/appdata/jean-michel-volume:/app/data \
  --name jean-michel-volume \
  --restart unless-stopped \
  jean-michel-volume:latest
```

> **AUTH_URL** must equal the URL the app is actually accessed at — better-auth validates the request Origin against it. If you access the app at `http://192.168.1.10:3000`, set `AUTH_URL=http://192.168.1.10:3000`.

> **Spotify redirect URI**: In the Spotify Developer Dashboard, add `<AUTH_URL>/api/auth/callback/spotify` as an allowed redirect URI (e.g. `http://192.168.1.10:3000/api/auth/callback/spotify`).

## 🔐 Security

### Sensitive environment variables

- **Never** commit your `.env` file to Git
- Use secret managers in production (Docker Secrets, Kubernetes Secrets, etc.)
- Regenerate `AUTH_SECRET` for each environment

### Permissions

The container starts as root, chowns `/app/data` to `PUID:PGID`, then drops privileges via `su-exec` before running the app. The app process never runs as root.

## 🐛 Troubleshooting

### The container does not start

Check the logs:
```bash
docker-compose logs jean-michel-volume
```

### Environment variables are not loaded

1. Make sure your `.env` file is at the root
2. Restart the container: `docker-compose restart`
3. Check the variables: `docker-compose exec jean-michel-volume env | grep SPOTIFY`

### The application is not accessible

1. Make sure port 3000 is not already in use
2. Make sure the container is running: `docker ps`
3. Test from the container: `docker-compose exec jean-michel-volume curl localhost:3000`

## 📊 Monitoring

### View resource usage

```bash
docker stats jean-michel-volume
```

### Health check

Add a health check in `docker-compose.yml`:

```yaml
services:
  jean-michel-volume:
    # ... other configurations
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 🔄 Updates

To update the application:

```bash
# Pull the latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

## 💡 Optimizations

### Multi-stage build

The Dockerfile already uses a multi-stage build to optimize the final image size.

Approximate image size: **~150-200 MB**

### Layer cache

Docker caches layers automatically. To force a full rebuild:

```bash
docker-compose build --no-cache
```
