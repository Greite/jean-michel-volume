import { describe, expect, it, vi } from 'vitest';

import { DeviceSelector } from './DeviceSelector';

import { DICTIONARIES } from '@/lib/i18n/dictionaries';
import { deviceFixture } from '@/test/fixtures';
import { renderWithProviders, screen, userEvent } from '@/test/test-utils';

describe('DeviceSelector', () => {
  it('affiche un message quand aucun device', () => {
    renderWithProviders(<DeviceSelector devices={[]} activeDeviceId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(DICTIONARIES.fr['device.none'])).toBeInTheDocument();
  });

  it('marque le device actif et n’appelle pas onSelect au clic dessus', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const devices = [
      deviceFixture({ id: 'a', name: 'Mac' }),
      deviceFixture({ id: 'b', name: 'Phone', isActive: false }),
    ];
    renderWithProviders(<DeviceSelector devices={devices} activeDeviceId="a" onSelect={onSelect} />);

    const active = screen.getByRole('button', { name: /Mac/ });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    await user.click(active);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('appelle onSelect au clic sur un device inactif', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const devices = [
      deviceFixture({ id: 'a', name: 'Mac' }),
      deviceFixture({ id: 'b', name: 'Phone', isActive: false }),
    ];
    renderWithProviders(<DeviceSelector devices={devices} activeDeviceId="a" onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /Phone/ }));
    expect(onSelect).toHaveBeenCalledWith('b');
  });
});
