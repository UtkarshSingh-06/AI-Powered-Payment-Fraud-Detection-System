import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'node20'
  },
  test: {
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    environment: 'node',
    pool: 'forks',
    globals: true,
    testTimeout: 30_000,
    deps: {
      inline: ['@fraudshield/contracts', 'kafkajs']
    }
  }
});
