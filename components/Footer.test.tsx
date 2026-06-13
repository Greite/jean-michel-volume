import { describe, expect, it } from 'vitest';

import { Footer } from './Footer';

import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { renderWithProviders, screen } from '@/test/test-utils';

describe('Footer', () => {
  it('rend une nav de footer et des liens externes', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
    const spotifyLink = screen.getByRole('link', { name: `${DICTIONARIES.fr['footer.spotify']} ↗` });
    expect(spotifyLink).toHaveAttribute('target', '_blank');
    expect(spotifyLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('affiche l’année courante', () => {
    renderWithProviders(<Footer />);
    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
