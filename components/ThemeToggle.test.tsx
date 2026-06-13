import { describe, expect, it } from 'vitest';

import { ThemeToggle } from './ThemeToggle';

import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

describe('ThemeToggle', () => {
  it('rend trois options de thème', () => {
    renderWithProviders(<ThemeToggle />);
    expect(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.light'] })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.dark'] })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.system'] })).toBeInTheDocument();
  });

  it('active "light" après clic et persiste', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);
    await user.click(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.light'] }));
    expect(screen.getByRole('radio', { name: DICTIONARIES.fr['theme.light'] })).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('jmv-theme')).toBe('light');
  });
});
