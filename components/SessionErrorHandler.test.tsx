import { render } from '@testing-library/react';
import { signOut, useSession } from 'next-auth/react';
import { describe, expect, it, vi } from 'vitest';

import { SessionErrorHandler } from './SessionErrorHandler';

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

describe('SessionErrorHandler', () => {
  it('déconnecte si la session a une RefreshAccessTokenError', () => {
    vi.mocked(useSession).mockReturnValue({ data: { error: 'RefreshAccessTokenError' } } as never);
    render(<SessionErrorHandler />);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('ne déconnecte pas pour une session saine', () => {
    vi.mocked(useSession).mockReturnValue({ data: { accessToken: 'ok' } } as never);
    render(<SessionErrorHandler />);
    expect(signOut).not.toHaveBeenCalled();
  });
});
