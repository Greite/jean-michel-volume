import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManualVolumeSlider } from './ManualVolumeSlider';

import { renderWithProviders, screen } from '@/test/test-utils';

describe('ManualVolumeSlider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('affiche la valeur courante', () => {
    renderWithProviders(<ManualVolumeSlider value={40} onChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toHaveValue('40');
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('débounce et appelle onChange après déplacement', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    renderWithProviders(<ManualVolumeSlider value={40} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '80' } });
    expect(onChange).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(onChange).toHaveBeenCalledWith(80);
  });

  it('est désactivé quand disabled', () => {
    renderWithProviders(<ManualVolumeSlider value={40} disabled onChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toBeDisabled();
  });
});
