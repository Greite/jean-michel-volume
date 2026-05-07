'use client';

import { signIn } from 'next-auth/react';

import { useTranslation } from '@/lib/i18n';

export function SignInButton() {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => signIn('spotify', { callbackUrl: '/' })}
      className="inline-flex items-center gap-2 rounded-pill bg-brand px-4 py-2 font-display text-sm font-bold text-on-brand shadow-glow transition-transform hover:bg-brand-hover hover:scale-[1.02] active:scale-[0.98] sm:px-5"
    >
      <svg viewBox="0 0 8 8" aria-hidden="true" className="h-2 w-2 fill-current">
        <circle cx="4" cy="4" r="4" />
      </svg>
      <span className="hidden sm:inline">{t('auth.signIn')}</span>
      <span className="sm:hidden">{t('auth.signInShort')}</span>
    </button>
  );
}
