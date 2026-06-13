# 👷‍♂️ Jean-Michel Volume

A modern web application that lets you control your Spotify volume in real time using your voice!

## ✨ Features

- 🎤 **Real-time voice control**: Spotify volume automatically adapts to the intensity of your voice
- 🎨 **Modern interface**: Sleek design with Tailwind CSS and smooth animations
- 🔒 **Secure authentication**: Login via Spotify OAuth
- 📊 **Live visualization**: Progress bars to visualize voice and Spotify volume
- 📱 **Responsive**: Works on all devices

## 🚀 Installation

### Prerequisites

- Node.js LTS (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- [Bun](https://bun.sh) installed
- A Spotify Premium account (required for the playback control API)
- A modern browser with microphone support

### 1. Clone the project

```bash
git clone <your-repo>
cd spotify-volume-control
```

### 2. Install the right Node version (with nvm)

A `.nvmrc` file is provided to automatically use the LTS version:

```bash
nvm use
# Or if the version is not installed:
nvm install
```

### 3. Install dependencies

```bash
bun install
```

### 4. Configure Spotify Developer

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Configure the settings:
   - **Redirect URIs**: Add `http://localhost:3000/api/auth/callback/spotify`
   - Note your **Client ID** and **Client Secret**

### 5. Configure environment variables

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
AUTH_SECRET=<generate with: openssl rand -base64 32>
SPOTIFY_CLIENT_ID=<your-spotify-client-id>
SPOTIFY_CLIENT_SECRET=<your-spotify-client-secret>
AUTH_URL=http://localhost:3000
```

### 6. Run the application

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🐳 Installation with Docker

### Option 0: Use the pre-built image from GitHub Container Registry

The Docker image is automatically built and published on GHCR for every commit.

```bash
# Pull the image (public)
docker pull ghcr.io/greite/jean-michel-volume:latest

# Or use docker-compose with the image
```

Create a `.env` file then run:

```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name jean-michel-volume \
  ghcr.io/greite/jean-michel-volume:latest
```

For more details about deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Option 1: Docker Compose (recommended)

1. **Create a `.env` file** at the project root:

```env
AUTH_SECRET=<your-generated-secret>
NEXTAUTH_URL=http://localhost:3000
SPOTIFY_CLIENT_ID=<your-client-id>
SPOTIFY_CLIENT_SECRET=<your-client-secret>
```

2. **Run the application**:

```bash
docker-compose up -d
```

3. **Access the application**: [http://localhost:3000](http://localhost:3000)

4. **Stop the application**:

```bash
docker-compose down
```

### Option 2: Manual Docker

1. **Build the image**:

```bash
docker build -t jean-michel-volume .
```

2. **Run the container**:

```bash
docker run -d \
  -p 3000:3000 \
  -e AUTH_SECRET=<your-secret> \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e SPOTIFY_CLIENT_ID=<your-client-id> \
  -e SPOTIFY_CLIENT_SECRET=<your-client-secret> \
  --name jean-michel-volume \
  jean-michel-volume
```

### Docker environment variables

All environment variables can be configured at runtime:

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_SECRET` | NextAuth secret (generated with `openssl rand -base64 32`) | `7mP9J/4M1NIYREuOMkJ...` |
| `NEXTAUTH_URL` | Base URL of the application | `http://localhost:3000` |
| `SPOTIFY_CLIENT_ID` | Client ID of your Spotify app | `4a1cdbadbd514e73...` |
| `SPOTIFY_CLIENT_SECRET` | Client Secret of your Spotify app | `3ecc6d66c05241dd...` |

**Note**: In production, change `NEXTAUTH_URL` to point to your domain (e.g., `https://your-domain.com`)

## 📖 How to use it

1. **Log in** with your Spotify account
2. **Start playing music** on any Spotify device (computer, phone, smart speaker)
3. **Allow microphone access** when your browser asks
4. **Click "Start voice control"**
5. **Speak or make noise**: the louder you are, the higher Spotify's volume goes!

## 🛠️ Technologies used

- **Next.js 16**: React framework with App Router
- **TypeScript**: Static typing
- **Tailwind CSS 4**: Modern and responsive styling
- **NextAuth.js**: OAuth authentication
- **Web Audio API**: Real-time voice volume analysis
- **Spotify Web API**: Playback control

## 📁 Project structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth route
│   │   └── spotify/volume/route.ts      # Volume control API
│   ├── layout.tsx                       # Main layout
│   └── page.tsx                         # Home page
├── components/
│   └── VoiceVolumeController.tsx        # Voice control component
├── hooks/
│   └── useVoiceVolume.ts                # Audio analysis hook
├── lib/
│   └── auth.ts                          # NextAuth configuration
└── types/
    └── next-auth.d.ts                   # NextAuth TypeScript types
```

## 🔧 Technical details

### Audio capture and analysis

The application uses the Web Audio API to:
1. Capture the audio stream from the microphone
2. Analyze frequencies in real time with `AnalyserNode`
3. Compute the average volume
4. Normalize between 0 and 100

### Spotify synchronization

- The volume is sent to the Spotify API every 200ms maximum
- The application checks the playback state every 5 seconds
- The volume is clamped between 0 and 100%

## ⚠️ Important notes

- **Spotify Premium required**: The playback control API requires a Premium account
- **Desktop app recommended**: Use the Spotify desktop application (Windows/Mac/Linux) for volume control
- **Web Player not supported**: The Spotify Web Player does not allow volume control via the API
- **Active device required**: A Spotify device must be playing for the control to work
- **HTTPS in production**: To use the microphone in production, the application must be served over HTTPS

## 🐛 Troubleshooting

### "Cannot control device volume" or "VOLUME_CONTROL_DISALLOW"

This error means that the current device does not allow remote volume control.

**Solution**: Use the **Spotify desktop application** (Windows/Mac/Linux) instead of:
- Spotify Web Player
- Some smart speakers
- Some mobile devices depending on configuration

### "No active device"

Make sure a Spotify device is active and playing music.

### The microphone does not work

Check that:
- Your browser has permission to access the microphone
- You are using HTTPS (in production)
- No other application is using the microphone
- You are speaking loud enough (volume must be above 0%)

### Volume stays at 0%

Check that:
- You have allowed microphone access
- You are speaking loud enough during the 5 seconds
- Your microphone works correctly

### Volume does not change on Spotify

Check that:
- You are logged in with a Spotify Premium account
- You are using the Spotify desktop application
- A device is active with music playing
- Redirect URIs are correctly configured in the Spotify Developer Dashboard

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](./LICENSE.md) file for details.

## 🤝 Contributing

Contributions are welcome! See the [CONTRIBUTING.md](./CONTRIBUTING.md) file for details.
