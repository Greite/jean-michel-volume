import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { controlPlayback, getPlaybackState, setSpotifyVolume, transferPlayback } from './spotify-api';

const TOKEN = 'tok-123';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPlaybackState', () => {
  it('mappe lecture en cours + devices et choisit la première image album', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          is_playing: true,
          progress_ms: 12000,
          device: {
            id: 'd1',
            name: 'Mac',
            type: 'Computer',
            is_active: true,
            volume_percent: 42,
            supports_volume: true,
          },
          item: {
            name: 'Song',
            artists: [{ name: 'A' }, { name: 'B' }],
            album: { name: 'Alb', images: [{ url: 'big' }, { url: 'small' }] },
            duration_ms: 200000,
            external_urls: { spotify: 'https://x' },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          devices: [
            { id: 'd1', name: 'Mac', type: 'Computer', is_active: true, volume_percent: 42, supports_volume: true },
            {
              id: null,
              name: 'Ghost',
              type: 'Speaker',
              is_active: false,
              volume_percent: null,
              supports_volume: false,
            },
          ],
        }),
      );

    const state = await getPlaybackState(TOKEN);

    expect(state).not.toBeNull();
    expect(state?.isPlaying).toBe(true);
    expect(state?.volume).toBe(42);
    expect(state?.track?.artists).toBe('A, B');
    expect(state?.track?.imageUrl).toBe('big');
    expect(state?.track?.progressMs).toBe(12000);
    expect(state?.devices).toHaveLength(1);
    expect(state?.devices[0].id).toBe('d1');
    const firstCall = fetchMock.mock.calls[0];
    expect((firstCall[1] as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
  });

  it('retourne un état "rien en lecture" sur 204', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ devices: [] }));

    const state = await getPlaybackState(TOKEN);
    expect(state).toEqual({ isPlaying: false, volume: 0, device: null, devices: [], track: null });
  });

  it('retourne null si le player répond une erreur', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('err', { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ devices: [] }));

    expect(await getPlaybackState(TOKEN)).toBeNull();
  });
});

describe('setSpotifyVolume', () => {
  it('clampe et arrondit le volume entre 0 et 100', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await setSpotifyVolume(TOKEN, 150.7);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/player/volume?volume_percent=100',
      expect.objectContaining({ method: 'PUT' }),
    );

    await setSpotifyVolume(TOKEN, -10);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/volume?volume_percent=0',
      expect.objectContaining({ method: 'PUT' }),
    );

    await setSpotifyVolume(TOKEN, 33.4);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/volume?volume_percent=33',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('controlPlayback', () => {
  it('utilise PUT pour play et pause', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await controlPlayback(TOKEN, 'play');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/play',
      expect.objectContaining({ method: 'PUT' }),
    );
    await controlPlayback(TOKEN, 'pause');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/pause',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('utilise POST pour next et previous', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await controlPlayback(TOKEN, 'next');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/next',
      expect.objectContaining({ method: 'POST' }),
    );
    await controlPlayback(TOKEN, 'previous');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.spotify.com/v1/me/player/previous',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('transferPlayback', () => {
  it('envoie le device id avec play=true', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await transferPlayback(TOKEN, 'device-x');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.spotify.com/v1/me/player');
    expect((init as RequestInit).method).toBe('PUT');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ device_ids: ['device-x'], play: true });
  });
});
