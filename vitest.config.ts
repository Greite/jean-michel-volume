import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['lib/**', 'hooks/**', 'components/**', 'app/**'],
      exclude: ['**/*.d.ts', '**/*.test.{ts,tsx}', 'test/**', 'app/layout.tsx', 'lib/i18n/dictionaries.ts'],
    },
  },
});
