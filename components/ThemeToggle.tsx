'use client';

import { type ThemePreference, useTheme } from './ThemeProvider';

import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';
import { useTranslation } from '@/lib/i18n';

const OPTIONS: { value: ThemePreference; icon: React.ReactNode }[] = [
  {
    value: 'light',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    value: 'dark',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    ),
  },
  {
    value: 'system',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const { t } = useTranslation();
  const values = OPTIONS.map((o) => o.value);
  const onKeyDown = useRovingTabIndex(values, preference, setPreference);

  return (
    <div
      role="radiogroup"
      aria-label={t('theme.label')}
      className="inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface/60 p-1 backdrop-blur-sm"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(`theme.${opt.value}`)}
            title={t(`theme.${opt.value}`)}
            tabIndex={active ? 0 : -1}
            onKeyDown={onKeyDown}
            onClick={() => setPreference(opt.value)}
            className={`relative inline-flex h-7 w-7 items-center justify-center rounded-pill transition-all duration-200 ${
              active ? 'bg-brand text-on-brand shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}
