import { describe, expect, it, vi } from 'vitest';

import { SignOutButton } from './SignOutButton';

import { authClient } from '@/lib/auth-client';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

vi.mock('@/lib/auth-client', () => ({ authClient: { signOut: vi.fn() } }));

describe('SignOutButton', () => {
  it('déclenche signOut au clic', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignOutButton />);
    await user.click(screen.getByRole('button'));
    expect(authClient.signOut).toHaveBeenCalled();
  });
});
