// Screenshot QA del catalogo DS v3 (§14.2) — 3 viewport × 2 temi = 6 PNG.
// Uso: npm run dev (o PORT=3010 npm run dev) in un terminale, poi:
//   node scripts/screenshot-catalogo.mjs
// Rispetta PORT dall'ambiente (default 3000) per non collidere con un dev
// server già in ascolto sulla porta standard.

import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = resolve(root, 'docs/design/catalogo-v3')
mkdirSync(outDir, { recursive: true })

const PORT = process.env.PORT ?? '3000'
const URL = `http://localhost:${PORT}/ds-v3-catalogo`

const VIEWPORT = [
  { width: 390, height: 844, label: '390' },
  { width: 768, height: 1024, label: '768' },
  { width: 1280, height: 800, label: '1280' },
]

const TEMI = [
  { nome: 'light', imposta: false },
  { nome: 'dark', imposta: true },
]

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  for (const viewport of VIEWPORT) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    for (const tema of TEMI) {
      // Navigazione fresca per ogni combinazione: evita che il tema o lo
      // stato demo (fasi spuntate, sheet aperti) trapeli da uno scatto al
      // successivo — ogni screenshot parte dallo stato iniziale della pagina.
      await page.goto(URL, { waitUntil: 'networkidle' })

      await page.evaluate((scuro) => {
        if (scuro) {
          document.documentElement.setAttribute('data-theme', 'dark')
        } else {
          document.documentElement.setAttribute('data-theme', 'light')
        }
      }, tema.imposta)

      // Attendi i font (DM Sans) e un giro di rendering dopo il cambio tema
      // prima di scattare, altrimenti il primo frame può catturare FOUT.
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(150)

      // Rimuovi l'indicatore dev di Next.js (<nextjs-portal>, badge "N issues"
      // in basso a sinistra): è chrome del tool di sviluppo, non del prodotto —
      // in una fullPage screenshot finisce dentro l'immagine (appare vicino al
      // fold iniziale) e sporca il materiale di approvazione. Va rimosso ad
      // ogni navigazione perché Next.js lo rimonta a ogni load.
      await page.evaluate(() => {
        document.querySelectorAll('nextjs-portal').forEach((el) => el.remove())
      })

      const filename = `catalogo-${viewport.label}-${tema.nome}.png`
      const filepath = resolve(outDir, filename)
      await page.screenshot({ path: filepath, fullPage: true })
      console.log(`✓ ${filename}`)
    }
  }

  await browser.close()
  console.log(`\nScreenshot salvati in ${outDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
