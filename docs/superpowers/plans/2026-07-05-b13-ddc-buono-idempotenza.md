# B13 (1/2) — Idempotenza DdC/Buono Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evitare che `orchestraConsegna` rigeneri un secondo file PDF orfano su Supabase Storage e un secondo numero progressivo sprecato (DdC e/o Buono) quando viene rieseguita dopo che un tentativo precedente aveva già generato con successo uno dei due documenti.

**Architecture:** Guard di idempotenza in apertura di `generateDdC()` e `generateBuono()`: se l'artefatto per quel `lavoro_id` esiste già, ritorna subito i valori esistenti senza bruciare un nuovo progressivo né scrivere su Storage. Per la DdC il controllo è una query su `dichiarazioni_conformita` (il recupero esistente su errore `23505` resta come rete di sicurezza per la race condition residua); per il Buono il controllo legge `lavoro.buono_pdf_url`, già caricato in memoria da `orchestraConsegna` Step 1 — zero query aggiuntive.

**Tech Stack:** TypeScript, Next.js 16, Supabase (client tipizzato via `getTypedServiceClient()`), Vitest.

## Global Constraints

- Nessuna migration DB necessaria — il vincolo `ddc_lavoro_unique UNIQUE (laboratorio_id, lavoro_id)` esiste già su `dichiarazioni_conformita` (migration `002_fase2_schema.sql:201`); le colonne `lavori.buono_pdf_url`/`lavori.buono_numero` esistono già nello schema DB.
- TDD rigoroso: ogni comportamento nuovo ha un test che fallisce PRIMA dell'implementazione.
- Verifica finale per ogni task: `npx tsc --noEmit` (zero errori) + `npx vitest run` (nessuna regressione sul baseline di 478 passed / 4 skipped).
- Commit atomico per task, messaggio in stile `fix(consegna): ...` o `test(consegna): ...` coerente con lo storico del repo.
- Non toccare il ramo non-MDR (`scarichi_magazzino`) di `traccia-materiali.ts` né la logica di `orchestraConsegna` stesso — invariati, fuori scope di questo piano (vedi spec, sezione "Fuori scope").

---

### Task 1: Aggiungere `buono_pdf_url`/`buono_numero` al tipo `Lavoro`

**Files:**
- Modify: `src/types/domain.ts:284`
- Modify: `tests/unit/helpers/pdf-fixtures.ts:122`
- Modify: `tests/unit/precheck.test.ts:53`
- Modify: `tests/unit/LavoroFormClient.fase.test.tsx:87`

**Interfaces:**
- Produces: `Lavoro.buono_pdf_url: string | null` e `Lavoro.buono_numero: string | null` (ereditati da `LavoroDettaglio`) — usati da Task 3 per il guard di idempotenza del Buono.

Questo task non introduce comportamento nuovo (solo un campo di tipo + fixture aggiornate), quindi non richiede un test dedicato: la verifica è che `tsc`/`vitest` restino verdi esattamente come oggi (nessuna regressione).

- [ ] **Step 1: Aggiungi i due campi all'interfaccia `Lavoro`**

In `src/types/domain.ts`, trova la riga 284 (`  impronta_digitale: boolean;`) all'interno di `export interface Lavoro {` e aggiungi subito dopo:

```typescript
  impronta_digitale: boolean;
  // Documenti generati alla consegna (B13 1/2 — idempotenza retry orchestraConsegna)
  buono_pdf_url: string | null;
  buono_numero: string | null;
```

- [ ] **Step 2: Aggiorna la fixture condivisa `LAVORO_FIXTURE`**

In `tests/unit/helpers/pdf-fixtures.ts`, trova la riga 122 (`  impronta_digitale: false,`) e aggiungi subito dopo:

```typescript
  impronta_digitale: false,
  buono_pdf_url: null,
  buono_numero: null,
```

- [ ] **Step 3: Aggiorna la fixture in `precheck.test.ts`**

In `tests/unit/precheck.test.ts`, trova la riga 53 (`    impronta_digitale: false,`) e aggiungi subito dopo (stessa indentazione, 4 spazi):

```typescript
    impronta_digitale: false,
    buono_pdf_url: null,
    buono_numero: null,
```

- [ ] **Step 4: Aggiorna la fixture in `LavoroFormClient.fase.test.tsx`**

In `tests/unit/LavoroFormClient.fase.test.tsx`, trova la riga 87 (`    impronta_digitale: false,`) e aggiungi subito dopo (stessa indentazione, 4 spazi):

```typescript
    impronta_digitale: false,
    buono_pdf_url: null,
    buono_numero: null,
```

- [ ] **Step 5: Verifica che non ci siano regressioni**

Run: `npx tsc --noEmit`
Expected: nessun errore (0 errori, come prima della modifica).

Run: `npx vitest run`
Expected: `478 passed | 4 skipped (482)` — stesso numero di prima, nessun test rotto.

- [ ] **Step 6: Commit**

```bash
git add src/types/domain.ts tests/unit/helpers/pdf-fixtures.ts tests/unit/precheck.test.ts tests/unit/LavoroFormClient.fase.test.tsx
git commit -m "$(cat <<'EOF'
feat(domain): aggiungi buono_pdf_url/buono_numero a Lavoro

Campi già presenti nello schema DB (scritti da generate-buono.ts) ma mai
esposti nel tipo applicativo. Prerequisito per il guard di idempotenza
del Buono (B13 1/2).
EOF
)"
```

---

### Task 2: Guard di idempotenza in `generateDdC()`

**Files:**
- Modify: `src/lib/pdf/generate-ddc.ts`
- Modify: `tests/unit/generate-ddc.test.ts`

**Interfaces:**
- Consumes: `Lavoro.buono_pdf_url`/`buono_numero` non richiesti qui (solo Task 3). Consuma `getTypedServiceClient()` (invariato) e `generaProgressivo()` da `@/lib/db/progressivi` (invariato).
- Produces: nessuna nuova interfaccia pubblica — `generateDdC(lavoro: LavoroDettaglio): Promise<{ numero: string; url: string }>` invariata nella firma, cambia solo il comportamento su retry.

- [ ] **Step 1: Rifattorizza i mock del test per supportare asserzioni sul numero di chiamate**

Sostituisci l'intera sezione di setup mock (righe 1-42) di `tests/unit/generate-ddc.test.ts` con:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert, mockUpload, mockGetPublicUrl, mockGeneraProgressivo } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockGeneraProgressivo: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}))

vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: mockGeneraProgressivo,
}))

import { generateDdC } from '../../src/lib/pdf/generate-ddc'

function mockTables(lab: typeof LAB_FIXTURE, ddcEsistente: { numero_ddc: string; pdf_url: string } | null = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') return createChain({ data: lab, error: null })
    if (table === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
    if (table === 'dichiarazioni_conformita') {
      const readChain = createChain({ data: ddcEsistente, error: null })
      return { ...readChain, insert: mockInsert }
    }
    throw new Error(`Tabella inattesa nel mock: ${table}`)
  })
}

describe('generateDdC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
  })
```

Tutti i test esistenti sotto questa riga restano invariati (usano ancora `mockTables(LAB_FIXTURE)` con un solo argomento, che di default significa "nessuna DdC esistente" — comportamento identico a prima).

- [ ] **Step 2: Esegui i test esistenti per verificare che il refactor non abbia rotto nulla**

Run: `npx vitest run tests/unit/generate-ddc.test.ts`
Expected: PASS — tutti i 6 test esistenti passano ancora (stesso comportamento, solo mock riorganizzati).

- [ ] **Step 3: Scrivi il test che riproduce il file orfano (RED)**

Aggiungi in fondo al blocco `describe('generateDdC', ...)`, prima della chiusura `})`:

```typescript

  it('seconda chiamata a generateDdC per lo stesso lavoro non rigenera (idempotenza retry)', async () => {
    mockTables(LAB_FIXTURE, { numero_ddc: 'DDC-2020-0042', pdf_url: 'https://example.test/ddc-esistente.pdf' })

    const result = await generateDdC(LAVORO_FIXTURE)

    expect(result).toEqual({ numero: 'DDC-2020-0042', url: 'https://example.test/ddc-esistente.pdf' })
    expect(mockGeneraProgressivo).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('regressione: race condition — guard non trova nulla, insert fallisce 23505, recupera la riga vincitrice', async () => {
    let selectCallCount = 0
    const winningRow = { numero_ddc: 'DDC-2026-0007', pdf_url: 'https://example.test/ddc-vincitrice.pdf' }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
      if (table === 'dichiarazioni_conformita') {
        return {
          select: () => {
            selectCallCount += 1
            // 1a chiamata = guard iniziale (nessuna riga), 2a = recupero post-23505 (riga vincitrice)
            return createChain(selectCallCount === 1 ? { data: null, error: null } : { data: winningRow, error: null })
          },
          insert: mockInsert,
        }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })

    const result = await generateDdC(LAVORO_FIXTURE)

    expect(result).toEqual({ numero: 'DDC-2026-0007', url: 'https://example.test/ddc-vincitrice.pdf' })
  })
```

- [ ] **Step 4: Esegui il test e verifica che il primo fallisca**

Run: `npx vitest run tests/unit/generate-ddc.test.ts -t "seconda chiamata a generateDdC"`
Expected: FAIL — `expect(mockGeneraProgressivo).not.toHaveBeenCalled()` fallisce perché il codice attuale non ha ancora nessun guard e chiama comunque `generaProgressivo`/`upload`/`insert`.

Il secondo test (regressione 23505) può già passare o fallire a seconda dello stato attuale del codice — non è il focus RED di questo step, verrà confermato al passo successivo insieme al primo.

- [ ] **Step 5: Implementa il guard in `generateDdC()`**

In `src/lib/pdf/generate-ddc.ts`, subito dopo la riga `const supabase = getTypedServiceClient()` (riga 11) e prima di `const anno = new Date().getFullYear()` (riga 12), aggiungi:

```typescript
export async function generateDdC(lavoro: LavoroDettaglio) {
  const supabase = getTypedServiceClient()

  // Idempotenza su retry di orchestraConsegna (B13 1/2): se la DdC per questo
  // lavoro esiste già (generata in un tentativo precedente), non rigenerare —
  // evita un secondo file su Storage e un secondo progressivo sprecato. Il
  // recupero su errore 23505 più sotto resta come rete di sicurezza per la
  // race condition residua (due richieste che superano entrambe questo guard).
  const { data: ddcEsistente } = await supabase
    .from('dichiarazioni_conformita')
    .select('numero_ddc, pdf_url')
    .eq('lavoro_id', lavoro.id)
    .maybeSingle()

  if (ddcEsistente) {
    return { numero: ddcEsistente.numero_ddc, url: ddcEsistente.pdf_url ?? '' }
  }

  const anno = new Date().getFullYear()
```

- [ ] **Step 6: Esegui i test e verifica che passino tutti (GREEN)**

Run: `npx vitest run tests/unit/generate-ddc.test.ts`
Expected: PASS — tutti gli 8 test (6 esistenti + 2 nuovi).

- [ ] **Step 7: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: `480 passed | 4 skipped (484)` (478 + 2 nuovi test di questo task, nessuna regressione).

- [ ] **Step 8: Commit**

```bash
git add src/lib/pdf/generate-ddc.ts tests/unit/generate-ddc.test.ts
git commit -m "$(cat <<'EOF'
fix(pdf): guard idempotenza in generateDdC su retry orchestraConsegna

Se la DdC per il lavoro esiste già, ritorna subito numero/url esistenti
invece di bruciare un nuovo progressivo e caricare un secondo file
orfano su Storage. Il recupero esistente su 23505 resta come rete di
sicurezza per la race condition residua (ora coperta da un test
dedicato, prima mai esercitata).
EOF
)"
```

---

### Task 3: Guard di idempotenza in `generateBuono()`

**Files:**
- Modify: `src/lib/pdf/generate-buono.ts`
- Modify: `tests/unit/generate-buono.test.ts`

**Interfaces:**
- Consumes: `Lavoro.buono_pdf_url: string | null` e `Lavoro.buono_numero: string | null` (da Task 1).
- Produces: nessuna nuova interfaccia pubblica — `generateBuono(lavoro: LavoroDettaglio): Promise<{ numero: string; url: string }>` invariata nella firma.

- [ ] **Step 1: Rifattorizza il mock di `generaProgressivo` per supportare asserzioni sul numero di chiamate**

In `tests/unit/generate-buono.test.ts`, sostituisci le righe 6-21 (blocco `vi.hoisted`/`vi.mock`) con:

```typescript
const { mockFrom, mockUpload, mockGetPublicUrl, mockGeneraProgressivo } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockGeneraProgressivo: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }) },
  }),
}))

vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: mockGeneraProgressivo,
}))
```

E nel `beforeEach` (righe 26-39), aggiungi l'inizializzazione del nuovo mock subito dopo `mockGetPublicUrl.mockReturnValue(...)`:

```typescript
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/buono.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'lavori') {
        return {
          update: () => ({ eq: () => ({ eq: async () => ({ count: 1, error: null }) }) }),
        }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })
```

- [ ] **Step 2: Esegui il test esistente per verificare che il refactor non abbia rotto nulla**

Run: `npx vitest run tests/unit/generate-buono.test.ts`
Expected: PASS — il test esistente (`genera un buono con dati completi`) passa ancora.

- [ ] **Step 3: Scrivi il test che riproduce il file orfano (RED)**

Aggiungi in fondo al blocco `describe('generateBuono', ...)`, prima della chiusura `})`:

```typescript

  it('non rigenera se lavoro.buono_pdf_url è già valorizzato (idempotenza retry)', async () => {
    const lavoroConBuono = {
      ...LAVORO_FIXTURE,
      buono_pdf_url: 'https://example.test/buono-esistente.pdf',
      buono_numero: 'BUO-2020-0042',
    }

    const result = await generateBuono(lavoroConBuono)

    expect(result).toEqual({ numero: 'BUO-2020-0042', url: 'https://example.test/buono-esistente.pdf' })
    expect(mockGeneraProgressivo).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
  })
```

- [ ] **Step 4: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/generate-buono.test.ts -t "non rigenera se lavoro.buono_pdf_url"`
Expected: FAIL — `expect(mockGeneraProgressivo).not.toHaveBeenCalled()` fallisce perché il codice attuale non ha ancora nessun guard e rigenera comunque.

- [ ] **Step 5: Implementa il guard in `generateBuono()`**

In `src/lib/pdf/generate-buono.ts`, subito dopo la riga `const supabase = getTypedServiceClient()` (riga 11) e prima di `const anno = new Date().getFullYear()` (riga 12), aggiungi:

```typescript
export async function generateBuono(lavoro: LavoroDettaglio) {
  const supabase = getTypedServiceClient()

  // Idempotenza su retry di orchestraConsegna (B13 1/2): se il buono per
  // questo lavoro è già stato generato in un tentativo precedente
  // (buono_pdf_url già valorizzato su lavori, caricato in memoria da
  // orchestraConsegna Step 1), non rigenerare — nessuna query aggiuntiva.
  if (lavoro.buono_pdf_url) {
    return { numero: lavoro.buono_numero ?? '', url: lavoro.buono_pdf_url }
  }

  const anno = new Date().getFullYear()
```

- [ ] **Step 6: Esegui i test e verifica che passino tutti (GREEN)**

Run: `npx vitest run tests/unit/generate-buono.test.ts`
Expected: PASS — entrambi i test (1 esistente + 1 nuovo).

- [ ] **Step 7: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: `481 passed | 4 skipped (485)` (480 del Task 2 + 1 nuovo test di questo task).

Run: `npx next build`
Expected: build completata senza errori (nessuna route toccata direttamente, ma verifica che il cambio di firma/comportamento nei generatori PDF non rompa la compilazione del bundle).

- [ ] **Step 8: Commit**

```bash
git add src/lib/pdf/generate-buono.ts tests/unit/generate-buono.test.ts
git commit -m "$(cat <<'EOF'
fix(pdf): guard idempotenza in generateBuono su retry orchestraConsegna

Se lavoro.buono_pdf_url è già valorizzato, ritorna subito numero/url
esistenti invece di bruciare un nuovo progressivo e caricare un secondo
file orfano su Storage — stesso pattern di generateDdC (B13 1/2).
EOF
)"
```

---

### Task 4: Verifica finale e aggiornamento memoria progetto

**Files:**
- Modify: `ua-app/memory/MEMORY.md`
- Modify: `ua-app/docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B13)
- Modify: `ua-app/memory/SESSION_ACTIVE.md`

Nessun nuovo codice in questo task — solo verifica end-to-end e aggiornamento della documentazione obbligatoria (BP-1, CLAUDE.md §0A).

- [ ] **Step 1: Verifica finale completa**

Run: `npx tsc --noEmit`
Expected: 0 errori.

Run: `npx vitest run`
Expected: `481 passed | 4 skipped (485)`.

Run: `npx next build`
Expected: build production pulita, nessun errore, manifest generato correttamente.

- [ ] **Step 2: Aggiorna `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`**

Nella sezione `### B13` (riga con la tabella di stato in cima al file, colonna Stato di B13), segna che la parte 1/2 è risolta: aggiungi una nota "✅ B13 (1/2, idempotenza DdC/Buono) risolto — vedi `memory/MEMORY.md` §0. B13 (2/2, webhook Stripe) resta aperto." Non toccare il testo narrativo della sezione B13 originale (resta valido per la parte 2/2 ancora aperta) — aggiungi la nota come paragrafo in coda alla sezione esistente.

- [ ] **Step 3: Aggiorna `memory/MEMORY.md`**

Aggiungi una nuova voce in testa al file (sopra l'ultima "Ultimo aggiornamento") che descrive: cosa era rotto (file PDF orfani + progressivo sprecato su retry di `orchestraConsegna`), causa (nessun controllo di esistenza prima di generare), fix applicato (guard in `generateDdC()`/`generateBuono()`), verifica (`487 passed | 4 skipped`, `tsc`/`next build` puliti), riferimento allo spec (`docs/superpowers/specs/2026-07-05-b13-ddc-buono-idempotenza-design.md`) e al piano (`docs/superpowers/plans/2026-07-05-b13-ddc-buono-idempotenza.md`). Specifica che B13 (2/2, webhook Stripe) resta come prossima priorità.

- [ ] **Step 4: Aggiorna `memory/SESSION_ACTIVE.md`**

Sostituisci il contenuto con un handoff sintetico (max 200 token per regola CLAUDE.md): B13 (1/2) completato e verificato, non ancora mergiato su `main` (se eseguito in worktree — vedi nota sotto), prossima priorità B13 (2/2).

- [ ] **Step 5: Commit della documentazione**

```bash
git add memory/MEMORY.md memory/SESSION_ACTIVE.md docs/roadmap/BACKLOG-TECNICO-2026-07-02.md
git commit -m "$(cat <<'EOF'
docs: aggiorna memoria progetto — B13 (1/2) idempotenza DdC/Buono completato

Fix verificato: tsc/vitest/next build puliti (481 passed/4 skipped).
Prossima priorità: B13 (2/2, webhook Stripe silent-fail).
EOF
)"
```

---

## Nota su isolamento (worktree)

Questo piano non richiede migration né tocca `orchestraConsegna` stesso — impatto contenuto a 2 file di produzione (`generate-ddc.ts`, `generate-buono.ts`) + 1 file di tipo + 3 fixture di test. Per coerenza con il workflow di progetto (FASE 5, `superpowers:using-git-worktrees`), eseguire comunque in un worktree isolato dedicato prima di proporre il merge su `main`.
