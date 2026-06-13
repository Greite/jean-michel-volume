import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVoiceVolume } from './useVoiceVolume';

import { RECORDING_DURATIONS_MS } from '@/lib/constants';

function installAudioMocks(getUserMedia: ReturnType<typeof vi.fn>, fillValue = 0) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });

  class FakeAnalyser {
    fftSize = 0;
    frequencyBinCount = 128;
    getByteFrequencyData(arr: Uint8Array) {
      arr.fill(fillValue);
    }
  }
  class FakeAudioContext {
    createAnalyser() {
      return new FakeAnalyser();
    }
    createMediaStreamSource() {
      return { connect: vi.fn() };
    }
    close() {
      return Promise.resolve();
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useVoiceVolume', () => {
  it('expose un état initial cohérent', () => {
    installAudioMocks(vi.fn());
    const { result } = renderHook(() => useVoiceVolume({ durationKey: 'short' }));
    expect(result.current.isRecording).toBe(false);
    expect(result.current.currentVolume).toBe(0);
    expect(result.current.maxVolume).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.countdownMs).toBe(RECORDING_DURATIONS_MS.short);
    expect(result.current.countdownSeconds).toBe(3);
    expect(result.current.spectrum).toBeInstanceOf(Float32Array);
  });

  it('passe isRecording=true quand le micro est accordé', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installAudioMocks(getUserMedia);

    const { result } = renderHook(() => useVoiceVolume());
    await act(async () => {
      await result.current.startRecording();
    });

    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(result.current.isRecording).toBe(true);
  });

  it('positionne error=mic-access-denied si getUserMedia rejette', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));
    installAudioMocks(getUserMedia);

    const { result } = renderHook(() => useVoiceVolume());
    await act(async () => {
      await result.current.startRecording();
    });

    await waitFor(() => expect(result.current.error).toBe('mic-access-denied'));
    expect(result.current.isRecording).toBe(false);
  });

  it('stopRecording appelle onComplete avec le pic et réinitialise', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installAudioMocks(getUserMedia);
    const onComplete = vi.fn();

    const { result } = renderHook(() => useVoiceVolume({ onComplete }));
    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.currentVolume).toBe(0);
    expect(onComplete).toHaveBeenCalledWith(expect.any(Number));
  });

  it('exécute la boucle RAF : détecte un pic, met à jour le volume puis stoppe', async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    // Signal non nul => le calcul de volume produit un pic > 0.
    installAudioMocks(getUserMedia, 200);
    const onPeak = vi.fn();
    const onComplete = vi.fn();

    // React/RTL appellent aussi performance.now() en interne : on ne peut pas se
    // fier au nombre d'appels. On pilote plutôt le temps via une variable mutable.
    // start=0 capturé au démarrage ; tant que fakeNow < 3000, la frame exécute le
    // corps (update volume/pic). On bascule fakeNow >= 3000 avant la 2e frame pour
    // déclencher la branche elapsed>=totalMs -> stopRecording.
    // NB: on démarre à 1000 (et non 0) car la boucle garde-fou teste
    // `!startTimeRef.current` ; un temps de départ à 0 (falsy) ferait return.
    let fakeNow = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow);

    // RAF borné : exécute la callback de façon synchrone, max 2 frames.
    // Avant la 2e frame on avance le temps au-delà de la durée (3000ms 'short').
    let rafCalls = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCalls++;
      if (rafCalls === 1) {
        // frame suivante : temps encore dans la fenêtre -> le corps tourne (throttle)
        fakeNow = 1050;
        cb(0);
      } else if (rafCalls === 2) {
        // dernière frame : on dépasse la durée -> stopRecording
        fakeNow = 5000;
        cb(0);
      }
      return rafCalls;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const { result } = renderHook(() => useVoiceVolume({ durationKey: 'short', onPeak, onComplete }));

    await act(async () => {
      await result.current.startRecording();
    });

    // Frame 1 a tourné : pic détecté (signal=200 => shaped > 0) et maxVolume publié.
    // (currentVolume est ensuite remis à 0 par stopRecording en frame 2.)
    expect(onPeak).toHaveBeenCalled();
    expect(onPeak.mock.calls[0][0]).toBeGreaterThan(0);
    expect(result.current.maxVolume).toBeGreaterThan(0);

    // Frame 2 a vu elapsed >= totalMs => stopRecording a tourné.
    await waitFor(() => expect(result.current.isRecording).toBe(false));
    expect(onComplete).toHaveBeenCalled();
    expect(onComplete.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('nettoie les ressources au démontage pendant un enregistrement', async () => {
    const trackStop = vi.fn();
    const stream = { getTracks: () => [{ stop: trackStop }] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    installAudioMocks(getUserMedia);

    const { result, unmount } = renderHook(() => useVoiceVolume());
    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.isRecording).toBe(true);

    expect(() => unmount()).not.toThrow();
    expect(trackStop).toHaveBeenCalled();
  });
});
