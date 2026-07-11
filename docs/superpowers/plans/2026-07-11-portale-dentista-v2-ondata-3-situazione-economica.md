# Portale Dentista v2 — Ondata 3: Situazione Economica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il dentista vede nel portale (dietro PIN) la propria situazione economica verso il laboratorio — saldo a 4 numeri, dettaglio dovuti (fatture + lavori diretti concordati), pagamenti registrati — con gli stessi numeri dello scadenzario lato lab, calcolati dalla stessa funzione.

**Architettura:** Una sola route nuova `GET /api/portale/[token]/situazione` dietro `guardieEconomiche`, che riusa `getContabilitaCliente` (zero logica contabile nuova) e una nuova query `getPagamentiCliente` (doppio inner join: `pagamenti` non ha `cliente_id`). DTO ad allowlist esplicita (mai id interni, mai `metodo_nota`, mai `stato_sdi`). UI: `SituazioneEconomicaSection` montata nella fase lista di `FatturazioneSection`, sotto lo storico fatture — un solo PIN gate, pattern Ondata 2. **Zero migration, zero schema change** (verificato: `portale_accessi.azione` è TEXT senza CHECK → l'azione audit nuova è solo TypeScript).

**Tech Stack:** Next.js 16 App Router · Supabase (service client) · Vitest + @testing-library/react.

**Spec di riferimento:** `docs/superpowers/specs/2026-07-11-portale-dentista-v2-ondata-3-situazione-economica-design.md` (decisioni D-O3-1…4) + spec madre `2026-07-10-portale-dentista-v2-fatturazione-concordata-design.md` §3/§4/§7.

## Global Constraints

- **Dominio critico** (portale economico esposto) → percorso Grande BP-2. Nessuna migration in questa ondata ⇒ FASE 6b NON scatta.
- Route economiche portale: risposta **uniforme** `{ errore: 'non_autorizzato' }` 401 per token invalido/scaduto (F13); 403 `sezione_disattivata` con interruttore OFF; 401 `sessione_scaduta` senza sessione; mai messaggi Postgres grezzi nelle risposte; audit economico **fail-loud** con IP/UA (spec §4).
- Ogni query filtrata `laboratorio_id` + `cliente_id` del token (fail-closed). Campi vietati nel payload: `metodo_nota`, `id`, `stato_sdi` — protetti da test content-check.
- UI nuova ⇒ gate mockup CLAUDE.md §0B: mockup HTML in `docs/design/mockups/` (MAI /tmp) → screenshot → approvazione Francesco → poi React. PNG mockup richiedono `git add -f`. Il portale usa lo stile esistente del portale (DM Sans, card bianche, CSS inline esadecimale — NON DS v3).
- Suite baseline: **1274 passed | 4 skipped** — mai regressioni; `tsc --noEmit` e `npx next build` puliti a fine ondata.
- QA browser: lab E2E `00000000-0000-0000-0000-000000000001`, MAI il lab Filippo; dev server nel worktree con `PORT=3013 npm run dev` (NON `preview_start`, che lancia il checkout principale); env `PORTALE_PIN_PEPPER`/`PORTALE_SESSION_SECRET` NON sono in `.env.local` (solo su Vercel) → aggiungerle temporaneamente per la QA e RIMUOVERLE (lezione Ondata 2).
- Esecuzione in worktree dedicato (`ondata-3-situazione-economica`); copiare `.env.local` nel worktree.
- Commit format: `feat(portale): …` / `test(portale): …` / `docs(design): …`.

---

### Task 1: Mockup «Situazione economica» del portale — GATE approvazione Francesco

**Files:**
- Create: `docs/design/mockups/2026-07-11-portale-situazione-economica.html`
- Create: `docs/design/mockups/screenshots/2026-07-11-portale-situazione-economica-390.png` (git add -f)
- Create (dopo approvazione): `docs/design/decisions/2026-07-11-portale-situazione-economica.md`

**Interfaces:**
- Produces: layout approvato che Task 4 implementa fedelmente.

- [ ] **Step 1: Scrivi il mockup HTML**

Mockup statico mobile-first (390px) coerente con lo stile del portale (sfondo `#F8F9FA`, card bianche radius 16px, DM Sans, shadow `0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)` — vedi `FattureStoricoSection.tsx` e mockup approvato `2026-07-11-portale-storico-fatture.html`). Contenuto:

- La sezione compare DENTRO l'area riservata, SOTTO «Fatture» (separatore `#E5E7EB` come tra Da fatturare e Fatture).
- Header sezione: titolo "Situazione economica" (h2, 19px, 700).
- **Card saldo** (card bianca in cima): righe etichetta/valore —
  - "Da saldare" → confermato (17px, 700, `#111827`)
  - "In attesa di tua decisione" → potenziale, con sottotesto grigio 12px "I lavori nella sezione «Da fatturare» qui sopra" (riga presente solo se potenziale > 0)
  - "Tuo credito" → disponibile in verde `#15803D` (riga presente SOLO se disponibile > 0)
  - separatore, poi "Totale" → totale (19px, 800).
- **Blocco «Dettaglio dovuti»** collassabile (bottone header con chevron, min-height 44px, aria-expanded): righe card — a sinistra etichetta ("Fattura 2026-0002" / "Lavoro 2026/0015") e data estesa it-IT; a destra il residuo (700) e, se `giorni_ritardo > 0` e non saldata, badge ambra "in ritardo di N gg" (`#B45309` su `#FEF3C7`); le righe saldate in coda, quiete (testo `#9CA3AF`, importo barrato o etichetta "Saldata").
- **Blocco «Pagamenti registrati»** collassabile: gruppi per anno (etichetta uppercase grigia), righe — a sinistra data e metodo ("Bonifico", "Contanti"), sottotesto destinazione ("per Fattura 2026-0002" / "per Lavoro 2026/0015"); a destra importo (700, verde `#15803D` con prefisso "−" NO: importo neutro `#111827` — è denaro già versato, non un delta).
- Stato vuoto (nessun dovuto e nessun pagamento): card con icona ⚖️ e "Nessun movimento economico registrato."
- Dati simulati realistici: saldo confermato 812,00 €, potenziale 322,00 €, credito 0 (riga nascosta nel default) — più una variante commentata nel file con credito 45,00 € per mostrare la riga verde; 4 dovuti (2 fatture non saldate di cui 1 in ritardo 43 gg, 1 lavoro diretto, 1 fattura saldata), 3 pagamenti su 2 anni. Importi con `Intl.NumberFormat it-IT EUR`.

- [ ] **Step 2: Screenshot Playwright a 390px**

Viewport 390×844, screenshot full-page del mockup `file://`. Salva in `docs/design/mockups/screenshots/2026-07-11-portale-situazione-economica-390.png`.

- [ ] **Step 3: GATE — mostra lo screenshot a Francesco e attendi «ok procedi»**

FERMARSI. Nessun codice React della sezione prima dell'approvazione esplicita. Recepire eventuali modifiche nel mockup e ripetere lo screenshot.

- [ ] **Step 4: Documenta la decisione e committa**

`docs/design/decisions/2026-07-11-portale-situazione-economica.md`: data, screenshot di riferimento, scelte (posizione sotto Fatture, card saldo a 4 numeri con credito solo se > 0, blocchi collassabili, badge ritardo ambra, pagamenti con metodo e destinazione senza note interne).

```bash
git add docs/design/mockups/2026-07-11-portale-situazione-economica.html docs/design/decisions/2026-07-11-portale-situazione-economica.md
git add -f docs/design/mockups/screenshots/2026-07-11-portale-situazione-economica-390.png
git commit -m "docs(design): mockup approvato sezione Situazione economica portale (Ondata 3)"
```

---

### Task 2: `getPagamentiCliente` in `src/lib/contabilita/queries.ts`

**Files:**
- Modify: `src/lib/contabilita/queries.ts` (append in fondo al file)
- Test: `tests/unit/contabilita-pagamenti-cliente.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient` (`@supabase/supabase-js`), tabelle `pagamenti`, `fatture`, `lavori`.
- Produces (Task 3 la importa):
```typescript
export interface PagamentoClientePortale {
  data: string        // data_pagamento
  importo: number
  metodo: string      // valore standard (contanti, bonifico, …) — MAI metodo_nota
  destinazione: { tipo: 'fattura' | 'lavoro'; numero: string }
}
export async function getPagamentiCliente(
  svc: SupabaseClient, labId: string, clienteId: string
): Promise<PagamentoClientePortale[]>  // throws su errore query (fail-closed)
```

`pagamenti` NON ha `cliente_id`: due query con inner join (`fattura_id→fatture`, `lavoro_id→lavori`), merge, ordinamento per `data_pagamento` discendente. `metodo_nota` non viene nemmeno selezionato.

- [ ] **Step 1: Scrivi i failing test**

```typescript
// tests/unit/contabilita-pagamenti-cliente.test.ts
// Ondata 3 — pagamenti del cliente per il portale (spec §4).
// pagamenti non ha cliente_id: doppio inner join fatture/lavori.
import { describe, it, expect } from 'vitest'
import { getPagamentiCliente } from '@/lib/contabilita/queries'

// Fake supabase: registra le select e i filtri eq/is; risolve con le fixture
// della "via" giusta (fatture o lavori) in base alla select richiesta.
function createFakeSupabase(data: {
  viaFatture?: Array<Record<string, unknown>>
  viaLavori?: Array<Record<string, unknown>>
  erroreFatture?: { message: string } | null
  erroreLavori?: { message: string } | null
}) {
  const selects: string[] = []
  const fake = {
    from(table: string) {
      if (table !== 'pagamenti') throw new Error(`tabella inattesa: ${table}`)
      let via: 'fatture' | 'lavori' | null = null
      const builder = {
        select(cols: string) {
          selects.push(cols)
          via = cols.includes('fatture!inner') ? 'fatture' : 'lavori'
          return builder
        },
        eq() { return builder },
        is() { return builder },
        then(resolve: (v: { data: unknown; error: unknown }) => void) {
          if (via === 'fatture') resolve({ data: data.erroreFatture ? null : (data.viaFatture ?? []), error: data.erroreFatture ?? null })
          else resolve({ data: data.erroreLavori ? null : (data.viaLavori ?? []), error: data.erroreLavori ?? null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { fake, selects }
}

describe('getPagamentiCliente', () => {
  it('unifica pagamenti su fatture e lavori, ordinati per data desc, con destinazione', async () => {
    const { fake } = createFakeSupabase({
      viaFatture: [
        { data_pagamento: '2026-03-10', importo: 300, metodo: 'bonifico', fatture: { numero: '2026-0001' } },
      ],
      viaLavori: [
        { data_pagamento: '2026-06-01', importo: 150, metodo: 'contanti', lavori: { numero_lavoro: '2026/0015' } },
        { data_pagamento: '2025-11-20', importo: 90, metodo: 'pos', lavori: { numero_lavoro: '2025/0102' } },
      ],
    })
    const r = await getPagamentiCliente(fake, 'lab-1', 'cli-1')
    expect(r).toEqual([
      { data: '2026-06-01', importo: 150, metodo: 'contanti', destinazione: { tipo: 'lavoro', numero: '2026/0015' } },
      { data: '2026-03-10', importo: 300, metodo: 'bonifico', destinazione: { tipo: 'fattura', numero: '2026-0001' } },
      { data: '2025-11-20', importo: 90, metodo: 'pos', destinazione: { tipo: 'lavoro', numero: '2025/0102' } },
    ])
  })

  it('non seleziona MAI metodo_nota (minimizzazione alla sorgente)', async () => {
    const { fake, selects } = createFakeSupabase({})
    await getPagamentiCliente(fake, 'lab-1', 'cli-1')
    expect(selects).toHaveLength(2)
    for (const s of selects) expect(s).not.toContain('metodo_nota')
  })

  it('errore sulla via fatture → throw (fail-closed, mai lista parziale)', async () => {
    const { fake } = createFakeSupabase({ erroreFatture: { message: 'boom' } })
    await expect(getPagamentiCliente(fake, 'lab-1', 'cli-1')).rejects.toThrow()
  })

  it('errore sulla via lavori → throw (fail-closed)', async () => {
    const { fake } = createFakeSupabase({ erroreLavori: { message: 'boom' } })
    await expect(getPagamentiCliente(fake, 'lab-1', 'cli-1')).rejects.toThrow()
  })

  it('liste vuote → array vuoto', async () => {
    const { fake } = createFakeSupabase({})
    expect(await getPagamentiCliente(fake, 'lab-1', 'cli-1')).toEqual([])
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/contabilita-pagamenti-cliente.test.ts`
Expected: FAIL — `getPagamentiCliente` non esportata.

- [ ] **Step 3: Implementa `getPagamentiCliente`**

Append in fondo a `src/lib/contabilita/queries.ts`:

```typescript
export interface PagamentoClientePortale {
  data: string
  importo: number
  metodo: string
  destinazione: { tipo: 'fattura' | 'lavoro'; numero: string }
}

/**
 * Pagamenti attivi di un cliente, unificati dalle due vie possibili
 * (pagamenti non ha cliente_id: la risoluzione passa per fattura_id o
 * lavoro_id). Nato per il portale dentista (Ondata 3, spec §4): seleziona
 * SOLO i campi esposti — metodo_nota (nota interna lab) non viene nemmeno
 * letto. Fail-closed: errore di query → throw, mai lista parziale.
 */
export async function getPagamentiCliente(
  svc: SupabaseClient,
  labId: string,
  clienteId: string
): Promise<PagamentoClientePortale[]> {
  const [viaFatture, viaLavori] = await Promise.all([
    svc
      .from('pagamenti')
      .select('data_pagamento, importo, metodo, fatture!inner(numero)')
      .eq('laboratorio_id', labId)
      .eq('stato', 'attivo')
      .eq('fatture.cliente_id', clienteId)
      .eq('fatture.laboratorio_id', labId)
      .is('fatture.deleted_at', null),
    svc
      .from('pagamenti')
      .select('data_pagamento, importo, metodo, lavori!inner(numero_lavoro)')
      .eq('laboratorio_id', labId)
      .eq('stato', 'attivo')
      .eq('lavori.cliente_id', clienteId)
      .eq('lavori.laboratorio_id', labId)
      .is('lavori.deleted_at', null),
  ])

  if (viaFatture.error) throw new Error(`[pagamenti cliente] via fatture: ${viaFatture.error.message}`)
  if (viaLavori.error) throw new Error(`[pagamenti cliente] via lavori: ${viaLavori.error.message}`)

  const suFatture = ((viaFatture.data ?? []) as unknown as Array<{
    data_pagamento: string; importo: number; metodo: string; fatture: { numero: string }
  }>).map((p) => ({
    data: p.data_pagamento,
    importo: Number(p.importo),
    metodo: p.metodo,
    destinazione: { tipo: 'fattura' as const, numero: p.fatture.numero },
  }))

  const suLavori = ((viaLavori.data ?? []) as unknown as Array<{
    data_pagamento: string; importo: number; metodo: string; lavori: { numero_lavoro: string }
  }>).map((p) => ({
    data: p.data_pagamento,
    importo: Number(p.importo),
    metodo: p.metodo,
    destinazione: { tipo: 'lavoro' as const, numero: p.lavori.numero_lavoro },
  }))

  return [...suFatture, ...suLavori].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  )
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/contabilita-pagamenti-cliente.test.ts`
Expected: 5 PASS.

- [ ] **Step 5: Verifica TypeScript e committa**

```bash
npx tsc --noEmit
git add src/lib/contabilita/queries.ts tests/unit/contabilita-pagamenti-cliente.test.ts
git commit -m "feat(contabilita): getPagamentiCliente — pagamenti attivi unificati per il portale (Ondata 3)"
```

---

### Task 3: Route `GET /api/portale/[token]/situazione` + azione audit `view_situazione`

**Files:**
- Modify: `src/lib/portale/audit.ts:9-16` (azione nuova nel tipo `AzionePortale`)
- Create: `src/app/api/portale/[token]/situazione/route.ts`
- Test: `tests/unit/portale-situazione-get-route.test.ts`

**Interfaces:**
- Consumes: `guardieEconomiche(svc, req, token)` da `src/lib/portale/guardie.ts`; `logPortaleAudit` da `src/lib/portale/audit.ts`; `getContabilitaCliente` e `getPagamentiCliente` da `src/lib/contabilita/queries.ts` (Task 2).
- Produces (Task 4 la consuma via fetch):
```typescript
export type DovutoPortale = {
  origine: 'fattura' | 'lavoro_diretto'
  numero: string
  data: string
  totale: number
  residuo: number
  pagata: boolean
  giorni_ritardo: number
}
export type SituazionePortaleResponse = {
  studio: string | null
  saldo: { confermato: number; potenziale: number; disponibile: number; totale: number }
  dovuti: DovutoPortale[]
  pagamenti: Array<{ data: string; importo: number; metodo: string; destinazione: { tipo: 'fattura' | 'lavoro'; numero: string } }>
}
```
Azione audit nuova in `AzionePortale`: `'view_situazione'` (nessun CHECK su `portale_accessi.azione` in DB — verificato 11/07 su `002_fase2_schema.sql:383-391`, nessuna migration necessaria).

- [ ] **Step 1: Aggiungi l'azione audit**

In `src/lib/portale/audit.ts`, estendi il tipo:
```typescript
export type AzionePortale =
  | 'view_lavori' | 'download_ddc' | 'download_buono'
  | 'view_fatturazione' | 'lista_stampata' | 'proposta_fatturazione'
  | 'view_fatture' | 'download_fattura'
  | 'view_situazione'
  | 'pin_ok' | 'pin_errato' | 'pin_bloccato'
  | 'pin_impostato' | 'pin_reimpostato'
  | 'interruttore_on' | 'interruttore_off'
  | 'link_rigenerato'
```

- [ ] **Step 2: Scrivi i failing test**

Le due funzioni contabili sono mockate a livello di modulo (hanno già i loro unit test — Task 2 e `contabilita-cliente-query.test.ts`): qui si testa la route — guardie, mappatura ad allowlist, audit, errori. Le fixture della lib contengono DELIBERATAMENTE i campi vietati (`id`, `stato_sdi`) per provare che la route li lascia cadere.

```typescript
// tests/unit/portale-situazione-get-route.test.ts
// Ondata 3 — situazione economica nel portale, dietro PIN (spec Ondata 3 §3).
// Il saldo è l'output di calcolaCreditoCliente passato così com'è; i dovuti
// sono minimizzati ad allowlist (cadono id e stato_sdi).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

const { mockContabilita, mockPagamenti } = vi.hoisted(() => ({
  mockContabilita: vi.fn(),
  mockPagamenti: vi.fn(),
}))
vi.mock('@/lib/contabilita/queries', () => ({
  getContabilitaCliente: mockContabilita,
  getPagamentiCliente: mockPagamenti,
}))

import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { GET } from '../../src/app/api/portale/[token]/situazione/route'

const ctx = { params: Promise.resolve({ token: 'tok-1' }) }
function req(cookie?: string): Request {
  return new Request('http://localhost/api/portale/tok-1/situazione', {
    headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest', ...(cookie ? { cookie } : {}) },
  })
}
function cookieValido(): string {
  return `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`
}

let cliente: Record<string, unknown> | null
let auditInserts: Array<Record<string, unknown>>
let auditErrore: { message: string } | null

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  auditErrore = null
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true,
    portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }) }
    }
    // portale_accessi
    return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: auditErrore } } }
  })
  mockContabilita.mockResolvedValue({
    dovuti: [
      // campi vietati presenti apposta: la route DEVE lasciarli cadere
      { id: 'fat-id-1', origine: 'fattura', numero: '2026-0002', data: '2026-05-01', totale: 632, residuo: 500, pagata: false, giorni_ritardo: 43, stato_sdi: 'smtp_inviata' },
      { id: 'lav-id-1', origine: 'lavoro_diretto', numero: '2026/0015', data: '2026-06-20', totale: 180, residuo: 180, pagata: false, giorni_ritardo: 2, stato_sdi: null },
      { id: 'fat-id-2', origine: 'fattura', numero: '2026-0001', data: '2026-02-10', totale: 132, residuo: 0, pagata: true, giorni_ritardo: 120, stato_sdi: 'accettata' },
    ],
    lavoriInAttesa: [
      { id: 'lav-id-9', numero_lavoro: '2026/0031', prezzo_unitario: 322, data_consegna_prevista: '2026-07-01', proposta_dentista: null, proposta_at: null },
    ],
    creditoCliente: { confermato: 680, potenziale: 322, disponibile: 45, totale: 1002 },
  })
  mockPagamenti.mockResolvedValue([
    { data: '2026-06-01', importo: 132, metodo: 'bonifico', destinazione: { tipo: 'fattura', numero: '2026-0001' } },
  ])
})

describe('GET /api/portale/[token]/situazione', () => {
  it('risposta felice: saldo passthrough, dovuti minimizzati, pagamenti, audit view_situazione con IP', async () => {
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.studio).toBe('Studio Bianchi')
    expect(json.saldo).toEqual({ confermato: 680, potenziale: 322, disponibile: 45, totale: 1002 })
    expect(json.dovuti).toEqual([
      { origine: 'fattura', numero: '2026-0002', data: '2026-05-01', totale: 632, residuo: 500, pagata: false, giorni_ritardo: 43 },
      { origine: 'lavoro_diretto', numero: '2026/0015', data: '2026-06-20', totale: 180, residuo: 180, pagata: false, giorni_ritardo: 2 },
      { origine: 'fattura', numero: '2026-0001', data: '2026-02-10', totale: 132, residuo: 0, pagata: true, giorni_ritardo: 120 },
    ])
    expect(json.pagamenti).toEqual([
      { data: '2026-06-01', importo: 132, metodo: 'bonifico', destinazione: { tipo: 'fattura', numero: '2026-0001' } },
    ])
    expect(mockContabilita).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'cli-1')
    expect(mockPagamenti).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'cli-1')
    expect(auditInserts.some((a) => a.azione === 'view_situazione' && a.ip_address === '1.2.3.4')).toBe(true)
  })

  it('content-check: i campi vietati non compaiono MAI nel payload', async () => {
    const res = await GET(req(cookieValido()), ctx)
    const raw = JSON.stringify(await res.json())
    expect(raw).not.toContain('metodo_nota')
    expect(raw).not.toContain('stato_sdi')
    expect(raw).not.toContain('fat-id-1')
    expect(raw).not.toContain('lav-id-1')
    expect(raw).not.toContain('lavoriInAttesa') // il dettaglio in attesa NON è esposto: solo il numero potenziale
  })

  it('lettura contabilità fallita → 500 senza leak', async () => {
    mockContabilita.mockRejectedValue(new Error('boom-postgres'))
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom-postgres')
  })

  it('lettura pagamenti fallita → 500 senza leak (fail-closed della lib)', async () => {
    mockPagamenti.mockRejectedValue(new Error('boom-pagamenti'))
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom-pagamenti')
  })

  it('audit fallito → 500 (fail-loud, evento economico)', async () => {
    auditErrore = { message: 'insert ko' }
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
  })

  it('guardie: senza sessione → 401; interruttore OFF → 403; token invalido → 401 uniforme', async () => {
    expect((await GET(req(), ctx)).status).toBe(401)
    cliente!.portale_fatturazione_attiva = false
    expect((await GET(req(cookieValido()), ctx)).status).toBe(403)
    cliente = null
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(401)
    expect((await res.json()).errore).toBe('non_autorizzato')
  })
})
```

- [ ] **Step 3: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/portale-situazione-get-route.test.ts`
Expected: FAIL — modulo route inesistente.

- [ ] **Step 4: Implementa la route**

```typescript
// src/app/api/portale/[token]/situazione/route.ts
// Spec Ondata 3 — situazione economica dietro PIN (D-O3-1: estratto conto
// completo, stessi numeri dello scadenzario lab via getContabilitaCliente).
// DTO ad allowlist: mai id interni, mai stato_sdi, mai metodo_nota.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { guardieEconomiche } from '@/lib/portale/guardie'
import { logPortaleAudit } from '@/lib/portale/audit'
import { getContabilitaCliente, getPagamentiCliente } from '@/lib/contabilita/queries'

type RouteContext = { params: Promise<{ token: string }> }

export type DovutoPortale = {
  origine: 'fattura' | 'lavoro_diretto'
  numero: string
  data: string
  totale: number
  residuo: number
  pagata: boolean
  giorni_ritardo: number
}
export type SituazionePortaleResponse = {
  studio: string | null
  saldo: { confermato: number; potenziale: number; disponibile: number; totale: number }
  dovuti: DovutoPortale[]
  pagamenti: Array<{
    data: string
    importo: number
    metodo: string
    destinazione: { tipo: 'fattura' | 'lavoro'; numero: string }
  }>
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { token } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    const [contabilita, pagamenti] = await Promise.all([
      getContabilitaCliente(svc, cliente.laboratorio_id, cliente.id),
      getPagamentiCliente(svc, cliente.laboratorio_id, cliente.id),
    ])

    // Allowlist esplicita: da DovutoEstratto cadono id e stato_sdi.
    const dovuti: DovutoPortale[] = contabilita.dovuti.map((d) => ({
      origine: d.origine,
      numero: d.numero,
      data: d.data,
      totale: d.totale,
      residuo: d.residuo,
      pagata: d.pagata,
      giorni_ritardo: d.giorni_ritardo,
    }))

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'view_situazione', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const risposta: SituazionePortaleResponse = {
      studio: cliente.studio_nome,
      saldo: contabilita.creditoCliente,
      dovuti,
      pagamenti,
    }
    return NextResponse.json(risposta)
  } catch (err) {
    console.error('[portale situazione] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/portale-situazione-get-route.test.ts`
Expected: 6 PASS.

- [ ] **Step 6: Verifica TypeScript, suite portale, e committa**

```bash
npx tsc --noEmit
npx vitest run tests/unit/ -t portale   # nessuna regressione sulle route portale
git add src/lib/portale/audit.ts src/app/api/portale/[token]/situazione/route.ts tests/unit/portale-situazione-get-route.test.ts
git commit -m "feat(portale): GET /situazione — saldo, dovuti e pagamenti dietro PIN (Ondata 3)"
```

---

### Task 4: UI — `SituazioneEconomicaSection`

**PREREQUISITO:** Task 1 approvato (gate 0B). Il codice sotto è la struttura di riferimento — la resa visiva finale DEVE essere fedele al mockup approvato: se Francesco ha chiesto modifiche al mockup, recepirle qui.

**Files:**
- Create: `src/components/features/portale/SituazioneEconomicaSection.tsx`
- Test: `tests/unit/SituazioneEconomicaSection.test.tsx`

**Interfaces:**
- Consumes: `GET /api/portale/${token}/situazione` (shape `SituazionePortaleResponse` di Task 3, ridefinita localmente come type — pattern di `FattureStoricoSection` che non importa dal modulo route).
- Produces: `export function SituazioneEconomicaSection({ token }: { token: string })` — montata da Task 5.

- [ ] **Step 1: Scrivi i failing test**

```tsx
// tests/unit/SituazioneEconomicaSection.test.tsx
// Ondata 3 — sezione situazione economica del portale (montata in fase lista,
// sessione già validata dal padre). Testa: card saldo (credito solo se > 0),
// blocchi collassabili, stati errore/vuoto.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SituazioneEconomicaSection } from '@/components/features/portale/SituazioneEconomicaSection'

const datiBase = {
  studio: 'Studio Bianchi',
  saldo: { confermato: 680, potenziale: 322, disponibile: 0, totale: 1002 },
  dovuti: [
    { origine: 'fattura', numero: '2026-0002', data: '2026-05-01', totale: 632, residuo: 500, pagata: false, giorni_ritardo: 43 },
    { origine: 'lavoro_diretto', numero: '2026/0015', data: '2026-06-20', totale: 180, residuo: 180, pagata: false, giorni_ritardo: 0 },
    { origine: 'fattura', numero: '2026-0001', data: '2026-02-10', totale: 132, residuo: 0, pagata: true, giorni_ritardo: 120 },
  ],
  pagamenti: [
    { data: '2026-06-01', importo: 132, metodo: 'bonifico', destinazione: { tipo: 'fattura', numero: '2026-0001' } },
    { data: '2025-11-20', importo: 90, metodo: 'contanti', destinazione: { tipo: 'lavoro', numero: '2025/0102' } },
  ],
}

function stubFetch(payload: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => payload })))
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

describe('SituazioneEconomicaSection', () => {
  it('card saldo: mostra confermato, potenziale e totale; credito NASCOSTO se 0', async () => {
    stubFetch(datiBase)
    render(<SituazioneEconomicaSection token="tok-1" />)
    expect(await screen.findByText('Situazione economica')).toBeDefined()
    expect(screen.getByText('Da saldare')).toBeDefined()
    expect(screen.getByText('In attesa di tua decisione')).toBeDefined()
    expect(screen.getByText('Totale')).toBeDefined()
    expect(screen.queryByText('Tuo credito')).toBeNull()
  })

  it('card saldo: credito VISIBILE se > 0', async () => {
    stubFetch({ ...datiBase, saldo: { ...datiBase.saldo, disponibile: 45, totale: 957 } })
    render(<SituazioneEconomicaSection token="tok-1" />)
    expect(await screen.findByText('Tuo credito')).toBeDefined()
  })

  it('potenziale a 0 → riga "In attesa" nascosta', async () => {
    stubFetch({ ...datiBase, saldo: { ...datiBase.saldo, potenziale: 0, totale: 680 } })
    render(<SituazioneEconomicaSection token="tok-1" />)
    await screen.findByText('Situazione economica')
    expect(screen.queryByText('In attesa di tua decisione')).toBeNull()
  })

  it('blocco dovuti collassato di default, si espande al tap: righe con ritardo e saldata quieta', async () => {
    stubFetch(datiBase)
    render(<SituazioneEconomicaSection token="tok-1" />)
    await screen.findByText('Situazione economica')
    expect(screen.queryByText('Fattura 2026-0002')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /dettaglio dovuti/i }))
    expect(screen.getByText('Fattura 2026-0002')).toBeDefined()
    expect(screen.getByText(/in ritardo di 43/)).toBeDefined()
    expect(screen.getByText('Lavoro 2026/0015')).toBeDefined()
    expect(screen.getByText('Saldata')).toBeDefined()
  })

  it('blocco pagamenti si espande: righe con metodo e destinazione, gruppi per anno', async () => {
    stubFetch(datiBase)
    render(<SituazioneEconomicaSection token="tok-1" />)
    await screen.findByText('Situazione economica')
    await userEvent.click(screen.getByRole('button', { name: /pagamenti registrati/i }))
    expect(screen.getByText('Bonifico')).toBeDefined()
    expect(screen.getByText(/per Fattura 2026-0001/)).toBeDefined()
    expect(screen.getByText(/per Lavoro 2025\/0102/)).toBeDefined()
    expect(screen.getByText('2026')).toBeDefined()
    expect(screen.getByText('2025')).toBeDefined()
  })

  it('nessun movimento → stato vuoto', async () => {
    stubFetch({ studio: null, saldo: { confermato: 0, potenziale: 0, disponibile: 0, totale: 0 }, dovuti: [], pagamenti: [] })
    render(<SituazioneEconomicaSection token="tok-1" />)
    expect(await screen.findByText('Nessun movimento economico registrato.')).toBeDefined()
  })

  it('fetch fallita → avviso errore, mai crash', async () => {
    stubFetch({}, false)
    render(<SituazioneEconomicaSection token="tok-1" />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined())
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npx vitest run tests/unit/SituazioneEconomicaSection.test.tsx`
Expected: FAIL — componente inesistente.

- [ ] **Step 3: Implementa il componente**

Struttura di riferimento (stile portale: CSS inline esadecimale, DM Sans — adeguare i dettagli visivi al mockup approvato in Task 1):

```tsx
'use client'
// Situazione economica del portale (spec Ondata 3) — fedele al mockup approvato:
// docs/design/mockups/2026-07-11-portale-situazione-economica.html
// (decisione: docs/design/decisions/2026-07-11-portale-situazione-economica.md)
// Montato da FatturazioneSection SOLO in fase 'lista' (sessione economica già
// validata): il PIN gate vive nel padre. Stile: pattern FattureStoricoSection.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

type Dovuto = {
  origine: 'fattura' | 'lavoro_diretto'
  numero: string
  data: string
  totale: number
  residuo: number
  pagata: boolean
  giorni_ritardo: number
}
type Pagamento = {
  data: string
  importo: number
  metodo: string
  destinazione: { tipo: 'fattura' | 'lavoro'; numero: string }
}
type Dati = {
  studio: string | null
  saldo: { confermato: number; potenziale: number; disponibile: number; totale: number }
  dovuti: Dovuto[]
  pagamenti: Pagamento[]
}

type Stato =
  | { fase: 'caricamento' }
  | { fase: 'errore' }
  | { fase: 'dati'; dati: Dati }

const currencyFmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const dataFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const metodoLabels: Record<string, string> = {
  contanti: 'Contanti',
  bonifico: 'Bonifico',
  pos: 'POS',
  assegno: 'Assegno',
}

const FONT = 'DM Sans, sans-serif'
const CARD: CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '16px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
}

function etichettaDovuto(d: Dovuto): string {
  return d.origine === 'fattura' ? `Fattura ${d.numero}` : `Lavoro ${d.numero}`
}

function BloccoCollassabile({ titolo, children }: { titolo: string; children: ReactNode }) {
  const [aperto, setAperto] = useState(false)
  return (
    <div style={{ ...CARD, margin: '0 16px 12px', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        aria-expanded={aperto}
        style={{
          width: '100%', minHeight: '48px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: FONT, fontSize: '14.5px', fontWeight: 700, color: '#111827',
        }}
      >
        {titolo}
        <span aria-hidden="true" style={{ color: '#9CA3AF', transform: aperto ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {aperto && <div style={{ borderTop: '1px solid #F3F4F6' }}>{children}</div>}
    </div>
  )
}

export function SituazioneEconomicaSection({ token }: { token: string }) {
  const [stato, setStato] = useState<Stato>({ fase: 'caricamento' })

  useEffect(() => {
    let attivo = true
    async function carica() {
      try {
        const res = await fetch(`/api/portale/${token}/situazione`, { credentials: 'same-origin' })
        if (!attivo) return
        if (!res.ok) {
          setStato({ fase: 'errore' })
          return
        }
        const dati = (await res.json()) as Dati
        if (attivo) setStato({ fase: 'dati', dati })
      } catch {
        if (attivo) setStato({ fase: 'errore' })
      }
    }
    carica()
    return () => { attivo = false }
  }, [token])

  if (stato.fase === 'caricamento') return null

  if (stato.fase === 'errore') {
    return (
      <div className="ua-fatt-no-print">
        <div style={{ height: '1px', background: '#E5E7EB', margin: '16px 20px 24px' }} />
        <div style={{ padding: '0 20px 20px' }}>
          <div role="alert" style={{
            background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px',
            padding: '10px 14px', fontFamily: FONT, fontSize: '12.5px', fontWeight: 600, color: '#92400E',
          }}>
            Impossibile caricare la situazione economica. Ricarica la pagina.
          </div>
        </div>
      </div>
    )
  }

  const { dati } = stato
  const vuoto = dati.dovuti.length === 0 && dati.pagamenti.length === 0 && dati.saldo.totale === 0

  const anniPagamenti = new Map<number, Pagamento[]>()
  for (const p of dati.pagamenti) {
    const anno = Number((p.data ?? '').slice(0, 4)) || 0
    const gruppo = anniPagamenti.get(anno) ?? []
    gruppo.push(p)
    anniPagamenti.set(anno, gruppo)
  }
  const gruppiPagamenti = [...anniPagamenti.entries()].sort(([a], [b]) => b - a)

  return (
    <div className="ua-fatt-no-print">
      <div style={{ height: '1px', background: '#E5E7EB', margin: '16px 20px 24px' }} />

      <div style={{ padding: '4px 20px 16px' }}>
        <h2 style={{ fontFamily: FONT, fontSize: '19px', fontWeight: 700, color: '#111827', margin: 0 }}>
          Situazione economica
        </h2>
      </div>

      {vuoto ? (
        <div style={{ padding: '0 20px 4px' }}>
          <div style={{ ...CARD, padding: '44px 24px', textAlign: 'center' }}>
            <div aria-hidden="true" style={{
              width: '56px', height: '56px', borderRadius: '50%', background: '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '24px',
            }}>
              ⚖️
            </div>
            <div style={{ fontFamily: FONT, fontSize: '14.5px', fontWeight: 600, color: '#6B7280' }}>
              Nessun movimento economico registrato.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ paddingBottom: '4px' }}>
          {/* Card saldo */}
          <div style={{ ...CARD, margin: '0 16px 16px', padding: '16px' }}>
            <RigaSaldo etichetta="Da saldare" valore={dati.saldo.confermato} />
            {dati.saldo.potenziale > 0 && (
              <RigaSaldo
                etichetta="In attesa di tua decisione"
                valore={dati.saldo.potenziale}
                nota="I lavori nella sezione «Da fatturare» qui sopra"
              />
            )}
            {dati.saldo.disponibile > 0 && (
              <RigaSaldo etichetta="Tuo credito" valore={dati.saldo.disponibile} colore="#15803D" />
            )}
            <div style={{ height: '1px', background: '#F3F4F6', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: FONT, fontSize: '14.5px', fontWeight: 700, color: '#111827' }}>Totale</span>
              <span style={{ fontFamily: FONT, fontSize: '19px', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>
                {currencyFmt.format(dati.saldo.totale)}
              </span>
            </div>
          </div>

          {/* Dettaglio dovuti */}
          {dati.dovuti.length > 0 && (
            <BloccoCollassabile titolo="Dettaglio dovuti">
              {dati.dovuti.map((d, i) => (
                <div key={`${d.origine}-${d.numero}-${i}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  padding: '12px 16px', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: FONT, fontSize: '14px', fontWeight: 700,
                      color: d.pagata ? '#9CA3AF' : '#111827', marginBottom: '2px',
                    }}>
                      {etichettaDovuto(d)}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: '12px', color: '#9CA3AF' }}>
                      {d.data ? dataFmt.format(new Date(`${d.data}T00:00:00`)) : '—'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {d.pagata ? (
                      <span style={{ fontFamily: FONT, fontSize: '12.5px', fontWeight: 700, color: '#9CA3AF' }}>Saldata</span>
                    ) : (
                      <>
                        <div style={{ fontFamily: FONT, fontSize: '15px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                          {currencyFmt.format(d.residuo)}
                        </div>
                        {d.giorni_ritardo > 0 && (
                          <span style={{
                            fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: '#B45309',
                            background: '#FEF3C7', borderRadius: '6px', padding: '2px 7px', whiteSpace: 'nowrap',
                          }}>
                            in ritardo di {d.giorni_ritardo} gg
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </BloccoCollassabile>
          )}

          {/* Pagamenti registrati */}
          {dati.pagamenti.length > 0 && (
            <BloccoCollassabile titolo="Pagamenti registrati">
              {gruppiPagamenti.map(([anno, pagamenti]) => (
                <div key={anno}>
                  <div style={{
                    fontFamily: FONT, fontSize: '11.5px', fontWeight: 700, color: '#9CA3AF',
                    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 16px 4px',
                  }}>
                    {anno}
                  </div>
                  {pagamenti.map((p, i) => (
                    <div key={`${p.data}-${i}`} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                      padding: '10px 16px', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: FONT, fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                          {metodoLabels[p.metodo] ?? p.metodo}
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: '12px', color: '#9CA3AF' }}>
                          {p.data ? dataFmt.format(new Date(`${p.data}T00:00:00`)) : '—'}
                          {' · per '}
                          {p.destinazione.tipo === 'fattura' ? `Fattura ${p.destinazione.numero}` : `Lavoro ${p.destinazione.numero}`}
                        </div>
                      </div>
                      <div style={{
                        flexShrink: 0, fontFamily: FONT, fontSize: '15px', fontWeight: 700,
                        color: '#111827', whiteSpace: 'nowrap',
                      }}>
                        {currencyFmt.format(p.importo)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </BloccoCollassabile>
          )}
        </div>
      )}
    </div>
  )
}

function RigaSaldo({ etichetta, valore, nota, colore }: {
  etichetta: string
  valore: number
  nota?: string
  colore?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '10px' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13.5px', fontWeight: 600, color: colore ?? '#4B5563' }}>
          {etichetta}
        </div>
        {nota && (
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11.5px', color: '#9CA3AF', marginTop: '1px' }}>
            {nota}
          </div>
        )}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: '16px', fontWeight: 700,
        color: colore ?? '#111827', whiteSpace: 'nowrap',
      }}>
        {currencyFmt.format(valore)}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `npx vitest run tests/unit/SituazioneEconomicaSection.test.tsx`
Expected: 7 PASS.

- [ ] **Step 5: Verifica TypeScript e committa**

```bash
npx tsc --noEmit
git add src/components/features/portale/SituazioneEconomicaSection.tsx tests/unit/SituazioneEconomicaSection.test.tsx
git commit -m "feat(portale): SituazioneEconomicaSection — saldo, dovuti e pagamenti (Ondata 3)"
```

---

### Task 5: Montaggio in `FatturazioneSection` + verifica finale

**Files:**
- Modify: `src/components/features/portale/FatturazioneSection.tsx` (~riga 17 import, ~riga 847 montaggio)

**Interfaces:**
- Consumes: `SituazioneEconomicaSection` (Task 4).
- Produces: la sezione visibile nella fase lista del portale, sotto lo storico fatture.

- [ ] **Step 1: Monta la sezione**

In `src/components/features/portale/FatturazioneSection.tsx`, accanto all'import esistente:
```tsx
import { FattureStoricoSection } from './FattureStoricoSection'
import { SituazioneEconomicaSection } from './SituazioneEconomicaSection'
```
e nel render della fase lista, subito dopo il montaggio esistente (oggi ~riga 847):
```tsx
          <FattureStoricoSection token={token} />
          <SituazioneEconomicaSection token={token} />
```

- [ ] **Step 2: Verifica finale completa (FASE 7)**

```bash
npx tsc --noEmit          # 0 errori
npx vitest run            # baseline 1274 + i nuovi test, 0 regressioni, 4 skipped invariati
npx next build            # build pulita
```
Expected: tutti e tre puliti, con output reale riportato nel report del task.

- [ ] **Step 3: Committa**

```bash
git add src/components/features/portale/FatturazioneSection.tsx
git commit -m "feat(portale): monta SituazioneEconomicaSection nella fase lista (Ondata 3)"
```

---

### Task 6: QA browser E2E + cleanup a baseline

**Files:** nessuno (QA + eventuale fix emerso).

**Interfaces:**
- Consumes: tutto quanto sopra, dev server del worktree.

- [ ] **Step 1: Prepara ambiente QA**

- Lab E2E `00000000-0000-0000-0000-000000000001`, MAI lab Filippo.
- Dev server nel worktree: `PORT=3013 npm run dev`.
- Env `PORTALE_PIN_PEPPER`/`PORTALE_SESSION_SECRET` aggiunte TEMPORANEAMENTE a `.env.local` del worktree (valori dev, non quelli prod) — rimuoverle a fine QA.
- Snapshot baseline dei conteggi su DB (fatture, lavori, pagamenti, credito_clienti_movimenti, portale_accessi del lab E2E) per il cleanup finale.

- [ ] **Step 2: Semina lo scenario (via API lab autenticate o query dirette)**

Sul cliente E2E con portale attivo e PIN impostato:
1. un lavoro consegnato `decisione_fatturazione='fatturare'` incluso in una fattura emessa NON saldata (via batch, come QA Ondata 2);
2. un lavoro consegnato `decisione_fatturazione='non_fatturare'` con prezzo > 0 non saldato (dovuto diretto);
3. un lavoro consegnato `in_attesa` (potenziale);
4. un pagamento parziale registrato sulla fattura via `POST /api/pagamenti` (metodo `bonifico`);
5. un pagamento su lavoro diretto (metodo `contanti`) che lo salda con eccedenza → genera credito disponibile.

- [ ] **Step 3: Verifiche nel portale (browser, 390px)**

- PIN sblocca → in fondo alla fase lista compare «Situazione economica».
- Card saldo: «Da saldare» = residuo fattura + residuo lavori non saldati; «In attesa di tua decisione» = prezzo del lavoro in_attesa; «Tuo credito» visibile col valore dell'eccedenza; Totale = confermato + potenziale.
- **Cross-check di coerenza:** stessi numeri della vista lab `/scadenzario/[cliente_id]` (stessa funzione — verificare dal vivo).
- Dettaglio dovuti: fattura con residuo e badge ritardo se applicabile; lavoro diretto presente; niente id/stati SDI visibili.
- Pagamenti registrati: 2 righe con metodo e destinazione; MAI la nota interna.
- Audit: righe `view_situazione` in `portale_accessi` con IP/UA.
- Guardie: senza sessione → sezione non carica (401); interruttore OFF → 403 e sezione sparita.
- Viewport: 390px light (portale è light-only per il dentista — confermare col mockup approvato), tablet 768px, desktop 1280px.

- [ ] **Step 4: Cleanup a baseline ESATTO**

Rimuovere in ordine: pagamenti → credito_clienti_movimenti → fatture/righe/progressivi fiscali creati → reset flag lavori (`incluso_in_fattura`, `decisione_fatturazione`, proposta) o delete dei lavori seminati → righe `portale_accessi` di QA. Verificare i conteggi contro lo snapshot dello Step 1 (0 residui). Rimuovere le env temporanee da `.env.local`.

- [ ] **Step 5: Report QA**

Documentare nel ledger: scenario, screenshot, esiti, eventuali bug emersi (fix in-ondata con TDD se bloccanti, backlog se minor).

---

## Dopo il piano (gestiti dalla sessione orchestratrice, non task del piano)

- FASE 8: review per task (SDD) + review finale whole-branch.
- FASE 10: merge fast-forward su `main` → push → CI verde → CD Vercel → smoke prod.
- FASE 11 (BP-1): aggiorna `memory/MEMORY.md` + `docs/roadmap/ROADMAP-UFFICIALE.md` + `memory/SESSION_ACTIVE.md`; ledger preservato in `.superpowers/sdd/progress-ondata-3-situazione-economica.md`.
