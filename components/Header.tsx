'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { LanguageToggle } from './LanguageToggle';
import { SignInButton } from './SignInButton';
import { SignOutButton } from './SignOutButton';
import { ThemeToggle } from './ThemeToggle';

import { useTranslation } from '@/lib/i18n';

export function Header() {
  const { data: session } = useSession();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <Link href="/" aria-label={t('app.title')} className="group flex items-center gap-3 min-w-0">
          <div className="relative">
            <Image
              src="/icon-192.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-9 w-9 flex-shrink-0 transition-transform group-hover:rotate-[-6deg] sm:h-10 sm:w-10"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-bg"
            />
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="font-display text-lg font-bold leading-none tracking-tight text-fg">{t('app.title')}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted truncate">
              {t('app.tagline')}
            </p>
          </div>
        </Link>

        <div className="flex flex-shrink-0 items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <span aria-hidden="true" className="hidden h-5 w-px bg-line sm:block" />
          {session ? <SignOutButton /> : <SignInButton />}
        </div>
      </div>
    </header>
  );
}
