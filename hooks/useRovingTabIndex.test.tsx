import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { useRovingTabIndex } from './useRovingTabIndex';

const VALUES = ['a', 'b', 'c'] as const;

function Group() {
  const [current, setCurrent] = useState<(typeof VALUES)[number]>('a');
  const onKeyDown = useRovingTabIndex(VALUES, current, setCurrent);
  return (
    <div>
      <span data-testid="current">{current}</span>
      <div>
        {VALUES.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={current === v}
            tabIndex={current === v ? 0 : -1}
            onKeyDown={onKeyDown}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

describe('useRovingTabIndex', () => {
  it('ArrowRight sélectionne l’élément suivant et boucle', async () => {
    const user = userEvent.setup();
    render(<Group />);
    screen.getByRole('radio', { name: 'a' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('current')).toHaveTextContent('b');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByTestId('current')).toHaveTextContent('a');
  });

  it('ArrowLeft recule et boucle vers la fin', async () => {
    const user = userEvent.setup();
    render(<Group />);
    screen.getByRole('radio', { name: 'a' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByTestId('current')).toHaveTextContent('c');
  });

  it('Home va au premier, End au dernier', async () => {
    const user = userEvent.setup();
    render(<Group />);
    screen.getByRole('radio', { name: 'a' }).focus();
    await user.keyboard('{End}');
    expect(screen.getByTestId('current')).toHaveTextContent('c');
    await user.keyboard('{Home}');
    expect(screen.getByTestId('current')).toHaveTextContent('a');
  });

  it('ignore les autres touches', async () => {
    const user = userEvent.setup();
    render(<Group />);
    screen.getByRole('radio', { name: 'a' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('current')).toHaveTextContent('a');
  });
});
