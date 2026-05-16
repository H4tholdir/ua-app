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

test.describe('Dashboard — redirect non autenticato', () => {
  test('GET /dashboard senza login → redirige a /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/)
  })
})

// ─── Suite 1: Vista Titolare ─────────────────────────────────────────────────
//
// Selettori unici per titolare:
//   [aria-label="KPI operativi"]  → strip con 7 KPI (role="list")
//
// Assenza attesa:
//   "Accettazione"   → header esclusivo front_desk
//   "I miei lavori oggi"  → label sezione esclusiva tecnico

test.describe('Dashboard — Vista Titolare', () => {
  test.skip(!HAS_TITOLARE_CREDS, 'Richiede E2E_TITOLARE_EMAIL e E2E_TITOLARE_PASSWORD')

  test('la KPI strip operativa è visibile', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_TITOLARE_EMAIL!,
      process.env.E2E_TITOLARE_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('[aria-label="KPI operativi"]')).toBeVisible()
  })

  test('le schede KPI "In ritardo" e "Oggi" sono presenti nella strip', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_TITOLARE_EMAIL!,
      process.env.E2E_TITOLARE_PASSWORD!
    )
    await page.goto('/dashboard')
    const strip = page.locator('[aria-label="KPI operativi"]')
    await expect(strip).toBeVisible()
    await expect(strip.locator('text=In ritardo')).toBeVisible()
    await expect(strip.locator('text=Oggi')).toBeVisible()
  })

  test('non mostra l\'header "Accettazione" del front_desk', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_TITOLARE_EMAIL!,
      process.env.E2E_TITOLARE_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('text=Accettazione')).not.toBeVisible()
  })

  test('non mostra la sezione "I miei lavori oggi" del tecnico', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_TITOLARE_EMAIL!,
      process.env.E2E_TITOLARE_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('text=I miei lavori oggi')).not.toBeVisible()
  })
})

// ─── Suite 2: Vista Tecnico ──────────────────────────────────────────────────
//
// Selettori unici per tecnico:
//   "I miei lavori oggi"  → label sezione (h2 uppercase)
//   "I tuoi lavori"       → sottotitolo header
//
// Assenza attesa:
//   [aria-label="KPI operativi"]  → strip a 7 KPI titolare
//   "Accettazione"                → header front_desk

test.describe('Dashboard — Vista Tecnico', () => {
  test.skip(!HAS_TECNICO_CREDS, 'Richiede E2E_TECNICO_EMAIL e E2E_TECNICO_PASSWORD')

  test('mostra la sezione "I miei lavori oggi"', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_TECNICO_EMAIL!,
      process.env.E2E_TECNICO_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('text=I miei lavori oggi')).toBeVisible()
  })

  test('mostra il sottotitolo "I tuoi lavori" nell\'header', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_TECNICO_EMAIL!,
      process.env.E2E_TECNICO_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('text=I tuoi lavori')).toBeVisible()
  })

  test('non mostra la KPI strip operativa del titolare', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_TECNICO_EMAIL!,
      process.env.E2E_TECNICO_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('[aria-label="KPI operativi"]')).not.toBeVisible()
  })

  test('non mostra l\'header "Accettazione" del front_desk', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_TECNICO_EMAIL!,
      process.env.E2E_TECNICO_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('text=Accettazione')).not.toBeVisible()
  })
})

// ─── Suite 3: Vista Front Desk ───────────────────────────────────────────────
//
// Selettori unici per front_desk:
//   "Accettazione"                   → header section label
//   [aria-label="Cerca paziente o numero lavoro"]  → search input
//
// Assenza attesa:
//   [aria-label="KPI operativi"]  → strip a 7 KPI titolare
//   "I miei lavori oggi"          → sezione tecnico

test.describe('Dashboard — Vista Front Desk', () => {
  test.skip(!HAS_FRONTDESK_CREDS, 'Richiede E2E_FRONTDESK_EMAIL e E2E_FRONTDESK_PASSWORD')

  test('mostra l\'header "Accettazione"', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_FRONTDESK_EMAIL!,
      process.env.E2E_FRONTDESK_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('text=Accettazione')).toBeVisible()
  })

  test('mostra la search bar "Cerca paziente o n° lavoro"', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_FRONTDESK_EMAIL!,
      process.env.E2E_FRONTDESK_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(
      page.locator('[aria-label="Cerca paziente o numero lavoro"]')
    ).toBeVisible()
  })

  test('mostra la sezione "Da consegnare oggi"', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_FRONTDESK_EMAIL!,
      process.env.E2E_FRONTDESK_PASSWORD!
    )
    await page.goto('/dashboard')
    // La label appare come "Da consegnare oggi (N)"
    await expect(page.locator('text=/Da consegnare oggi/')).toBeVisible()
  })

  test('non mostra la KPI strip operativa del titolare', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_FRONTDESK_EMAIL!,
      process.env.E2E_FRONTDESK_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('[aria-label="KPI operativi"]')).not.toBeVisible()
  })

  test('non mostra la sezione "I miei lavori oggi" del tecnico', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_FRONTDESK_EMAIL!,
      process.env.E2E_FRONTDESK_PASSWORD!
    )
    await page.goto('/dashboard')
    await expect(page.locator('text=I miei lavori oggi')).not.toBeVisible()
  })
})
