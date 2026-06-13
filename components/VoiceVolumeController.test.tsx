import { afterEach, describe, expect, it, vi } from 'vitest';

import { VoiceVolumeController } from './VoiceVolumeController';

import * as playback from '@/hooks/useSpotifyPlayback';
import * as voice from '@/hooks/useVoiceVolume';
import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { deviceFixture, playbackStateFixture } from '@/test/fixtures';
import { act, fireEvent, renderWithProviders, screen, userEvent } from '@/test/test-utils';

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

let capturedOnComplete: ((peak: number) => void | Promise<void>) | undefined;

// Mocks useVoiceVolume while capturing the `onComplete` option the component
// passes, so the orchestration flow can be invoked directly in tests.
function mockVoice(overrides: Record<string, unknown> = {}) {
  vi.mocked(voice.useVoiceVolume).mockImplementation((opts) => {
    capturedOnComplete = opts?.onComplete;
    return voiceReturn(overrides);
  });
}

afterEach(() => {
  capturedOnComplete = undefined;
  vi.useRealTimers();
});

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

  it('relaie les boutons de contrôle vers sendAction', async () => {
    const sendAction = vi.fn();
    mockVoice();
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn({ sendAction }));
    const user = userEvent.setup();
    renderWithProviders(<VoiceVolumeController />);

    // La fixture est en lecture -> bouton "pause"
    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controls.pause'] }));
    expect(sendAction).toHaveBeenCalledWith('pause');

    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controls.next'] }));
    expect(sendAction).toHaveBeenCalledWith('next');

    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controls.previous'] }));
    expect(sendAction).toHaveBeenCalledWith('previous');
  });

  it('relaie le slider manuel vers setVolume (avec debounce)', () => {
    vi.useFakeTimers();
    const setVolume = vi.fn();
    mockVoice();
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn({ setVolume }));
    renderWithProviders(<VoiceVolumeController />);

    const slider = screen.getByRole('slider', { name: DICTIONARIES.fr['controller.manual'] });
    expect(slider).not.toBeDisabled();

    fireEvent.change(slider, { target: { value: '73' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(setVolume).toHaveBeenCalledWith(73);
  });

  it('onComplete envoie le volume, affiche le toast et alimente l’historique', async () => {
    const setVolume = vi.fn().mockResolvedValue(80);
    mockVoice();
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn({ setVolume }));
    renderWithProviders(<VoiceVolumeController />);

    expect(capturedOnComplete).toBeDefined();
    await act(async () => {
      await capturedOnComplete?.(80);
    });

    expect(setVolume).toHaveBeenCalledWith(80);
    expect(screen.getByText(/Envoyé à Spotify/)).toBeInTheDocument();
    expect(screen.getByText(DICTIONARIES.fr['controller.sentToSpotify'], { exact: false })).toBeInTheDocument();
    expect(screen.getByText(DICTIONARIES.fr['controller.history'])).toBeInTheDocument();
  });

  it('onComplete ne fait rien quand le pic est <= 0', async () => {
    const setVolume = vi.fn().mockResolvedValue(0);
    mockVoice();
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn({ setVolume }));
    renderWithProviders(<VoiceVolumeController />);

    await act(async () => {
      await capturedOnComplete?.(0);
    });

    expect(setVolume).not.toHaveBeenCalled();
  });

  it('sélectionne un appareil -> sendAction transfer puis refresh', async () => {
    const sendAction = vi.fn().mockResolvedValue(undefined);
    const refresh = vi.fn();
    const state = playbackStateFixture({
      device: deviceFixture({ id: 'a', name: 'Device A', isActive: true }),
      devices: [
        deviceFixture({ id: 'a', name: 'Device A', isActive: true }),
        deviceFixture({ id: 'b', name: 'Device B', isActive: false }),
      ],
    });
    mockVoice();
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn({ state, sendAction, refresh }));
    const user = userEvent.setup();
    renderWithProviders(<VoiceVolumeController />);

    await user.click(screen.getByRole('button', { name: /Device B/ }));

    expect(sendAction).toHaveBeenCalledWith('transfer', 'b');
    expect(refresh).toHaveBeenCalled();
  });

  it('affiche l’erreur micro quand l’accès est refusé', () => {
    mockVoice({ error: 'mic-access-denied' });
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn());
    renderWithProviders(<VoiceVolumeController />);

    expect(screen.getByRole('alert')).toHaveTextContent(DICTIONARIES.fr['errors.micAccess']);
  });

  it('appelle play quand la lecture est en pause', async () => {
    const sendAction = vi.fn();
    mockVoice();
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(
      playbackReturn({ state: playbackStateFixture({ isPlaying: false }), sendAction }),
    );
    const user = userEvent.setup();
    renderWithProviders(<VoiceVolumeController />);

    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controls.play'] }));
    expect(sendAction).toHaveBeenCalledWith('play');
  });

  it('persiste durée et sensibilité dans localStorage', async () => {
    mockVoice();
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn());
    const user = userEvent.setup();
    renderWithProviders(<VoiceVolumeController />);

    // Durée "3" (short)
    await user.click(screen.getByRole('radio', { name: /3/ }));
    expect(localStorage.getItem('jmv-duration')).toBe('short');

    // Sensibilité "haute" (high)
    await user.click(screen.getByRole('radio', { name: DICTIONARIES.fr['controller.sensitivity.high'] }));
    expect(localStorage.getItem('jmv-sensitivity')).toBe('high');
  });

  it('affiche l’erreur API Spotify', () => {
    mockVoice();
    vi.mocked(playback.useSpotifyPlayback).mockReturnValue(playbackReturn({ apiError: 'Boom' }));
    renderWithProviders(<VoiceVolumeController />);

    expect(screen.getByText(DICTIONARIES.fr['errors.spotifyTitle'])).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });
});
