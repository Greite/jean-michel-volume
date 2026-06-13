import { signOut } from 'next-auth/react';
import { describe, expect, it, vi } from 'vitest';

import { SignOutButton } from './SignOutButton';

import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

describe('SignOutButton', () => {
  it('déclenche signOut au clic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignOutButton />);
    await user.click(screen.getByRole('button'));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });
});
