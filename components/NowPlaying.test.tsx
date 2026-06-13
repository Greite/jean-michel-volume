import { describe, expect, it, vi } from 'vitest';

import { NowPlaying } from './NowPlaying';

import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { deviceFixture, trackFixture } from '@/test/fixtures';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

const handlers = { onPlayPause: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() };

describe('NowPlaying', () => {
  it('affiche un skeleton en chargement sans track', () => {
    renderWithProviders(<NowPlaying track={null} device={null} isPlaying={false} isLoading {...handlers} />);
    expect(screen.getByLabelText(DICTIONARIES.fr['controller.loadingPlayback'])).toBeInTheDocument();
  });

  it('affiche l’état vide avec lien Spotify quand pas de track', () => {
    renderWithProviders(<NowPlaying track={null} device={null} isPlaying={false} {...handlers} />);
    expect(screen.getByText(DICTIONARIES.fr['track.nothing'])).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://open.spotify.com');
  });

  it('affiche le titre, l’artiste et déclenche les contrôles', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NowPlaying track={trackFixture()} device={deviceFixture()} isPlaying {...handlers} />);
    expect(screen.getByRole('heading', { name: 'Voyage Voyage' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controls.pause'] }));
    expect(handlers.onPlayPause).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: DICTIONARIES.fr['controls.next'] }));
    expect(handlers.onNext).toHaveBeenCalled();
  });

  it('affiche le bouton lecture (PlayIcon) quand isPlaying=false et déclenche onPlayPause', async () => {
    const user = userEvent.setup();
    const onPlayPause = vi.fn();
    renderWithProviders(
      <NowPlaying
        track={trackFixture()}
        device={deviceFixture()}
        isPlaying={false}
        onPlayPause={onPlayPause}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    const playButton = screen.getByRole('button', { name: DICTIONARIES.fr['controls.play'] });
    expect(playButton).toBeInTheDocument();
    await user.click(playButton);
    expect(onPlayPause).toHaveBeenCalled();
  });
});
