import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ThemeProvider, useTheme } from './ThemeProvider';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

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
});
