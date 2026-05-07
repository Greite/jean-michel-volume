'use client';

import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';
import { type Locale, useTranslation } from '@/lib/i18n';

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();
  const values = OPTIONS.map((o) => o.value);
  const onKeyDown = useRovingTabIndex(values, locale, setLocale);

  return (
    <div
      role="radiogroup"
      aria-label={t('lang.label')}
      className="inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface/60 p-1 backdrop-blur-sm font-mono text-[11px] tracking-wider"
    >
      {OPTIONS.map((opt) => {
        const active = locale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={onKeyDown}
            onClick={() => setLocale(opt.value)}
            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-pill px-2 transition-all duration-200 ${
              active ? 'bg-brand text-on-brand' : 'text-muted hover:text-fg'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
