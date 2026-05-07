export type SpotifyDevice = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number;
  supportsVolume: boolean;
};

export type SpotifyTrack = {
  name: string;
  artists: string;
  album: string;
  imageUrl: string | null;
  durationMs: number;
  progressMs: number;
  externalUrl: string | null;
};

export type PlaybackState = {
  isPlaying: boolean;
  volume: number;
  device: SpotifyDevice | null;
  devices: SpotifyDevice[];
  track: SpotifyTrack | null;
};

export type PlaybackAction = 'play' | 'pause' | 'next' | 'previous' | 'transfer';
