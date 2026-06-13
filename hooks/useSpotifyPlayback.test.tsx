import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSpotifyPlayback } from './useSpotifyPlayback';

import { I18nProvider } from '@/lib/i18n';
import { playbackStateFixture } from '@/test/fixtures';

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function okJson(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

describe('useSpotifyPlayback', () => {
  it('charge l’état initial via /api/spotify/playback', async () => {
    const state = playbackStateFixture();
    fetchMock.mockReturnValue(okJson(state));

    const { result } = renderHook(() => useSpotifyPlayback(), { wrapper });

    // Flush the immediate fetchPlayback() chain (fetch -> res.json -> setState).
    // waitFor() can't be used here because vi.useFakeTimers() also fakes its
    // internal polling timers, so we drain microtasks manually instead.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/spotify/playback', expect.any(Object));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.state.track?.name).toBe(state.track?.name);
  });

  it('setVolume poste le volume et met à jour l’état', async () => {
    // paused: true means no initial polling fetch, so the volume POST is the
    // only fetch call and must receive the {volume: 77} response directly.
    fetchMock.mockReturnValueOnce(okJson({ success: true, volume: 77 }));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    let returned: number | null = null;
    await act(async () => {
      returned = await result.current.setVolume(77);
    });

    expect(returned).toBe(77);
    expect(result.current.state.volume).toBe(77);
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/spotify/volume');
    expect(call?.[1]).toMatchObject({ method: 'POST' });
  });

  it('mappe une erreur 403 vers un message traduit', async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response(JSON.stringify({ error: 'x' }), { status: 403 })));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });
    await act(async () => {
      await result.current.setVolume(10);
    });

    expect(result.current.apiError).toBeTruthy();
  });

  it('ne lance pas de polling quand paused=true', async () => {
    fetchMock.mockReturnValue(okJson(playbackStateFixture()));
    renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clearError remet apiError à null', async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response('{}', { status: 403 })));
    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });
    await act(async () => {
      await result.current.setVolume(10);
    });
    act(() => result.current.clearError());
    expect(result.current.apiError).toBeNull();
  });
});
