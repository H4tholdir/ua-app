# Ondata 3b (slice) — Nota dentista + reskin form ponte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dare alla nota del dentista una colonna dedicata (pulita, attribuita, mostrata nella scheda e sul buono) e portare il form ponte `/lavori/[id]/modifica` a v3 senza rebuild.

**Architecture:** Migration additiva su `lavori` (3 colonne) → il write path del portale smette di stipare tutto in `note_interne` → il consumatore realtime e i display (scheda + buono) leggono i campi puliti. Il reskin del form ponte avviene al layer delle CSS-variables (aliasing su uno scope v3 dedicato) + sweep del font, senza toccare struttura né logica del form.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase/Postgres (migration + RLS ereditata), React + stili inline con CSS-variables, TailwindCSS v4, react-pdf (`@react-pdf/renderer`) per il buono, Vitest + jsdom.

## Global Constraints

- **Lab E2E per ogni QA:** `00000000-0000-0000-0000-000000000001` — **MAI il lab Filippo**.
- **Token SOLO da `src/design-system/tokens.ts` / `ds-v3.css`**, MAI hex inline. v3 font = **Plus Jakarta Sans** (`var(--font-v3)`); v3 è **dark-aware**, VIETATE le shadow gloss `rgba(255,255,255,>.32)`.
- **PATCH risorse lab = allowlist esplicita**, MAI blocklist. Le 3 colonne nuove NON entrano in `PATCHABLE_FIELDS`.
- **Migration presente → FASE 6b obbligatoria:** dopo l'apply, `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → `npx tsc --noEmit`. L'apply al DB live è **GATE esplicito di Francesco** (`db push`).
- **RLS:** `public.current_lab_id()` (schema `public`). Le colonne additive ereditano la policy di `lavori` — nessuna nuova policy.
- **FASE 7 (verifica finale):** `npx tsc --noEmit` + `npx vitest run` + `npx next build`, output reale.
- **FASE 9b — Gate estetico L2 (obbligatorio, step finale prima del merge):** matrice **dark × 3 viewport (390/768/1280) non negoziabile**, screenshot before/after inclusi dark.
- **Merge/push = gate esplicito di Francesco.**

---

## File Structure

**Dati/backend**
- `supabase/migrations/20260714120000_lavori_note_dentista_da_portale.sql` — CREATE: 3 colonne additive.
- `src/types/database.types.ts` — rigenerato (FASE 6b).
- `src/types/domain.ts` — MODIFY: aggiungere i 3 campi a `LavoroDettaglio`/tipo lavoro (tipo hand-written).
- `src/app/api/portale/richiedi/route.ts` — MODIFY: write path + rate-limit.
- `src/hooks/useRealtimeNotifiche.ts` — MODIFY: detection su `da_portale`; estrae predicato puro.
- `src/lib/portale/richiesta-dentista.ts` — CREATE: predicato puro `isNuovaRichiestaDentista` (testabile, DRY).
- `src/app/api/lavori/[id]/route.ts` — nessuna modifica di codice; coperto da test d'esclusione allowlist.

**Frontend**
- `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` — MODIFY: monta `NotaDentista` da `note_dentista`.
- `src/components/features/pdf/BuonoTemplate.tsx` — MODIFY: stampa `note_dentista`.
- `src/app/ds-v3.css` — MODIFY: blocco scoped `.lavoro-form-v3` (aliasing variabili + focus + font).
- `src/components/features/lavori/form/styles.ts` — MODIFY: sweep font.
- `src/components/features/lavori/form/LavoroFormShell.tsx` + tab (`TabAccettazione/TabDati/TabDate/TabProve/TabClinica/TabLavorazioni/TabImmagini`) — MODIFY: sweep font; barra tab oro→v3.
- `src/app/(app)/lavori/[id]/modifica/page.tsx` — MODIFY: applica `className="lavoro-form-v3"` al wrapper `data-ds="v3"`.

**Test (in `tests/unit/`)**
- `portale-richiedi-route.test.ts` (nuovo)
- `richiesta-dentista-predicato.test.ts` (nuovo)
- `scheda-nota-dentista.test.tsx` (nuovo)
- `buono-pdf-content.test.ts` (MODIFY — aggiunge caso note_dentista)
- `lavori-patch-nota-dentista-esclusa.test.ts` (nuovo)
- `form-font-v3-sweep.test.ts` (nuovo — guard di regressione)

---

## Task 1: Migration + tipi (GATE apply Francesco + FASE 6b)

**Files:**
- Create: `supabase/migrations/20260714120000_lavori_note_dentista_da_portale.sql`
- Modify: `src/types/domain.ts` (tipo lavoro), `src/types/database.types.ts` (rigenerato)

**Interfaces:**
- Produces: colonne `lavori.note_dentista TEXT NULL`, `lavori.da_portale BOOLEAN NOT NULL DEFAULT false`, `lavori.paziente_codice_richiesta TEXT NULL`; campi TS omonimi su `LavoroDettaglio`.

- [ ] **Step 1: Scrivi la migration**

File `supabase/migrations/20260714120000_lavori_note_dentista_da_portale.sql`:
```sql
-- Ondata 3b: nota del dentista pulita + marcatore origine-portale + codice paziente
-- Additive, nullable/default → nessun impatto RLS (ereditano la policy di lavori).
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS note_dentista TEXT,
  ADD COLUMN IF NOT EXISTS da_portale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paziente_codice_richiesta TEXT;

COMMENT ON COLUMN lavori.note_dentista IS 'Nota clinica scritta dal dentista alla richiesta (portale). Read-only per il lab.';
COMMENT ON COLUMN lavori.da_portale IS 'True se il lavoro nasce da richiesta portale dentista. Sostituisce il marcatore RICHIESTA_DENTISTA in note_interne.';
COMMENT ON COLUMN lavori.paziente_codice_richiesta IS 'Codice-paziente GDPR-safe indicato dal dentista (audit della richiesta, finché il lab non assegna paziente_id).';

-- Rate-limit portale: partial index (nice-to-have, il volume è basso)
CREATE INDEX IF NOT EXISTS idx_lavori_da_portale_created
  ON lavori (cliente_id, created_at) WHERE da_portale;
```

- [ ] **Step 2: GATE apply Francesco** — NON procedere senza conferma esplicita.

Chiedi a Francesco di confermare l'apply al DB live. All'ok:
Run: `npx supabase db push`
Expected: la migration `20260714120000` applicata, nessun errore.

- [ ] **Step 3: Rigenera i tipi (FASE 6b)**

Run: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
Poi rimuovi eventuale messaggio CLI in fondo al file.

- [ ] **Step 4: Aggiungi i campi al tipo dominio**

In `src/types/domain.ts`, nel tipo del lavoro (accanto a `note_interne: string | null` / `codice_interno: string | null`), aggiungi:
```typescript
  note_dentista: string | null;
  da_portale: boolean;
  paziente_codice_richiesta: string | null;
```

- [ ] **Step 5: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**
```bash
git add supabase/migrations/20260714120000_lavori_note_dentista_da_portale.sql src/types/database.types.ts src/types/domain.ts
git commit -m "feat(db): add note_dentista/da_portale/paziente_codice_richiesta to lavori"
```

---

## Task 2: Predicato puro `isNuovaRichiestaDentista` (TDD)

Estrae la condizione oggi inline nell'hook realtime in una funzione pura, testabile e DRY.

**Files:**
- Create: `src/lib/portale/richiesta-dentista.ts`
- Test: `tests/unit/richiesta-dentista-predicato.test.ts`

**Interfaces:**
- Produces: `isNuovaRichiestaDentista(nuovo: Record<string, unknown>, ruolo: string): boolean`

- [ ] **Step 1: Scrivi il test che fallisce**

File `tests/unit/richiesta-dentista-predicato.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { isNuovaRichiestaDentista } from '@/lib/portale/richiesta-dentista'

describe('isNuovaRichiestaDentista', () => {
  it('true per lavoro da portale se ruolo titolare/front_desk', () => {
    expect(isNuovaRichiestaDentista({ da_portale: true }, 'titolare')).toBe(true)
    expect(isNuovaRichiestaDentista({ da_portale: true }, 'front_desk')).toBe(true)
  })
  it('false se da_portale non true (regressione: note_interne svuotata non deve rompere)', () => {
    expect(isNuovaRichiestaDentista({ note_interne: '' }, 'titolare')).toBe(false)
    expect(isNuovaRichiestaDentista({ da_portale: false }, 'titolare')).toBe(false)
    expect(isNuovaRichiestaDentista({}, 'titolare')).toBe(false)
  })
  it('false per ruoli non ammessi', () => {
    expect(isNuovaRichiestaDentista({ da_portale: true }, 'tecnico')).toBe(false)
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/richiesta-dentista-predicato.test.ts`
Expected: FAIL — modulo non trovato.

- [ ] **Step 3: Implementa**

File `src/lib/portale/richiesta-dentista.ts`:
```typescript
// Predicato puro: un INSERT su `lavori` è una nuova richiesta dal portale dentista?
// Sostituisce il vecchio check `note_interne.startsWith('RICHIESTA_DENTISTA')`.
export function isNuovaRichiestaDentista(nuovo: Record<string, unknown>, ruolo: string): boolean {
  return nuovo.da_portale === true && (ruolo === 'titolare' || ruolo === 'front_desk')
}
```

- [ ] **Step 4: Esegui — deve passare**

Run: `npx vitest run tests/unit/richiesta-dentista-predicato.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/portale/richiesta-dentista.ts tests/unit/richiesta-dentista-predicato.test.ts
git commit -m "feat(portale): pure predicate isNuovaRichiestaDentista"
```

---

## Task 3: Hook realtime usa `da_portale` (🔴 fix bloccante)

**Files:**
- Modify: `src/hooks/useRealtimeNotifiche.ts:110-138`

**Interfaces:**
- Consumes: `isNuovaRichiestaDentista` (Task 2).

- [ ] **Step 1: Sostituisci la condizione inline**

In `src/hooks/useRealtimeNotifiche.ts`, aggiungi l'import in testa:
```typescript
import { isNuovaRichiestaDentista } from '@/lib/portale/richiesta-dentista'
```
Poi sostituisci il blocco `(payload) => { … }` del canale `channelNuovi` (righe ~121-137):
```typescript
        (payload) => {
          const nuovo = payload.new as Record<string, unknown>
          // Ondata 3b: rileva l'origine-portale dal flag pulito, non più da
          // note_interne (che ora resta vuota per i lavori da portale).
          if (isNuovaRichiestaDentista(nuovo, ruolo)) {
            push({
              tipo: 'ordine_dentista',
              titolo: 'Nuova richiesta dentista',
              sub: `${nuovo.numero_lavoro} · ${nuovo.tipo_dispositivo ?? ''} · ${nuovo.descrizione ?? ''}`.substring(0, 60),
              href: `/lavori/${nuovo.id}`,
              cta: 'Apri →',
            })
          }
        },
```

- [ ] **Step 2: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 3: Commit**
```bash
git add src/hooks/useRealtimeNotifiche.ts
git commit -m "fix(realtime): detect nuova richiesta dentista via da_portale"
```

> **Nota QA (Task finale):** verificare a runtime che `da_portale` sia presente nel payload dell'INSERT Supabase Realtime (per gli INSERT arriva la riga completa; colonna BOOLEAN DEFAULT appena aggiunta = punto sensibile).

---

## Task 4: Write path portale scrive i campi puliti (TDD)

**Files:**
- Modify: `src/app/api/portale/richiedi/route.ts`
- Test: `tests/unit/portale-richiedi-route.test.ts`

**Interfaces:**
- Consumes: colonne di Task 1.

- [ ] **Step 1: Scrivi il test che fallisce**

File `tests/unit/portale-richiedi-route.test.ts` (mock come `portale-proposta-route.test.ts`: `vi.hoisted` + `vi.mock('@/lib/supabase/server-service')`, `mockFrom.mockImplementation(table => …)`):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockRpc: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
import { POST } from '../../src/app/api/portale/richiedi/route'

let insertPayload: Record<string, unknown> | null

function req(body: unknown): Request {
  return new Request('http://localhost/api/portale/richiedi', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  insertPayload = null
  mockRpc.mockResolvedValue({ data: 7, error: null }) // genera_progressivo
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({
        data: { id: 'cli-1', laboratorio_id: 'lab-1', portale_token_scade_at: null }, error: null,
      }) }) }) }) }
    }
    if (table === 'lavori') {
      return {
        // rate-limit: count
        select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ count: 0, error: null }) }) }) }),
        // insert
        insert: (payload: Record<string, unknown>) => {
          insertPayload = payload
          return { select: () => ({ single: async () => ({ data: { id: 'lav-1', numero_lavoro: '2026/0007' }, error: null }) }) }
        },
      }
    }
    throw new Error(`tabella non mockata: ${table}`)
  })
})

describe('POST /api/portale/richiedi — campi puliti', () => {
  it('scrive note_dentista/da_portale/paziente_codice_richiesta e lascia note_interne vuota', async () => {
    const res = await POST(req({
      token: 'tok-1', tipo_dispositivo: 'protesi_fissa', descrizione: 'Corona 14',
      paziente_codice: 'MR-2026', data_consegna_prevista: '2026-07-28', note: 'colore A2',
    }))
    expect(res.status).toBe(201)
    expect(insertPayload?.note_dentista).toBe('colore A2')
    expect(insertPayload?.da_portale).toBe(true)
    expect(insertPayload?.paziente_codice_richiesta).toBe('MR-2026')
    // note_interne NON deve contenere il vecchio marcatore
    expect(insertPayload?.note_interne ?? null).toBeNull()
  })

  it('rate-limit su da_portale: ≥10 richieste/24h → 429', async () => {
    // Ridefinisci il ramo 'lavori' per far tornare count 10 al conteggio.
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({
          data: { id: 'cli-1', laboratorio_id: 'lab-1', portale_token_scade_at: null }, error: null,
        }) }) }) }) }
      }
      if (table === 'lavori') {
        return { select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ count: 10, error: null }) }) }) }) }
      }
      throw new Error(`tabella non mockata: ${table}`)
    })
    const res = await POST(req({
      token: 'tok-1', tipo_dispositivo: 'protesi_fissa', descrizione: 'Corona 14',
      paziente_codice: 'MR-2026', data_consegna_prevista: '2026-07-28', note: 'x',
    }))
    expect(res.status).toBe(429)
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/portale-richiedi-route.test.ts`
Expected: FAIL (oggi `note_dentista` è undefined, `note_interne` contiene la stringa marcatore).

- [ ] **Step 3: Modifica il route**

In `src/app/api/portale/richiedi/route.ts`:

(a) Rate-limit (righe ~76-82): sostituisci il blocco `.like('note_interne', 'RICHIESTA_DENTISTA%')` con il flag pulito:
```typescript
  const { count: recentCount, error: countError } = await svc
    .from('lavori')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('da_portale', true)
    .gte('created_at', since24h)
```

(b) Rimuovi la costruzione di `noteInterne` (righe ~111-118) e nell'`insert` (righe ~124-145) sostituisci `note_interne: noteInterne,` con:
```typescript
      note_dentista: noteText || null,
      da_portale: true,
      paziente_codice_richiesta: pazienteCodice || null,
      // note_interne resta null: è lo spazio privato del laboratorio
```
(`noteText` e `pazienteCodice` sono già calcolati alle righe ~48-49 e restano.)

- [ ] **Step 4: Esegui — deve passare**

Run: `npx vitest run tests/unit/portale-richiedi-route.test.ts`
Expected: PASS.

- [ ] **Step 5: tsc**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**
```bash
git add src/app/api/portale/richiedi/route.ts tests/unit/portale-richiedi-route.test.ts
git commit -m "feat(portale): richiedi writes note_dentista/da_portale, frees note_interne"
```

---

## Task 5: Scheda mostra `NotaDentista` da `note_dentista` (TDD)

**Files:**
- Modify: `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx`
- Test: `tests/unit/scheda-nota-dentista.test.tsx`

**Interfaces:**
- Consumes: `NotaDentista` DS (`{ citazione, dottore, onEspandi? }`), `clienteDisplay` (già nel file).

- [ ] **Step 1: Scrivi il test che fallisce**

File `tests/unit/scheda-nota-dentista.test.tsx` (scaffold di render come `tests/unit/SchedaLavoroV3.test.tsx` — stesso mock di `next/navigation` e stesso oggetto `lavoro` minimo; se serve, copia il costruttore del lavoro da lì):
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SchedaLavoroV3 } from '@/components/features/lavori/scheda-v3/SchedaLavoroV3'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

// Riusa il factory del lavoro dal test SchedaLavoroV3.test.tsx (stesso shape).
import { lavoroBase } from './helpers/lavoro-factory' // se non esiste, inlinealo qui col minimo shape

describe('SchedaLavoroV3 — nota del dentista', () => {
  it('mostra NotaDentista quando note_dentista è presente, attribuita al dentista', () => {
    const lavoro = { ...lavoroBase(), note_dentista: 'colore A2, impronta in busta', cliente: { nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' } }
    render(<SchedaLavoroV3 lavoro={lavoro as never} ruolo="titolare" />)
    expect(screen.getByText(/colore A2/)).toBeInTheDocument()
    expect(screen.getByText(/Studio Rossi/)).toBeInTheDocument()
  })
  it('NON mostra NotaDentista quando note_dentista è null', () => {
    const lavoro = { ...lavoroBase(), note_dentista: null }
    render(<SchedaLavoroV3 lavoro={lavoro as never} ruolo="titolare" />)
    expect(screen.queryByText(/colore A2/)).not.toBeInTheDocument()
  })
})
```
> Se `./helpers/lavoro-factory` non esiste, definisci inline nel test un `lavoroBase()` col minimo shape richiesto da `SchedaLavoroV3` (copia i campi obbligatori dall'oggetto `lavoro` usato in `SchedaLavoroV3.test.tsx`).

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/scheda-nota-dentista.test.tsx`
Expected: FAIL (la nota del dentista non è renderizzata).

- [ ] **Step 3: Implementa**

In `SchedaLavoroV3.tsx`: aggiungi l'import
```typescript
import { NotaDentista } from '@/components/ds/NotaDentista'
```
Subito PRIMA del blocco `{lavoro.note_interne ? ( <NotaLaboratorio … /> ) …}` (riga ~257) inserisci:
```tsx
          {lavoro.note_dentista ? (
            <NotaDentista citazione={lavoro.note_dentista} dottore={clienteDisplay(lavoro.cliente)} />
          ) : null}
```
(read-only: nessun `onEspandi` → renderizza la variante non interattiva.)

- [ ] **Step 4: Esegui — deve passare**

Run: `npx vitest run tests/unit/scheda-nota-dentista.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx tests/unit/scheda-nota-dentista.test.tsx
git commit -m "feat(scheda): show NotaDentista from note_dentista (read-only)"
```

---

## Task 6: Buono stampa `note_dentista` (TDD)

**Files:**
- Modify: `src/components/features/pdf/BuonoTemplate.tsx:382-390`
- Test: `tests/unit/buono-pdf-content.test.ts` (aggiungi un caso)

**Interfaces:**
- Consumes: `lavoro.note_dentista` (Task 1).

- [ ] **Step 1: Aggiungi il test di contenuto che fallisce**

In `tests/unit/buono-pdf-content.test.ts`, aggiungi un caso che renderizza il buono per un lavoro con `note_dentista` e verifica che il testo compaia nel PDF (usa lo stesso helper di estrazione testo PDF già presente nel file — `pdf-parse`/`renderToBuffer`):
```typescript
it('stampa la nota del dentista sul buono', async () => {
  const testo = await estraiTestoBuono({ ...lavoroBuonoBase(), note_dentista: 'colore A2 chiaro', note_interne: null })
  expect(testo).toContain('colore A2 chiaro')
  expect(testo).toContain('Dentista') // etichetta della sezione
})
```
> Riusa il factory `lavoroBuonoBase()` e la funzione `estraiTestoBuono()` già definiti nel file (stesso pattern degli altri casi content-check).

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/buono-pdf-content.test.ts`
Expected: FAIL (`note_dentista` non è stampato).

- [ ] **Step 3: Implementa**

In `BuonoTemplate.tsx`, subito prima del blocco `{lavoro.note_interne ? ( … Note … )}` (riga ~382), aggiungi la sezione nota dentista:
```tsx
        {lavoro.note_dentista ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.pazienteLabel}>Nota del dentista</Text>
            <Text style={{ fontSize: 8, color: '#444444', marginTop: 2 }}>
              {lavoro.note_dentista}
            </Text>
          </View>
        ) : null}
```
(La sezione «Note» esistente per `note_interne` resta invariata sotto: il lab può avere una sua nota separata.)

- [ ] **Step 4: Esegui — deve passare**

Run: `npx vitest run tests/unit/buono-pdf-content.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/features/pdf/BuonoTemplate.tsx tests/unit/buono-pdf-content.test.ts
git commit -m "feat(buono): print note_dentista on production work order"
```

---

## Task 7: `note_dentista`/`da_portale`/`paziente_codice_richiesta` fuori dalla PATCH-allowlist (TDD di invariante)

**Files:**
- Test: `tests/unit/lavori-patch-nota-dentista-esclusa.test.ts` (nuovo)
- (Nessuna modifica di codice attesa: le colonne semplicemente NON sono in `PATCHABLE_FIELDS`. Il test blinda l'invariante — modello: `tests/unit/lavori-patch-invariante-d7.test.ts`.)

- [ ] **Step 1: Scrivi il test**

File `tests/unit/lavori-patch-nota-dentista-esclusa.test.ts`: modella su `lavori-patch-invariante-d7.test.ts` (stesso mock del route PATCH `src/app/api/lavori/[id]/route.ts`). Invia un PATCH con `note_dentista`/`da_portale`/`paziente_codice_richiesta` nel body e asserisci che il payload di UPDATE passato a Supabase **non** li contenga (scartati dall'allowlist), esattamente come il test D7 fa per `proposta_dentista`.
```typescript
it('scarta note_dentista/da_portale/paziente_codice_richiesta dal PATCH (read-only per il lab)', async () => {
  await PATCH(reqPatch({ note_dentista: 'hack', da_portale: true, paziente_codice_richiesta: 'X', priorita: 'urgente' }), ctx)
  expect(updatePayload).not.toHaveProperty('note_dentista')
  expect(updatePayload).not.toHaveProperty('da_portale')
  expect(updatePayload).not.toHaveProperty('paziente_codice_richiesta')
  expect(updatePayload).toHaveProperty('priorita', 'urgente') // un campo lecito passa
})
```
> Copia lo scaffold (mock `getServiceClient`, `reqPatch`, cattura `updatePayload`) da `lavori-patch-invariante-d7.test.ts`.

- [ ] **Step 2: Esegui — deve passare subito (invariante già vera)**

Run: `npx vitest run tests/unit/lavori-patch-nota-dentista-esclusa.test.ts`
Expected: PASS (le colonne non sono in `PATCHABLE_FIELDS`). Se FALLISCE, qualcuno le ha aggiunte per errore → rimuoverle dall'allowlist.

- [ ] **Step 3: Commit**
```bash
git add tests/unit/lavori-patch-nota-dentista-esclusa.test.ts
git commit -m "test(lavori): lock note_dentista/da_portale out of PATCH allowlist"
```

---

## Task 8: Reskin — aliasing variabili su scope `.lavoro-form-v3` + applicazione classe

Chiude il bug dark (shadow raised) e allinea colori/ombre a v3 in un solo blocco.

**Files:**
- Modify: `src/app/ds-v3.css`
- Modify: `src/app/(app)/lavori/[id]/modifica/page.tsx`

- [ ] **Step 1: Aggiungi il blocco scoped in `ds-v3.css`**

In fondo alla sezione scope di `src/app/ds-v3.css`, aggiungi:
```css
/* Ondata 3b — reskin form ponte: il form legge --t1/--t2/--sh-b/--sh-i/--line
   (fallback v2.3). Qui li aliasiamo ai token v3, così colori+ombre+font virano
   su tutti i tab in entrambi i temi senza toccare gli style-object. */
[data-ds="v3"] .lavoro-form-v3 {
  --t1: var(--ink);
  --t2: var(--muted);
  --t3: var(--faint);
  --sh-b: var(--sh-card);
  --sh-i: inset 0 1px 2px rgba(50,40,25,.06);
  --line-form: var(--line);
  font-family: var(--font-v3);
}
[data-ds="v3"] .lavoro-form-v3 :where(input, textarea, select) {
  font-family: var(--font-v3);
  border-color: var(--line);
  min-height: 44px; /* touch target di legge */
}
[data-ds="v3"] .lavoro-form-v3 :where(input, textarea, select):focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 2px;
}
[data-theme="dark"] [data-ds="v3"] .lavoro-form-v3 {
  --sh-b: none;   /* v3 dark = flat */
  --sh-i: none;
}
```

- [ ] **Step 2: Applica la classe al wrapper del ponte**

In `src/app/(app)/lavori/[id]/modifica/page.tsx`, il `<div data-ds="v3" …>` (riga ~99): aggiungi `className="lavoro-form-v3"`:
```tsx
    <div data-ds="v3" className="lavoro-form-v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
```

- [ ] **Step 3: Verifica compilazione/build parziale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 4: Commit**
```bash
git add src/app/ds-v3.css "src/app/(app)/lavori/[id]/modifica/page.tsx"
git commit -m "feat(form-ponte): alias v2.3 vars to v3 tokens on .lavoro-form-v3 (fixes dark)"
```

---

## Task 9: Reskin — sweep font DM Sans → var(--font-v3) + tab oro→v3 (TDD guard)

**Files:**
- Modify: `src/components/features/lavori/form/styles.ts`, `LavoroFormShell.tsx`, e i tab con `fontFamily: 'DM Sans…'` inline (`TabAccettazione.tsx`, `TabDati.tsx`, `TabDate.tsx`, `TabProve.tsx`, `TabClinica.tsx`, `TabLavorazioni.tsx`, `TabImmagini.tsx`)
- Test: `tests/unit/form-font-v3-sweep.test.ts` (guard di regressione)

- [ ] **Step 1: Scrivi il guard-test che fallisce**

File `tests/unit/form-font-v3-sweep.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const FORM_DIR = join(process.cwd(), 'src/components/features/lavori/form')

describe('form ponte — nessun DM Sans residuo (v3)', () => {
  it('nessun file del form contiene il letterale "DM Sans"', () => {
    const files = readdirSync(FORM_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
    const colpevoli = files.filter(f => readFileSync(join(FORM_DIR, f), 'utf8').includes('DM Sans'))
    expect(colpevoli).toEqual([])
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/form-font-v3-sweep.test.ts`
Expected: FAIL — elenca i file con `DM Sans`.

- [ ] **Step 3: Sweep del font**

In `src/components/features/lavori/form/styles.ts` sostituisci ogni `fontFamily: 'DM Sans, sans-serif'` con `fontFamily: 'var(--font-v3, "DM Sans", sans-serif)'`. Fai lo stesso in `LavoroFormShell.tsx` e in ogni tab elencato sopra (cerca `DM Sans` in ciascuno). In alternativa, rimuovi la riga `fontFamily` inline dove lo scope `.lavoro-form-v3` può cascare (input/textarea/select già coperti dal Task 8) — ma per titoli/label che non sono form-control, usa `var(--font-v3, …)`.

Verifica di averli presi tutti:
Run: `grep -rl "DM Sans" src/components/features/lavori/form`
Expected: nessun output.

- [ ] **Step 4: Barra tab oro → v3 in `LavoroFormShell.tsx`**

Individua nella `LavoroFormShell` gli stili della barra tab che usano oro/hex v2.3 (colore attivo dorato, bordo inferiore). Sostituisci: tab attivo → `color: 'var(--ink)'` + indicatore `background: 'var(--red)'`; tab inattivo → `color: 'var(--muted)'`; nessun oro. Aggiungi `:focus-visible` sui bottoni-tab se assente (outline `var(--red)`).

- [ ] **Step 5: Esegui il guard + tsc**

Run: `npx vitest run tests/unit/form-font-v3-sweep.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**
```bash
git add src/components/features/lavori/form tests/unit/form-font-v3-sweep.test.ts
git commit -m "feat(form-ponte): sweep DM Sans->font-v3, tab oro->v3, focus rings"
```

---

## Task 10: Verifica finale (FASE 7) + QA browser + Gate estetico L2 (FASE 9b) + BP-1

**Files:**
- Create: screenshot in `docs/design/screenshots/2026-07-14-ondata-3b/{before,after}/`
- Modify: `memory/MEMORY.md`, `docs/roadmap/ROADMAP-UFFICIALE.md`

- [ ] **Step 1: FASE 7 — verifica completa**

Run: `npx tsc --noEmit`
Expected: nessun errore.
Run: `npx vitest run`
Expected: tutti PASS (baseline 1596 + i nuovi, 0 fail).
Run: `npx next build`
Expected: build OK, route `/lavori/[id]/modifica` registrata.

- [ ] **Step 2: QA browser — lab E2E `00000000-…-0001` (MAI lab Filippo)**

Dev server del worktree. Scenario end-to-end:
1. Richiesta dal portale (`/richiedi/[token]`) con nota «colore A2» → verifica DB: `note_dentista='colore A2'`, `da_portale=true`, `paziente_codice_richiesta` valorizzato, `note_interne` NULL.
2. **Notifica realtime** «Nuova richiesta dentista» arriva al titolare (verifica il fix del payload `da_portale`).
3. Scheda `/lavori/[id]`: `NotaDentista` mostrata e attribuita al dentista, separata dalla nota lab.
4. Buono di lavorazione: la nota del dentista è stampata.
5. Form ponte `/lavori/[id]/modifica`: font Plus Jakarta, nessuna barra tab oro, focus ring, **dark mode senza shadow raised**.
Cleanup DB a baseline ESATTO.

- [ ] **Step 3: Gate estetico L2 (FASE 9b) — SOLO superficie del form ponte**

Micro-audit delle ~6 sezioni regredibili da un reskin (tipografia, colore/contrasto, elevazione/ombre, **parità dark**, focus states, touch target) × 390/768/1280 × **light+dark**. Screenshot before/after (inclusi dark) in `docs/design/screenshots/2026-07-14-ondata-3b/`. Ogni ❌ risolto o deferito con motivo.

- [ ] **Step 4: BP-1 — aggiorna la memoria**

Aggiorna `memory/MEMORY.md` (§0 stato + nuove colonne + write-path portale) e `docs/roadmap/ROADMAP-UFFICIALE.md` (3b slice completata; deferiti P3/N4 tracciati).

- [ ] **Step 5: Commit BP-1**
```bash
git add memory/MEMORY.md docs/roadmap/ROADMAP-UFFICIALE.md docs/design/screenshots/2026-07-14-ondata-3b
git commit -m "docs(memory): BP-1 Ondata 3b slice — nota dentista + reskin form ponte"
```

- [ ] **Step 6: GATE merge Francesco** — presentare per review finale whole-branch, poi merge/push solo su ok esplicito.
