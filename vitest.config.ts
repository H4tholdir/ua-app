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
    // tests/integration/** non gira con `npm test`: `test`/`test:unit` sono
    // scope-limitati esplicitamente a tests/unit (vedi script in package.json,
    // allineati con D209 il 04/08/2026), mentre `test:integration` punta
    // esplicitamente a tests/integration.
    // ⚠️ In CI invece GIRANO, da D333 (09/08/2026): `.github/workflows/ci.yml`
    // usa `vitest run` senza argomenti — che le raccoglie da questo `include` —
    // e da quella data il passo «Unit tests» riceve SUPABASE_DB_URL, quindi
    // skipIntegrationTests è false e nessun file si salta più
    // (tests/integration/helpers/pg-client.ts:9). Restano saltate solo in
    // locale, per chi non ha quella variabile in .env.local.
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
