import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { DICTIONARIES } from './dictionaries';
import { I18nProvider, useTranslation } from './index';

afterEach(() => {
  localStorage.clear();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('useTranslation', () => {
  it('lève une erreur hors provider', () => {
    expect(() => renderHook(() => useTranslation())).toThrow(/I18nProvider/);
  });

  it('traduit une clé dans la locale par défaut (fr via navigator.language)', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.t('app.title')).toBe(DICTIONARIES.fr['app.title']);
  });

  it('retourne la clé brute pour une clé inconnue', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    // @ts-expect-error clé volontairement invalide
    expect(result.current.t('nope.nope')).toBe('nope.nope');
  });

  it('change la locale et persiste dans localStorage', async () => {
    const user = userEvent.setup();
    function Probe() {
      const { t, setLocale } = useTranslation();
      return (
        <div>
          <span data-testid="val">{t('app.title')}</span>
          <button type="button" onClick={() => setLocale('en')}>
            en
          </button>
        </div>
      );
    }
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'en' }));
    expect(screen.getByTestId('val')).toHaveTextContent(DICTIONARIES.en['app.title']);
    expect(localStorage.getItem('jmv-locale')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('lit la locale stockée au montage', () => {
    localStorage.setItem('jmv-locale', 'en');
    const { result } = renderHook(() => useTranslation(), { wrapper });
    act(() => {});
    expect(result.current.locale).toBe('en');
  });
});
