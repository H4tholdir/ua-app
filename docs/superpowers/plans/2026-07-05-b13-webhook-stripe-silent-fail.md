# B13 (2/2) — Fallimento silenzioso webhook Stripe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare i due punti di fallimento silenzioso nel webhook Stripe (`src/lib/stripe/webhook-handlers.ts`) che oggi fanno rispondere 200 a Stripe anche quando una transizione di stato dell'abbonamento SaaS non è mai avvenuta, impedendo a Stripe di ritentare.

**Architecture:** `transitionLabStato()` guadagna un campo `retryable?: boolean` (true solo per il caso "Lab non trovato"). `findLabBySubscription()` lancia un'eccezione invece di ritornare `null` silenzioso. Un nuovo helper `assertTransitionOk()` centralizza la logica throw-se-retryable/log-se-terminale sui 5 call site di `transitionLabStato()`. Le eccezioni lanciate si propagano naturalmente al `try/catch` già esistente in `route.ts` (invariato), che elimina la riga di idempotenza in `stripe_events` e risponde 500 — Stripe ritenta secondo la sua policy standard.

**Tech Stack:** TypeScript, Next.js 16, Supabase, Stripe SDK, Vitest.

## Global Constraints

- Nessuna migration DB — il vincolo `UNIQUE` su `laboratori.stripe_subscription_id` esiste già, verificato sul DB live (`iagibumwjstnveqpjbwq`).
- `src/app/api/stripe/webhook/route.ts` NON va toccato — il suo `try/catch` (righe 56-81) già gestisce correttamente qualunque eccezione lanciata da un handler (log, delete della riga `stripe_events`, risposta 500).
- TDD rigoroso: ogni comportamento nuovo ha un test che fallisce PRIMA dell'implementazione.
- Verifica finale per ogni task: `npx tsc --noEmit` (zero errori) + `npx vitest run` (nessuna regressione sul baseline di questo worktree: `481 passed | 4 skipped (485)`).
- Commit atomico per task, messaggio in stile `fix(stripe): ...` o `test(stripe): ...`.

---

### Task 1: `transitionLabStato()` — campo `retryable`

**Files:**
- Modify: `src/lib/stripe/state-machine.ts`
- Create: `tests/unit/state-machine.test.ts`

**Interfaces:**
- Produces: `transitionLabStato(...): Promise<{ success: boolean; error?: string; retryable?: boolean }>` — usato da Task 2/3 per decidere throw vs log.

- [ ] **Step 1: Scrivi i 4 test (RED per il primo, baseline per gli altri 3)**

Crea `tests/unit/state-machine.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { transitionLabStato } from '../../src/lib/stripe/state-machine'
import type { SupabaseClient } from '@supabase/supabase-js'

function fakeSupabase(labRow: { stato: string; last_stripe_event_at: string | null } | null): SupabaseClient {
  return {
    from: (table: string) => {
      if (table === 'laboratori') {
        return {
          select: () => createChain({ data: labRow, error: labRow ? null : { message: 'no rows' } }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      if (table === 'lab_stato_log') {
        return { insert: async () => ({ error: null }) }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    },
  } as unknown as SupabaseClient
}

describe('transitionLabStato', () => {
  it('ritorna retryable:true quando il lab non viene trovato', async () => {
    const supabase = fakeSupabase(null)
    const result = await transitionLabStato(supabase, 'lab-inesistente', 'attivo', 'stripe_webhook')
    expect(result).toEqual({ success: false, error: 'Lab non trovato', retryable: true })
  })

  it('non imposta retryable per lo stato blacklist (terminale)', async () => {
    const supabase = fakeSupabase({ stato: 'blacklist', last_stripe_event_at: null })
    const result = await transitionLabStato(supabase, 'lab-1', 'attivo', 'stripe_webhook')
    expect(result.success).toBe(false)
    expect(result.retryable).toBeUndefined()
  })

  it('non imposta retryable per una transizione non consentita', async () => {
    const supabase = fakeSupabase({ stato: 'scaduto', last_stripe_event_at: null })
    const result = await transitionLabStato(supabase, 'lab-1', 'attivo', 'stripe_webhook')
    expect(result.success).toBe(false)
    expect(result.retryable).toBeUndefined()
  })

  it('ritorna success:true su una transizione valida (happy path)', async () => {
    const supabase = fakeSupabase({ stato: 'trial', last_stripe_event_at: null })
    const result = await transitionLabStato(supabase, 'lab-1', 'attivo', 'stripe_webhook')
    expect(result).toEqual({ success: true })
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che il primo fallisca**

Run: `npx vitest run tests/unit/state-machine.test.ts`
Expected: il primo test (`ritorna retryable:true...`) FALLISCE — `result.retryable` è `undefined` invece di `true` (il campo non esiste ancora nel tipo di ritorno). Gli altri 3 test PASSANO già (comportamento invariato).

- [ ] **Step 3: Aggiungi il campo `retryable` in `state-machine.ts`**

In `src/lib/stripe/state-machine.ts`, cambia la firma di ritorno (riga 29) e il ramo "Lab non trovato" (righe 36-38):

```typescript
export async function transitionLabStato(
  supabase: SupabaseClient,
  laboratorioId: string,
  newStato: LaboStatoValue,
  source: 'stripe_webhook' | 'admin' | 'system',
  opts: {
    actor?: string
    stripeEventId?: string
    stripeEventCreatedAt?: Date
    extraFields?: Record<string, unknown>
  } = {}
): Promise<{ success: boolean; error?: string; retryable?: boolean }> {
  const { data: lab, error: fetchErr } = await supabase
    .from('laboratori')
    .select('stato, last_stripe_event_at')
    .eq('id', laboratorioId)
    .single()

  if (fetchErr || !lab) {
    return { success: false, error: 'Lab non trovato', retryable: true }
  }
```

Il resto della funzione (righe 40-93) resta invariato.

- [ ] **Step 4: Esegui i test e verifica che passino tutti (GREEN)**

Run: `npx vitest run tests/unit/state-machine.test.ts`
Expected: PASS — tutti e 4 i test.

- [ ] **Step 5: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: `485 passed | 4 skipped (489)` (481 baseline + 4 nuovi test).

- [ ] **Step 6: Commit**

```bash
git add src/lib/stripe/state-machine.ts tests/unit/state-machine.test.ts
git commit -m "$(cat <<'EOF'
feat(stripe): aggiungi campo retryable a transitionLabStato

Distingue il caso "Lab non trovato" (retryable — race documentata tra
checkout.session.completed e gli eventi invoice.* successivi) dai casi
terminali (blacklist, transizione non consentita — un retry non
cambierebbe nulla). Prerequisito per far ritentare Stripe solo quando
ha senso (B13 2/2).
EOF
)"
```

---

### Task 2: `findLabBySubscription()` — throw invece di `null` silenzioso

**Files:**
- Modify: `src/lib/stripe/webhook-handlers.ts`
- Create: `tests/unit/webhook-handlers.test.ts`

**Interfaces:**
- Consumes: `transitionLabStato(...): Promise<{ success: boolean; error?: string; retryable?: boolean }>` (Task 1) — mockato in questo task, non ancora controllato dagli handler (Task 3).
- Produces: `findLabBySubscription(supabase, subId): Promise<{ id: string; stato: string }>` (non più nullable) — usata internamente dai 4 handler, non esportata.

Questo task stabilisce anche l'intero scaffold di test (fixture eventi Stripe, helper mock Supabase) riusato da Task 3.

- [ ] **Step 1: Scrivi lo scaffold di test + i test per questo task**

Crea `tests/unit/webhook-handlers.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import type Stripe from 'stripe'

const { mockTransitionLabStato } = vi.hoisted(() => ({
  mockTransitionLabStato: vi.fn(),
}))

vi.mock('@/lib/stripe/state-machine', () => ({
  transitionLabStato: mockTransitionLabStato,
}))

import {
  handleCheckoutCompleted,
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '../../src/lib/stripe/webhook-handlers'

function checkoutEvent(): Stripe.Event {
  return {
    id: 'evt_checkout_1',
    created: 1751500000,
    data: {
      object: {
        client_reference_id: 'lab-1',
        metadata: {},
        subscription: 'sub_123',
        customer: 'cus_123',
        line_items: { data: [{ price: { id: 'price_123' } }] },
      },
    },
  } as unknown as Stripe.Event
}

function invoiceEvent(subId: string | null, nextPaymentAttempt: number | null = null): Stripe.Event {
  return {
    id: 'evt_invoice_1',
    created: 1751500000,
    data: {
      object: {
        parent: subId ? { subscription_details: { subscription: subId } } : null,
        next_payment_attempt: nextPaymentAttempt,
      },
    },
  } as unknown as Stripe.Event
}

function subscriptionEvent(id: string, status: string): Stripe.Event {
  return {
    id: 'evt_subscription_1',
    created: 1751500000,
    data: {
      object: {
        id,
        status,
        items: { data: [{ price: { id: 'price_456' } }] },
      },
    },
  } as unknown as Stripe.Event
}

function fakeSupabaseFound(lab: { id: string; stato: string }) {
  return {
    from: (table: string) => {
      if (table === 'laboratori') {
        return {
          select: () => createChain({ data: lab, error: null }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    },
  } as any
}

function fakeSupabaseNotFound() {
  return {
    from: (table: string) => {
      if (table === 'laboratori') {
        return { select: () => createChain({ data: null, error: { message: 'no rows' } }) }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    },
  } as any
}

describe('webhook-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransitionLabStato.mockResolvedValue({ success: true })
  })

  describe('handleCheckoutCompleted', () => {
    it('happy path: chiama transitionLabStato con i dati corretti', async () => {
      await handleCheckoutCompleted(checkoutEvent(), fakeSupabaseFound({ id: 'lab-1', stato: 'trial' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(
        expect.anything(), 'lab-1', 'attivo', 'stripe_webhook',
        expect.objectContaining({ extraFields: expect.objectContaining({ stripe_subscription_id: 'sub_123' }) })
      )
    })
  })

  describe('handlePaymentSucceeded', () => {
    it('happy path', async () => {
      await handlePaymentSucceeded(invoiceEvent('sub_123'), fakeSupabaseFound({ id: 'lab-1', stato: 'trial' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'attivo', 'stripe_webhook', expect.anything())
    })

    it('lancia se il lab non viene trovato per la subscription (race checkout/invoice)', async () => {
      await expect(handlePaymentSucceeded(invoiceEvent('sub_sconosciuto'), fakeSupabaseNotFound()))
        .rejects.toThrow()
      expect(mockTransitionLabStato).not.toHaveBeenCalled()
    })
  })

  describe('handlePaymentFailed', () => {
    it('non fa nulla se next_payment_attempt non è null (Stripe sta ancora ritentando)', async () => {
      await handlePaymentFailed(invoiceEvent('sub_123', 123456), fakeSupabaseFound({ id: 'lab-1', stato: 'attivo' }))
      expect(mockTransitionLabStato).not.toHaveBeenCalled()
    })

    it('happy path quando i retry Stripe sono esauriti', async () => {
      await handlePaymentFailed(invoiceEvent('sub_123', null), fakeSupabaseFound({ id: 'lab-1', stato: 'attivo' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'sospeso', 'stripe_webhook', expect.anything())
    })

    it('lancia se il lab non viene trovato quando i retry sono esauriti', async () => {
      await expect(handlePaymentFailed(invoiceEvent('sub_sconosciuto', null), fakeSupabaseNotFound()))
        .rejects.toThrow()
    })
  })

  describe('handleSubscriptionDeleted', () => {
    it('happy path', async () => {
      await handleSubscriptionDeleted(subscriptionEvent('sub_123', 'canceled'), fakeSupabaseFound({ id: 'lab-1', stato: 'attivo' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'scaduto', 'stripe_webhook', expect.anything())
    })

    it('lancia se il lab non viene trovato', async () => {
      await expect(handleSubscriptionDeleted(subscriptionEvent('sub_sconosciuto', 'canceled'), fakeSupabaseNotFound()))
        .rejects.toThrow()
    })
  })

  describe('handleSubscriptionUpdated', () => {
    it('ripristina attivo se il lab era sospeso e Stripe segnala active', async () => {
      await handleSubscriptionUpdated(subscriptionEvent('sub_123', 'active'), fakeSupabaseFound({ id: 'lab-1', stato: 'sospeso' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'attivo', 'stripe_webhook', expect.anything())
    })

    it('lancia se il lab non viene trovato', async () => {
      await expect(handleSubscriptionUpdated(subscriptionEvent('sub_sconosciuto', 'active'), fakeSupabaseNotFound()))
        .rejects.toThrow()
    })
  })
})
```

- [ ] **Step 2: Esegui i test e verifica quali falliscono**

Run: `npx vitest run tests/unit/webhook-handlers.test.ts`
Expected: FALLISCONO i 4 test "lancia se il lab non viene trovato" (in `handlePaymentSucceeded`, `handlePaymentFailed`, `handleSubscriptionDeleted`, `handleSubscriptionUpdated`) — oggi `findLabBySubscription` ritorna `null` silenziosamente e l'handler fa `return` senza lanciare, quindi `.rejects.toThrow()` non trova alcun rifiuto. Tutti gli altri test (happy path) PASSANO già (comportamento attuale invariato per il caso successo).

- [ ] **Step 3: Implementa il throw in `findLabBySubscription`**

In `src/lib/stripe/webhook-handlers.ts`, sostituisci la funzione (righe 36-46):

```typescript
async function findLabBySubscription(
  supabase: SupabaseClient,
  subId: string
): Promise<{ id: string; stato: string }> {
  const { data, error } = await supabase
    .from('laboratori')
    .select('id, stato')
    .eq('stripe_subscription_id', subId)
    .single()
  if (error || !data) {
    throw new Error(`Lab non trovato per stripe_subscription_id=${subId}: ${error?.message ?? 'nessuna riga'}`)
  }
  return data
}
```

- [ ] **Step 4: Rimuovi i controlli `if (!lab) return` ormai morti nei 4 call site**

In `handlePaymentSucceeded` (riga 71-72), rimuovi la riga `if (!lab) return`:

```typescript
export async function handlePaymentSucceeded(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  const subId = getInvoiceSubId(invoice)
  if (!subId) return

  const lab = await findLabBySubscription(supabase, subId)

  // Atomico: stato + stripe_subscription_status in un singolo UPDATE
  await transitionLabStato(supabase, lab.id, 'attivo', 'stripe_webhook', {
    ...stripeOpts(event),
    extraFields: { stripe_subscription_status: 'active' },
  })
}
```

Stesso identico cambio (rimuovi `if (!lab) return`) in `handlePaymentFailed` (riga 93-94), `handleSubscriptionDeleted` (riga 109-110), e `handleSubscriptionUpdated` (riga 125-126) — in ciascuno la riga `const lab = await findLabBySubscription(supabase, ...)` resta, solo la riga di guardia successiva va rimossa.

- [ ] **Step 5: Esegui i test e verifica che passino tutti (GREEN)**

Run: `npx vitest run tests/unit/webhook-handlers.test.ts`
Expected: PASS — tutti i 10 test.

- [ ] **Step 6: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore (verifica in particolare che il tipo di ritorno non più nullable di `findLabBySubscription` non causi errori residui nei 4 call site).

Run: `npx vitest run`
Expected: `495 passed | 4 skipped (499)` (485 dopo Task 1 + 10 nuovi test).

- [ ] **Step 7: Commit**

```bash
git add src/lib/stripe/webhook-handlers.ts tests/unit/webhook-handlers.test.ts
git commit -m "$(cat <<'EOF'
fix(stripe): findLabBySubscription lancia invece di ritornare null

4 dei 5 handler webhook (handlePaymentSucceeded, handlePaymentFailed,
handleSubscriptionDeleted, handleSubscriptionUpdated) risolvevano il
lab tramite questa funzione e uscivano silenziosamente se non trovato
— senza mai raggiungere transitionLabStato(), quindi senza mai far
ritentare Stripe sulla race checkout/invoice già documentata nel
codice. Ora l'eccezione si propaga al try/catch esistente in
route.ts, che fa rispondere 500 e Stripe ritenta.
EOF
)"
```

---

### Task 3: Helper `assertTransitionOk()` + wiring sui 5 handler + fix ramo metadata-only

**Files:**
- Modify: `src/lib/stripe/webhook-handlers.ts`
- Modify: `tests/unit/webhook-handlers.test.ts`

**Interfaces:**
- Consumes: `transitionLabStato(...): Promise<{ success: boolean; error?: string; retryable?: boolean }>` (Task 1).
- Produces: `assertTransitionOk(result, context): void` (privata, non esportata) — throw se `retryable`, `console.error` altrimenti quando `!success`.

- [ ] **Step 1: Aggiungi i test per questo task**

Aggiungi in fondo al file `tests/unit/webhook-handlers.test.ts`, dentro il blocco `describe('webhook-handlers', ...)`, dopo l'ultimo `describe` esistente (`handleSubscriptionUpdated`) ma prima della sua chiusura `})` finale — cioè come nuovi test AGGIUNTIVI dentro `describe('handleCheckoutCompleted', ...)` e un nuovo blocco per il ramo metadata-only:

Nel blocco `describe('handleCheckoutCompleted', ...)` esistente, aggiungi dopo il test "happy path":

```typescript
    it('lancia se transitionLabStato fallisce in modo retryable', async () => {
      mockTransitionLabStato.mockResolvedValue({ success: false, error: 'Lab non trovato', retryable: true })
      await expect(
        handleCheckoutCompleted(checkoutEvent(), fakeSupabaseFound({ id: 'lab-1', stato: 'trial' }))
      ).rejects.toThrow('Lab non trovato')
    })

    it('non lancia se transitionLabStato fallisce in modo terminale (solo log)', async () => {
      mockTransitionLabStato.mockResolvedValue({ success: false, error: 'Stato blacklist è terminale' })
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(
        handleCheckoutCompleted(checkoutEvent(), fakeSupabaseFound({ id: 'lab-1', stato: 'trial' }))
      ).resolves.toBeUndefined()
      expect(errSpy).toHaveBeenCalled()
      errSpy.mockRestore()
    })
```

Nel blocco `describe('handleSubscriptionUpdated', ...)` esistente, aggiungi un terzo test:

```typescript
    it('ramo metadata-only: logga se l\'update fallisce, senza lanciare', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const supabase = {
        from: (table: string) => {
          if (table === 'laboratori') {
            return {
              select: () => createChain({ data: { id: 'lab-1', stato: 'attivo' }, error: null }),
              update: () => ({ eq: async () => ({ error: { message: 'update fallito' } }) }),
            }
          }
          throw new Error(`Tabella inattesa nel mock: ${table}`)
        },
      } as any
      await expect(
        handleSubscriptionUpdated(subscriptionEvent('sub_123', 'past_due'), supabase)
      ).resolves.toBeUndefined()
      expect(mockTransitionLabStato).not.toHaveBeenCalled()
      expect(errSpy).toHaveBeenCalled()
      errSpy.mockRestore()
    })
```

- [ ] **Step 2: Esegui i test e verifica quali falliscono**

Run: `npx vitest run tests/unit/webhook-handlers.test.ts`
Expected: FALLISCE il test "lancia se transitionLabStato fallisce in modo retryable" (oggi nessun handler controlla `.success`, quindi non lancia nulla). Il test "non lancia... solo log" PASSA già per coincidenza (nessun controllo = nessun throw = comportamento attuale già "non lancia", ma senza il log — questo test passerà anche prima del fix, la sua vera funzione è di regressione dopo il fix, non RED puro). Il test del ramo metadata-only FALLISCE se l'assert su `errSpy` non trova nessuna chiamata (l'update fallito oggi non viene mai loggato).

- [ ] **Step 3: Implementa `assertTransitionOk` e il fix del ramo metadata-only**

In `src/lib/stripe/webhook-handlers.ts`, aggiungi la nuova funzione subito dopo `stripeOpts()` (dopo la riga con la sua chiusura `}`):

```typescript
function assertTransitionOk(
  result: { success: boolean; error?: string; retryable?: boolean },
  context: Record<string, unknown>
): void {
  if (result.success) return
  if (result.retryable) {
    throw new Error(result.error ?? 'transitionLabStato fallita')
  }
  console.error('[webhook] transizione di stato non applicata (non retryable):', result.error, context)
}
```

Poi aggiorna le 5 chiamate a `transitionLabStato` per usarlo:

In `handleCheckoutCompleted`:
```typescript
  const result = await transitionLabStato(supabase, labId, 'attivo', 'stripe_webhook', {
    ...stripeOpts(event),
    extraFields: {
      stripe_subscription_id: subId,
      stripe_customer_id: customerId ?? null,
      stripe_price_id: priceId,
      stripe_subscription_status: 'active',
    },
  })
  assertTransitionOk(result, { labId, eventType: event.type })
```

In `handlePaymentSucceeded`:
```typescript
  const result = await transitionLabStato(supabase, lab.id, 'attivo', 'stripe_webhook', {
    ...stripeOpts(event),
    extraFields: { stripe_subscription_status: 'active' },
  })
  assertTransitionOk(result, { labId: lab.id, eventType: event.type })
```

In `handlePaymentFailed`:
```typescript
  const result = await transitionLabStato(supabase, lab.id, 'sospeso', 'stripe_webhook', {
    ...stripeOpts(event),
    extraFields: { stripe_subscription_status: 'past_due' },
  })
  assertTransitionOk(result, { labId: lab.id, eventType: event.type })
```

In `handleSubscriptionDeleted`:
```typescript
  const result = await transitionLabStato(supabase, lab.id, 'scaduto', 'stripe_webhook', {
    ...stripeOpts(event),
    extraFields: { stripe_subscription_status: 'canceled' },
  })
  assertTransitionOk(result, { labId: lab.id, eventType: event.type })
```

In `handleSubscriptionUpdated`, ramo di transizione (if):
```typescript
  if (subscription.status === 'active' && lab.stato === 'sospeso') {
    const result = await transitionLabStato(supabase, lab.id, 'attivo', 'stripe_webhook', {
      ...stripeOpts(event),
      extraFields: {
        stripe_subscription_status: subscription.status,
        stripe_price_id: subscription.items.data[0]?.price.id ?? null,
      },
    })
    assertTransitionOk(result, { labId: lab.id, eventType: event.type })
  } else {
    const { error: updateErr } = await supabase
      .from('laboratori')
      .update({
        stripe_subscription_status: subscription.status,
        stripe_price_id: subscription.items.data[0]?.price.id ?? null,
      })
      .eq('id', lab.id)
    if (updateErr) {
      console.error('[webhook] handleSubscriptionUpdated: aggiornamento metadata fallito:', updateErr.message, { labId: lab.id })
    }
  }
```

- [ ] **Step 4: Esegui i test e verifica che passino tutti (GREEN)**

Run: `npx vitest run tests/unit/webhook-handlers.test.ts`
Expected: PASS — tutti i 13 test (10 di Task 2 + 3 nuovi).

- [ ] **Step 5: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: `498 passed | 4 skipped (502)` (495 dopo Task 2 + 3 nuovi test).

Run: `npx next build`
Expected: build production pulita, nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stripe/webhook-handlers.ts tests/unit/webhook-handlers.test.ts
git commit -m "$(cat <<'EOF'
fix(stripe): assertTransitionOk su tutti gli handler + fix ramo metadata-only

Centralizza in un helper la logica throw-se-retryable/log-se-terminale
dopo ogni chiamata a transitionLabStato() nei 5 handler webhook —
evita di duplicarla 5 volte. Il ramo "solo aggiornamento metadata" di
handleSubscriptionUpdated ora logga anche l'errore del proprio update
diretto, prima ignorato silenziosamente. Chiude B13 (2/2).
EOF
)"
```

---

### Task 4: Verifica finale e aggiornamento memoria progetto

**Files:**
- Modify: `memory/MEMORY.md`
- Modify: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B13)
- Modify: `memory/SESSION_ACTIVE.md`

Nessun nuovo codice in questo task — solo verifica end-to-end e aggiornamento della documentazione obbligatoria (BP-1, CLAUDE.md §0A).

- [ ] **Step 1: Verifica finale completa**

Run: `npx tsc --noEmit`
Expected: 0 errori.

Run: `npx vitest run`
Expected: `498 passed | 4 skipped (502)`.

Run: `npx next build`
Expected: build production pulita, nessun errore, manifest generato correttamente (inclusa `/api/stripe/webhook`).

- [ ] **Step 2: Aggiorna `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`**

Trova la riga della tabella di stato per B13 (dovrebbe già mostrare `🔄` e la nota "B13 (1/2)... risolto — ... B13 (2/2, webhook Stripe) resta aperto"). Cambia il simbolo di stato da `🔄` a `✅` e aggiorna la nota per riflettere che ANCHE la parte 2/2 è ora risolta: "✅ B13 (1/2, idempotenza DdC/Buono) e B13 (2/2, webhook Stripe silent-fail) entrambi risolti — vedi `memory/MEMORY.md` §0." Nella sezione narrativa `### B13.` più sotto nel file, aggiungi un nuovo paragrafo (non riscrivere quello esistente) che descrive il fix di questo piano: `retryable` su `transitionLabStato()`, `findLabBySubscription()` che lancia, helper `assertTransitionOk()`, fix del ramo metadata-only — con riferimento a `docs/superpowers/specs/2026-07-05-b13-webhook-stripe-silent-fail-design.md` e `docs/superpowers/plans/2026-07-05-b13-webhook-stripe-silent-fail.md`.

- [ ] **Step 3: Aggiorna `memory/MEMORY.md`**

Aggiungi una nuova voce in testa al file (sopra l'attuale prima voce, che è quella di B13 1/2) con lo stesso stile prosa densa già usato nel file: cosa era rotto (2 punti di fallimento silenzioso — `transitionLabStato()` mai controllata da nessun handler, e soprattutto `findLabBySubscription()` che ignorava l'errore Supabase e faceva uscire silenziosamente 4 handler su 5 prima ancora di raggiungere `transitionLabStato()`), causa radice (race documentata tra `checkout.session.completed` e gli eventi `invoice.*`), fix (campo `retryable`, throw in `findLabBySubscription`, helper `assertTransitionOk`, fix ramo metadata-only), verifica (`tsc`/`vitest` — `498 passed/4 skipped`, era `481`/`next build` puliti), riferimenti a spec e piano, nota che il vincolo UNIQUE ipotizzato mancante su `stripe_subscription_id` era in realtà già presente (verificato sul DB live, nessuna migration necessaria). Specifica chiaramente: **con questo lavoro, B13 è COMPLETO (1/2 e 2/2 entrambi risolti)** — nessuna parte residua nel backlog.

- [ ] **Step 4: Aggiorna `memory/SESSION_ACTIVE.md`**

Sostituisci il contenuto (non appendere) con un handoff sintetico: B13 completo (1/2 e 2/2), non ancora mergiato su `main` in questo worktree, prossima priorità da decidere con Francesco tra i blocker rimanenti (B5, B6, B11, B12, B14, B15, B16, B17).

- [ ] **Step 5: Commit della documentazione**

```bash
git add memory/MEMORY.md memory/SESSION_ACTIVE.md docs/roadmap/BACKLOG-TECNICO-2026-07-02.md
git commit -m "$(cat <<'EOF'
docs: aggiorna memoria progetto — B13 (2/2) webhook Stripe completato

B13 ora COMPLETO (1/2 idempotenza DdC/Buono + 2/2 silent-fail webhook
Stripe). Fix verificato: tsc/vitest/next build puliti (498 passed/4
skipped). Nessuna migration necessaria (vincolo UNIQUE già esistente).
EOF
)"
```

## Nota su isolamento (worktree)

Eseguito nel worktree `worktree-b13-webhook-stripe-silent-fail` (branch `worktree-worktree-b13-webhook-stripe-silent-fail`), separato dal worktree di B13 (1/2) già mergiato e rimosso. Nessuna migration, impatto contenuto a 2 file di produzione (`state-machine.ts`, `webhook-handlers.ts`) + 2 nuovi file di test.
