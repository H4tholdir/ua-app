# N4 — Fonte di verità del prezzo del lavoro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare la divergenza tra le due fonti di prezzo del lavoro (`lavori.prezzo_unitario` vs `sum(lavori_lavorazioni.importo)`) con una regola ibrida unica calcolata a read-time, consumata da contabilità, fattura e display; blindare la scrittura e la coerenza fiscale.

**Architecture:** Helper puro unico `prezzoEffettivoLavoro` in `src/lib/domain/` (righe se esistono, altrimenti `prezzo_unitario`), refactor di tutti i lettori di totale-lavoro perché lo usino (incluso il refactor della copia inline in `generate-xml`), rimozione del prefiltro `.gt('prezzo_unitario',0)` che scarta lavori con prezzo nelle righe, enforcement server sulla PATCH, divergence guard read-time. Nessuna migration.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase/Postgres, Vitest + jsdom. Dominio fiscale (FatturaPA) → percorso GRANDE.

**Spec:** `docs/superpowers/specs/2026-07-14-n4-fonte-verita-prezzo-lavoro-design.md`

## Global Constraints

- **Nessuna migration** (nessun `gen types`). Solo codice.
- **`prezzoEffettivoLavoro` è LA definizione unica.** Nessun lettore di totale-lavoro deve leggere `lavori.prezzo_unitario` grezzo: tutti passano per l'helper (embeddando le righe). `generate-xml.ts` DEVE essere refactorato per usarlo (elimina la copia inline).
- **Rounding identico all'attuale `generate-xml.ts:104-106`:** somma di `importo` grezzi, nessun round per-riga. Non perturbare i totali delle fatture già emesse.
- **FUORI scope (convertirli è un BUG):** `getTitolareKpi` (margine) e `getTecnicoDashboard` (compenso) in `src/lib/dashboard/queries.ts` — calcolano `prezzo_unitario × quantita` (grandezza analitica diversa). Editor righe nativo = DS v3 sp.3. Branded type `Euro` = deferito.
- **Reader di snapshot congelato restano FUORI scope** (leggono i campi persistiti della fattura): `fatture/page.tsx`, `fatture/[id]/page.tsx`, `FatturaCortesiaTemplate.tsx`, `fatture/[id]/xml/route.ts`.
- **Tolleranza divergenza:** centesimi interi, `|deltaCents| >= 1` (mai epsilon float).
- **Rollout:** landare prima i consumer read-only (Task 2-5), poi `registra-pagamento` (Task 6, unico non reversibile). **FASE 7** (`tsc --noEmit` + `vitest run` + `next build`, output reale) prima del merge. **Merge/push = gate esplicito di Francesco.**
- **Lab E2E** per QA: `00000000-0000-0000-0000-000000000001` — MAI lab Filippo.

---

## File Structure

**Nuovi**
- `src/lib/domain/prezzo-lavoro.ts` — CREATE: `prezzoEffettivoLavoro`, `divergenzaPrezzo`, `SELECT_FRAGMENT_PREZZO`.
- `tests/unit/prezzo-lavoro.test.ts` — CREATE: helper + divergenza.
- `tests/unit/contabilita-prezzo-effettivo.test.ts` — CREATE: consistenza contabilità==fattura + completezza filtro.
- `tests/unit/lavori-patch-prezzo-guard.test.ts` — CREATE: guard PATCH.
- `tests/unit/prezzo-tripwire.test.ts` — CREATE: grep-tripwire.
- `tests/unit/fatture-snapshot-no-helper.test.ts` — CREATE: regressione documenti storici.
- `scripts/n4-reconciliation.ts` — CREATE: query di riconciliazione + conteggio pre-deploy.

**Modificati**
- `src/lib/fattura/generate-xml.ts` — imponibile (104-106) → helper; assertion Natura N4.
- `src/lib/contabilita/queries.ts` — `getContabilitaCliente`, `getCreditoScadutoPerCliente`: embed righe, helper, rimozione `.gt`.
- `src/lib/contabilita/registra-pagamento.ts` — `importoDovuto` → helper (embed righe).
- `src/app/api/portale/[token]/fatturazione/route.ts` — `prezzo` (79) → helper.
- `src/app/api/scadenzario/route.ts` — chiamare `getCreditoScadutoPerCliente` (rimuove duplicazione + filtro `:77`); `:148` residuo.
- `src/app/api/lavori/pronti-da-fatturare/route.ts` — totale (50) → helper.
- `src/app/api/lavori/[id]/route.ts` — guard server PATCH.
- `src/components/features/scadenzario/LavoriInAttesaSection.tsx` (+ portale/scheda display) — badge divergenza.

---

## Task 1: Helper `prezzoEffettivoLavoro` + `divergenzaPrezzo` (TDD, fondamento)

**Files:**
- Create: `src/lib/domain/prezzo-lavoro.ts`
- Test: `tests/unit/prezzo-lavoro.test.ts`

**Interfaces:**
- Produces:
  - `prezzoEffettivoLavoro(l: { prezzo_unitario: number | null; lavorazioni?: Array<{ importo: number | null }> | null }): number`
  - `divergenzaPrezzo(l: { prezzo_unitario: number | null; lavorazioni?: Array<{ importo: number | null }> | null }): { divergente: boolean; deltaCents: number }`
  - `SELECT_FRAGMENT_PREZZO = 'prezzo_unitario, lavorazioni:lavori_lavorazioni(importo)'` (fragment per i consumer money-only)

- [ ] **Step 1: Scrivi il test che fallisce**

File `tests/unit/prezzo-lavoro.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { prezzoEffettivoLavoro, divergenzaPrezzo } from '@/lib/domain/prezzo-lavoro'

describe('prezzoEffettivoLavoro', () => {
  it('somma le righe quando esistono (grezzo, no round per-riga)', () => {
    expect(prezzoEffettivoLavoro({ prezzo_unitario: 322, lavorazioni: [{ importo: 100 }, { importo: 12 }] })).toBe(112)
  })
  it('usa prezzo_unitario se non ci sono righe', () => {
    expect(prezzoEffettivoLavoro({ prezzo_unitario: 322, lavorazioni: [] })).toBe(322)
    expect(prezzoEffettivoLavoro({ prezzo_unitario: 322, lavorazioni: null })).toBe(322)
    expect(prezzoEffettivoLavoro({ prezzo_unitario: 322 })).toBe(322)
  })
  it('0 se né righe né prezzo_unitario', () => {
    expect(prezzoEffettivoLavoro({ prezzo_unitario: null, lavorazioni: [] })).toBe(0)
  })
  it('ignora importi null nelle righe', () => {
    expect(prezzoEffettivoLavoro({ prezzo_unitario: null, lavorazioni: [{ importo: 50 }, { importo: null }] })).toBe(50)
  })
})

describe('divergenzaPrezzo', () => {
  it('divergente quando righe e prezzo_unitario differiscono oltre 1 cent', () => {
    const d = divergenzaPrezzo({ prezzo_unitario: 322, lavorazioni: [{ importo: 112 }] })
    expect(d.divergente).toBe(true)
    expect(d.deltaCents).toBe(21000)
  })
  it('non divergente se coincidono (entro rounding a centesimi interi)', () => {
    expect(divergenzaPrezzo({ prezzo_unitario: 112, lavorazioni: [{ importo: 112 }] }).divergente).toBe(false)
  })
  it('non divergente se non ci sono righe (nessuna seconda fonte)', () => {
    expect(divergenzaPrezzo({ prezzo_unitario: 322, lavorazioni: [] }).divergente).toBe(false)
  })
  it('non divergente se prezzo_unitario è 0/null (solo righe → nessun conflitto)', () => {
    expect(divergenzaPrezzo({ prezzo_unitario: 0, lavorazioni: [{ importo: 112 }] }).divergente).toBe(false)
    expect(divergenzaPrezzo({ prezzo_unitario: null, lavorazioni: [{ importo: 112 }] }).divergente).toBe(false)
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/prezzo-lavoro.test.ts`
Expected: FAIL — modulo non trovato.

- [ ] **Step 3: Implementa**

File `src/lib/domain/prezzo-lavoro.ts`:
```typescript
// Fonte di verità UNICA del prezzo di un lavoro (N4).
// Regola ibrida: le righe di lavorazione, se esistono, vincono (sono un rimpiazzo
// integrale scritto da PUT /lavorazioni); altrimenti il totale è prezzo_unitario.
// Rounding identico a generate-xml (somma di importo grezzi, nessun round per-riga).

type LavoroPrezzo = {
  prezzo_unitario: number | null
  lavorazioni?: Array<{ importo: number | null }> | null
}

// Fragment PostgREST per i consumer money-only che devono derivare il totale.
export const SELECT_FRAGMENT_PREZZO = 'prezzo_unitario, lavorazioni:lavori_lavorazioni(importo)'

export function prezzoEffettivoLavoro(l: LavoroPrezzo): number {
  const righe = l.lavorazioni ?? []
  if (righe.length > 0) {
    return righe.reduce((acc, r) => acc + (r.importo ?? 0), 0)
  }
  return l.prezzo_unitario ?? 0
}

export function divergenzaPrezzo(l: LavoroPrezzo): { divergente: boolean; deltaCents: number } {
  const righe = l.lavorazioni ?? []
  const pu = l.prezzo_unitario ?? 0
  // Nessuna seconda fonte con cui divergere se mancano righe o prezzo_unitario.
  if (righe.length === 0 || pu <= 0) return { divergente: false, deltaCents: 0 }
  const sommaRighe = righe.reduce((acc, r) => acc + (r.importo ?? 0), 0)
  const deltaCents = Math.abs(Math.round(sommaRighe * 100) - Math.round(pu * 100))
  return { divergente: deltaCents >= 1, deltaCents }
}
```

- [ ] **Step 4: Esegui — deve passare**

Run: `npx vitest run tests/unit/prezzo-lavoro.test.ts`
Expected: PASS.

- [ ] **Step 5: tsc + commit**

Run: `npx tsc --noEmit` → nessun errore.
```bash
git add src/lib/domain/prezzo-lavoro.ts tests/unit/prezzo-lavoro.test.ts
git commit -m "feat(domain): prezzoEffettivoLavoro + divergenzaPrezzo (fonte unica prezzo N4)"
```

---

## Task 2: Refactor `generate-xml.ts` alla definizione unica (TDD)

Elimina la copia inline della regola: `generate-xml` diventa un consumer dell'helper. Il numero emesso NON deve cambiare (rounding identico).

**Files:**
- Modify: `src/lib/fattura/generate-xml.ts:103-106`
- Test: `tests/unit/buono-pdf-content.test.ts` non copre la fattura; usa il test esistente `tests/unit/generate-xml*.test.ts` se presente, altrimenti aggiungi un caso content-check in un nuovo `tests/unit/generate-xml-prezzo.test.ts` che verifica l'imponibile per un lavoro con righe (112) e senza righe (prezzo_unitario 322).

**Interfaces:**
- Consumes: `prezzoEffettivoLavoro` (Task 1).

- [ ] **Step 1: Aggiungi l'import**

In testa a `src/lib/fattura/generate-xml.ts` (accanto agli altri import):
```typescript
import { prezzoEffettivoLavoro } from '@/lib/domain/prezzo-lavoro'
```

- [ ] **Step 2: Sostituisci il calcolo inline (righe 103-106)**

Da:
```typescript
  // Fix: se non ci sono lavorazioni, usa prezzo_unitario del lavoro come imponibile
  const imponibile = lavoro.lavorazioni.length > 0
    ? lavoro.lavorazioni.reduce((acc, r) => acc + (r.importo ?? 0), 0)
    : (lavoro.prezzo_unitario ?? 0)
```
A:
```typescript
  // N4: fonte unica del prezzo (righe se esistono, altrimenti prezzo_unitario).
  const imponibile = prezzoEffettivoLavoro(lavoro)
```

- [ ] **Step 3: Verifica compilazione + test regressione fattura**

Run: `npx tsc --noEmit` → nessun errore.
Run: `npx vitest run tests/unit/generate-xml-prezzo.test.ts` (o il test fattura esistente) → PASS (imponibile 112 con righe, 322 senza).

- [ ] **Step 4: Commit**
```bash
git add src/lib/fattura/generate-xml.ts tests/unit/generate-xml-prezzo.test.ts
git commit -m "refactor(fattura): generate-xml usa prezzoEffettivoLavoro (definizione unica)"
```

---

## Task 3: Contabilità readers → helper + rimozione prefiltro `.gt` (TDD)

Chiude il sintomo 322/112 sul lato contabile E il bug di completezza (lavori con prezzo nelle righe e `prezzo_unitario=0/null` non venivano fetchati).

**Files:**
- Modify: `src/lib/contabilita/queries.ts` — `getContabilitaCliente` (select :215-225, `.gt` :225, mapping :248/261/270/300) e `getCreditoScadutoPerCliente` (select :81-93, `.gt` :93, residuo :103)
- Test: `tests/unit/contabilita-prezzo-effettivo.test.ts`

**Interfaces:**
- Consumes: `prezzoEffettivoLavoro`, `SELECT_FRAGMENT_PREZZO` (Task 1).

- [ ] **Step 1: Scrivi il test che fallisce**

File `tests/unit/contabilita-prezzo-effettivo.test.ts` (modella i mock su un test contabilità esistente, es. `tests/unit/` che mocka `getServiceClient`; se non esiste un mock riusabile per `queries.ts`, testa la funzione pura di derivazione isolando il mapping — vedi nota). Asserzioni chiave:
```typescript
// 1) Consistenza: un lavoro con righe [100,12] e prezzo_unitario 322 → residuo/totale = 112 (come la fattura), NON 322.
// 2) Completezza: un lavoro con prezzo_unitario=0 e righe [80] compare in lavoriInAttesa/crediti (residuo 80), NON scartato.
```
> Nota: se `queries.ts` non ha un mock riusabile del client Supabase, estrai la mappatura riga→dovuto in una piccola funzione pura testabile all'interno di `queries.ts` (es. `mapLavoroAContabile(l)`) e testa quella; in ogni caso il residuo/totale deve derivare da `prezzoEffettivoLavoro(l)`.

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/contabilita-prezzo-effettivo.test.ts`
Expected: FAIL (oggi usa `prezzo_unitario` grezzo e scarta i lavori con `prezzo_unitario=0`).

- [ ] **Step 3: Implementa in `getContabilitaCliente`**

(a) Import in testa: `import { prezzoEffettivoLavoro, SELECT_FRAGMENT_PREZZO } from '@/lib/domain/prezzo-lavoro'`
(b) Nella select (riga ~215-216) aggiungi l'embed righe: aggiungi `, lavorazioni:lavori_lavorazioni(importo)` alla lista di colonne del lavoro.
(c) **Rimuovi** `.gt('prezzo_unitario', 0)` (riga ~225).
(d) Dopo il fetch, calcola `const totaleLav = prezzoEffettivoLavoro(l)` e sostituisci gli usi di `Number(l.prezzo_unitario ?? 0)`:
   - riga ~248 `prezzo_unitario: Number(l.prezzo_unitario ?? 0)` → `prezzo_unitario: totaleLav`
   - riga ~261 `calcolaResiduo(Number(l.prezzo_unitario ?? 0), ...)` → `calcolaResiduo(totaleLav, ...)`
   - riga ~270 `totale: Number(l.prezzo_unitario ?? 0)` → `totale: totaleLav`
   - riga ~300 `residuo: l.prezzo_unitario` → `residuo: prezzoEffettivoLavoro(l)`
(e) **Filtra in codice** i lavori a totale 0: dove prima il `.gt` li escludeva, aggiungi `if (totaleLav <= 0) continue` (o equivalente `.filter`) nel loop di costruzione.
(f) Aggiorna il tipo inline della riga (~238) aggiungendo `lavorazioni: Array<{ importo: number | null }> | null`.

- [ ] **Step 4: Implementa in `getCreditoScadutoPerCliente`**

Stesso pattern: embed `lavorazioni:lavori_lavorazioni(importo)` nella select (~81-82), rimuovi `.gt('prezzo_unitario', 0)` (~93), `const totaleLav = prezzoEffettivoLavoro(l)`, `residuo = calcolaResiduo(totaleLav, ...)` (~103), `if (totaleLav <= 0) continue`, aggiorna il tipo inline (~96).

- [ ] **Step 5: Esegui — deve passare + tsc**

Run: `npx vitest run tests/unit/contabilita-prezzo-effettivo.test.ts` → PASS.
Run: `npx tsc --noEmit` → nessun errore.

- [ ] **Step 6: Commit**
```bash
git add src/lib/contabilita/queries.ts tests/unit/contabilita-prezzo-effettivo.test.ts
git commit -m "fix(contabilita): prezzo effettivo unico + rimuove prefiltro .gt che scartava lavori con righe"
```

---

## Task 4: API route readers → helper (portale, scadenzario, pronti-da-fatturare)

**Files:**
- Modify: `src/app/api/portale/[token]/fatturazione/route.ts` (select + `:79`), `src/app/api/scadenzario/route.ts` (`:77` filtro + `:148` residuo), `src/app/api/lavori/pronti-da-fatturare/route.ts` (select + `:50`)

**Interfaces:**
- Consumes: `prezzoEffettivoLavoro`, `SELECT_FRAGMENT_PREZZO`; `getCreditoScadutoPerCliente` (per scadenzario).

- [ ] **Step 1: portale fatturazione** — embed righe nella select del lavoro; import helper; riga 79 `prezzo: Number(l.prezzo_unitario ?? 0)` → `prezzo: prezzoEffettivoLavoro(l)`. Aggiorna il tipo `l` per includere `lavorazioni`.

- [ ] **Step 2: scadenzario** — la query inline (~64-77) duplica `getCreditoScadutoPerCliente`. **Preferito:** sostituire la query duplicata + il loop (~140-152) con una chiamata a `getCreditoScadutoPerCliente(svc, labId)` (già refactorata in Task 3). Se il refactoring completo è troppo ampio per un singolo task, come minimo: embed righe nella select, rimuovi `.gt('prezzo_unitario', 0)` (~77), `residuo = calcolaResiduo(prezzoEffettivoLavoro(l), ...)` (~148), `if (residuo <= 0) continue` già presente.

- [ ] **Step 3: pronti-da-fatturare** — embed `lavorazioni:lavori_lavorazioni(importo)` nella select (~47-51); dove si espone il totale (~50 area), usare `prezzoEffettivoLavoro(l)`.

- [ ] **Step 4: tsc + commit**

Run: `npx tsc --noEmit` → nessun errore. (Coperti dal tripwire in Task 8 + QA in Task 10.)
```bash
git add "src/app/api/portale/[token]/fatturazione/route.ts" src/app/api/scadenzario/route.ts src/app/api/lavori/pronti-da-fatturare/route.ts
git commit -m "fix(api): portale/scadenzario/pronti-da-fatturare usano prezzo effettivo unico"
```

---

## Task 5: `registra-pagamento` → helper (isolato per rollback)

⚠️ **Unico consumer NON reversibile** (conia `credito_clienti_movimenti` persistenti). Task separato, da landare per ultimo tra i consumer, con scrutinio extra.

**Files:**
- Modify: `src/lib/contabilita/registra-pagamento.ts:62-72`
- Test: aggiungi un caso a `tests/unit/contabilita-prezzo-effettivo.test.ts` (o un test dedicato) che verifica `importoDovuto` derivato dalle righe.

- [ ] **Step 1: Test che fallisce** — un lavoro con righe [112] e `prezzo_unitario` 322 → `importoDovuto` calcolato = 112.

- [ ] **Step 2: Implementa** — nella select del ramo `else` (riga ~64) aggiungi `, lavorazioni:lavori_lavorazioni(importo)`; import helper; riga ~70 `importoDovuto = Number((lavoro as ...).prezzo_unitario ?? 0)` → `importoDovuto = prezzoEffettivoLavoro(lavoro as { prezzo_unitario: number | null; lavorazioni?: Array<{ importo: number | null }> | null })`. Aggiorna il cast del tipo.

- [ ] **Step 3: Esegui + tsc → PASS/clean. Commit**
```bash
git add src/lib/contabilita/registra-pagamento.ts tests/unit/contabilita-prezzo-effettivo.test.ts
git commit -m "fix(contabilita): registra-pagamento usa prezzo effettivo (embed righe)"
```

---

## Task 6: Guard server PATCH — rifiuta `prezzo_unitario` con righe attive (TDD)

**Files:**
- Modify: `src/app/api/lavori/[id]/route.ts` (dopo il blocco `incluso_in_fattura`, ~216-220)
- Test: `tests/unit/lavori-patch-prezzo-guard.test.ts` (modella su `tests/unit/lavori-patch-invariante-d7.test.ts`)

- [ ] **Step 1: Test che fallisce**
```typescript
// Con righe attive: PATCH { prezzo_unitario: 999 } → 422; PATCH { prezzo_unitario: null } → accettato (carve-out riconciliazione);
// Senza righe: PATCH { prezzo_unitario: 999 } → accettato come oggi.
```

- [ ] **Step 2: Esegui — deve fallire** (`npx vitest run tests/unit/lavori-patch-prezzo-guard.test.ts`).

- [ ] **Step 3: Implementa** — dopo aver caricato `existing`, aggiungi un `count` di righe attive:
```typescript
  const { count: righeAttive } = await svc
    .from('lavori_lavorazioni')
    .select('id', { count: 'exact', head: true })
    .eq('lavoro_id', id)
    .is('deleted_at', null)

  // N4: se il prezzo è gestito dalle righe, prezzo_unitario è read-only
  // (eccezione: azzeramento a null = riconciliazione, consentito).
  if ((righeAttive ?? 0) > 0 && 'prezzo_unitario' in payload && payload.prezzo_unitario !== null) {
    return NextResponse.json({ error: 'prezzo gestito dalle righe di lavorazione' }, { status: 422 })
  }
```
> `listino_id`: valutare se aggiungerlo alla guard (defense-in-depth) — non guida il totale una volta che le righe vincono; se aggiunto, stesso pattern.

- [ ] **Step 4: Esegui — PASS + tsc. Commit**
```bash
git add "src/app/api/lavori/[id]/route.ts" tests/unit/lavori-patch-prezzo-guard.test.ts
git commit -m "feat(lavori): PATCH rifiuta prezzo_unitario con righe attive (carve-out azzeramento)"
```

---

## Task 7: Divergence guard — badge read-time + assertion Natura N4 + log automatico

**Files:**
- Modify: `src/lib/fattura/generate-xml.ts` (assertion N4 + log divergenza sul ramo automatico); componenti display per il badge (`LavoriInAttesaSection.tsx`, e dove si mostra il totale in scheda/portale).
- Test: `tests/unit/generate-xml-prezzo.test.ts` (aggiungi casi).

- [ ] **Step 1: Assertion Natura N4 (test che fallisce)** — emissione con una `riga.natura_iva !== 'N4'` → deve lanciare/bloccare. Aggiungi il caso al test.

- [ ] **Step 2: Implementa assertion** — in `generate-xml.ts`, prima di costruire il riepilogo, se `lavoro.lavorazioni.some(r => r.natura_iva && r.natura_iva !== 'N4')` → `throw new Error('Natura IVA non N4 su riga di lavorazione: FatturaPA custom-made richiede N4')`.

- [ ] **Step 3: Log divergenza sul ramo automatico** — nel ramo `else` (senza `fatturaId`, CONSEGNA automatica), calcolare `const dv = divergenzaPrezzo(lavoro)` e se `dv.divergente` emettere un `console.warn('[N4] divergenza prezzo in emissione automatica', { lavoroId: lavoro.id, deltaCents: dv.deltaCents })`. Procede comunque (le righe vincono). Import `divergenzaPrezzo`.

- [ ] **Step 4: Badge display** — in `LavoriInAttesaSection.tsx` (e superfici che mostrano il totale del lavoro), quando `divergenzaPrezzo(l).divergente`, rendere un badge non bloccante "verifica prezzo" (token DS, colore `--c-amber`). Read-time, nessuno stato persistito.

- [ ] **Step 5: Esegui test + tsc → PASS/clean. Commit**
```bash
git add src/lib/fattura/generate-xml.ts src/components/features/scadenzario/LavoriInAttesaSection.tsx tests/unit/generate-xml-prezzo.test.ts
git commit -m "feat(fattura): assertion Natura N4 + badge/log divergenza prezzo (read-time)"
```

---

## Task 8: Grep-tripwire — nessun lettore grezzo di `lavori.prezzo_unitario` (guard)

**Files:**
- Test: `tests/unit/prezzo-tripwire.test.ts`

- [ ] **Step 1: Scrivi il tripwire** — scansiona `src/lib/contabilita/**`, `src/lib/fattura/**`, `src/app/api/**` (file `.ts`) e segnala nuovi accessi a `l.prezzo_unitario` / `.prezzo_unitario ?? 0` fuori da un'allowlist esplicita (i file già convertiti che ancora lo *selezionano* per passarlo all'helper). Etichetta il test come **tripwire** (commento) non garanzia; `lavori_lavorazioni.prezzo_unitario` (prezzo unitario di riga) va escluso dall'euristica (match solo su `l.prezzo_unitario`/`lavoro.prezzo_unitario`).

- [ ] **Step 2: Esegui — PASS** (dopo Task 2-5 non devono restare lettori grezzi fuori allowlist). Se FAIL, converti il file segnalato.

- [ ] **Step 3: Commit**
```bash
git add tests/unit/prezzo-tripwire.test.ts
git commit -m "test(prezzo): tripwire contro letture grezze di lavori.prezzo_unitario"
```

---

## Task 9: Regressione — i read path delle fatture emesse NON usano l'helper

**Files:**
- Test: `tests/unit/fatture-snapshot-no-helper.test.ts`

- [ ] **Step 1: Scrivi il test** — asserisci che `src/app/(app)/fatture/page.tsx`, `fatture/[id]/page.tsx`, `src/components/features/pdf/FatturaCortesiaTemplate.tsx`, `src/app/api/fatture/[id]/xml/route.ts` **non** contengano `prezzoEffettivoLavoro` (leggono lo snapshot congelato `imponibile`/`totale`/`fatture_righe`). Documenti storici invarianti.

- [ ] **Step 2: Esegui — PASS. Commit**
```bash
git add tests/unit/fatture-snapshot-no-helper.test.ts
git commit -m "test(fatture): read path snapshot congelato non dipende dall'helper prezzo"
```

---

## Task 10: FASE 7 + QA browser + reconciliation + BP-1

**Files:**
- Create: `scripts/n4-reconciliation.ts`
- Modify: `memory/MEMORY.md`, `docs/roadmap/ROADMAP-UFFICIALE.md`, `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (§N4 → risolto; nuovo follow-up bollo)

- [ ] **Step 1: FASE 7** — `npx tsc --noEmit` (0 err) · `npx vitest run` (tutti PASS) · `npx next build` (OK).

- [ ] **Step 2: Reconciliation + conteggio pre-deploy** — `scripts/n4-reconciliation.ts`: conta i lavori con righe attive e lista quelli dove `prezzoEffettivo ≠ prezzo_unitario` (audit finestra di deploy). Eseguire con env `.env.local`; riportare il conteggio (se ~0 → rollout a freddo).

- [ ] **Step 3: QA browser** — lab E2E `…0001` (MAI lab Filippo): crea un lavoro con righe che sommano ≠ `prezzo_unitario` → verifica che scadenzario, portale dentista, "pronti da fatturare" e l'anteprima fattura mostrino **lo stesso** totale (dalle righe); badge "verifica prezzo" presente; PATCH prezzo_unitario con righe → 422; azzeramento → ok. Cleanup DB a baseline.

- [ ] **Step 4: BP-1** — aggiorna `MEMORY.md` (§0 stato + helper prezzo unico + fix contabilità), `ROADMAP-UFFICIALE.md` (N4 risolto), `BACKLOG-TECNICO` (§N4 chiuso, nuovo follow-up "bollo nel dovuto").

- [ ] **Step 5: Commit + GATE merge Francesco**
```bash
git add scripts/n4-reconciliation.ts memory/MEMORY.md docs/roadmap/ROADMAP-UFFICIALE.md docs/roadmap/BACKLOG-TECNICO-2026-07-02.md
git commit -m "docs(memory): BP-1 N4 fonte di verità prezzo — risolto"
```
Presentare per review finale whole-branch, poi merge/push solo su ok esplicito di Francesco (landare i consumer read-only e verificare prima di `registra-pagamento` se si vuole rollout graduale).
