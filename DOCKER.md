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
NEXTAUTH_URL=http://localhost:3000
SPOTIFY_CLIENT_ID=<your-client-id>
SPOTIFY_CLIENT_SECRET=<your-client-secret>
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

### 1. Update NEXTAUTH_URL

For a production deployment, update `NEXTAUTH_URL` in your `.env` file:

```env
NEXTAUTH_URL=https://your-domain.com
```

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
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e SPOTIFY_CLIENT_ID=<your-client-id> \
  -e SPOTIFY_CLIENT_SECRET=<your-client-secret> \
  --name jean-michel-volume \
  --restart unless-stopped \
  jean-michel-volume:latest
```

## 🔐 Security

### Sensitive environment variables

- **Never** commit your `.env` file to Git
- Use secret managers in production (Docker Secrets, Kubernetes Secrets, etc.)
- Regenerate `AUTH_SECRET` for each environment

### Permissions

The application runs as a non-root user (`nextjs:nodejs`) for added security.

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
