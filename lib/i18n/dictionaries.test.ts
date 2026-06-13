import { describe, expect, it } from 'vitest';

import { DICTIONARIES, LOCALES } from './dictionaries';

describe('dictionaries', () => {
  it('définit fr et en', () => {
    expect(LOCALES).toEqual(['fr', 'en']);
    expect(DICTIONARIES.fr).toBeDefined();
    expect(DICTIONARIES.en).toBeDefined();
  });

  it('a exactement les mêmes clés en fr et en (parité)', () => {
    const frKeys = Object.keys(DICTIONARIES.fr).sort();
    const enKeys = Object.keys(DICTIONARIES.en).sort();
    expect(enKeys).toEqual(frKeys);
  });

  it('n’a aucune valeur vide', () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(DICTIONARIES[locale])) {
        expect(value, `${locale}.${key} ne doit pas être vide`).toBeTruthy();
      }
    }
  });
});
