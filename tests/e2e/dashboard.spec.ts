import { test, expect, type Page } from '@playwright/test'

// ─── helpers ────────────────────────────────────────────────────────────────

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.waitForSelector('[name=email], input[type=email]', { timeout: 10000 })
  await page.fill('[name=email], input[type=email]', email)
  await page.fill('[name=password], input[type=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}

// ─── Credential guards ───────────────────────────────────────────────────────
//
// Requires three sets of env vars — one per role.
// Set these in .env.test (or CI secrets) before running:
//   E2E_TITOLARE_EMAIL / E2E_TITOLARE_PASSWORD
//   E2E_TECNICO_EMAIL  / E2E_TECNICO_PASSWORD
//   E2E_FRONTDESK_EMAIL / E2E_FRONTDESK_PASSWORD
//
// Also ensure `npx tsx scripts/seed-e2e.ts` has been run to populate
// the test laboratorio (E2E_LAB_ID = 00000000-0000-0000-0000-000000000001).

const HAS_TITOLARE_CREDS = !!(
  process.env.E2E_TITOLARE_EMAIL && process.env.E2E_TITOLARE_PASSWORD
)
const HAS_TECNICO_CREDS = !!(
  process.env.E2E_TECNICO_EMAIL && process.env.E2E_TECNICO_PASSWORD
)
const HAS_FRONTDESK_CREDS = !!(
  process.env.E2E_FRONTDESK_EMAIL && process.env.E2E_FRONTDESK_PASSWORD
)

// ─── Suite 0: redirect senza autenticazione ──────────────────────────────────
// Invariato: /dashboard resta la route (ora renderizza Home v3), il redirect
// non autenticato è lo stesso comportamento pre/post Task 11.

test.describe('Dashboard — redirect non autenticato', () => {
  test('GET /dashboard senza login → redirige a /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/)
  })
})

// ─── Home v3 (Task 11, adattato da Ondata 1) ─────────────────────────────────
//
// Le vecchie suite «Vista Titolare/Tecnico/Front Desk» asserivano markup delle
// 4 dashboard per-ruolo (`DashboardTitolare`/`DashboardTecnico`/
// `DashboardFrontDesk`, cancellate in questo task perché prive di consumatori
// dopo la migrazione a Home v3 — vedi task-11-report.md). Dalla spec §7.1
// rev. 3.1 (decisione A1) esiste UNA sola composizione (`HomeV3`) per tutti i
// ruoli: cambia solo il perimetro dati caricato server-side
// (`getPerimetroHome`), MAI la UI. Selettori vecchi come
// `[aria-label="KPI operativi"]`, "Accettazione", "I miei lavori oggi" non
// esistono più in nessun ruolo — quindi non sono più un modo valido di
// distinguere i ruoli via e2e. Le 4 pile (rossa/ambra/viola/blu) sono SEMPRE
// montate per legge (L1/L5, vedi `src/components/ds/Pila.tsx`), quindi la
// verifica strutturale è la stessa per titolare/tecnico/front_desk; la
// differenza di ruolo verificata qui è quella osservabile senza dipendere
// dai dati seedati in quel preciso momento: la Striscia di stato del tecnico
// non riporta MAI segnali fiscali (P7, `src/lib/dashboard/striscia.ts`
// `GERARCHIE.tecnico` esclude s1/s7), le altre gerarchie possono.

const PILE_LABELS = ['DA CONSEGNARE OGGI', 'SUL BANCO', 'DA RIFARE / IN PROVA', 'APPENA ARRIVATI']

async function assertHomeV3Shell(page: Page) {
  await page.goto('/dashboard')
  for (const label of PILE_LABELS) {
    await expect(page.locator(`text=${label}`)).toBeVisible()
  }
  await expect(page.locator('[aria-label="Nuovo lavoro"]')).toBeVisible()
  await expect(page.locator('[role="status"]')).toBeVisible()
}

test.describe('Home v3 — Titolare', () => {
  test.skip(!HAS_TITOLARE_CREDS, 'Richiede E2E_TITOLARE_EMAIL e E2E_TITOLARE_PASSWORD')

  test('mostra le 4 pile di legge + TastoPiù + striscia di stato', async ({ page }) => {
    await loginAs(page, process.env.E2E_TITOLARE_EMAIL!, process.env.E2E_TITOLARE_PASSWORD!)
    await assertHomeV3Shell(page)
  })
})

test.describe('Home v3 — Tecnico', () => {
  test.skip(!HAS_TECNICO_CREDS, 'Richiede E2E_TECNICO_EMAIL e E2E_TECNICO_PASSWORD')

  test('mostra le 4 pile di legge + TastoPiù + striscia di stato', async ({ page }) => {
    await loginAs(page, process.env.E2E_TECNICO_EMAIL!, process.env.E2E_TECNICO_PASSWORD!)
    await assertHomeV3Shell(page)
  })

  test('la striscia di stato non riporta segnali fiscali (P7)', async ({ page }) => {
    await loginAs(page, process.env.E2E_TECNICO_EMAIL!, process.env.E2E_TECNICO_PASSWORD!)
    await page.goto('/dashboard')
    const striscia = page.locator('[role="status"]')
    await expect(striscia).toBeVisible()
    await expect(striscia.locator('text=/scartat|fattur/i')).toHaveCount(0)
  })
})

test.describe('Home v3 — Front Desk', () => {
  test.skip(!HAS_FRONTDESK_CREDS, 'Richiede E2E_FRONTDESK_EMAIL e E2E_FRONTDESK_PASSWORD')

  test('mostra le 4 pile di legge + TastoPiù + striscia di stato', async ({ page }) => {
    await loginAs(page, process.env.E2E_FRONTDESK_EMAIL!, process.env.E2E_FRONTDESK_PASSWORD!)
    await assertHomeV3Shell(page)
  })
})
