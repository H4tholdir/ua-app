/**
 * P0-PERF — Audit capillare di performance in produzione (17/07/2026)
 * Login col lab E2E (MAI lab Filippo), visita ogni pagina N volte (PERF_RUNS,
 * default 5 — il giro 0 è warmup e viene scartato dai calcoli),
 * raccoglie Navigation Timing + chiamate Supabase + pesi risorse.
 * SOLA LETTURA: nessuna mutazione. Output JSON (locale, NON committare) in scripts/tmp/perf-results.json
 * Baseline storiche: docs/roadmap/P0-PERF-DIAGNOSI-2026-07-17.md §3 e §6.
 *
 * v2 (Task 13 — osservabilità):
 * - PERF_BASE: override dell'URL base (default prod https://uachelab.com)
 * - PERF_RUNS: numero di giri per pagina/API (default 5, giro 0 = warmup scartato)
 * - PERF_BYPASS: se presente, aggiunge l'header x-vercel-protection-bypass sia sul
 *   BrowserContext (extraHTTPHeaders) sia sulle singole richieste context.request
 * - PERF_ENFORCE=1: exit 1 se il p75 supera i budget (pagine/API/login)
 */
import { chromium, type Page, type BrowserContext } from 'playwright'
import { writeFileSync } from 'node:fs'

const BASE = process.env.PERF_BASE ?? 'https://uachelab.com'
const RUNS = Number(process.env.PERF_RUNS ?? 5)
const BYPASS = process.env.PERF_BYPASS
const ENFORCE = process.env.PERF_ENFORCE === '1'

const BUDGET_TTFB_MS = 300
const BUDGET_API_MS = 250
const BUDGET_LOGIN_MS = 2000

const EMAIL = process.env.PERF_EMAIL ?? 'e2e-titolare@ua-test.local'
const PASSWORD = process.env.PERF_PASSWORD ?? 'TestE2E!2026'

const LIST_ROUTES = [
  '/dashboard',
  '/lavori',
  '/tutto-il-resto',
  '/agenda',
  '/analytics',
  '/cicli-produzione',
  '/clienti',
  '/fatture',
  '/fatture/riconciliazioni',
  '/impostazioni',
  '/impostazioni/abbonamento',
  '/impostazioni/pec',
  '/impostazioni/profilo',
  '/listino',
  '/magazzino',
  '/ordini',
  '/pazienti',
  '/qualita',
  '/qualita/psur',
  '/qualita/rischi',
  '/rete',
  '/scadenzario',
  '/tecnici',
  '/lavori/nuovo',
  '/qualita/incidenti/nuovo',
]

// Pattern per scoprire pagine di dettaglio dai link delle liste
const DETAIL_PATTERNS: RegExp[] = [
  /^\/lavori\/[0-9a-f-]{36}$/,
  /^\/lavori\/[0-9a-f-]{36}\/modifica$/,
  /^\/clienti\/[0-9a-f-]{36}$/,
  /^\/fatture\/[0-9a-f-]{36}$/,
  /^\/magazzino\/[0-9a-f-]{36}$/,
  /^\/pazienti\/[0-9a-f-]{36}$/,
  /^\/scadenzario\/[0-9a-f-]{36}$/,
  /^\/cicli-produzione\/[0-9a-f-]{36}$/,
  /^\/qualita\/rischi\/[0-9a-f-]{36}$/,
  /^\/rete\/[0-9a-f-]{36}$/,
  /^\/tecnici\/[0-9a-f-]{36}\/produttivita$/,
]

const API_GETS = [
  '/api/clienti',
  '/api/listino',
  '/api/fornitori',
  '/api/cicli',
]

interface PageMetrics {
  route: string
  run: number
  ttfbMs: number
  domContentLoadedMs: number
  loadMs: number
  htmlBytes: number
  jsBytes: number
  totalTransferBytes: number
  resourceCount: number
  supabaseCalls: number
  supabaseTotalMs: number
  supabaseSlowest: { url: string; ms: number } | null
  consoleErrors: number
  status: number | null
}

async function collectMetrics(page: Page, route: string, run: number, consoleErrors: number, status: number | null): Promise<PageMetrics> {
  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const supa = resources.filter(r => r.name.includes('supabase.co'))
    const js = resources.filter(r => r.name.includes('/_next/static/') && r.name.endsWith('.js'))
    const slowestSupa = supa.length
      ? supa.reduce((a, b) => (a.duration > b.duration ? a : b))
      : null
    return {
      ttfbMs: nav ? nav.responseStart : -1,
      domContentLoadedMs: nav ? nav.domContentLoadedEventEnd : -1,
      loadMs: nav ? nav.loadEventEnd : -1,
      htmlBytes: nav ? nav.transferSize : -1,
      jsBytes: js.reduce((s, r) => s + (r.transferSize || 0), 0),
      totalTransferBytes: resources.reduce((s, r) => s + (r.transferSize || 0), 0) + (nav?.transferSize || 0),
      resourceCount: resources.length,
      supabaseCalls: supa.length,
      supabaseTotalMs: Math.round(supa.reduce((s, r) => s + r.duration, 0)),
      supabaseSlowest: slowestSupa ? { url: slowestSupa.name.slice(0, 120), ms: Math.round(slowestSupa.duration) } : null,
    }
  })
  return { route, run, consoleErrors, status, ...data,
    ttfbMs: Math.round(data.ttfbMs), domContentLoadedMs: Math.round(data.domContentLoadedMs), loadMs: Math.round(data.loadMs) }
}

async function visita(page: Page, route: string, run: number): Promise<PageMetrics | { route: string; run: number; error: string }> {
  let consoleErrors = 0
  const onConsole = (msg: { type: () => string }) => { if (msg.type() === 'error') consoleErrors++ }
  page.on('console', onConsole)
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 })
    // lascia respirare le fetch client-side post-load (realtime, badge, ecc.)
    await page.waitForTimeout(1500)
    const m = await collectMetrics(page, route, run, consoleErrors, resp?.status() ?? null)
    return m
  } catch (e) {
    return { route, run, error: String(e).slice(0, 200) }
  } finally {
    page.off('console', onConsole)
  }
}

async function scopriDettagli(page: Page): Promise<string[]> {
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).getAttribute('href') || '')
  )
  const found = new Set<string>()
  for (const h of hrefs) {
    const clean = h.split('?')[0]
    if (DETAIL_PATTERNS.some(p => p.test(clean))) found.add(clean)
  }
  return [...found]
}

/** 75° percentile (nearest-rank) su un array di numeri. NaN se vuoto. */
function p75(values: number[]): number {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil(0.75 * sorted.length) - 1)
  return sorted[idx]
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const contextOptions: Parameters<typeof browser.newContext>[0] = {
    viewport: { width: 390, height: 844 }, // mobile-first: il viewport reale di Francesco
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.36 UA-PerfAudit',
  }
  if (BYPASS) {
    contextOptions.extraHTTPHeaders = { 'x-vercel-protection-bypass': BYPASS }
  }
  const context: BrowserContext = await browser.newContext(contextOptions)
  const page = await context.newPage()

  console.log(`base=${BASE} runs=${RUNS} bypass=${BYPASS ? 'sì' : 'no'} enforce=${ENFORCE ? 'sì' : 'no'}`)

  // ---- LOGIN ----
  console.log('login…')
  await page.goto(BASE + '/login', { waitUntil: 'load' })
  await page.fill('#ua-email', EMAIL)
  await page.fill('#ua-password', PASSWORD)
  const t0 = Date.now()
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 45000 })
  const loginMs = Date.now() - t0
  console.log(`login→dashboard: ${loginMs}ms`)

  const results: unknown[] = []
  results.push({ route: '__login_to_dashboard__', run: 0, totalMs: loginMs })

  // Misure post-warmup (run > 0), usate per il calcolo del p75
  const pageTtfbMeasures: number[] = []
  const apiMsMeasures: number[] = []

  // ---- GIRO 0 = WARMUP: liste + scoperta dettagli (scartato dai calcoli) ----
  const dettagli = new Set<string>()
  console.log('\n--- run 0 (warmup, scartato dai calcoli) ---')
  for (const route of LIST_ROUTES) {
    const m = await visita(page, route, 0)
    results.push(m)
    console.log(JSON.stringify(m))
    for (const d of await scopriDettagli(page)) dettagli.add(d)
  }

  // anche dalla home pile (le card potrebbero essere anchor)
  const dettagliArr = [...dettagli]
  console.log(`dettagli scoperti: ${dettagliArr.length}`, dettagliArr)

  for (const route of dettagliArr) {
    const m = await visita(page, route, 0)
    results.push(m)
    console.log(JSON.stringify(m))
  }

  // ---- GIRI 1..RUNS-1 (misurati) su liste + dettagli ----
  const tutteLeRoute = [...LIST_ROUTES, ...dettagliArr]
  for (let run = 1; run < RUNS; run++) {
    console.log(`\n--- run ${run}/${RUNS - 1} ---`)
    for (const route of tutteLeRoute) {
      const m = await visita(page, route, run)
      results.push(m)
      console.log(JSON.stringify(m))
      if (!('error' in m) && m.ttfbMs >= 0) pageTtfbMeasures.push(m.ttfbMs)
    }
  }

  // ---- API GET (RUNS giri ciascuna, giro 0 = warmup scartato) ----
  const apiRequestHeaders = BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : undefined
  for (const api of API_GETS) {
    for (let i = 0; i < RUNS; i++) {
      const t = Date.now()
      try {
        const r = await context.request.get(BASE + api, { timeout: 45000, headers: apiRequestHeaders })
        const ms = Date.now() - t
        results.push({ route: api, run: i, apiMs: ms, status: r.status() })
        console.log(JSON.stringify({ api, run: i, ms, status: r.status() }))
        if (i > 0) apiMsMeasures.push(ms)
      } catch (e) {
        results.push({ route: api, run: i, error: String(e).slice(0, 120) })
      }
    }
  }

  writeFileSync('scripts/tmp/perf-results.json', JSON.stringify(results, null, 2))
  console.log(`\nscritti ${results.length} record in scripts/tmp/perf-results.json`)
  await browser.close()

  // ---- p75 + tabella riassuntiva ----
  if (RUNS < 2) {
    console.warn('PERF_RUNS<2: nessuna misura post-warmup, p75 non calcolabile')
    if (ENFORCE) {
      console.error('PERF_ENFORCE=1 con PERF_RUNS<2: nessuna misura post-warmup, p75 non calcolabile, exit 1.')
      process.exit(1)
    }
  }
  const p75Pages = p75(pageTtfbMeasures)
  const p75Api = p75(apiMsMeasures)
  const pagesOk = p75Pages <= BUDGET_TTFB_MS
  const apiOk = p75Api <= BUDGET_API_MS
  const loginOk = loginMs <= BUDGET_LOGIN_MS

  console.log('\n=== RIEPILOGO p75 (giro 0 escluso, ' + (RUNS - 1) + ' giri misurati) ===')
  console.table([
    { metrica: 'pagine TTFB p75 (ms)', valore: Math.round(p75Pages), budget: BUDGET_TTFB_MS, esito: pagesOk ? 'OK' : 'SFORA' },
    { metrica: 'API p75 (ms)', valore: Math.round(p75Api), budget: BUDGET_API_MS, esito: apiOk ? 'OK' : 'SFORA' },
    { metrica: 'login→dashboard (ms)', valore: loginMs, budget: BUDGET_LOGIN_MS, esito: loginOk ? 'OK' : 'SFORA' },
  ])

  if (ENFORCE && (!pagesOk || !apiOk || !loginOk)) {
    console.error('\nPERF_ENFORCE=1: budget superato, exit 1.')
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
