'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { clientLogger } from '@/lib/client-logger';
import {
  FFT_SIZE,
  FFT_TOP_PERCENT,
  RECORDING_DURATIONS_MS,
  type RecordingDurationKey,
  SENSITIVITY_PRESETS,
  type SensitivityKey,
  VOLUME_UI_THROTTLE_MS,
} from '@/lib/constants';

type WakeLockSentinel = {
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
};

type UseVoiceVolumeOptions = {
  durationKey?: RecordingDurationKey;
  sensitivityKey?: SensitivityKey;
  onPeak?: (peak: number) => void;
  onComplete?: (peak: number) => void;
  hapticFeedback?: boolean;
};

export function useVoiceVolume(options: UseVoiceVolumeOptions = {}) {
  const { durationKey = 'default', sensitivityKey = 'medium', onPeak, onComplete, hapticFeedback = true } = options;

  const [currentVolume, setCurrentVolume] = useState(0);
  const [maxVolume, setMaxVolume] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdownMs, setCountdownMs] = useState<number>(RECORDING_DURATIONS_MS[durationKey]);
  // Données FFT live pour spectrogramme — Float32 0..1, taille = FFT_SIZE/2
  const [spectrum, setSpectrum] = useState<Float32Array>(() => new Float32Array(FFT_SIZE / 2));

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const maxVolumeRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const stopRequestedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onPeakRef = useRef(onPeak);
  // Double-buffer pour éviter d'allouer un Float32Array à chaque tick (~30fps).
  const spectrumBuffersRef = useRef<[Float32Array, Float32Array]>([
    new Float32Array(FFT_SIZE / 2),
    new Float32Array(FFT_SIZE / 2),
  ]);
  const spectrumBufferIndexRef = useRef(0);

  // Garde les callbacks à jour sans relancer l'enregistrement
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onPeakRef.current = onPeak;
  }, [onPeak]);

  const tryHaptic = useCallback(
    (pattern: number | number[]) => {
      if (!hapticFeedback) {
        return;
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(pattern);
        } catch {
          /* noop */
        }
      }
    },
    [hapticFeedback],
  );

  const acquireWakeLock = useCallback(async () => {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) {
      return;
    }
    try {
      wakeLockRef.current = await nav.wakeLock.request('screen');
    } catch (err) {
      clientLogger.warn('WakeLock failed:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        /* noop */
      }
      wakeLockRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    microphoneRef.current = null;
    analyserRef.current = null;
    startTimeRef.current = null;
    releaseWakeLock();
  }, [releaseWakeLock]);

  const stopRecording = useCallback(() => {
    stopRequestedRef.current = true;
    cleanup();
    setIsRecording(false);
    setCurrentVolume(0);
    setCountdownMs(RECORDING_DURATIONS_MS[durationKey]);
    setSpectrum(new Float32Array(FFT_SIZE / 2));
    onCompleteRef.current?.(maxVolumeRef.current);
    tryHaptic([8, 60, 8]);
  }, [cleanup, durationKey, tryHaptic]);

  const startRecording = useCallback(async () => {
    try {
      stopRequestedRef.current = false;
      setError(null);
      setMaxVolume(0);
      maxVolumeRef.current = 0;
      const totalMs = RECORDING_DURATIONS_MS[durationKey];
      setCountdownMs(totalMs);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyserRef.current = analyser;
      const mic = ctx.createMediaStreamSource(stream);
      microphoneRef.current = mic;
      mic.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const sortedArr = new Array<number>(bufferLength);
      const topCount = Math.max(1, Math.floor(bufferLength * FFT_TOP_PERCENT));
      const preset = SENSITIVITY_PRESETS[sensitivityKey];

      setIsRecording(true);
      startTimeRef.current = performance.now();
      lastUiUpdateRef.current = 0;
      acquireWakeLock();
      tryHaptic(20);

      const loop = () => {
        if (!analyserRef.current || !startTimeRef.current || stopRequestedRef.current) {
          return;
        }
        const elapsed = performance.now() - startTimeRef.current;
        const remaining = Math.max(0, totalMs - elapsed);

        if (elapsed >= totalMs) {
          stopRecording();
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < bufferLength; i++) {
          sortedArr[i] = dataArray[i];
        }
        sortedArr.sort((a, b) => b - a);
        let sum = 0;
        for (let i = 0; i < topCount; i++) {
          sum += sortedArr[i];
        }
        const avg = sum / topCount / 255;
        const shaped = Math.min(100, avg ** preset.exponent * 100 * preset.multiplier);

        if (shaped > maxVolumeRef.current) {
          maxVolumeRef.current = shaped;
          onPeakRef.current?.(shaped);
        }

        // Throttle des setState à ~30fps
        const now = performance.now();
        if (now - lastUiUpdateRef.current >= VOLUME_UI_THROTTLE_MS) {
          lastUiUpdateRef.current = now;
          setCurrentVolume(shaped);
          setMaxVolume(maxVolumeRef.current);
          setCountdownMs(remaining);

          // Spectre : on alterne deux buffers réutilisés pour éviter les allocations.
          const idx = (spectrumBufferIndexRef.current + 1) % 2;
          spectrumBufferIndexRef.current = idx;
          const buf = spectrumBuffersRef.current[idx];
          const len = Math.min(buf.length, bufferLength);
          for (let i = 0; i < len; i++) {
            buf[i] = dataArray[i] / 255;
          }
          setSpectrum(buf);
        }

        rafIdRef.current = requestAnimationFrame(loop);
      };

      loop();
    } catch (err) {
      clientLogger.error('Error accessing microphone:', err);
      setError('mic-access-denied');
      setIsRecording(false);
      cleanup();
    }
  }, [acquireWakeLock, cleanup, durationKey, sensitivityKey, stopRecording, tryHaptic]);

  useEffect(() => {
    return () => {
      stopRequestedRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  return {
    currentVolume,
    maxVolume,
    isRecording,
    error,
    countdownMs,
    countdownSeconds: Math.ceil(countdownMs / 1000),
    spectrum,
    startRecording,
    stopRecording,
  };
}
