import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // Increase timeout for async tests that simulate proof generation
    testTimeout: 15_000,
    hookTimeout: 10_000,
  },
});
