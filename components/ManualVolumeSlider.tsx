'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import { useTranslation } from '@/lib/i18n';

type Props = {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function ManualVolumeSlider({ value, disabled, onChange }: Props) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(value);
  const [debouncedValue, setDebouncedValue] = useState<number | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Debounce les écritures vers Spotify
  useEffect(() => {
    if (debouncedValue === null) {
      return;
    }
    const handle = setTimeout(() => {
      onChange(debouncedValue);
      setDebouncedValue(null);
    }, 250);
    return () => clearTimeout(handle);
  }, [debouncedValue, onChange]);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor="manual-volume" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {t('controller.spotifyVolume')} · {t('controller.manual')}
        </label>
        <span className="font-mono text-sm font-semibold text-fg">
          {Math.round(local)}
          <span className="text-muted">%</span>
        </span>
      </div>
      <input
        id="manual-volume"
        type="range"
        min={0}
        max={100}
        step={1}
        value={local}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          setDebouncedValue(v);
        }}
        aria-label={t('controller.manual')}
        className="jmv-slider w-full"
        style={{ '--jmv-slider-value': `${local}%` } as CSSProperties}
      />
    </section>
  );
}
