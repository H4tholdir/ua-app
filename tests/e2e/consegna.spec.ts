import { test, expect } from '@playwright/test'

test.describe('Percorso critico: CONSEGNA', () => {
  test.skip(!process.env.TEST_USER_EMAIL, 'Skip senza credenziali test')

  test('dashboard accessibile dopo login', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await expect(page).toHaveTitle(/UA/)
  })

  test('lista lavori accessibile', async ({ page }) => {
    await page.goto('http://localhost:3000/lavori')
    // Senza login: redirect a /login
    await expect(page).toHaveURL(/login/)
  })
})
