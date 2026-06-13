import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Providers } from './Providers';

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: () => ({ data: null }),
  signOut: vi.fn(),
}));

describe('Providers', () => {
  it('rend ses enfants dans l’arbre de providers', () => {
    render(
      <Providers>
        <span>child-content</span>
      </Providers>,
    );
    expect(screen.getByText('child-content')).toBeInTheDocument();
  });
});
