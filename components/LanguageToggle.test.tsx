import { describe, expect, it } from 'vitest';

import { LanguageToggle } from './LanguageToggle';

import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

describe('LanguageToggle', () => {
  it('rend un radiogroup FR/EN avec FR coché par défaut', () => {
    renderWithProviders(<LanguageToggle />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    const fr = screen.getByRole('radio', { name: 'FR' });
    expect(fr).toHaveAttribute('aria-checked', 'true');
  });

  it('coche EN après clic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageToggle />);
    await user.click(screen.getByRole('radio', { name: 'EN' }));
    expect(screen.getByRole('radio', { name: 'EN' })).toHaveAttribute('aria-checked', 'true');
  });
});
