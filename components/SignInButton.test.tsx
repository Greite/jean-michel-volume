import { signIn } from 'next-auth/react';
import { describe, expect, it, vi } from 'vitest';

import { SignInButton } from './SignInButton';

import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

describe('SignInButton', () => {
  it('déclenche signIn spotify au clic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInButton />);
    await user.click(screen.getByRole('button'));
    expect(signIn).toHaveBeenCalledWith('spotify', { callbackUrl: '/' });
  });
});
