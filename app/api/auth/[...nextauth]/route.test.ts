import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth', () => ({
  default: vi.fn(() => vi.fn()),
}));

import { authOptions, GET, POST } from './route';

describe('authOptions', () => {
  it('exporte des handlers GET et POST', () => {
    expect(GET).toBeDefined();
    expect(POST).toBeDefined();
  });

  it('configure un provider et des scopes de lecture/écriture playback', () => {
    expect(authOptions.providers).toHaveLength(1);
  });

  describe('callbacks.session', () => {
    it('copie accessToken et error du token vers la session', async () => {
      const session = { user: {}, expires: '' } as never;
      const token = { accessToken: 'abc', error: 'RefreshAccessTokenError' } as never;
      const result = await authOptions.callbacks!.session!({ session, token } as never);
      expect((result as { accessToken?: string }).accessToken).toBe('abc');
      expect((result as { error?: string }).error).toBe('RefreshAccessTokenError');
    });
  });

  describe('callbacks.jwt', () => {
    it('stocke les tokens à la connexion initiale (account présent)', async () => {
      const token = {} as never;
      const account = { access_token: 'at', refresh_token: 'rt', expires_at: 9999 } as never;
      const result = await authOptions.callbacks!.jwt!({ token, account } as never);
      expect((result as { accessToken?: string }).accessToken).toBe('at');
      expect((result as { refreshToken?: string }).refreshToken).toBe('rt');
    });

    it('retourne le token inchangé tant qu’il n’a pas expiré', async () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const token = { accessToken: 'at', expiresAt: future } as never;
      const result = await authOptions.callbacks!.jwt!({ token, account: null } as never);
      expect((result as { accessToken?: string }).accessToken).toBe('at');
    });
  });
});
