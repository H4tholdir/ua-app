import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/lib/**',
        'src/hooks/**',
        'src/app/api/**',        // aggiunto Piano E
      ],
      exclude: [
        'src/lib/supabase/**',
        'src/app/api/stripe/**',
        'src/app/api/auth/**',
      ],
    },
    // tests/integration/** non gira mai di default: `test`/`test:unit` sono
    // scope-limitati esplicitamente a tests/unit (vedi script in package.json,
    // allineati con D209 il 04/08/2026), mentre `test:integration` punta
    // esplicitamente a tests/integration. La CI (`.github/workflows/ci.yml`)
    // usa `vitest run` senza argomenti: lì le integration vengono raccolte ma
    // si saltano da sole senza SUPABASE_DB_URL (skipIf).
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
