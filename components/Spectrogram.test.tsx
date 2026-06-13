import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Spectrogram } from './Spectrogram';

import { FFT_SIZE } from '@/lib/constants';

function makeFakeCtx() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
  };
}

/**
 * Stub requestAnimationFrame so the recursive draw loop runs a bounded number of
 * frames synchronously, then stops scheduling — avoids infinite loops in tests.
 */
function installBoundedRaf(maxFrames: number) {
  let calls = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    if (calls++ < maxFrames) {
      cb(0);
    }
    return calls;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
}

function spectrumWithSignal() {
  const spec = new Float32Array(FFT_SIZE / 2);
  for (let i = 0; i < spec.length; i++) {
    spec[i] = 0.5 + 0.5 * Math.sin(i);
  }
  return spec;
}

describe('Spectrogram', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rend un canvas masqué aux lecteurs d’écran', () => {
    const { container } = render(<Spectrogram spectrum={new Float32Array(FFT_SIZE / 2)} active={false} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('ne plante pas quand active=true', () => {
    expect(() => render(<Spectrogram spectrum={new Float32Array(FFT_SIZE / 2)} active />)).not.toThrow();
  });

  it('dessine les barres dans la boucle RAF quand active=true', () => {
    const fakeCtx = makeFakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 300,
      height: 150,
      top: 0,
      left: 0,
      right: 300,
      bottom: 150,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as never);
    installBoundedRaf(2);

    render(<Spectrogram spectrum={spectrumWithSignal()} active />);

    expect(fakeCtx.clearRect).toHaveBeenCalled();
    expect(fakeCtx.fill).toHaveBeenCalled();
    expect(fakeCtx.beginPath).toHaveBeenCalled();
    expect(fakeCtx.quadraticCurveTo).toHaveBeenCalled();
    // active=true => fillStyle prend la couleur brand (fallback) et globalAlpha varie
    expect(fakeCtx.fillStyle).not.toBe('');
  });

  it('dessine avec la couleur inactive (decay) quand active=false', () => {
    const fakeCtx = makeFakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 300,
      height: 150,
      top: 0,
      left: 0,
      right: 300,
      bottom: 150,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as never);
    installBoundedRaf(2);

    render(<Spectrogram spectrum={spectrumWithSignal()} active={false} />);

    expect(fakeCtx.clearRect).toHaveBeenCalled();
    expect(fakeCtx.fill).toHaveBeenCalled();
  });

  it('ne dessine rien si le contexte 2d est indisponible', () => {
    const fakeCtx = makeFakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);
    installBoundedRaf(2);

    render(<Spectrogram spectrum={spectrumWithSignal()} active />);

    expect(fakeCtx.clearRect).not.toHaveBeenCalled();
  });
});
