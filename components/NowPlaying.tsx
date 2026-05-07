'use client';

import Image from 'next/image';

import { useTranslation } from '@/lib/i18n';
import type { SpotifyDevice, SpotifyTrack } from '@/types/spotify';

type Props = {
  track: SpotifyTrack | null;
  device: SpotifyDevice | null;
  isPlaying: boolean;
  isLoading?: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

const PrevIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M6 4h2v16H6zM10 12l10 8V4z" />
  </svg>
);
const NextIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M16 4h2v16h-2zM4 4l10 8-10 8z" />
  </svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M6 4l16 8L6 20z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M6 4h5v16H6zM13 4h5v16h-5z" />
  </svg>
);

export function NowPlaying({ track, device, isPlaying, isLoading = false, onPlayPause, onPrevious, onNext }: Props) {
  const { t } = useTranslation();

  if (isLoading && !track) {
    return (
      <section
        aria-busy="true"
        aria-label={t('controller.loadingPlayback')}
        className="flex flex-col items-center gap-5 rounded-lg border border-line bg-surface/40 px-6 py-8 text-center"
      >
        <div className="h-28 w-28 animate-pulse rounded-md bg-surface-2" />
        <div className="w-full max-w-xs space-y-2">
          <div className="mx-auto h-3 w-24 animate-pulse rounded bg-surface-2" />
          <div className="mx-auto h-5 w-48 animate-pulse rounded bg-surface-2" />
          <div className="mx-auto h-3 w-32 animate-pulse rounded bg-surface-2" />
        </div>
      </section>
    );
  }

  if (!track) {
    return (
      <section
        aria-label={t('track.now')}
        className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-surface/40 px-6 py-8 text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-md bg-surface-2">
          <span aria-hidden="true" className="text-3xl text-muted">
            ◐
          </span>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{t('track.now')}</p>
          <h2 className="mt-1.5 font-display text-xl font-semibold leading-tight">{t('track.nothing')}</h2>
        </div>
        <a
          href="https://open.spotify.com"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-pill border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-brand"
        >
          {t('track.openSpotify')} ↗
        </a>
      </section>
    );
  }

  return (
    <section
      aria-label={t('track.now')}
      className="flex flex-col items-center gap-5 rounded-lg border border-line bg-surface/70 px-6 py-8 text-center backdrop-blur-sm"
    >
      <div className="relative h-28 w-28 overflow-hidden rounded-md bg-surface-2">
        {track.imageUrl ? <Image src={track.imageUrl} alt="" fill sizes="112px" className="object-cover" /> : null}
        {isPlaying && <span aria-hidden="true" className="absolute inset-0 ring-2 ring-brand/40" />}
      </div>

      <div className="min-w-0 max-w-full">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {t('track.now')}
          {device && (
            <>
              {' · '}
              <span className="text-fg-soft">{device.name}</span>
            </>
          )}
        </p>
        <h2 className="mt-1.5 truncate font-display text-xl font-semibold leading-tight">{track.name}</h2>
        <p className="mt-0.5 truncate text-sm text-muted">{track.artists}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          aria-label={t('controls.previous')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <PrevIcon />
        </button>
        <button
          type="button"
          onClick={onPlayPause}
          aria-label={isPlaying ? t('controls.pause') : t('controls.play')}
          className="inline-flex h-12 w-12 items-center justify-center rounded-pill bg-fg text-bg transition-transform hover:scale-105 active:scale-95"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={t('controls.next')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <NextIcon />
        </button>
      </div>
    </section>
  );
}
