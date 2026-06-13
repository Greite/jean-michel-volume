import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-nonce': 'test-nonce' })),
}));

import { ThemeScript } from './ThemeScript';

describe('ThemeScript', () => {
  it('rend un <script> avec le nonce et le contenu inline', async () => {
    const element = await ThemeScript();
    expect(element.type).toBe('script');
    expect(element.props.nonce).toBe('test-nonce');
    expect(element.props.dangerouslySetInnerHTML.__html).toContain('jmv-theme');
  });
});
