'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from '@/lib/i18n';

type Entry = { peak: number; at: number };

type Props = {
  history: Entry[];
  lastPeak: number | null;
};

function formatRelative(ts: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - ts) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function VolumeHistory({ history, lastPeak }: Props) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  // Rafraîchit les timestamps relatifs toutes les 10 s.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section aria-labelledby="history-title" className="rounded-lg border border-line bg-surface/40 p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 id="history-title" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {t('controller.history')}
        </h3>
        {lastPeak !== null && (
          <span className="font-mono text-[11px] text-muted">
            {t('controller.maxRecorded')} <span className="text-brand">{Math.round(lastPeak)}%</span>
          </span>
        )}
      </header>
      <ol className="space-y-1.5">
        {history.map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted w-8">{formatRelative(e.at, now)}</span>
            <span className="relative h-2 flex-1 overflow-hidden rounded-pill bg-surface-2" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 bg-brand" style={{ width: `${e.peak}%` }} />
            </span>
            <span className="w-12 text-right font-mono text-xs font-semibold text-fg">{Math.round(e.peak)}%</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
