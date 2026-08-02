#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// GUARDIA — nessuna squadra di prove a schermo punta nel vuoto
//
// PERCHÉ ESISTE (P15, 02/08/2026). `playwright.config.ts` dichiarava CINQUE
// progetti; TRE di loro puntavano, via `testMatch`, a file che non esistono:
// `consegna-completa.spec.ts`, `precheck-mdr-errori.spec.ts`,
// `rls-cross-tenant.spec.ts`, `api-coverage.spec.ts` — quattro nomi, zero file.
//
// 🔑 IL DIFETTO NON È L'ERRORE, È IL SILENZIO. Playwright non si lamenta di un
//    progetto che non fa match con niente: lo esegue con zero test e ne esce
//    VERDE. `provato:` `npx playwright test --list` → uscita 0, «Total: 30 tests
//    in 5 files», e i tre progetti vuoti non compaiono nemmeno nell'elenco.
//    Una rete di sicurezza che non protegge è peggio di nessuna rete, perché
//    chi la vede smette di cercare.
//    ⚠️ E c'era già un precedente identico in questo progetto: i «due progetti
//    Playwright fantasma» del 28/07/2026. Ripararlo senza lasciare una guardia
//    significa aspettare la terza volta.
//
// I DUE BRACCI — entrambi fermano il commit:
//   1. PROGETTO VUOTO — un progetto dichiarato in `projects[]` che raccoglie
//      ZERO test. È il difetto di P15.
//   2. PROVA ORFANA — un file di prova sul disco che NESSUN progetto raccoglie.
//      È lo stesso difetto visto dall'altro lato: qualcuno scrive una prova, la
//      salva, e quella non gira mai. Silenzioso allo stesso modo.
//
// 🔑 COME EVITA DI ESSERE, LEI STESSA, UNA RETE CIECA. Il rischio ovvio era
//    scrivere una guardia che legge solo ciò che C'È — e quindi non vede
//    l'assenza, cioè ricommette il difetto che ripara. `provato:` il rapporto in
//    formato JSON espone `config.projects` con TUTTI i nomi dichiarati, anche
//    quelli senza test (`["setup","authenticated","public","cross-tenant",
//    "api-coverage"]`), mentre i progetti che compaiono nei test sono solo
//    `["setup","public"]`. L'assenza è NEL rapporto: si confrontano i due elenchi.
//
// 🛑 COSA NON PUÒ FARE, dichiarato: non prova che le prove PASSINO, e non prova
//    che coprano qualcosa di utile. Vede che ogni squadra ha dei giocatori e che
//    ogni giocatore è in una squadra — non guarda la partita. E soprattutto NON
//    sostituisce l'esecuzione: oggi Playwright non gira in nessuna macchina
//    automatica (`.github/workflows/ci.yml` lancia tsc, eslint, vitest, build e
//    basta). Quella è una decisione aperta di Francesco, non un difetto di codice.
//
// USO:
//   node scripts/guardia-progetti-playwright.mjs            # sempre (uso a mano / CI)
//   node scripts/guardia-progetti-playwright.mjs --staged   # pre-commit: gira SOLO
//       se il commit tocca la configurazione o la cartella delle prove a schermo.
//       Costo misurato: ~0,39 s quando gira (tre giri: 0,40 · 0,37 · 0,39),
//       ~0,02 s quando salta.
// ═══════════════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process'
import { readdirSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..')
const CARTELLA_PROVE = join(RADICE, 'tests', 'e2e')

// Un file è «di prova» se il suo nome promette di esserlo. `.spec.ts` è la forma
// che Playwright raccoglie da sé; `.setup.ts` è la forma usata qui per i
// preparativi (auth.setup.ts) e viene raccolta solo da un `testMatch` esplicito
// — cioè è proprio quella che può restare orfana senza che nessuno se ne accorga.
const NOME_DI_PROVA = /\.(spec|setup)\.[cm]?[jt]sx?$/

// ── Modalità --staged: si salta se il commit non tocca questa faccenda ───────
if (process.argv.includes('--staged')) {
  let inStage = ''
  try {
    inStage = execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd: RADICE,
      encoding: 'utf8',
    })
  } catch {
    // niente git (o nessun indice): si prosegue col controllo pieno, non si tace
  }
  const rilevanti = inStage
    .split('\n')
    .filter((f) => f === 'playwright.config.ts' || f.startsWith('tests/e2e/'))
  if (inStage && rilevanti.length === 0) process.exit(0)
}

// ── Il fatto: che cosa raccoglie davvero Playwright ─────────────────────────
let rapporto
try {
  const grezzo = execFileSync(
    'npx',
    ['playwright', 'test', '--list', '--reporter=json'],
    { cwd: RADICE, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  rapporto = JSON.parse(grezzo)
} catch (e) {
  console.error('=== Guardia progetti Playwright ===')
  console.error(
    "  ❌ non è stato possibile elencare le prove a schermo. La configurazione è rotta, " +
      'oppure Playwright non è installato su questa macchina.',
  )
  console.error(`\n${(e.stderr || e.stdout || e.message || '').toString().trim().slice(0, 900)}`)
  process.exit(1)
}

const dichiarati = (rapporto.config?.projects ?? []).map((p) => p.name)

const conTest = new Set()
const fileRaccolti = new Set()
const cammina = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) if (t.projectName) conTest.add(t.projectName)
    if (spec.file) fileRaccolti.add(spec.file)
  }
  for (const s of suite.suites ?? []) cammina(s)
}
for (const s of rapporto.suites ?? []) {
  if (s.file) fileRaccolti.add(s.file)
  cammina(s)
}

const errori = []

// ── Braccio 1 — progetti dichiarati che non raccolgono niente ───────────────
const vuoti = dichiarati.filter((n) => !conTest.has(n))
for (const n of vuoti) {
  const p = (rapporto.config?.projects ?? []).find((x) => x.name === n)
  const bersaglio = p?.testMatch ? ` (testMatch: ${JSON.stringify(p.testMatch)})` : ''
  errori.push(
    `il progetto «${n}» non raccoglie NESSUNA prova${bersaglio} — ` +
      'Playwright lo esegue vuoto e ne esce verde: è una rete che non protegge',
  )
}

// ── Braccio 2 — prove sul disco che nessun progetto raccoglie ───────────────
if (!existsSync(CARTELLA_PROVE)) {
  errori.push(`la cartella delle prove a schermo non esiste: ${relative(RADICE, CARTELLA_PROVE)}`)
} else {
  const suDisco = []
  const scendi = (dir) => {
    for (const voce of readdirSync(dir, { withFileTypes: true })) {
      if (voce.name.startsWith('.')) continue // .auth/ e simili: non sono prove
      const pieno = join(dir, voce.name)
      if (voce.isDirectory()) scendi(pieno)
      else if (NOME_DI_PROVA.test(voce.name)) suDisco.push(relative(CARTELLA_PROVE, pieno))
    }
  }
  scendi(CARTELLA_PROVE)

  for (const f of suDisco) {
    if (!fileRaccolti.has(f)) {
      errori.push(
        `tests/e2e/${f} è una prova che NESSUN progetto raccoglie: sta sul disco e non gira mai`,
      )
    }
  }
}

// ── Referto ─────────────────────────────────────────────────────────────────
console.log('=== Guardia progetti Playwright ===')
if (errori.length === 0) {
  const n = [...conTest].length
  console.log(
    `✅ ${dichiarati.length} progetti dichiarati, ${n} con prove, ` +
      `${fileRaccolti.size} file raccolti: nessuna squadra vuota, nessuna prova orfana`,
  )
  process.exit(0)
}
for (const e of errori) console.error(`  ❌ ${e}`)
console.error(
  `\n❌ ${errori.length} problema/i nella rete delle prove a schermo. ` +
    'Una squadra vuota o una prova che nessuno esegue passa VERDE: è così che P15 è vissuta per mesi.',
)
process.exit(1)
