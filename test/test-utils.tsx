import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { ThemeProvider } from '@/components/ThemeProvider';
import { I18nProvider } from '@/lib/i18n';

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
