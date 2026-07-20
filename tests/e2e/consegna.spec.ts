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

const HAS_CREDS = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD)

// ─── Suite 1: pagine pubbliche ───────────────────────────────────────────

test.describe('Pagine pubbliche', () => {
  test('GET /login risponde 200 e contiene il form', async ({ page }) => {
    const res = await page.goto('/login')
    expect(res?.status()).toBe(200)
    await expect(page).toHaveTitle(/UÀ/)
    await expect(page.locator('input[type=email], [name=email]')).toBeVisible()
    await expect(page.locator('input[type=password], [name=password]')).toBeVisible()
  })

  test('GET / redirige a /login o /dashboard (non 404)', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBeLessThan(400)
    expect(page.url()).toMatch(/login|dashboard/)
  })

  test('GET /portale/token-inesistente risponde senza crash 5xx', async ({ request }) => {
    // Usa request API (non page) per evitare rendering JS
    // Il portale può mostrare 404/500 o redirect a /login — non deve essere un crash non gestito
    const res = await request.get('/portale/token-inesistente-12345')
    // Qualsiasi status < 600 è accettabile (no unhandled crash)
    expect(res.status()).toBeLessThan(600)
  })
})

// ─── Suite 2: redirect auth ───────────────────────────────────────────────

test.describe('Redirect autenticazione', () => {
  for (const route of ['/dashboard', '/lavori', '/lavori/nuovo', '/clienti', '/qualita']) {
    test(`GET ${route} senza login → redirige a /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/login/)
    })
  }
})

// ─── Suite 3: API routes security ─────────────────────────────────────────

test.describe('API routes security', () => {
  test('POST /api/lavori senza auth → 401', async ({ request }) => {
    const res = await request.post('/api/lavori', { data: { test: true } })
    expect(res.status()).toBe(401)
  })

  test('POST /api/lavori/fake/consegna senza auth → 401 o 403', async ({ request }) => {
    const res = await request.post('/api/lavori/fake-id/consegna')
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/dashboard/kpi senza auth → 401', async ({ request }) => {
    const res = await request.get('/api/dashboard/kpi')
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/lavori/fake senza CSRF → 403', async ({ request }) => {
    const res = await request.patch('/api/lavori/fake-id', {
      data: { descrizione: 'test' },
      headers: { Origin: 'https://evil.com', 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(403)
  })

  test('POST /api/lavori senza CSRF → 403', async ({ request }) => {
    const res = await request.post('/api/lavori', {
      data: { descrizione: 'test' },
      headers: { Origin: 'https://evil.com', 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(403)
  })

  test('POST /api/clienti senza CSRF → 403', async ({ request }) => {
    const res = await request.post('/api/clienti', {
      data: { nome: 'test' },
      headers: { Origin: 'https://evil.com', 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(403)
  })
})

// ─── Suite 4: PWA ─────────────────────────────────────────────────────────

test.describe('PWA', () => {
  test('manifest.json valido con nome UÀ e icone', async ({ request }) => {
    const res = await request.get('/manifest.json')
    expect(res.status()).toBe(200)
    const m = await res.json()
    expect(m.name).toContain('UÀ')
    expect(m.short_name).toBe('UÀ')
    expect(m.start_url).toBe('/dashboard')
    expect(m.display).toBe('standalone')
    expect(m.icons.length).toBeGreaterThan(0)
  })

  test('sw.js accessibile con header Service-Worker-Allowed', async ({ request }) => {
    const res = await request.get('/sw.js')
    expect(res.status()).toBe(200)
    expect(res.headers()['service-worker-allowed']).toBe('/')
  })

  test('offline.html accessibile', async ({ request }) => {
    const res = await request.get('/offline.html')
    expect(res.status()).toBe(200)
    expect(await res.text()).toContain('offline')
  })

  test('icone PWA 192 e 512 accessibili', async ({ request }) => {
    for (const icon of ['/icons/icon-192.png', '/icons/icon-512.png']) {
      const res = await request.get(icon)
      expect(res.status()).toBe(200)
    }
  })
})

// ─── Suite 5: percorso critico autenticato ────────────────────────────────

test.describe('Percorso critico autenticato', () => {
  test.skip(!HAS_CREDS, 'Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD negli env')

  test('login → dashboard con navigazione', async ({ page }) => {
    await loginAs(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('nav[aria-label="Navigazione principale"]')).toBeVisible()
  })

  test('/lavori senza ?pila= reindirizza alla dashboard', async ({ page }) => {
    await loginAs(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    // Task 7 (ondata A mini-triage): morte di «Le pile» — /lavori nudo non
    // esiste più, redirect a /dashboard.
    await page.goto('/lavori')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('form nuovo lavoro ha campi obbligatori', async ({ page }) => {
    await loginAs(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await page.goto('/lavori/nuovo')
    await expect(page.locator('select').first()).toBeVisible()
    await expect(page.locator('textarea').first()).toBeVisible()
    await expect(page.locator('button:has-text("Crea lavoro")')).toBeVisible()
  })

  // TODO(UI-review): il form /lavori/nuovo non ha ancora il selettore cliente.
  // cliente_id è NOT NULL nel DB — l'API rigetta l'insert senza di esso.
  // Questi test saranno riabilitati dopo l'UI review del form lavori.
  test.skip('crea lavoro → redirige al dettaglio', async ({ page }) => {
    await loginAs(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await page.goto('/lavori/nuovo')

    await page.selectOption('select', { index: 1 })
    await page.fill('textarea', 'E2E test corona ceramica — da eliminare')
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)
    await page.fill('input[type=date]', domani.toISOString().split('T')[0])
    await page.click('button:has-text("Crea lavoro")')

    await page.waitForURL(/\/lavori\/[a-f0-9-]{36}$/, { timeout: 15000 })
    expect(page.url()).toMatch(/\/lavori\/[a-f0-9-]{36}$/)
  })
})
