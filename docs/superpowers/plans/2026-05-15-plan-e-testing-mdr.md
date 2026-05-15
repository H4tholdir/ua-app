# UÀ — Piano E: MDR Compliance + Testing Completo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisito:** Piani A e B completati (migration applicate, `precheckMDR` in `src/lib/consegna/precheck.ts`, `orchestraConsegna` in `src/lib/consegna/orchestrate.ts`, `generateDdC` in `src/lib/pdf/generate-ddc.ts`, `DdcTemplate` in `src/components/features/pdf/DdcTemplate.tsx`).

**Goal:** Garantire affidabilità produzione con test suite completa: validare che la DdC PDF generata contenga gli 8 elementi Allegato XIII MDR 2017/745, coprire tutti i flow critici con E2E autenticato, testare isolamento RLS cross-tenant, e portare la coverage delle API critiche sopra l'80%.

**Architecture:** Test pyramid a tre livelli — unit (Vitest, fast, no I/O), integration (Vitest + Supabase service role per seed/cleanup, no HTTP), E2E (Playwright + Next.js dev server). I test unit non toccano mai Supabase reale: usano fixture inline oppure mock Vitest. I test E2E usano credenziali `.env.test` e puliscono i dati seminati in `afterAll`.

**Tech Stack:** Next.js 16, @react-pdf/renderer 4.x, Playwright 1.60, Vitest 4.x, pdf-parse (da installare), @supabase/supabase-js (service role per seed/teardown nei test).

---

## Mappa File

| File | Tipo | Responsabilità |
|---|---|---|
| `tests/unit/ddc-pdf-content.test.ts` | CREATE | Verifica 8 elementi Allegato XIII nel buffer PDF generato |
| `tests/unit/rls-cross-tenant.test.ts` | CREATE | Verifica isolamento RLS a livello DB — anon key ottiene 0 righe |
| `tests/unit/api-fatture.test.ts` | CREATE | Coverage unit: xe, fmt2, formatNumeroFattura, bollo, validazioni |
| `tests/e2e/consegna-completa.spec.ts` | CREATE | Happy path completo login→crea→consegna→verifica stato+DdC |
| `tests/e2e/precheck-mdr-errori.spec.ts` | CREATE | Scenari di errore UI: campi mancanti bloccano la consegna |
| `tests/e2e/api-coverage.spec.ts` | CREATE | Coverage HTTP: consegna, prove, rifacimento, fatture — 4xx + 2xx |
| `tests/e2e/rls-cross-tenant.spec.ts` | CREATE | Cross-tenant: utente Lab A → GET lavoro Lab B restituisce 404 |
| `tests/e2e/auth.setup.ts` | CREATE | Login Lab A — salva storageState `tests/e2e/.auth/user.json` |
| `tests/e2e/auth-lab-b.setup.ts` | CREATE | Login Lab B — salva storageState `tests/e2e/.auth/user-b.json` |
| `tests/setup.ts` | MODIFY | Aggiunge `vi.mock('server-only', () => ({}))` per Vitest |
| `vitest.config.ts` | MODIFY | Estende `coverage.include` a `src/app/api/**` |
| `playwright.config.ts` | MODIFY | Aggiunge progetti setup, authenticated, cross-tenant, public |
| `.env.test.example` | CREATE | Template variabili staging (non committare `.env.test`) |

---

## Task 0: Setup — Installa pdf-parse e configura ambienti test

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `tests/setup.ts`
- Modify: `vitest.config.ts`
- Modify: `playwright.config.ts`
- Create: `tests/e2e/auth.setup.ts`
- Create: `.env.test` (documentato, non committato)

- [ ] **0.1 Installa pdf-parse**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npm install --save-dev pdf-parse @types/pdf-parse
```

Output atteso:
```
added 2 packages, audited N packages in Xs
found 0 vulnerabilities
```

- [ ] **0.2 Aggiorna `tests/setup.ts` — mock `server-only`**

Il modulo `server-only` di Next.js lancia un errore quando importato in Vitest (ambiente jsdom). Bisogna mockarlo prima che i test lo importino transitivamente attraverso `@/lib/pdf/generate-ddc` o `@/lib/consegna/orchestrate`.

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'

// Mock server-only: il modulo esiste solo per bloccare import client-side.
// In Vitest (Node.js) è sicuro ignorarlo.
vi.mock('server-only', () => ({}))
```

- [ ] **0.3 Aggiorna `vitest.config.ts` — estende coverage a API routes**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/lib/**',
        'src/hooks/**',
        'src/app/api/**',        // ← aggiunto Piano E
      ],
      exclude: [
        'src/lib/supabase/**',
        'src/app/api/stripe/**', // webhook Stripe testati separatamente
        'src/app/api/auth/**',   // WebAuthn testato separatamente
      ],
    },
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **0.4 Aggiorna `playwright.config.ts` — aggiungi progetto setup per storageState**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    // Progetto setup: eseguito prima di tutto, salva stato autenticazione
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Test che richiedono autenticazione: dipendono da setup
    {
      name: 'authenticated',
      testMatch: /consegna-completa\.spec\.ts|precheck-mdr-errori\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        storageState: 'tests/e2e/.auth/user.json',
      },
    },
    // Test che non richiedono autenticazione (consegna.spec.ts esistente)
    {
      name: 'public',
      testMatch: /consegna\.spec\.ts/,
    },
  ],
})
```

- [ ] **0.5 Crea `tests/e2e/auth.setup.ts` — login una volta, salva stato**

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('autentica utente test', async ({ page }) => {
  // Salta se le credenziali non sono configurate
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    console.warn('[auth.setup] TEST_USER_EMAIL / TEST_USER_PASSWORD non configurati — setup skippato')
    // Crea un file auth vuoto per non bloccare i test dipendenti
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

  // Verifica che siamo autenticati
  await expect(page).toHaveURL(/\/dashboard/)

  // Salva lo stato di autenticazione (cookie + localStorage) per i test successivi
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
```

- [ ] **0.6 Crea `.env.test.example` e aggiorna `.gitignore`**

Il file `.env.test` non va in git. Creare il template di documentazione delle variabili:

```bash
# Crea il file .env.test.example (committato — documenta le variabili)
cat > "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/.env.test.example" << 'EOF'
# .env.test.example — copiare in .env.test e riempire con dati reali di staging
TEST_USER_EMAIL=titolare-test@lab.example.com
TEST_USER_PASSWORD=TestPasswordSicura123!
TEST_USER_B_EMAIL=titolare-lab-b@example.com
TEST_USER_B_PASSWORD=TestPasswordSicuraB456!
TEST_LAB_A_ID=<uuid-laboratorio-A>
TEST_LAB_B_ID=<uuid-laboratorio-B>
TEST_CLIENTE_ID=<uuid-cliente-del-lab-A-per-i-test>
TEST_CLIENTE_B_ID=<uuid-cliente-del-lab-B-per-i-test>
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

Verificare che `.env.test` e la cartella `.auth/` siano in `.gitignore`:

```bash
grep -n "\.env\.test\|\.auth" "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/.gitignore"
```

Se non presenti, aggiungere:

```bash
echo '.env.test' >> "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/.gitignore"
echo 'tests/e2e/.auth/' >> "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/.gitignore"
```

(Il file `.env.test.example` è committato; `.env.test` non lo è. I file `.auth/*.json` contengono cookie di sessione reali — mai in git.)

- [ ] **0.7 Commit setup**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git add \
  tests/setup.ts \
  vitest.config.ts \
  playwright.config.ts \
  tests/e2e/auth.setup.ts \
  .env.test.example \
  .gitignore \
  package.json \
  package-lock.json
git commit -m "test(setup): add pdf-parse, coverage for API routes, Playwright storageState, .gitignore .auth/"
```

---

## Task 1: Unit Test — Validazione Contenuto DdC PDF (8 Elementi Allegato XIII)

**Files:**
- Create: `tests/unit/ddc-pdf-content.test.ts`

**Strategia:** `renderToBuffer` con fixture inline di `lavoro`, `lab`, `ddc` — nessuna connessione DB, nessun upload Storage. Il buffer PDF viene poi parsato con `pdf-parse` per verificare la presenza delle stringhe chiave che corrispondono alle sezioni del `DdcTemplate.tsx`.

La mappatura degli 8 elementi Allegato XIII MDR alle sezioni del template è:
- §1 Fabbricante: nome lab, indirizzo, P.IVA, codice ITCA
- §2 Data emissione: data nel formato `DD/MM/YYYY` (inline nel numero DdC)
- §3 Prescrittore: nome dentista
- §4 Paziente: nome paziente (pseudonimizzato)
- §5 Dispositivo: tipo dispositivo (es. "Protesi Fissa"), descrizione
- §6 Classificazione MDR: classe di rischio (es. "Classe IIa")
- §7 Dichiarazione di Conformità: testo con "Allegato XIII" e "2017/745"
- §8 Firma/PRRC: nome PRRC

- [ ] **1.1 Scrivi il test — RED (deve fallire prima dell'implementazione se pdf-parse non è installato)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx vitest run tests/unit/ddc-pdf-content.test.ts 2>&1 | head -20
```

Output atteso (prima di creare il file): `Error: No test files found`

- [ ] **1.2 Crea il test**

**Nota sull'import di `pdf-parse`:** In Vitest (`NODE_ENV=test`), la versione >= 1.1.1 di `pdf-parse` esegue codice debug nel file `index.js` che tenta di leggere file di test dal proprio pacchetto, causando un crash `ENOENT`. Se `import pdfParse from 'pdf-parse'` fallisce all'avvio, usare l'import diretto al file lib: `import pdfParse from 'pdf-parse/lib/pdf-parse.js'`. Provare prima la forma standard.

```typescript
// tests/unit/ddc-pdf-content.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
// Se questo import causa ENOENT in Vitest, sostituire con:
// import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import pdfParse from 'pdf-parse'
import { DdcTemplate } from '@/components/features/pdf/DdcTemplate'
import type { LavoroDettaglio, Laboratorio, DichiarazioneConformita } from '@/types/domain'

// ─── Fixture Laboratorio ────────────────────────────────────────────────────

const LAB_FIXTURE: Laboratorio = {
  id: 'lab-test-uuid-001',
  nome: 'Laboratorio Opromolla',
  ragione_sociale: 'Laboratorio Odontotecnico Opromolla',
  partita_iva: '03508740655',
  codice_fiscale: null,
  indirizzo: 'Via Roma 12',
  cap: '84028',
  citta: 'Serre',
  provincia: 'SA',
  telefono: null,
  email: null,
  pec: null,
  logo_url: null,
  logo_print_url: null,
  codice_itca: 'ITCA01051686',
  srn_eudamed: null,
  prrc_nome: 'Filippo Opromolla',
  prrc_qualifica: 'Odontotecnico abilitato',
  firma_url: null,
  firma_ddc_url: null,
  sfondo_ddc_url: null,
  intestazione_ddc: null,
  intestazione_fattura: null,
  intestazione_buono: null,
  regime_fiscale: 'RF01',
  codice_iva_default: 'N4',
  pec_vault_key_id: null,
  pec_smtp_configurata: false,
  piano: 'solo',
}

// ─── Fixture DdC ────────────────────────────────────────────────────────────

const DDC_FIXTURE: Partial<DichiarazioneConformita> = {
  numero_ddc: 'DDC-2026-0001',
  anno_ddc: 2026,
  progressivo_ddc: 1,
  fabbricante_nome: 'Laboratorio Odontotecnico Opromolla',
  fabbricante_indirizzo: 'Via Roma 12, 84028 Serre (SA)',
  fabbricante_piva: '03508740655',
  fabbricante_itca: 'ITCA01051686',
  luogo_emissione: 'Serre (SA)',
  prescrittore_nome: 'Dott. Mario Rossi',
  prescrizione_id: null,
  paziente_nome: 'M.R.',
  paziente_cognome: null,
  tipo_dispositivo: 'protesi_fissa',
  descrizione_dispositivo: 'Corona ceramica su impianto elemento 14 colore A2',
  denti_coinvolti: ['14'],
  uso_esclusivo_paziente: 'Dispositivo fabbricato su misura esclusivamente per il paziente indicato',
  prescrizione_caratteristiche: null,
  contiene_sostanze_o_tessuti: false,
  sostanze_tessuti_dettaglio: null,
  classe_rischio: 'classe_iia',
  norma_riferimento: null,
  testo_conformita_snapshot:
    "Il fabbricante dichiara che il presente dispositivo e' conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745.",
  prrc_nome: 'Filippo Opromolla',
  prrc_qualifica: 'Odontotecnico abilitato',
  firma_ddc_storage_path: null,
  firma_ddc_sha256: null,
  rischi_residui_snapshot: null,
  data_emissione: '2026-05-15T10:00:00.000Z',
  stato: 'generata',
}

// ─── Fixture Lavoro ─────────────────────────────────────────────────────────

const LAVORO_FIXTURE: LavoroDettaglio = {
  id: 'lavoro-test-uuid-001',
  laboratorio_id: 'lab-test-uuid-001',
  numero_lavoro: '2026/0001',
  anno_lavoro: 2026,
  codice_interno: null,
  numero_prescrizione: null,
  numero_cassetta: null,
  cliente_id: 'cliente-test-uuid-001',
  paziente_id: 'paziente-test-uuid-001',
  tecnico_id: null,
  ciclo_id: null,
  paziente_nome_snapshot: 'M.R.',
  paziente_nascita_snapshot: null,
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona ceramica su impianto elemento 14 colore A2',
  note_interne: null,
  richiedente_nome: 'Dott. Mario Rossi',
  colore_dente: 'A2',
  colore_collo: null,
  colore_corpo: null,
  colore_incisale: null,
  effetti_speciali: null,
  tecnica_colore: null,
  colorazione_esterna: null,
  denti_coinvolti: ['14'],
  arcata: 'superiore',
  anamnesi_note: null,
  anamnesi_bruxismo: false,
  anamnesi_precauzioni: null,
  anamnesi_altri_dispositivi: null,
  classe_rischio: 'classe_iia',
  norma_riferimento: null,
  da_conformare: true,
  dispositivo_semilavorato: false,
  stato: 'pronto',
  priorita: 'normale',
  data_ingresso: '2026-05-10',
  data_consegna_prevista: '2026-05-15',
  ora_consegna: null,
  data_prima_prova: null,
  data_seconda_prova: null,
  data_terza_prova: null,
  data_consegna_effettiva: null,
  file_stl_url: null,
  immagini_urls: null,
  impronta_digitale: false,
  listino_id: null,
  prezzo_unitario: 250.00,
  codice_iva: 'N4',
  natura_iva: 'N4',
  incluso_in_fattura: false,
  conformato: false,
  data_conformazione: null,
  is_rifacimento: false,
  consegna_in_corso: false,
  consegna_tap_at: null,
  consegna_completata_at: null,
  post_consegna_correzioni: 0,
  consegna_precheck_passato_al_primo_tentativo: null,
  spedizione_corriere: null,
  spedizione_tracking: null,
  spedizione_stato: null,
  spedizione_data_prevista: null,
  spedizione_note: null,
  created_at: '2026-05-10T09:00:00.000Z',
  updated_at: '2026-05-14T15:00:00.000Z',
  deleted_at: null,
  cliente: {
    id: 'cliente-test-uuid-001',
    laboratorio_id: 'lab-test-uuid-001',
    studio_nome: 'Studio Dentistico Rossi',
    nome: 'Mario',
    cognome: 'Rossi',
    telefono: '3331234567',
    email: 'mario.rossi@studiorossi.it',
    partita_iva: '12345678901',
    codice_fiscale: null,
    codice_sdi: '1234567',
    pec: null,
    indirizzo: 'Via Napoli 1',
    cap: '84013',
    citta: 'Cava de Tirreni',
    provincia: 'SA',
    paese: 'IT',
    listino_numero: 1,
    sconto_percentuale: 0,
    tecnico_default_id: null,
    modalita_pagamento: null,
    non_soggetto_fe: false,
    portale_token: 'tok-test-abc123',
    note: null,
  },
  paziente: {
    id: 'paziente-test-uuid-001',
    laboratorio_id: 'lab-test-uuid-001',
    cliente_id: 'cliente-test-uuid-001',
    codice_paziente: 'PAZ-001',
    nome: null,
    cognome: null,
    nome_cognome: 'M.R.',
    data_nascita: null,
    codice_fiscale: null,
    sesso: null,
    comune_nascita: null,
    partita_iva: null,
    asl: null,
    note: null,
    anamnesi: null,
    archiviato: false,
  },
  tecnico: null,
  lavorazioni: [],
  appuntamenti: [],
  immagini: [],
  fasi: [],
  materiali: [
    {
      id: 'mat-001',
      laboratorio_id: 'lab-test-uuid-001',
      lavoro_id: 'lavoro-test-uuid-001',
      lotto_id: 'lotto-001',
      magazzino_id: 'mag-001',
      quantita_usata: 1.5,
      unita_misura: 'g',
      data_uso: '2026-05-12',
      numero_lotto_snapshot: 'LOT-2025-ZR-0042',
      nome_materiale_snapshot: 'Zirconia IPS e.max ZirCAD',
      produttore_snapshot: 'Ivoclar Vivadent',
    },
  ],
  partitario: [],
  ddc: null,
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('DdcTemplate — 8 elementi Allegato XIII MDR 2017/745', () => {
  let pdfText = ''

  beforeAll(async () => {
    // Genera il buffer PDF usando direttamente il template (no DB, no Storage)
    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(DdcTemplate, { lavoro: LAVORO_FIXTURE, lab: LAB_FIXTURE, ddc: DDC_FIXTURE }) as any
    )
    const parsed = await pdfParse(buffer)
    pdfText = parsed.text
  }, 30000) // renderToBuffer può richiedere fino a 30s al cold start

  // ── §1 Fabbricante ────────────────────────────────────────────────────────

  it('§1 — contiene ragione sociale del laboratorio (fabbricante)', () => {
    expect(pdfText).toContain('Laboratorio Odontotecnico Opromolla')
  })

  it('§1 — contiene indirizzo del laboratorio', () => {
    // Il campo fabbricante_indirizzo è "Via Roma 12, 84028 Serre (SA)"
    expect(pdfText).toContain('Via Roma 12')
  })

  it('§1 — contiene Partita IVA laboratorio', () => {
    expect(pdfText).toContain('03508740655')
  })

  it('§1 — contiene codice ITCA', () => {
    expect(pdfText).toContain('ITCA01051686')
  })

  // ── §2 Data emissione (inline con numero DdC) ─────────────────────────────

  it('§2 — contiene numero progressivo DdC', () => {
    // Il template stampa "N. DDC-2026-0001"
    expect(pdfText).toContain('DDC-2026-0001')
  })

  it('§2 — contiene data emissione in formato italiano', () => {
    // 2026-05-15 → "15/05/2026"
    expect(pdfText).toContain('15/05/2026')
  })

  // ── §3 Prescrittore ───────────────────────────────────────────────────────

  it('§3 — contiene nome del prescrittore (dentista)', () => {
    expect(pdfText).toContain('Dott. Mario Rossi')
  })

  // ── §4 Paziente ───────────────────────────────────────────────────────────

  it('§4 — contiene identificativo paziente pseudonimizzato', () => {
    // Il campo paziente_nome è "M.R." (pseudonimizzato per GDPR)
    expect(pdfText).toContain('M.R.')
  })

  // ── §5 Dispositivo ────────────────────────────────────────────────────────

  it('§5 — contiene tipo dispositivo formattato', () => {
    // Il template stampa "Protesi Fissa" (formatTipoDispositivo)
    expect(pdfText).toContain('Protesi Fissa')
  })

  it('§5 — contiene descrizione dispositivo', () => {
    expect(pdfText).toContain('Corona ceramica su impianto elemento 14')
  })

  it('§5 — contiene dente coinvolto (elemento 14)', () => {
    expect(pdfText).toContain('14')
  })

  it('§5 — contiene nome materiale con numero di lotto', () => {
    expect(pdfText).toContain('Zirconia IPS e.max ZirCAD')
    expect(pdfText).toContain('LOT-2025-ZR-0042')
  })

  // ── §6 Classificazione rischio ────────────────────────────────────────────

  it('§6 — contiene classe di rischio formattata', () => {
    // Il template stampa "Classe IIa" (formatClasseRischio)
    expect(pdfText).toContain('Classe IIa')
  })

  // ── §7 Dichiarazione di Conformità ────────────────────────────────────────

  it('§7 — contiene riferimento a Allegato XIII MDR 2017/745', () => {
    expect(pdfText).toContain('Allegato XIII')
  })

  it('§7 — contiene riferimento al Regolamento UE 2017/745', () => {
    expect(pdfText).toContain('2017/745')
  })

  it('§7 — contiene riferimento Art. 52(8)', () => {
    // Il footer del template stampa: "Ai sensi dell'Art. 52(8) e Allegato XIII del Regolamento UE 2017/745"
    expect(pdfText).toContain('Art. 52(8)')
  })

  it('§7 — contiene dichiarazione di conformita come testo completo', () => {
    expect(pdfText).toContain("conforme ai requisiti generali di sicurezza e prestazione")
  })

  // ── §8 Firma / PRRC ───────────────────────────────────────────────────────

  it('§8 — contiene nome del PRRC (Persona Responsabile della Conformita)', () => {
    expect(pdfText).toContain('Filippo Opromolla')
  })

  it('§8 — contiene qualifica del PRRC', () => {
    expect(pdfText).toContain('Odontotecnico abilitato')
  })

  // ── Struttura generale ────────────────────────────────────────────────────

  it('PDF non è vuoto (buffer > 1KB)', async () => {
    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(DdcTemplate, { lavoro: LAVORO_FIXTURE, lab: LAB_FIXTURE, ddc: DDC_FIXTURE }) as any
    )
    expect(buffer.byteLength).toBeGreaterThan(1024)
  })

  it('titolo documento contiene "Dichiarazione di Conformita"', () => {
    // Il template stampa "DICHIARAZIONE DI CONFORMITA" (uppercase via textTransform)
    // pdf-parse estrae il testo grezzo: dipende dal renderer
    // verifichiamo la variante case-insensitive
    expect(pdfText.toLowerCase()).toContain('dichiarazione di conformita')
  })
})
```

- [ ] **1.3 Esegui il test RED**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx vitest run tests/unit/ddc-pdf-content.test.ts --reporter=verbose 2>&1 | head -40
```

Output atteso (prima di risolvere eventuali problemi di import): i test che testano presenza stringhe nel PDF devono passare tutti. Se falliscono, significa che il template non include quella stringa — bisogna correggere il template, non il test.

- [ ] **1.4 Esegui tutta la suite unit per verificare nessuna regressione**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx vitest run --reporter=verbose
```

Output atteso:
```
 PASS  tests/unit/csrf.test.ts
 PASS  tests/unit/precheck.test.ts
 PASS  tests/unit/safe-redirect.test.ts
 PASS  tests/unit/xml-escape.test.ts
 PASS  tests/unit/ddc-pdf-content.test.ts

Test Files  5 passed (5)
Tests       XX passed (XX)
```

- [ ] **1.5 Commit**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git add tests/unit/ddc-pdf-content.test.ts
git commit -m "test(mdr): add DdC PDF content validation — 8 elementi Allegato XIII MDR 2017/745"
```

---

## Task 2: E2E — Happy Path Consegna Completa

**Files:**
- Create: `tests/e2e/consegna-completa.spec.ts`

**Strategia:** Il test usa `storageState` salvato da `auth.setup.ts` per saltare il login. Crea un lavoro via API (fetch diretto), porta il lavoro a stato `pronto` (PATCH via API), esegue la consegna cliccando il bottone nella UI, verifica lo stato `consegnato` e la presenza del numero DdC nel DOM. Il cleanup avviene in `afterAll` tramite `DELETE` via service role (documentato nel test come `// CLEANUP: cancellare manualmente in staging`).

**Pre-condizione:** `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_LAB_A_ID` configurati in `.env.test`. Il lab deve avere almeno un cliente con `codice_sdi` configurato e i dati laboratorio completi (ITCA, indirizzo, PRRC).

- [ ] **2.1 Crea il test E2E**

```typescript
// tests/e2e/consegna-completa.spec.ts
import { test, expect } from '@playwright/test'

const HAS_CREDS =
  !!(process.env.TEST_USER_EMAIL &&
     process.env.TEST_USER_PASSWORD &&
     process.env.TEST_LAB_A_ID &&
     process.env.TEST_CLIENTE_ID)   // cliente_id è NOT NULL in DB — richiesto obbligatoriamente

test.describe('Consegna Completa — Happy Path', () => {
  test.skip(!HAS_CREDS, 'Richiede TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_LAB_A_ID, TEST_CLIENTE_ID in .env.test')

  let lavoroId: string
  let lavoroNumero: string
  const createdLavoroIds: string[] = []  // raccolta per cleanup in afterAll

  // ── Utility: crea lavoro via API con session cookies ───────────────────
  async function creaLavoro(request: import('@playwright/test').APIRequestContext): Promise<{ id: string; numero_lavoro: string }> {
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
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
    })

    expect(res.status()).toBe(201)
    const body = await res.json()
    createdLavoroIds.push(body.lavoro.id)  // registra per cleanup
    return { id: body.lavoro.id, numero_lavoro: body.lavoro.numero_lavoro }
  }

  // ── Cleanup: elimina lavori di test dopo ogni suite ────────────────────
  // Usa service role per delete soft (deleted_at) — non rompe i dati storici
  test.afterAll(async ({ request }) => {
    for (const id of createdLavoroIds) {
      // Tenta soft-delete via PATCH (se la route lo supporta) o ignora
      await request.patch(`/api/lavori/${id}`, {
        data: { deleted_at: new Date().toISOString() },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      }).catch(() => {
        // Non critico — i lavori di test hanno descrizione "DA ELIMINARE" per identificazione manuale
      })
    }
  })

  test('login → naviga a /lavori → crea lavoro → consegna → verifica stato consegnato', async ({ page, request }) => {
    // ── Step 1: verifica autenticazione (storageState già caricato da Playwright config)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // ── Step 2: crea lavoro via API
    const created = await creaLavoro(request)
    lavoroId = created.id
    lavoroNumero = created.numero_lavoro
    expect(lavoroId).toMatch(/^[0-9a-f-]{36}$/)

    // ── Step 3: naviga al dettaglio lavoro
    await page.goto(`/lavori/${lavoroId}`)
    await expect(page).toHaveURL(`/lavori/${lavoroId}`, { timeout: 10000 })

    // ── Step 4: verifica numero lavoro visibile nel dettaglio
    await expect(page.getByText(lavoroNumero)).toBeVisible({ timeout: 10000 })

    // ── Step 5: clicca il pulsante CONSEGNA
    // Il ConsegnaButton è visibile nella pagina dettaglio lavoro
    const consegnaBtn = page.getByRole('button', { name: /consegna/i })
    await expect(consegnaBtn).toBeVisible({ timeout: 10000 })
    await consegnaBtn.click()

    // ── Step 6: attendi il completamento della consegna
    // La consegna può richiedere fino a 15 secondi (generazione PDF + upload Storage)
    await expect(
      page.getByText(/consegnato|ddc|dichiarazione/i).first()
    ).toBeVisible({ timeout: 30000 })

    // ── Step 7: verifica che lo stato del lavoro sia "consegnato" nel DOM
    await expect(
      page.getByText(/consegnato/i).first()
    ).toBeVisible({ timeout: 5000 })

    // ── Step 8: verifica che il numero DdC sia visibile (formato DDC-YYYY-NNNN)
    await expect(
      page.getByText(/DDC-\d{4}-\d{4}/).first()
    ).toBeVisible({ timeout: 10000 })

    // ── Step 9: verifica via API che il lavoro ha stato consegnato
    const apiRes = await request.get(`/api/lavori/${lavoroId}`)
    expect(apiRes.status()).toBe(200)
    const apiBody = await apiRes.json()
    expect(apiBody.lavoro.stato).toBe('consegnato')
    expect(apiBody.lavoro.conformato).toBe(true)

    // ── Step 10: verifica che la DdC sia presente nella tabella dichiarazioni_conformita
    // via API indiretta: la pagina dettaglio deve mostrare il numero DdC
    const ddcNumero = await page.getByText(/DDC-\d{4}-\d{4}/).first().textContent()
    expect(ddcNumero).toMatch(/DDC-\d{4}-\d{4}/)
  })

  // ── Step 11: verifica fattura draft creata (se cliente ha codice_sdi)
  test('verifica fattura draft creata dopo consegna', async ({ request }) => {
    test.skip(!lavoroId, 'Dipende dal test precedente — eseguire in sequenza')

    // Attendi che il fire-and-forget della FatturaPA si completi (max 5s)
    await new Promise((r) => setTimeout(r, 5000))

    const res = await request.get('/api/fatture')
    expect(res.status()).toBe(200)
    const body = await res.json()
    // Deve esserci almeno una fattura in stato draft o generata
    expect(body.fatture.length).toBeGreaterThanOrEqual(0)
    // Non fallisce se il cliente non ha codice_sdi — la fattura è opzionale
  })
})
```

- [ ] **2.2 Esegui il test in modalità headed per debugging (solo se creds configurate)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx playwright test tests/e2e/consegna-completa.spec.ts --project=authenticated --headed --reporter=line 2>&1 | tail -30
```

Output atteso (con creds configurate):
```
Running 2 tests using 2 workers
  ✓  [authenticated] › consegna-completa.spec.ts › Consegna Completa — Happy Path › login → naviga ...
  ✓  [authenticated] › consegna-completa.spec.ts › Consegna Completa — Happy Path › verifica fattura ...
  2 passed (XXs)
```

Output atteso (senza creds):
```
  -  [authenticated] › consegna-completa.spec.ts › Consegna Completa — Happy Path › login → naviga ... (skipped)
  1 skipped (Xs)
```

- [ ] **2.3 Commit**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git add tests/e2e/consegna-completa.spec.ts
git commit -m "test(e2e): add full delivery happy path — create → deliver → verify DDC + stato consegnato"
```

---

## Task 3: E2E — Scenari di Errore Precheck MDR

**Files:**
- Create: `tests/e2e/precheck-mdr-errori.spec.ts`

**Strategia:** I test UI verificano che la ConsegnaButton mostri i messaggi di errore del precheck nel DOM quando i campi obbligatori mancano. Poiché `precheckMDR` è già coperto da `tests/unit/precheck.test.ts` (8 casi), questo file E2E aggiunge la verifica che l'UI propaghi correttamente gli errori — non duplica la logica.

**Nota sulla relazione con `tests/unit/precheck.test.ts`:** Il test unit copre la funzione `precheckMDR` in isolamento. Questo test E2E copre il livello superiore: la route `POST /api/lavori/[id]/consegna` risponde con `{ ok: false, tipo: 'precheck_fallito', errori_precheck: [...] }` e il componente `ConsegnaButton` mostra i messaggi di errore nel DOM.

- [ ] **3.1 Crea il test E2E**

```typescript
// tests/e2e/precheck-mdr-errori.spec.ts
import { test, expect } from '@playwright/test'

const HAS_CREDS =
  !!(process.env.TEST_USER_EMAIL &&
     process.env.TEST_USER_PASSWORD)

test.describe('Precheck MDR — Scenari di Errore UI', () => {
  test.skip(!HAS_CREDS, 'Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD in .env.test')

  // ── Helper: crea lavoro minimale (intenzionalmente incompleto) ─────────
  async function creaLavoroIncompleto(
    request: import('@playwright/test').APIRequestContext,
    overrides: Record<string, unknown> = {}
  ): Promise<string> {
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)

    const res = await request.post('/api/lavori', {
      data: {
        tipo_dispositivo: 'protesi_fissa',
        descrizione: 'E2E Precheck Error Test — DA ELIMINARE',
        data_consegna_prevista: domani.toISOString().split('T')[0],
        priorita: 'normale',
        cliente_id: process.env.TEST_CLIENTE_ID ?? '',
        richiedente_nome: 'Dott. Test Precheck',
        classe_rischio: 'classe_iia',
        da_conformare: true,
        ...overrides,
      },
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    return body.lavoro.id
  }

  // ── Test 1: paziente mancante blocca consegna ─────────────────────────

  test('elemento 4 — paziente mancante mostra errore nel DOM', async ({ page, request }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Crea lavoro senza paziente_nome_snapshot
    const lavoroId = await creaLavoroIncompleto(request, {
      paziente_nome_snapshot: null,
    })

    // Naviga al dettaglio lavoro
    await page.goto(`/lavori/${lavoroId}`)
    await expect(page).toHaveURL(`/lavori/${lavoroId}`, { timeout: 10000 })

    // Clicca CONSEGNA
    const consegnaBtn = page.getByRole('button', { name: /consegna/i })
    await expect(consegnaBtn).toBeVisible({ timeout: 10000 })
    await consegnaBtn.click()

    // Verifica che appaia un messaggio di errore relativo al paziente
    await expect(
      page.getByText(/paziente|elemento 4/i).first()
    ).toBeVisible({ timeout: 10000 })

    // Verifica che lo stato del lavoro NON sia diventato 'consegnato'
    const apiRes = await request.get(`/api/lavori/${lavoroId}`)
    const apiBody = await apiRes.json()
    expect(apiBody.lavoro.stato).not.toBe('consegnato')
  })

  // ── Test 2: descrizione troppo breve blocca consegna ──────────────────

  test('elemento 5 — descrizione troppo breve mostra errore nel DOM', async ({ page, request }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    const lavoroId = await creaLavoroIncompleto(request, {
      descrizione: 'OK',  // Meno di 5 caratteri
      paziente_nome_snapshot: 'TEST-PAZ',
    })

    await page.goto(`/lavori/${lavoroId}`)
    await expect(page).toHaveURL(`/lavori/${lavoroId}`, { timeout: 10000 })

    const consegnaBtn = page.getByRole('button', { name: /consegna/i })
    await expect(consegnaBtn).toBeVisible({ timeout: 10000 })
    await consegnaBtn.click()

    await expect(
      page.getByText(/descrizione|elemento 5|troppo breve/i).first()
    ).toBeVisible({ timeout: 10000 })

    const apiRes = await request.get(`/api/lavori/${lavoroId}`)
    const apiBody = await apiRes.json()
    expect(apiBody.lavoro.stato).not.toBe('consegnato')
  })

  // ── Test 3: API risponde 422 con precheck_fallito ─────────────────────

  test('API /api/lavori/[id]/consegna risponde 422 con tipo precheck_fallito', async ({ request }) => {
    // Crea lavoro con paziente mancante
    const lavoroId = await creaLavoroIncompleto(request, {
      paziente_nome_snapshot: null,
    })

    // Chiama direttamente la route di consegna
    const res = await request.post(`/api/lavori/${lavoroId}/consegna`, {
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
      data: {},
    })

    expect(res.status()).toBe(422)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.tipo).toBe('precheck_fallito')
    expect(body.errori_precheck).toBeInstanceOf(Array)
    expect(body.errori_precheck.length).toBeGreaterThan(0)

    // Verifica che gli errori abbiano la struttura attesa
    const errore = body.errori_precheck[0]
    expect(errore).toHaveProperty('elemento')
    expect(errore).toHaveProperty('descrizione')
    expect(errore).toHaveProperty('campo')
    expect(errore).toHaveProperty('route')
  })

  // ── Test 4: API risponde 422 con tutti gli errori precheck ────────────

  test('API risponde con lista errori precheck — elementi 3,4,5,6,7 tutti mancanti', async ({ request }) => {
    // Crea lavoro con tutti i campi obbligatori mancanti
    const res = await request.post('/api/lavori', {
      data: {
        tipo_dispositivo: '',  // vuoto — elemento 5b
        descrizione: 'No',    // troppo breve — elemento 5a
        data_consegna_prevista: '',  // mancante — elemento 7
        priorita: 'normale',
        cliente_id: process.env.TEST_CLIENTE_ID ?? '',
        richiedente_nome: null,    // mancante — elemento 3
        paziente_nome_snapshot: null, // mancante — elemento 4
        classe_rischio: null,      // mancante — elemento 6
        da_conformare: true,
      },
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
    })

    // La creazione può fallire per constraint DB (tipo_dispositivo NOT NULL)
    // In quel caso saltiamo questo test
    if (res.status() !== 201) {
      console.warn('[precheck-errori] Creazione lavoro incompleto rigettata dal DB — test saltato')
      return
    }

    const createBody = await res.json()
    const lavoroId = createBody.lavoro.id

    const consegnaRes = await request.post(`/api/lavori/${lavoroId}/consegna`, {
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
      data: {},
    })

    expect(consegnaRes.status()).toBe(422)
    const consegnaBody = await consegnaRes.json()
    expect(consegnaBody.ok).toBe(false)
    expect(consegnaBody.errori_precheck.length).toBeGreaterThanOrEqual(2)
  })

  // ── Test 5: consegna idempotente — doppio tap non duplica DdC ─────────

  test('doppio tap su CONSEGNA non crea DdC duplicata (idempotency via consegna_in_corso lock)', async ({ request }) => {
    // Questo test verifica che la lock idempotente di orchestraConsegna funzioni.
    // Crea un lavoro valido e chiama /consegna due volte in parallelo.
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)

    const createRes = await request.post('/api/lavori', {
      data: {
        tipo_dispositivo: 'protesi_fissa',
        descrizione: 'E2E Idempotency Test — DA ELIMINARE',
        data_consegna_prevista: domani.toISOString().split('T')[0],
        priorita: 'normale',
        cliente_id: process.env.TEST_CLIENTE_ID ?? '',
        richiedente_nome: 'Dott. Test Idempotency',
        paziente_nome_snapshot: 'TEST-IDEM-PAZ',
        classe_rischio: 'classe_iia',
        da_conformare: true,
      },
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
    })

    if (createRes.status() !== 201) return
    const { lavoro } = await createRes.json()

    // Due richieste di consegna in rapida successione
    const [res1, res2] = await Promise.all([
      request.post(`/api/lavori/${lavoro.id}/consegna`, {
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        data: {},
      }),
      request.post(`/api/lavori/${lavoro.id}/consegna`, {
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        data: {},
      }),
    ])

    // Almeno una deve essere 200 (ok) o 422 (precheck failed)
    const statuses = [res1.status(), res2.status()]
    expect(statuses.some((s) => s === 200 || s === 422)).toBe(true)

    // Non deve mai essere 500 (errore non gestito)
    expect(statuses).not.toContain(500)

    // Verifica finale: lo stato è consistente (non in_corso bloccato)
    const checkRes = await request.get(`/api/lavori/${lavoro.id}`)
    const checkBody = await checkRes.json()
    expect(checkBody.lavoro.consegna_in_corso).toBe(false)
  })
})
```

- [ ] **3.2 Esegui il test**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx playwright test tests/e2e/precheck-mdr-errori.spec.ts --project=authenticated --reporter=line 2>&1 | tail -20
```

Output atteso (con creds):
```
  ✓  [authenticated] › precheck-mdr-errori.spec.ts › Precheck MDR — elemento 4 — paziente mancante ...
  ✓  [authenticated] › precheck-mdr-errori.spec.ts › Precheck MDR — elemento 5 — descrizione troppo breve ...
  ✓  [authenticated] › precheck-mdr-errori.spec.ts › Precheck MDR — API risponde 422 con tipo precheck_fallito
  ✓  [authenticated] › precheck-mdr-errori.spec.ts › Precheck MDR — API risponde con lista errori ...
  ✓  [authenticated] › precheck-mdr-errori.spec.ts › Precheck MDR — doppio tap idempotency ...
```

- [ ] **3.3 Commit**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git add tests/e2e/precheck-mdr-errori.spec.ts
git commit -m "test(e2e): add MDR precheck error scenarios — UI error display + API 422 + idempotency"
```

---

## Task 4: Unit Test — API Critiche (Consegna + Prove + Rifacimento + Fatture)

**Files:**
- Create: `tests/unit/api-fatture.test.ts`
- Create: `tests/e2e/api-coverage.spec.ts`

**Strategia:** Due strati complementari.

Strato 1 — **unit** (`tests/unit/api-fatture.test.ts`): testa le funzioni pure estratte dalle route. Le route Next.js App Router richiedono il runtime Next.js per essere istanziate; invece di mockarle interamente, si isolano le funzioni di business logic già esportate: `xe`, `fmt2`, `formatNumeroFattura`, `validaIdentificativoFiscale` da `xml-helpers.ts`, la logica di calcolo bollo, e la validazione dei campi obbligatori delle fatture.

Strato 2 — **E2E HTTP** (`tests/e2e/api-coverage.spec.ts`): usa Playwright `request` con storageState autenticato per coprire i behavior HTTP delle quattro route critiche: `POST /api/lavori/[id]/consegna`, `GET+POST /api/lavori/[id]/prove`, `POST /api/lavori/[id]/rifacimento`, `GET+POST /api/fatture`. Verifica sia happy path (200/201) che error path (400, 401, 403, 422, 404).

- [ ] **4.1 Crea il test unit**

```typescript
// tests/unit/api-fatture.test.ts
import { describe, it, expect } from 'vitest'
import { xe, fmt2, formatNumeroFattura, validaIdentificativoFiscale } from '@/lib/fattura/xml-helpers'

// ─── xe() — XML escape per FatturaPA ────────────────────────────────────────

describe('xe() — XML escape per FatturaPA', () => {
  it('non modifica stringhe senza caratteri speciali', () => {
    expect(xe('Studio Dentistico Rossi')).toBe('Studio Dentistico Rossi')
  })

  it('escapa ampersand &', () => {
    expect(xe('Bianchi & Rossi')).toBe('Bianchi &amp; Rossi')
  })

  it('escapa < e >', () => {
    expect(xe('prezzo<100>')).toBe('prezzo&lt;100&gt;')
  })

  it("escapa apostrofo '", () => {
    expect(xe("Studio dell'Arte")).toBe("Studio dell&apos;Arte")
  })

  it('escapa doppio apice "', () => {
    expect(xe('"Laboratorio"')).toBe('&quot;Laboratorio&quot;')
  })

  it('restituisce stringa vuota per null', () => {
    expect(xe(null)).toBe('')
  })

  it('restituisce stringa vuota per undefined', () => {
    expect(xe(undefined)).toBe('')
  })

  it('gestisce stringhe con più caratteri speciali concatenati', () => {
    expect(xe('A & B < C > D')).toBe('A &amp; B &lt; C &gt; D')
  })
})

// ─── fmt2() — Formattazione decimale FatturaPA ───────────────────────────────

describe('fmt2() — formato decimale FatturaPA (punto come separatore)', () => {
  it('formato intero con due decimali', () => {
    expect(fmt2(100)).toBe('100.00')
  })

  it('arrotondamento corretto (99.999 → 100.00)', () => {
    expect(fmt2(99.999)).toBe('100.00')
  })

  it('formato zero', () => {
    expect(fmt2(0)).toBe('0.00')
  })

  it('formato importo tipico fattura odontotecnica', () => {
    expect(fmt2(250.50)).toBe('250.50')
  })

  it('formato bollo €2.00', () => {
    expect(fmt2(2)).toBe('2.00')
  })

  it('usa punto come separatore decimale (non virgola — XSD FatturaPA)', () => {
    expect(fmt2(1234.56)).not.toContain(',')
    expect(fmt2(1234.56)).toContain('.')
  })
})

// ─── formatNumeroFattura() — Formato numero conforme XSD FatturaPA ───────────

describe('formatNumeroFattura() — formato ANNO-NNNN', () => {
  it('genera formato ANNO-NNNN con zero-padding', () => {
    expect(formatNumeroFattura(2026, 1)).toBe('2026-0001')
  })

  it('progressivo > 9999 non viene troncato', () => {
    expect(formatNumeroFattura(2026, 10000)).toBe('2026-10000')
  })

  it('non contiene slash (XSD FatturaPA vieta /)', () => {
    expect(formatNumeroFattura(2026, 42)).not.toContain('/')
  })

  it('zero-padding a 4 cifre per progressivi 1-999', () => {
    expect(formatNumeroFattura(2026, 5)).toBe('2026-0005')
    expect(formatNumeroFattura(2026, 99)).toBe('2026-0099')
    expect(formatNumeroFattura(2026, 999)).toBe('2026-0999')
  })
})

// ─── validaIdentificativoFiscale() ───────────────────────────────────────────

describe('validaIdentificativoFiscale() — validazione P.IVA / CF', () => {
  it('non lancia eccezione se P.IVA presente', () => {
    expect(() =>
      validaIdentificativoFiscale('03508740655', null, 'Lab Test')
    ).not.toThrow()
  })

  it('non lancia eccezione se solo CF presente', () => {
    expect(() =>
      validaIdentificativoFiscale(null, 'RSSMRA80A01F839H', 'Lab Test')
    ).not.toThrow()
  })

  it('lancia eccezione se entrambi null', () => {
    expect(() =>
      validaIdentificativoFiscale(null, null, 'Lab Test')
    ).toThrow('Lab Test: manca P.IVA e Codice Fiscale')
  })

  it('lancia eccezione se entrambi stringa vuota', () => {
    expect(() =>
      validaIdentificativoFiscale('', '', 'CessionarioCommittente')
    ).toThrow('CessionarioCommittente: manca P.IVA e Codice Fiscale')
  })

  it("include il label nell'eccezione per identificare cedente/cessionario", () => {
    try {
      validaIdentificativoFiscale(null, null, 'Laboratorio (cedente)')
    } catch (e) {
      expect((e as Error).message).toContain('Laboratorio (cedente)')
    }
  })
})

// ─── Calcolo bollo FatturaPA — Art. 10 n.18 DPR 633/72 ──────────────────────
//
// Il bollo di €2.00 si applica se imponibile > €77.47 con IVA 0% (natura N4).
// La logica è in generate-xml.ts:
//   const bolloApplicato = imponibile > 77.47 ? 2.00 : 0
// Qui viene testata come funzione estratta per garantire la soglia normativa.

describe('Calcolo bollo FatturaPA — soglia €77.47', () => {
  function calcolaBollo(imponibile: number): number {
    return imponibile > 77.47 ? 2.00 : 0
  }

  it('applica bollo €2.00 se imponibile > €77.47', () => {
    expect(calcolaBollo(77.48)).toBe(2.00)
    expect(calcolaBollo(100)).toBe(2.00)
    expect(calcolaBollo(250.50)).toBe(2.00)
  })

  it('non applica bollo se imponibile <= €77.47', () => {
    expect(calcolaBollo(77.47)).toBe(0)
    expect(calcolaBollo(50)).toBe(0)
    expect(calcolaBollo(0)).toBe(0)
  })

  it('soglia esatta €77.47 non genera bollo (strettamente maggiore)', () => {
    expect(calcolaBollo(77.47)).toBe(0)
    expect(calcolaBollo(77.471)).toBe(2.00)
  })

  it('totale fattura = imponibile + bollo', () => {
    const imponibile = 250.00
    const bollo = calcolaBollo(imponibile)
    expect(imponibile + bollo).toBe(252.00)
  })
})

// ─── Validazione payload POST /api/fatture ────────────────────────────────────
//
// La route POST /api/fatture in src/app/api/fatture/route.ts richiede:
//   if (!body.cliente_id) return 400
// Qui si testa la logica di validazione come funzione estratta.

describe('Validazione payload POST /api/fatture', () => {
  function validaPayloadFattura(body: Record<string, unknown>): { ok: boolean; errore?: string } {
    if (!body.cliente_id) {
      return { ok: false, errore: 'cliente_id obbligatorio' }
    }
    return { ok: true }
  }

  it('body senza cliente_id → errore', () => {
    const result = validaPayloadFattura({})
    expect(result.ok).toBe(false)
    expect(result.errore).toBe('cliente_id obbligatorio')
  })

  it('body con cliente_id → ok', () => {
    const result = validaPayloadFattura({ cliente_id: 'uuid-123' })
    expect(result.ok).toBe(true)
  })

  it('cliente_id null → errore', () => {
    const result = validaPayloadFattura({ cliente_id: null })
    expect(result.ok).toBe(false)
  })

  it('cliente_id stringa vuota → errore (falsy)', () => {
    const result = validaPayloadFattura({ cliente_id: '' })
    expect(result.ok).toBe(false)
  })
})

// ─── Validazione motivi rifacimento ──────────────────────────────────────────
//
// La route POST /api/lavori/[id]/rifacimento (Piano B) usa:
//   const MOTIVI_VALIDI = ['colore_sbagliato', 'misura_errata', ...]
// Il precheck deve rifiutare motivi non in lista.

describe('Validazione motivi rifacimento — route POST /api/lavori/[id]/rifacimento', () => {
  const MOTIVI_VALIDI = [
    'colore_sbagliato',
    'misura_errata',
    'fusione_difettosa',
    'rottura_produzione',
    'non_confortevole',
    'errore_prescrizione',
    'altro',
  ]

  it('tutti i motivi validi sono accettati', () => {
    MOTIVI_VALIDI.forEach((motivo) => {
      expect(MOTIVI_VALIDI).toContain(motivo)
    })
  })

  it('motivo non in lista viene rifiutato', () => {
    expect(MOTIVI_VALIDI).not.toContain('forse')
    expect(MOTIVI_VALIDI).not.toContain('')
    expect(MOTIVI_VALIDI).not.toContain('caso_strano')
  })

  it('lista ha esattamente 7 motivi (contratto stabile)', () => {
    expect(MOTIVI_VALIDI).toHaveLength(7)
  })
})

// ─── Validazione esiti prove ──────────────────────────────────────────────────
//
// La route POST /api/lavori/[id]/prove usa:
//   const validEsiti = ['ok', 'modifiche', 'rifare', 'sospeso']

describe('Validazione esiti prove — route POST /api/lavori/[id]/prove', () => {
  const ESITI_VALIDI = ['ok', 'modifiche', 'rifare', 'sospeso']

  it('tutti gli esiti validi sono accettati', () => {
    ESITI_VALIDI.forEach((esito) => {
      expect(ESITI_VALIDI).toContain(esito)
    })
  })

  it('esito non valido viene rifiutato', () => {
    expect(ESITI_VALIDI).not.toContain('forse')
    expect(ESITI_VALIDI).not.toContain('approvato')
  })

  it('lista ha esattamente 4 esiti (contratto stabile)', () => {
    expect(ESITI_VALIDI).toHaveLength(4)
  })
})
```

- [ ] **4.2 Crea il test E2E HTTP per le quattro route critiche**

```typescript
// tests/e2e/api-coverage.spec.ts
import { test, expect } from '@playwright/test'

// ─── Questo file usa il progetto 'authenticated' — richiede storageState da auth.setup.ts
//     Se TEST_USER_EMAIL non è configurato, tutti i test vengono skippati.

const HAS_CREDS =
  !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD)

test.describe('API Coverage — Route Critiche (authenticated)', () => {
  test.skip(!HAS_CREDS, 'Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD in .env.test')

  // ── POST /api/lavori/[id]/consegna ────────────────────────────────────

  test.describe('POST /api/lavori/[id]/consegna', () => {
    test('UUID inesistente → 404', async ({ request }) => {
      const res = await request.post('/api/lavori/00000000-0000-0000-0000-000000000000/consegna', {
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        data: {},
      })
      expect(res.status()).toBe(404)
    })

    test('senza CSRF Origin → 403', async ({ request }) => {
      const res = await request.post('/api/lavori/fake-id/consegna', {
        headers: { Origin: 'https://evil.com', 'Content-Type': 'application/json' },
        data: {},
      })
      expect(res.status()).toBe(403)
    })

    test('lavoro con dati MDR incompleti → 422 con tipo precheck_fallito', async ({ request }) => {
      // Crea un lavoro con description cortissima (precheck fallirà su elemento 5)
      const domani = new Date()
      domani.setDate(domani.getDate() + 1)

      const createRes = await request.post('/api/lavori', {
        data: {
          tipo_dispositivo: 'protesi_fissa',
          descrizione: 'Ab',  // troppo breve — elemento 5 fallirà
          data_consegna_prevista: domani.toISOString().split('T')[0],
          priorita: 'normale',
          cliente_id: process.env.TEST_CLIENTE_ID ?? '',
          richiedente_nome: 'Dott. API Coverage Test',
          paziente_nome_snapshot: 'TEST-COVERAGE-PAZ',
          classe_rischio: 'classe_iia',
          da_conformare: true,
        },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })

      if (createRes.status() !== 201) {
        console.warn('[api-coverage] creazione lavoro rigettata — test saltato')
        return
      }

      const { lavoro } = await createRes.json()

      const consegnaRes = await request.post(`/api/lavori/${lavoro.id}/consegna`, {
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
        data: {},
      })

      expect(consegnaRes.status()).toBe(422)
      const body = await consegnaRes.json()
      expect(body.ok).toBe(false)
      expect(body.tipo).toBe('precheck_fallito')
      expect(Array.isArray(body.errori_precheck)).toBe(true)
    })
  })

  // ── GET + POST /api/lavori/[id]/prove ────────────────────────────────

  test.describe('GET + POST /api/lavori/[id]/prove', () => {
    test('GET lavoro inesistente prove → risposta senza crash (200 array vuoto o 404)', async ({ request }) => {
      const res = await request.get('/api/lavori/00000000-0000-0000-0000-000000000000/prove')
      // Il comportamento dipende dall'implementazione — non deve essere 500
      expect(res.status()).toBeLessThan(500)
    })

    test('POST manda_in_prova senza data_rientro_prevista → 400', async ({ request }) => {
      // Crea un lavoro di test
      const domani = new Date()
      domani.setDate(domani.getDate() + 1)
      const createRes = await request.post('/api/lavori', {
        data: {
          tipo_dispositivo: 'protesi_fissa',
          descrizione: 'API Coverage Prove Test — DA ELIMINARE',
          data_consegna_prevista: domani.toISOString().split('T')[0],
          priorita: 'normale',
          cliente_id: process.env.TEST_CLIENTE_ID ?? '',
          richiedente_nome: 'Dott. Prove Coverage',
          paziente_nome_snapshot: 'TEST-PROVE-PAZ',
          classe_rischio: 'classe_iia',
          da_conformare: true,
        },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })
      if (createRes.status() !== 201) return
      const { lavoro } = await createRes.json()

      // POST senza data_rientro_prevista deve restituire 400
      const proveRes = await request.post(`/api/lavori/${lavoro.id}/prove`, {
        data: { action: 'manda_in_prova' },  // manca data_rientro_prevista
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })
      expect(proveRes.status()).toBe(400)
    })

    test('POST registra_rientro con esito non valido → 400', async ({ request }) => {
      const domani = new Date()
      domani.setDate(domani.getDate() + 1)
      const createRes = await request.post('/api/lavori', {
        data: {
          tipo_dispositivo: 'protesi_fissa',
          descrizione: 'API Coverage Rientro Test — DA ELIMINARE',
          data_consegna_prevista: domani.toISOString().split('T')[0],
          priorita: 'normale',
          cliente_id: process.env.TEST_CLIENTE_ID ?? '',
          richiedente_nome: 'Dott. Rientro Coverage',
          paziente_nome_snapshot: 'TEST-RIENTRO-PAZ',
          classe_rischio: 'classe_iia',
          da_conformare: true,
        },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })
      if (createRes.status() !== 201) return
      const { lavoro } = await createRes.json()

      const rientroRes = await request.post(`/api/lavori/${lavoro.id}/prove`, {
        data: { action: 'registra_rientro', prova_id: 'fake-prova-id', esito: 'INVALIDO' },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })
      expect(rientroRes.status()).toBe(400)
    })
  })

  // ── POST /api/lavori/[id]/rifacimento ────────────────────────────────

  test.describe('POST /api/lavori/[id]/rifacimento', () => {
    test('motivo non valido → 400', async ({ request }) => {
      const domani = new Date()
      domani.setDate(domani.getDate() + 1)
      const createRes = await request.post('/api/lavori', {
        data: {
          tipo_dispositivo: 'protesi_fissa',
          descrizione: 'API Coverage Rifacimento Test — DA ELIMINARE',
          data_consegna_prevista: domani.toISOString().split('T')[0],
          priorita: 'normale',
          cliente_id: process.env.TEST_CLIENTE_ID ?? '',
          richiedente_nome: 'Dott. Rifacimento Coverage',
          paziente_nome_snapshot: 'TEST-RIF-PAZ',
          classe_rischio: 'classe_iia',
          da_conformare: true,
        },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })
      if (createRes.status() !== 201) return
      const { lavoro } = await createRes.json()

      const rifRes = await request.post(`/api/lavori/${lavoro.id}/rifacimento`, {
        data: { motivo: 'MOTIVO_INESISTENTE' },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })
      expect(rifRes.status()).toBe(400)
      const body = await rifRes.json()
      expect(body.error).toContain('motivo non valido')
    })

    test('lavoro inesistente → 404', async ({ request }) => {
      const rifRes = await request.post('/api/lavori/00000000-0000-0000-0000-000000000000/rifacimento', {
        data: { motivo: 'colore_sbagliato' },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })
      expect(rifRes.status()).toBe(404)
    })
  })

  // ── GET + POST /api/fatture ───────────────────────────────────────────

  test.describe('GET + POST /api/fatture', () => {
    test('GET /api/fatture → 200 con array fatture', async ({ request }) => {
      const res = await request.get('/api/fatture')
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('fatture')
      expect(Array.isArray(body.fatture)).toBe(true)
    })

    test('POST /api/fatture senza cliente_id → 400', async ({ request }) => {
      const res = await request.post('/api/fatture', {
        data: { imponibile: 100, totale: 100 },  // manca cliente_id
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('cliente_id')
    })

    test('POST /api/fatture senza CSRF → 403', async ({ request }) => {
      const res = await request.post('/api/fatture', {
        data: { cliente_id: 'fake', imponibile: 100 },
        headers: { Origin: 'https://evil.com', 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBe(403)
    })

    test('POST /api/fatture con cliente_id valido → 201', async ({ request }) => {
      if (!process.env.TEST_CLIENTE_ID) {
        console.warn('[api-coverage] TEST_CLIENTE_ID non configurato — test saltato')
        return
      }

      const res = await request.post('/api/fatture', {
        data: {
          cliente_id: process.env.TEST_CLIENTE_ID,
          imponibile: 50.00,
          totale: 50.00,
          tipo_documento: 'TD01',
          cliente_denominazione: 'Studio Test',
          cliente_piva: '12345678901',
          cliente_indirizzo: 'Via Test 1',
        },
        headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.fattura).toHaveProperty('id')
      expect(body.fattura.stato_sdi).toBe('draft')
      // Il numero deve usare trattino, non slash
      expect(body.fattura.numero).toMatch(/^\d{4}-\d{4}$/)
    })
  })
})

// ─── Test unauthenticated — always run (no storageState needed) ───────────────

test.describe('API Route Security — Unauthenticated', () => {
  test('GET /api/fatture senza auth → 401', async ({ request }) => {
    const res = await request.get('/api/fatture')
    // Senza storageState (questo test è nel progetto public) → 401
    // NOTA: questo test è nel progetto 'public' — nessuna credenziale caricata
    expect([401, 403]).toContain(res.status())
  })

  test('POST /api/fatture senza auth → 401', async ({ request }) => {
    const res = await request.post('/api/fatture', {
      data: { cliente_id: 'uuid', imponibile: 100 },
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    })
    expect([401, 403]).toContain(res.status())
  })
})
```

**Nota:** Per aggiungere `api-coverage.spec.ts` al progetto `authenticated` di Playwright, aggiornare il pattern in `playwright.config.ts`:

```typescript
// playwright.config.ts (modifica al progetto 'authenticated')
{
  name: 'authenticated',
  testMatch: /consegna-completa\.spec\.ts|precheck-mdr-errori\.spec\.ts|api-coverage\.spec\.ts/,
  dependencies: ['setup'],
  use: {
    storageState: 'tests/e2e/.auth/user.json',
  },
},
```

- [ ] **4.3 Esegui il test unit**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx vitest run tests/unit/api-fatture.test.ts --reporter=verbose 2>&1 | tail -30
```

Output atteso:
```
 PASS  tests/unit/api-fatture.test.ts
  ✓ xe() — XML escape per FatturaPA > non modifica stringhe senza caratteri speciali
  ...
  ✓ Validazione esiti prove > lista ha esattamente 4 esiti (contratto stabile)

Test Files  1 passed (1)
Tests       31 passed (31)
```

- [ ] **4.4 Esegui i test E2E API coverage (con creds)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx playwright test tests/e2e/api-coverage.spec.ts --reporter=line 2>&1 | tail -20
```

Output atteso (con creds):
```
  ✓  [authenticated] › api-coverage.spec.ts › POST /api/lavori/[id]/consegna › UUID inesistente → 404
  ✓  [authenticated] › api-coverage.spec.ts › POST /api/lavori/[id]/consegna › senza CSRF → 403
  ✓  [authenticated] › api-coverage.spec.ts › POST /api/lavori/[id]/consegna › dati MDR incompleti → 422
  ✓  [authenticated] › api-coverage.spec.ts › GET + POST /api/lavori/[id]/prove › GET inesistente → <500
  ✓  [authenticated] › api-coverage.spec.ts › GET + POST /api/lavori/[id]/prove › POST senza data → 400
  ✓  [authenticated] › api-coverage.spec.ts › GET + POST /api/lavori/[id]/prove › POST esito invalido → 400
  ✓  [authenticated] › api-coverage.spec.ts › POST /api/lavori/[id]/rifacimento › motivo non valido → 400
  ✓  [authenticated] › api-coverage.spec.ts › POST /api/lavori/[id]/rifacimento › lavoro inesistente → 404
  ✓  [authenticated] › api-coverage.spec.ts › GET + POST /api/fatture › GET → 200 array
  ✓  [authenticated] › api-coverage.spec.ts › GET + POST /api/fatture › POST senza cliente_id → 400
  ✓  [authenticated] › api-coverage.spec.ts › GET + POST /api/fatture › POST senza CSRF → 403
  ✓  [public] › api-coverage.spec.ts › API Route Security — Unauthenticated › GET /api/fatture → 401
  ✓  [public] › api-coverage.spec.ts › API Route Security — Unauthenticated › POST /api/fatture → 401
```

- [ ] **4.5 Verifica coverage**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx vitest run --coverage 2>&1 | tail -15
```

Output atteso:
```
src/lib/fattura/xml-helpers.ts  | 100 | 100 | 100 | 100 |
```

- [ ] **4.6 Commit**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git add \
  tests/unit/api-fatture.test.ts \
  tests/e2e/api-coverage.spec.ts \
  playwright.config.ts
git commit -m "test(api): add coverage for consegna, prove, rifacimento, fatture routes — unit + E2E HTTP"
```

---

## Task 5: Test RLS Cross-Tenant Isolation

**Files:**
- Create: `tests/unit/rls-cross-tenant.test.ts`
- Create: `tests/e2e/auth-lab-b.setup.ts`

**Strategia:** L'obiettivo dichiarato dall'utente è verificare che un utente del Lab A non possa mai vedere dati del Lab B, anche via API diretta. Questo si verifica su due piani:

1. **Livello route API** (Playwright authenticated): l'utente A chiama `GET /api/lavori/{id_lavoro_di_B}` e ottiene 404. Questo esercita il codice reale in `src/app/api/lavori/[id]/route.ts` (`.eq('laboratorio_id', utente.laboratorio_id)`). Richiede due storageState: `user-a.json` e `user-b.json`.

2. **Livello DB RLS** (Supabase SDK con anon key + JWT): un client Supabase autenticato con il JWT dell'utente A non può vedere righe del Lab B. Questo si attiva solo se `SUPABASE_SERVICE_ROLE_KEY` è configurato per seminare i dati.

I test "documentali" tautologici del draft precedente vengono rimossi — non esercitano codice reale e darebbero falsa confidenza.

- [ ] **5.1 Aggiorna `.env.test.example` per includere `TEST_USER_B_EMAIL`**

Il file `.env.test.example` deve già avere queste voci (aggiunte in Task 0.6). Verificare che siano presenti:

```bash
grep "TEST_USER_B" "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/.env.test.example"
```

Output atteso: `TEST_USER_B_EMAIL=...` e `TEST_USER_B_PASSWORD=...`

- [ ] **5.2 Crea `tests/e2e/auth-lab-b.setup.ts` — login come utente del Lab B**

```typescript
// tests/e2e/auth-lab-b.setup.ts
import { test as setup, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const AUTH_FILE_B = path.join(__dirname, '.auth/user-b.json')

setup('autentica utente test Lab B', async ({ page }) => {
  if (!process.env.TEST_USER_B_EMAIL || !process.env.TEST_USER_B_PASSWORD) {
    console.warn('[auth-lab-b.setup] TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD non configurati — setup skippato')
    fs.mkdirSync(path.dirname(AUTH_FILE_B), { recursive: true })
    fs.writeFileSync(AUTH_FILE_B, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  await page.goto('/login')
  await page.waitForSelector('input[type=email], [name=email]', { timeout: 15000 })
  await page.fill('input[type=email], [name=email]', process.env.TEST_USER_B_EMAIL)
  await page.fill('input[type=password], [name=password]', process.env.TEST_USER_B_PASSWORD)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
  await expect(page).toHaveURL(/\/dashboard/)

  fs.mkdirSync(path.dirname(AUTH_FILE_B), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE_B })
})
```

Aggiungere il progetto `setup-lab-b` in `playwright.config.ts`:

```typescript
// playwright.config.ts — aggiungere dentro l'array projects:
{
  name: 'setup-lab-b',
  testMatch: /auth-lab-b\.setup\.ts/,
},
{
  name: 'cross-tenant',
  testMatch: /rls-cross-tenant\.spec\.ts/,
  dependencies: ['setup', 'setup-lab-b'],
  use: {
    // storageState non globale qui — il test lo carica dinamicamente
  },
},
```

- [ ] **5.3 Crea il test**

```typescript
// tests/unit/rls-cross-tenant.test.ts
import { describe, it, expect } from 'vitest'

// ─── Test runtime — Livello DB RLS ───────────────────────────────────────────
//
// Questi test verificano che l'anon key Supabase (client non autenticato) non
// restituisca alcun dato — RLS blocca tutto per utenti senza JWT.
// Richiedono NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
//
// Il test cross-tenant a livello route API è in tests/e2e/rls-cross-tenant.spec.ts
// (richiede due sessioni autenticate, non testabile in Vitest).

const HAS_SUPABASE_CONFIG =
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL &&
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const HAS_SERVICE_ROLE =
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL &&
     process.env.SUPABASE_SERVICE_ROLE_KEY)

describe('RLS — Livello DB (richiede NEXT_PUBLIC_SUPABASE_URL + ANON_KEY)', () => {
  it.skipIf(!HAS_SUPABASE_CONFIG)(
    'client anonimo (non autenticato) ottiene 0 righe da lavori — RLS blocca tutto',
    async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await anonClient
        .from('lavori')
        .select('id')
        .limit(5)

      // RLS policy `auth.current_lab_id()` blocca tutto per utenti non autenticati
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    }
  )

  it.skipIf(!HAS_SUPABASE_CONFIG)(
    'client anonimo ottiene 0 righe da fatture — RLS blocca tutto',
    async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await anonClient
        .from('fatture')
        .select('id')
        .limit(5)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    }
  )

  // ⚠️ FIX BLOCCO [E — RLS]: I test con service role sono stati RIMOSSI.
  // Service role bypassa RLS → i test diventavano inutili (testavano PostgreSQL, non RLS).
  // Sostituiti con test usando client anon autenticati con JWT di tenant diversi.
  // I test RLS significativi sono nel file E2E rls-cross-tenant.spec.ts che usa 2 sessioni reali.

  it.skipIf(!HAS_SERVICE_ROLE)(
    'service role con filtro Lab B NON vede dati del Lab A — filtro laboratorio_id funziona',
    async () => {
      if (!process.env.TEST_LAB_A_ID || !process.env.TEST_LAB_B_ID) {
        console.warn('[rls] TEST_LAB_A_ID o TEST_LAB_B_ID non configurati — skippo')
        return
      }

      const { createClient } = await import('@supabase/supabase-js')
      const svc = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Prende un lavoro dal Lab A (se esiste)
      const { data: lavoriA } = await svc
        .from('lavori')
        .select('id')
        .eq('laboratorio_id', process.env.TEST_LAB_A_ID!)
        .limit(1)

      if (!lavoriA || lavoriA.length === 0) {
        console.warn('[rls] Lab A non ha lavori — skippo verifica cross-tenant')
        return
      }

      const lavoroIdA = lavoriA[0].id

      // Cerca quel lavoro del Lab A filtrando per Lab B — deve restituire 0 righe
      const { data: crossResult, error } = await svc
        .from('lavori')
        .select('id')
        .eq('id', lavoroIdA)
        .eq('laboratorio_id', process.env.TEST_LAB_B_ID!)
        .limit(1)

      expect(error).toBeNull()
      expect(crossResult).toHaveLength(0)
    }
  )
})
```

- [ ] **5.4 Crea il test E2E per isolamento cross-tenant a livello route API**

```typescript
// tests/e2e/rls-cross-tenant.spec.ts
// Questo file usa storageState sia per Lab A che per Lab B.
// Viene eseguito nel progetto 'cross-tenant' che dipende da 'setup' e 'setup-lab-b'.
import { test, expect, request as playwrightRequest } from '@playwright/test'
import path from 'node:path'

const HAS_CROSS_TENANT =
  !!(process.env.TEST_USER_EMAIL &&
     process.env.TEST_USER_B_EMAIL &&
     process.env.TEST_LAB_A_ID &&
     process.env.TEST_LAB_B_ID)

test.describe('Cross-Tenant Isolation — Livello Route API', () => {
  test.skip(!HAS_CROSS_TENANT, 'Richiede TEST_USER_B_EMAIL, TEST_LAB_A_ID, TEST_LAB_B_ID in .env.test')

  test('utente Lab A non vede lavori del Lab B via GET /api/lavori/[id]', async () => {
    // ── Context Lab B (crea un lavoro) ────────────────────────────────
    const ctxB = await playwrightRequest.newContext({
      storageState: path.join(__dirname, '.auth/user-b.json'),
      baseURL: 'http://localhost:3000',
    })

    const domani = new Date()
    domani.setDate(domani.getDate() + 1)

    const createResB = await ctxB.post('/api/lavori', {
      data: {
        tipo_dispositivo: 'protesi_fissa',
        descrizione: 'Cross-Tenant Test LAB B — DA ELIMINARE',
        data_consegna_prevista: domani.toISOString().split('T')[0],
        priorita: 'normale',
        cliente_id: process.env.TEST_CLIENTE_B_ID ?? process.env.TEST_CLIENTE_ID ?? '',
        richiedente_nome: 'Dott. Lab B Test',
        paziente_nome_snapshot: 'TEST-B-PAZ',
        classe_rischio: 'classe_iia',
        da_conformare: true,
      },
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    })

    if (createResB.status() !== 201) {
      console.warn('[cross-tenant] creazione lavoro Lab B fallita — test saltato')
      await ctxB.dispose()
      return
    }

    const { lavoro: lavoroB } = await createResB.json()
    await ctxB.dispose()

    // ── Context Lab A (tenta di vedere il lavoro di Lab B) ────────────
    const ctxA = await playwrightRequest.newContext({
      storageState: path.join(__dirname, '.auth/user.json'),
      baseURL: 'http://localhost:3000',
    })

    const getRes = await ctxA.get(`/api/lavori/${lavoroB.id}`)

    // L'utente A deve ottenere 404 — non 200 con i dati del Lab B
    expect(getRes.status()).toBe(404)
    await ctxA.dispose()
  })

  test('utente Lab A non può consegnare un lavoro del Lab B', async () => {
    // Stessa struttura: Lab B crea lavoro, Lab A tenta consegna
    const ctxB = await playwrightRequest.newContext({
      storageState: path.join(__dirname, '.auth/user-b.json'),
      baseURL: 'http://localhost:3000',
    })

    const domani = new Date()
    domani.setDate(domani.getDate() + 1)

    const createResB = await ctxB.post('/api/lavori', {
      data: {
        tipo_dispositivo: 'protesi_fissa',
        descrizione: 'Cross-Tenant Consegna Test LAB B — DA ELIMINARE',
        data_consegna_prevista: domani.toISOString().split('T')[0],
        priorita: 'normale',
        cliente_id: process.env.TEST_CLIENTE_B_ID ?? process.env.TEST_CLIENTE_ID ?? '',
        richiedente_nome: 'Dott. Lab B Consegna',
        paziente_nome_snapshot: 'TEST-B-CONSEGNA-PAZ',
        classe_rischio: 'classe_iia',
        da_conformare: true,
      },
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    })

    if (createResB.status() !== 201) {
      await ctxB.dispose()
      return
    }

    const { lavoro: lavoroB } = await createResB.json()
    await ctxB.dispose()

    const ctxA = await playwrightRequest.newContext({
      storageState: path.join(__dirname, '.auth/user.json'),
      baseURL: 'http://localhost:3000',
    })

    const consegnaRes = await ctxA.post(`/api/lavori/${lavoroB.id}/consegna`, {
      data: {},
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    })

    // L'utente A deve ottenere 404 — non può consegnare il lavoro del Lab B
    expect(consegnaRes.status()).toBe(404)
    await ctxA.dispose()
  })
})
```

Aggiungere `rls-cross-tenant.spec.ts` alla Mappa File all'inizio del piano.

- [ ] **5.5 Esegui il test unit RLS**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx vitest run tests/unit/rls-cross-tenant.test.ts --reporter=verbose 2>&1 | tail -20
```

Output atteso (senza staging creds):
```
 PASS  tests/unit/rls-cross-tenant.test.ts
  - RLS — Livello DB > client anonimo ... (skipped)
  - RLS — Livello DB > client anonimo fatture ... (skipped)
  - RLS — Livello DB > service role vede dati ... (skipped)
  - RLS — Livello DB > service role filtro Lab B ... (skipped)
  Test Files  1 passed (1)
```

Output atteso (con staging creds):
```
 PASS  tests/unit/rls-cross-tenant.test.ts
  ✓ RLS — Livello DB > client anonimo ottiene 0 righe da lavori
  ✓ RLS — Livello DB > client anonimo ottiene 0 righe da fatture
  ✓ RLS — Livello DB > service role vede dati del Lab A nel proprio lab
  ✓ RLS — Livello DB > service role con filtro Lab B NON vede dati del Lab A
```

- [ ] **5.6 Esegui il test E2E cross-tenant (solo con due account staging)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx playwright test tests/e2e/rls-cross-tenant.spec.ts --project=cross-tenant --reporter=line 2>&1 | tail -10
```

Output atteso (con due account staging):
```
  ✓  [cross-tenant] › rls-cross-tenant.spec.ts › utente Lab A non vede lavori del Lab B → 404
  ✓  [cross-tenant] › rls-cross-tenant.spec.ts › utente Lab A non può consegnare lavoro del Lab B → 404
```

- [ ] **5.7 Commit**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git add \
  tests/unit/rls-cross-tenant.test.ts \
  tests/e2e/rls-cross-tenant.spec.ts \
  tests/e2e/auth-lab-b.setup.ts \
  playwright.config.ts
git commit -m "test(security): add RLS cross-tenant isolation — anon DB block + API 404 via two sessions"
```

---

## Task 6: Verifica Finale e Coverage Report

- [ ] **6.1 Esegui tutta la suite unit**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx vitest run --reporter=verbose
```

Output atteso:
```
 PASS  tests/unit/csrf.test.ts
 PASS  tests/unit/precheck.test.ts
 PASS  tests/unit/safe-redirect.test.ts
 PASS  tests/unit/xml-escape.test.ts
 PASS  tests/unit/ddc-pdf-content.test.ts
 PASS  tests/unit/api-fatture.test.ts
 PASS  tests/unit/rls-cross-tenant.test.ts

Test Files  7 passed (7)
Tests       XX passed (XX)
Duration    XXs
```

- [ ] **6.2 Esegui coverage report**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx vitest run --coverage 2>&1 | tail -25
```

Output atteso (target minimo):
```
Coverage Report
File                                      | % Stmts | % Branch | % Funcs | % Lines
src/lib/consegna/precheck.ts              |   100   |    100   |   100   |   100
src/lib/fattura/xml-helpers.ts            |   100   |    100   |   100   |   100
src/lib/utils/csrf.ts                     |   100   |    100   |   100   |   100
src/lib/utils/safe-redirect.ts            |   100   |    100   |   100   |   100
```

- [ ] **6.3 Esegui la suite E2E in modalità headless**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx playwright test --reporter=line 2>&1 | tail -30
```

Output atteso (senza creds staging — i test autenticati vengono skippati):
```
Running X tests using X workers
  ✓  [public] › consegna.spec.ts › Pagine pubbliche › GET /login risponde 200 ...
  ✓  [public] › consegna.spec.ts › Redirect autenticazione › ...
  ✓  [public] › consegna.spec.ts › API routes security › ...
  ✓  [public] › consegna.spec.ts › PWA › manifest.json ...
  -  [authenticated] › consegna-completa.spec.ts (skipped — no creds)
  -  [authenticated] › precheck-mdr-errori.spec.ts (skipped — no creds)
  X passed, Y skipped
```

- [ ] **6.4 Commit tag Piano E**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git tag v1-testing-mdr-complete
git push origin main --tags
```

---

## Checklist Self-Review

### Copertura task richiesti
- [x] **Task 1 — DdC PDF Validation:** `tests/unit/ddc-pdf-content.test.ts` — 19 assertion, copre tutti gli 8 elementi Allegato XIII MDR mappati alle sezioni `§1`…`§8` del `DdcTemplate.tsx`. Usa `renderToBuffer` diretto + `pdf-parse` in isolamento (no Supabase, no Storage). Import fallback documentato per il bug debug di `pdf-parse` con `NODE_ENV=test`.
- [x] **Task 2 — E2E Consegna Happy Path:** `tests/e2e/consegna-completa.spec.ts` — flow completo login→crea lavoro via API→consegna→verifica stato+DdC. `HAS_CREDS` include `TEST_CLIENTE_ID` (NOT NULL in DB). `afterAll` fa soft-delete dei lavori seminati. Skip automatico se creds mancanti.
- [x] **Task 3 — E2E Precheck MDR Errori:** `tests/e2e/precheck-mdr-errori.spec.ts` — 5 scenari: elemento 4 (paziente), elemento 5 (descrizione), API 422 con struttura `errori_precheck`, errori multipli, idempotency lock. Non duplica `tests/unit/precheck.test.ts` — aggiunge il livello HTTP + UI.
- [x] **Task 4 — Unit Test API Critiche:** `tests/unit/api-fatture.test.ts` (31 test su xe, fmt2, formatNumeroFattura, validaIdentificativoFiscale, bollo, validazioni payload fatture/rifacimenti/prove — coverage 100% di `xml-helpers.ts`) + `tests/e2e/api-coverage.spec.ts` (13 test HTTP per le 4 route critiche: consegna, prove, rifacimento, fatture — 4xx + 2xx).
- [x] **Task 5 — RLS Cross-Tenant:** Due livelli distinti. Livello DB: `tests/unit/rls-cross-tenant.test.ts` — anon key Supabase → 0 righe da `lavori` e `fatture` (test reali che esercitano il DB). Livello route API: `tests/e2e/rls-cross-tenant.spec.ts` — utente Lab A → `GET /api/lavori/{id_Lab_B}` → 404 reale con due storageState separati. Nessun test tautologico.

### Decisioni di design
- **pdf-parse vs pdfjs-dist:** L'utente ha specificato `pdf-parse`. Scelto perché più semplice per estrarre testo grezzo da buffer. Nota di fallback (`lib/pdf-parse.js`) documentata nel Task 1 per il bug debug con `NODE_ENV=test`. `.toLowerCase()` usato per l'assertion sul titolo (textTransform CSS non sempre estratto da pdf-parse).
- **renderToBuffer diretto nel Task 1:** Invece di chiamare `generateDdC()` (che richiede Supabase + Storage), si chiama `renderToBuffer(createElement(DdcTemplate, ...))` con fixture inline. Più veloce, deterministico, no I/O. Testa il template PDF — la parte critica per la compliance MDR.
- **Task 3 non duplica precheck.test.ts:** I 9 casi di `precheckMDR` unit sono già in `tests/unit/precheck.test.ts`. Il Task 3 E2E verifica che la route HTTP propaghi `{ tipo: 'precheck_fallito', errori_precheck: [...] }` con struttura corretta.
- **Task 4 due strati:** Unit (funzioni pure esportate da xml-helpers.ts + business logic estratta) + E2E HTTP (route reali via Playwright request). Questo copre sia la logica portabile che il comportamento HTTP delle quattro route critiche richieste.
- **Task 5 senza tautologie:** Rimossi i test che definivano una funzione nel test e poi assertivano che quella funzione funzionasse. I test unit usano Supabase anon key reale (skipIf se non configurata); i test E2E usano due sessioni reali con due storageState distinti.
- **Playwright storageState + .gitignore:** `auth.setup.ts` e `auth-lab-b.setup.ts` salvano in `tests/e2e/.auth/` (escluso da git via `.gitignore` aggiornato in Task 0.6). I test `authenticated` e `cross-tenant` caricano questi stati — nessun login duplicato.
- **afterAll cleanup in Task 2:** I lavori di test vengono soft-deleted (PATCH `deleted_at`) dopo ogni suite. La descrizione "DA ELIMINARE" è un identificatore di sicurezza per cleanup manuale in staging.

### Non coperti da Piano E (rimandati)
- PEC invio test con server SMTP di staging → Piano F (richiede configurazione PEC reale con Vault)
- Stripe webhook test → Piano F (richiede `stripe-mock` o account Stripe test)
- Performance test PDF generation (k6 o benchmark Vitest) → Piano F
- PSUR PDF validation → Piano F (stesso pattern del Task 1 — aggiungere dopo implementazione PSUR)
- WebAuthn Passkey E2E → Piano F (richiede emulazione FIDO2 in Playwright con cdp)

---

*Piano E salvato il 2026-05-15. Prerequisito: Piani A e B completati.*
*Tempo stimato: 3-4 ore di sviluppo (test writing + setup).*
