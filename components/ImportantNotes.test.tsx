import { describe, expect, it } from 'vitest';

import { ImportantNotes } from './ImportantNotes';

import { renderWithProviders, screen } from '@/test/test-utils';

describe('ImportantNotes', () => {
  it('rend une aside avec 4 notes', () => {
    renderWithProviders(<ImportantNotes />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});
