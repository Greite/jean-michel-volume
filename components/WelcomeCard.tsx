'use client';

import { JeanMichelMascot } from './JeanMichelMascot';
import { SignInButton } from './SignInButton';

import { useTranslation } from '@/lib/i18n';

export function WelcomeCard() {
  const { t } = useTranslation();

  return (
    <section className="relative mx-auto max-w-xl">
      <div className="relative overflow-hidden rounded-xl border border-line bg-bg-elevated p-8 text-center shadow-card jmv-reveal sm:p-10">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 inline-block rounded-pill border border-brand/40 bg-brand-soft px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-brand"
        >
          v1.0 · voice driven
        </span>
        <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center">
          <JeanMichelMascot listening />
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">
          {t('welcome.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-fg-soft sm:text-base">{t('welcome.body')}</p>
        <div className="mt-7 flex justify-center">
          <SignInButton />
        </div>
      </div>
    </section>
  );
}
