import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/components/Header', () => ({ Header: () => <header>header</header> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>footer</footer> }));
vi.mock('@/components/Hero', () => ({ Hero: () => <div>hero</div> }));
vi.mock('@/components/HowItWorks', () => ({ HowItWorks: () => <div>how</div> }));
vi.mock('@/components/ImportantNotes', () => ({ ImportantNotes: () => <div>notes</div> }));
vi.mock('@/components/WelcomeCard', () => ({ WelcomeCard: () => <div>welcome</div> }));
vi.mock('@/components/VoiceVolumeController', () => ({ VoiceVolumeController: () => <div>controller</div> }));

import { getServerSession } from 'next-auth/next';

import Home from './page';

describe('Home page', () => {
  it('affiche WelcomeCard quand déconnecté', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
    render(await Home());
    expect(screen.getByText('welcome')).toBeInTheDocument();
    expect(screen.queryByText('controller')).not.toBeInTheDocument();
  });

  it('affiche le contrôleur quand connecté', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ accessToken: 'x' } as never);
    render(await Home());
    expect(screen.getByText('controller')).toBeInTheDocument();
    expect(screen.queryByText('welcome')).not.toBeInTheDocument();
  });
});
