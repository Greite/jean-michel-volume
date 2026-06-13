import type { PlaybackState, SpotifyDevice, SpotifyTrack } from '@/types/spotify';

export const deviceFixture = (overrides: Partial<SpotifyDevice> = {}): SpotifyDevice => ({
  id: 'device-1',
  name: 'MacBook Pro',
  type: 'Computer',
  isActive: true,
  volumePercent: 50,
  supportsVolume: true,
  ...overrides,
});

export const trackFixture = (overrides: Partial<SpotifyTrack> = {}): SpotifyTrack => ({
  name: 'Voyage Voyage',
  artists: 'Desireless',
  album: 'François',
  imageUrl: 'https://i.scdn.co/image/abc',
  durationMs: 240000,
  progressMs: 12000,
  externalUrl: 'https://open.spotify.com/track/abc',
  ...overrides,
});

export const playbackStateFixture = (overrides: Partial<PlaybackState> = {}): PlaybackState => ({
  isPlaying: true,
  volume: 50,
  device: deviceFixture(),
  devices: [deviceFixture()],
  track: trackFixture(),
  ...overrides,
});
