import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    // ~40 arquivos em workers paralelos contra o mesmo Postgres: com 5s padrão, testes de carga (300 inserts,
    // import dinâmico do app) estouravam por lentidão e não por defeito.
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
