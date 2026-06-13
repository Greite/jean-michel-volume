import { renderHook } from '@testing-library/react';
import { signOut } from 'next-auth/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSpotifyPlayback } from './useSpotifyPlayback';

import { POLL_INTERVAL_ACTIVE_MS } from '@/lib/constants';
import { I18nProvider } from '@/lib/i18n';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { playbackStateFixture } from '@/test/fixtures';

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

const signOutMock = vi.mocked(signOut);

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

function jsonResponse(body: unknown, status: number) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

// Drain pending microtasks (fetch -> res.json -> setState chain) under fake timers.
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
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

  it('sendAction (control) poste l’action et renvoie true', async () => {
    fetchMock.mockReturnValueOnce(okJson({ success: true }));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.sendAction('pause');
    });

    expect(returned).toBe(true);
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/spotify/playback' && c[1]?.method === 'POST');
    expect(call).toBeDefined();
    expect(call?.[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(call?.[1]?.body as string)).toMatchObject({ action: 'pause' });

    // The success path schedules a fetchPlayback refresh after 350ms.
    fetchMock.mockReturnValueOnce(okJson(playbackStateFixture()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.apiError).toBeNull();
  });

  it('sendAction (transfer) inclut deviceId dans le corps', async () => {
    fetchMock.mockReturnValue(okJson({ success: true }));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    await act(async () => {
      await result.current.sendAction('transfer', 'device-42');
    });

    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/spotify/playback' && c[1]?.method === 'POST');
    expect(JSON.parse(call?.[1]?.body as string)).toMatchObject({ action: 'transfer', deviceId: 'device-42' });
  });

  it('sendAction sur 401 programme un signOut et renvoie false', async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({}, 401));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.sendAction('play');
    });

    expect(returned).toBe(false);
    expect(result.current.apiError).toBe(DICTIONARIES.fr['errors.sessionExpired']);
    expect(signOutMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('sendAction sur 404 mappe vers errors.spotify404', async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ error: 'x' }, 404));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.sendAction('play');
    });

    expect(returned).toBe(false);
    expect(result.current.apiError).toBe(DICTIONARIES.fr['errors.spotify404']);
  });

  it('sendAction avec reason VOLUME_CONTROL_DISALLOW mappe vers errors.volumeDisallow', async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ details: { error: { reason: 'VOLUME_CONTROL_DISALLOW' } } }, 400));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    await act(async () => {
      await result.current.sendAction('play');
    });

    expect(result.current.apiError).toBe(DICTIONARIES.fr['errors.volumeDisallow']);
  });

  it('refresh sur 401 déclenche handleAuthFailure puis signOut', async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({}, 401));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.apiError).toBe(DICTIONARIES.fr['errors.sessionExpired']);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('refresh sur 404 réinitialise l’état en conservant les devices', async () => {
    const seeded = playbackStateFixture();
    fetchMock.mockReturnValueOnce(okJson(seeded));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    // Seed state with a successful fetch (track + devices present).
    await act(async () => {
      await result.current.refresh();
    });
    await flushMicrotasks();
    expect(result.current.state.track?.name).toBe(seeded.track?.name);
    expect(result.current.state.devices).toHaveLength(1);

    // Now a 404 should reset to INITIAL_STATE but keep devices.
    fetchMock.mockReturnValueOnce(jsonResponse({}, 404));
    await act(async () => {
      await result.current.refresh();
    });
    await flushMicrotasks();

    expect(result.current.state.track).toBeNull();
    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.state.devices).toHaveLength(1);
    expect(result.current.state.devices[0]?.id).toBe(seeded.devices[0]?.id);
  });

  it('lance le polling et refait un fetch après POLL_INTERVAL_ACTIVE_MS', async () => {
    fetchMock.mockReturnValue(okJson(playbackStateFixture()));

    renderHook(() => useSpotifyPlayback(), { wrapper });

    // Flush the immediate fetch on mount.
    await flushMicrotasks();
    const afterInitial = fetchMock.mock.calls.length;
    expect(afterInitial).toBeGreaterThanOrEqual(1);

    // Advance past one active poll interval; a scheduled fetch must fire.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_ACTIVE_MS + 10);
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(afterInitial);
  });

  it('refait un fetch lors d’un visibilitychange redevenu visible', async () => {
    fetchMock.mockReturnValue(okJson(playbackStateFixture()));

    renderHook(() => useSpotifyPlayback(), { wrapper });

    await flushMicrotasks();
    const afterInitial = fetchMock.mock.calls.length;

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThan(afterInitial);
  });

  it('passer à paused=true annule le polling planifié', async () => {
    fetchMock.mockReturnValue(okJson(playbackStateFixture()));

    const { rerender } = renderHook((props: { paused: boolean }) => useSpotifyPlayback(props), {
      initialProps: { paused: false },
      wrapper,
    });

    // Flush the immediate fetch on mount and let the first poll be scheduled.
    await flushMicrotasks();
    const afterInitial = fetchMock.mock.calls.length;
    expect(afterInitial).toBeGreaterThanOrEqual(1);

    // Re-render with paused=true: the effect cleanup + paused branch must clear
    // the pending poll timeout (line 170) so no further fetch fires.
    expect(() => rerender({ paused: true })).not.toThrow();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_ACTIVE_MS * 3);
    });

    expect(fetchMock.mock.calls.length).toBe(afterInitial);
  });

  it('fetchPlayback ignore une AbortError', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    fetchMock.mockReturnValueOnce(Promise.reject(abortErr));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    await act(async () => {
      await result.current.refresh();
    });
    await flushMicrotasks();

    expect(result.current.apiError).toBeNull();
  });

  it('sendAction ignore une AbortError et renvoie false', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    fetchMock.mockReturnValueOnce(Promise.reject(abortErr));

    const { result } = renderHook(() => useSpotifyPlayback({ paused: true }), { wrapper });

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.sendAction('pause');
    });

    expect(returned).toBe(false);
    expect(result.current.apiError).toBeNull();
  });
});
