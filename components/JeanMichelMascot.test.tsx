import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JeanMichelMascot } from './JeanMichelMascot';

describe('JeanMichelMascot', () => {
  it('rend une image SVG accessible', () => {
    render(<JeanMichelMascot />);
    expect(screen.getByRole('img', { name: 'Jean-Michel' })).toBeInTheDocument();
  });

  it('accepte la prop listening sans planter', () => {
    render(<JeanMichelMascot listening />);
    expect(screen.getByRole('img', { name: 'Jean-Michel' })).toBeInTheDocument();
  });
});
