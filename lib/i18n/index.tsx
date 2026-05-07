'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { DICTIONARIES, LOCALES, type Locale, type TranslationKey } from './dictionaries';

const STORAGE_KEY = 'jmv-locale';

type I18nContextValue = {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'fr';
  }
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && LOCALES.includes(stored)) {
    return stored;
  }
  const nav = navigator.language?.toLowerCase() ?? 'fr';
  if (nav.startsWith('en')) {
    return 'en';
  }
  return 'fr';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const initial = detectInitialLocale();
    setLocaleState(initial);
    document.documentElement.lang = initial;
  }, []);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    localStorage.setItem(STORAGE_KEY, loc);
    document.documentElement.lang = loc;
  }, []);

  const t = useCallback((key: TranslationKey) => DICTIONARIES[locale][key] ?? key, [locale]);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used inside <I18nProvider>');
  }
  return ctx;
}

export type { Locale, TranslationKey };
