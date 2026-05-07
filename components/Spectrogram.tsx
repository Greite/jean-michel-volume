'use client';

import { useEffect, useRef } from 'react';

type Props = {
  spectrum: Float32Array;
  active: boolean;
  className?: string;
  /** Nombre de barres affichées — on agrège les bins FFT en buckets */
  bars?: number;
};

/**
 * Spectrogramme FFT minimaliste rendu en canvas.
 * S'adapte au thème via les CSS vars --brand et --surface-2.
 */
export function Spectrogram({ spectrum, active, className = '', bars = 48 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peaksRef = useRef<Float32Array>(new Float32Array(bars));
  const rafRef = useRef<number | null>(null);
  // Refs synchrones lues dans la boucle RAF — évite de relancer l'effect.
  const spectrumRef = useRef<Float32Array>(spectrum);
  const activeRef = useRef<boolean>(active);

  useEffect(() => {
    spectrumRef.current = spectrum;
  }, [spectrum]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Une seule boucle au mount — lit les refs à chaque frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const styles = getComputedStyle(canvas);
      const brand = styles.getPropertyValue('--brand').trim() || '#1ed760';
      const muted = styles.getPropertyValue('--surface-2').trim() || '#222';

      const spec = spectrumRef.current;
      const isActive = activeRef.current;
      const bin = Math.floor(spec.length / bars);
      const gap = Math.max(1, Math.floor(w / bars / 6));
      const barW = (w - gap * (bars - 1)) / bars;

      for (let i = 0; i < bars; i++) {
        let s = 0;
        for (let j = 0; j < bin; j++) {
          s += spec[i * bin + j] || 0;
        }
        const value = bin > 0 ? s / bin : 0;
        // accentue les hautes fréquences
        const boosted = Math.min(1, value * (1 + i / bars));
        const target = boosted ** 0.7;

        // Lissage du peak (decay)
        const peak = peaksRef.current[i] ?? 0;
        const next = isActive ? Math.max(target, peak * 0.92) : peak * 0.85;
        peaksRef.current[i] = next;

        const barH = next * h * 0.95;
        const x = i * (barW + gap);
        const y = h - barH;

        ctx.fillStyle = isActive ? brand : muted;
        ctx.globalAlpha = isActive ? 0.55 + 0.45 * next : 0.45;
        // Coins arrondis (compat large)
        const r = Math.min(barW / 2, 4 * dpr);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, h);
        ctx.lineTo(x, h);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [bars]);

  return (
    <div aria-hidden="true" className={`block h-full w-full ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
