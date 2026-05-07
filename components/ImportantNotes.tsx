'use client';

import { useTranslation } from '@/lib/i18n';

export function ImportantNotes() {
  const { t } = useTranslation();

  const notes = [t('notes.premium'), t('notes.desktop'), t('notes.webPlayer'), t('notes.playing')];

  return (
    <aside aria-labelledby="notes-title" className="rounded-lg border border-warn/40 bg-warn-soft p-5 text-sm text-fg">
      <header className="mb-3 flex items-center gap-2">
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-warn">
          <path
            d="M8 1L15 14H1L8 1zm0 4v5m0 1.5v1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <h2 id="notes-title" className="font-mono text-[11px] uppercase tracking-[0.2em] text-warn">
          {t('notes.title')}
        </h2>
      </header>
      <ul className="space-y-1.5">
        {notes.map((n, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="text-warn font-bold">
              ·
            </span>
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
