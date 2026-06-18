import { describe, expect, it, vi } from 'vitest';

import { SignInButton } from './SignInButton';

import { authClient } from '@/lib/auth-client';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

vi.mock('@/lib/auth-client', () => ({ authClient: { signIn: { social: vi.fn() } } }));

describe('SignInButton', () => {
  it('déclenche signIn spotify au clic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInButton />);
    await user.click(screen.getByRole('button'));
    expect(authClient.signIn.social).toHaveBeenCalledWith({ provider: 'spotify', callbackURL: '/' });
  });
});
