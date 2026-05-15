import { test, expect } from '@playwright/test'

test.describe('Crea Lavoro', () => {
  test.skip('form invia cliente_id e crea lavoro', async ({ page }) => {
    // Test skipped: richiede seed E2E (npx npm run seed:e2e) prima dell'esecuzione
    // e browser configurato con credenziali test
    await page.goto('/login')
    await page.fill('[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('[type="submit"]')
    await page.waitForURL('/dashboard')

    await page.goto('/lavori/nuovo')
    const clienteCombo = page.getByRole('combobox', { name: /dentista|cliente/i })
    await expect(clienteCombo).toBeVisible()
    await clienteCombo.fill('Bianchi')
    await page.getByRole('option').first().click()

    await page.selectOption('[name="tipo_dispositivo"]', 'protesi_fissa')
    await page.fill('[name="descrizione"]', 'Test E2E Corona')
    await page.fill('[name="data_consegna_prevista"]', '2026-06-01')
    await page.click('[type="submit"]')

    await expect(page).not.toHaveURL('/lavori/nuovo')
  })
})
