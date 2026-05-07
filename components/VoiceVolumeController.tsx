'use client';

import { useEffect, useRef, useState } from 'react';

import { DeviceSelector } from './DeviceSelector';
import { ManualVolumeSlider } from './ManualVolumeSlider';
import { NowPlaying } from './NowPlaying';
import { Spectrogram } from './Spectrogram';
import { VoiceSettings } from './VoiceSettings';
import { VolumeHistory } from './VolumeHistory';

import { useSpotifyPlayback } from '@/hooks/useSpotifyPlayback';
import { useVoiceVolume } from '@/hooks/useVoiceVolume';
import { MAX_HISTORY_ENTRIES, type RecordingDurationKey, type SensitivityKey } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n';

type HistoryEntry = { peak: number; at: number };

const STORAGE_DURATION = 'jmv-duration';
const STORAGE_SENSITIVITY = 'jmv-sensitivity';
const SUCCESS_TOAST_MS = 2200;

const DURATION_LABELS: Record<RecordingDurationKey, string> = {
  short: '3',
  default: '5',
  long: '10',
};

function loadDuration(): RecordingDurationKey {
  if (typeof window === 'undefined') {
    return 'default';
  }
  const v = localStorage.getItem(STORAGE_DURATION);
  return v === 'short' || v === 'long' ? v : 'default';
}
function loadSensitivity(): SensitivityKey {
  if (typeof window === 'undefined') {
    return 'medium';
  }
  const v = localStorage.getItem(STORAGE_SENSITIVITY);
  return v === 'low' || v === 'high' ? v : 'medium';
}

export function VoiceVolumeController() {
  const { t } = useTranslation();

  const [durationKey, setDurationKey] = useState<RecordingDurationKey>('default');
  const [sensitivityKey, setSensitivityKey] = useState<SensitivityKey>('medium');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastSentPeak, setLastSentPeak] = useState<number | null>(null);
  const [successToast, setSuccessToast] = useState<number | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate les préférences (client-only)
  useEffect(() => {
    setDurationKey(loadDuration());
    setSensitivityKey(loadSensitivity());
  }, []);

  // useVoiceVolume est déclaré avant useSpotifyPlayback pour pouvoir
  // passer `isRecording` au polling Spotify (mise en pause).
  const { currentVolume, maxVolume, isRecording, error, countdownSeconds, spectrum, startRecording, stopRecording } =
    useVoiceVolume({
      durationKey,
      sensitivityKey,
      onComplete: async (peak) => {
        if (peak <= 0) {
          return;
        }
        const sent = await setVolume(peak);
        if (sent !== null) {
          setLastSentPeak(sent);
          setHistory((prev) => [{ peak: sent, at: Date.now() }, ...prev].slice(0, MAX_HISTORY_ENTRIES));
          if (successTimerRef.current) {
            clearTimeout(successTimerRef.current);
          }
          setSuccessToast(sent);
          successTimerRef.current = setTimeout(() => {
            setSuccessToast(null);
            successTimerRef.current = null;
          }, SUCCESS_TOAST_MS);
        }
      },
    });

  const { state, apiError, isLoading, setVolume, sendAction, refresh } = useSpotifyPlayback({ paused: isRecording });

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleDuration = (k: RecordingDurationKey) => {
    setDurationKey(k);
    localStorage.setItem(STORAGE_DURATION, k);
  };
  const handleSensitivity = (k: SensitivityKey) => {
    setSensitivityKey(k);
    localStorage.setItem(STORAGE_SENSITIVITY, k);
  };

  const errorMsg = error === 'mic-access-denied' ? t('errors.micAccess') : null;

  return (
    <div className="space-y-8">
      {/* Now playing + device + controls */}
      <NowPlaying
        track={state.track}
        device={state.device}
        isPlaying={state.isPlaying}
        isLoading={isLoading}
        onPlayPause={() => sendAction(state.isPlaying ? 'pause' : 'play')}
        onPrevious={() => sendAction('previous')}
        onNext={() => sendAction('next')}
      />

      {/* Spectrogramme + compteur */}
      <section
        aria-labelledby="vol-live-title"
        className="relative overflow-hidden rounded-lg border border-line bg-bg-elevated"
      >
        <div className="flex items-baseline justify-between gap-4 px-5 pt-5">
          <h2 id="vol-live-title" className="font-display text-base font-semibold tracking-tight">
            {t('controller.live')}
          </h2>
          <div className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-widest text-muted">
            <span aria-live="polite">
              <span className="text-fg text-base font-semibold">{Math.round(currentVolume)}</span>
              <span className="ml-1">%</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t('controller.peak')} <span className="text-brand">{Math.round(maxVolume)}%</span>
            </span>
          </div>
        </div>

        {/* Canvas spectrogramme */}
        <div className="h-32 px-5 py-4 sm:h-40">
          <Spectrogram spectrum={spectrum} active={isRecording} />
        </div>

        {/* Barre de progression (a11y) */}
        <div
          role="progressbar"
          aria-label={t('controller.live')}
          aria-valuenow={Math.round(currentVolume)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative h-1 bg-surface-2"
        >
          <div
            className="absolute inset-y-0 left-0 bg-brand transition-[width] duration-100"
            style={{ width: `${currentVolume}%` }}
          />
          {maxVolume > 0 && (
            <div className="absolute inset-y-0 w-px bg-fg/80" style={{ left: `${maxVolume}%` }} aria-hidden="true" />
          )}
        </div>

        {/* Countdown overlay */}
        {isRecording && (
          <div
            role="timer"
            aria-live="polite"
            aria-label={`${countdownSeconds}s`}
            className="absolute right-4 top-4 flex items-center gap-2"
          >
            <span className="relative inline-flex h-3 w-3">
              <span className="absolute inset-0 rounded-full bg-brand jmv-pulse-ring" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-brand" />
            </span>
            <span className="font-mono text-sm font-semibold text-fg">
              {countdownSeconds}
              <span className="text-muted">{t('duration.unit')}</span>
            </span>
          </div>
        )}
      </section>

      {/* Toast de succès post-enregistrement */}
      {successToast !== null && (
        <output
          aria-live="polite"
          className="block rounded-md border border-brand/30 bg-brand-soft p-3 text-center text-sm font-semibold text-brand jmv-reveal"
        >
          {t('controller.sentToSpotify')} · <span className="font-mono">{Math.round(successToast)}%</span>
        </output>
      )}

      {/* Bouton principal record / stop */}
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          aria-label={isRecording ? t('controller.stop') : t('controller.start')}
          className={`relative inline-flex flex-1 items-center justify-center gap-3 rounded-pill px-6 py-4 font-display text-base font-semibold transition-all duration-200 ${
            isRecording
              ? 'bg-danger text-white shadow-lg shadow-danger/30 hover:scale-[1.02] active:scale-[0.97]'
              : 'bg-brand text-on-brand shadow-glow hover:bg-brand-hover hover:scale-[1.02] active:scale-[0.97]'
          }`}
        >
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              isRecording ? 'bg-white animate-pulse' : 'bg-on-brand/80'
            }`}
            aria-hidden="true"
          />
          {isRecording ? (
            <>
              <span>{t('controller.stop')}</span>
              <span className="font-mono text-sm font-medium opacity-80" aria-hidden="true">
                · {countdownSeconds}
                {t('duration.unit')}
              </span>
            </>
          ) : (
            <span>
              {t('controller.start')} ·{' '}
              <span className="font-mono text-sm opacity-80">
                {DURATION_LABELS[durationKey]}
                {t('duration.unit')}
              </span>
            </span>
          )}
        </button>
      </div>

      {/* Slider manuel */}
      <ManualVolumeSlider
        value={state.volume}
        disabled={isRecording || !state.device?.supportsVolume}
        onChange={(v) => setVolume(v)}
      />

      {/* Settings : durée + sensibilité */}
      <VoiceSettings
        duration={durationKey}
        sensitivity={sensitivityKey}
        onDuration={handleDuration}
        onSensitivity={handleSensitivity}
        disabled={isRecording}
      />

      {/* Historique */}
      {history.length > 0 && <VolumeHistory history={history} lastPeak={lastSentPeak} />}

      {/* Sélecteur d'appareil */}
      <DeviceSelector
        devices={state.devices}
        activeDeviceId={state.device?.id ?? null}
        onSelect={async (id) => {
          await sendAction('transfer', id);
          refresh();
        }}
      />

      {/* Erreurs */}
      {errorMsg && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          {errorMsg}
        </div>
      )}
      {apiError && (
        <div role="alert" className="rounded-md border border-warn/30 bg-warn-soft p-4 text-sm text-warn">
          <p className="font-display text-base font-semibold">{t('errors.spotifyTitle')}</p>
          <p className="mt-1">{apiError}</p>
        </div>
      )}
    </div>
  );
}
