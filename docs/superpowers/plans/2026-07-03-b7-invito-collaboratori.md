# B7 — Invito collaboratori raggiungibile dal titolare — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dare al titolare un modo funzionante di invitare tecnico/front_desk/co-titolare dal proprio laboratorio, e far sì che un tecnico invitato compaia davvero in `/tecnici` dopo l'accettazione.

**Architecture:** Helper condivisi in `src/lib/invito/` (testabili con fake Supabase client, stesso pattern di `src/lib/contabilita/queries.ts`) usati sia dalla route admin esistente sia da due nuove route scoped al lab del titolare. Migration che estende `accept_invite_atomic()` per creare la riga `tecnici` mancante. Nuovo componente client `InvitaCollaboratoreSheet` (bottom sheet) sostituisce i link rotti in `/tecnici`.

**Tech Stack:** Next.js 16 App Router, Supabase (`@supabase/supabase-js`), Resend, Vitest + Testing Library, Motion (`motion/react`).

## Global Constraints

- Spec di riferimento: `docs/superpowers/specs/2026-07-03-b7-invito-collaboratori-design.md`
- Nessuna `duration`/easing inline nuova nei componenti — riusare `motionTokens.spring.soft` e lo stesso pattern overlay già usato in `src/components/features/scadenzario/RegistraPagamentoSheet.tsx` (fedele alla convenzione realmente in uso nel codebase, 15 componenti la usano).
- Ogni route API mutante verifica `isSameOrigin(req)` prima di tutto (pattern esistente in tutte le route POST/PATCH/DELETE del progetto). Le GET non lo richiedono (convenzione confermata: nessuna GET esistente lo controlla).
- `laboratorio_id` per le route scoped al titolare è SEMPRE derivato server-side da `utenti.laboratorio_id` del chiamante autenticato — mai letto dal body della richiesta.
- Dopo la migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` poi `npx tsc --noEmit` (FASE 6b di CLAUDE.md).
- Percorso implementativo "Grande" (CLAUDE.md, override dominio critico: assegnazione ruoli cross-tenant) → worktree dedicato, TDD per ogni task con codice testabile, review singola per task + review finale whole-branch prima del merge.
- Type per il client Supabase nelle funzioni di libreria: `import type { SupabaseClient } from '@supabase/supabase-js'` come primo parametro (pattern esistente in `src/lib/contabilita/queries.ts`).

## File Structure

**Nuovi file (libreria, testabili):**
- `src/lib/invito/ruoli.ts` — tipo `RuoloInvito`, allowlist ruoli invitabili dal titolare, validatore
- `src/lib/invito/upsert-invito.ts` — `trovaInvitoPendente` (pura) + `upsertInvito` (DB)
- `src/lib/invito/list-inviti-pendenti.ts` — `listInvitiPendenti`
- `src/lib/invito/revoca-invito.ts` — `revocaInvito`

**Nuovi file (I/O non testato, stessa convenzione di `verifyAdmin()`/invio email esistenti):**
- `src/lib/invito/send-invito-email.ts` — wrapper Resend estratto da `/api/admin/invite`
- `src/lib/invito/verify-titolare.ts` — verifica ruolo titolare + risolve `laboratorio_id` server-side

**Route API:**
- `src/app/api/admin/invite/route.ts` — modificato: usa gli helper condivisi invece di duplicare la logica
- `src/app/api/tecnici/invite/route.ts` — nuovo: `POST` (crea invito) + `GET` (lista pendenti), scoped al titolare
- `src/app/api/tecnici/invite/[id]/route.ts` — nuovo: `DELETE` (revoca), scoped al titolare

**Database:**
- `supabase/migrations/20260703120000_b7_accept_invite_tecnico.sql` — estende `accept_invite_atomic()`
- `src/types/database.types.ts` — rigenerato (non modificato a mano)

**UI:**
- `src/components/features/tecnici/InvitaCollaboratoreSheet.tsx` — nuovo componente client (bottom sheet)
- `src/app/(app)/tecnici/page.tsx` — modificato: sostituisce i due `<Link href="/impostazioni">` rotti

**Test:**
- `tests/unit/invito-ruoli.test.ts`
- `tests/unit/invito-upsert.test.ts`
- `tests/unit/invito-list-pendenti.test.ts`
- `tests/unit/invito-revoca.test.ts`
- `tests/unit/InvitaCollaboratoreSheet.test.tsx`

---

### Task 1: Allowlist ruoli invitabili dal titolare

**Files:**
- Create: `src/lib/invito/ruoli.ts`
- Test: `tests/unit/invito-ruoli.test.ts`

**Interfaces:**
- Produces: `RuoloInvito` (type), `RUOLI_INVITABILI_DA_TITOLARE` (const array), `isRuoloInvitabileDaTitolare(ruolo: unknown): boolean`

- [ ] **Step 1: Scrivi il test che fallisce**

```ts
// tests/unit/invito-ruoli.test.ts
import { describe, it, expect } from 'vitest'
import { isRuoloInvitabileDaTitolare, RUOLI_INVITABILI_DA_TITOLARE } from '@/lib/invito/ruoli'

describe('isRuoloInvitabileDaTitolare', () => {
  it('accetta "tecnico"', () => {
    expect(isRuoloInvitabileDaTitolare('tecnico')).toBe(true)
  })

  it('accetta "front_desk"', () => {
    expect(isRuoloInvitabileDaTitolare('front_desk')).toBe(true)
  })

  it('accetta "titolare" (co-titolare)', () => {
    expect(isRuoloInvitabileDaTitolare('titolare')).toBe(true)
  })

  it('rifiuta "admin_rete" (riservato ad admin_sistema)', () => {
    expect(isRuoloInvitabileDaTitolare('admin_rete')).toBe(false)
  })

  it('rifiuta "admin_sistema"', () => {
    expect(isRuoloInvitabileDaTitolare('admin_sistema')).toBe(false)
  })

  it('rifiuta valori non stringa', () => {
    expect(isRuoloInvitabileDaTitolare(null)).toBe(false)
    expect(isRuoloInvitabileDaTitolare(undefined)).toBe(false)
    expect(isRuoloInvitabileDaTitolare(42)).toBe(false)
  })

  it('espone esattamente i 3 ruoli invitabili, in ordine', () => {
    expect(RUOLI_INVITABILI_DA_TITOLARE).toEqual(['tecnico', 'front_desk', 'titolare'])
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/invito-ruoli.test.ts`
Expected: FAIL — `Cannot find module '@/lib/invito/ruoli'`

- [ ] **Step 3: Implementa**

```ts
// src/lib/invito/ruoli.ts

export type RuoloInvito = 'titolare' | 'tecnico' | 'front_desk' | 'admin_rete'

export const RUOLI_INVITABILI_DA_TITOLARE = ['tecnico', 'front_desk', 'titolare'] as const

export type RuoloInvitabileDaTitolare = (typeof RUOLI_INVITABILI_DA_TITOLARE)[number]

export function isRuoloInvitabileDaTitolare(
  ruolo: unknown
): ruolo is RuoloInvitabileDaTitolare {
  return (
    typeof ruolo === 'string' &&
    (RUOLI_INVITABILI_DA_TITOLARE as readonly string[]).includes(ruolo)
  )
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/invito-ruoli.test.ts`
Expected: PASS — 7 test verdi

- [ ] **Step 5: Commit**

```bash
git add src/lib/invito/ruoli.ts tests/unit/invito-ruoli.test.ts
git commit -m "feat(invito): allowlist ruoli invitabili dal titolare"
```

---

### Task 2: `upsertInvito` — crea o aggiorna un invito senza duplicarlo

**Files:**
- Create: `src/lib/invito/upsert-invito.ts`
- Test: `tests/unit/invito-upsert.test.ts`

**Interfaces:**
- Consumes: `RuoloInvito` da `src/lib/invito/ruoli.ts` (Task 1)
- Produces: `trovaInvitoPendente(inviti: InvitoEsistente[], now: Date): string | null`, `upsertInvito(svc: SupabaseClient, params: UpsertInvitoParams): Promise<UpsertInvitoResult>`, tipo `UpsertInvitoResult = { ok: true; token: string; labNome: string } | { ok: false; status: number; error: string }` — usato da Task 6 e Task 7.

- [ ] **Step 1: Scrivi il test che fallisce**

```ts
// tests/unit/invito-upsert.test.ts
import { describe, it, expect, vi } from 'vitest'
import { trovaInvitoPendente, upsertInvito } from '@/lib/invito/upsert-invito'

describe('trovaInvitoPendente', () => {
  const NOW = new Date('2026-07-03T12:00:00Z')

  it('nessun invito esistente → null', () => {
    expect(trovaInvitoPendente([], NOW)).toBeNull()
  })

  it('invito pendente non scaduto → restituisce il suo id', () => {
    const inviti = [{ id: 'inv-1', accepted_at: null, expires_at: '2026-07-10T00:00:00Z' }]
    expect(trovaInvitoPendente(inviti, NOW)).toBe('inv-1')
  })

  it('invito già accettato → ignorato (null)', () => {
    const inviti = [{ id: 'inv-1', accepted_at: '2026-07-01T00:00:00Z', expires_at: '2026-07-10T00:00:00Z' }]
    expect(trovaInvitoPendente(inviti, NOW)).toBeNull()
  })

  it('invito scaduto (non accettato) → ignorato (null)', () => {
    const inviti = [{ id: 'inv-1', accepted_at: null, expires_at: '2026-07-01T00:00:00Z' }]
    expect(trovaInvitoPendente(inviti, NOW)).toBeNull()
  })

  it('più inviti misti → restituisce quello ancora pendente', () => {
    const inviti = [
      { id: 'inv-scaduto', accepted_at: null, expires_at: '2026-07-01T00:00:00Z' },
      { id: 'inv-pendente', accepted_at: null, expires_at: '2026-07-10T00:00:00Z' },
    ]
    expect(trovaInvitoPendente(inviti, NOW)).toBe('inv-pendente')
  })
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createFakeSupabase(config: {
  lab?: { stato: string; nome: string } | null
  inviti?: Array<{ id: string; accepted_at: string | null; expires_at: string }>
  onInsert?: (row: Record<string, unknown>) => void
  onUpdate?: (id: string, row: Record<string, unknown>) => void
}) {
  const fake = {
    from(table: string) {
      const builder = {
        select() { return builder },
        eq() { return builder },
        single() {
          return Promise.resolve({ data: table === 'laboratori' ? (config.lab ?? null) : null, error: null })
        },
        insert(row: Record<string, unknown>) {
          config.onInsert?.(row)
          return Promise.resolve({ error: null })
        },
        update(row: Record<string, unknown>) {
          return {
            eq(_col: string, id: string) {
              config.onUpdate?.(id, row)
              return Promise.resolve({ error: null })
            },
          }
        },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          resolve({ data: table === 'inviti' ? (config.inviti ?? []) : [], error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return fake
}

describe('upsertInvito', () => {
  it('laboratorio inesistente → 404', async () => {
    const svc = createFakeSupabase({ lab: null })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r).toMatchObject({ ok: false, status: 404 })
  })

  it('laboratorio in blacklist → 403', async () => {
    const svc = createFakeSupabase({ lab: { stato: 'blacklist', nome: 'Lab Test' } })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r).toMatchObject({ ok: false, status: 403 })
  })

  it('laboratorio scaduto → 403', async () => {
    const svc = createFakeSupabase({ lab: { stato: 'scaduto', nome: 'Lab Test' } })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r).toMatchObject({ ok: false, status: 403 })
  })

  it('nessun invito pendente → crea una nuova riga con email normalizzata', async () => {
    const onInsert = vi.fn()
    const svc = createFakeSupabase({ lab: { stato: 'attivo', nome: 'Lab Test' }, inviti: [], onInsert })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'A@B.it ', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r.ok).toBe(true)
    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(onInsert.mock.calls[0][0]).toMatchObject({ email: 'a@b.it', laboratorio_id: 'lab-x', ruolo: 'tecnico' })
  })

  it('invito pendente esistente per stessa email → aggiorna invece di duplicare', async () => {
    const onInsert = vi.fn()
    const onUpdate = vi.fn()
    const inviti = [{ id: 'inv-1', accepted_at: null, expires_at: '2099-01-01T00:00:00Z' }]
    const svc = createFakeSupabase({ lab: { stato: 'attivo', nome: 'Lab Test' }, inviti, onInsert, onUpdate })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'front_desk', createdBy: 'u1' })
    expect(r.ok).toBe(true)
    expect(onInsert).not.toHaveBeenCalled()
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate.mock.calls[0][0]).toBe('inv-1')
    expect(onUpdate.mock.calls[0][1]).toMatchObject({ ruolo: 'front_desk' })
  })

  it('invito esistente ma scaduto → crea comunque una nuova riga (non aggiorna)', async () => {
    const onInsert = vi.fn()
    const onUpdate = vi.fn()
    const inviti = [{ id: 'inv-vecchio', accepted_at: null, expires_at: '2020-01-01T00:00:00Z' }]
    const svc = createFakeSupabase({ lab: { stato: 'attivo', nome: 'Lab Test' }, inviti, onInsert, onUpdate })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r.ok).toBe(true)
    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/invito-upsert.test.ts`
Expected: FAIL — `Cannot find module '@/lib/invito/upsert-invito'`

- [ ] **Step 3: Implementa**

```ts
// src/lib/invito/upsert-invito.ts
import 'server-only'
import { randomUUID, createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RuoloInvito } from './ruoli'

export interface InvitoEsistente {
  id: string
  accepted_at: string | null
  expires_at: string
}

/**
 * Tra gli inviti esistenti per la stessa email+lab, trova quello ancora
 * pendente (non accettato, non scaduto) da riusare invece di duplicare.
 */
export function trovaInvitoPendente(inviti: InvitoEsistente[], now: Date): string | null {
  const match = inviti.find((i) => i.accepted_at === null && new Date(i.expires_at) > now)
  return match ? match.id : null
}

export interface UpsertInvitoParams {
  laboratorioId: string
  email: string
  ruolo: RuoloInvito
  createdBy: string
}

export type UpsertInvitoResult =
  | { ok: true; token: string; labNome: string }
  | { ok: false; status: number; error: string }

const LAB_STATI_BLOCCATI = ['blacklist', 'scaduto']

export async function upsertInvito(
  svc: SupabaseClient,
  params: UpsertInvitoParams
): Promise<UpsertInvitoResult> {
  const normalizedEmail = params.email.toLowerCase().trim()

  const { data: lab } = await svc
    .from('laboratori')
    .select('stato, nome')
    .eq('id', params.laboratorioId)
    .single()

  if (!lab) return { ok: false, status: 404, error: 'Laboratorio non trovato' }
  if (LAB_STATI_BLOCCATI.includes(lab.stato)) {
    return { ok: false, status: 403, error: 'Impossibile invitare utenti in un lab inattivo' }
  }

  const { data: esistenti } = await svc
    .from('inviti')
    .select('id, accepted_at, expires_at')
    .eq('laboratorio_id', params.laboratorioId)
    .eq('email', normalizedEmail)

  const token = randomUUID()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const pendenteId = trovaInvitoPendente((esistenti ?? []) as InvitoEsistente[], new Date())

  if (pendenteId) {
    const { error } = await svc
      .from('inviti')
      .update({ token_hash: tokenHash, ruolo: params.ruolo, expires_at: expiresAt, created_by: params.createdBy })
      .eq('id', pendenteId)
    if (error) return { ok: false, status: 500, error: error.message }
  } else {
    const { error } = await svc.from('inviti').insert({
      token_hash: tokenHash,
      laboratorio_id: params.laboratorioId,
      email: normalizedEmail,
      ruolo: params.ruolo,
      created_by: params.createdBy,
    })
    if (error) return { ok: false, status: 500, error: error.message }
  }

  return { ok: true, token, labNome: lab.nome }
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/invito-upsert.test.ts`
Expected: PASS — 11 test verdi

- [ ] **Step 5: Commit**

```bash
git add src/lib/invito/upsert-invito.ts tests/unit/invito-upsert.test.ts
git commit -m "feat(invito): upsertInvito — crea o aggiorna invito senza duplicare"
```

---

### Task 3: `listInvitiPendenti` — lista inviti pendenti per lab

**Files:**
- Create: `src/lib/invito/list-inviti-pendenti.ts`
- Test: `tests/unit/invito-list-pendenti.test.ts`

**Interfaces:**
- Consumes: `RuoloInvito` da `src/lib/invito/ruoli.ts` (Task 1)
- Produces: `InvitoPendente` (type: `{ id, email, ruolo, created_at, expires_at }`), `listInvitiPendenti(svc: SupabaseClient, laboratorioId: string): Promise<InvitoPendente[]>` — usato da Task 7 (route GET).

- [ ] **Step 1: Scrivi il test che fallisce**

```ts
// tests/unit/invito-list-pendenti.test.ts
import { describe, it, expect } from 'vitest'
import { listInvitiPendenti } from '@/lib/invito/list-inviti-pendenti'

function createFakeSupabase(rows: unknown[] | null) {
  const fake = {
    from(table: string) {
      const builder = {
        select() { return builder },
        eq() { return builder },
        is() { return builder },
        gt() { return builder },
        order() { return builder },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          resolve({ data: table === 'inviti' ? rows : [], error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return fake
}

describe('listInvitiPendenti', () => {
  it('nessun invito → array vuoto', async () => {
    const svc = createFakeSupabase([])
    const r = await listInvitiPendenti(svc, 'lab-1')
    expect(r).toEqual([])
  })

  it('restituisce gli inviti pendenti configurati', async () => {
    const rows = [
      { id: 'inv-1', email: 'a@b.it', ruolo: 'tecnico', created_at: '2026-07-01T00:00:00Z', expires_at: '2026-07-08T00:00:00Z' },
    ]
    const svc = createFakeSupabase(rows)
    const r = await listInvitiPendenti(svc, 'lab-1')
    expect(r).toEqual(rows)
  })

  it('data null dalla query → array vuoto, nessuna eccezione', async () => {
    const svc = createFakeSupabase(null)
    const r = await listInvitiPendenti(svc, 'lab-1')
    expect(r).toEqual([])
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/invito-list-pendenti.test.ts`
Expected: FAIL — `Cannot find module '@/lib/invito/list-inviti-pendenti'`

- [ ] **Step 3: Implementa**

```ts
// src/lib/invito/list-inviti-pendenti.ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RuoloInvito } from './ruoli'

export interface InvitoPendente {
  id: string
  email: string
  ruolo: RuoloInvito
  created_at: string
  expires_at: string
}

export async function listInvitiPendenti(
  svc: SupabaseClient,
  laboratorioId: string
): Promise<InvitoPendente[]> {
  const { data } = await svc
    .from('inviti')
    .select('id, email, ruolo, created_at, expires_at')
    .eq('laboratorio_id', laboratorioId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (data ?? []) as InvitoPendente[]
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/invito-list-pendenti.test.ts`
Expected: PASS — 3 test verdi

- [ ] **Step 5: Commit**

```bash
git add src/lib/invito/list-inviti-pendenti.ts tests/unit/invito-list-pendenti.test.ts
git commit -m "feat(invito): listInvitiPendenti — lista inviti pendenti per lab"
```

---

### Task 4: `revocaInvito` — revoca scoped al lab del chiamante

**Files:**
- Create: `src/lib/invito/revoca-invito.ts`
- Test: `tests/unit/invito-revoca.test.ts`

**Interfaces:**
- Produces: `revocaInvito(svc: SupabaseClient, params: { inviteId: string; laboratorioId: string }): Promise<RevocaInvitoResult>`, tipo `RevocaInvitoResult = { ok: true } | { ok: false; status: number; error: string }` — usato da Task 8 (route DELETE).

- [ ] **Step 1: Scrivi il test che fallisce**

```ts
// tests/unit/invito-revoca.test.ts
import { describe, it, expect, vi } from 'vitest'
import { revocaInvito } from '@/lib/invito/revoca-invito'

function createFakeSupabase(config: {
  found: boolean
  onUpdate?: (id: string, row: Record<string, unknown>) => void
  updateError?: string
}) {
  const fake = {
    from() {
      const builder = {
        select() { return builder },
        eq() { return builder },
        is() { return builder },
        single() {
          return Promise.resolve({ data: config.found ? { id: 'inv-1' } : null, error: null })
        },
        update(row: Record<string, unknown>) {
          return {
            eq(_col: string, id: string) {
              config.onUpdate?.(id, row)
              return Promise.resolve({ error: config.updateError ? { message: config.updateError } : null })
            },
          }
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return fake
}

describe('revocaInvito', () => {
  it('invito non trovato nel proprio lab → 404 (copre anche invito di un altro lab)', async () => {
    const svc = createFakeSupabase({ found: false })
    const r = await revocaInvito(svc, { inviteId: 'inv-1', laboratorioId: 'lab-1' })
    expect(r).toMatchObject({ ok: false, status: 404 })
  })

  it('invito trovato nel proprio lab → soft-revoca (accepted_at valorizzato)', async () => {
    const onUpdate = vi.fn()
    const svc = createFakeSupabase({ found: true, onUpdate })
    const r = await revocaInvito(svc, { inviteId: 'inv-1', laboratorioId: 'lab-1' })
    expect(r).toEqual({ ok: true })
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate.mock.calls[0][0]).toBe('inv-1')
    expect(typeof onUpdate.mock.calls[0][1].accepted_at).toBe('string')
  })

  it('errore DB durante update → 500', async () => {
    const svc = createFakeSupabase({ found: true, updateError: 'boom' })
    const r = await revocaInvito(svc, { inviteId: 'inv-1', laboratorioId: 'lab-1' })
    expect(r).toMatchObject({ ok: false, status: 500, error: 'boom' })
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/invito-revoca.test.ts`
Expected: FAIL — `Cannot find module '@/lib/invito/revoca-invito'`

- [ ] **Step 3: Implementa**

```ts
// src/lib/invito/revoca-invito.ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface RevocaInvitoParams {
  inviteId: string
  laboratorioId: string
}

export type RevocaInvitoResult = { ok: true } | { ok: false; status: number; error: string }

export async function revocaInvito(
  svc: SupabaseClient,
  params: RevocaInvitoParams
): Promise<RevocaInvitoResult> {
  const { data: invito } = await svc
    .from('inviti')
    .select('id')
    .eq('id', params.inviteId)
    .eq('laboratorio_id', params.laboratorioId)
    .is('accepted_at', null)
    .single()

  if (!invito) return { ok: false, status: 404, error: 'Invito non trovato' }

  const { error } = await svc
    .from('inviti')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', params.inviteId)

  if (error) return { ok: false, status: 500, error: error.message }
  return { ok: true }
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/invito-revoca.test.ts`
Expected: PASS — 3 test verdi

- [ ] **Step 5: Commit**

```bash
git add src/lib/invito/revoca-invito.ts tests/unit/invito-revoca.test.ts
git commit -m "feat(invito): revocaInvito — revoca scoped al lab del chiamante"
```

---

### Task 5: Estrai invio email e verifica titolare (nessun nuovo test — stessa convenzione di `verifyAdmin()`, I/O non testato)

**Files:**
- Create: `src/lib/invito/send-invito-email.ts`
- Create: `src/lib/invito/verify-titolare.ts`

**Interfaces:**
- Consumes: `RuoloInvito` da `src/lib/invito/ruoli.ts` (Task 1)
- Produces: `sendInvitoEmail(params: SendInvitoEmailParams): Promise<SendInvitoEmailResult>` — usato da Task 6, 7. `verifyTitolare(): Promise<{ userId: string; laboratorioId: string } | null>` — usato da Task 7, 8.

- [ ] **Step 1: Crea `send-invito-email.ts`, estraendo il template HTML esistente da `src/app/api/admin/invite/route.ts:76-105`**

```ts
// src/lib/invito/send-invito-email.ts
import 'server-only'
import { Resend } from 'resend'
import type { RuoloInvito } from './ruoli'

export interface SendInvitoEmailParams {
  email: string
  labNome: string
  ruolo: RuoloInvito
  inviteUrl: string
}

export interface SendInvitoEmailResult {
  emailSent: boolean
  emailError?: string
}

export async function sendInvitoEmail(params: SendInvitoEmailParams): Promise<SendInvitoEmailResult> {
  const { email, labNome, ruolo, inviteUrl } = params

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('INCOLLA_QUI')) {
    console.warn('[invito] RESEND_API_KEY non configurata — email non inviata')
    return { emailSent: false, emailError: 'RESEND_API_KEY non configurata' }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromAddress = process.env.EMAIL_FROM ?? 'noreply@uachelab.com'
    const { error } = await resend.emails.send({
      from: `UÀ <${fromAddress}>`,
      to: email,
      subject: `Sei invitato in UÀ — ${labNome}`,
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F5F2EF; border-radius: 16px;">
          <h2 style="font-size: 22px; font-weight: 800; color: #1C1916; margin: 0 0 16px;">Sei invitato in UÀ</h2>
          <p style="font-size: 15px; color: #4A4845; line-height: 1.6; margin: 0 0 12px;">
            Sei stato invitato come <strong>${ruolo}</strong> nel laboratorio <strong>${labNome}</strong>.
          </p>
          <p style="font-size: 14px; color: #4A4845; line-height: 1.6; margin: 0 0 24px;">
            Clicca il pulsante per accettare l'invito e configurare il tuo account.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 14px 28px; background: #D90012; color: #fff; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 700;">
            Accetta l'invito →
          </a>
          <p style="font-size: 12px; color: #4A3D33; margin: 24px 0 0; line-height: 1.5;">
            Il link scade tra 7 giorni. Se non hai richiesto questo invito, ignora questa email.<br/>
            UÀ — Dalla prescrizione alla consegna, tutto in un tap.
          </p>
        </div>
      `,
    })
    if (error) {
      console.error('[invito] email failed:', error.message)
      return { emailSent: false, emailError: error.message }
    }
    return { emailSent: true }
  } catch (err) {
    const emailError = err instanceof Error ? err.message : 'Errore invio email'
    console.error('[invito] email exception:', emailError)
    return { emailSent: false, emailError }
  }
}
```

Nota: il testo "scade tra 72 ore" del template originale era già inconsistente con `expires_at` DB (default 7 giorni) — corretto qui in "7 giorni" per allinearlo al comportamento reale, non è una modifica di scope aggiuntiva ma una correzione di un refuso portato alla luce dall'estrazione.

- [ ] **Step 2: Crea `verify-titolare.ts`**

```ts
// src/lib/invito/verify-titolare.ts
import 'server-only'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export interface TitolareContext {
  userId: string
  laboratorioId: string
}

export async function verifyTitolare(): Promise<TitolareContext | null> {
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return null

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (utente?.ruolo !== 'titolare' || !utente.laboratorio_id) return null
  return { userId: user.id, laboratorioId: utente.laboratorio_id }
}
```

- [ ] **Step 3: Verifica che il progetto compili**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/lib/invito/send-invito-email.ts src/lib/invito/verify-titolare.ts
git commit -m "feat(invito): estrae invio email e verifica titolare in helper condivisi"
```

---

### Task 6: Refactor `/api/admin/invite` per usare gli helper condivisi (comportamento esterno invariato)

**Files:**
- Modify: `src/app/api/admin/invite/route.ts`

**Interfaces:**
- Consumes: `upsertInvito` (Task 2), `sendInvitoEmail` (Task 5)

- [ ] **Step 1: Sostituisci il contenuto del file**

```ts
// src/app/api/admin/invite/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { upsertInvito } from '@/lib/invito/upsert-invito'
import { sendInvitoEmail } from '@/lib/invito/send-invito-email'
import type { RuoloInvito } from '@/lib/invito/ruoli'

const VALID_ROLES: RuoloInvito[] = ['titolare', 'tecnico', 'front_desk', 'admin_rete']

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })

  const { laboratorio_id, email, ruolo } = body

  if (!laboratorio_id || !email || !ruolo) {
    return NextResponse.json(
      { error: 'Campi obbligatori: laboratorio_id, email, ruolo' },
      { status: 400 }
    )
  }

  if (!VALID_ROLES.includes(ruolo)) {
    return NextResponse.json({ error: `Ruolo non valido. Valori: ${VALID_ROLES.join(', ')}` }, { status: 400 })
  }

  const svc = getServiceClient()
  const result = await upsertInvito(svc, {
    laboratorioId: laboratorio_id,
    email,
    ruolo,
    createdBy: admin.id,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
  const inviteUrl = `${appUrl}/invite/${result.token}`
  const normalizedEmail = email.toLowerCase().trim()

  const emailResult = await sendInvitoEmail({
    email: normalizedEmail,
    labNome: result.labNome,
    ruolo,
    inviteUrl,
  })

  return NextResponse.json({
    success: true,
    invite_url: process.env.NODE_ENV === 'development' ? inviteUrl : undefined,
    email_sent: emailResult.emailSent,
    email_error: emailResult.emailError,
    message: `Invito creato per ${normalizedEmail} in ${result.labNome}`,
  }, { status: 201 })
}
```

- [ ] **Step 2: Verifica che compili e che i test esistenti restino verdi**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errori TypeScript, tutti i test esistenti passano (nessun test copriva già questa route, quindi nessuna regressione misurabile automaticamente — il comportamento esterno è identico riga per riga rispetto a prima: stessi campi richiesti, stessi codici di stato, stesso corpo di risposta)

- [ ] **Step 3: Verifica manuale con `curl` contro l'ambiente locale (`npm run dev` in un altro terminale, sostituendo un `laboratorio_id` reale e un cookie di sessione admin valido)**

Run: `curl -s -X POST http://localhost:3000/api/admin/invite -H "Content-Type: application/json" -H "Cookie: <cookie sessione admin_sistema>" -d '{"laboratorio_id":"314cd040-0893-4e9d-9ad8-786e4eefd75f","email":"b7-refactor-check@test.local","ruolo":"tecnico"}'`
Expected: `{"success":true,...}` con status 201 — comportamento identico a prima del refactor

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/invite/route.ts
git commit -m "refactor(invito): admin/invite usa upsertInvito + sendInvitoEmail condivisi"
```

---

### Task 7: Nuova route `/api/tecnici/invite` — POST (crea invito) + GET (lista pendenti), scoped al titolare

**Files:**
- Create: `src/app/api/tecnici/invite/route.ts`

**Interfaces:**
- Consumes: `verifyTitolare` (Task 5), `upsertInvito` (Task 2), `sendInvitoEmail` (Task 5), `listInvitiPendenti` (Task 3), `isRuoloInvitabileDaTitolare` (Task 1)

- [ ] **Step 1: Implementa la route**

```ts
// src/app/api/tecnici/invite/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { verifyTitolare } from '@/lib/invito/verify-titolare'
import { upsertInvito } from '@/lib/invito/upsert-invito'
import { sendInvitoEmail } from '@/lib/invito/send-invito-email'
import { listInvitiPendenti } from '@/lib/invito/list-inviti-pendenti'
import { isRuoloInvitabileDaTitolare } from '@/lib/invito/ruoli'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const titolare = await verifyTitolare()
  if (!titolare) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.ruolo) {
    return NextResponse.json({ error: 'Campi obbligatori: email, ruolo' }, { status: 400 })
  }
  if (!isRuoloInvitabileDaTitolare(body.ruolo)) {
    return NextResponse.json(
      { error: 'Ruolo non valido. Valori: tecnico, front_desk, titolare' },
      { status: 400 }
    )
  }

  // laboratorio_id è SEMPRE quello del chiamante (mai letto dal body — anti tenant-leak)
  const svc = getServiceClient()
  const result = await upsertInvito(svc, {
    laboratorioId: titolare.laboratorioId,
    email: body.email,
    ruolo: body.ruolo,
    createdBy: titolare.userId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
  const inviteUrl = `${appUrl}/invite/${result.token}`
  const normalizedEmail = String(body.email).toLowerCase().trim()

  const emailResult = await sendInvitoEmail({
    email: normalizedEmail,
    labNome: result.labNome,
    ruolo: body.ruolo,
    inviteUrl,
  })

  return NextResponse.json({
    success: true,
    email_sent: emailResult.emailSent,
    email_error: emailResult.emailError,
    message: `Invito creato per ${normalizedEmail}`,
  }, { status: 201 })
}

export async function GET() {
  const titolare = await verifyTitolare()
  if (!titolare) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const svc = getServiceClient()
  const inviti = await listInvitiPendenti(svc, titolare.laboratorioId)
  return NextResponse.json({ inviti })
}
```

- [ ] **Step 2: Verifica che compili**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Verifica manuale end-to-end (`npm run dev`, login come titolare lab Filippo `h4t@live.it`)**

Run:
```bash
curl -s -X POST http://localhost:3000/api/tecnici/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: <cookie sessione titolare>" \
  -d '{"email":"b7-check-tecnico@test.local","ruolo":"tecnico"}'
```
Expected: `{"success":true,"email_sent":...,"message":"Invito creato per b7-check-tecnico@test.local"}` status 201

Run (verifica anti tenant-leak — un `laboratorio_id` estraneo nel body viene ignorato):
```bash
curl -s -X POST http://localhost:3000/api/tecnici/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: <cookie sessione titolare lab Filippo>" \
  -d '{"email":"b7-check-tenant@test.local","ruolo":"tecnico","laboratorio_id":"314cd040-0893-4e9d-9ad8-786e4eefd75f"}'
```
Expected: 201, e verifica su Supabase (`select laboratorio_id from inviti where email='b7-check-tenant@test.local'`) che il valore sia il lab **Filippo** (`971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c`), non `314cd040-...` — il campo del body viene ignorato

Run:
```bash
curl -s http://localhost:3000/api/tecnici/invite -H "Cookie: <cookie sessione titolare>"
```
Expected: `{"inviti":[{...b7-check-tecnico@test.local...}]}` — include gli inviti appena creati

- [ ] **Step 4: Pulisci i dati di test creati nello Step 3**

Run (via Supabase MCP `execute_sql` o SQL editor): `DELETE FROM inviti WHERE email IN ('b7-check-tecnico@test.local', 'b7-check-tenant@test.local', 'b7-refactor-check@test.local');`
Expected: righe di test rimosse, nessun dato residuo

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tecnici/invite/route.ts
git commit -m "feat(invito): POST/GET /api/tecnici/invite scoped al titolare"
```

---

### Task 8: Nuova route `/api/tecnici/invite/[id]` — DELETE (revoca), scoped al titolare

**Files:**
- Create: `src/app/api/tecnici/invite/[id]/route.ts`

**Interfaces:**
- Consumes: `verifyTitolare` (Task 5), `revocaInvito` (Task 4)

- [ ] **Step 1: Implementa la route**

```ts
// src/app/api/tecnici/invite/[id]/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServiceClient } from '@/lib/supabase/server-service'
import { verifyTitolare } from '@/lib/invito/verify-titolare'
import { revocaInvito } from '@/lib/invito/revoca-invito'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const titolare = await verifyTitolare()
  if (!titolare) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = await params
  const svc = getServiceClient()
  const result = await revocaInvito(svc, { inviteId: id, laboratorioId: titolare.laboratorioId })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verifica che compili**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 3: Verifica manuale (`npm run dev`, login come titolare lab Filippo)**

Run (crea un invito di test, prendi il suo `id` dalla risposta di `GET /api/tecnici/invite`, poi):
```bash
curl -s -X DELETE http://localhost:3000/api/tecnici/invite/<id-invito-test> -H "Cookie: <cookie sessione titolare lab Filippo>"
```
Expected: `{"success":true}`, e il successivo `GET /api/tecnici/invite` non lo include più

Run (verifica ownership — tentare di revocare un invito che appartiene a un altro lab, es. creato per il lab Arturo Pepe da un altro titolare/admin, usando la sessione del titolare Filippo):
Expected: `{"error":"Invito non trovato"}` status 404 — mai un 200 su una risorsa di un altro lab

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/tecnici/invite/[id]/route.ts"
git commit -m "feat(invito): DELETE /api/tecnici/invite/[id] revoca scoped al titolare"
```

---

### Task 9: Migration — `accept_invite_atomic()` crea la riga `tecnici` mancante

**Files:**
- Create: `supabase/migrations/20260703120000_b7_accept_invite_tecnico.sql`
- Modify: `src/types/database.types.ts` (rigenerato, non a mano)

**Interfaces:**
- Nessuna nuova funzione TypeScript — modifica solo la RPC Postgres `accept_invite_atomic`, già consumata da `src/app/api/auth/accept-invite/route.ts` (invariata).

- [ ] **Step 1 (RED): Verifica il bug attuale con uno script usa-e-getta contro il progetto Supabase live, PRIMA di applicare la migration**

Crea temporaneamente `scripts/tmp/verify-b7-tecnico.ts` (cartella già prevista da CLAUDE.md per file temporanei, mai committata):

```ts
// scripts/tmp/verify-b7-tecnico.ts — usa e getta, cancellare a fine verifica
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_LAB_ID = '314cd040-0893-4e9d-9ad8-786e4eefd75f' // Lab Arturo Pepe (test)
const TEST_EMAIL = 'b7-verify-tecnico@test.local'
const TOKEN_HASH = 'b7-verify-token-hash'

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: 'TestB7Verify!2026',
    email_confirm: true,
  })
  if (createErr || !created.user) throw new Error(`createUser fallita: ${createErr?.message}`)
  const userId = created.user.id

  const { error: insertErr } = await supabase.from('inviti').insert({
    token_hash: TOKEN_HASH,
    laboratorio_id: TEST_LAB_ID,
    email: TEST_EMAIL,
    ruolo: 'tecnico',
    created_by: userId,
  })
  if (insertErr) throw new Error(`insert invito fallito: ${insertErr.message}`)

  const { data: rpcResult, error: rpcErr } = await supabase.rpc('accept_invite_atomic', {
    p_token_hash: TOKEN_HASH,
    p_user_id: userId,
    p_user_email: TEST_EMAIL,
    p_nome: 'B7Test',
    p_cognome: 'Verify',
  })
  if (rpcErr) throw new Error(`rpc fallita: ${rpcErr.message}`)
  console.log('RPC result:', rpcResult)

  const { data: tecnicoRows } = await supabase
    .from('tecnici')
    .select('id, nome, cognome, laboratorio_id, utente_id')
    .eq('utente_id', userId)

  console.log('Righe tecnici trovate:', tecnicoRows)
  console.log(tecnicoRows && tecnicoRows.length === 1 ? '✅ PASS — riga tecnici creata' : '❌ FAIL — nessuna riga tecnici creata')

  // Cleanup — sempre eseguito, anche se l'asserzione sopra fallisce
  await supabase.from('tecnici').delete().eq('utente_id', userId)
  await supabase.from('lab_memberships').delete().eq('user_id', userId)
  await supabase.from('utenti').delete().eq('id', userId)
  await supabase.from('inviti').delete().eq('token_hash', TOKEN_HASH)
  await supabase.auth.admin.deleteUser(userId)
  console.log('Cleanup completato')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Run: `npx tsx scripts/tmp/verify-b7-tecnico.ts`
Expected: `❌ FAIL — nessuna riga tecnici creata` (la RPC attuale non crea la riga `tecnici` — questo è il bug che la migration risolve) — se invece emette PASS, fermarsi e capire perché prima di continuare, non è il comportamento atteso a questo punto

- [ ] **Step 2: Crea la migration**

```sql
-- supabase/migrations/20260703120000_b7_accept_invite_tecnico.sql
-- UÀ Migration — B7: crea automaticamente il profilo tecnici all'accettazione
-- di un invito con ruolo 'tecnico'. Senza questo fix, un tecnico invitato e
-- accettato non compare mai in /tecnici né è assegnabile ai lavori (tecnici
-- è un profilo separato da utenti — ANALISI/23_ua_database_schema.md §2.3).

CREATE OR REPLACE FUNCTION accept_invite_atomic(
  p_token_hash TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_nome TEXT,
  p_cognome TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_lab_stato TEXT;
BEGIN
  UPDATE inviti
  SET accepted_at = NOW()
  WHERE token_hash = p_token_hash
    AND accepted_at IS NULL
    AND expires_at > NOW()
  RETURNING id, email, ruolo, laboratorio_id, expires_at
  INTO v_invite;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invito non valido, già usato o scaduto');
  END IF;

  IF lower(trim(p_user_email)) <> lower(trim(v_invite.email)) THEN
    UPDATE inviti SET accepted_at = NULL WHERE id = v_invite.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Email non corrisponde');
  END IF;

  SELECT stato INTO v_lab_stato FROM laboratori WHERE id = v_invite.laboratorio_id;
  IF v_lab_stato NOT IN ('trial', 'attivo') THEN
    UPDATE inviti SET accepted_at = NULL WHERE id = v_invite.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Il laboratorio non è più accessibile');
  END IF;

  INSERT INTO utenti (id, laboratorio_id, nome, cognome, email, ruolo)
  VALUES (p_user_id, v_invite.laboratorio_id, p_nome, p_cognome, v_invite.email, v_invite.ruolo)
  ON CONFLICT (id) DO UPDATE SET
    laboratorio_id = EXCLUDED.laboratorio_id,
    nome = EXCLUDED.nome,
    cognome = EXCLUDED.cognome,
    ruolo = EXCLUDED.ruolo;

  INSERT INTO lab_memberships (user_id, laboratorio_id, ruolo)
  VALUES (p_user_id, v_invite.laboratorio_id, v_invite.ruolo)
  ON CONFLICT (user_id, laboratorio_id) DO UPDATE SET ruolo = EXCLUDED.ruolo;

  -- B7: se il ruolo è 'tecnico', crea anche il profilo tecnici — altrimenti
  -- il tecnico invitato non comparirebbe mai in /tecnici né sarebbe
  -- assegnabile ai lavori. Nessun profilo per front_desk/titolare.
  IF v_invite.ruolo = 'tecnico' THEN
    INSERT INTO tecnici (laboratorio_id, utente_id, nome, cognome)
    VALUES (v_invite.laboratorio_id, p_user_id, p_nome, p_cognome);
  END IF;

  RETURN jsonb_build_object('ok', true, 'laboratorio_id', v_invite.laboratorio_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION accept_invite_atomic(TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invite_atomic(TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;
```

- [ ] **Step 3: Applica la migration al progetto Supabase live `iagibumwjstnveqpjbwq`**

Usa lo strumento MCP `mcp__plugin_supabase_supabase__apply_migration` con `project_id: "iagibumwjstnveqpjbwq"`, `name: "b7_accept_invite_tecnico"`, `query`: contenuto del file SQL sopra. In alternativa, se il CLI Supabase è collegato in locale: `supabase db push`.
Expected: migration applicata senza errori

- [ ] **Step 4: Rigenera i types e verifica la compilazione (FASE 6b)**

Run: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
Poi rimuovi manualmente un eventuale messaggio CLI residuo in fondo al file (se presente).
Run: `npx tsc --noEmit`
Expected: 0 errori — la firma della RPC non cambia (stessi parametri/ritorno), quindi nessuna differenza di tipo attesa

- [ ] **Step 5 (GREEN): Riesegui lo script di verifica, ora deve passare**

Run: `npx tsx scripts/tmp/verify-b7-tecnico.ts`
Expected: `✅ PASS — riga tecnici creata`, seguito da `Cleanup completato`

- [ ] **Step 6: Rimuovi lo script temporaneo**

```bash
rm scripts/tmp/verify-b7-tecnico.ts
rmdir scripts/tmp 2>/dev/null || true
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260703120000_b7_accept_invite_tecnico.sql src/types/database.types.ts
git commit -m "feat(db): accept_invite_atomic crea la riga tecnici mancante per ruolo=tecnico"
```

---

### Task 10: Componente `InvitaCollaboratoreSheet` (bottom sheet, due varianti)

**Files:**
- Create: `src/components/features/tecnici/InvitaCollaboratoreSheet.tsx`
- Test: `tests/unit/InvitaCollaboratoreSheet.test.tsx`

**Interfaces:**
- Consumes: `fetch('/api/tecnici/invite')` GET/POST (Task 7), `fetch('/api/tecnici/invite/[id]')` DELETE (Task 8) — a runtime, non import diretto
- Produces: `InvitaCollaboratoreSheet({ variant: 'header' | 'cta' })` — usato da Task 11

- [ ] **Step 1: Scrivi il test che fallisce**

```tsx
// tests/unit/InvitaCollaboratoreSheet.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InvitaCollaboratoreSheet } from '../../src/components/features/tecnici/InvitaCollaboratoreSheet'

describe('InvitaCollaboratoreSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('variant="header" mostra il pulsante "Invita collaboratore"', () => {
    render(<InvitaCollaboratoreSheet variant="header" />)
    expect(screen.getByRole('button', { name: 'Invita collaboratore' })).toBeTruthy()
  })

  it('variant="cta" mostra il pulsante "Invita collaboratori →"', () => {
    render(<InvitaCollaboratoreSheet variant="cta" />)
    expect(screen.getByRole('button', { name: /Invita collaboratori/ })).toBeTruthy()
  })

  it('click sul trigger apre il bottom sheet e carica gli inviti pendenti', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        inviti: [{ id: 'inv-1', email: 'mario@rossi.it', ruolo: 'tecnico', expires_at: new Date(Date.now() + 5 * 86400000).toISOString() }],
      }),
    })
    render(<InvitaCollaboratoreSheet variant="header" />)
    fireEvent.click(screen.getByRole('button', { name: 'Invita collaboratore' }))

    expect(screen.getByRole('dialog', { name: 'Invita collaboratore' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('mario@rossi.it')).toBeTruthy())
    expect(fetch).toHaveBeenCalledWith('/api/tecnici/invite')
  })

  it('submit valido chiama POST /api/tecnici/invite con email e ruolo', async () => {
    fetchMock()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ inviti: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, message: 'Invito creato per mario@rossi.it' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ inviti: [] }) })

    render(<InvitaCollaboratoreSheet variant="header" />)
    fireEvent.click(screen.getByRole('button', { name: 'Invita collaboratore' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByPlaceholderText('nome@esempio.it'), { target: { value: 'mario@rossi.it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invia invito' }))

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(fetch).toHaveBeenCalledWith('/api/tecnici/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mario@rossi.it', ruolo: 'tecnico' }),
    })
  })

  it('submit con email vuota mostra errore senza chiamare la POST', async () => {
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({ inviti: [] }) })
    render(<InvitaCollaboratoreSheet variant="header" />)
    fireEvent.click(screen.getByRole('button', { name: 'Invita collaboratore' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Invia invito' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('email valido')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('click su "Revoca" chiama DELETE e rimuove la riga dalla lista', async () => {
    fetchMock()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          inviti: [{ id: 'inv-1', email: 'mario@rossi.it', ruolo: 'tecnico', expires_at: new Date(Date.now() + 5 * 86400000).toISOString() }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })

    render(<InvitaCollaboratoreSheet variant="header" />)
    fireEvent.click(screen.getByRole('button', { name: 'Invita collaboratore' }))
    await waitFor(() => expect(screen.getByText('mario@rossi.it')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Revoca invito a mario@rossi.it' }))

    await waitFor(() => expect(screen.queryByText('mario@rossi.it')).toBeNull())
    expect(fetch).toHaveBeenLastCalledWith('/api/tecnici/invite/inv-1', { method: 'DELETE' })
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/InvitaCollaboratoreSheet.test.tsx`
Expected: FAIL — `Cannot find module '../../src/components/features/tecnici/InvitaCollaboratoreSheet'`

- [ ] **Step 3: Implementa il componente**

```tsx
// src/components/features/tecnici/InvitaCollaboratoreSheet.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticSuccess, hapticError } from '@/lib/feedback/haptic'
import { soundNotifica, soundError } from '@/lib/feedback/sounds'

const DS = {
  sfc: 'var(--sfc, #E4DFD9)',
  elv: 'var(--elv, #EDEDEA)',
  prs: 'var(--prs, #D4CFC9)',
  t1: 'var(--t1, #1C1916)',
  t2: 'var(--t2, #4A3D33)',
  t3: 'var(--t3, #6B5C51)',
  primary: 'var(--primary, #D90012)',
  shB: 'var(--sh-b)',
  shRed: 'var(--sh-red)',
} as const

const RUOLI: Array<{ value: 'tecnico' | 'front_desk' | 'titolare'; label: string }> = [
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'front_desk', label: 'Front desk' },
  { value: 'titolare', label: 'Titolare (co-gestore)' },
]

interface InvitoPendenteView {
  id: string
  email: string
  ruolo: string
  expires_at: string
}

function giorniAllaScadenza(expiresAt: string): number {
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}

interface Props {
  variant: 'header' | 'cta'
}

export function InvitaCollaboratoreSheet({ variant }: Props) {
  const reducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [ruolo, setRuolo] = useState<'tecnico' | 'front_desk' | 'titolare'>('tecnico')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [inviti, setInviti] = useState<InvitoPendenteView[]>([])
  const [loadingInviti, setLoadingInviti] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const caricaInviti = useCallback(async () => {
    setLoadingInviti(true)
    try {
      const res = await fetch('/api/tecnici/invite')
      if (res.ok) {
        const json = await res.json()
        setInviti(json.inviti ?? [])
      }
    } finally {
      setLoadingInviti(false)
    }
  }, [])

  useEffect(() => {
    if (open) caricaInviti()
  }, [open, caricaInviti])

  const handleClose = useCallback(() => {
    setOpen(false)
    setErrore(null)
    setSuccessMsg(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (loading) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrore('Inserisci un indirizzo email valido')
      return
    }
    setLoading(true)
    setErrore(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/tecnici/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, ruolo }),
      })
      const json = await res.json()
      if (!res.ok) {
        hapticError()
        soundError()
        setErrore(json.error ?? "Errore durante l'invio dell'invito")
        return
      }
      hapticSuccess()
      soundNotifica()
      setSuccessMsg(json.message ?? `Invito inviato a ${trimmedEmail}`)
      setEmail('')
      caricaInviti()
    } catch {
      setErrore('Errore di rete — riprova')
    } finally {
      setLoading(false)
    }
  }, [email, ruolo, loading, caricaInviti])

  const handleRevoca = useCallback(async (id: string) => {
    setRevokingId(id)
    try {
      const res = await fetch(`/api/tecnici/invite/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInviti((prev) => prev.filter((i) => i.id !== id))
      }
    } finally {
      setRevokingId(null)
    }
  }, [])

  const trigger = variant === 'header' ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Invita collaboratore"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        height: '40px', minHeight: '52px', padding: '0 16px', borderRadius: '12px',
        background: DS.elv, color: DS.t1, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
        fontSize: '14px', border: 'none', boxShadow: DS.shB, flexShrink: 0, cursor: 'pointer',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10.5 8.5A2.5 2.5 0 108 6a2.5 2.5 0 002.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.5 13.5a5 5 0 019 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 6v4M1 8h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      Invita collaboratore
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 22px',
        borderRadius: '32px', background: DS.primary, color: '#fff', fontFamily: 'DM Sans, sans-serif',
        fontWeight: 700, fontSize: '14px', border: 'none', minHeight: '44px', boxShadow: DS.shRed,
        cursor: 'pointer',
      }}
    >
      Invita collaboratori →
    </button>
  )

  return (
    <>
      {trigger}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="invita-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
              onClick={handleClose}
              style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.32)' }}
            />
            <motion.div
              key="invita-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 81,
                background: DS.sfc, borderRadius: '28px 28px 0 0', maxWidth: 600, margin: '0 auto',
                maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Invita collaboratore"
            >
              <div style={{ width: 36, height: 4, background: DS.t3, borderRadius: 99, margin: '12px auto 16px' }} />

              <div style={{ padding: '0 20px 16px', flex: 1, overflowY: 'auto' }}>
                <h2 style={{ margin: '0 0 16px', fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: DS.t1 }}>
                  Invita collaboratore
                </h2>

                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                    Email
                  </span>
                  <input
                    type="email"
                    placeholder="nome@esempio.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                      background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                    }}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                    Ruolo
                  </span>
                  <select
                    value={ruolo}
                    onChange={(e) => setRuolo(e.target.value as typeof ruolo)}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                      background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                    }}
                  >
                    {RUOLI.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>

                {errore && (
                  <p role="alert" style={{ margin: '8px 0 0', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.primary }}>
                    {errore}
                  </p>
                )}
                {successMsg && (
                  <p role="status" style={{ margin: '8px 0 0', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--success, #16A34A)' }}>
                    ✓ {successMsg}
                  </p>
                )}

                {(loadingInviti || inviti.length > 0) && (
                  <div style={{ marginTop: 24 }}>
                    <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Inviti in attesa
                    </span>
                    {loadingInviti ? (
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.t2 }}>Caricamento…</p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {inviti.map((invito) => (
                          <li
                            key={invito.id}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                              background: DS.elv, borderRadius: 12, padding: '10px 12px',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: DS.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {invito.email}
                              </p>
                              <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: DS.t2 }}>
                                {invito.ruolo} — scade tra {giorniAllaScadenza(invito.expires_at)} giorni
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRevoca(invito.id)}
                              disabled={revokingId === invito.id}
                              aria-label={`Revoca invito a ${invito.email}`}
                              style={{
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                color: DS.primary, fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600,
                                padding: '6px 8px', flexShrink: 0, opacity: revokingId === invito.id ? 0.5 : 1,
                              }}
                            >
                              Revoca
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    width: '100%', minHeight: 52, borderRadius: 100, border: 'none',
                    background: DS.primary, color: '#fff', fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Invio…' : 'Invia invito'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/InvitaCollaboratoreSheet.test.tsx`
Expected: PASS — 6 test verdi

- [ ] **Step 5: Commit**

```bash
git add src/components/features/tecnici/InvitaCollaboratoreSheet.tsx tests/unit/InvitaCollaboratoreSheet.test.tsx
git commit -m "feat(tecnici): InvitaCollaboratoreSheet — bottom sheet invito + inviti pendenti + revoca"
```

---

### Task 11: Wire — sostituisci i link rotti in `/tecnici` con `InvitaCollaboratoreSheet`

**Files:**
- Modify: `src/app/(app)/tecnici/page.tsx:1-9,46-78,120-141`

**Interfaces:**
- Consumes: `InvitaCollaboratoreSheet` (Task 10)

- [ ] **Step 1: Aggiungi l'import**

In cima al file, dopo gli import esistenti:

```ts
import { InvitaCollaboratoreSheet } from '@/components/features/tecnici/InvitaCollaboratoreSheet'
```

- [ ] **Step 2: Sostituisci il blocco `invitaButton` (righe 46-78 circa, dal commento `// Pulsante "Invita tecnico" nell'header — BUG #9` fino alla chiusura del `<Link>`)**

Rimuovi l'intero blocco JSX di `invitaButton` (il `<Link href="/impostazioni">...</Link>` con l'SVG) e sostituiscilo con:

```tsx
  const invitaButton = ruolo === 'titolare' ? <InvitaCollaboratoreSheet variant="header" /> : null
```

- [ ] **Step 3: Sostituisci il CTA dell'empty state (il `<Link href="/impostazioni">Invita collaboratori →</Link>` intorno alla riga 120-141)**

Sostituisci quel blocco `<Link>` con:

```tsx
            {ruolo === 'titolare' && <InvitaCollaboratoreSheet variant="cta" />}
```

- [ ] **Step 4: Verifica che compili**

Run: `npx tsc --noEmit`
Expected: 0 errori (l'import `Link` resta usato altrove nel file per "Produttività", non va rimosso)

- [ ] **Step 5: Verifica che i test esistenti passino**

Run: `npx vitest run`
Expected: tutti i test passano, incluso il nuovo `InvitaCollaboratoreSheet.test.tsx`

- [ ] **Step 6: Verifica manuale nel browser (`npm run dev`)**

Naviga su `/tecnici` autenticato come titolare (`h4t@live.it`): il pulsante header ora si chiama "Invita collaboratore" e apre il bottom sheet invece di navigare a `/impostazioni`. Naviga su `/tecnici` autenticato come tecnico o front_desk: nessun pulsante invito visibile (solo titolare può invitare).
Expected: comportamento come descritto, nessun link rotto residuo

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/tecnici/page.tsx"
git commit -m "fix(tecnici): sostituisce i link rotti con InvitaCollaboratoreSheet (B7)"
```

---

### Task 12: Verifica finale end-to-end e QA multi-viewport

**Files:** nessuno (solo verifica)

- [ ] **Step 1: Suite completa**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: 0 errori TypeScript, tutti i test verdi (compresi i 4 nuovi file lib + il nuovo componente), build production pulita

- [ ] **Step 2: QA Playwright multi-viewport, multi-tema (FASE 9 CLAUDE.md)**

Login come titolare lab Filippo (`h4t@live.it`), naviga su `/tecnici` a 390px, 768px, 1280px, in light e dark:
- Il bottom sheet "Invita collaboratore" si apre/chiude correttamente in tutti e 3 i viewport
- Selettore ruolo mostra le 3 opzioni (Tecnico, Front desk, Titolare)
- Un invio con email valida mostra il messaggio di conferma e l'invito appare in "Inviti in attesa"
- Revoca rimuove l'invito dalla lista
- Nessun colore bandito (`#1B2D6B`), nessuna shadow raised in dark mode
Expected: nessuna regressione visiva, comportamento identico nei 3 viewport

- [ ] **Step 3: Flusso end-to-end reale (opzionale ma raccomandato prima del merge)**

Invita un tecnico reale con un'email di test raggiungibile, accetta l'invito dal link ricevuto, verifica che il nuovo tecnico compaia in `/tecnici` con nome/cognome corretti (sigla/qualifica vuoti, modificabili da `TecnicoEditInline`).
Expected: il tecnico compare nella lista subito dopo l'accettazione — il problema originale di B7 è risolto end-to-end

- [ ] **Step 4: Aggiorna la memoria di progetto (BP-1, FASE 11 CLAUDE.md)**

Aggiorna `memory/MEMORY.md` (sezione "0. STATO DEL PROGETTO", nuova voce B7 risolto) e `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (B7 → ✅ risolto). Non fare commit di questo step insieme al codice — è parte della chiusura di sessione, non dell'implementazione.
