import { describe, expect, it } from 'vitest';

import { Hero } from './Hero';

import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { renderWithProviders, screen } from '@/test/test-utils';

describe('Hero', () => {
  it('affiche le titre et le corps traduits', () => {
    renderWithProviders(<Hero />);
    expect(screen.getByRole('heading', { name: DICTIONARIES.fr['hero.title'] })).toBeInTheDocument();
    expect(screen.getByText(DICTIONARIES.fr['hero.body'])).toBeInTheDocument();
  });
});
