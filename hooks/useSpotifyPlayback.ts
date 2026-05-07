'use client';

import { signOut } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { clientLogger } from '@/lib/client-logger';
import { POLL_INTERVAL_ACTIVE_MS, POLL_INTERVAL_IDLE_MS, SPOTIFY_ERROR_REASON_VOLUME_DISALLOW } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n';
import type { PlaybackAction, PlaybackState } from '@/types/spotify';

type ApiErrorPayload = {
  error?: string;
  details?: { error?: { reason?: string } };
};

type UseSpotifyPlaybackOptions = {
  /** Mise en pause du polling automatique (ex. pendant un enregistrement). */
  paused?: boolean;
};

const INITIAL_STATE: PlaybackState = {
  isPlaying: false,
  volume: 0,
  device: null,
  devices: [],
  track: null,
};

export function useSpotifyPlayback(options: UseSpotifyPlaybackOptions = {}) {
  const { paused = false } = options;
  const { t } = useTranslation();
  const [state, setState] = useState<PlaybackState>(INITIAL_STATE);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeAbortRef = useRef<AbortController | null>(null);
  const actionAbortRef = useRef<AbortController | null>(null);
  const playbackAbortRef = useRef<AbortController | null>(null);

  const handleAuthFailure = useCallback(() => {
    clientLogger.error('Token expired, signing out...');
    setApiError(t('errors.sessionExpired'));
    setTimeout(() => signOut({ callbackUrl: '/' }), 2000);
  }, [t]);

  const mapApiError = useCallback(
    (status: number, errorData: ApiErrorPayload | null) => {
      if (errorData?.details?.error?.reason === SPOTIFY_ERROR_REASON_VOLUME_DISALLOW) {
        return t('errors.volumeDisallow');
      }
      if (status === 403) {
        return t('errors.spotify403');
      }
      if (status === 404) {
        return t('errors.spotify404');
      }
      return errorData?.error ?? t('errors.connection');
    },
    [t],
  );

  const fetchPlayback = useCallback(async () => {
    playbackAbortRef.current?.abort();
    const ctrl = new AbortController();
    playbackAbortRef.current = ctrl;
    try {
      const res = await fetch('/api/spotify/playback', { signal: ctrl.signal });
      if (res.status === 401) {
        handleAuthFailure();
        return;
      }
      if (res.status === 404) {
        setState((prev) => ({ ...INITIAL_STATE, devices: prev.devices }));
        setIsLoading(false);
        return;
      }
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as PlaybackState;
      setState(data);
      setIsLoading(false);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      clientLogger.error('Error fetching playback state:', err);
    }
  }, [handleAuthFailure]);

  const setVolume = useCallback(
    async (volume: number) => {
      volumeAbortRef.current?.abort();
      const ctrl = new AbortController();
      volumeAbortRef.current = ctrl;
      try {
        setApiError(null);
        const res = await fetch('/api/spotify/volume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ volume }),
          signal: ctrl.signal,
        });
        if (res.status === 401) {
          handleAuthFailure();
          return null;
        }
        if (!res.ok) {
          const errData = (await res.json().catch(() => null)) as ApiErrorPayload | null;
          setApiError(mapApiError(res.status, errData));
          return null;
        }
        const data = (await res.json()) as { volume: number };
        setState((prev) => ({ ...prev, volume: data.volume }));
        return data.volume;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return null;
        }
        clientLogger.error('Error setting volume:', err);
        setApiError(t('errors.connection'));
        return null;
      }
    },
    [handleAuthFailure, mapApiError, t],
  );

  const sendAction = useCallback(
    async (action: PlaybackAction, deviceId?: string) => {
      actionAbortRef.current?.abort();
      const ctrl = new AbortController();
      actionAbortRef.current = ctrl;
      try {
        setApiError(null);
        const res = await fetch('/api/spotify/playback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, deviceId }),
          signal: ctrl.signal,
        });
        if (res.status === 401) {
          handleAuthFailure();
          return false;
        }
        if (!res.ok) {
          const errData = (await res.json().catch(() => null)) as ApiErrorPayload | null;
          setApiError(mapApiError(res.status, errData));
          return false;
        }
        // Refresh immédiat après action
        setTimeout(fetchPlayback, 350);
        return true;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return false;
        }
        clientLogger.error('Error sending playback action:', err);
        setApiError(t('errors.connection'));
        return false;
      }
    },
    [fetchPlayback, handleAuthFailure, mapApiError, t],
  );

  // Polling visibility-aware : ralentit quand l'onglet est caché,
  // suspendu quand `paused` est vrai (ex. enregistrement vocal en cours).
  useEffect(() => {
    if (paused) {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      return;
    }
    let cancelled = false;

    const schedule = () => {
      if (cancelled) {
        return;
      }
      const isHidden = typeof document !== 'undefined' && document.hidden === true;
      const delay = isHidden ? POLL_INTERVAL_IDLE_MS : POLL_INTERVAL_ACTIVE_MS;
      pollTimeoutRef.current = setTimeout(async () => {
        await fetchPlayback();
        schedule();
      }, delay);
    };

    fetchPlayback();
    schedule();

    const onVisibility = () => {
      if (!document.hidden) {
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
        }
        fetchPlayback();
        schedule();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchPlayback, paused]);

  return {
    state,
    apiError,
    isLoading,
    setVolume,
    sendAction,
    refresh: fetchPlayback,
    clearError: () => setApiError(null),
  };
}
