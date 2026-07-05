# B4 — Eliminazione `as any` nei generatori PDF MDR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare gli 11 cast `as any` nei generatori PDF MDR (`src/lib/pdf/*.ts`) sostituendoli con un helper di rendering isolato + `.overrideTypes<T>()` sulle query Supabase, aggiungere la validazione mancante sui dati DPA, e costruire da zero la copertura di test per le 8 funzioni generatrici (oggi a zero).

**Architecture:** Un helper unico `renderPdfDocument()` isola il cast boundary `createElement`→`renderToBuffer` (9 occorrenze → 1). Le query Supabase in `src/lib/pdf/*.ts` usano `.overrideTypes<T, {merge:false}>()` (non deprecato, zero effetto a runtime) per tipizzare `lab`/`cliente`/join senza toccare `getServiceClient()`. Fixture e mock di test condivisi in `tests/unit/helpers/` riducono la duplicazione tra gli 8 nuovi file di test.

**Tech Stack:** Next.js 16, TypeScript, `@react-pdf/renderer` v(installata), `@supabase/supabase-js` 2.105.4, Vitest.

## Global Constraints

- Zero `as any` residuo nei file `src/lib/pdf/*.ts` al termine del piano (grep di verifica in Task 13).
- `npx tsc --noEmit` pulito dopo ogni task.
- `npx vitest run` verde dopo ogni task (nessuna regressione sui test esistenti).
- NON toccare `src/lib/supabase/server-service.ts` (`getServiceClient()`) — fuori scope per decisione esplicita (vedi spec).
- NON toccare i cast `as unknown as LavoroDettaglio` in `generate-etichetta.ts`/`generate-ricevuta-consegna.ts` — non sono `as any`, fuori scope.
- Ogni commit segue il formato del progetto: `fix(pdf): ...` / `test(pdf): ...` / `refactor(pdf): ...`.
- Spec di riferimento: `docs/superpowers/specs/2026-07-05-b4-pdf-generators-type-safety-design.md`.

---

### Task 1: Campo mancante `testo_rischi_default` in `Laboratorio`

**Files:**
- Modify: `src/types/domain.ts` (interfaccia `Laboratorio`, righe 8-40)
- Modify: `tests/unit/ddc-pdf-content.test.ts` (fixture `LAB_FIXTURE`, riga ~20-50)

**Interfaccia risultante di `Laboratorio` — task successivi la useranno così com'è:**
- Nuovo campo: `testo_rischi_default: string | null`

- [ ] **Step 1: Aggiungi il campo mancante a `Laboratorio`**

In `src/types/domain.ts`, dentro `export interface Laboratorio { ... }`, subito prima della riga `piano: 'freemium' | 'solo' | 'lab' | 'studio';`, aggiungi:

```typescript
  // Testo generico rischi residui, fallback quando manca una riga specifica
  // in rischi_tipo_dispositivo per il tipo di dispositivo (vedi generate-ddc.ts)
  testo_rischi_default: string | null;
```

- [ ] **Step 2: Verifica che `tsc` segnali l'unico punto rotto**

Run: `npx tsc --noEmit`

Expected: errore in `tests/unit/ddc-pdf-content.test.ts` sulla riga dell'oggetto `LAB_FIXTURE` — `Property 'testo_rischi_default' is missing in type...` (questo è l'unico literal `Laboratorio` in tutto il repo, verificato con `grep -rln ": Laboratorio = {" src tests`).

- [ ] **Step 3: Aggiorna la fixture per matchare il tipo**

In `tests/unit/ddc-pdf-content.test.ts`, dentro `const LAB_FIXTURE: Laboratorio = { ... }`, subito dopo la riga `piano: 'lab',`, aggiungi:

```typescript
  testo_rischi_default: null,
```

- [ ] **Step 4: Verifica che tsc sia pulito e i test invariati**

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts`
Expected: tutti i test PASS (comportamento invariato — `testo_rischi_default` non è letto da `DdcTemplate`, solo da `generateDdC()` che non è testata da questo file).

- [ ] **Step 5: Commit**

```bash
git add src/types/domain.ts tests/unit/ddc-pdf-content.test.ts
git commit -m "fix(pdf): aggiungi campo mancante testo_rischi_default a Laboratorio

Il campo esiste nel DB (database.types.ts) ma non era mai stato
propagato al tipo applicativo — causa del cast (lab as any) in
generate-ddc.ts, rimosso in un task successivo."
```

---

### Task 2: Helper `renderPdfDocument` — isola il cast boundary

**Files:**
- Create: `src/lib/pdf/render-document.ts`
- Test: `tests/unit/render-document.test.ts`

**Interfaces:**
- Produces: `renderPdfDocument(element: ReactElement<unknown>): Promise<Buffer>` — usata da tutti i task successivi (3-10) al posto di `renderToBuffer(createElement(...) as any)`.

- [ ] **Step 1: Scrivi il test**

```typescript
// tests/unit/render-document.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { Document, Page, Text } from '@react-pdf/renderer'
import { renderPdfDocument } from '@/lib/pdf/render-document'

describe('renderPdfDocument', () => {
  it('produce un buffer PDF valido da un ReactElement <Document>', async () => {
    const element = createElement(
      Document,
      {},
      createElement(Page, {}, createElement(Text, {}, 'test'))
    )
    const buffer = await renderPdfDocument(element)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('%PDF')
  })
})
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run tests/unit/render-document.test.ts`
Expected: FAIL — `Cannot find module '@/lib/pdf/render-document'` (il file non esiste ancora).

- [ ] **Step 3: Crea l'helper**

```typescript
// src/lib/pdf/render-document.ts
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

// react-pdf tipizza renderToBuffer su ReactElement<DocumentProps>, ma i
// nostri template accettano props applicative (lavoro/lab/...) e rendono
// un <Document> internamente — il cast è inevitabile al confine, isolato
// qui in un solo punto invece che ripetuto in ogni generatore.
export function renderPdfDocument(element: ReactElement<unknown>): Promise<Buffer> {
  return renderToBuffer(element as unknown as ReactElement<DocumentProps>)
}
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run tests/unit/render-document.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/render-document.ts tests/unit/render-document.test.ts
git commit -m "feat(pdf): aggiungi renderPdfDocument, cast boundary isolato

Sostituisce renderToBuffer(createElement(...) as any) ripetuto in 9
punti su 8 file con un unico helper documentato."
```

---

### Task 3: Estendi il mock di query-chain condiviso

**Files:**
- Modify: `tests/unit/helpers/supabase-chain-mock.ts`

**Interfaces:**
- Produces: `createChain(result)` ora supporta anche `.single()`, `.maybeSingle()` (risolvono `result`), `.overrideTypes()`, `.not()`, `.gte()`, `.lt()` (passthrough) — usati dai task 5-12.
- Comportamento esistente (`select`, `eq`, `is`, `or`, `order`, `limit`, `.then`) invariato — modifica puramente additiva.

- [ ] **Step 1: Estendi `createChain`**

Sostituisci il contenuto di `tests/unit/helpers/supabase-chain-mock.ts` con:

```typescript
export interface ChainCall {
  method: string
  args: unknown[]
}

export interface MockChain {
  calls: ChainCall[]
  [method: string]: unknown
}

/**
 * Mock di una query-chain Supabase (`.select().eq().is().or()...`) che
 * registra ogni chiamata con i suoi argomenti in `chain.calls`, per poter
 * asserire nei test che lo scoping tenant (`.eq('laboratorio_id', labId)`)
 * o il filtro di ricerca (`.or(...)`) siano stati invocati con i valori
 * esatti attesi — non solo che la route risponda con lo status corretto.
 *
 * `single`/`maybeSingle` risolvono direttamente `result` (terminano la
 * chain, come nel client reale). `overrideTypes`/`not`/`gte`/`lt` sono
 * passthrough (nessun runtime da simulare, solo tipizzazione o filtri
 * aggiuntivi che il mock non deve validare).
 */
export function createChain(result: { data: unknown; error: unknown }): MockChain {
  const calls: ChainCall[] = []
  const passthroughMethods = [
    'select', 'eq', 'is', 'or', 'order', 'limit', 'not', 'gte', 'lt', 'overrideTypes',
  ] as const
  const resolvingMethods = ['single', 'maybeSingle'] as const
  const c: MockChain = { calls }
  for (const m of passthroughMethods) {
    c[m] = (...args: unknown[]) => {
      calls.push({ method: m, args })
      return c
    }
  }
  for (const m of resolvingMethods) {
    c[m] = async (...args: unknown[]) => {
      calls.push({ method: m, args })
      return result
    }
  }
  c.then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}
```

- [ ] **Step 2: Verifica che nessun test esistente sia rotto (regressione)**

Run: `npx vitest run`
Expected: stesso numero di test PASS di prima della modifica (l'estensione è additiva, nessun metodo esistente cambia comportamento).

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/helpers/supabase-chain-mock.ts
git commit -m "test(pdf): estendi createChain con single/maybeSingle/overrideTypes

Aggiunta additiva (nessun metodo esistente modificato) per supportare
le query dei generatori PDF nei task successivi."
```

---

### Task 4: Fixture PDF condivise

**Files:**
- Create: `tests/unit/helpers/pdf-fixtures.ts`
- Modify: `tests/unit/ddc-pdf-content.test.ts`

**Interfaces:**
- Produces: `LAB_FIXTURE: Laboratorio`, `CLIENTE_FIXTURE: Cliente`, `LAVORO_FIXTURE: LavoroDettaglio` — usate dai task 5-12.

- [ ] **Step 1: Crea il file di fixture condivise**

Estrai `LAB_FIXTURE`, il `cliente` inline di `LAVORO_FIXTURE` (come `CLIENTE_FIXTURE` standalone) e `LAVORO_FIXTURE` da `tests/unit/ddc-pdf-content.test.ts` (righe 20-246) in un nuovo file:

```typescript
// tests/unit/helpers/pdf-fixtures.ts
import type { Cliente, Laboratorio, LavoroDettaglio } from '@/types/domain'

export const LAB_FIXTURE: Laboratorio = {
  id: 'lab-test-001',
  nome: 'Lab Opromolla',
  ragione_sociale: 'Laboratorio Odontotecnico Opromolla S.r.l.',
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
  piano: 'lab',
  testo_rischi_default: null,
}

export const CLIENTE_FIXTURE: Cliente = {
  id: 'cli-001',
  laboratorio_id: 'lab-test-001',
  studio_nome: null,
  nome: 'Mario',
  cognome: 'Rossi',
  telefono: null,
  email: null,
  partita_iva: null,
  codice_fiscale: null,
  codice_sdi: null,
  pec: null,
  indirizzo: null,
  cap: null,
  citta: null,
  provincia: null,
  paese: 'IT',
  listino_numero: 1,
  sconto_percentuale: 0,
  tecnico_default_id: null,
  modalita_pagamento: null,
  non_soggetto_fe: false,
  portale_token: 'tok-test-001',
  note: null,
}

export const LAVORO_FIXTURE: LavoroDettaglio = {
  id: 'lav-test-001',
  laboratorio_id: 'lab-test-001',
  numero_lavoro: 'LAV-2026-0001',
  consegna_in_corso: false,
  anno_lavoro: 2026,
  codice_interno: null,
  numero_prescrizione: null,
  numero_cassetta: null,
  cliente_id: 'cli-001',
  paziente_id: null,
  tecnico_id: null,
  ciclo_id: null,
  paziente_nome_snapshot: 'M.R.',
  paziente_nascita_snapshot: null,
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona ceramica su impianto elemento 14 colore A2',
  note_interne: null,
  richiedente_nome: null,
  richiedente_email: null,
  colore_dente: 'A2',
  colore_collo: null,
  colore_corpo: null,
  colore_incisale: null,
  effetti_speciali: null,
  tecnica_colore: null,
  colorazione_esterna: null,
  denti_coinvolti: ['14'],
  denti_mancanti: null,
  denti_impianti: null,
  tipo_arco: null,
  arcata: null,
  anamnesi_note: null,
  anamnesi_bruxismo: false,
  anamnesi_precauzioni: null,
  anamnesi_altri_dispositivi: null,
  tipo_impronte: null,
  disinfettante_usato: null,
  lotto_disinfettante: null,
  materiali_allegati: [],
  tracciabilita_materiali_ok: false,
  materiali_incompleti_dettaglio: null,
  anamnesi_difficolta_manuali: false,
  classe_rischio: 'classe_iia',
  norma_riferimento: null,
  da_conformare: true,
  dispositivo_semilavorato: false,
  stato: 'pronto',
  priorita: 'normale',
  data_ingresso: '2026-05-10T08:00:00.000Z',
  data_consegna_prevista: '2026-05-15T00:00:00.000Z',
  ora_consegna: null,
  data_prima_prova: null,
  data_seconda_prova: null,
  data_terza_prova: null,
  data_consegna_effettiva: null,
  file_stl_url: null,
  immagini_urls: null,
  impronta_digitale: false,
  listino_id: null,
  prezzo_unitario: null,
  codice_iva: 'N4',
  natura_iva: 'N4',
  incluso_in_fattura: false,
  decisione_fatturazione: 'in_attesa',
  conformato: false,
  data_conformazione: null,
  is_rifacimento: false,
  consegna_tap_at: null,
  consegna_completata_at: null,
  post_consegna_correzioni: 0,
  consegna_precheck_passato_al_primo_tentativo: null,
  spedizione_corriere: null,
  spedizione_tracking: null,
  spedizione_stato: null,
  spedizione_data_prevista: null,
  spedizione_note: null,
  segnalazione_tipo: null,
  segnalazione_nota: null,
  segnalazione_at: null,
  segnalazione_by: null,
  segnalazione_risolta: false,
  created_at: '2026-05-10T08:00:00.000Z',
  updated_at: '2026-05-10T08:00:00.000Z',
  deleted_at: null,
  cliente: CLIENTE_FIXTURE,
  paziente: null,
  tecnico: null,
  lavorazioni: [],
  appuntamenti: [],
  immagini: [],
  fasi: [],
  materiali: [
    {
      id: 'mat-001',
      laboratorio_id: 'lab-test-001',
      lavoro_id: 'lav-test-001',
      lotto_id: 'lot-001',
      magazzino_id: 'mag-001',
      quantita_usata: 1,
      unita_misura: 'pz',
      data_uso: '2026-05-12T00:00:00.000Z',
      numero_lotto_snapshot: 'LOT-2025-ZR-0042',
      nome_materiale_snapshot: 'Zirconia IPS e.max ZirCAD',
      produttore_snapshot: 'Ivoclar Vivadent',
    },
  ],
  ddc: null,
  laboratorio: null,
}
```

- [ ] **Step 2: Aggiorna `ddc-pdf-content.test.ts` per usare le fixture condivise**

In `tests/unit/ddc-pdf-content.test.ts`:
1. Rimuovi le definizioni inline di `LAB_FIXTURE` (righe ~20-50) e `LAVORO_FIXTURE` (righe ~112-246) — **mantieni** `DDC_FIXTURE` inline (specifica di questo test, non riusata altrove).
2. Aggiungi l'import: `import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'`
3. Nell'oggetto `LAVORO_FIXTURE` importato, il campo `cliente` punta già a `CLIENTE_FIXTURE` (stesso valore di prima — nessuna differenza di contenuto).
4. Sostituisci ogni `import { renderToBuffer } from '@react-pdf/renderer'` + `renderToBuffer(element as any)` (righe 260, 276) con `import { renderPdfDocument } from '@/lib/pdf/render-document'` + `renderPdfDocument(element)`.

- [ ] **Step 3: Verifica che i test siano invariati**

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts`
Expected: tutti i test PASS, stesso numero di prima (24 test) — nessun cambiamento di comportamento, solo estrazione + uso dell'helper.

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/helpers/pdf-fixtures.ts tests/unit/ddc-pdf-content.test.ts
git commit -m "test(pdf): estrai fixture PDF condivise, riusate dagli 8 generatori

LAB_FIXTURE/CLIENTE_FIXTURE/LAVORO_FIXTURE evitano di duplicare ~200
righe di fixture in ogni nuovo file di test dei generatori."
```

---

### Task 5: Fix `generate-dpa.ts` — validazione + cast

> **⚠️ Revisione post-implementazione:** questo task ora crea anche `src/lib/pdf/typed-service-client.ts` (Step 0, sotto) — un helper condiviso usato da tutti i task successivi (6-12) — perché la tecnica `.overrideTypes<T,{merge:false}>()` per-query descritta nella prima stesura di questo piano **non compila** su un client Supabase senza generic `<Database>` (verificato con `tsc` reale: l'errore è strutturale, non di sintassi — `.single()` su un client non tipizzato non restringe `Result` da array a singolo oggetto a livello di tipo, quindi `overrideTypes` la rifiuta). La tecnica corretta — cast del CLIENT una volta per file, non della query — è descritta nello spec aggiornato (`docs/superpowers/specs/2026-07-05-b4-pdf-generators-type-safety-design.md`, Parte 2).

**Files:**
- Create: `src/lib/pdf/typed-service-client.ts`
- Modify: `src/lib/pdf/generate-dpa.ts`
- Modify: `tests/unit/helpers/pdf-fixtures.ts` (fix `CLIENTE_FIXTURE`, vedi Step 1)
- Test: `tests/unit/generate-dpa.test.ts`

**Interfaces:**
- Consumes: `LAB_FIXTURE`, `CLIENTE_FIXTURE` da `./helpers/pdf-fixtures`; `createChain` da `./helpers/supabase-chain-mock`.
- Produces: `getTypedServiceClient(): SupabaseClient<Database>` — usata da tutti i task successivi (6-12) al posto di `getServiceClient()` in ogni generatore. `generateDpa(laboratorio_id, cliente_id): Promise<Buffer>` (firma invariata) ora valida i dati fiscali prima di renderizzare.

- [ ] **Step 0: Crea l'helper `getTypedServiceClient`**

```typescript
// src/lib/pdf/typed-service-client.ts
import 'server-only'
import { getServiceClient } from '@/lib/supabase/server-service'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// getServiceClient() non porta il generic <Database> (fix strutturale del
// client condiviso, usato da 147 file, esplicitamente fuori scope — vedi
// spec B4). Questo cast locale rende tipizzate sullo schema reale le query
// nei generatori PDF, senza toccare il client condiviso: .select('*') e i
// join restituiscono i tipi veri delle colonne invece di un `any` implicito.
export function getTypedServiceClient(): SupabaseClient<Database> {
  return getServiceClient() as SupabaseClient<Database>
}
```

Nessun test dedicato per questo helper (è un cast puro, zero logica — la sua correttezza è verificata indirettamente da ogni generatore che lo consuma, a partire da questo stesso task).

- [ ] **Step 1: Correggi `CLIENTE_FIXTURE` (fixture condivisa, bug scoperto in questo task)**

`CLIENTE_FIXTURE` (creata in Task 4) ha sia `partita_iva: null` sia `codice_fiscale: null` — con la validazione aggiunta in questo task, il test "smoke" con dati completi (Step 2 sotto) fallirebbe sempre, perché il cliente della fixture non ha nessun identificativo fiscale. In `tests/unit/helpers/pdf-fixtures.ts`, cambia:

```typescript
  codice_fiscale: null,
```
(dentro `CLIENTE_FIXTURE`) in:
```typescript
  codice_fiscale: 'RSSMRA80A01H703X',
```

Questo non tocca `ddc-pdf-content.test.ts` (non legge `codice_fiscale` del cliente).

- [ ] **Step 2: Scrivi il test smoke (contro il codice attuale)**

```typescript
// tests/unit/generate-dpa.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, CLIENTE_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateDpa } from '../../src/lib/pdf/generate-dpa'

function mockTables(lab: typeof LAB_FIXTURE, cliente: typeof CLIENTE_FIXTURE) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') return createChain({ data: lab, error: null })
    if (table === 'clienti') return createChain({ data: cliente, error: null })
    throw new Error(`Tabella inattesa nel mock: ${table}`)
  })
}

describe('generateDpa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('genera una DPA con dati fiscali completi', async () => {
    mockTables(LAB_FIXTURE, CLIENTE_FIXTURE)
    const buffer = await generateDpa('lab-test-001', 'cli-001')
    expect(buffer.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Verifica che passi contro il codice attuale**

Run: `npx vitest run tests/unit/generate-dpa.test.ts`
Expected: PASS (il codice attuale funziona già, questo test stabilisce solo la prima copertura mai scritta per questo file).

- [ ] **Step 4: Aggiungi il test di validazione (RED)**

Aggiungi al blocco `describe`:

```typescript
  it('rifiuta se il laboratorio non ha né Partita IVA né Codice Fiscale', async () => {
    mockTables({ ...LAB_FIXTURE, partita_iva: null, codice_fiscale: null }, CLIENTE_FIXTURE)
    await expect(generateDpa('lab-test-001', 'cli-001')).rejects.toThrow(
      'DPA: laboratorio privo di Partita IVA e Codice Fiscale'
    )
  })

  it('rifiuta se il cliente non ha né Partita IVA né Codice Fiscale', async () => {
    mockTables(LAB_FIXTURE, { ...CLIENTE_FIXTURE, partita_iva: null, codice_fiscale: null })
    await expect(generateDpa('lab-test-001', 'cli-001')).rejects.toThrow(
      'DPA: cliente privo di Partita IVA e Codice Fiscale'
    )
  })
```

Run: `npx vitest run tests/unit/generate-dpa.test.ts`
Expected: FAIL sui 2 nuovi test — `generateDpa` attuale non lancia mai (i campi nulli vengono solo passati al template senza controllo).

- [ ] **Step 5: Implementa `validateDpaData` + rimuovi i cast**

Sostituisci `src/lib/pdf/generate-dpa.ts` con:

```typescript
import 'server-only'
import { createElement } from 'react'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { DpaTemplate } from '@/components/features/pdf/DpaTemplate'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import type { Laboratorio, Cliente } from '@/types/domain'

function validateDpaData(lab: Laboratorio, cliente: Cliente): void {
  if (!lab.partita_iva && !lab.codice_fiscale) {
    throw new Error('DPA: laboratorio privo di Partita IVA e Codice Fiscale')
  }
  if (!cliente.partita_iva && !cliente.codice_fiscale) {
    throw new Error('DPA: cliente privo di Partita IVA e Codice Fiscale')
  }
}

export async function generateDpa(laboratorio_id: string, cliente_id: string): Promise<Buffer> {
  const svc = getTypedServiceClient()

  const [{ data: labRaw }, { data: clienteRaw }] = await Promise.all([
    svc.from('laboratori').select('*').eq('id', laboratorio_id).single(),
    svc.from('clienti').select('*').eq('id', cliente_id).eq('laboratorio_id', laboratorio_id).single(),
  ])

  if (!labRaw) throw new Error('Laboratorio non trovato')
  if (!clienteRaw) throw new Error('Cliente non trovato')

  // Cast puntuale sul risultato: lo schema reale tipizza alcune colonne enum
  // (es. laboratori.piano, clienti.listino_numero) come stringa/numero generico
  // invece delle union letterali di domain.ts — la query stessa resta type-safe
  // sullo schema (typo sulle colonne vengono comunque intercettati da tsc).
  const lab = labRaw as Laboratorio
  const cliente = clienteRaw as Cliente

  validateDpaData(lab, cliente)

  const numero_dpa = `DPA-${new Date().getFullYear()}-${cliente_id.slice(0, 8).toUpperCase()}`

  const dpa = {
    lab: {
      ragione_sociale: lab.ragione_sociale,
      nome: lab.nome,
      partita_iva: lab.partita_iva,
      codice_fiscale: lab.codice_fiscale,
      indirizzo: lab.indirizzo,
      cap: lab.cap,
      citta: lab.citta,
      provincia: lab.provincia,
      prrc_nome: lab.prrc_nome,
      codice_itca: lab.codice_itca,
    },
    cliente: {
      studio_nome: cliente.studio_nome,
      nome: cliente.nome,
      cognome: cliente.cognome,
      partita_iva: cliente.partita_iva,
      codice_fiscale: cliente.codice_fiscale,
      indirizzo: cliente.indirizzo,
      cap: cliente.cap,
      citta: cliente.citta,
      provincia: cliente.provincia,
    },
    numero_dpa,
    data_emissione: new Date().toISOString(),
  }

  return renderPdfDocument(createElement(DpaTemplate, { dpa }))
}
```

- [ ] **Step 6: Verifica che tutti i test passino**

Run: `npx vitest run tests/unit/generate-dpa.test.ts`
Expected: 3/3 PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `grep -n "as any" src/lib/pdf/generate-dpa.ts`
Expected: nessun risultato.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pdf/typed-service-client.ts src/lib/pdf/generate-dpa.ts tests/unit/generate-dpa.test.ts tests/unit/helpers/pdf-fixtures.ts
git commit -m "fix(pdf): elimina as any e valida dati fiscali in generate-dpa.ts

Rimosso l'unico as any del file (cast renderer). Aggiunta
validateDpaData(): un DPA senza P.IVA/CF per una delle parti ora
lancia un errore esplicito invece di stampare campi vuoti. Introduce
getTypedServiceClient() (usata anche dai task 6-12) al posto della
tecnica .overrideTypes() per-query, che non compila su un client
Supabase senza generic <Database> (verificato con tsc)."
```

---

### Task 6: Fix `generate-buono.ts`

**Files:**
- Modify: `src/lib/pdf/generate-buono.ts`
- Test: `tests/unit/generate-buono.test.ts`

**Interfaces:**
- Consumes: `LAB_FIXTURE`, `LAVORO_FIXTURE`, `createChain`, `getTypedServiceClient` (Task 5).
- Produces: `generateBuono(lavoro): Promise<{numero, url}>` (firma invariata).

- [ ] **Step 1: Scrivi il test smoke (contro il codice attuale)**

```typescript
// tests/unit/generate-buono.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockUpload, mockGetPublicUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }) },
  }),
}))

vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: async () => 1,
}))

import { generateBuono } from '../../src/lib/pdf/generate-buono'

describe('generateBuono', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/buono.pdf' } })
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

  it('genera un buono con dati completi', async () => {
    const result = await generateBuono(LAVORO_FIXTURE)
    expect(result.numero).toMatch(/^BUO-\d{4}-0001$/)
    expect(result.url).toBe('https://example.test/buono.pdf')
  })
})
```

- [ ] **Step 2: Verifica che passi contro il codice attuale**

Run: `npx vitest run tests/unit/generate-buono.test.ts`
Expected: PASS (prima copertura mai scritta per questo file). Il mock intercetta `getServiceClient` da `@/lib/supabase/server-service`, già usato dal codice attuale; `getTypedServiceClient()` (introdotta allo Step 3) chiama la stessa funzione mockata e applica solo un cast a costo zero a runtime, quindi il mock resta valido invariato anche dopo lo Step 3.

- [ ] **Step 3: Rimuovi il cast renderer, passa a `getTypedServiceClient`**

In `src/lib/pdf/generate-buono.ts`:
1. Sostituisci `import { getServiceClient } from '@/lib/supabase/server-service'` con `import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'`.
2. Aggiungi import: `import { renderPdfDocument } from '@/lib/pdf/render-document'` e `import type { Laboratorio } from '@/types/domain'`.
3. Rimuovi `import { renderToBuffer } from '@react-pdf/renderer'`.
4. Sostituisci `const supabase = getServiceClient()` con `const supabase = getTypedServiceClient()`.
5. Sostituisci:
```typescript
  const { data: lab } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', lavoro.laboratorio_id)
    .single()
```
con:
```typescript
  const { data: labRaw } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', lavoro.laboratorio_id)
    .single()
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio
```
(questo sostituisce anche l'`if (!lab) throw new Error('Laboratorio non trovato')` originale, che va rimosso per evitare la doppia dichiarazione — verifica che resti UNA sola verifica not-found, sul nuovo nome `labRaw`)
6. Sostituisci:
```typescript
  // Genera PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(BuonoTemplate, { lavoro, lab, numeroBuono: numero }) as any)
```
con:
```typescript
  // Genera PDF
  const buffer = await renderPdfDocument(createElement(BuonoTemplate, { lavoro, lab, numeroBuono: numero }))
```

- [ ] **Step 4: Verifica**

Run: `npx vitest run tests/unit/generate-buono.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `grep -n "as any" src/lib/pdf/generate-buono.ts`
Expected: nessun risultato.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-buono.ts tests/unit/generate-buono.test.ts
git commit -m "fix(pdf): elimina as any in generate-buono.ts, aggiungi test smoke

Prima copertura di test mai scritta per questo generatore."
```

---

### Task 7: Fix `generate-ifu.ts`

**Files:**
- Modify: `src/lib/pdf/generate-ifu.ts`
- Test: `tests/unit/generate-ifu.test.ts`

**Interfaces:**
- Consumes: `getTypedServiceClient` (Task 5), `LAB_FIXTURE`, `LAVORO_FIXTURE`, `createChain`.

- [ ] **Step 1: Scrivi il test smoke**

```typescript
// tests/unit/generate-ifu.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateIFU } from '../../src/lib/pdf/generate-ifu'

describe('generateIFU', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: LAVORO_FIXTURE, error: null })
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })

  it('genera un IFU con dati completi', async () => {
    const buffer = await generateIFU('lav-test-001', 'lab-test-001')
    expect(buffer.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Verifica che passi contro il codice attuale**

Run: `npx vitest run tests/unit/generate-ifu.test.ts`
Expected: PASS — il mock intercetta `getServiceClient` da `@/lib/supabase/server-service`, già usato dal codice attuale; `getTypedServiceClient()` (introdotta allo Step 3) è solo un wrapper che chiama la stessa funzione e applica un cast a costo zero a runtime, quindi il mock resta valido invariato anche dopo lo Step 3.

- [ ] **Step 3: Passa a `getTypedServiceClient`, rimuovi il cast renderer**

In `src/lib/pdf/generate-ifu.ts`:
1. Sostituisci `import { getServiceClient } from '@/lib/supabase/server-service'` con `import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'`.
2. Sostituisci `const supabase = getServiceClient()` con `const supabase = getTypedServiceClient()`.
3. Rimuovi `import { renderToBuffer } from '@react-pdf/renderer'`, aggiungi `import { renderPdfDocument } from '@/lib/pdf/render-document'`.
4. Sostituisci la query lab:
```typescript
  const { data: lab } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', laboratorio_id)
    .single()
  if (!lab) throw new Error('Laboratorio non trovato')
```
con:
```typescript
  const { data: labRaw } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', laboratorio_id)
    .single()
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio
```
5. Aggiungi `import type { Laboratorio } from '@/types/domain'` (accanto all'import esistente di `LavoroDettaglio`).
6. Sostituisci l'ultima riga della funzione:
```typescript
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(IFUTemplate, { lavoro: lavoro as unknown as LavoroDettaglio, lab }) as any)
```
con:
```typescript
  return renderPdfDocument(createElement(IFUTemplate, { lavoro: lavoro as unknown as LavoroDettaglio, lab }))
```

**Nota:** il cast `lavoro as unknown as LavoroDettaglio` resta invariato — non è `as any`, fuori scope (vedi spec).

- [ ] **Step 4: Verifica**

Run: `npx vitest run tests/unit/generate-ifu.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `grep -n "as any" src/lib/pdf/generate-ifu.ts`
Expected: nessun risultato.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-ifu.ts tests/unit/generate-ifu.test.ts
git commit -m "fix(pdf): elimina as any in generate-ifu.ts, aggiungi test smoke"
```

---

### Task 8: Fix `generate-ricevuta-consegna.ts`

**Files:**
- Modify: `src/lib/pdf/generate-ricevuta-consegna.ts`
- Test: `tests/unit/generate-ricevuta-consegna.test.ts`

**Interfaces:**
- Consumes: `getTypedServiceClient` (Task 5), `LAB_FIXTURE`, `LAVORO_FIXTURE`, `createChain`.

- [ ] **Step 1: Scrivi il test smoke**

```typescript
// tests/unit/generate-ricevuta-consegna.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateRicevutaConsegna } from '../../src/lib/pdf/generate-ricevuta-consegna'

describe('generateRicevutaConsegna', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: LAVORO_FIXTURE, error: null })
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })

  it('genera una ricevuta di consegna con dati completi', async () => {
    const buffer = await generateRicevutaConsegna('lav-test-001', 'lab-test-001')
    expect(buffer.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Verifica che passi contro il codice attuale**

Run: `npx vitest run tests/unit/generate-ricevuta-consegna.test.ts`
Expected: PASS — il mock intercetta `getServiceClient`, già usato dal codice attuale; resta valido anche dopo lo Step 3 (`getTypedServiceClient()` chiama la stessa funzione mockata e applica solo un cast a costo zero a runtime).

- [ ] **Step 3: Passa a `getTypedServiceClient`, rimuovi il cast renderer**

In `src/lib/pdf/generate-ricevuta-consegna.ts`:
1. Sostituisci `import { getServiceClient } from '@/lib/supabase/server-service'` con `import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'`.
2. Sostituisci `const supabase = getServiceClient()` con `const supabase = getTypedServiceClient()`.
3. Aggiungi `import type { Laboratorio } from '@/types/domain'` (accanto all'import esistente di `LavoroDettaglio`).
4. Sostituisci la query lab:
```typescript
  const { data: lab } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', laboratorio_id)
    .single()
  if (!lab) throw new Error('Laboratorio non trovato')
```
con:
```typescript
  const { data: labRaw } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', laboratorio_id)
    .single()
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio
```
5. Sostituisci:
```typescript
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(RicevutaConsegnaTemplate, { lavoro: lavoro as unknown as LavoroDettaglio, lab }) as any)
```
con:
```typescript
  return renderPdfDocument(createElement(RicevutaConsegnaTemplate, { lavoro: lavoro as unknown as LavoroDettaglio, lab }))
```

Rimuovi `import { renderToBuffer } from '@react-pdf/renderer'` e aggiungi `import { renderPdfDocument } from '@/lib/pdf/render-document'`. Il cast `lavoro as unknown as LavoroDettaglio` resta invariato — non è `as any`, fuori scope.

- [ ] **Step 4: Verifica**

Run: `npx vitest run tests/unit/generate-ricevuta-consegna.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `grep -n "as any" src/lib/pdf/generate-ricevuta-consegna.ts`
Expected: nessun risultato.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-ricevuta-consegna.ts tests/unit/generate-ricevuta-consegna.test.ts
git commit -m "fix(pdf): elimina as any in generate-ricevuta-consegna.ts, aggiungi test smoke"
```

---

### Task 9: Fix `generate-nomina-prrc.ts`

**Files:**
- Modify: `src/lib/pdf/generate-nomina-prrc.ts`
- Test: `tests/unit/generate-nomina-prrc.test.ts`

**Interfaces:**
- Consumes: `getTypedServiceClient` (Task 5), `LAB_FIXTURE`, `createChain`.
- Nota: `NominaPrrcTemplateProps.lab` è un tipo strutturale ristretto (tutti campi opzionali, nessun `piano`) — il risultato di query tipizzato via `getTypedServiceClient()` lo soddisfa senza bisogno di alcun cast `as Laboratorio` (a differenza di buono/ifu/ricevuta-consegna/etichetta/ddc, che passano `lab` a prop tipizzate `Laboratorio` per intero).

- [ ] **Step 1: Scrivi i test (smoke + regressione validazione esistente)**

```typescript
// tests/unit/generate-nomina-prrc.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateNominaPrrc } from '../../src/lib/pdf/generate-nomina-prrc'

describe('generateNominaPrrc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('genera una nomina PRRC con dati completi', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
    const buffer = await generateNominaPrrc('lab-test-001')
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('rifiuta se il laboratorio non ha prrc_nome configurato (comportamento esistente)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: { ...LAB_FIXTURE, prrc_nome: null }, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
    await expect(generateNominaPrrc('lab-test-001')).rejects.toThrow('Dati PRRC non configurati')
  })
})
```

- [ ] **Step 2: Verifica che entrambi i test passino contro il codice attuale**

Run: `npx vitest run tests/unit/generate-nomina-prrc.test.ts`
Expected: 2/2 PASS (il controllo `if (!lab.prrc_nome) throw` esiste già nel codice — questo test lo mette solo sotto copertura per la prima volta). Il mock intercetta `getServiceClient`, già usato dal codice attuale; resta valido anche dopo lo Step 3.

- [ ] **Step 3: Passa a `getTypedServiceClient`, rimuovi il cast renderer**

In `src/lib/pdf/generate-nomina-prrc.ts`:
1. Sostituisci `import { getServiceClient } from '@/lib/supabase/server-service'` con `import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'`.
2. Sostituisci `const supabase = getServiceClient()` con `const supabase = getTypedServiceClient()`.
3. Sostituisci:

```typescript
  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(NominaPrrcTemplate, { lab, nominaPrrc }) as any
  )
```

con:

```typescript
  const buffer = await renderPdfDocument(createElement(NominaPrrcTemplate, { lab, nominaPrrc }))
```

Rimuovi `import { renderToBuffer } from '@react-pdf/renderer'`, aggiungi `import { renderPdfDocument } from '@/lib/pdf/render-document'`. Non serve alcun cast `as Laboratorio` (vedi nota sopra) né alcun `import type { Laboratorio }`.

- [ ] **Step 4: Verifica**

Run: `npx vitest run tests/unit/generate-nomina-prrc.test.ts`
Expected: 2/2 PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `grep -n "as any" src/lib/pdf/generate-nomina-prrc.ts`
Expected: nessun risultato.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-nomina-prrc.ts tests/unit/generate-nomina-prrc.test.ts
git commit -m "fix(pdf): elimina as any in generate-nomina-prrc.ts, copertura test prima volta"
```

---

### Task 10: Fix `generate-etichetta.ts` (2 funzioni)

**Files:**
- Modify: `src/lib/pdf/generate-etichetta.ts`
- Test: `tests/unit/generate-etichetta.test.ts`

**Interfaces:**
- Consumes: `getTypedServiceClient` (Task 5), `LAB_FIXTURE`, `LAVORO_FIXTURE`, `createChain`.

- [ ] **Step 1: Scrivi i test smoke per entrambe le funzioni**

```typescript
// tests/unit/generate-etichetta.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockUpload, mockGetPublicUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }) },
  }),
}))

import { generateEtichettaBuffer, generateEtichetta } from '../../src/lib/pdf/generate-etichetta'

describe('generateEtichettaBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: LAVORO_FIXTURE, error: null })
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })

  it('genera il buffer etichetta con dati completi', async () => {
    const buffer = await generateEtichettaBuffer('lav-test-001', 'lab-test-001')
    expect(buffer.length).toBeGreaterThan(0)
  })
})

describe('generateEtichetta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/etichetta.pdf' } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })

  it('genera e carica l\'etichetta su storage', async () => {
    const result = await generateEtichetta(LAVORO_FIXTURE)
    expect(result.url).toBe('https://example.test/etichetta.pdf')
  })
})
```

- [ ] **Step 2: Verifica che passino contro il codice attuale**

Run: `npx vitest run tests/unit/generate-etichetta.test.ts`
Expected: 2/2 PASS — il mock intercetta `getServiceClient`, già usato dal codice attuale; resta valido anche dopo lo Step 3.

- [ ] **Step 3: Passa a `getTypedServiceClient`, rimuovi i 2 cast renderer**

In `src/lib/pdf/generate-etichetta.ts`:
1. Sostituisci `import { getServiceClient } from '@/lib/supabase/server-service'` con `import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'`.
2. Rimuovi `import { renderToBuffer } from '@react-pdf/renderer'`, aggiungi `import { renderPdfDocument } from '@/lib/pdf/render-document'` e `import type { Laboratorio } from '@/types/domain'`.
3. In `generateEtichettaBuffer`: sostituisci `const supabase = getServiceClient()` con `const supabase = getTypedServiceClient()`, e sostituisci la query lab:
```typescript
  const { data: lab } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', laboratorio_id)
    .single()
  if (!lab) throw new Error('Laboratorio non trovato')
```
con:
```typescript
  const { data: labRaw } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', laboratorio_id)
    .single()
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio
```
4. Sostituisci:
```typescript
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(EtichettaTemplate, { lavoro: lavoroDettaglio, lab, installareEntro }) as any)
```
con:
```typescript
  return renderPdfDocument(createElement(EtichettaTemplate, { lavoro: lavoroDettaglio, lab, installareEntro }))
```
5. In `generateEtichetta`: applica la stessa sostituzione `getServiceClient()` → `getTypedServiceClient()` e lo stesso pattern `labRaw`/`as Laboratorio` sulla query lab, poi sostituisci:
```typescript
  // Genera PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(EtichettaTemplate, { lavoro, lab, installareEntro }) as any)
```
con:
```typescript
  // Genera PDF
  const buffer = await renderPdfDocument(createElement(EtichettaTemplate, { lavoro, lab, installareEntro }))
```

**Nota:** il cast `lavoro as unknown as LavoroDettaglio` (riga `const lavoroDettaglio = lavoro as unknown as LavoroDettaglio`) resta invariato — fuori scope.

- [ ] **Step 4: Verifica**

Run: `npx vitest run tests/unit/generate-etichetta.test.ts`
Expected: 2/2 PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `grep -n "as any" src/lib/pdf/generate-etichetta.ts`
Expected: nessun risultato.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-etichetta.ts tests/unit/generate-etichetta.test.ts
git commit -m "fix(pdf): elimina 2 as any in generate-etichetta.ts, aggiungi test smoke"
```

---

### Task 11: Fix `generate-cedolino-tecnico.ts`

**Files:**
- Modify: `src/lib/pdf/generate-cedolino-tecnico.ts`
- Test: `tests/unit/generate-cedolino-tecnico.test.ts`

**Interfaces:**
- Consumes: `getTypedServiceClient` (Task 5), `createChain`.
- Nota: le select parziali di questo file (`nome, ragione_sociale, ...` su `laboratori`; `nome, cognome` su `tecnici`) non toccano colonne enum-like — su un client tipizzato via `getTypedServiceClient()` producono già il tipo ristretto corretto senza bisogno di alcun `.overrideTypes()`/cast aggiuntivo (verificato: le select parziali su un client `SupabaseClient<Database>` restituiscono direttamente la forma attesa).

- [ ] **Step 1: Scrivi il test smoke**

```typescript
// tests/unit/generate-cedolino-tecnico.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateCedolinoTecnico } from '../../src/lib/pdf/generate-cedolino-tecnico'

const LAB_ROW = {
  nome: 'Lab Opromolla',
  ragione_sociale: 'Laboratorio Odontotecnico Opromolla S.r.l.',
  indirizzo: 'Via Roma 12',
  cap: '84028',
  citta: 'Serre',
  provincia: 'SA',
  codice_itca: 'ITCA01051686',
  prrc_nome: 'Filippo Opromolla',
}

const TECNICO_ROW = { nome: 'Luca', cognome: 'Bianchi' }

const RAW_ROWS = [
  {
    quantita: 2,
    lavori: {
      stato: 'consegnato',
      tecnico_id: 'tec-001',
      laboratorio_id: 'lab-test-001',
      data_consegna_effettiva: '2026-05-10',
    },
    listino: { nome: 'Corona ceramica', compenso_tecnico: 15 },
  },
]

describe('generateCedolinoTecnico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_ROW, error: null })
      if (table === 'tecnici') return createChain({ data: TECNICO_ROW, error: null })
      if (table === 'lavori_lavorazioni') return createChain({ data: RAW_ROWS, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })

  it('genera un cedolino tecnico con lavorazioni del mese', async () => {
    const buffer = await generateCedolinoTecnico('tec-001', 'lab-test-001', '2026-05')
    expect(buffer.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Verifica che passi contro il codice attuale**

Run: `npx vitest run tests/unit/generate-cedolino-tecnico.test.ts`
Expected: PASS — il mock intercetta `getServiceClient`, già usato dal codice attuale; resta valido anche dopo lo Step 3.

- [ ] **Step 3: Passa a `getTypedServiceClient`, rimuovi il cast renderer**

In `src/lib/pdf/generate-cedolino-tecnico.ts`:
1. Sostituisci `import { getServiceClient } from '@/lib/supabase/server-service'` con `import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'`.
2. Rimuovi `import { renderToBuffer } from '@react-pdf/renderer'`, aggiungi `import { renderPdfDocument } from '@/lib/pdf/render-document'`.
3. Sostituisci `const svc = getServiceClient()` con `const svc = getTypedServiceClient()`. Le due select parziali (`laboratori`, `tecnici`) restano altrimenti invariate — nessun cast aggiuntivo necessario (vedi nota sopra).
4. Sostituisci:
```typescript
  const element = createElement(CedolinoTecnicoTemplate, { tecnico, lab: labPdf, mese, lavorazioni, totale })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)
  return buffer
```
con:
```typescript
  const element = createElement(CedolinoTecnicoTemplate, { tecnico, lab: labPdf, mese, lavorazioni, totale })
  return renderPdfDocument(element)
```

**Nota:** il cast `(rawRows ?? []) as unknown as RawRow[]` resta invariato — non è `as any`, fuori scope.

- [ ] **Step 4: Verifica**

Run: `npx vitest run tests/unit/generate-cedolino-tecnico.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `grep -n "as any" src/lib/pdf/generate-cedolino-tecnico.ts`
Expected: nessun risultato.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-cedolino-tecnico.ts tests/unit/generate-cedolino-tecnico.test.ts
git commit -m "fix(pdf): elimina as any in generate-cedolino-tecnico.ts, aggiungi test smoke"
```

---

### Task 12: Fix `generate-ddc.ts` (ultimo file, il più complesso)

**Files:**
- Modify: `src/lib/pdf/generate-ddc.ts`
- Test: `tests/unit/generate-ddc.test.ts`

- [ ] **Step 1: Scrivi i test smoke (contro il codice attuale)**

```typescript
// tests/unit/generate-ddc.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.test/ddc.pdf' } }),
      }),
    },
  }),
}))

vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: async () => 1,
}))

import { generateDdC } from '../../src/lib/pdf/generate-ddc'

function mockTables(lab: typeof LAB_FIXTURE) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') return createChain({ data: lab, error: null })
    if (table === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
    if (table === 'dichiarazioni_conformita') return { insert: mockInsert }
    throw new Error(`Tabella inattesa nel mock: ${table}`)
  })
}

describe('generateDdC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('genera una DdC con dati completi', async () => {
    mockTables(LAB_FIXTURE)
    const result = await generateDdC(LAVORO_FIXTURE)
    expect(result.numero).toMatch(/^DDC-\d{4}-0001$/)
    expect(result.url).toBe('https://example.test/ddc.pdf')
  })

  it('usa lab.testo_rischi_default come fallback quando manca rischi_tipo_dispositivo', async () => {
    mockTables({ ...LAB_FIXTURE, testo_rischi_default: 'Rischio generico test' })
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ rischi_residui_snapshot: 'Rischio generico test' })
    )
  })

  it('usa paziente.nome_cognome quando manca paziente_nome_snapshot', async () => {
    mockTables(LAB_FIXTURE)
    const PAZIENTE_FIXTURE = {
      id: 'paz-1',
      laboratorio_id: 'lab-test-001',
      cliente_id: 'cli-001',
      codice_paziente: 'PAZ-001',
      nome: 'Anna',
      cognome: 'Verdi',
      nome_cognome: 'Anna Verdi',
      data_nascita: null,
      codice_fiscale: null,
      sesso: null,
      comune_nascita: null,
      partita_iva: null,
      asl: null,
      note: null,
      anamnesi: null,
      archiviato: false,
    }
    const lavoroSenzaSnapshot = {
      ...LAVORO_FIXTURE,
      paziente_nome_snapshot: null,
      paziente: PAZIENTE_FIXTURE,
    }
    await generateDdC(lavoroSenzaSnapshot)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ paziente_nome: 'Anna Verdi' })
    )
  })
})
```

- [ ] **Step 2: Verifica che tutti passino contro il codice attuale**

Run: `npx vitest run tests/unit/generate-ddc.test.ts`
Expected: 3/3 PASS (prima copertura mai scritta per la funzione `generateDdC()`). Il mock intercetta `getServiceClient`, già usato dal codice attuale; resta valido anche dopo lo Step 3. Il fallback `testo_rischi_default` e quello `paziente.nome_cognome` sono comportamento GIÀ esistente nel codice attuale (solo mascherato da `as any`) — questi 2 test sono caratterizzazione, non RED, esattamente come il test 1.

- [ ] **Step 3: Passa a `getTypedServiceClient`, rimuovi i 3 `as any`**

In `src/lib/pdf/generate-ddc.ts`:
1. Sostituisci `import { getServiceClient } from '@/lib/supabase/server-service'` con `import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'`.
2. Sostituisci `const supabase = getServiceClient()` con `const supabase = getTypedServiceClient()`.
3. Aggiungi import: `import { renderPdfDocument } from '@/lib/pdf/render-document'`. Rimuovi `import { renderToBuffer } from '@react-pdf/renderer'`. Aggiungi `import type { Laboratorio } from '@/types/domain'` (accanto all'import esistente di `LavoroDettaglio`).
4. Sostituisci la query lab:
```typescript
  const [{ data: lab }, { data: rischiRow }] = await Promise.all([
    supabase.from('laboratori').select('*').eq('id', lavoro.laboratorio_id).single(),
    supabase
      .from('rischi_tipo_dispositivo')
      .select('rischi_residui')
      .eq('laboratorio_id', lavoro.laboratorio_id)
      .eq('tipo_dispositivo', lavoro.tipo_dispositivo)
      .maybeSingle(),
  ])
```
con:
```typescript
  const [{ data: labRaw }, { data: rischiRow }] = await Promise.all([
    supabase.from('laboratori').select('*').eq('id', lavoro.laboratorio_id).single(),
    supabase
      .from('rischi_tipo_dispositivo')
      .select('rischi_residui')
      .eq('laboratorio_id', lavoro.laboratorio_id)
      .eq('tipo_dispositivo', lavoro.tipo_dispositivo)
      .maybeSingle(),
  ])
```
5. Subito dopo il blocco `if (!lab) throw new Error('Laboratorio non trovato')` (che va aggiornato per usare `labRaw`), aggiungi il cast puntuale:
```typescript
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio
```
6. Sostituisci:
```typescript
    // Fallback da paziente.nome_cognome se lo snapshot è nullo (Allegato XIII §4)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paziente_nome: lavoro.paziente_nome_snapshot ?? (lavoro.paziente as any)?.nome_cognome ?? (lavoro.paziente as any)?.codice_paziente ?? '',
```
con:
```typescript
    // Fallback da paziente.nome_cognome se lo snapshot è nullo (Allegato XIII §4)
    paziente_nome: lavoro.paziente_nome_snapshot ?? lavoro.paziente?.nome_cognome ?? lavoro.paziente?.codice_paziente ?? '',
```
7. Sostituisci:
```typescript
    // Priorità: rischi specifici per tipo dispositivo > testo generico del lab
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rischi_residui_snapshot: (rischiRow?.rischi_residui ?? (lab as any).testo_rischi_default ?? null) as string | null,
```
con:
```typescript
    // Priorità: rischi specifici per tipo dispositivo > testo generico del lab
    rischi_residui_snapshot: (rischiRow?.rischi_residui ?? lab.testo_rischi_default ?? null) as string | null,
```
8. Sostituisci:
```typescript
  // Genera PDF
  // Il cast è necessario: createElement produce FunctionComponentElement,
  // mentre renderToBuffer accetta ReactElement<DocumentProps>.
  // A runtime il componente renderizza sempre un <Document> come root.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(DdcTemplate, { lavoro, lab, ddc }) as any)
```
con:
```typescript
  // Genera PDF
  const buffer = await renderPdfDocument(createElement(DdcTemplate, { lavoro, lab, ddc }))
```

- [ ] **Step 4: Verifica**

Run: `npx vitest run tests/unit/generate-ddc.test.ts`
Expected: 3/3 PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `grep -n "as any" src/lib/pdf/generate-ddc.ts`
Expected: nessun risultato.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-ddc.ts tests/unit/generate-ddc.test.ts
git commit -m "fix(pdf): elimina i 3 as any in generate-ddc.ts (ultimo file di B4)

Chiude B4: 11/11 as any eliminati nei generatori PDF MDR. Prima
copertura di test mai scritta per generateDdC()."
```

---

### Task 13: Verifica finale whole-branch

**Files:** nessuno (solo verifica)

- [ ] **Step 1: Conferma zero `as any` residui negli 8 file**

Run:
```bash
grep -rn "as any" \
  src/lib/pdf/generate-ddc.ts \
  src/lib/pdf/generate-dpa.ts \
  src/lib/pdf/generate-ifu.ts \
  src/lib/pdf/generate-buono.ts \
  src/lib/pdf/generate-etichetta.ts \
  src/lib/pdf/generate-nomina-prrc.ts \
  src/lib/pdf/generate-ricevuta-consegna.ts \
  src/lib/pdf/generate-cedolino-tecnico.ts
```
Expected: nessun output (exit code 1 di grep = nessun match).

- [ ] **Step 2: Type check completo**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 3: Suite di test completa**

Run: `npx vitest run`
Expected: tutti i test PASS (baseline + 8 nuovi file di test + `render-document.test.ts`, nessuna regressione).

- [ ] **Step 4: Lint (obbligatorio — vedi lezione B18 in `memory/MEMORY.md`, la CI verifica anche questo)**

Run: `npx eslint src/ --ext .ts,.tsx --max-warnings 0`
Expected: nessun errore/warning.

- [ ] **Step 5: Build production**

Run: `npx next build`
Expected: build pulita, nessun errore.

- [ ] **Step 6: Aggiorna memoria progetto (BP-1, obbligatorio da CLAUDE.md)**

Aggiorna `memory/MEMORY.md` (sezione "0. STATO DEL PROGETTO", nuova voce in testa) e `docs/roadmap/ROADMAP-UFFICIALE.md` con il completamento di B4: 11 `as any` eliminati, validazione DPA aggiunta, copertura test creata da zero per 8 generatori, 2 item segnalati come backlog separato (tipizzazione `getServiceClient()`, gap P.IVA-laboratorio in `precheck-mdr.ts`). Aggiorna anche `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B4 marcandola risolta.

- [ ] **Step 7: Commit finale della memoria**

```bash
git add memory/MEMORY.md docs/roadmap/ROADMAP-UFFICIALE.md docs/roadmap/BACKLOG-TECNICO-2026-07-02.md
git commit -m "docs(b4): aggiorna memoria progetto — B4 risolto

11/11 as any eliminati nei generatori PDF MDR, validazione DPA
aggiunta, test coverage costruita da zero per 8 generatori (prima
inesistente). 2 item segnalati come backlog separato."
```
