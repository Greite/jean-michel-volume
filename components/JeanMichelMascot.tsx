'use client';

import { useEffect, useState } from 'react';

type Props = {
  listening?: boolean;
  className?: string;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

const BAR_HEIGHTS = [22, 40, 28, 52, 44, 62, 46, 54, 30, 38, 20];
const BAR_X_START = 40;
const BAR_GAP = 8;
const BAR_WIDTH = 4;
const WAVE_CENTER_Y = 116;

export function JeanMichelMascot({ listening, className = '' }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const animate = listening && !reducedMotion;
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label="Jean-Michel" className={`h-full w-full ${className}`}>
      <defs>
        <radialGradient id="jm-bg" cx="50%" cy="48%" r="62%">
          <stop offset="0%" stopColor="var(--mascot-halo)" />
          <stop offset="55%" stopColor="var(--mascot-halo)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--mascot-halo)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="jm-helmet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--helmet)" />
          <stop offset="100%" stopColor="var(--helmet-shade)" />
        </linearGradient>
        <linearGradient id="jm-wave" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <style>{`
        .jm-bar { transform-box: fill-box; transform-origin: center; transform: scaleY(0.45); }
        .jm-bar.is-live { animation: jm-pulse 0.95s cubic-bezier(.5,0,.3,1) infinite; }
        @keyframes jm-pulse {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      {/* Halo brand */}
      <circle cx="80" cy="80" r="78" fill="url(#jm-bg)" />

      {/* === CASQUE DE CHANTIER === */}

      {/* Visière (rebord) — derrière le dôme, dépasse de chaque côté */}
      <ellipse cx="80" cy="78" rx="52" ry="6.5" fill="url(#jm-helmet)" stroke="var(--helmet-line)" strokeWidth="2.5" />

      {/* Dôme principal */}
      <path
        d="M 42 78 Q 42 28 80 26 Q 118 28 118 78 Z"
        fill="url(#jm-helmet)"
        stroke="var(--helmet-line)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Crête centrale (poignée) qui dépasse légèrement au sommet */}
      <path
        d="M 72 26 Q 72 20 80 19 Q 88 20 88 26 L 88 52 Q 80 54 72 52 Z"
        fill="url(#jm-helmet)"
        stroke="var(--helmet-line)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Rainures sur la crête */}
      <line
        x1="77"
        y1="24"
        x2="77"
        y2="50"
        stroke="var(--helmet-line)"
        strokeOpacity="0.45"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <line
        x1="80"
        y1="22"
        x2="80"
        y2="52"
        stroke="var(--helmet-line)"
        strokeOpacity="0.55"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <line
        x1="83"
        y1="24"
        x2="83"
        y2="50"
        stroke="var(--helmet-line)"
        strokeOpacity="0.45"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Liseré sous le dôme (souligne la jonction visière) */}
      <path d="M 44 76 Q 80 82 116 76" fill="none" stroke="var(--helmet-line)" strokeWidth="1.5" strokeOpacity="0.45" />

      {/* Écusson JM sur le devant */}
      <rect
        x="68"
        y="56"
        width="24"
        height="14"
        rx="2"
        fill="var(--helmet-line)"
        stroke="var(--helmet-line)"
        strokeWidth="1.5"
      />
      <text
        x="80"
        y="66.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fontFamily="var(--font-mono, monospace)"
        fill="var(--helmet)"
        letterSpacing="0.5"
      >
        JM
      </text>

      {/* === ONDE SONORE === */}
      <g>
        {BAR_HEIGHTS.map((h, i) => {
          const x = BAR_X_START + i * BAR_GAP;
          return (
            <rect
              key={x}
              x={x - BAR_WIDTH / 2}
              y={WAVE_CENTER_Y - h / 2}
              width={BAR_WIDTH}
              height={h}
              rx={BAR_WIDTH / 2}
              fill="url(#jm-wave)"
              className={`jm-bar ${animate ? 'is-live' : ''}`}
              style={animate ? { animationDelay: `${i * 0.07}s` } : undefined}
            />
          );
        })}
      </g>
    </svg>
  );
}
