import { describe, expect, it, vi } from 'vitest';

import { VoiceVolumeController } from './VoiceVolumeController';

import * as playback from '@/hooks/useSpotifyPlayback';
import * as voice from '@/hooks/useVoiceVolume';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { playbackStateFixture } from '@/test/fixtures';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

vi.mock('@/hooks/useVoiceVolume');
vi.mock('@/hooks/useSpotifyPlayback');

function voiceReturn(overrides: Record<string, unknown> = {}) {
  return {
    currentVolume: 0,
    maxVolume: 0,
    isRecording: false,
    error: null,
    countdownMs: 5000,
    countdownSeconds: 5,
    spectrum: new Float32Array(128),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    ...overrides,
  } as never;
}

function playbackReturn(overrides: Record<string, unknown> = {}) {
  return {
    state: playbackStateFixture(),
    apiError: null,
    isLoading: false,
    setVolume: vi.fn(),
    sendAction: vi.fn(),
    refresh: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  } as never;
}

describe('VoiceVolumeController', () => {
  it('rend le bouton de démarrage quand on n’enregistre pas', () => {
    vi.mocked(voice.useVoiceVolume).mockReturnValue(voiceReturn());
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn());
    renderWithProviders(<VoiceVolumeController />);
    expect(screen.getByRole('button', { name: DICTIONARIES.fr['controller.start'] })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('démarre l’enregistrement au clic', async () => {
    const startRecording = vi.fn();
    vi.mocked(voice.useVoiceVolume).mockReturnValue(voiceReturn({ startRecording }));
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn());
    const user = userEvent.setup();
    renderWithProviders(<VoiceVolumeController />);
    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controller.start'] }));
    expect(startRecording).toHaveBeenCalled();
  });

  it('affiche le bouton stop pendant l’enregistrement', () => {
    vi.mocked(voice.useVoiceVolume).mockReturnValue(voiceReturn({ isRecording: true }));
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn());
    renderWithProviders(<VoiceVolumeController />);
    expect(screen.getByRole('button', { name: DICTIONARIES.fr['controller.stop'] })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });
});
