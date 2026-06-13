import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVoiceVolume } from './useVoiceVolume';

import { RECORDING_DURATIONS_MS } from '@/lib/constants';

function installAudioMocks(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });

  class FakeAnalyser {
    fftSize = 0;
    frequencyBinCount = 128;
    getByteFrequencyData(arr: Uint8Array) {
      arr.fill(0);
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
});
