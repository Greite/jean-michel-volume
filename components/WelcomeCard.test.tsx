import { describe, expect, it, vi } from 'vitest';

import { WelcomeCard } from './WelcomeCard';

import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { renderWithProviders, screen } from '@/test/test-utils';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

describe('WelcomeCard', () => {
  it('affiche le titre de bienvenue, la mascotte et un bouton de connexion', () => {
    renderWithProviders(<WelcomeCard />);
    expect(screen.getByRole('heading', { name: DICTIONARIES.fr['welcome.title'] })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Jean-Michel' })).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
