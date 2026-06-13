import { describe, expect, it } from 'vitest';

import { VolumeHistory } from './VolumeHistory';

import { renderWithProviders, screen } from '@/test/test-utils';

describe('VolumeHistory', () => {
  it('rend une entrée par pic et le dernier pic max', () => {
    const history = [
      { peak: 80, at: Date.now() },
      { peak: 55, at: Date.now() - 60000 },
    ];
    renderWithProviders(<VolumeHistory history={history} lastPeak={80} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByText('80%')).toHaveLength(2);
  });

  it('n’affiche pas le pic max quand lastPeak est null', () => {
    renderWithProviders(<VolumeHistory history={[]} lastPeak={null} />);
    expect(screen.queryByText('%', { exact: false })).not.toBeInTheDocument();
  });

  it('formate les libellés relatifs en minutes et en heures', () => {
    const history = [
      { peak: 40, at: Date.now() - 120_000 },
      { peak: 60, at: Date.now() - 7_200_000 },
    ];
    renderWithProviders(<VolumeHistory history={history} lastPeak={60} />);
    expect(screen.getByText('2m')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
  });
});
