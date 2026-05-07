'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (pref: ThemePreference) => void;
};

const STORAGE_KEY = 'jmv-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSystem(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', pref);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  // Lit la valeur système au mount React (le ThemeScript inline a déjà
  // appliqué l'attribut data-theme côté DOM avant l'hydratation).
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => readSystem());

  // Charge la préférence depuis localStorage au mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    const initial: ThemePreference = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setPreferenceState(initial);
    setResolved(initial === 'system' ? readSystem() : initial);
  }, []);

  // Réagit aux changements de prefers-color-scheme quand pref = system
  useEffect(() => {
    if (preference !== 'system') {
      setResolved(preference);
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolved(mq.matches ? 'dark' : 'light');
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    localStorage.setItem(STORAGE_KEY, pref);
    applyTheme(pref);
  }, []);

  return <ThemeContext.Provider value={{ preference, resolved, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
