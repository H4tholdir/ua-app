# Ondata A «mini-triage» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare l'ondata A del mini-triage ratificata da Francesco il 20/07/2026: cassetta in card + conferma-cassetta + ricerca per cassetta, ponte odontogramma A13, morte di «Le pile», O1i ×3 (Esci mobile, identità NavDesk, segnale trial), migrazione «Persone» a v3, emendamenti spec in blocco.

**Architecture:** Zero migration (il campo `lavori.numero_cassetta` esiste già ed è già nella PATCH allowlist), zero API nuove (si riusano `PATCH /api/lavori/[id]`, `GET /api/tecnici/cedolini-batch`, `POST/GET /api/tecnici/invite`, `PATCH /api/tecnici/[id]`, `POST /api/tecnici/[id]/deactivate`). Tutto il lavoro è: estensione della catena dati `pile-home`, componenti DS v3, wiring server→client via props, migrazione per route di `/tecnici`.

**Tech Stack:** Next.js 16 App Router · Supabase (service client server-side) · DS v3 (`src/components/ds/`, `src/design-system/v3/*`) · motion 12 (`molla`) · Vitest.

**Fonte di verità design (LEGGE):** `docs/design/decisions/2026-07-20-mini-triage-e-parete.md` + mockup `docs/design/mockups/2026-07-20-mini-triage-*.html`. In caso di dubbio visivo, vincono decisions doc e mockup.

## Global Constraints

- **DS v3 ovunque si tocca**: componenti SOLO da `src/components/ds/`, token da `src/design-system/v3/tokens.ts`, molle da `src/design-system/v3/motion.ts` — MAI `duration` inline, MAI token v2.3 su superfici v3.
- **Migrazione per route, MAI per componente** (spec v3 §14): `/tecnici` migra INTERA a v3; le pagine legacy toccate solo per ripuntare link restano v2.3.
- **NON toccare**: `src/lib/nav/route-migrate-v3.ts:24` (il match `pathname === '/lavori'` in `isV3MigratedRoute`) · `src/app/api/tecnici/invite/route.ts` (dominio critico) · nessuna migration, nessun campo nuovo in PATCH allowlist.
- **GDPR**: `paziente` nelle card è SEMPRE lo pseudonimo `PZ-xxxx` già fornito dalla catena dati.
- **Copy in italiano**, accenti corretti; numeri cassetta mostrati così come sono nel dato (`C12`).
- **TDD**: ogni task = test prima (RED), implementazione minima (GREEN), commit. Test runner: `npx vitest run <file>`.
- **Commit format**: `feat(pile): …` / `feat(tecnici): …` / `fix(...)` — mai committare fuori dal worktree branch dell'ondata; merge/deploy SOLO dopo conferma esplicita di Francesco.
- **Mock context nei test**: i test API/pagina mockano `getLabContext`/`getFreshLabContext` con `lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' }` (pattern `tests/unit/cedolini-batch-route.test.ts:22`).
- **Test files**: in `tests/unit/`, naming kebab-case coerente con l'esistente.

## Ordine e dipendenze

Task 1 → 2 → 3 (catena cassetta) · Task 4 → 5 (conferma-cassetta, dipende da 1) · Task 6 (A13, indipendente) · Task 7 (Le pile, indipendente) · Task 8 (Esci mobile) · Task 9 (NavDesk identità) · Task 10 (trial striscia) · Task 11 → 12 → 13 (Persone) · Task 14 (emendamenti spec) · Task 15 (verifica finale + gate).

---

### Task 1: `numero_cassetta` nella catena pile-home

**Files:**
- Modify: `src/lib/dashboard/pile-home.ts:23-27` (select)
- Modify: `src/lib/dashboard/pile-home-shared.ts:11-37` (tipi) e `:208-227` (`mapPileHome`)
- Test: `tests/unit/pile-home.test.ts` (fixture esistenti)

**Interfaces:**
- Produces: `RawLavoroPila.numero_cassetta: string | null` · `LavoroPila.cassetta: string | null` (nome corto lato UI, ratificato: la card la chiama «cassetta»).

- [ ] **Step 1: Test failing.** In `tests/unit/pile-home.test.ts`, aggiorna la factory delle righe raw (cerca la funzione che costruisce `RawLavoroPila` di fixture) aggiungendo `numero_cassetta: null` di default, poi aggiungi il test:

```ts
it('propaga numero_cassetta come LavoroPila.cassetta (A14)', () => {
  const rows = [
    riga({ id: 'l1', numero_lavoro: '144', stato: 'ricevuto', numero_cassetta: 'C12' }),
    riga({ id: 'l2', numero_lavoro: '147', stato: 'ricevuto', numero_cassetta: null }),
  ]
  const pile = mapPileHome(rows, OGGI)
  const blu = pile.liste.blu
  expect(blu.find((l) => l.id === 'l1')?.cassetta).toBe('C12')
  expect(blu.find((l) => l.id === 'l2')?.cassetta).toBeNull()
})
```

(`riga` e `OGGI` = helper/costanti già presenti nel file — riusali col loro nome reale.)

- [ ] **Step 2:** `npx vitest run tests/unit/pile-home.test.ts` → FAIL (property `cassetta` undefined / tsc error sul fixture).
- [ ] **Step 3: Implementazione.**
  - `pile-home.ts:23`: la select diventa `id, numero_lavoro, numero_cassetta, stato, …` (aggiungi il campo alla prima riga del template literal).
  - `pile-home-shared.ts` in `RawLavoroPila` (dopo `numero_lavoro: string`): `numero_cassetta: string | null`.
  - In `LavoroPila` (dopo `numero: string`): `/** Targa cassetta fisica (A14) — null se il lavoro non è in cassetta. */ cassetta: string | null`.
  - In `mapPileHome` (riga ~215, dentro il push): `cassetta: r.numero_cassetta,` subito dopo `numero: r.numero_lavoro,`.
- [ ] **Step 4:** `npx vitest run tests/unit/pile-home.test.ts` → PASS. `npx tsc --noEmit` → zero errori (i consumatori non sono ancora toccati: campo aggiunto, nessuno rimosso).
- [ ] **Step 5: Commit** — `feat(pile): propaga numero_cassetta nella catena getPileHome→LavoroPila (A14)`

---

### Task 2: Targa «CASSETTA C12» in CardLavoro (A14, variante A co-identità)

**Files:**
- Modify: `src/components/ds/CardLavoro.tsx` (props + riga 1)
- Modify: `src/components/features/pile/PilaAperta.tsx:95-112`, `src/components/features/pile/PilaSplit.tsx:76-94`, `src/components/features/home/HomeDesktop.tsx:176-193` (passano `cassetta`)
- Modify: `src/app/ds-v3-catalogo/page.tsx` (sezione CardLavoro: aggiungi un esempio con cassetta)
- Test: `tests/unit/card-lavoro-cassetta.test.tsx` (nuovo; se esiste già un test di CardLavoro, estendi quello)

**Interfaces:**
- Produces: `CardLavoro` prop nuova `cassetta?: string | null` (default assente → card identica a oggi).

**Specifica visiva (mockup `2026-07-20-mini-triage-a14bis-cassetta-ripensata.html`, variante A ratificata):** blocco nella riga 1 tra il blocco lavoro e la PillTempo — `borderRadius: 12`, `background: 'var(--bg-deep)'`, `boxShadow: 'inset 0 0 0 1.5px var(--line)'`, `padding: '6px 12px 7px'`, `textAlign: 'center'`, `flex: 'none'`; caption «CASSETTA» 10.5/800 tracking .14em uppercase `--faint` con `marginBottom: 1`; numero 21/800 `--ink` `fontVariantNumeric: 'tabular-nums'` `lineHeight: 1.1`. Troncamento: oltre ~6 caratteri il testo si tronca con ellissi (`maxWidth: '7ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'` sul numero). Screen reader: il blocco porta `aria-label={'Cassetta ' + cassetta}` con `role="img"` (targa, non testo libero). Assente (`null`/`undefined`) → blocco non renderizzato, card identica a prima.

- [ ] **Step 1: Test failing** — `tests/unit/card-lavoro-cassetta.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { CardLavoro } from '@/components/ds/CardLavoro'

const base = {
  numero: '144', dentista: 'Dr.ssa Bianchi', paziente: 'PZ-0398',
  tipoLavoro: 'Ponte 3 elementi', tempo: { testo: 'DA IERI', famiglia: 'red' as const },
  onApri: () => {},
}

describe('CardLavoro — targa cassetta (A14)', () => {
  it('mostra la targa quando cassetta è presente', () => {
    render(<CardLavoro {...base} cassetta="C12" />)
    expect(screen.getByRole('img', { name: 'Cassetta C12' })).toBeInTheDocument()
    expect(screen.getByText('C12')).toBeInTheDocument()
  })
  it('non mostra nulla senza cassetta', () => {
    render(<CardLavoro {...base} />)
    expect(screen.queryByRole('img', { name: /Cassetta/ })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** `npx vitest run tests/unit/card-lavoro-cassetta.test.tsx` → FAIL.
- [ ] **Step 3: Implementazione** in `CardLavoro.tsx`: aggiungi `cassetta?: string | null` alle props (dopo `numero`), destruttura, e nella riga 1 (dopo lo `<span>` del blocco lavoro, riga ~243, PRIMA dello span della pill) inserisci:

```tsx
{cassetta && (
  <span
    role="img"
    aria-label={`Cassetta ${cassetta}`}
    style={{
      flex: 'none',
      borderRadius: 12,
      background: 'var(--bg-deep)',
      boxShadow: 'inset 0 0 0 1.5px var(--line)',
      padding: '6px 12px 7px',
      textAlign: 'center',
    }}
  >
    <span style={{ display: 'block', fontSize: 10.5, fontWeight: tipografia.weight.extrabold, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 1 }}>
      Cassetta
    </span>
    <span style={{ display: 'block', fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, maxWidth: '7ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {cassetta}
    </span>
  </span>
)}
```

Nota nel commento di testa del componente: targa A14 (decisions 20/07), gemella del blocco lavoro, assente ⇒ blocco assente.

- [ ] **Step 4: Wiring host.** In `PilaAperta.tsx` (riga ~98), `PilaSplit.tsx` (riga ~81), `HomeDesktop.tsx` (riga ~183) aggiungi `cassetta={l.cassetta}` alle rispettive `<CardLavoro …>`. Nel catalogo `ds-v3-catalogo/page.tsx`, nella sezione CardLavoro aggiungi una card d'esempio con `cassetta="C12"` (stessi dati fittizi delle vicine).
- [ ] **Step 5:** `npx vitest run tests/unit/card-lavoro-cassetta.test.tsx` → PASS · `npx tsc --noEmit` → zero errori.
- [ ] **Step 6: Commit** — `feat(ds): targa cassetta co-identità in CardLavoro riga 1 (A14)`

---

### Task 3: RigaCerca matcha `cassetta` (ricerca per-pila)

**Files:**
- Modify: `src/components/features/pile/PilaAperta.tsx:62-66`
- Test: `tests/unit/pila-aperta-cerca-cassetta.test.tsx` (nuovo)

- [ ] **Step 1: Test failing.** Il filtro è inline in `PilaAperta`; per testarlo senza montare router/motion, ESTRAI la funzione pura. Test:

```ts
import { filtraLavoriPila } from '@/components/features/pile/filtra-lavori-pila'

const lav = (over: Partial<{ numero: string; dentista: string; paziente: string; tipoLavoro: string; cassetta: string | null }>) => ({
  numero: '144', dentista: 'Dr.ssa Bianchi', paziente: 'PZ-0398', tipoLavoro: 'Ponte', cassetta: null, ...over,
})

describe('filtraLavoriPila — match su cassetta', () => {
  it('trova per numero cassetta', () => {
    const lista = [lav({ numero: '144', cassetta: 'C12' }), lav({ numero: '147' })]
    expect(filtraLavoriPila(lista as never, 'c12').map((l) => l.numero)).toEqual(['144'])
  })
  it('resta accent-insensitive sui campi esistenti', () => {
    const lista = [lav({ dentista: 'Dr. Esposìto' })]
    expect(filtraLavoriPila(lista as never, 'esposito')).toHaveLength(1)
  })
})
```

- [ ] **Step 2:** RED.
- [ ] **Step 3: Implementazione.** Nuovo file `src/components/features/pile/filtra-lavori-pila.ts` (client-safe, puro):

```ts
// Filtro della RigaCerca di PilaAperta (§5.13 + decisions 20/07: matcha anche
// la cassetta — col lavoro in mano «C12» è la query più naturale del banco).
import type { LavoroPila } from '@/lib/dashboard/pile-home-shared'

/** contains normalizzato: minuscolo + NFD senza diacritici (accent-insensitive). */
export function normalizza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function filtraLavoriPila(lista: LavoroPila[], query: string): LavoroPila[] {
  const q = normalizza(query)
  if (!q) return lista
  return lista.filter((l) =>
    normalizza(`n.${l.numero} ${l.dentista} ${l.paziente} ${l.tipoLavoro} ${l.cassetta ?? ''}`).includes(q)
  )
}
```

In `PilaAperta.tsx`: elimina la `normalizza` locale (righe 47-50), importa `filtraLavoriPila` e sostituisci il corpo del `useMemo` (62-66) con `return cerca ? filtraLavoriPila(lista, cerca) : lista`.

- [ ] **Step 4:** GREEN + `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(pile): la ricerca per-pila matcha anche numero_cassetta`

---

### Task 4: Cassette suggerite (chips «recenti/libere») — lib dati

**Files:**
- Create: `src/lib/lavori/cassette.ts` (server-only) + `src/lib/lavori/cassette-shared.ts` (puro, testabile)
- Test: `tests/unit/cassette-suggerite.test.ts`

**Interfaces:**
- Produces: `derivaCassetteSuggerite(rows: Array<{ numero_cassetta: string | null; stato: string }>): string[]` (pura) e `getCassetteSuggerite(svc, labId): Promise<string[]>` (server). Max 6 targhe, ordinate per uso più recente, SOLO cassette non occupate da lavori attivi («libere»).

- [ ] **Step 1: Test failing** — `tests/unit/cassette-suggerite.test.ts`:

```ts
import { derivaCassetteSuggerite } from '@/lib/lavori/cassette-shared'

describe('derivaCassetteSuggerite', () => {
  it('propone le cassette usate di recente e ora libere, senza duplicati', () => {
    const rows = [
      { numero_cassetta: 'C7',  stato: 'consegnato' },      // libera → chip
      { numero_cassetta: 'C12', stato: 'in_lavorazione' },  // occupata → esclusa
      { numero_cassetta: 'C15', stato: 'consegnato' },
      { numero_cassetta: 'C7',  stato: 'consegnato' },      // duplicato
      { numero_cassetta: null,  stato: 'consegnato' },
    ]
    expect(derivaCassetteSuggerite(rows)).toEqual(['C7', 'C15'])
  })
  it('taglia a 6 chips', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ numero_cassetta: `C${i + 1}`, stato: 'consegnato' }))
    expect(derivaCassetteSuggerite(rows)).toHaveLength(6)
  })
})
```

- [ ] **Step 2:** RED.
- [ ] **Step 3: Implementazione.** `cassette-shared.ts`:

```ts
// Conferma-cassetta (decisions 20/07): chips delle cassette usate di recente e
// ORA libere. Pura e client-safe — la query vive in cassette.ts (server-only).
const MAX_CHIPS = 6
const STATI_CHIUSI = new Set(['consegnato', 'annullato'])

export function derivaCassetteSuggerite(
  rows: Array<{ numero_cassetta: string | null; stato: string }>
): string[] {
  const occupate = new Set(
    rows.filter((r) => r.numero_cassetta && !STATI_CHIUSI.has(r.stato)).map((r) => r.numero_cassetta as string)
  )
  const suggerite: string[] = []
  for (const r of rows) {
    if (!r.numero_cassetta || !STATI_CHIUSI.has(r.stato)) continue
    if (occupate.has(r.numero_cassetta) || suggerite.includes(r.numero_cassetta)) continue
    suggerite.push(r.numero_cassetta)
    if (suggerite.length === MAX_CHIPS) break
  }
  return suggerite
}
```

`cassette.ts`:

```ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { derivaCassetteSuggerite } from './cassette-shared'
export * from './cassette-shared'

/** Le targhe per le chips dello sheet conferma-cassetta: ultime 80 righe con
 *  cassetta valorizzata, più recenti prima — errori → [] (le chips sono un
 *  aiuto, mai un blocco). */
export async function getCassetteSuggerite(svc: SupabaseClient, labId: string): Promise<string[]> {
  try {
    const { data, error } = await svc
      .from('lavori')
      .select('numero_cassetta, stato')
      .eq('laboratorio_id', labId)
      .not('numero_cassetta', 'is', null)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(80)
    if (error) throw error
    return derivaCassetteSuggerite((data ?? []) as Array<{ numero_cassetta: string | null; stato: string }>)
  } catch (err) {
    console.error('[getCassetteSuggerite] degrado a []:', err)
    return []
  }
}
```

- [ ] **Step 4:** GREEN + tsc.
- [ ] **Step 5: Commit** — `feat(lavori): cassette suggerite (recenti e libere) per lo sheet conferma-cassetta`

---

### Task 5: Sheet «In che cassetta lo metti?» sul Conferma della pila blu

**Files:**
- Create: `src/components/features/pile/ConfermaCassettaSheet.tsx`
- Modify: `src/components/features/pile/PilaAperta.tsx` e `PilaSplit.tsx` (il Conferma blu apre lo sheet), `src/app/(app)/lavori/page.tsx` (fetch chips + prop)
- Test: `tests/unit/conferma-cassetta-sheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet` (`aperto, onChiudi, titolo?, children`) · `ChipScelta` (`children, selezionata, onClick`) · `CampoTesto` (`label, valore, onCambia`) · `TastoPrimario` (`disabled?, motivoDisabilitato?, onClick, children`) · `LinkQuieto` · `getCassetteSuggerite` (Task 4).
- Produces: `ConfermaCassettaSheet(props: { aperto: boolean; onChiudi: () => void; lavoro: { id: string; numero: string; tipoLavoro: string; dentista: string } | null; suggerite: string[]; onConfermato: (id: string) => void })`.
- `PilaAperta`/`PilaSplit` prop nuova: `cassetteSuggerite?: string[]` (default `[]`).

**Comportamento (mockup `2026-07-20-mini-triage-conferma-cassetta.html`, variante A):** titolo «In che cassetta lo metti?» · sottotitolo `n.{numero} · {tipoLavoro} · {dentista}` (15/600 `--muted`) · chips (max 6) con `ChipScelta` (tap = seleziona/deseleziona) · campo «O scrivine una nuova» (`CampoTesto`, digitare deseleziona la chip) · CTA `TastoPrimario` «Conferma in {X}» (disabilitato finché nessuna scelta, `motivoDisabilitato="Scegli una cassetta o scrivine una"`) · via di fuga `LinkQuieto` «Conferma senza cassetta» sempre presente. Conferma con cassetta → `PATCH /api/lavori/{id}` body `{ numero_cassetta: X.trim() }` (stesso pattern fetch di `ModificaRigaSheet.tsx` — leggi quel file e replica gestione errori/headers); a successo → `onConfermato(id)`. «Senza cassetta» → nessuna PATCH, direttamente `onConfermato(id)`. Errore rete/HTTP → messaggio inline rosso sotto la CTA (14/600 `--red`, `role="alert"`), lo sheet resta aperto.

- [ ] **Step 1: Test failing** — `tests/unit/conferma-cassetta-sheet.test.tsx`. Mock `next/navigation` non serve (il componente non naviga: delega a `onConfermato`). Mock `fetch` globale.

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConfermaCassettaSheet } from '@/components/features/pile/ConfermaCassettaSheet'

const lavoro = { id: 'l1', numero: '151', tipoLavoro: 'Protesi totale', dentista: 'Dr. Esposito' }

describe('ConfermaCassettaSheet', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('CTA disabilitata senza scelta; chip la abilita col nome', () => {
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={['C7', 'C15']} onConfermato={() => {}} />)
    expect(screen.getByRole('button', { name: /^Conferma$/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    expect(screen.getByRole('button', { name: 'Conferma in C7' })).toBeEnabled()
  })

  it('conferma con cassetta → PATCH numero_cassetta e onConfermato', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={['C7']} onConfermato={onConfermato} />)
    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferma in C7' }))
    await waitFor(() => expect(onConfermato).toHaveBeenCalledWith('l1'))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/lavori/l1')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ numero_cassetta: 'C7' })
  })

  it('«Conferma senza cassetta» → nessuna PATCH, onConfermato subito', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={[]} onConfermato={onConfermato} />)
    fireEvent.click(screen.getByRole('button', { name: 'Conferma senza cassetta' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onConfermato).toHaveBeenCalledWith('l1')
  })
})
```

- [ ] **Step 2:** RED.
- [ ] **Step 3: Implementazione** `ConfermaCassettaSheet.tsx` ('use client'). Stato: `scelta: string | null`, `nuova: string`, `salvando: boolean`, `erroreMsg: string | null`. `const target = nuova.trim() || scelta`. Chips: `suggerite.map((c) => <ChipScelta selezionata={scelta === c && !nuova.trim()} onClick={() => { setScelta(scelta === c ? null : c); setNuova('') }}>{c}</ChipScelta>)` in un flex wrap gap 10, marginTop 18. Campo: `<CampoTesto label="O scrivine una nuova" valore={nuova} onCambia={(v) => { setNuova(v); if (v.trim()) setScelta(null) }} />`. CTA: `<TastoPrimario disabled={!target || salvando} motivoDisabilitato="Scegli una cassetta o scrivine una" onClick={conferma}>{target ? `Conferma in ${target}` : 'Conferma'}</TastoPrimario>`. `conferma()`: PATCH come da spec sopra (replica ESATTAMENTE il pattern di `ModificaRigaSheet.tsx`: stesso metodo, stessi header, stessa lettura errore); su `res.ok` → `onConfermato(lavoro.id)`; altrimenti `setErroreMsg('Non sono riuscito a salvare la cassetta — riprova')`. Fuga: `<LinkQuieto onClick={() => onConfermato(lavoro.id)}>Conferma senza cassetta</LinkQuieto>` centrato (`display:flex; justifyContent:center; marginTop:14`). Il tutto dentro `<Sheet aperto={aperto && !!lavoro} onChiudi={onChiudi} titolo="In che cassetta lo metti?">` con sottotitolo come primo figlio. Al cambio `lavoro` resetta stato (pattern «adjusting state while rendering» come `SchedaLavoroV3.tsx:152-156`).
- [ ] **Step 4: Wiring.** In `lavori/page.tsx`: `import { getCassetteSuggerite } from '@/lib/lavori/cassette'`; dopo `getPileHome`: `const cassetteSuggerite = pila === 'blu' ? await getCassetteSuggerite(svc, labId) : []`, passa `cassetteSuggerite={cassetteSuggerite}` a `PilaAperta` e `PilaSplit`. In `PilaAperta.tsx`: nuova prop `cassetteSuggerite?: string[]`; stato `confermaId: string | null`; il ramo blu diventa `{ conferma: { onClick: () => setConfermaId(l.id) } }`; monta in coda:

```tsx
<ConfermaCassettaSheet
  aperto={confermaId !== null}
  onChiudi={() => setConfermaId(null)}
  lavoro={lavoroInConferma ? { id: lavoroInConferma.id, numero: lavoroInConferma.numero, tipoLavoro: lavoroInConferma.tipoLavoro, dentista: lavoroInConferma.dentista } : null}
  suggerite={cassetteSuggerite ?? []}
  onConfermato={(id) => { setConfermaId(null); router.push(`/lavori/${id}`) }}
/>
```

con `const lavoroInConferma = confermaId ? lista.find((l) => l.id === confermaId) ?? null : null`. Stesso wiring in `PilaSplit.tsx`. (La destinazione post-conferma resta la scheda, identica a oggi — la conferma-arrivo NON cambia `stato`, fuori perimetro ratificato.)
- [ ] **Step 5:** GREEN su tutti i test pile + tsc.
- [ ] **Step 6: Commit** — `feat(pile): sheet conferma-cassetta sul Conferma della pila blu`

---

### Task 6: A13 — denti come sub-valore della riga «Lavoro» in scheda

**Files:**
- Modify: `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` (riga «Lavoro», ~266) + componente locale `RigaLavoroDenti`
- Test: `tests/unit/scheda-riga-lavoro-denti.test.tsx`

**Specifica (mockup `…-a13-ponte-odontogramma.html` variante A, decisions):** dati già presenti su `lavoro.denti_coinvolti: string[] | null` (fetch `select('*')`, nessuna query nuova). Con ≥1 dente la riga «Lavoro» diventa un `<button>` (stesso guscio di `RigaEditabile`, hit-area ≥44) con: valore `lavoro.descrizione` e, sotto, chips FDI — max 4 + chip «+N» per gli extra — e chevron `›`. Chip: `minWidth: 28, height: 28, padding: '0 6px', borderRadius: 8, background: 'var(--blue-tint)', color: 'var(--blue)', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums'`, flex inline gap 6, `marginTop: 4`, allineate a destra (dentro la colonna valore di `RigaDato`, che è già `alignItems: flex-end`). Chevron 20/700 `--faint` `marginLeft: 4`. Tap → `router.push(\`/lavori/${lavoro.id}/modifica?tab=clinica\`)`. Aria: 1 dente «Dente 13 — apri l'odontogramma»; più denti «Denti 13 e 14 — apri l'odontogramma» (elenco con «e» prima dell'ultimo). Zero denti → `RigaDato` di sola lettura identica a oggi.

- [ ] **Step 1: Test failing** — `tests/unit/scheda-riga-lavoro-denti.test.tsx`. Testa il componente estratto (non tutta la scheda): crea il componente in un file suo per testabilità: `src/components/features/lavori/scheda-v3/RigaLavoroDenti.tsx`.

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { RigaLavoroDenti } from '@/components/features/lavori/scheda-v3/RigaLavoroDenti'

describe('RigaLavoroDenti (A13)', () => {
  it('con denti: bottone con label esplicita, chips e tap → onApri', () => {
    const onApri = vi.fn()
    render(<RigaLavoroDenti descrizione="Corona zirconia" denti={['13', '14']} onApri={onApri} />)
    const riga = screen.getByRole('button', { name: 'Denti 13 e 14 — apri l\'odontogramma' })
    expect(screen.getByText('13')).toBeInTheDocument()
    fireEvent.click(riga)
    expect(onApri).toHaveBeenCalled()
  })
  it('oltre 4 denti: 4 chips + «+N»', () => {
    render(<RigaLavoroDenti descrizione="Scheletrato" denti={['11', '12', '13', '14', '15', '16']} onApri={() => {}} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.queryByText('15')).not.toBeInTheDocument()
  })
  it('zero denti: riga di sola lettura, nessun bottone', () => {
    render(<RigaLavoroDenti descrizione="Corona zirconia" denti={[]} onApri={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Corona zirconia')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** RED.
- [ ] **Step 3: Implementazione** `RigaLavoroDenti.tsx` ('use client'): props `{ descrizione: string; denti: string[]; onApri: () => void }`. Zero denti → `return <RigaDato chiave="Lavoro" valore={descrizione} />`. Con denti → `<button type="button" className="ds-tap-v3" aria-label={labelDenti(denti)} onClick={onApri} style={…stesso stile del bottone di RigaEditabile (SchedaLavoroV3.tsx:571-577)}>` contenente `<RigaDato chiave="Lavoro" valore={descrizione} sub={undefined} />`… ATTENZIONE: le chips non passano da `RigaDato.sub` (che è `string`): replica l'anatomia di `RigaDato` inline nel componente (chiave caption a sinistra, colonna valore a destra con `descrizione` sopra e la fila chips+chevron sotto, `padding: '9px 0'` identico) — è una variante locale dichiarata, non un fork del DS (commento in testa: «variante A13 della RigaDato — l'anatomia base resta §5.10»). Helper interno:

```ts
const MAX_CHIP = 4
function labelDenti(denti: string[]): string {
  const testo = denti.length === 1 ? `Dente ${denti[0]}` : `Denti ${denti.slice(0, -1).join(', ')} e ${denti[denti.length - 1]}`
  return `${testo} — apri l'odontogramma`
}
```

In `SchedaLavoroV3.tsx:266` sostituisci `<RigaDato chiave="Lavoro" valore={lavoro.descrizione} />` con:

```tsx
<RigaLavoroDenti
  descrizione={lavoro.descrizione}
  denti={lavoro.denti_coinvolti ?? []}
  onApri={() => router.push(`/lavori/${lavoro.id}/modifica?tab=clinica`)}
/>
```

- [ ] **Step 4:** GREEN + tsc + gli eventuali test esistenti della scheda restano verdi (`npx vitest run tests/unit --silent` sui file scheda).
- [ ] **Step 5: Commit** — `feat(lavori): denti FDI come sub-valore della riga Lavoro, tap → odontogramma (A13)`

---

### Task 7: Morte di «Le pile» (redirect + delete + ripuntamenti)

**Files:**
- Modify: `src/app/(app)/lavori/page.tsx:33-44` (redirect senza `pila`)
- Delete: `src/components/features/pile/LePile.tsx`
- Modify: `src/components/layout/BottomNavPill.tsx` (tab Lavori), `src/components/features/lavori/scheda-v3/SchedaNavRail.tsx:28`, `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx:239`, `src/app/(app)/fatture/page.tsx:248`
- **NON toccare:** `src/lib/nav/route-migrate-v3.ts` (il match `'/lavori'` a riga 24 resta: `/lavori?pila=` vive).
- Test: aggiorna eventuali test che importano `LePile` (`grep -rn "LePile" tests/ src/`)

**Decisione ratificata:** `/lavori` nudo non esiste più — `if (!pila) redirect('/dashboard')`. I 4 chiamanti legacy si ripuntano a `/dashboard`. Per BottomNavPill e SchedaNavRail il ripuntamento nudo creerebbe una voce DUPLICATA di `/dashboard` già presente (Home/«Oggi»): la voce si RIMUOVE (caso «rimuovere/ripuntare» del decisions doc — rimozione = ripuntamento senza duplicato; motivalo nel commento).

- [ ] **Step 1:** `grep -rn "LePile" src/ tests/` e annota tutti i punti.
- [ ] **Step 2:** In `lavori/page.tsx`: dopo il calcolo di `pila` (riga 33) aggiungi `if (!pila) redirect('/dashboard')`; rimuovi l'import e il ramo `<LePile …>` (il ternario diventa solo `<PilaAperta …>`); rimuovi la variabile `conteggi` se resta inutilizzata.
- [ ] **Step 3:** `rm src/components/features/pile/LePile.tsx`. Sistema ogni altro import trovato allo Step 1.
- [ ] **Step 4: Ripuntamenti.**
  - `BottomNavPill.tsx`: elimina l'oggetto tab `{ href: '/lavori', label: 'Lavori', … }` (righe ~42-55) e il ramo dedicato in `isTabActive` (`if (tabHref === '/lavori') …`).
  - `SchedaNavRail.tsx:28`: elimina la voce `{ href: '/lavori', etichetta: 'Lavori', glifo: '≣' }` e il ramo `/lavori` in `voceAttiva`.
  - `SchedaLavoroV3.tsx:239`: `router.push('/lavori')` → `router.push('/dashboard')`; `etichettaAria="Torna ai lavori"` → `"Torna alla home"`.
  - `fatture/page.tsx:248`: `href="/lavori"` → `href="/dashboard"`.
- [ ] **Step 5:** `npx tsc --noEmit` + `npx vitest run` (tutti) → verdi. Verifica manuale grep: `grep -rn "'/lavori'" src/ | grep -v "pila=\|/lavori/"` → devono restare SOLO `route-migrate-v3.ts` e `BottomNavPill`… se altro emerge, valuta caso per caso (link a `/lavori?pila=` restano validi).
- [ ] **Step 6: Commit** — `feat(pile): elimina la vista «Le pile» — /lavori senza pila → /dashboard`

---

### Task 8: O1i-1 — «Esci» in fondo a Tutto il resto

**Files:**
- Modify: `src/components/features/tutto-il-resto/TuttoIlResto.tsx` + `src/app/(app)/tutto-il-resto/page.tsx`
- Test: `tests/unit/tutto-il-resto-esci.test.tsx`

**Specifica (mockup `…-o1i-profilo-v3.html` blocco 1 variante A, ratificata):** in fondo alla lista mobile (`.ua-tir-mobile`, dopo il blocco card): colonna centrata `gap: 2, padding: '18px 0 2px'` con (a) firma NON tappabile `Sei {nome} · {labNome}` 12.5/600 `--faint`; (b) `LinkQuieto` «Esci». Tap Esci → `DialogConferma` (`titolo="Vuoi uscire?"`, `testo="Dovrai rifare l'accesso per rientrare."`, `etichettaDistruttiva="Esci"`, `etichettaSicura="Resta"`); conferma → `sb.auth.signOut()` + `router.push('/login')` (pattern IDENTICO a `UserProfileSheet.tsx:76-80`, con `getBrowserClient`).

- [ ] **Step 1: Test failing** — `tests/unit/tutto-il-resto-esci.test.tsx`: mock `next/navigation` (`useRouter → { push }`), mock `@/lib/supabase/client` (o il modulo reale di `getBrowserClient` — verifica il path esatto usato da `UserProfileSheet.tsx`) con `auth.signOut: vi.fn().mockResolvedValue({})`:

```tsx
it('firma non tappabile + Esci con conferma → signOut e /login', async () => {
  render(<TuttoIlResto sezioni={[]} utenteNome="Francesco" labNome="Lab Formicola" />)
  expect(screen.getByText('Sei Francesco · Lab Formicola')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Esci' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Esci', hidden: false }))  // quello del dialog
  await waitFor(() => expect(signOutMock).toHaveBeenCalled())
  expect(pushMock).toHaveBeenCalledWith('/login')
})
```

(Due bottoni «Esci» conviveranno — disambigua selezionando dentro il dialog: `within(screen.getByRole('dialog'))…` se `DialogConferma` espone role dialog; leggi `DialogConferma.tsx` e adegua il selettore.)

- [ ] **Step 2:** RED.
- [ ] **Step 3: Implementazione.** `TuttoIlResto` props: `{ sezioni: Sezione[]; utenteNome: string; labNome: string }`. Stato `dialogAperto`. Il blocco Esci vive SOLO nel ramo mobile. `page.tsx`: passa `utenteNome={context.nome ?? context.email?.split('@')[0] ?? 'Utente'}` e `labNome={context.lab?.nome ?? ''}` (context già presente nella pagina).
- [ ] **Step 4:** GREEN + tsc.
- [ ] **Step 5: Commit** — `feat(nav): voce Esci con conferma in fondo a Tutto il resto (O1i)`

---

### Task 9: O1i-2 — riga identità + Esci nel footer del NavDesk

**Files:**
- Modify: `src/components/ds/Avatar.tsx` (Ø32), `src/components/ds/NavDesk.tsx` (footer), `src/components/features/home/HomeDesktop.tsx` (prop pass-through), `src/app/(app)/dashboard/page.tsx` (dati), `src/app/ds-v3-catalogo/page.tsx` (sezione nav-desk aggiornata)
- Test: `tests/unit/navdesk-identita.test.tsx`

**Specifica (mockup blocco 2 variante A, ratificata):** sopra la StrisciaStato nel footer (`marginTop: 'auto'`, colonna `gap: 14`): riga `display:flex; alignItems:center; gap:10; padding:'0 8px'; minWidth:0` con `Avatar` Ø32 (estensione: `diametro?: 60 | 46 | 32`, fontSize 21→a 32 diventa 12.5), colonna nome 14.5/700 `--ink` + lab 12.5/600 `--faint` (entrambi ellissi), bottone «Esci» 13/600 `--muted` sottolineato (`textUnderlineOffset: 3`, hit-area `padding: '8px 0'`, `flex: none`). Tap Esci → stesso `DialogConferma` + signOut del Task 8 (il dialog è montato da NavDesk).

- [ ] **Step 1: Test failing** — `tests/unit/navdesk-identita.test.tsx`: renderizza `NavDesk` con `identita={{ nome: 'Francesco', lab: 'Lab Formicola' }}` (mock signOut/router come Task 8) e asserisci: iniziali `F` visibili, nome e lab presenti, click Esci → dialog → conferma → signOut+`/login`. Con `identita` assente → `screen.queryByText('Esci')` null (retro-compatibilità: HomeDesktop non aggiornato non rompe).
- [ ] **Step 2:** RED.
- [ ] **Step 3: Implementazione.**
  - `Avatar.tsx`: `diametro?: 60 | 46 | 32`; `fontSize: diametro === 32 ? 12.5 : 21`.
  - `NavDesk.tsx`: prop nuova `identita?: { nome: string; lab: string } | null`; nel footer, sopra `<StrisciaStato…>`, se `identita` renderizza la riga come da specifica; stato `dialogEsci` + `DialogConferma` + logout (import `getBrowserClient` — 'use client' già presente).
  - `HomeDesktop.tsx`: prop `identita?: { nome: string; lab: string } | null` passata a NavDesk.
  - `dashboard/page.tsx`: `identita={{ nome, lab: context.lab?.nome ?? '' }}` (la variabile `nome` esiste già a riga 41).
  - Catalogo: aggiorna l'esempio NavDesk con `identita` fittizia.
- [ ] **Step 4:** GREEN + tsc.
- [ ] **Step 5: Commit** — `feat(ds): riga identità + Esci nel footer NavDesk (O1i)`

---

### Task 10: O1i-3 — segnale trial nella StrisciaStato

**Files:**
- Modify: `src/lib/dashboard/striscia.ts` (ingresso + candidato + gerarchie), `src/components/ds/StrisciaStato.tsx` (tono ambra), `src/app/(app)/dashboard/page.tsx` (wiring), `src/components/features/home/HomeV3.tsx` SOLO SE serve pass-through (il segnale è già una prop — verificare)
- Test: `tests/unit/striscia-trial.test.ts`

**Specifica (mockup blocco 3 variante A, ratificata):** nuovo ingresso opzionale `trial?: { giorniRimasti: number } | null` in `IngressiStriscia` (stile O1f: propagato dal chiamante, NON da `fetchIngressiStriscia`). Nuovo candidato `sTrial`: `forte: 'Prova:'`, `azione: { etichetta: 'Attiva ›', href: '/impostazioni/abbonamento' }` SEMPRE; con `giorniRimasti > 3` → tono ambra, `testo: 'mancano N giorni'`; con `giorniRimasti <= 3` → `attenzione: true` (rosso), testo: 3→`'finisce fra 3 giorni'`, 2→`'finisce dopodomani'`, 1→`'finisce domani'`, 0→`'finisce oggi'`. Precedenza ratificata: allarmi operativi > trial > sereni → `sTrial` si inserisce DOPO `sTitTecnici` e PRIMA di `s8` nelle gerarchie `titolare` e `admin_rete` SOLO (la CTA porta ad Abbonamento, pagina del titolare; scaduto/sospeso restano gestiti dai redirect di layout — B15). Tono: `SegnaleStriscia` guadagna `tono?: 'ambra'`; `StrisciaStato` prop `tono?: 'ambra'` → icona `background: 'var(--amber-tint)', color: 'var(--amber)'`, glifo `⏳` (a `attenzione: true` vince il rosso `!`).

- [ ] **Step 1: Test failing** — `tests/unit/striscia-trial.test.ts` (testa `scegliSegnale`, funzione pura):

```ts
import { scegliSegnale, type IngressiStriscia } from '@/lib/dashboard/striscia'

const sereno: IngressiStriscia = {
  fatturaScartata: null, materialeRosso: null, pagamentoScaduto: null, ddcOggi: 0,
  pile: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null, arrivoVecchio: null, fermo: null, consegneOggiTotali: 0, prossimaOra: null },
}

describe('sTrial (O1i)', () => {
  it('ambra con CTA quando mancano più di 3 giorni', () => {
    const s = scegliSegnale('titolare', { ...sereno, trial: { giorniRimasti: 12 } })
    expect(s).toMatchObject({ forte: 'Prova:', testo: 'mancano 12 giorni', tono: 'ambra', attenzione: false })
    expect(s.azione).toEqual({ etichetta: 'Attiva ›', href: '/impostazioni/abbonamento' })
  })
  it('rosso negli ultimi 3 giorni', () => {
    expect(scegliSegnale('titolare', { ...sereno, trial: { giorniRimasti: 2 } })).toMatchObject({ testo: 'finisce dopodomani', attenzione: true })
  })
  it('gli allarmi operativi vincono sul trial', () => {
    const conRitardo = { ...sereno, trial: { giorniRimasti: 2 }, pile: { ...sereno.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } }
    expect(scegliSegnale('titolare', conRitardo).forte).toBe('n.144')
  })
  it('il trial vince sui sereni', () => {
    const s = scegliSegnale('titolare', { ...sereno, ddcOggi: 3, trial: { giorniRimasti: 12 } })
    expect(s.forte).toBe('Prova:')
  })
  it('tecnico non vede il segnale trial', () => {
    expect(scegliSegnale('tecnico', { ...sereno, trial: { giorniRimasti: 2 } }).forte).toBe('Tutto a posto:')
  })
})
```

- [ ] **Step 2:** RED.
- [ ] **Step 3: Implementazione** in `striscia.ts`: `SegnaleStriscia` + `tono?: 'ambra'`; `IngressiStriscia` + `trial?: { giorniRimasti: number } | null` (commento stile O1f: propagato dal chiamante); candidato:

```ts
// O1i — segnale trial (decisions 20/07): ambra informativa finché il trial va,
// rossa negli ultimi 3 giorni. SOLO titolare/admin_rete (la CTA è Abbonamento).
// Scaduto/sospeso NON passano di qui: li gestiscono i redirect di layout (B15).
const TESTO_FINE: Record<number, string> = { 0: 'finisce oggi', 1: 'finisce domani', 2: 'finisce dopodomani', 3: 'finisce fra 3 giorni' }
const sTrial: Candidato = (i) => {
  const g = i.trial?.giorniRimasti
  if (g === undefined || g === null || g < 0) return null
  const azione = { etichetta: 'Attiva ›', href: '/impostazioni/abbonamento' }
  if (g <= 3) return { attenzione: true, forte: 'Prova:', testo: TESTO_FINE[g], azione }
  return { attenzione: false, tono: 'ambra', forte: 'Prova:', testo: `mancano ${g} giorni`, azione }
}
```

Gerarchie: `titolare: [s1..s7, sTitTecnici, sTrial, s8, s9]`, idem `admin_rete`; `front_desk`/`tecnico` invariati. In `StrisciaStato.tsx`: prop `tono?: 'ambra'`; l'icona: `attenzione` → rosso `!` (come oggi); altrimenti `tono === 'ambra'` → `--amber-tint`/`--amber` glifo `⏳`; altrimenti verde `✓`.
- [ ] **Step 4: Wiring** in `dashboard/page.tsx`: dopo `const segnale = scegliSegnale(…)` — anzi DENTRO la chiamata: calcola prima

```ts
const trial = context.lab?.stato === 'trial' && context.lab.trial_ends_at
  ? { giorniRimasti: Math.max(0, Math.ceil((new Date(context.lab.trial_ends_at).getTime() - adessoRoma().getTime()) / 86_400_000)) }
  : null
```

e passa `trial` nell'oggetto di `scegliSegnale` (riga 37). `HomeV3`/`NavDesk` ricevono già `segnale` → aggiorna solo `StrisciaStato` nei punti che lo montano perché propaghi `tono` (grep `<StrisciaStato` in `src/`: HomeV3 footer + NavDesk — aggiungi `tono={segnale.tono}`).
- [ ] **Step 5:** GREEN + tsc.
- [ ] **Step 6: Commit** — `feat(home): segnale trial ambra/rosso nella StrisciaStato con precedenza ratificata (O1i)`

---

### Task 11: «Persone» v3 — pagina, righe, card cedolini

**Files:**
- Modify: `src/lib/nav/route-migrate-v3.ts:20` (aggiungi `'/tecnici'` all'array `ROUTE_MIGRATE_V3` — NON toccare riga 24)
- Rewrite: `src/app/(app)/tecnici/page.tsx`
- Create: `src/components/features/tecnici/PersoneV3.tsx`
- Test: `tests/unit/persone-v3.test.tsx`

**Specifica (decisions «Cedolini batch 2A», nessun mockup dedicato → legge = componenti DS v3 + questo piano):**
- La pagina server resta con auth/ruolo identici, wrapper `<div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}><div className="ds-grana" aria-hidden />…` (pattern `lavori/page.tsx:39-40`). Query invariata + in più `attivo`/`deleted_at` se già filtrati oggi (verifica la query attuale e conserva il perimetro).
- **Chrome pagina-lista v3 (NASCE QUI — nominarlo nei commenti, promozione a componente ds in ondata B):** dentro `PersoneV3`, header `display:flex; alignItems:center; gap:16` con `TastoTondo glifo="‹" etichettaAria="Indietro"` → `router.push('/tutto-il-resto')` e `<h1>` «Persone» 27/800 tracking −.02em `--ink` (pattern `TuttoIlResto.tsx:52-55`); container `maxWidth: 480, margin: '0 auto', padding: '24px 24px 40px'`. Su ≥1024 la pagina resta la stessa colonna centrata (nessun regime desktop dedicato in quest'ondata).
- **Card cedolini** (SOLO `ruolo === 'titolare' || 'admin_rete'`), in testa: card v3 (`borderRadius: raggio.tile, background: 'var(--card)', boxShadow: 'var(--sh-card)', padding: '15px 16px'`) con titolo «I cedolini» 17.5/700, sub `«{MeseCorrente} {anno}»` 14/500 `--muted` — il label mese arriva DAL SERVER (prop `meseLabel`, calcolato in page.tsx con `oggiRomaISO()`/`MESI` da `@/lib/utils/data-roma` — MAI `getFullYear()` client, regola ratificata) — e `TastoSecondario` «Scarica (CSV)» che fa `window.location.assign('/api/tecnici/cedolini-batch')` (API via URL, interim ratificato). Se il lab non ha tecnici → la card non si mostra.
- **Righe persone:** per ogni tecnico una card-riga v3 (stessa anatomia card-sezione di `TuttoIlResto.tsx:59-89`): `Avatar` Ø46 con `nome={`${t.nome} ${t.cognome}`}` + colonna nome 17.5/700 e sotto qualifica dal dizionario («Tecnico» se `qualifica` vuota) 14/500 `--muted` + se `t.prrc` pill verde «PRRC ✓» (`Pill`/`PillTempo` famiglia green — leggi `Pill.tsx` e usa il componente giusto) + chevron ›. Tap riga → apre lo Sheet persona (Task 12) — in questo task il tap può già impostare `personaAperta` e lo sheet arriva al Task 12 (monta un placeholder`Sheet` vuoto NO — semplicemente lo stato esiste e lo sheet si aggiunge al Task 12; la riga è comunque un button con aria `Apri {nome}`).
- **Empty state:** `Vuoto` (ds) `glifo="👥" titolo="Nessuna persona" guida="Invita un collaboratore per assegnargli i lavori."`.

- [ ] **Step 1: Test failing** — `tests/unit/persone-v3.test.tsx` (render di `PersoneV3` con fixture):

```tsx
const tecnici = [
  { id: 't1', nome: 'Ciro', cognome: 'Esposito', sigla: 'CE', qualifica: null, prrc: true, compenso_base: null, tipo_compenso: null },
]
it('card cedolini per il titolare, con mese dal server', () => {
  render(<PersoneV3 tecnici={tecnici} ruolo="titolare" meseLabel="Luglio 2026" />)
  expect(screen.getByText('I cedolini')).toBeInTheDocument()
  expect(screen.getByText('Luglio 2026')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Scarica \(CSV\)/ })).toBeInTheDocument()
})
it('niente card cedolini per il tecnico', () => {
  render(<PersoneV3 tecnici={tecnici} ruolo="tecnico" meseLabel="Luglio 2026" />)
  expect(screen.queryByText('I cedolini')).not.toBeInTheDocument()
})
it('riga persona: nome, dizionario Tecnico, PRRC ✓', () => {
  render(<PersoneV3 tecnici={tecnici} ruolo="titolare" meseLabel="Luglio 2026" />)
  expect(screen.getByText('Ciro Esposito')).toBeInTheDocument()
  expect(screen.getByText('Tecnico')).toBeInTheDocument()
  expect(screen.getByText(/PRRC/)).toBeInTheDocument()
})
```

- [ ] **Step 2:** RED.
- [ ] **Step 3: Implementazione** come da specifica. Interfaccia: `PersoneV3(props: { tecnici: TecnicoRow[]; ruolo: string; meseLabel: string })` con `TecnicoRow` esportato dal componente (stessi campi della query attuale). `page.tsx` riscritta: stessa auth, stesso fetch, in più `meseLabel` server-side, monta `<PersoneV3 …>` nel wrapper v3. Aggiungi `'/tecnici'` a `ROUTE_MIGRATE_V3` (riga 20).
- [ ] **Step 4:** GREEN + tsc + `npx vitest run` (i test di `lab-guard-routes-enforce`/nav esistenti devono restare verdi — se un test fissa `ROUTE_MIGRATE_V3`, aggiornalo dichiarando il cambio).
- [ ] **Step 5: Commit** — `feat(tecnici): migra /tecnici a v3 come «Persone» — chrome pagina-lista + card cedolini (ondata A)`

---

### Task 12: «Persone» v3 — Sheet persona (dettagli, modifica, disattiva)

**Files:**
- Create: `src/components/features/tecnici/SchedaPersonaSheet.tsx`
- Modify: `src/components/features/tecnici/PersoneV3.tsx` (monta lo sheet)
- Test: `tests/unit/scheda-persona-sheet.test.tsx`

**Specifica (decisions: «scheda persona = Sheet v3, NESSUNA route nuova»):** `Sheet` v3 con `titolo` = nome persona. Contenuto:
- `CardInfo` con `RigaDato`: Qualifica (dizionario «Tecnico» se vuota) · Sigla (se presente) · PRRC («Sì ✓» verde / «No») · Compenso (formatta `compenso_base` + `tipo_compenso` se presenti e SOLO per titolare/admin_rete).
- Azioni (solo `ruolo` titolare/admin_rete): `TastoSecondario` «Modifica» → modalità edit inline nello sheet con `CampoTesto` per nome/cognome/sigla/qualifica + salva con `PATCH /api/tecnici/{id}` (leggi PRIMA `TecnicoEditInline.tsx` e replica ESATTAMENTE payload/headers/gestione errori dell'attuale — il server non si tocca) · `TastoSecondario` «Produttività» → `router.push(\`/tecnici/${id}/produttivita\`)` · `LinkQuieto` «Disattiva» + `DialogConferma` (`titolo="Disattivi {nome}?"`, `testo="Non riceverà più lavori. Potrai riattivarlo dal database."`, `etichettaDistruttiva="Disattiva"`, `etichettaSicura="Annulla"`) → `POST /api/tecnici/{id}/deactivate` (pattern `TecnicoDeactivateButton.tsx:25`) → `router.refresh()` e chiudi.
- Errori → messaggio inline `role="alert"` rosso, sheet aperto.

- [ ] **Step 1: Test failing** — `tests/unit/scheda-persona-sheet.test.tsx`: (a) render con persona → righe Qualifica/PRRC visibili; (b) ruolo tecnico → nessun bottone Modifica/Disattiva; (c) click Disattiva → dialog → conferma → `fetch` chiamata su `/api/tecnici/t1/deactivate` con `method: 'POST'` (mock fetch, mock router). Scrivi i test con lo stesso stile del Task 5.
- [ ] **Step 2:** RED.
- [ ] **Step 3:** Implementa; in `PersoneV3` monta `<SchedaPersonaSheet aperto={!!personaAperta} persona={personaAperta} ruolo={ruolo} onChiudi={() => setPersonaAperta(null)} />`.
- [ ] **Step 4:** GREEN + tsc.
- [ ] **Step 5: Commit** — `feat(tecnici): sheet persona v3 con modifica e disattivazione`

---

### Task 13: «Persone» v3 — UI invito rifatta (API INTOCCABILE)

**Files:**
- Create: `src/components/features/tecnici/InvitoPersonaSheet.tsx`
- Modify: `src/components/features/tecnici/PersoneV3.tsx` (CTA «Invita» per il titolare)
- Test: `tests/unit/invito-persona-sheet.test.tsx`

**Specifica:** SOLO `ruolo === 'titolare'` (parità con oggi: `tecnici/page.tsx:42`). In testa a Persone (sotto la card cedolini) un `TastoSecondario` «+ Invita una persona» che apre `Sheet` v3: `CampoTesto` email + scelta ruolo con `ChipScelta` (`tecnico` «Tecnico» / `front_desk` «Front desk» / `titolare` «Titolare» — stessi valori accettati da `isRuoloInvitabileDaTitolare`) + `TastoPrimario` «Invita» → `POST /api/tecnici/invite` body `{ email, ruolo }` (payload IDENTICO a `InvitaCollaboratoreSheet.tsx:90-93`; l'API non si tocca). Sotto, lista inviti pendenti da `GET /api/tecnici/invite` con revoca `DELETE /api/tecnici/invite/{id}` (pattern righe 58 e 117 del componente legacy) — righe semplici email + `LinkQuieto` «Revoca». Successo → messaggio verde inline + refresh lista; errore → `role="alert"` rosso. Email vuota/invalida → validazione client come nel legacy (riga 81-83). Il componente legacy `InvitaCollaboratoreSheet.tsx` NON si cancella se altre superfici lo usano — `grep -rn "InvitaCollaboratoreSheet" src/`: se l'unico consumer era `/tecnici`, cancellalo insieme a `TecnicoEditInline`/`TecnicoDeactivateButton` SOLO se anch'essi restano orfani (grep ciascuno; i file orfani si eliminano, quelli usati altrove restano).

- [ ] **Step 1: Test failing** — (a) submit con email valida + ruolo → fetch POST `/api/tecnici/invite` con body `{ email, ruolo: 'tecnico' }`; (b) email vuota → nessuna fetch + messaggio errore; (c) inviti pendenti renderizzati dal GET mockato + revoca chiama DELETE.
- [ ] **Step 2:** RED.
- [ ] **Step 3:** Implementa + wiring in `PersoneV3` + pulizia orfani (con grep documentato nel messaggio di commit).
- [ ] **Step 4:** GREEN + tsc + `npx vitest run` completo.
- [ ] **Step 5: Commit** — `feat(tecnici): UI invito v3 (API invito invariata) + pulizia componenti legacy orfani`

---

### Task 14: Emendamenti spec v3 in blocco

**Files:**
- Modify: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`

Incidi gli emendamenti ratificati (decisions doc §finale), ciascuno con nota `(emendamento 20/07/2026, ondata A)`:
- [ ] §5.8 — targa-cassetta co-identità in riga 1 di CardLavoro (assente ⇒ blocco assente).
- [ ] §5.5 — LinkQuieto esteso ad azioni rare e quiete (Esci), non solo vie di fuga.
- [ ] §5.24 — terzo tono `ambra` della StrisciaStato (segnale trial) + gerarchia di precedenza: allarmi operativi > trial > sereni.
- [ ] §5.9 — pill «PRRC ✓» (righe Persone).
- [ ] §7.2/§6.1/§6.2 — morte di «Le pile»: `/lavori` senza `pila` → redirect `/dashboard`; back della pila → `/dashboard`.
- [ ] §7.16 — riga «I tuoi dati» (nasce con ondata F1) + preferenza utente «La tua home» (Parete) + voce «Esci» in Tutto il resto.
- [ ] §3.3/§7.1 — home a due stanze (Pile ↔ Parete, swipe+dots+peek) — annuncio, implementazione con la Parete.
- [ ] §6.1 — voce «Le cassette» (arriva con la Parete).
- [ ] Chrome v3 pagina-lista (nato in «Persone», Task 11): annotare in §14 (o sezione componenti) che la promozione a componente ds è calendarizzata in ondata B.
- [ ] Commit — `docs(spec): emendamenti v3 ondata A mini-triage in blocco (ratifica 20/07)`

---

### Task 15: Verifica finale (FASE 7) + QA (FASE 9) + GATE ESTETICO L2 (FASE 9b) + BP-1

- [ ] **FASE 7 (output reali, tutti e tre):** `npx tsc --noEmit` → 0 errori · `npx vitest run` → tutti verdi · `npx next build` → success.
- [ ] **FASE 9 — QA browser** (skill `gstack` / Playwright): viewport 390/768/1280 × light/dark su: home (targa cassetta card, striscia trial, NavDesk identità a 1280), `/lavori?pila=blu` (sheet conferma-cassetta: chip, campo, fuga), `/lavori` nudo (redirect), scheda lavoro (denti chips → tab clinica), `/tutto-il-resto` (Esci + dialog), `/tecnici` (Persone v3: card cedolini, righe, sheet persona, invito). Login test: credenziali in MEMORY.md §Credenziali test; lab E2E `00000000-0000-0000-0000-000000000001` (`scripts/seed-e2e.ts`).
- [ ] **FASE 9b — GATE ESTETICO L2** sulle SOLE superfici dell'ondata (Persone, striscia, NavDesk, CardLavoro/scheda/sheet): micro-audit contro `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` (12 sezioni × 3 viewport × 2 temi); ogni ❌ risolto o deferito con motivo; screenshot before/after in `docs/design/screenshots/2026-07-XX-ondata-a-mini-triage/`.
- [ ] **BP-1:** aggiorna `memory/MEMORY.md` (nuova voce stato ondata A), `docs/roadmap/ROADMAP-UFFICIALE.md` (ondata A → implementata, in attesa merge), `memory/SESSION_ACTIVE.md`.
- [ ] **STOP:** chiedere a Francesco conferma per merge → push → deploy (FASE 10). MAI procedere senza.

---

## Self-review (fatta in stesura)

- **Copertura decisions doc:** A13 ✓ (Task 6) · A14 ✓ (1-2) · conferma-arrivo ✓ (4-5) · ricerca per-pila ✓ (3) · O1h ✓ (già corretto, nessun task) · «Le pile» ✓ (7) · O1i ×3 ✓ (8-10) · Cedolini/Persone ✓ (11-13) · Export CSV lavori → F1 (fuori perimetro, ✓ deferito) · emendamenti ✓ (14) · deferral A10/A11 ✓ (nessun task).
- **Tipi coerenti:** `LavoroPila.cassetta` (Task 1) consumato da Task 2/3/5 con lo stesso nome · `ConfermaCassettaSheet` firma unica (Task 5) · `identita` prop uniforme NavDesk/HomeDesktop (Task 9) · `tono: 'ambra'` (Task 10) su SegnaleStriscia e StrisciaStato.
- **Punti di attenzione dichiarati:** rimozione (non ripuntamento) delle voci nav duplicate in Task 7, motivata; `sTrial` solo titolare/admin_rete, motivato B15; chips cassette derivate senza API nuova (niente N13 da applicare — nessuna route nuova in tutta l'ondata).
