'use client';

import { signOut } from 'next-auth/react';

import { useTranslation } from '@/lib/i18n';

export function SignOutButton() {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface/40 px-3 py-2 text-xs font-medium text-fg-soft transition-colors hover:border-fg/30 hover:text-fg sm:px-4 sm:text-sm"
    >
      <span className="hidden sm:inline">{t('auth.signOut')}</span>
      <span className="sm:hidden">{t('auth.signOutShort')}</span>
    </button>
  );
}
