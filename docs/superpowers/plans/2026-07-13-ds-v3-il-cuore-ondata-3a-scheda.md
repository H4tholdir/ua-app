# Ondata 3a — Scheda lavoro v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare la route `/lavori/[id]` da form multi-tab v2.3 a scheda-vista v3 (sola lettura + modifica per-riga via Sheet + menu ⋯), lasciando i flussi pesanti a ponte verso il form v2.3 fino a 3b.

**Architecture:** Un componente client riusabile `SchedaLavoroV3` (riceve il `LavoroDettaglio` già caricato dalla pagina server) compone header, `CardInfo` con righe tappabili→Sheet, `NotaDentista`, strip foto read-only, `CardFasiV3` (fasi read-only con gesto FATTA), `TastoPrimario CONSEGNA` (naviga a `/consegna` v2.3 quando consegnabile), azioni contestuali (Rifacimento/Segnala), banner annullo e menu ⋯. Le voci ⋯ pesanti navigano a una route-ponte `/lavori/[id]/modifica` che rende il `LavoroFormClient` esistente con il tasto CONSEGNA soppresso. Zero API nuove, zero migration.

**Tech Stack:** Next.js 16 App Router · React client components · Motion 12 (`src/design-system/v3/motion`) · componenti ds v3 (`src/components/ds/`) · vitest + @testing-library/react.

## Global Constraints

- **DS v3 only:** componenti da `src/components/ds/`, animazioni SOLO da `src/design-system/v3/motion`, token da `src/design-system/v3/tokens`. MAI `duration`/easing inline (§4 CLAUDE.md).
- **Scoping v3:** il page-root di ogni superficie migrata ha `data-ds="v3"` e `background: var(--bg)` dipinto inline.
- **Zero API nuove, zero migration.** Tutti gli endpoint esistono già.
- **PATCH ottimistico + rollback + `Avviso`** su ogni scrittura (L6). Mai scrittura silenziosa.
- **CONSEGNA:** abilitato ⟺ `derivaUrgenza(lavoro, new Date()).consegnabile === true` (cioè `stato ∈ {pronto, in_ritardo}`, `STATI_CONSEGNABILI`); al tap `router.push('/lavori/[id]/consegna')`. Disabled ⟹ `motivoDisabilitato="Completa il controllo finale per consegnare"`. MAI nascosto.
- **`bridged` sopprime SOLO il tasto CONSEGNA del form, non la barra Salva.**
- **Annulla lavoro** è una voce ⋯ presente ma **disabilitata** (nessun backend — feature rimandata).
- **Test:** in `tests/unit/*.test.tsx`, `import { render, screen, fireEvent, waitFor } from '@testing-library/react'`, mock di `next/navigation` (`useRouter` → `{ push, refresh }`), `fetch` mockato con `vi.fn()`. Import dai path relativi `../../src/...`.
- **Baseline suite:** 1561 pass | 4 skipped (più i nuovi test). `npx tsc --noEmit`, `npx vitest run`, `npx next build` tutti puliti prima di dichiarare fatto.
- **QA browser:** lab E2E `00000000-0000-0000-0000-000000000001`, **MAI** lab Filippo. 3 viewport (390/768/1280) × 2 temi.
- **Esecuzione in worktree dedicato** (`superpowers:using-git-worktrees`); copiare `.env.local`.

---

## File Structure

**Nuovi:**
- `src/lib/lavori/stato-pill.ts` — helper: da `LavoroDettaglio` → props della pill di stato dell'header (riusa `derivaUrgenza`, con fallback per stati fuori-pila).
- `src/components/features/lavori/scheda-v3/CardFasiV3.tsx` — card «Le fasi»: mappa `lavoro.fasi` → `RigaFase`, marca la prossima non fatta, `onFatta` → PATCH ottimistico.
- `src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx` — `Sheet` di modifica per-riga; in base a `campo` rende il controllo giusto (consegna/tecnico/dentista/note); PATCH ottimistico.
- `src/components/features/lavori/scheda-v3/MenuSchedaSheet.tsx` — `Sheet` menu ⋯ con le 6 voci del mockup.
- `src/components/features/lavori/scheda-v3/DocumentiSheet.tsx` — `Sheet` hub documenti (download endpoint esistenti).
- `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` — orchestratore client della scheda-vista.
- `src/app/(app)/lavori/[id]/modifica/page.tsx` — route-ponte (rende `LavoroFormClient` bridged).

**Modificati:**
- `src/app/(app)/lavori/[id]/page.tsx` — monta `SchedaLavoroV3` al posto del blocco v2.3.
- `src/components/features/lavori/LavoroFormClient.tsx` — nuove prop `defaultTab?: TabId` e `bridged?: boolean`.

**Test (nuovi):** `tests/unit/stato-pill.test.ts`, `tests/unit/CardFasiV3.test.tsx`, `tests/unit/ModificaRigaSheet.test.tsx`, `tests/unit/MenuSchedaSheet.test.tsx`, `tests/unit/DocumentiSheet.test.tsx`, `tests/unit/SchedaLavoroV3.test.tsx`, `tests/unit/LavoroFormClient.bridged.test.tsx`.

---

## Task 1: Helper pill di stato dell'header

**Files:**
- Create: `src/lib/lavori/stato-pill.ts`
- Test: `tests/unit/stato-pill.test.ts`

**Interfaces:**
- Consumes: `derivaUrgenza`, `Urgenza` da `@/lib/lavori/urgenza`; `Famiglia` da `@/components/ds/Pill`; `StatoLavoro` da `@/types/domain`.
- Produces: `pillStatoScheda(lavoro: { stato: StatoLavoro; data_consegna_prevista: string; ora_consegna: string | null }, oggi: Date): { testo: string; famiglia: Famiglia }` — la pill sempre valorizzata per l'header (§3.1), anche per stati fuori-pila dove `derivaUrgenza().pillTempo` è `null`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/stato-pill.test.ts
import { describe, it, expect } from 'vitest'
import { pillStatoScheda } from '../../src/lib/lavori/stato-pill'

const OGGI = new Date(2026, 6, 13) // 13 lug 2026 (mese 0-based)

describe('pillStatoScheda', () => {
  it('pronto in giornata → PRONTA ✓ verde', () => {
    const r = pillStatoScheda({ stato: 'pronto', data_consegna_prevista: '2026-07-20', ora_consegna: null }, OGGI)
    expect(r).toEqual({ testo: 'PRONTA ✓', famiglia: 'green' })
  })
  it('consegnato → CONSEGNATO ✓ verde (fuori-pila, pillTempo null)', () => {
    const r = pillStatoScheda({ stato: 'consegnato', data_consegna_prevista: '2026-07-10', ora_consegna: null }, OGGI)
    expect(r).toEqual({ testo: 'CONSEGNATO ✓', famiglia: 'green' })
  })
  it('annullato → ANNULLATO grigio', () => {
    const r = pillStatoScheda({ stato: 'annullato', data_consegna_prevista: '2026-07-10', ora_consegna: null }, OGGI)
    expect(r).toEqual({ testo: 'ANNULLATO', famiglia: 'neutral' })
  })
  it('in_lavorazione senza ritardo → IN LAVORAZIONE ambra (pillTempo null)', () => {
    const r = pillStatoScheda({ stato: 'in_lavorazione', data_consegna_prevista: '2026-07-20', ora_consegna: null }, OGGI)
    expect(r).toEqual({ testo: 'IN LAVORAZIONE', famiglia: 'amber' })
  })
  it('in ritardo → usa la pill di derivaUrgenza (rossa)', () => {
    const r = pillStatoScheda({ stato: 'in_ritardo', data_consegna_prevista: '2026-07-12', ora_consegna: null }, OGGI)
    expect(r.famiglia).toBe('red')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/stato-pill.test.ts`
Expected: FAIL — `pillStatoScheda` non esiste.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/lavori/stato-pill.ts
// Pill di stato dell'header scheda (§3.1). Riusa derivaUrgenza (E4) quando
// produce una pillTempo; per gli stati fuori-pila (consegnato/annullato/
// in_lavorazione senza ritardo) derivaUrgenza restituisce pillTempo null,
// quindi qui forniamo un fallback esplicito — l'header ha SEMPRE una pill.
import { derivaUrgenza } from '@/lib/lavori/urgenza'
import type { Famiglia } from '@/components/ds/Pill'
import type { StatoLavoro } from '@/types/domain'

type LavoroPill = { stato: StatoLavoro; data_consegna_prevista: string; ora_consegna: string | null }

const FALLBACK: Partial<Record<StatoLavoro, { testo: string; famiglia: Famiglia }>> = {
  consegnato: { testo: 'CONSEGNATO ✓', famiglia: 'green' },
  annullato: { testo: 'ANNULLATO', famiglia: 'neutral' },
  in_lavorazione: { testo: 'IN LAVORAZIONE', famiglia: 'amber' },
}

export function pillStatoScheda(lavoro: LavoroPill, oggi: Date): { testo: string; famiglia: Famiglia } {
  const u = derivaUrgenza(lavoro, oggi)
  if (u.pillTempo) return u.pillTempo
  return FALLBACK[lavoro.stato] ?? { testo: 'IN LAVORAZIONE', famiglia: 'amber' }
}
```

> Nota: verificare che `Famiglia` includa `'neutral'`. Se non esiste una famiglia neutra in `Pill.tsx`, usare `'amber'` per `annullato` e aggiornare il test di conseguenza (leggere `src/components/ds/Pill.tsx` → `type Famiglia`). Non introdurre una famiglia nuova.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/stato-pill.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/lavori/stato-pill.ts tests/unit/stato-pill.test.ts
git commit -m "feat(scheda-v3): helper pillStatoScheda per header scheda lavoro"
```

---

## Task 2: CardFasiV3 — fasi read-only con gesto FATTA

**Files:**
- Create: `src/components/features/lavori/scheda-v3/CardFasiV3.tsx`
- Test: `tests/unit/CardFasiV3.test.tsx`

**Interfaces:**
- Consumes: `CardInfo` da `@/components/ds/CardInfo`; `RigaFase` da `@/components/ds/RigaFase`; `LavoroFase` da `@/types/domain`.
- Produces: `CardFasiV3(props: { lavoroId: string; fasi: LavoroFase[]; onErrore: (msg: string) => void })`. Ogni `LavoroFase` ha `id`, `eseguita_at`, `tecnico_id`, `esito`, e il join `fase` con `nome`. Marca FATTA la **prima fase non eseguita** (`prossima`) via `onFatta` → `PATCH /api/lavori/{lavoroId}/fasi/{faseId}` body `{ eseguita_at: <ISO> }`, ottimistico con rollback + `onErrore`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/CardFasiV3.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CardFasiV3 } from '../../src/components/features/lavori/scheda-v3/CardFasiV3'
import type { LavoroFase } from '../../src/types/domain'

function fase(over: Partial<LavoroFase> & { id: string; nome: string }): LavoroFase {
  return {
    id: over.id, laboratorio_id: 'lab', lavoro_id: 'lav', fase_id: 'f-' + over.id,
    tecnico_id: over.tecnico_id ?? null, eseguita_at: over.eseguita_at ?? null,
    esito: over.esito ?? null,
    // join fase con nome (PostgREST embed)
    fase: { nome: over.nome } as LavoroFase['fase'],
  } as LavoroFase
}

beforeEach(() => { vi.restoreAllMocks() })

describe('CardFasiV3', () => {
  const fasi = [
    fase({ id: '1', nome: 'Fresatura', eseguita_at: '2026-07-12T14:20:00Z' }),
    fase({ id: '2', nome: 'Controllo finale' }), // prossima
  ]

  it('mostra i nomi delle fasi e una sola PillFase FATTA sulla prossima', () => {
    render(<CardFasiV3 lavoroId="lav" fasi={fasi} onErrore={() => {}} />)
    expect(screen.getByText('Fresatura')).toBeInTheDocument()
    expect(screen.getByText('Controllo finale')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /FATTA/i })).toHaveLength(1)
  })

  it('tap su FATTA invia PATCH con eseguita_at', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<CardFasiV3 lavoroId="lav" fasi={fasi} onErrore={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /FATTA/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/lavori/lav/fasi/2',
      expect.objectContaining({ method: 'PATCH' }),
    ))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.eseguita_at).toBeTruthy()
  })

  it('su errore PATCH chiama onErrore e ripristina', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)
    const onErrore = vi.fn()
    render(<CardFasiV3 lavoroId="lav" fasi={fasi} onErrore={onErrore} />)
    fireEvent.click(screen.getByRole('button', { name: /FATTA/i }))
    await waitFor(() => expect(onErrore).toHaveBeenCalled())
    // la PillFase torna visibile (rollback)
    expect(screen.getAllByRole('button', { name: /FATTA/i })).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/CardFasiV3.test.tsx`
Expected: FAIL — componente inesistente.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/features/lavori/scheda-v3/CardFasiV3.tsx
'use client'
import { useRef, useState } from 'react'
import { CardInfo } from '@/components/ds/CardInfo'
import { RigaFase } from '@/components/ds/RigaFase'
import type { LavoroFase } from '@/types/domain'

// §5 spec 3a: fasi read-only tranne il gesto di completamento. La prima fase
// non eseguita è `prossima` (RigaFase mostra la PillFase FATTA). Il PATCH è
// ottimistico con rollback (pattern di LavoroFormClient.handleUpdateFase,
// incluso il request-id ref anti doppio-tap). L'editing avanzato (esito/
// non-conformità) è 3b: qui non si tocca.
export function CardFasiV3(props: { lavoroId: string; fasi: LavoroFase[]; onErrore: (msg: string) => void }) {
  const { lavoroId, onErrore } = props
  const [fasi, setFasi] = useState<LavoroFase[]>(props.fasi)
  const reqRef = useRef<Record<string, number>>({})

  const idxProssima = fasi.findIndex((f) => !f.eseguita_at)

  async function marcaFatta(f: LavoroFase) {
    const eseguita_at = new Date().toISOString()
    const prev = f
    const req = (reqRef.current[f.id] ?? 0) + 1
    reqRef.current[f.id] = req
    setFasi((p) => p.map((x) => (x.id === f.id ? { ...x, eseguita_at } : x)))
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/fasi/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eseguita_at }),
      })
      if (reqRef.current[f.id] !== req) return
      if (!res.ok) {
        setFasi((p) => p.map((x) => (x.id === f.id ? prev : x)))
        onErrore('Non è stato possibile segnare la fase come fatta. Riprova.')
      }
    } catch {
      if (reqRef.current[f.id] !== req) return
      setFasi((p) => p.map((x) => (x.id === f.id ? prev : x)))
      onErrore('Non è stato possibile segnare la fase come fatta. Riprova.')
    }
  }

  function chiQuando(f: LavoroFase): string | undefined {
    if (!f.eseguita_at) return undefined
    const d = new Date(f.eseguita_at)
    return d.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <CardInfo>
      {fasi.map((f, i) => (
        <RigaFase
          key={f.id}
          nome={f.fase?.nome ?? 'Fase'}
          fatto={!!f.eseguita_at}
          chiQuando={chiQuando(f)}
          prossima={i === idxProssima}
          onFatta={i === idxProssima ? () => marcaFatta(f) : undefined}
        />
      ))}
    </CardInfo>
  )
}
```

> Verificare in `src/types/domain.ts` la forma esatta del join `fase` su `LavoroFase` (nome del campo e tipo). La pagina carica `fasi:lavori_fasi(*, fase:fasi_produzione(*))`, quindi `f.fase.nome` esiste a runtime; adeguare l'accesso (`f.fase?.nome`) al tipo reale, senza `as any`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/CardFasiV3.test.tsx`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/features/lavori/scheda-v3/CardFasiV3.tsx tests/unit/CardFasiV3.test.tsx
git commit -m "feat(scheda-v3): CardFasiV3 fasi read-only con gesto FATTA ottimistico"
```

---

## Task 3: ModificaRigaSheet — modifica per-riga

**Files:**
- Create: `src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx`
- Test: `tests/unit/ModificaRigaSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `CampoData`, `CampoTesto` (da `@/components/ds/Campo`), `TileScelta`, `RigaCerca`; `ClienteComboBox` da `@/components/features/clienti/ClienteComboBox` (per dentista); `GET /api/tecnici`.
- Produces: `ModificaRigaSheet(props: { aperto: boolean; onChiudi: () => void; lavoroId: string; campo: 'consegna' | 'tecnico' | 'dentista' | 'note'; valoreIniziale: ...; onSalvato: (patch: Record<string, unknown>) => void; onErrore: (msg: string) => void })`. Al salvataggio invia `PATCH /api/lavori/{lavoroId}` con il campo pertinente (`data_consegna_prevista`/`ora_consegna` | `tecnico_id` | `cliente_id` | `note_interne`) e chiama `onSalvato(patch)` (aggiornamento ottimistico gestito dal padre) o `onErrore`.

- [ ] **Step 1: Write the failing test** (caso «note» — nessuna dipendenza esterna)

```tsx
// tests/unit/ModificaRigaSheet.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModificaRigaSheet } from '../../src/components/features/lavori/scheda-v3/ModificaRigaSheet'

describe('ModificaRigaSheet — note', () => {
  it('salva note_interne via PATCH e chiama onSalvato', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const onSalvato = vi.fn()
    render(
      <ModificaRigaSheet
        aperto campo="note" lavoroId="lav" valoreIniziale="vecchia"
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={() => {}}
      />,
    )
    const input = screen.getByLabelText(/note/i)
    fireEvent.change(input, { target: { value: 'nuova nota' } })
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/lavori/lav',
      expect.objectContaining({ method: 'PATCH' }),
    ))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ note_interne: 'nuova nota' })
    await waitFor(() => expect(onSalvato).toHaveBeenCalledWith({ note_interne: 'nuova nota' }))
  })

  it('su errore chiama onErrore, non onSalvato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))
    const onSalvato = vi.fn(); const onErrore = vi.fn()
    render(
      <ModificaRigaSheet aperto campo="note" lavoroId="lav" valoreIniziale=""
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={onErrore} />,
    )
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(onErrore).toHaveBeenCalled())
    expect(onSalvato).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ModificaRigaSheet.test.tsx`
Expected: FAIL — componente inesistente.

- [ ] **Step 3: Write minimal implementation**

Struttura: uno `Sheet` con `titolo` per-campo e un corpo che varia sul discriminante `campo`. Logica di salvataggio comune (`salva(patch)`), poi un ramo di render per ogni campo. Il caso «tecnico» fa `GET /api/tecnici` on-open e popola `TileScelta`; «dentista» usa `ClienteComboBox`; «consegna» usa `CampoData` + input ora; «note» usa `CampoTesto`.

```tsx
// src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx
'use client'
import { useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto, CampoData } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'

type Campo = 'consegna' | 'tecnico' | 'dentista' | 'note'
const TITOLI: Record<Campo, string> = {
  consegna: 'Data di consegna', tecnico: 'Tecnico assegnato',
  dentista: 'Dentista', note: 'Note interne',
}

export function ModificaRigaSheet(props: {
  aperto: boolean; onChiudi: () => void; lavoroId: string; campo: Campo
  valoreIniziale: unknown
  onSalvato: (patch: Record<string, unknown>) => void
  onErrore: (msg: string) => void
}) {
  const { aperto, onChiudi, lavoroId, campo, onSalvato, onErrore } = props
  const [valore, setValore] = useState<unknown>(props.valoreIniziale)
  const [salvando, setSalvando] = useState(false)

  async function salva(patch: Record<string, unknown>) {
    setSalvando(true)
    try {
      const res = await fetch(`/api/lavori/${lavoroId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) { onErrore('Non è stato possibile salvare la modifica. Riprova.'); return }
      onSalvato(patch)
      onChiudi()
    } catch {
      onErrore('Non è stato possibile salvare la modifica. Riprova.')
    } finally { setSalvando(false) }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo={TITOLI[campo]}>
      {campo === 'note' && (
        <>
          <CampoTesto label="Note interne" valore={String(valore ?? '')} onCambia={setValore as (v: string) => void} />
          <TastoPrimario disabled={salvando} onClick={() => salva({ note_interne: String(valore ?? '') })}>Salva</TastoPrimario>
        </>
      )}
      {/* consegna / tecnico / dentista: vedi Step 3b */}
    </Sheet>
  )
}
```

> Verificare la firma esatta di `CampoTesto` (`src/components/ds/Campo.tsx:57`) — nome props `label`/`valore`/`onCambia`. Adeguare `getByLabelText(/note/i)` all'attributo reale reso da `CampoTesto` (`aria-label` o `<label>`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ModificaRigaSheet.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 5: Implement the remaining fields (consegna/tecnico/dentista)**

Aggiungere i rami: **consegna** (`CampoData` per `data_consegna_prevista` in formato `YYYY-MM-DD` + input `time` per `ora_consegna`, salva entrambi); **tecnico** (`useEffect` on-open → `GET /api/tecnici`, lista `TileScelta`, al tap `salva({ tecnico_id })`); **dentista** (`ClienteComboBox`, al select `salva({ cliente_id })`). Aggiungere un test per «consegna» che verifica il body `{ data_consegna_prevista, ora_consegna }`.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx tests/unit/ModificaRigaSheet.test.tsx
git commit -m "feat(scheda-v3): ModificaRigaSheet modifica per-riga (consegna/tecnico/dentista/note)"
```

---

## Task 4: MenuSchedaSheet — menu ⋯ (6 voci)

**Files:**
- Create: `src/components/features/lavori/scheda-v3/MenuSchedaSheet.tsx`
- Test: `tests/unit/MenuSchedaSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`; `useRouter` (mock in test).
- Produces: `MenuSchedaSheet(props: { aperto: boolean; onChiudi: () => void; lavoroId: string; onApriDocumenti: () => void })`. Voci (§6): Prezzi e lavorazioni → `push('/lavori/{id}/modifica?tab=lavorazioni')`; Dati clinici → `?tab=clinica`; Prove → `?tab=prove`; Foto → `?tab=immagini`; Documenti → `onApriDocumenti()`; **Annulla lavoro → renderizzata `disabled`** con testo «Annulla lavoro» + nota «prossimamente», nessun handler.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/MenuSchedaSheet.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
import { MenuSchedaSheet } from '../../src/components/features/lavori/scheda-v3/MenuSchedaSheet'

describe('MenuSchedaSheet', () => {
  it('Prezzi e lavorazioni naviga al ponte con tab lavorazioni', () => {
    render(<MenuSchedaSheet aperto lavoroId="lav" onChiudi={() => {}} onApriDocumenti={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /prezzi e lavorazioni/i }))
    expect(push).toHaveBeenCalledWith('/lavori/lav/modifica?tab=lavorazioni')
  })
  it('Documenti chiama onApriDocumenti', () => {
    const onApriDocumenti = vi.fn()
    render(<MenuSchedaSheet aperto lavoroId="lav" onChiudi={() => {}} onApriDocumenti={onApriDocumenti} />)
    fireEvent.click(screen.getByRole('button', { name: /documenti/i }))
    expect(onApriDocumenti).toHaveBeenCalled()
  })
  it('Annulla lavoro è disabilitata', () => {
    render(<MenuSchedaSheet aperto lavoroId="lav" onChiudi={() => {}} onApriDocumenti={() => {}} />)
    expect(screen.getByRole('button', { name: /annulla lavoro/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run** — Expected: FAIL (componente inesistente).
- [ ] **Step 3: Implement** — `Sheet` con le 6 righe-voce (stile `.menu-voce` del mockup: icona 38 + label 17/700 + chevron; «Annulla lavoro» rossa staccata e `disabled`). Le 4 pesanti chiamano `router.push(...)`; Documenti chiama `onApriDocumenti`.
- [ ] **Step 4: Run** — Expected: PASS (3 test).
- [ ] **Step 5: Commit**

```bash
git add src/components/features/lavori/scheda-v3/MenuSchedaSheet.tsx tests/unit/MenuSchedaSheet.test.tsx
git commit -m "feat(scheda-v3): MenuSchedaSheet 6 voci (ponte + Documenti + Annulla disabled)"
```

---

## Task 5: DocumentiSheet — hub download

**Files:**
- Create: `src/components/features/lavori/scheda-v3/DocumentiSheet.tsx`
- Test: `tests/unit/DocumentiSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`; `PacchettoConsegnaSheet` da `@/components/features/lavori/PacchettoConsegnaSheet` (verificarne le prop reali `{ lavoro, isOpen, onClose }`).
- Produces: `DocumentiSheet(props: { aperto: boolean; onChiudi: () => void; lavoro: { id: string; numero_lavoro: string; cliente_display: string; haFasi: boolean; haDdc: boolean } })`. Voci = link di download agli endpoint esistenti: DdC (solo se `haDdc`), Scheda di Fabbricazione (`/api/lavori/{id}/scheda-fabbricazione`, solo se `haFasi`), IFU (`/ifu`), Etichetta (`/etichetta`), Ricevuta di consegna (`/ricevuta-consegna`), + apertura `PacchettoConsegnaSheet`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/DocumentiSheet.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentiSheet } from '../../src/components/features/lavori/scheda-v3/DocumentiSheet'

const lavoro = { id: 'lav', numero_lavoro: '2026-0001', cliente_display: 'Studio X', haFasi: true, haDdc: false }

describe('DocumentiSheet', () => {
  it('mostra scheda di fabbricazione (haFasi) e non DdC (haDdc=false)', () => {
    render(<DocumentiSheet aperto onChiudi={() => {}} lavoro={lavoro} />)
    const sf = screen.getByRole('link', { name: /scheda di fabbricazione/i })
    expect(sf).toHaveAttribute('href', '/api/lavori/lav/scheda-fabbricazione')
    expect(screen.queryByRole('link', { name: /^scarica ddc/i })).toBeNull()
  })
  it('IFU/Etichetta/Ricevuta puntano agli endpoint corretti', () => {
    render(<DocumentiSheet aperto onChiudi={() => {}} lavoro={lavoro} />)
    expect(screen.getByRole('link', { name: /ifu/i })).toHaveAttribute('href', '/api/lavori/lav/ifu')
    expect(screen.getByRole('link', { name: /etichetta/i })).toHaveAttribute('href', '/api/lavori/lav/etichetta')
    expect(screen.getByRole('link', { name: /ricevuta/i })).toHaveAttribute('href', '/api/lavori/lav/ricevuta-consegna')
  })
})
```

- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** — `Sheet` con righe-voce che sono `<a href download>` agli endpoint; il Pacchetto MDR apre `PacchettoConsegnaSheet` (stato locale). Condizionali su `haDdc`/`haFasi`.
- [ ] **Step 4: Run** — Expected: PASS (2 test).
- [ ] **Step 5: Commit**

```bash
git add src/components/features/lavori/scheda-v3/DocumentiSheet.tsx tests/unit/DocumentiSheet.test.tsx
git commit -m "feat(scheda-v3): DocumentiSheet hub download (endpoint esistenti)"
```

---

## Task 6: SchedaLavoroV3 — orchestratore della scheda-vista

**Files:**
- Create: `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx`
- Test: `tests/unit/SchedaLavoroV3.test.tsx`

**Interfaces:**
- Consumes: tutti i componenti dei Task 1-5; `TastoTondo`, `TastoPrimario`, `TastoSecondario`, `CardInfo`/`RigaDato`, `NotaDentista`, `PillTempo` (da `@/components/ds/Pill`), `Avviso`/`useAvvisi`; `AnnullaConsegnaBanner`; `derivaUrgenza` da `@/lib/lavori/urgenza`; `pillStatoScheda` (Task 1); `LavoroDettaglio` da `@/types/domain`.
- Produces: `SchedaLavoroV3(props: { lavoro: LavoroDettaglio; ruolo?: string | null })`. È il corpo client della scheda-vista.

**Composizione (fedele al mockup + §3):**
1. Header: `TastoTondo ‹` (→ `/lavori`) · `n.{numero}` + pill (`pillStatoScheda`) · `TastoTondo ⋯` (apre `MenuSchedaSheet`).
2. `AnnullaConsegnaBanner` se `stato === 'consegnato' && data_consegna_effettiva` (componente esistente riusato, §11.1 risolto: il flusso annullo consegna è funzionante).
3. `CardInfo` con 4-5 `RigaDato` (dentista, paziente, lavoro, consegna [urgente se oggi/domani], tecnico); ogni riga editabile è un `<button>` che apre `ModificaRigaSheet` col `campo` giusto.
4. `NotaDentista` se presente.
5. Strip foto read-only se `immagini.length > 0`.
6. `CardFasiV3` se `fasi.length > 0`.
7. `TastoPrimario CONSEGNA`: `disabled={!derivaUrgenza(lavoro, new Date()).consegnabile}`, `motivoDisabilitato="Completa il controllo finale per consegnare"`, `onClick → router.push('/lavori/{id}/consegna')`.
8. `TastoSecondario` Rifacimento se `stato ∈ {consegnato, pronto, sospeso}` (riusa `POST /rifacimento` via `DialogConferma`); `TastoSecondario` «Segnala problema» se `ruolo === 'tecnico'` (riusa `SegnalaProblemaSheet`).
9. Sheet montati: `ModificaRigaSheet` (campo attivo in stato), `MenuSchedaSheet`, `DocumentiSheet`. `useAvvisi()` per gli errori (L6).

Aggiornamento ottimistico: uno stato locale `lavoroLocale` inizializzato dai props; `onSalvato(patch)` di `ModificaRigaSheet` fa `setLavoroLocale(prev => ({ ...prev, ...patch }))` e, per FK (`cliente_id`/`tecnico_id`), aggiorna anche l'etichetta mostrata (rileggere il nome dalla selezione fatta nello sheet — lo sheet passa `{ tecnico_id, _label }` al padre, o il padre fa `router.refresh()` dopo il salvataggio per rileggere i join). **Decisione:** per FK usare `router.refresh()` dopo `onSalvato` (semplice, niente ricostruzione manuale dei join); per campi scalari (consegna/note) aggiornamento ottimistico locale.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/SchedaLavoroV3.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
import { SchedaLavoroV3 } from '../../src/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio } from '../../src/types/domain'

function makeLavoro(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav', numero_lavoro: '2026-0147', stato: 'pronto',
    data_consegna_prevista: '2026-07-20', ora_consegna: '16:00',
    descrizione: 'Corona zirconia', paziente_nome_snapshot: null,
    cliente: { studio_nome: 'Studio Esposito', nome: 'Marco', cognome: 'Esposito' },
    paziente: null, tecnico: { nome: 'Ciro', cognome: 'B', sigla: 'CB' },
    fasi: [], immagini: [], lavorazioni: [], appuntamenti: [], materiali: [], ddc: null,
    laboratorio: { nome: 'Lab', telefono: null },
    ...over,
  } as unknown as LavoroDettaglio
}

describe('SchedaLavoroV3', () => {
  it('CONSEGNA abilitato su lavoro pronto → naviga a /consegna', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'pronto' })} />)
    const btn = screen.getByRole('button', { name: /consegna/i })
    expect(btn).not.toBeDisabled()
  })
  it('CONSEGNA disabilitato su lavoro in_lavorazione con callout', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'in_lavorazione' })} />)
    expect(screen.getByRole('button', { name: /consegna/i })).toBeDisabled()
    expect(screen.getByText(/completa il controllo finale/i)).toBeInTheDocument()
  })
  it('mostra numero e dati principali', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(screen.getByText(/2026-0147/)).toBeInTheDocument()
    expect(screen.getByText('Corona zirconia')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** la composizione sopra. Usare `pillStatoScheda(lavoro, new Date())` per la pill header; `derivaUrgenza(lavoro, new Date()).consegnabile` per abilitare CONSEGNA. Errori via `useAvvisi()`. Nessuna `duration` inline.
- [ ] **Step 4: Run** — Expected: PASS (3 test).
- [ ] **Step 5: Commit**

```bash
git add src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx tests/unit/SchedaLavoroV3.test.tsx
git commit -m "feat(scheda-v3): SchedaLavoroV3 orchestratore scheda-vista (header/CardInfo/fasi/consegna/menu)"
```

---

## Task 7: Montare SchedaLavoroV3 su `/lavori/[id]`

**Files:**
- Modify: `src/app/(app)/lavori/[id]/page.tsx`
- Test: (copertura via SchedaLavoroV3.test.tsx; qui è integrazione server, verificata in FASE 7/9)

**Interfaces:**
- Consumes: `SchedaLavoroV3` (Task 6); la query `LavoroDettaglio` già presente in `page.tsx` (con firma URL DdC/immagini invariata).

- [ ] **Step 1: Sostituire il render v2.3.** Rimuovere `AppHeader`/`StatoBadge`, `LavoroTimeline`, `LavoroFormClient`, `AnnullaConsegnaBanner` inline (ora dentro `SchedaLavoroV3`), `RifacimentoButton` inline (ora dentro), il link scheda-fabbricazione inline (ora in Documenti). Avvolgere in un root con `data-ds="v3"` e `background: var(--bg)`. Mantenere la query e la firma URL invariate.

```tsx
// estratto di src/app/(app)/lavori/[id]/page.tsx (dopo il caricamento di lavoroDettaglio)
return (
  <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
    <SchedaLavoroV3 lavoro={lavoroDettaglio} ruolo={utente.ruolo} />
  </div>
)
```

- [ ] **Step 2: Verifica build/tsc**

Run: `npx tsc --noEmit` → Expected: nessun errore. `npx next build` → Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/lavori/[id]/page.tsx
git commit -m "feat(scheda-v3): /lavori/[id] monta SchedaLavoroV3 (rimosso form multi-tab dalla scheda-vista)"
```

> **TracciabilitaMaterialiBanner:** oggi è mostrato sopra il form. Decidere: (a) portarlo dentro `SchedaLavoroV3` come `Avviso` sopra la CardInfo (se la tracciabilità materiali è incompleta), oppure (b) rimandarlo. Default: portarlo come callout v3 (è un segnale MDR importante). Se portato, aggiungere un test in SchedaLavoroV3.test.tsx.

---

## Task 8: LavoroFormClient — prop `bridged` + `defaultTab`

**Files:**
- Modify: `src/components/features/lavori/LavoroFormClient.tsx`
- Test: `tests/unit/LavoroFormClient.bridged.test.tsx`

**Interfaces:**
- Produces: `LavoroFormClient` accetta `defaultTab?: TabId` (inoltrata a `LavoroFormShell`) e `bridged?: boolean`. Quando `bridged`, **non rende il pulsante CONSEGNA** (righe 378-421) ma **mantiene la barra Salva**.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/LavoroFormClient.bridged.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
import { LavoroFormClient } from '../../src/components/features/lavori/LavoroFormClient'
import type { LavoroDettaglio } from '../../src/types/domain'
// riusare makeLavoro dal file esistente LavoroFormClient.consegna-autosave.test.tsx (copiare l'helper)

describe('LavoroFormClient bridged', () => {
  it('bridged=true NON rende il pulsante CONSEGNA', () => {
    render(<LavoroFormClient lavoro={makeLavoro()} bridged defaultTab="lavorazioni" />)
    expect(screen.queryByRole('button', { name: /vai alla consegna/i })).toBeNull()
  })
  it('bridged=false (default) rende CONSEGNA', () => {
    render(<LavoroFormClient lavoro={makeLavoro()} />)
    expect(screen.getByRole('button', { name: /vai alla consegna/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run** — Expected: FAIL (prop non gestita).
- [ ] **Step 3: Implement** — aggiungere `defaultTab`/`bridged` alla firma; passare `defaultTab` a `<LavoroFormShell defaultTab={defaultTab}>`; racchiudere il blocco del pulsante CONSEGNA in `{!bridged && ( ... )}`. Non toccare Salva/📦.
- [ ] **Step 4: Run** — Expected: PASS. Rilanciare anche i test esistenti di LavoroFormClient per non-regressione: `npx vitest run tests/unit/LavoroFormClient` → tutti PASS.
- [ ] **Step 5: Commit**

```bash
git add src/components/features/lavori/LavoroFormClient.tsx tests/unit/LavoroFormClient.bridged.test.tsx
git commit -m "feat(scheda-v3): LavoroFormClient prop bridged (sopprime CONSEGNA, tiene Salva) + defaultTab"
```

---

## Task 9: Route-ponte `/lavori/[id]/modifica`

**Files:**
- Create: `src/app/(app)/lavori/[id]/modifica/page.tsx`

**Interfaces:**
- Consumes: `LavoroFormClient` con `bridged` + `defaultTab` (Task 8); stessa query `LavoroDettaglio` di `/lavori/[id]/page.tsx`; `TabId` da `LavoroFormShell`.

- [ ] **Step 1: Implement** — pagina server che: autentica, carica `LavoroDettaglio` (stesso pattern di `[id]/page.tsx`), legge `searchParams.tab` (validare contro `TabId`, default `'lavorazioni'`), rende un header v3 (`TastoTondo ‹` → `/lavori/[id]`) + `LavoroFormClient bridged defaultTab={tab}` dentro `data-ds="v3"`.

```tsx
// src/app/(app)/lavori/[id]/modifica/page.tsx (scheletro)
const TABS_VALIDI = ['lavorazioni', 'clinica', 'prove', 'immagini'] as const
export default async function ModificaLavoroPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const defaultTab = (TABS_VALIDI as readonly string[]).includes(tab ?? '') ? (tab as TabId) : 'lavorazioni'
  // ... auth + carica lavoroDettaglio come in [id]/page.tsx ...
  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      {/* header v3 con back → /lavori/[id] */}
      <LavoroFormClient lavoro={lavoroDettaglio} ruolo={utente.ruolo} bridged defaultTab={defaultTab} />
    </div>
  )
}
```

- [ ] **Step 2: Verifica** — `npx tsc --noEmit` + `npx next build` OK.
- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/lavori/[id]/modifica/page.tsx"
git commit -m "feat(scheda-v3): route-ponte /lavori/[id]/modifica (form bridged deep-link)"
```

> **Audit §11.6:** verificare che nessun tab reso dal form bridged abbia una navigazione autonoma verso `/consegna` (grep dei Tab* per `router.push('/lavori`/`/consegna'`). Se trovata, guardarla su `!bridged` o rimuoverla. Documentare l'esito nel commit o nel report.

---

## Task 10: Responsive desktop (card centrata) + temi

**Files:**
- Modify: `src/app/(app)/lavori/[id]/page.tsx` (wrapper responsive) e/o `SchedaLavoroV3.tsx` (max-width).

- [ ] **Step 1:** Su desktop (≥768) la scheda è una card centrata `max-width: 640px; margin: 0 auto`. Sheet e menu restano bottom-sheet (nessun pannello laterale in 3a — §8). Verificare i 3 viewport × 2 temi con Playwright (mockup come riferimento visivo).
- [ ] **Step 2: Screenshot** 390/768/1280 × light/dark in `docs/design/screenshots/2026-07-13-ondata-3a/`.
- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(scheda-v3): scheda centrata desktop + verifica 3 viewport/2 temi"
```

---

## Task 11: Verifica finale + QA browser + BP-1

- [ ] **Step 1: Verifica completa (FASE 7)**

```bash
npx tsc --noEmit          # zero errori
npx vitest run            # 1561 + nuovi test, 0 fail
npx next build            # build OK
bash scripts/check-ds-compliance.sh   # DS compliance OK
```

- [ ] **Step 2: QA browser (FASE 9)** — lab E2E `00000000-…-0001` (MAI lab Filippo), dev server del worktree. Verificare (390/768/1280 × light/dark):
  - Scheda apre; modifica per-riga (consegna/tecnico/dentista/note) persiste (ricarica → valore nuovo).
  - CardFasi: FATTA sulla prossima marca la fase (ricarica → fatta); errore → Avviso + rollback.
  - CONSEGNA: su lavoro `pronto` porta a `/consegna`; su `in_lavorazione` è disabled con callout.
  - Menu ⋯: le 4 pesanti aprono `/lavori/[id]/modifica?tab=…` (form senza CONSEGNA, con Salva); Documenti scarica i file reali; Annulla lavoro disabilitata.
  - Ponte: modifica di prezzi/clinica/prove nel form bridged si salva (barra Salva presente); nessun accesso a consegna dal ponte.
  - Rifacimento (su consegnato/pronto/sospeso) e Segnala (tecnico) presenti alle condizioni giuste.
  - Cleanup DB a baseline esatto dopo la QA.

- [ ] **Step 3: BP-1 (FASE 11)** — aggiornare `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md` (Ondata 3a completata; prossimo 3b/4b). Aggiornare `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` con i follow-up: upgrade pannello pile a full-card (§8), stage «Annulla lavoro» backend MDR-conforme, flussi ⋯ pesanti nativi + N4 (3b).

- [ ] **Step 4: Commit finale**

```bash
git add -A
git commit -m "docs(memory): BP-1 Ondata 3a scheda lavoro v3 completata"
```

---

## Self-Review

**Spec coverage:**
- §3 scheda-vista → Task 6 (header, CardInfo, NotaDentista, strip foto, CONSEGNA, Rifacimento/Segnala, banner). ✓
- §4 modifica per-riga → Task 3. ✓ (campo note = `note_interne`, verificato in PATCHABLE_FIELDS)
- §5 CardFasi con gesto FATTA → Task 2. ✓
- §6 menu ⋯ (6 voci, Annulla disabled, Documenti nativo) → Task 4 + Task 5. ✓
- §7 ponte `bridged` + route → Task 8 + Task 9 (CONSEGNA soppressa, Salva tenuta). ✓
- §8 responsive → Task 10 (card centrata desktop; pannello pile invariato = fuori scope, tracciato). ✓
- §9 errori/motion/testing → test in ogni task; motion da v3. ✓
- §11 punti aperti: (1) banner annullo funzionante → riuso in Task 6; (2) campo note = `note_interne` ✓; (3) banner segnalazione → Task 6 (Segnala) + nota TracciabilitaMateriali in Task 7; (4) consegnabilità = `derivaUrgenza().consegnabile` ✓; (5) copy callout in Task 6/4; (6) audit /consegna in Task 9; (7) stage Annulla lavoro → BP-1 Task 11. ✓

**Placeholder scan:** i «verificare X» residui (forma join `fase`, famiglia `neutral`, firma `CampoTesto`, prop `PacchettoConsegnaSheet`) sono verifiche puntuali a costo di una `Read`, non decisioni aperte — l'implementer le risolve leggendo il file citato. Nessun «TODO/TBD».

**Type consistency:** `derivaUrgenza(lavoro, oggi)` firma coerente in Task 1/6; `TabId` da `LavoroFormShell` in Task 8/9; `LavoroFase.fase.nome` accesso coerente in Task 2; `note_interne`/`cliente_id`/`tecnico_id`/`data_consegna_prevista`/`ora_consegna` = chiavi reali di `PATCHABLE_FIELDS`.
