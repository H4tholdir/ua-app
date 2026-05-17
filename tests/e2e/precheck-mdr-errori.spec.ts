// tests/e2e/precheck-mdr-errori.spec.ts
import { test, expect } from '@playwright/test'

const HAS_CREDS = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD && process.env.TEST_CLIENTE_ID)

test.describe('Precheck MDR — Scenari di Errore', () => {
  test.skip(!HAS_CREDS, 'Richiede credenziali in .env.test')

  async function creaLavoroIncompleto(
    request: import('@playwright/test').APIRequestContext,
    overrides: Record<string, unknown> = {}
  ): Promise<string> {
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)
    const res = await request.post('/api/lavori', {
      data: {
        tipo_dispositivo: 'protesi_fissa',
        descrizione: 'E2E Precheck Error Test — DA ELIMINARE',
        data_consegna_prevista: domani.toISOString().split('T')[0],
        priorita: 'normale',
        cliente_id: process.env.TEST_CLIENTE_ID!,
        richiedente_nome: 'Dott. Test Precheck',
        classe_rischio: 'classe_iia',
        da_conformare: true,
        ...overrides,
      },
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    })
    if (res.status() !== 201) return ''
    const body = await res.json()
    return body.lavoro.id
  }

  test('API /consegna risponde 422 con tipo precheck_fallito per paziente mancante', async ({ request }) => {
    const lavoroId = await creaLavoroIncompleto(request, { paziente_nome_snapshot: null })
    if (!lavoroId) return

    const res = await request.post(`/api/lavori/${lavoroId}/consegna`, {
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      data: {},
    })

    expect(res.status()).toBe(422)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.tipo).toBe('precheck_fallito')
    expect(body.errori_precheck).toBeInstanceOf(Array)
    expect(body.errori_precheck.length).toBeGreaterThan(0)
    const errore = body.errori_precheck[0]
    expect(errore).toHaveProperty('elemento')
    expect(errore).toHaveProperty('descrizione')
  })

  test('doppio tap consegna non genera errore 500 (idempotency lock)', async ({ request }) => {
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)
    const createRes = await request.post('/api/lavori', {
      data: {
        tipo_dispositivo: 'protesi_fissa',
        descrizione: 'E2E Idempotency Test — DA ELIMINARE',
        data_consegna_prevista: domani.toISOString().split('T')[0],
        priorita: 'normale',
        cliente_id: process.env.TEST_CLIENTE_ID!,
        richiedente_nome: 'Dott. Test Idempotency',
        paziente_nome_snapshot: 'TEST-IDEM-PAZ',
        classe_rischio: 'classe_iia',
        da_conformare: true,
      },
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    })
    if (createRes.status() !== 201) return

    const { lavoro } = await createRes.json()
    const [res1, res2] = await Promise.all([
      request.post(`/api/lavori/${lavoro.id}/consegna`, {
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        data: {},
      }),
      request.post(`/api/lavori/${lavoro.id}/consegna`, {
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        data: {},
      }),
    ])

    const statuses = [res1.status(), res2.status()]
    expect(statuses).not.toContain(500)
  })
})
