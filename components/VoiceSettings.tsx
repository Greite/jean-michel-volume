'use client';

import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';
import type { RecordingDurationKey, SensitivityKey } from '@/lib/constants';
import { type TranslationKey, useTranslation } from '@/lib/i18n';

type Props = {
  duration: RecordingDurationKey;
  sensitivity: SensitivityKey;
  onDuration: (k: RecordingDurationKey) => void;
  onSensitivity: (k: SensitivityKey) => void;
  disabled?: boolean;
};

const DURATIONS: { value: RecordingDurationKey; label: string }[] = [
  { value: 'short', label: '3' },
  { value: 'default', label: '5' },
  { value: 'long', label: '10' },
];

export function VoiceSettings({ duration, sensitivity, onDuration, onSensitivity, disabled }: Props) {
  const { t } = useTranslation();

  const SENSITIVITY: { value: SensitivityKey; labelKey: TranslationKey }[] = [
    { value: 'low', labelKey: 'controller.sensitivity.low' },
    { value: 'medium', labelKey: 'controller.sensitivity.medium' },
    { value: 'high', labelKey: 'controller.sensitivity.high' },
  ];

  const durationValues = DURATIONS.map((d) => d.value);
  const sensitivityValues = SENSITIVITY.map((s) => s.value);
  const onDurationKey = useRovingTabIndex(durationValues, duration, onDuration);
  const onSensitivityKey = useRovingTabIndex(sensitivityValues, sensitivity, onSensitivity);

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {/* Durée */}
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {t('controller.duration')}
        </legend>
        <div
          role="radiogroup"
          aria-label={t('controller.duration')}
          className="grid grid-cols-3 gap-1.5 rounded-pill border border-line bg-surface/40 p-1"
        >
          {DURATIONS.map((d) => {
            const active = duration === d.value;
            return (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onKeyDown={onDurationKey}
                onClick={() => onDuration(d.value)}
                className={`flex h-8 items-center justify-center rounded-pill font-mono text-sm font-semibold leading-none transition-all ${
                  active ? 'bg-brand text-on-brand' : 'text-muted hover:text-fg'
                }`}
              >
                {d.label}
                <span className="ml-0.5 text-[10px] opacity-70">{t('duration.unit')}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Sensibilité */}
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {t('controller.sensitivity')}
        </legend>
        <div
          role="radiogroup"
          aria-label={t('controller.sensitivity')}
          className="grid grid-cols-3 gap-1.5 rounded-pill border border-line bg-surface/40 p-1"
        >
          {SENSITIVITY.map((s) => {
            const active = sensitivity === s.value;
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onKeyDown={onSensitivityKey}
                onClick={() => onSensitivity(s.value)}
                className={`flex h-8 items-center justify-center rounded-pill text-xs font-semibold leading-none transition-all ${
                  active ? 'bg-brand text-on-brand' : 'text-muted hover:text-fg'
                }`}
              >
                {t(s.labelKey)}
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}
