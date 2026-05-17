// tests/e2e/consegna-completa.spec.ts
import { test, expect } from '@playwright/test'

const HAS_CREDS =
  !!(process.env.TEST_USER_EMAIL &&
     process.env.TEST_USER_PASSWORD &&
     process.env.TEST_LAB_A_ID &&
     process.env.TEST_CLIENTE_ID)

test.describe('Consegna Completa — Happy Path', () => {
  test.skip(!HAS_CREDS, 'Richiede TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_LAB_A_ID, TEST_CLIENTE_ID in .env.test')

  const createdLavoroIds: string[] = []

  async function creaLavoro(request: import('@playwright/test').APIRequestContext) {
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)
    const res = await request.post('/api/lavori', {
      data: {
        tipo_dispositivo: 'protesi_fissa',
        descrizione: 'E2E Test — Corona ceramica 14 — DA ELIMINARE',
        data_consegna_prevista: domani.toISOString().split('T')[0],
        priorita: 'normale',
        cliente_id: process.env.TEST_CLIENTE_ID!,
        paziente_nome_snapshot: 'TEST-PAZ-E2E',
        classe_rischio: 'classe_iia',
        da_conformare: true,
        richiedente_nome: 'Dott. Test E2E',
      },
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    createdLavoroIds.push(body.lavoro.id)
    return { id: body.lavoro.id, numero_lavoro: body.lavoro.numero_lavoro }
  }

  test.afterAll(async ({ request }) => {
    for (const id of createdLavoroIds) {
      await request.patch(`/api/lavori/${id}`, {
        data: { deleted_at: new Date().toISOString() },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      }).catch(() => {})
    }
  })

  let lavoroId: string
  let lavoroNumero: string

  test('login → crea lavoro → consegna → verifica stato consegnato + DdC', async ({ page, request }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    const created = await creaLavoro(request)
    lavoroId = created.id
    lavoroNumero = created.numero_lavoro
    expect(lavoroId).toMatch(/^[0-9a-f-]{36}$/)

    await page.goto(`/lavori/${lavoroId}`)
    await expect(page).toHaveURL(`/lavori/${lavoroId}`, { timeout: 10000 })
    await expect(page.getByText(lavoroNumero)).toBeVisible({ timeout: 10000 })

    const consegnaBtn = page.getByRole('button', { name: /consegna/i })
    await expect(consegnaBtn).toBeVisible({ timeout: 10000 })
    await consegnaBtn.click()

    await expect(page.getByText(/consegnato|ddc|dichiarazione/i).first()).toBeVisible({ timeout: 30000 })

    const apiRes = await request.get(`/api/lavori/${lavoroId}`)
    expect(apiRes.status()).toBe(200)
    const apiBody = await apiRes.json()
    expect(apiBody.lavoro.stato).toBe('consegnato')
    expect(apiBody.lavoro.conformato).toBe(true)
  })

  test('verifica numero DdC visibile nel DOM (formato DDC-YYYY-NNNN)', async ({ page }) => {
    test.skip(!lavoroId, 'Dipende dal test precedente')
    await page.goto(`/lavori/${lavoroId}`)
    await expect(page.getByText(/DDC-\d{4}-\d{4}/).first()).toBeVisible({ timeout: 15000 })
  })
})
