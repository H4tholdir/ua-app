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
    // tests/integration/** non gira mai di default: npm test/CI usano
    // `vitest run` senza argomenti, che con questo include prenderebbe anche
    // l'integration — per questo `test`/`test:unit` restano scope-limitati
    // esplicitamente a tests/unit (vedi script in package.json), mentre
    // `test:integration` punta esplicitamente a tests/integration.
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
