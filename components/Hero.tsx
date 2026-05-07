'use client';

import { useTranslation } from '@/lib/i18n';

export function Hero() {
  const { t } = useTranslation();
  return (
    <header className="jmv-reveal mb-10 max-w-3xl">
      <h1 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-fg sm:text-5xl md:text-[3.5rem]">
        {t('hero.title')}
      </h1>
      <p className="mt-4 max-w-xl text-base text-fg-soft sm:text-lg">{t('hero.body')}</p>
      <div className="mt-6 h-px w-24 bg-brand" aria-hidden="true" />
    </header>
  );
}
