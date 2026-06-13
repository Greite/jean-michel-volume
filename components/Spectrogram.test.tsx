import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spectrogram } from './Spectrogram';

import { FFT_SIZE } from '@/lib/constants';

describe('Spectrogram', () => {
  it('rend un canvas masqué aux lecteurs d’écran', () => {
    const { container } = render(<Spectrogram spectrum={new Float32Array(FFT_SIZE / 2)} active={false} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('ne plante pas quand active=true', () => {
    expect(() => render(<Spectrogram spectrum={new Float32Array(FFT_SIZE / 2)} active />)).not.toThrow();
  });
});
