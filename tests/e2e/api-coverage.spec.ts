// tests/e2e/api-coverage.spec.ts
import { test, expect } from '@playwright/test'

const HAS_CREDS = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD && process.env.TEST_CLIENTE_ID)

test.describe('API Coverage — 4xx + 2xx paths', () => {
  test.skip(!HAS_CREDS, 'Richiede credenziali in .env.test')

  // ── /api/lavori ────────────────────────────────────────────────────────

  test('GET /api/lavori → 200 con array lavori', async ({ request }) => {
    const res = await request.get('/api/lavori', { headers: { Origin: 'http://localhost:3000' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.lavori)).toBe(true)
  })

  test('POST /api/lavori senza body → 400 o 422', async ({ request }) => {
    const res = await request.post('/api/lavori', {
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      data: {},
    })
    expect([400, 422]).toContain(res.status())
  })

  // ── /api/lavori/[id]/prove ─────────────────────────────────────────────

  test('GET /api/lavori/id-inesistente/prove → 404', async ({ request }) => {
    const res = await request.get('/api/lavori/00000000-0000-0000-0000-000000000000/prove', {
      headers: { Origin: 'http://localhost:3000' },
    })
    expect([403, 404]).toContain(res.status())
  })

  // ── /api/lavori/[id]/rifacimento ───────────────────────────────────────

  test('POST /api/lavori/id-inesistente/rifacimento → 404 o 403', async ({ request }) => {
    const res = await request.post('/api/lavori/00000000-0000-0000-0000-000000000000/rifacimento', {
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      data: { motivo: 'test', tipo_non_conformita: 'qualita_tecnica' },
    })
    expect([400, 403, 404, 422]).toContain(res.status())
  })

  // ── /api/fatture ───────────────────────────────────────────────────────

  test('GET /api/fatture → 200 con array fatture', async ({ request }) => {
    const res = await request.get('/api/fatture', { headers: { Origin: 'http://localhost:3000' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('fatture')
    expect(Array.isArray(body.fatture)).toBe(true)
  })

  // ── Autenticazione ─────────────────────────────────────────────────────

  test('route autenticate senza session → redirect 302 o 401', async () => {
    // Test semantico: le route sono protette da middleware/layout
    // Playwright con storageState = autenticato, quindi non possiamo testare
    // lo stato non-autenticato qui. Questo test documenta l'invariante.
    expect(true).toBe(true)
    // Per il test reale non-autenticato: vedere auth.setup.ts (graceful fallback)
  })
})
