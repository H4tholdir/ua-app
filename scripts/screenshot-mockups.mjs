// Screenshot dei mockup Ondata 0 (DS v3 «Il cuore») — 3 viewport × 2 temi.
// Uso: node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/home.html [--short] [--no-scroll]
//   --short     aggiunge il viewport 390×667 (variante device corti — solo home)
//   --no-scroll fallisce se il documento scrolla verticalmente (vincolo home §3.3 spec)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const fileArg = process.argv[2]
if (!fileArg) { console.error('Manca il path del mockup .html'); process.exit(1) }
const short = process.argv.includes('--short')
const noScroll = process.argv.includes('--no-scroll')
const filePath = resolve(root, fileArg)
const nome = basename(filePath, '.html')
const outDir = resolve(dirname(filePath), 'screenshots')
mkdirSync(outDir, { recursive: true })

const VIEWPORT = [
  { width: 390, height: 844, label: '390' },
  ...(short ? [{ width: 390, height: 667, label: '390corto' }] : []),
  { width: 768, height: 1024, label: '768' },
  { width: 1280, height: 800, label: '1280' },
]
const TEMI = ['light', 'dark']

async function main() {
  const browser = await chromium.launch()
  const page = await (await browser.newContext()).newPage()
  for (const vp of VIEWPORT) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    for (const tema of TEMI) {
      await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' })
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), tema)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(150)
      await page.evaluate(() => {
        document.querySelectorAll('[data-mockup-chrome]').forEach((el) => el.remove())
      })
      if (noScroll && vp.width === 390) {
        const { scrollH, innerH } = await page.evaluate(() => ({
          scrollH: document.scrollingElement.scrollHeight, innerH: window.innerHeight,
        }))
        if (scrollH > innerH) {
          console.error(`✗ ${nome} ${vp.label} ${tema}: la home scrolla (${scrollH}px > ${innerH}px) — vietato (§3.3)`)
          process.exit(1)
        }
      }
      const filepath = resolve(outDir, `${nome}-${vp.label}-${tema}.png`)
      await page.screenshot({ path: filepath, fullPage: !noScroll })
      console.log(`✓ ${nome}-${vp.label}-${tema}.png`)
    }
  }
  await browser.close()
}
main().catch((err) => { console.error(err); process.exit(1) })
