# Deploying Jean-Michel Volume

## GitHub Actions - Automatic Docker image build

### Configuration

The GitHub Actions workflow (`.github/workflows/docker-build.yml`) automatically builds and pushes the Docker image to **GitHub Container Registry (GHCR)**.

### Triggers

The image is built automatically in the following cases:
- **Push to main/master**: Creates a `latest` tag and `main-<sha>`
- **Pull Request**: Builds the image but does not push it (test only)
- **Version tag** (e.g., `v1.0.0`): Creates the tags `1.0.0`, `1.0`, `1`, and `latest`

### No configuration needed

The workflow uses `GITHUB_TOKEN`, which is automatically provided by GitHub Actions. **No secrets to configure!**

### Generated tags

For each commit on `main`:
```
ghcr.io/greite/jean-michel-volume:latest
ghcr.io/greite/jean-michel-volume:main
ghcr.io/greite/jean-michel-volume:main-<commit-sha>
```

For each version tag (e.g., `v1.2.3`):
```
ghcr.io/greite/jean-michel-volume:1.2.3
ghcr.io/greite/jean-michel-volume:1.2
ghcr.io/greite/jean-michel-volume:1
ghcr.io/greite/jean-michel-volume:latest
```

### Supported platforms

The image is built for several architectures:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit - Raspberry Pi, Mac M1/M2, etc.)

## Using the image from GHCR

### 1. Authentication (if private repository)

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u greite --password-stdin
```

### 2. Pull the image

```bash
# Latest version
docker pull ghcr.io/greite/jean-michel-volume:latest

# Specific version
docker pull ghcr.io/greite/jean-michel-volume:1.0.0
```

### 3. Run the container

Create a `.env` file with your variables:
```bash
AUTH_SECRET=your-auth-secret
NEXTAUTH_URL=https://your-domain.com
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
DEBUG_MODE=false
NEXT_PUBLIC_DEBUG_MODE=false
```

Then run:
```bash
docker run -d \
  --name jean-michel-volume \
  -p 3000:3000 \
  --env-file .env \
  ghcr.io/greite/jean-michel-volume:latest
```

Or with docker-compose:
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

## Local build

If you want to build the image locally:

```bash
# Build
docker build -t jean-michel-volume .

# Run
docker run -d -p 3000:3000 --env-file .env jean-michel-volume
```

## Make the image public (optional)

By default, GHCR images are **private**. To make it public:

1. Go to https://github.com/greite/jean-michel-volume/pkgs/container/jean-michel-volume
2. Click "Package settings"
3. Scroll down to "Danger Zone"
4. Click "Change visibility" → "Public"

This will allow anyone to pull the image without authentication.

## Create a release with a tag

To create a new version with a tag:

```bash
# Create a tag
git tag v1.0.0
git push origin v1.0.0

# Or create a release via the GitHub UI
# → This will automatically trigger the build with version tags
```

## Build cache

The workflow uses GitHub Actions Cache to speed up builds:
- Docker layers are cached between builds
- Significantly reduces build time for subsequent commits

## Monitoring

To see ongoing builds:
- Go to the **Actions** tab of your GitHub repository
- Click on the "Build and Push Docker Image" workflow
- View the logs of each step
