import { test, expect } from '@playwright/test'

test.describe('Flow Prove', () => {
  test.skip('manda in prova e registra rientro', async ({ page }) => {
    // Skip: requires E2E seed + browser with auth
    await page.goto('/login')
    await page.fill('[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('[type="submit"]')
    await page.waitForURL('/dashboard')

    await page.goto('/lavori')
    await page.click('.lavoro-card >> nth=0')
    await page.click('[role="tab"][id="tab-prove"]')
    await expect(page.getByText('Nessuna prova registrata')).toBeVisible()

    await page.click('text=+ Manda in prova')
    const domani = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    await page.fill('[type="date"]', domani)
    await page.click('text=Conferma — manda in prova')

    await expect(page.getByText('Dal dentista')).toBeVisible()
    await expect(page.getByText('1ª prova')).toBeVisible()
  })
})
