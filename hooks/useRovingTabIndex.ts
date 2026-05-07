'use client';

import { type KeyboardEvent, useCallback } from 'react';

/**
 * Helper minimaliste pour pattern radiogroup roving tabindex.
 * Renvoie un handler clavier qui déplace le focus + sélectionne via flèches.
 */
export function useRovingTabIndex<T>(values: readonly T[], current: T, onSelect: (value: T) => void) {
  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const idx = values.indexOf(current);
      if (idx < 0) {
        return;
      }
      let nextIdx: number | null = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % values.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + values.length) % values.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = values.length - 1;
      }
      if (nextIdx === null) {
        return;
      }
      e.preventDefault();
      const next = values[nextIdx] as T;
      onSelect(next);
      // Le bouton suivant deviendra tabIndex=0 ; on tente d'y déplacer le focus.
      const container = e.currentTarget.parentElement;
      if (container) {
        const buttons = container.querySelectorAll<HTMLElement>('[role="radio"]');
        buttons[nextIdx]?.focus();
      }
    },
    [values, current, onSelect],
  );
}
