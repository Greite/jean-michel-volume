import type { PlaybackState, SpotifyDevice } from '@/types/spotify';

const SPOTIFY_BASE = 'https://api.spotify.com/v1';

type SpotifyImage = { url: string; width?: number; height?: number };
type SpotifyArtist = { name: string };
type SpotifyAlbum = { name: string; images: SpotifyImage[] };
type SpotifyItem = {
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  external_urls?: { spotify?: string };
};
type SpotifyDeviceRaw = {
  id: string | null;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number | null;
  supports_volume: boolean;
};
type SpotifyPlayer = {
  is_playing: boolean;
  progress_ms: number | null;
  device: SpotifyDeviceRaw | null;
  item: SpotifyItem | null;
};

function mapDevice(d: SpotifyDeviceRaw): SpotifyDevice {
  return {
    id: d.id ?? '',
    name: d.name,
    type: d.type,
    isActive: d.is_active,
    volumePercent: d.volume_percent ?? 0,
    supportsVolume: d.supports_volume,
  };
}

async function spotifyFetch(path: string, accessToken: string, init: RequestInit = {}) {
  return fetch(`${SPOTIFY_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
}

export async function getPlaybackState(accessToken: string): Promise<PlaybackState | null> {
  const [playerRes, devicesRes] = await Promise.all([
    spotifyFetch('/me/player', accessToken),
    spotifyFetch('/me/player/devices', accessToken),
  ]);

  let devices: SpotifyDevice[] = [];
  if (devicesRes.ok) {
    const data = (await devicesRes.json()) as { devices: SpotifyDeviceRaw[] };
    devices = (data.devices ?? []).map(mapDevice).filter((d) => d.id);
  }

  if (playerRes.status === 204) {
    return {
      isPlaying: false,
      volume: 0,
      device: null,
      devices,
      track: null,
    };
  }
  if (!playerRes.ok) {
    return null;
  }

  const data = (await playerRes.json()) as SpotifyPlayer;
  const device = data.device ? mapDevice(data.device) : null;
  const item = data.item;
  const albumImage = item?.album?.images?.[0] ?? item?.album?.images?.[1] ?? null;

  return {
    isPlaying: data.is_playing,
    volume: device?.volumePercent ?? 0,
    device,
    devices,
    track: item
      ? {
          name: item.name,
          artists: item.artists.map((a) => a.name).join(', '),
          album: item.album.name,
          imageUrl: albumImage?.url ?? null,
          durationMs: item.duration_ms,
          progressMs: data.progress_ms ?? 0,
          externalUrl: item.external_urls?.spotify ?? null,
        }
      : null,
  };
}

export async function setSpotifyVolume(accessToken: string, volume: number): Promise<Response> {
  const clamped = Math.max(0, Math.min(100, Math.round(volume)));
  return spotifyFetch(`/me/player/volume?volume_percent=${clamped}`, accessToken, { method: 'PUT' });
}

export async function controlPlayback(
  accessToken: string,
  action: 'play' | 'pause' | 'next' | 'previous',
): Promise<Response> {
  if (action === 'play') {
    return spotifyFetch('/me/player/play', accessToken, { method: 'PUT' });
  }
  if (action === 'pause') {
    return spotifyFetch('/me/player/pause', accessToken, { method: 'PUT' });
  }
  // next / previous
  return spotifyFetch(`/me/player/${action}`, accessToken, { method: 'POST' });
}

export async function transferPlayback(accessToken: string, deviceId: string): Promise<Response> {
  return spotifyFetch('/me/player', accessToken, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_ids: [deviceId], play: true }),
  });
}
