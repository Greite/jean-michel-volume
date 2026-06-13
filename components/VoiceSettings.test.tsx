import { describe, expect, it, vi } from 'vitest';

import { VoiceSettings } from './VoiceSettings';

import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

describe('VoiceSettings', () => {
  it('rend deux radiogroups (durée + sensibilité)', () => {
    renderWithProviders(
      <VoiceSettings duration="default" sensitivity="medium" onDuration={vi.fn()} onSensitivity={vi.fn()} />,
    );
    expect(screen.getAllByRole('radiogroup')).toHaveLength(2);
  });

  it('appelle onDuration au clic sur une durée', async () => {
    const user = userEvent.setup();
    const onDuration = vi.fn();
    renderWithProviders(
      <VoiceSettings duration="default" sensitivity="medium" onDuration={onDuration} onSensitivity={vi.fn()} />,
    );
    await user.click(screen.getByRole('radio', { name: /3/ }));
    expect(onDuration).toHaveBeenCalledWith('short');
  });

  it('appelle onSensitivity au clic sur une sensibilité', async () => {
    const user = userEvent.setup();
    const onSensitivity = vi.fn();
    renderWithProviders(
      <VoiceSettings duration="default" sensitivity="medium" onDuration={vi.fn()} onSensitivity={onSensitivity} />,
    );
    await user.click(screen.getByRole('radio', { name: DICTIONARIES.fr['controller.sensitivity.high'] }));
    expect(onSensitivity).toHaveBeenCalledWith('high');
  });

  it('désactive les fieldsets quand disabled', () => {
    renderWithProviders(
      <VoiceSettings duration="default" sensitivity="medium" onDuration={vi.fn()} onSensitivity={vi.fn()} disabled />,
    );
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });
});
