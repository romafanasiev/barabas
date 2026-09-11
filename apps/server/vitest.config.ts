import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Резолвит path-алиасы из tsconfig.json нативно (раньше это делал
  // плагин vite-tsconfig-paths — он больше не нужен).
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
