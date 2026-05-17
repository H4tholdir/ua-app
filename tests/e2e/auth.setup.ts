// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('autentica utente test', async ({ page }) => {
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    console.warn('[auth.setup] credenziali non configurate — salvo auth vuota')
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  await page.goto('/login')
  await page.waitForSelector('input[type=email], [name=email]', { timeout: 15000 })
  await page.fill('input[type=email], [name=email]', process.env.TEST_USER_EMAIL)
  await page.fill('input[type=password], [name=password]', process.env.TEST_USER_PASSWORD)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
  await expect(page).toHaveURL(/\/dashboard/)

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
