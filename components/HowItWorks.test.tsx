import { describe, expect, it } from 'vitest';

import { HowItWorks } from './HowItWorks';

import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { renderWithProviders, screen } from '@/test/test-utils';

describe('HowItWorks', () => {
  it('liste les 4 étapes', () => {
    renderWithProviders(<HowItWorks />);
    expect(screen.getByRole('heading', { name: DICTIONARIES.fr['how.title'] })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});
