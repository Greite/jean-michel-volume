'use client';

import { useTranslation } from '@/lib/i18n';
import type { SpotifyDevice } from '@/types/spotify';

type Props = {
  devices: SpotifyDevice[];
  activeDeviceId: string | null;
  onSelect: (id: string) => void;
};

const TYPE_GLYPHS: Record<string, string> = {
  Computer: '▣',
  Smartphone: '▯',
  Speaker: '◉',
  TV: '▭',
  AVR: '◧',
  STB: '◨',
  AudioDongle: '◌',
  GameConsole: '◇',
  CastVideo: '◐',
  CastAudio: '◑',
  Automobile: '◭',
  Tablet: '▭',
};

export function DeviceSelector({ devices, activeDeviceId, onSelect }: Props) {
  const { t } = useTranslation();

  if (devices.length === 0) {
    return (
      <section className="rounded-md border border-dashed border-line bg-surface/30 p-4 text-center text-sm text-muted">
        {t('device.none')}
      </section>
    );
  }

  return (
    <section aria-label={t('device.select')} className="space-y-2">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{t('device.select')}</h3>
      <ul className="grid gap-1.5">
        {devices.map((d) => {
          const isActive = d.id === activeDeviceId;
          const glyph = TYPE_GLYPHS[d.type] ?? '◯';
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => !isActive && onSelect(d.id)}
                aria-current={isActive ? 'true' : undefined}
                aria-pressed={isActive}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? 'border-brand bg-brand-soft text-fg cursor-default'
                    : 'border-line bg-surface/40 text-fg-soft hover:border-brand/40 hover:bg-surface'
                }`}
              >
                <span aria-hidden="true" className={`font-mono text-base ${isActive ? 'text-brand' : 'text-muted'}`}>
                  {glyph}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{d.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{d.type}</span>
                {isActive && <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-brand" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
