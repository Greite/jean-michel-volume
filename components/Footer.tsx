'use client';

import { useTranslation } from '@/lib/i18n';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-line bg-bg/60 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.2fr,1fr,1fr]">
          {/* Brand */}
          <div>
            <p className="font-display text-2xl font-bold leading-none tracking-tight text-fg">
              Jean-Michel
              <span className="text-brand">.</span>
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{t('footer.tagline')}</p>
            <p className="mt-4 max-w-sm text-sm text-fg-soft">{t('footer.requirement')}</p>
          </div>

          {/* Links */}
          <nav aria-label="Footer" className="space-y-2 text-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Links</p>
            <ul className="space-y-1.5">
              <li>
                <a
                  href="https://www.spotify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-soft transition-colors hover:text-brand"
                >
                  {t('footer.spotify')} ↗
                </a>
              </li>
              <li>
                <a
                  href="https://developer.spotify.com/documentation/web-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-soft transition-colors hover:text-brand"
                >
                  {t('footer.api')} ↗
                </a>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-soft transition-colors hover:text-brand"
                >
                  {t('footer.github')} ↗
                </a>
              </li>
            </ul>
          </nav>

          {/* Meta */}
          <div>
            <p className="text-sm text-fg-soft">
              © {currentYear} Gauthier Painteaux. {t('footer.rights')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
