'use client';

import { useTranslation } from '@/lib/i18n';

export function HowItWorks() {
  const { t } = useTranslation();
  const steps = [t('how.step1'), t('how.step2'), t('how.step3'), t('how.step4')];

  return (
    <section
      aria-labelledby="how-title"
      className="relative overflow-hidden rounded-lg border border-line bg-surface/40 p-6"
    >
      <header className="mb-6">
        <h2 id="how-title" className="font-display text-xl font-bold tracking-tight">
          {t('how.title')}
        </h2>
      </header>
      <ol className="grid gap-4 sm:grid-cols-2">
        {steps.map((step, i) => (
          <li
            key={i}
            className="group relative flex gap-4 rounded-md border border-line/60 bg-bg-elevated/50 p-4 transition-colors hover:border-brand/40"
          >
            <span
              aria-hidden="true"
              className="font-display text-3xl font-bold leading-none text-brand/80 group-hover:text-brand"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="text-sm text-fg-soft pt-1">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
