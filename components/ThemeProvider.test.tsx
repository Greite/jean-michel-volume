import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider, useTheme } from './ThemeProvider';

const originalMatchMedia = window.matchMedia;

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('ThemeProvider', () => {
  it('useTheme lève hors provider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
  });

  it('démarre en préférence "system"', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.preference).toBe('system');
  });

  it('setPreference("dark") applique data-theme et persiste', async () => {
    const user = userEvent.setup();
    function Probe() {
      const { preference, setPreference } = useTheme();
      return (
        <div>
          <span data-testid="pref">{preference}</span>
          <button type="button" onClick={() => setPreference('dark')}>
            dark
          </button>
        </div>
      );
    }
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'dark' }));
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('jmv-theme')).toBe('dark');
  });

  it('setPreference("system") retire l’attribut data-theme', async () => {
    const user = userEvent.setup();
    document.documentElement.setAttribute('data-theme', 'dark');
    function Probe() {
      const { setPreference } = useTheme();
      return (
        <button type="button" onClick={() => setPreference('system')}>
          system
        </button>
      );
    }
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'system' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem('jmv-theme')).toBe('system');
  });

  it('lit la préférence stockée "dark" au montage', async () => {
    localStorage.setItem('jmv-theme', 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.preference).toBe('dark'));
    expect(result.current.resolved).toBe('dark');
  });

  it('résout "dark" quand prefers-color-scheme: dark (préférence system)', async () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.resolved).toBe('dark'));
    expect(result.current.preference).toBe('system');
  });
});
