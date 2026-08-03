import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
  // ⚠️ P15 (02/08/2026) — UN PROGETTO CHE NON TROVA NESSUN FILE NON È UN ERRORE PER
  // PLAYWRIGHT: lo esegue vuoto e ne esce VERDE. Fino a oggi TRE dei cinque progetti
  // qui sotto puntavano, via `testMatch`, a quattro file mai scritti —
  // `consegna-completa.spec.ts`, `precheck-mdr-errori.spec.ts`,
  // `rls-cross-tenant.spec.ts`, `api-coverage.spec.ts`. `provato:`
  // `npx playwright test --list` → uscita 0, «Total: 30 tests in 5 files», e quei tre
  // progetti non comparivano nemmeno nell'elenco. Una rete che non protegge è peggio
  // di nessuna rete: chi la vede smette di cercare.
  // 🔑 Non è la prima volta: i «due progetti Playwright fantasma» del 28/07/2026 erano
  //    lo stesso difetto. Per questo la riparazione porta con sé una guardia.
  // 🛡️ Rete: `scripts/guardia-progetti-playwright.mjs` (pre-commit, condizionata a
  //    questo file o a `tests/e2e/`) — si accende su un progetto vuoto E su una prova
  //    orfana, cioè su entrambe le facce del silenzio.
  // 📌 I quattro controlli rimasti scoperti hanno ora una voce propria in roadmap
  //    (P15-a…P15-d): l'intenzione vive dove qualcuno legge, non in un config che
  //    nessuno esegue.
  projects: [
    {
      // Fa il login vero e salva la sessione in `tests/e2e/.auth/user.json`.
      // ⚠️ Fatto misurato il 02/08/2026: OGGI NESSUNO CONSUMA quella sessione.
      // `storageState` compariva una volta sola in tutto il repo — nel progetto
      // `authenticated`, che non eseguiva nulla. Le prove autenticate che esistono
      // davvero (`consegna.spec.ts`, «Percorso critico autenticato») fanno il login
      // per conto loro con `loginAs`. Questo progetto resta perché è l'impalcatura su
      // cui poggeranno le prove autenticate mancanti (P15-a, P15-b); senza credenziali
      // negli env scrive una sessione vuota e passa, quindi non rompe niente.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'public',
      testMatch: /consegna\.spec\.ts|lavori\.spec\.ts|prove\.spec\.ts|dashboard\.spec\.ts/,
    },
  ],
})
