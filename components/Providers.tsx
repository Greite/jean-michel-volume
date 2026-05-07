'use client';

import { SessionProvider } from 'next-auth/react';

import { SessionErrorHandler } from './SessionErrorHandler';
import { ThemeProvider } from './ThemeProvider';

import { I18nProvider } from '@/lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SessionProvider refetchInterval={300} refetchOnWindowFocus>
          <SessionErrorHandler />
          {children}
        </SessionProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
