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
    // usa `vitest run` senza argomenti — che le raccoglie da questi due
    // `projects` — e da quella data il passo «Unit tests» riceve
    // SUPABASE_DB_URL, quindi skipIntegrationTests è false e nessun file si
    // salta più (tests/integration/helpers/pg-client.ts:9). Restano saltate
    // solo in locale, per chi non ha quella variabile in .env.local.
    //
    // ⏱️ `testTimeout` scoped al SOLO progetto integration (default 5000ms
    // altrimenti): questo gruppo parla col banco Supabase REMOTO, e il tempo
    // che sfora è del VIAGGIO di rete, non della logica dei test. Morto per
    // timeout, tutte e tre le volte appena sopra i 5000ms del default: p7 in
    // avvisi-dentista-schema.rpc.test.ts il 09/08 (5007ms) e il 10/08 run
    // 31378884717 (5006ms) — già corretta per-prova a 15000ms nel commit
    // 2123ab99 — e «"viva" NON è un elenco di stati…» in
    // torna-a-pronto.rpc.test.ts l'11/08 run 31467143453 (5007ms). Un margine
    // per-prova alla volta acchiappa talpe: 15000ms qui copre l'intero
    // gruppo, senza toccare il margine delle prove UNITARIE (restano al
    // default di `extends: true`).
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [
            'tests/unit/**/*.test.ts',
            'tests/unit/**/*.test.tsx',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          testTimeout: 15000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
