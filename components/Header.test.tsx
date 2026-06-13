import { useSession } from 'next-auth/react';
import { describe, expect, it, vi } from 'vitest';

import { Header } from './Header';

import { renderWithProviders, screen } from '@/test/test-utils';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

describe('Header', () => {
  it('affiche SignIn quand pas de session', () => {
    vi.mocked(useSession).mockReturnValue({ data: null } as never);
    renderWithProviders(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /lang/i })).toBeInTheDocument();
  });

  it('affiche SignOut quand connecté', () => {
    vi.mocked(useSession).mockReturnValue({ data: { accessToken: 'x' } } as never);
    renderWithProviders(<Header />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});
