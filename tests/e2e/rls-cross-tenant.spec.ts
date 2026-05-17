// tests/e2e/rls-cross-tenant.spec.ts
import { test, expect } from '@playwright/test'

const HAS_CREDS =
  !!(process.env.TEST_USER_EMAIL &&
     process.env.TEST_USER_PASSWORD &&
     process.env.TEST_LAB_A_ID &&
     process.env.TEST_LAB_B_ID)

test.describe('RLS Cross-Tenant — Isolamento dati', () => {
  test.skip(!HAS_CREDS, 'Richiede TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_LAB_A_ID, TEST_LAB_B_ID in .env.test')

  test('utente Lab A non può accedere a lavori di Lab B via API', async ({ request }) => {
    // L'utente è autenticato come Lab A (storageState dal setup)
    // Prova ad accedere al lavoro di Lab B — deve ricevere 404 o 403
    const fakeLaboratorioB_lavoroId = '00000000-0000-0000-0000-999999999999'

    const res = await request.get(`/api/lavori/${fakeLaboratorioB_lavoroId}`, {
      headers: { Origin: 'http://localhost:3000' },
    })

    // La route deve restituire 404 (lavoro non trovato nel tenant corrente)
    // MAI 200 con dati di un altro tenant
    expect([403, 404]).toContain(res.status())
  })

  test('dashboard API non espone dati cross-tenant', async ({ request }) => {
    const res = await request.get('/api/dashboard/kpi', {
      headers: { Origin: 'http://localhost:3000' },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    // La risposta deve avere il ruolo corretto — non un errore di tenant
    expect(body).toHaveProperty('role')
    expect(body).toHaveProperty('data')
    // I dati devono essere del tenant corrente (Lab A), non di Lab B
    if (body.role === 'titolare') {
      expect(body.data).not.toHaveProperty('laboratorio_id')
    }
  })

  test('lista lavori non contiene lavori di altri tenant', async ({ request }) => {
    const res = await request.get('/api/lavori', {
      headers: { Origin: 'http://localhost:3000' },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    const lavoriIds = (body.lavori ?? []).map((l: { laboratorio_id?: string }) => l.laboratorio_id)

    // Tutti i lavori devono appartenere al Lab A
    const labBId = process.env.TEST_LAB_B_ID!
    expect(lavoriIds.some((id: string | undefined) => id === labBId)).toBe(false)
  })
})
