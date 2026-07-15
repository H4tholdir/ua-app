# N10+N9 — Invio a SdI dell'XML congelato (PEC) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Endpoint dedicato `POST /api/fatture/[id]/invia-pec` + bottone «Invia a SdI» in `/fatture/[id]` per inviare via PEC l'XML già congelato di una fattura `stato_sdi='generata'` (TD01 e TD04), con claim anti-doppio-invio e hardening del ramo legacy `invia_pec` della route `/xml`.

**Architecture:** Riuso puro di `sendFatturaPEC` (logica invariata). Helper condiviso `src/lib/fattura/invio-claim.ts` (ruoli + claim/release atomici su `smtp_inviata_at`). Route nuova col pattern di `nota-credito/route.ts`. UI: client component `InviaPecButton` nella card «Invio SDI» + riga di stato SDI granulare.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase service client, Vitest + jsdom, nodemailer (esistente).

**Spec:** `docs/superpowers/specs/2026-07-15-n10-n9-invio-pec-sdi-design.md` (rev.2, panel advisor recepito)

## Global Constraints

- **Nessuna migration, nessun `gen types`** (FASE 6b non scatta). Solo codice.
- **Stati ammessi all'invio: SOLO `stato_sdi === 'generata'`** (D-2). Gate allowlist, 409 altrimenti.
- **Ruoli ammessi all'invio: SOLO `['titolare', 'front_desk']`** (D-3) — vale per la route nuova E per il ramo `invia_pec:true` di `/xml`. La sola generazione XML resta senza gate ruolo.
- **`send-pec.ts`: logica INVARIATA** — ammessi solo commento-contratto + test (spec §3.2b).
- **Gate N7 (`xml/route.ts:80-85`) INTATTO.**
- Claim: `UPDATE fatture SET smtp_inviata_at=now() WHERE id=? AND laboratorio_id=? AND stato_sdi='generata' AND smtp_inviata_at IS NULL` — `error` Postgres → 500, 0 righe → 409. Release nel catch con stesse condizioni (`stato_sdi='generata'`).
- Messaggi esatti (spec §3.1): 409 draft TD04 «Nota di credito incompleta — riapri l'emissione dalla fattura originale per completarla» · 409 draft altri «XML non ancora generato — genera prima la fattura» · 409 inviate «Fattura già inviata a SdI» · 409 rifiutata/scaduta «Stato non re-inviabile — richiede intervento dedicato» · 409 claim «Invio già in corso o già effettuato» · 422 PEC «PEC non configurata — configurala nelle Impostazioni» · 502 «Invio PEC fallito — riprova o verifica la configurazione PEC».
- **Dettaglio errori grezzi (host SMTP, Vault, Postgres) SOLO nei log server, MAI nel body.**
- UI: **gate §0B** — mockup approvato da Francesco PRIMA del React (Task 4 = STOP obbligatorio). Gate estetico L2 a fine ondata.
- QA: lab E2E `00000000-0000-0000-0000-000000000001`, MAI lab Filippo, **nessuna PEC reale**.
- FASE 7 (tsc + vitest + build, output reale) prima del merge. **Merge/push = gate esplicito di Francesco.**

---

## File Structure

**Nuovi**
- `src/lib/fattura/invio-claim.ts` — `RUOLI_INVIO_PEC`, `claimInvioPec()`, `releaseInvioPec()`, `messaggioStatoNonInviabile()`.
- `src/app/api/fatture/[id]/invia-pec/route.ts` — la route nuova.
- `src/components/features/fatture/InviaPecButton.tsx` — bottone + conferma.
- `tests/unit/invio-claim.test.ts` · `tests/unit/fatture-invia-pec-route.test.ts` · `tests/unit/send-pec-invariante.test.ts` · `tests/unit/invia-pec-button.test.tsx`
- `docs/design/mockups/2026-07-15-invia-pec-sdi.html` (+ screenshot) · `docs/design/decisions/2026-07-15-invia-pec-sdi.md`

**Modificati**
- `src/lib/fattura/send-pec.ts` — SOLO commento-contratto (Task 2).
- `src/app/api/fatture/[id]/xml/route.ts` — gate ruolo su ramo `invia_pec` + claim + sanitizzazione `pec_errore` (Task 3).
- `tests/unit/fatture-xml-gate-stato-sdi.test.ts` — casi nuovi ramo `invia_pec` (Task 3).
- `src/app/(app)/fatture/[id]/page.tsx` — select `ruolo`, query `laboratori`, riga stato SDI, mount bottone (Task 5).

---

## Task 1: Helper `invio-claim.ts` + route `POST /api/fatture/[id]/invia-pec` (TDD)

**Files:**
- Create: `src/lib/fattura/invio-claim.ts`
- Create: `src/app/api/fatture/[id]/invia-pec/route.ts`
- Test: `tests/unit/invio-claim.test.ts`, `tests/unit/fatture-invia-pec-route.test.ts`

**Interfaces:**
- Consumes: `sendFatturaPEC(fattura_id: string): Promise<void>` (esistente, `src/lib/fattura/send-pec.ts`); `isSameOrigin`, `getServerUserClient`, `getServiceClient` (pattern `nota-credito/route.ts`).
- Produces (usati dai Task 3 e 5):
  - `RUOLI_INVIO_PEC: readonly string[]` = `['titolare', 'front_desk']`
  - `claimInvioPec(svc, fatturaId: string, labId: string): Promise<{ claimed: boolean; error: string | null }>`
  - `releaseInvioPec(svc, fatturaId: string, labId: string): Promise<void>` (non lancia; logga)
  - `messaggioStatoNonInviabile(statoSdi: string | null, tipoDocumento: string | null): string`
  - Route: `POST /api/fatture/[id]/invia-pec` → 200 `{ fattura: { id, numero, stato_sdi, inviata_at, pec_message_id } }` | 401 | 403 | 404 | 409 | 422 | 500 | 502 `{ error }`

- [ ] **Step 1: Scrivi il test dell'helper (fallisce)**

File `tests/unit/invio-claim.test.ts`:
```typescript
// tests/unit/invio-claim.test.ts
// N10: helper claim anti-doppio-invio + messaggi 409 per stato.
import { describe, it, expect, vi } from 'vitest'
import { claimInvioPec, releaseInvioPec, messaggioStatoNonInviabile, RUOLI_INVIO_PEC } from '@/lib/fattura/invio-claim'

type MockResult = { data: unknown; error: unknown }

function updateChain(result: MockResult, updatePayloads: unknown[]) {
  const c: Record<string, unknown> = {}
  c.update = (payload: unknown) => { updatePayloads.push(payload); return c }
  for (const m of ['eq', 'is']) c[m] = () => c
  c.select = async () => result
  ;(c as { then: unknown }).then = (resolve: (v: MockResult) => void) => resolve(result)
  return c
}

function svcWith(result: MockResult, updatePayloads: unknown[] = []) {
  return { from: () => updateChain(result, updatePayloads) } as never
}

describe('claimInvioPec', () => {
  it('1 riga aggiornata → claimed true', async () => {
    const res = await claimInvioPec(svcWith({ data: [{ id: 'f1' }], error: null }), 'f1', 'lab-1')
    expect(res).toEqual({ claimed: true, error: null })
  })
  it('0 righe → claimed false, nessun errore', async () => {
    const res = await claimInvioPec(svcWith({ data: [], error: null }), 'f1', 'lab-1')
    expect(res).toEqual({ claimed: false, error: null })
  })
  it('errore Postgres → claimed false + error valorizzato', async () => {
    const res = await claimInvioPec(svcWith({ data: null, error: { message: 'boom' } }), 'f1', 'lab-1')
    expect(res.claimed).toBe(false)
    expect(res.error).toBe('boom')
  })
  it('il claim scrive smtp_inviata_at (timestamp ISO)', async () => {
    const payloads: Array<Record<string, unknown>> = []
    await claimInvioPec(svcWith({ data: [{ id: 'f1' }], error: null }, payloads), 'f1', 'lab-1')
    expect(typeof payloads[0].smtp_inviata_at).toBe('string')
  })
})

describe('releaseInvioPec', () => {
  it('azzera smtp_inviata_at e non lancia neanche su errore', async () => {
    const payloads: Array<Record<string, unknown>> = []
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(releaseInvioPec(svcWith({ data: null, error: { message: 'rete' } }, payloads), 'f1', 'lab-1')).resolves.toBeUndefined()
    expect(payloads[0]).toEqual({ smtp_inviata_at: null })
    errSpy.mockRestore()
  })
})

describe('messaggioStatoNonInviabile', () => {
  it('draft TD04 → messaggio resume nota di credito', () => {
    expect(messaggioStatoNonInviabile('draft', 'TD04')).toBe(
      "Nota di credito incompleta — riapri l'emissione dalla fattura originale per completarla"
    )
  })
  it('draft TD01 → genera prima la fattura', () => {
    expect(messaggioStatoNonInviabile('draft', 'TD01')).toBe('XML non ancora generato — genera prima la fattura')
  })
  it('smtp_inviata/pec_consegnata/ricevuta_sdi/accettata → già inviata', () => {
    for (const s of ['smtp_inviata', 'pec_consegnata', 'ricevuta_sdi', 'accettata']) {
      expect(messaggioStatoNonInviabile(s, 'TD01')).toBe('Fattura già inviata a SdI')
    }
  })
  it('rifiutata/scaduta → non re-inviabile', () => {
    for (const s of ['rifiutata', 'scaduta']) {
      expect(messaggioStatoNonInviabile(s, 'TD01')).toBe('Stato non re-inviabile — richiede intervento dedicato')
    }
  })
})

describe('RUOLI_INVIO_PEC', () => {
  it('esattamente titolare e front_desk', () => {
    expect([...RUOLI_INVIO_PEC]).toEqual(['titolare', 'front_desk'])
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/invio-claim.test.ts`
Expected: FAIL — modulo `@/lib/fattura/invio-claim` non trovato.

- [ ] **Step 3: Implementa l'helper**

File `src/lib/fattura/invio-claim.ts`:
```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// N10 — claim anti-doppio-invio PEC (spec 2026-07-15 §3.1 step 7/9).
// Repurposing di smtp_inviata_at come lock: ogni fattura 'generata' lo ha NULL
// per costruzione (unico writer: send-pec.ts, atomico con stato_sdi='smtp_inviata').
// ⚠️ Claim orfano su crash: si sblocca SOLO dopo verifica nella cartella «inviata»
// della casella PEC (pec_message_id NULL NON è prova di non-invio) con:
//   UPDATE fatture SET smtp_inviata_at = NULL WHERE id = '…' AND stato_sdi = 'generata';

export const RUOLI_INVIO_PEC = ['titolare', 'front_desk'] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Svc = SupabaseClient<any, any, any>

export async function claimInvioPec(
  svc: Svc,
  fatturaId: string,
  labId: string
): Promise<{ claimed: boolean; error: string | null }> {
  const { data, error } = await svc
    .from('fatture')
    .update({ smtp_inviata_at: new Date().toISOString() })
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .eq('stato_sdi', 'generata')
    .is('smtp_inviata_at', null)
    .select('id')
  if (error) return { claimed: false, error: error.message }
  return { claimed: (data ?? []).length > 0, error: null }
}

export async function releaseInvioPec(svc: Svc, fatturaId: string, labId: string): Promise<void> {
  const { error } = await svc
    .from('fatture')
    .update({ smtp_inviata_at: null })
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .eq('stato_sdi', 'generata')
  if (error) {
    console.error(`[INVIA-PEC] rilascio claim fallito per fattura ${fatturaId}:`, error.message)
  }
}

export function messaggioStatoNonInviabile(
  statoSdi: string | null,
  tipoDocumento: string | null
): string {
  if (statoSdi === 'draft') {
    return tipoDocumento === 'TD04'
      ? "Nota di credito incompleta — riapri l'emissione dalla fattura originale per completarla"
      : 'XML non ancora generato — genera prima la fattura'
  }
  if (statoSdi === 'rifiutata' || statoSdi === 'scaduta') {
    return 'Stato non re-inviabile — richiede intervento dedicato'
  }
  return 'Fattura già inviata a SdI'
}
```

Run: `npx vitest run tests/unit/invio-claim.test.ts` → Expected: PASS.

- [ ] **Step 4: Scrivi il test della route (fallisce)**

File `tests/unit/fatture-invia-pec-route.test.ts`:
```typescript
// tests/unit/fatture-invia-pec-route.test.ts
// N10: POST /api/fatture/[id]/invia-pec — invio dell'XML congelato.
// Mock chain esteso rispetto a nota-credito-route.test.ts: la route fa fino a
// 4 chiamate sequenziate su from('fatture') (select, claim update, release
// update, re-fetch select) → coda di chain consumata in ordine.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockSendFatturaPEC } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockSendFatturaPEC: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/fattura/send-pec', () => ({ sendFatturaPEC: mockSendFatturaPEC }))

import { POST } from '../../src/app/api/fatture/[id]/invia-pec/route'

type MockResult = { data: unknown; error: unknown }
const updatePayloads: Array<Record<string, unknown>> = []

function selectChain(result: MockResult) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is']) c[m] = () => c
  c.single = async () => result
  return c
}
function updateChain(result: MockResult) {
  const c: Record<string, unknown> = {}
  c.update = (payload: Record<string, unknown>) => { updatePayloads.push(payload); return c }
  for (const m of ['eq', 'is']) c[m] = () => c
  c.select = async () => result
  ;(c as { then: unknown }).then = (resolve: (v: MockResult) => void) => resolve(result)
  return c
}

// Coda di chain per from('fatture'), consumata in ordine di chiamata.
let fattureQueue: Array<Record<string, unknown>> = []
let utenteRow: Record<string, unknown> | null = null

const FATTURA_OK = {
  id: 'fat-1', numero: '2026-0007', stato_sdi: 'generata',
  xml_storage_path: 'lab-1/2026/IT123_00007.xml', nome_file_xml: 'IT123_00007.xml',
  tipo_documento: 'TD01', laboratorio: { pec_smtp_configurata: true },
}
const AGGIORNATA = {
  id: 'fat-1', numero: '2026-0007', stato_sdi: 'smtp_inviata',
  inviata_at: '2026-07-15T10:00:00Z', pec_message_id: '<msg-1>',
}

function req() {
  return new Request('http://localhost/api/fatture/fat-1/invia-pec', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost' },
  }) as never
}
const ctx = { params: Promise.resolve({ id: 'fat-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  updatePayloads.length = 0
  utenteRow = { laboratorio_id: 'lab-1', ruolo: 'titolare' }
  fattureQueue = []
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockSendFatturaPEC.mockResolvedValue(undefined)
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return selectChain({ data: utenteRow, error: null })
    if (table === 'fatture') {
      const next = fattureQueue.shift()
      if (!next) throw new Error('fattureQueue esaurita')
      return next
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

// Coda standard del percorso felice: select → claim ok → re-fetch.
function happyQueue() {
  fattureQueue = [
    selectChain({ data: FATTURA_OK, error: null }),
    updateChain({ data: [{ id: 'fat-1' }], error: null }),
    selectChain({ data: AGGIORNATA, error: null }),
  ]
}

describe('POST /api/fatture/[id]/invia-pec — guardie', () => {
  it('CSRF: origin diverso → 403, nessuna query fatture', async () => {
    const bad = new Request('http://localhost/api/fatture/fat-1/invia-pec', {
      method: 'POST', headers: { origin: 'http://evil.example', host: 'localhost' },
    }) as never
    const res = await POST(bad, ctx)
    expect(res.status).toBe(403)
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
  })
  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect((await POST(req(), ctx)).status).toBe(401)
  })
  it('utente senza laboratorio → 403', async () => {
    utenteRow = null
    expect((await POST(req(), ctx)).status).toBe(403)
  })
  it('ruolo tecnico → 403, sendFatturaPEC MAI chiamato', async () => {
    utenteRow = { laboratorio_id: 'lab-1', ruolo: 'tecnico' }
    const res = await POST(req(), ctx)
    expect(res.status).toBe(403)
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
  })
  it('ruolo front_desk → ammesso (200)', async () => {
    utenteRow = { laboratorio_id: 'lab-1', ruolo: 'front_desk' }
    happyQueue()
    expect((await POST(req(), ctx)).status).toBe(200)
  })
  it('fattura non trovata / altro lab → 404', async () => {
    fattureQueue = [selectChain({ data: null, error: null })]
    expect((await POST(req(), ctx)).status).toBe(404)
  })
})

describe('POST /api/fatture/[id]/invia-pec — gate stato', () => {
  const casi: Array<[string, string, string]> = [
    ['draft', 'TD01', 'XML non ancora generato — genera prima la fattura'],
    ['draft', 'TD04', "Nota di credito incompleta — riapri l'emissione dalla fattura originale per completarla"],
    ['smtp_inviata', 'TD01', 'Fattura già inviata a SdI'],
    ['rifiutata', 'TD01', 'Stato non re-inviabile — richiede intervento dedicato'],
    ['scaduta', 'TD01', 'Stato non re-inviabile — richiede intervento dedicato'],
  ]
  for (const [stato, tipo, msg] of casi) {
    it(`stato ${stato} (${tipo}) → 409 «${msg}»`, async () => {
      fattureQueue = [selectChain({ data: { ...FATTURA_OK, stato_sdi: stato, tipo_documento: tipo }, error: null })]
      const res = await POST(req(), ctx)
      expect(res.status).toBe(409)
      expect((await res.json()).error).toBe(msg)
      expect(mockSendFatturaPEC).not.toHaveBeenCalled()
    })
  }
  it('xml_storage_path NULL → 422', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_OK, xml_storage_path: null }, error: null })]
    expect((await POST(req(), ctx)).status).toBe(422)
  })
  it('PEC non configurata → 422 pre-claim (nessun update)', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_OK, laboratorio: { pec_smtp_configurata: false } }, error: null })]
    const res = await POST(req(), ctx)
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('PEC non configurata — configurala nelle Impostazioni')
    expect(updatePayloads).toHaveLength(0)
  })
})

describe('POST /api/fatture/[id]/invia-pec — claim e invio', () => {
  it('claim conteso (0 righe) → 409, sendFatturaPEC MAI chiamato', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
      updateChain({ data: [], error: null }),
    ]
    const res = await POST(req(), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Invio già in corso o già effettuato')
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
  })
  it('claim con errore Postgres → 500 (non 409), senza leak', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
      updateChain({ data: null, error: { message: 'deadlock detected' } }),
    ]
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('deadlock')
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
  })
  it('successo → sendFatturaPEC UNA volta, 200 con stato dal re-fetch', async () => {
    happyQueue()
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockSendFatturaPEC).toHaveBeenCalledTimes(1)
    expect(mockSendFatturaPEC).toHaveBeenCalledWith('fat-1')
    expect((await res.json()).fattura).toEqual(AGGIORNATA)
  })
  it('ramo degradato: re-fetch ancora generata → comunque 200 con stato reale', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
      updateChain({ data: [{ id: 'fat-1' }], error: null }),
      selectChain({ data: { ...AGGIORNATA, stato_sdi: 'generata', pec_message_id: null }, error: null }),
    ]
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).fattura.stato_sdi).toBe('generata')
  })
  it('errore invio → 502, claim rilasciato (update a NULL), dettaglio non nel body', async () => {
    mockSendFatturaPEC.mockRejectedValue(new Error('connect ECONNREFUSED smtp.host.interno:465'))
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
      updateChain({ data: [{ id: 'fat-1' }], error: null }),
      updateChain({ data: null, error: null }),
    ]
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(), ctx)
    errSpy.mockRestore()
    expect(res.status).toBe(502)
    const body = JSON.stringify(await res.json())
    expect(body).not.toContain('smtp.host.interno')
    expect(body).toContain('Invio PEC fallito')
    expect(updatePayloads).toEqual([
      expect.objectContaining({ smtp_inviata_at: expect.any(String) }),
      { smtp_inviata_at: null },
    ])
  })
})
```

- [ ] **Step 5: Esegui — deve fallire**

Run: `npx vitest run tests/unit/fatture-invia-pec-route.test.ts`
Expected: FAIL — route non trovata.

- [ ] **Step 6: Implementa la route**

File `src/app/api/fatture/[id]/invia-pec/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { sendFatturaPEC } from '@/lib/fattura/send-pec'
import {
  RUOLI_INVIO_PEC,
  claimInvioPec,
  releaseInvioPec,
  messaggioStatoNonInviabile,
} from '@/lib/fattura/invio-claim'

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── POST /api/fatture/[id]/invia-pec ─────────────────────────────────────────
// Invia a SdI (sdi01@pec.fatturapa.it) l'XML GIÀ CONGELATO di una fattura in
// stato 'generata' — TD01 mai partita/PEC fallita (N9) o TD04 (N10). Nessuna
// rigenerazione XML, nessun progressivo consumato. Spec 2026-07-15 rev.2.
export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (!RUOLI_INVIO_PEC.includes(utente.ruolo as (typeof RUOLI_INVIO_PEC)[number])) {
    return NextResponse.json({ error: "Ruolo non autorizzato all'invio fiscale" }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id
  const { id: fatturaId } = await params

  const { data: fattura } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi, xml_storage_path, nome_file_xml, tipo_documento, laboratorio:laboratori(pec_smtp_configurata)')
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!fattura) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  if (fattura.stato_sdi !== 'generata') {
    return NextResponse.json(
      { error: messaggioStatoNonInviabile(fattura.stato_sdi, fattura.tipo_documento) },
      { status: 409 }
    )
  }

  if (!fattura.xml_storage_path || !fattura.nome_file_xml) {
    return NextResponse.json(
      { error: 'XML congelato mancante — rigenerare la fattura' },
      { status: 422 }
    )
  }

  // Precheck PEC pre-claim (la UI disabilita già il bottone; qui per caller API diretti).
  const lab = Array.isArray(fattura.laboratorio) ? fattura.laboratorio[0] : fattura.laboratorio
  if (lab?.pec_smtp_configurata !== true) {
    return NextResponse.json(
      { error: 'PEC non configurata — configurala nelle Impostazioni' },
      { status: 422 }
    )
  }

  const { claimed, error: claimErr } = await claimInvioPec(svc, fatturaId, labId)
  if (claimErr) {
    console.error('[INVIA-PEC] claim fallito (Postgres):', claimErr)
    return NextResponse.json({ error: "Errore durante l'invio — riprova" }, { status: 500 })
  }
  if (!claimed) {
    return NextResponse.json({ error: 'Invio già in corso o già effettuato' }, { status: 409 })
  }

  // Audit operatore: CHI ha scatenato l'atto fiscale (nessuna migration → log strutturato).
  console.log('[INVIA-PEC] invio', {
    fatturaId,
    numero: fattura.numero,
    labId,
    userId: user.id,
    ruolo: utente.ruolo,
  })

  try {
    await sendFatturaPEC(fatturaId)
  } catch (err) {
    // Dettaglio (host SMTP, Vault, Postgres) SOLO nei log server.
    console.error('[INVIA-PEC] invio fallito:', err)
    await releaseInvioPec(svc, fatturaId, labId)
    return NextResponse.json(
      { error: 'Invio PEC fallito — riprova o verifica la configurazione PEC' },
      { status: 502 }
    )
  }

  // Re-fetch: riflette lo stato REALE anche nel ramo degradato (mail partita ma
  // UPDATE interno di send-pec fallito → resta 'generata'+claim; tap successivo → 409).
  const { data: aggiornata } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi, inviata_at, pec_message_id')
    .eq('id', fatturaId)
    .single()

  return NextResponse.json({ fattura: aggiornata })
}
```

- [ ] **Step 7: Esegui — deve passare + tsc**

Run: `npx vitest run tests/unit/fatture-invia-pec-route.test.ts tests/unit/invio-claim.test.ts` → PASS.
Run: `npx tsc --noEmit` → nessun errore.

- [ ] **Step 8: Commit**

```bash
git add src/lib/fattura/invio-claim.ts "src/app/api/fatture/[id]/invia-pec/route.ts" tests/unit/invio-claim.test.ts tests/unit/fatture-invia-pec-route.test.ts
git commit -m "feat(fattura): POST /api/fatture/[id]/invia-pec — invio XML congelato a SdI (N10+N9)"
```

---

## Task 2: Blindatura invariante `send-pec.ts` (test + commento-contratto)

L'intero meccanismo di release-nel-catch è sicuro SOLO perché `sendFatturaPEC` non lancia mai dopo che `sendMail` è riuscito (l'UPDATE stato fallito viene inghiottito con log, `send-pec.ts:149-153`). Questo task blinda l'invariante. **Logica di `send-pec.ts` INVARIATA.**

**Files:**
- Modify: `src/lib/fattura/send-pec.ts` (SOLO commento)
- Test: `tests/unit/send-pec-invariante.test.ts`

**Interfaces:**
- Consumes: `sendFatturaPEC` (esistente).
- Produces: nulla di nuovo — solo garanzie di regressione.

- [ ] **Step 1: Scrivi il test (deve passare SUBITO — è una rete di regressione)**

File `tests/unit/send-pec-invariante.test.ts`:
```typescript
// tests/unit/send-pec-invariante.test.ts
// CONTRATTO N10: sendFatturaPEC non deve MAI lanciare dopo che sendMail è
// riuscito. Il release-del-claim nel catch delle route chiamanti presume che
// un throw significhi «mail NON partita»; violare l'invariante = doppio invio
// fiscale a SdI. Se questo test fallisce dopo un refactor, NON rilassarlo:
// rivedere il refactor.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc, mockSendMail } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockSendMail: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: mockSendMail }) },
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/storage/signed-url', () => ({
  getSignedUrl: async () => 'https://signed.example/xml',
}))

import { sendFatturaPEC } from '@/lib/fattura/send-pec'

const FATTURA = {
  id: 'fat-1', numero: '2026-0007', nome_file_xml: 'IT123_00007.xml',
  xml_storage_path: 'lab-1/2026/IT123_00007.xml', laboratorio_id: 'lab-1', data: '2026-07-15',
  laboratorio: {
    id: 'lab-1', nome: 'Lab Test', pec_host: 'pec.example.com', pec_port: 465,
    pec_user: 'lab@pec.example.com', pec_smtp_configurata: true, pec_vault_key_id: 'k1',
  },
}

function selectChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq']) c[m] = () => c
  c.single = async () => result
  return c
}
function updateChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['update', 'eq']) c[m] = () => c
  ;(c as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new TextEncoder().encode('<xml/>').buffer,
  })))
  mockRpc.mockResolvedValue({ data: 'pec-password', error: null })
  mockSendMail.mockResolvedValue({ messageId: '<msg-1>' })
})

describe('sendFatturaPEC — invariante «mai throw dopo sendMail riuscito»', () => {
  it('sendMail ok + UPDATE stato fallito → NON rilancia (logga soltanto)', async () => {
    let updates = 0
    mockFrom.mockImplementation(() => {
      // 1ª chiamata: select fattura; 2ª: update stato (fallisce)
      if (updates++ === 0) return selectChain({ data: FATTURA, error: null })
      return updateChain({ data: null, error: { message: 'update fallito' } })
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(sendFatturaPEC('fat-1')).resolves.toBeUndefined()
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    errSpy.mockRestore()
  })
  it('sendMail fallito → rilancia (la mail non è partita, il claim va rilasciato)', async () => {
    mockFrom.mockImplementation(() => selectChain({ data: FATTURA, error: null }))
    mockSendMail.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(sendFatturaPEC('fat-1')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Esegui — deve passare**

Run: `npx vitest run tests/unit/send-pec-invariante.test.ts`
Expected: PASS (rete di regressione su codice esistente). Se FAIL, fermarsi e riportare BLOCKED: significa che l'assunzione della spec sul modulo è falsa.

- [ ] **Step 3: Aggiungi il commento-contratto in `send-pec.ts`**

In `src/lib/fattura/send-pec.ts`, subito PRIMA della riga `// ── 7. Aggiorna stato fattura ─...` (riga ~136), aggiungi:
```typescript
  // ⚠️ CONTRATTO (N10, test send-pec-invariante.test.ts): da qui in poi la mail
  // è PARTITA — questa funzione non deve MAI più lanciare. I chiamanti rilasciano
  // il claim anti-doppio-invio nel catch presumendo «throw = mail non partita»;
  // un throw qui causerebbe un secondo invio fiscale a SdI.
```

- [ ] **Step 4: Esegui + tsc + commit**

Run: `npx vitest run tests/unit/send-pec-invariante.test.ts` → PASS. `npx tsc --noEmit` → pulito.
```bash
git add src/lib/fattura/send-pec.ts tests/unit/send-pec-invariante.test.ts
git commit -m "test(fattura): blinda invariante send-pec «mai throw dopo sendMail riuscito» (N10)"
```

---

## Task 3: Hardening ramo `invia_pec` della route `/xml` (TDD)

Chiude il bypass rilevato dagli advisor (spec §3.2): il ramo `invia_pec:true` di `POST /api/fatture/[id]/xml` riceve gate ruolo, claim e sanitizzazione di `pec_errore`. **Il gate N7 e la generazione senza invio restano INTATTI.**

**Files:**
- Modify: `src/app/api/fatture/[id]/xml/route.ts`
- Test: Modify `tests/unit/fatture-xml-gate-stato-sdi.test.ts` (aggiungi describe nuovo)

**Interfaces:**
- Consumes: `RUOLI_INVIO_PEC`, `claimInvioPec`, `releaseInvioPec` (Task 1).

- [ ] **Step 1: Adegua i mock del test esistente**

In `tests/unit/fatture-xml-gate-stato-sdi.test.ts`:
(a) nel blocco `vi.hoisted` (righe 8-14) aggiungi:
```typescript
  mockSendFatturaPEC: vi.fn(),
  mockClaim: vi.fn(),
  mockRelease: vi.fn(),
  utenteRuolo: { value: 'titolare' as string },
```
(b) sostituisci il mock inline di send-pec (riga 23) e aggiungi quello di invio-claim:
```typescript
vi.mock('@/lib/fattura/send-pec', () => ({ sendFatturaPEC: mockSendFatturaPEC }))
vi.mock('@/lib/fattura/invio-claim', () => ({
  RUOLI_INVIO_PEC: ['titolare', 'front_desk'],
  claimInvioPec: mockClaim,
  releaseInvioPec: mockRelease,
}))
```
(c) il mock di `utenti` (riga 56) diventa:
```typescript
    if (table === 'utenti') return chain({ data: { laboratorio_id: 'lab-1', ruolo: utenteRuolo.value }, error: null })
```
(d) nel `beforeEach` aggiungi:
```typescript
  utenteRuolo.value = 'titolare'
  mockClaim.mockResolvedValue({ claimed: true, error: null })
  mockRelease.mockResolvedValue(undefined)
  mockSendFatturaPEC.mockResolvedValue(undefined)
```
I 3 test N7 esistenti devono restare verdi invariati.

- [ ] **Step 2: Scrivi i test nuovi (falliscono)**

Aggiungi al file:
```typescript
function reqInvia() {
  return new Request('http://localhost/api/fatture/fat-1/xml', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
    body: JSON.stringify({ lavori_ids: ['lav-1'], invia_pec: true }),
  })
}

describe('POST /api/fatture/[id]/xml — ramo invia_pec (N10 hardening)', () => {
  it('invia_pec con ruolo tecnico → 403 PRIMA di generare (nessun progressivo bruciato)', async () => {
    utenteRuolo.value = 'tecnico'
    const res = await POST(reqInvia(), ctx)
    expect(res.status).toBe(403)
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
  })

  it('generazione SENZA invio con ruolo tecnico → permessa (gate solo sul ramo invio)', async () => {
    utenteRuolo.value = 'tecnico'
    const res = await POST(req(), ctx)
    expect(res.status).not.toBe(403)
    expect(mockGeneraFatturaPA).toHaveBeenCalledTimes(1)
  })

  it('invia_pec felice: claim acquisito PRIMA di sendFatturaPEC, pec_inviata true', async () => {
    const res = await POST(reqInvia(), ctx)
    const json = await res.json()
    expect(mockClaim).toHaveBeenCalledWith(expect.anything(), 'fat-1', 'lab-1')
    expect(mockSendFatturaPEC).toHaveBeenCalledWith('fat-1')
    expect(mockClaim.mock.invocationCallOrder[0]).toBeLessThan(mockSendFatturaPEC.mock.invocationCallOrder[0])
    expect(json.pec_inviata).toBe(true)
  })

  it('claim conteso → sendFatturaPEC NON chiamato, pec_errore generico', async () => {
    mockClaim.mockResolvedValue({ claimed: false, error: null })
    const res = await POST(reqInvia(), ctx)
    const json = await res.json()
    expect(mockSendFatturaPEC).not.toHaveBeenCalled()
    expect(json.pec_inviata).toBe(false)
    expect(json.pec_errore).toBe('Invio già in corso o già effettuato')
  })

  it('sendFatturaPEC fallisce → release chiamato, pec_errore SENZA err.message grezzo', async () => {
    mockSendFatturaPEC.mockRejectedValue(new Error('connect ECONNREFUSED smtp.interno:465'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(reqInvia(), ctx)
    errSpy.mockRestore()
    const json = await res.json()
    expect(mockRelease).toHaveBeenCalledWith(expect.anything(), 'fat-1', 'lab-1')
    expect(json.pec_errore).toBe('Invio PEC fallito — riprova o verifica la configurazione PEC')
    expect(JSON.stringify(json)).not.toContain('smtp.interno')
  })
})
```
Run: `npx vitest run tests/unit/fatture-xml-gate-stato-sdi.test.ts` → i 5 test nuovi FALLISCONO (route non ancora modificata), i 3 vecchi restano verdi.

- [ ] **Step 3: Implementa in `xml/route.ts`**

(a) Import: `import { RUOLI_INVIO_PEC, claimInvioPec, releaseInvioPec } from '@/lib/fattura/invio-claim'`
(b) La select utente (riga ~37-41) diventa `.select('laboratorio_id, ruolo')`.
(c) Dopo il parse del body (riga ~58, dove `inviaPec` è noto) e PRIMA del check fattura, aggiungi il gate — fallire qui evita di generare l'XML (e bruciare il progressivo) per poi rifiutare l'invio:
```typescript
  // N10: l'invio fiscale richiede ruolo dedicato; la sola generazione resta libera.
  if (inviaPec && !RUOLI_INVIO_PEC.includes(utente.ruolo as (typeof RUOLI_INVIO_PEC)[number])) {
    return NextResponse.json({ error: "Ruolo non autorizzato all'invio fiscale" }, { status: 403 })
  }
```
(d) Il blocco invio (righe ~243-250) diventa:
```typescript
  if (inviaPec) {
    const { claimed, error: claimErr } = await claimInvioPec(svc, fatturaId, labId)
    if (claimErr || !claimed) {
      pecErrore = claimErr
        ? "Errore durante l'invio — riprova"
        : 'Invio già in corso o già effettuato'
      if (claimErr) console.error('[FATTURE-XML] claim invio fallito:', claimErr)
    } else {
      try {
        await sendFatturaPEC(fatturaId)
        pecInviata = true
      } catch (err) {
        // Dettaglio (host SMTP, Vault) SOLO nei log server — mai nel body (N10).
        console.error('[FATTURE-XML] invio PEC fallito:', err)
        await releaseInvioPec(svc, fatturaId, labId)
        pecErrore = 'Invio PEC fallito — riprova o verifica la configurazione PEC'
      }
    }
  }
```

- [ ] **Step 4: Esegui — PASS + suite di contorno + tsc**

Run: `npx vitest run tests/unit/fatture-xml-gate-stato-sdi.test.ts` → PASS (casi vecchi + nuovi).
Run: `npx tsc --noEmit` → pulito.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/fatture/[id]/xml/route.ts" tests/unit/fatture-xml-gate-stato-sdi.test.ts
git commit -m "fix(fattura): gate ruolo + claim + no-leak sul ramo invia_pec di /xml (riserve advisor N10)"
```

---

## Task 4: Mockup card «Invio SDI» — 🛑 GATE §0B (approvazione Francesco)

**Files:**
- Create: `docs/design/mockups/2026-07-15-invia-pec-sdi.html`
- Create: `docs/design/mockups/screenshots/2026-07-15-invia-pec-sdi-*.png`

- [ ] **Step 1: Costruisci il mockup HTML** — la card «Invio SDI» della pagina fattura (stile v2.3 della pagina esistente: card `--sfc`, radius 18, DM Sans, label uppercase) in **2 varianti × light+dark**, dati realistici (fattura 2026-0007, €322,00):
  - **Variante A** — bottone primario rosso pieno «Invia a SdI» sotto le righe della card + riga «Stato SdI: Pronta per l'invio»; stato post-invio «Inviata a SdI — in attesa di ricevuta» con dot ambra.
  - **Variante B** — riga di stato con pill + bottone pill compatto a destra nella stessa riga; stato post-invio identico.
  - Entrambe includono: stato disabled con link «Configura PEC» (PEC non configurata), dialogo di conferma (overlay: «Inviare la fattura 2026-0007 a SdI? L'invio è un atto fiscale irreversibile.» — Annulla / Invia), stato pending (spinner sul bottone), errore inline 502.
  - Mappa label stato SDI (per la riga di stato): `generata` → «Pronta per l'invio» · `smtp_inviata` → «Inviata a SdI — in attesa di ricevuta» · `pec_consegnata` → «PEC consegnata» · `ricevuta_sdi` → «Ricevuta da SdI» · `accettata` → «Accettata da SdI» · `rifiutata` → «Rifiutata da SdI» · `scaduta` → «Senza risposta SdI (scaduta)» · `draft` → «Bozza — XML non generato».
- [ ] **Step 2: Screenshot Playwright** — 390/768/1280 × light/dark per entrambe le varianti, salvati in `docs/design/mockups/screenshots/`.
- [ ] **Step 3: Commit del mockup**
```bash
git add docs/design/mockups/2026-07-15-invia-pec-sdi.html docs/design/mockups/screenshots/
git commit -m "docs(design): mockup card Invio SDI — varianti A/B light+dark (gate 0B)"
```
- [ ] **Step 4: 🛑 STOP — presentare le varianti a Francesco e ATTENDERE la scelta.** Nessun codice React prima dell'ok. Scrivere la decisione in `docs/design/decisions/2026-07-15-invia-pec-sdi.md` (variante scelta + eventuali richieste) e committarla.

---

## Task 5: `InviaPecButton` + integrazione pagina fattura (TDD, fedele al mockup approvato)

**Files:**
- Create: `src/components/features/fatture/InviaPecButton.tsx`
- Modify: `src/app/(app)/fatture/[id]/page.tsx` (select `ruolo` a riga 20; nuova query `laboratori`; card «Invio SDI» righe ~201-224)
- Test: `tests/unit/invia-pec-button.test.tsx` (pattern: `tests/unit/nota-credito-button.test.tsx`)

**Interfaces:**
- Consumes: `POST /api/fatture/[id]/invia-pec` (Task 1); mockup approvato (Task 4).
- Produces: `InviaPecButton({ fatturaId, numero, statoSdi, ruolo, pecConfigurata }: { fatturaId: string; numero: string; statoSdi: string; ruolo: string; pecConfigurata: boolean })` — client component; `STATO_SDI_LABEL: Record<string, string>` esportata dal componente per la riga di stato.

- [ ] **Step 1: Scrivi il test (fallisce)**

File `tests/unit/invia-pec-button.test.tsx` (jsdom; stile render/fireEvent di `tests/unit/nota-credito-button.test.tsx`):
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

import { InviaPecButton, STATO_SDI_LABEL } from '@/components/features/fatture/InviaPecButton'

const PROPS = { fatturaId: 'fat-1', numero: '2026-0007', statoSdi: 'generata', ruolo: 'titolare', pecConfigurata: true }

function fetchMock(status: number, body: unknown) {
  return vi.fn(async () => ({ ok: status < 400, status, json: async () => body })) as never
}

beforeEach(() => vi.clearAllMocks())

describe('InviaPecButton — visibilità', () => {
  it('generata + titolare → visibile', () => {
    render(<InviaPecButton {...PROPS} />)
    expect(screen.getByRole('button', { name: /invia a sdi/i })).toBeInTheDocument()
  })
  it('generata + front_desk → visibile', () => {
    render(<InviaPecButton {...PROPS} ruolo="front_desk" />)
    expect(screen.getByRole('button', { name: /invia a sdi/i })).toBeInTheDocument()
  })
  it('generata + tecnico → NON renderizzato', () => {
    const { container } = render(<InviaPecButton {...PROPS} ruolo="tecnico" />)
    expect(container).toBeEmptyDOMElement()
  })
  it('smtp_inviata + titolare → NON renderizzato', () => {
    const { container } = render(<InviaPecButton {...PROPS} statoSdi="smtp_inviata" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('InviaPecButton — PEC non configurata', () => {
  it('bottone disabled + link a /impostazioni/pec', () => {
    render(<InviaPecButton {...PROPS} pecConfigurata={false} />)
    expect(screen.getByRole('button', { name: /invia a sdi/i })).toBeDisabled()
    expect(screen.getByRole('link', { name: /configura pec/i })).toHaveAttribute('href', '/impostazioni/pec')
  })
})

describe('InviaPecButton — conferma e invio', () => {
  it('tap → conferma col numero fattura, fetch NON ancora chiamata', () => {
    global.fetch = fetchMock(200, {})
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('2026-0007')
    expect(global.fetch).not.toHaveBeenCalled()
  })
  it('Annulla → conferma chiusa, nessuna fetch', () => {
    global.fetch = fetchMock(200, {})
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    fireEvent.click(screen.getByRole('button', { name: /annulla/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })
  it('conferma → POST /api/fatture/fat-1/invia-pec e refresh su ok', async () => {
    global.fetch = fetchMock(200, { fattura: { stato_sdi: 'smtp_inviata' } })
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    fireEvent.click(screen.getByRole('button', { name: /^invia$/i }))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(global.fetch).toHaveBeenCalledWith('/api/fatture/fat-1/invia-pec', { method: 'POST' })
  })
  it('409 → messaggio informativo (data-tipo=info) + refresh', async () => {
    global.fetch = fetchMock(409, { error: 'Invio già in corso o già effettuato' })
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    fireEvent.click(screen.getByRole('button', { name: /^invia$/i }))
    await waitFor(() => expect(screen.getByText(/già in corso/i)).toBeInTheDocument())
    expect(screen.getByText(/già in corso/i)).toHaveAttribute('data-tipo', 'info')
    expect(mockRefresh).toHaveBeenCalled()
  })
  it('502 → errore inline (data-tipo=errore), bottone riabilitato per retry', async () => {
    global.fetch = fetchMock(502, { error: 'Invio PEC fallito — riprova o verifica la configurazione PEC' })
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    fireEvent.click(screen.getByRole('button', { name: /^invia$/i }))
    await waitFor(() => expect(screen.getByText(/invio pec fallito/i)).toBeInTheDocument())
    expect(screen.getByText(/invio pec fallito/i)).toHaveAttribute('data-tipo', 'errore')
    expect(screen.getByRole('button', { name: /invia a sdi/i })).toBeEnabled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})

describe('STATO_SDI_LABEL', () => {
  it('copre tutti gli 8 stati SDI', () => {
    expect(Object.keys(STATO_SDI_LABEL).sort()).toEqual(
      ['accettata', 'draft', 'generata', 'pec_consegnata', 'ricevuta_sdi', 'rifiutata', 'scaduta', 'smtp_inviata']
    )
  })
})
```
Run: `npx vitest run tests/unit/invia-pec-button.test.tsx` → FAIL (componente non esiste).

- [ ] **Step 2: Implementa il componente** — fedele alla **variante approvata al Task 4** (struttura sotto; stile esatto dal mockup):

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const STATO_SDI_LABEL: Record<string, string> = {
  draft: 'Bozza — XML non generato',
  generata: "Pronta per l'invio",
  smtp_inviata: 'Inviata a SdI — in attesa di ricevuta',
  pec_consegnata: 'PEC consegnata',
  ricevuta_sdi: 'Ricevuta da SdI',
  accettata: 'Accettata da SdI',
  rifiutata: 'Rifiutata da SdI',
  scaduta: 'Senza risposta SdI (scaduta)',
}

const RUOLI_AMMESSI = ['titolare', 'front_desk']

interface Props {
  fatturaId: string
  numero: string
  statoSdi: string
  ruolo: string
  pecConfigurata: boolean
}

export function InviaPecButton({ fatturaId, numero, statoSdi, ruolo, pecConfigurata }: Props) {
  const router = useRouter()
  const [conferma, setConferma] = useState(false)
  const [messaggio, setMessaggio] = useState<{ tipo: 'errore' | 'info'; testo: string } | null>(null)
  const [pending, startTransition] = useTransition()

  if (statoSdi !== 'generata' || !RUOLI_AMMESSI.includes(ruolo)) return null

  if (!pecConfigurata) {
    return (
      // Bottone disabled + link (markup dalla variante approvata)
      <div>
        <button disabled>Invia a SdI</button>
        <Link href="/impostazioni/pec">Configura PEC</Link>
      </div>
    )
  }

  const invia = () => {
    setConferma(false)
    setMessaggio(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/fatture/${fatturaId}/invia-pec`, { method: 'POST' })
        const body = await res.json().catch(() => ({}))
        if (res.ok) {
          router.refresh()
        } else if (res.status === 409) {
          // Informativo, non un errore ritentabile: lo stato reale arriva col refresh.
          setMessaggio({ tipo: 'info', testo: body.error ?? 'Invio già in corso o già effettuato' })
          router.refresh()
        } else {
          setMessaggio({ tipo: 'errore', testo: body.error ?? 'Invio PEC fallito — riprova' })
        }
      } catch {
        setMessaggio({ tipo: 'errore', testo: 'Errore di rete — riprova' })
      }
    })
  }

  return (
    <div>
      <button onClick={() => setConferma(true)} disabled={pending}>
        {pending ? 'Invio…' : 'Invia a SdI'}
      </button>
      {conferma && (
        // Overlay di conferma dalla variante approvata:
        // «Inviare la fattura {numero} a SdI? L'invio è un atto fiscale irreversibile.»
        <div role="dialog" aria-modal="true">
          <p>Inviare la fattura {numero} a SdI? L&apos;invio è un atto fiscale irreversibile.</p>
          <button onClick={() => setConferma(false)}>Annulla</button>
          <button onClick={invia}>Invia</button>
        </div>
      )}
      {messaggio && <p data-tipo={messaggio.tipo}>{messaggio.testo}</p>}
    </div>
  )
}
```
Lo scheletro sopra fissa logica e contratti; il markup/stile viene dal mockup approvato (token v2.3 della pagina, touch ≥44px, `aria-modal`, focus gestito).

- [ ] **Step 3: Integra nella pagina** — in `src/app/(app)/fatture/[id]/page.tsx`:
(a) riga 20: `.select('laboratorio_id')` → `.select('laboratorio_id, ruolo')`
(b) dopo il fetch fattura, query nuova:
```typescript
  const { data: lab } = await svc
    .from('laboratori')
    .select('pec_smtp_configurata')
    .eq('id', utente.laboratorio_id)
    .single()
```
(c) nella card «Invio SDI» (righe ~201-224): aggiungi la riga «Stato SdI» con `STATO_SDI_LABEL[f.stato_sdi as string] ?? f.stato_sdi` e monta:
```tsx
  <InviaPecButton
    fatturaId={id}
    numero={f.numero as string}
    statoSdi={f.stato_sdi as string}
    ruolo={(utente.ruolo as string) ?? ''}
    pecConfigurata={lab?.pec_smtp_configurata === true}
  />
```
posizionato come da variante approvata (import in testa al file).

- [ ] **Step 4: Esegui — PASS + tsc**

Run: `npx vitest run tests/unit/invia-pec-button.test.tsx` → PASS. `npx tsc --noEmit` → pulito.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/fatture/InviaPecButton.tsx "src/app/(app)/fatture/[id]/page.tsx" tests/unit/invia-pec-button.test.tsx
git commit -m "feat(fatture): bottone Invia a SdI + riga stato SDI granulare in pagina fattura (N10)"
```

---

## Task 6: FASE 7 + QA browser + gate L2 + BP-1

**Files:**
- Modify: `memory/MEMORY.md`, `memory/SESSION_ACTIVE.md`, `docs/roadmap/ROADMAP-UFFICIALE.md`, `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`

- [ ] **Step 1: FASE 7 (output reale)** — `npx tsc --noEmit` (0 err) · `npx vitest run` (tutti PASS, baseline 1749+nuovi) · `npx next build` (OK).
- [ ] **Step 2: QA browser — lab E2E `00000000-0000-0000-0000-000000000001` (MAI lab Filippo, nessuna PEC reale):**
  1. Configura PEC **fittizia** sul lab E2E: `pec_host='smtp.invalid'`, `pec_port=465`, `pec_user='qa@invalid'`, `pec_smtp_configurata=true` + password fittizia nel Vault (via route impostazioni PEC o SQL diretto — annotare il metodo per il cleanup).
  2. Porta una fattura del lab E2E a `generata` (batch), apri `/fatture/[id]`: riga «Stato SdI: Pronta per l'invio» + bottone visibile (utente titolare).
  3. Tap → conferma → invio → **502 pulito atteso** (host invalido): messaggio inline, stato resta `generata`, `smtp_inviata_at` NULL su DB (claim rilasciato), bottone ritentabile.
  4. `pec_smtp_configurata=false` → bottone disabled + link «Configura PEC».
  5. Via API (fetch da console autenticata): stato `draft` → 409 col messaggio giusto; doppio POST rapido → un solo invio tentato (secondo → 409 claim).
  6. Verifica ruolo: utente tecnico E2E (se esiste) non vede il bottone; POST → 403.
  7. **Cleanup a baseline ESATTO**: config PEC fittizia rimossa (host/user/flag + Vault), fattura QA e progressivi ripuliti come da prassi TD04, zero residui.
- [ ] **Step 3: 🟡 Gate estetico L2** — micro-audit della card «Invio SDI» contro `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`, 390/768/1280 × light/dark; screenshot before/after in `docs/design/screenshots/2026-07-15-invia-pec-sdi/`; ogni ❌ risolto o deferito con motivo.
- [ ] **Step 4: BP-1** — `MEMORY.md` (§0: N10+N9 implementati su branch, in attesa merge; rimedio claim orfano annotato nella memoria di dominio) · `ROADMAP-UFFICIALE.md` (entry nuova) · `BACKLOG-TECNICO` (§N9+§N10 → risolti; NUOVO follow-up: «rate-limit per-lab sugli invii PEC» + «cron riconciliazione ricevute PEC») · `SESSION_ACTIVE.md`.
- [ ] **Step 5: Commit + review finale + 🛑 GATE merge Francesco**
```bash
git add memory/ docs/roadmap/ docs/design/
git commit -m "docs(memory): BP-1 N10+N9 invio PEC SdI — implementato su branch"
```
Review finale whole-branch (superpowers:requesting-code-review), poi merge/push SOLO su ok esplicito di Francesco.
