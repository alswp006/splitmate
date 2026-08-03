import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': '/tmp/ai-factory-work/splitmate-vstm/src',
    },
  },
});
