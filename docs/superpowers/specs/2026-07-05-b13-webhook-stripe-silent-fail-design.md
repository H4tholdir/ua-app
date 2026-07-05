# B13 (2/2) — Fallimento silenzioso negli handler webhook Stripe

**Data:** 05/07/2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B13 ("Zero test su `orchestraConsegna`/Stripe webhook")
**Stato:** Design approvato, in attesa di piano implementativo
**Nota di scope:** secondo e ultimo piano di B13. Il primo (`docs/superpowers/specs/2026-07-05-b13-ddc-buono-idempotenza-design.md`) è già risolto, mergiato e deployato.

## Contesto

`POST /api/stripe/webhook` (`src/app/api/stripe/webhook/route.ts`) gestisce 5 tipi di evento tramite altrettanti handler in `src/lib/stripe/webhook-handlers.ts`, tutti basati su `transitionLabStato()` (`src/lib/stripe/state-machine.ts`) per applicare la transizione di stato dell'abbonamento SaaS del laboratorio (`trial→attivo→sospeso→scaduto→blacklist`).

**Il bug ha due manifestazioni distinte, non una sola:**

1. **`transitionLabStato()` ritorna `{ success: boolean; error?: string }` ma nessuno dei 5 handler controlla mai `.success`.** La funzione fallisce in 3 casi (`state-machine.ts:36-53`): (a) `fetchErr || !lab` → "Lab non trovato" — genuinamente **retryable**, race documentata nel commento di `webhook-handlers.ts:7` ("MUST run before any invoice.* handlers can find the lab") tra `checkout.session.completed` e gli eventi `invoice.*` successivi; (b) `currentStato === 'blacklist'` → "Stato blacklist è terminale" — **terminale**, un retry non cambierebbe nulla; (c) `!canTransition(currentStato, newStato)` → transizione non consentita — **terminale**, stesso discorso. Con nessun controllo, il webhook risponde sempre 200 a Stripe anche quando la transizione (a) non è mai avvenuta — Stripe non ritenta mai, l'evento va perso senza log né alert.

2. **Manifestazione più comune, non coperta dal punto 1:** 4 dei 5 handler (`handlePaymentSucceeded`, `handlePaymentFailed`, `handleSubscriptionDeleted`, `handleSubscriptionUpdated`) risolvono prima il laboratorio tramite `findLabBySubscription()` (`webhook-handlers.ts:36-46`), che **ignora completamente l'errore Supabase** (`const { data } = await ...`, `error` mai destrutturato) e ritorna `null` su qualunque fallimento — sia "lab non ancora trovato per via della race" sia un vero errore DB. Ogni handler poi fa `if (!lab) return` **senza mai arrivare a `transitionLabStato()`**. Solo `handleCheckoutCompleted` chiama `transitionLabStato()` direttamente (nessun lookup preventivo tramite `findLabBySubscription`). Un fix limitato al punto 1 coprirebbe quindi solo 1 handler su 5.

3. **Punto minore correlato:** il ramo "solo aggiornamento metadata" di `handleSubscriptionUpdated` (righe 138-147, quando `subscription.status !== 'active'` o il lab non era sospeso) fa un `.update()` diretto su `laboratori` il cui errore non viene mai controllato.

**Verificato prima di procedere (non serve più):** ipotizzavo un vincolo `UNIQUE` mancante su `laboratori.stripe_subscription_id` (rischio cross-tenant teorico). Query diretta sul DB live (`iagibumwjstnveqpjbwq`) conferma che **il vincolo esiste già** (`laboratori_stripe_subscription_id_key`, oltre a `laboratori_stripe_customer_id_key`) — 3 laboratori totali, 0 con `stripe_subscription_id` valorizzato, quindi zero duplicati possibili. **Nessuna migration in questo piano.**

## Design

### 1. `transitionLabStato()` — nuovo campo `retryable`

`src/lib/stripe/state-machine.ts`: il tipo di ritorno diventa `Promise<{ success: boolean; error?: string; retryable?: boolean }>`. Solo il ramo "Lab non trovato" aggiunge `retryable: true`:

```typescript
if (fetchErr || !lab) {
  return { success: false, error: 'Lab non trovato', retryable: true }
}
```

I rami `blacklist` e "transizione non consentita" restano invariati (nessun campo `retryable` → `undefined`, falsy). Nessun altro comportamento della funzione cambia (idempotenza same-state, guardia sull'ordine eventi Stripe via `last_stripe_event_at`, audit log best-effort — tutti già corretti e non toccati).

### 2. `findLabBySubscription()` — throw invece di `null` silenzioso

`src/lib/stripe/webhook-handlers.ts`: la funzione cambia firma da `Promise<{ id: string; stato: string } | null>` a `Promise<{ id: string; stato: string }>` (non più nullable):

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

Non serve distinguere retryable/terminale qui: non esiste un caso legittimo di "subscription_id sconosciuto per sempre" — o è la race checkout/invoice (si risolve al prossimo retry, quando `checkout.session.completed` sarà stato processato), o è un'anomalia reale che va comunque segnalata, mai ignorata silenziosamente. L'eccezione si propaga naturalmente fino al blocco `try/catch` già esistente in `route.ts:56-81`, che logga, elimina la riga di idempotenza in `stripe_events` e risponde 500 — Stripe ritenta secondo la sua policy standard. **Nessuna modifica a `route.ts` necessaria.**

I 4 handler che chiamano `findLabBySubscription` perdono il controllo `if (!lab) return` ora morto (la funzione non ritorna più `null`, lancia prima):

```typescript
// Prima:
const lab = await findLabBySubscription(supabase, subId)
if (!lab) return
// Dopo:
const lab = await findLabBySubscription(supabase, subId)
```

### 3. Helper condiviso `assertTransitionOk()` — evita duplicazione su 5 call site

Nuova funzione privata in `webhook-handlers.ts`, subito dopo `stripeOpts()`:

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

Ogni chiamata a `transitionLabStato()` nei 5 handler (`handleCheckoutCompleted`, `handlePaymentSucceeded`, `handlePaymentFailed`, `handleSubscriptionDeleted`, e il ramo di transizione di `handleSubscriptionUpdated`) diventa:

```typescript
const result = await transitionLabStato(supabase, /* ...invariato... */)
assertTransitionOk(result, { labId, eventType: event.type })
```

(il valore esatto passato come contesto — `labId` vs `lab.id` — dipende dall'handler, coerente con la variabile già in scope in ciascuno).

### 4. Ramo metadata-only di `handleSubscriptionUpdated`

Righe 138-147: aggiunta di un controllo sull'errore del solo `.update()` diretto (nessuna transizione di stato coinvolta, quindi nessun throw — solo visibilità):

```typescript
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

## Test (TDD, RED→GREEN)

Oggi **zero test** esistono per `state-machine.ts` e `webhook-handlers.ts` (confermato: nessuna occorrenza di `stripe`/`webhook`/`transitionLabStato` in `tests/unit/`).

**`tests/unit/state-machine.test.ts` (nuovo):**
1. `transitionLabStato` ritorna `{ success: false, error: 'Lab non trovato', retryable: true }` quando il lab non esiste.
2. Ritorna `{ success: false, error: ... }` **senza** `retryable: true` per il caso `blacklist`.
3. Ritorna `{ success: false, error: ... }` **senza** `retryable: true` per una transizione non consentita (es. `scaduto → attivo` diretta, se non in `ALLOWED_TRANSITIONS`).
4. Ritorna `{ success: true }` sul caso happy-path (transizione valida, update riuscito) — verifica di non-regressione minima.

**`tests/unit/webhook-handlers.test.ts` (nuovo):** per ciascuno dei 5 handler, mock di `transitionLabStato` (via `vi.mock('./state-machine', ...)`) e di Supabase (`createChain`/mock diretto per `findLabBySubscription`):
1. Happy path (mock Stripe event fixture minimale per tipo) → nessuna eccezione, `transitionLabStato`/`.update()` chiamati con gli argomenti attesi.
2. **Caso critico RED→GREEN:** `transitionLabStato` mockato per ritornare `{ success: false, error: 'Lab non trovato', retryable: true }` → l'handler **lancia** un'eccezione (verificabile solo su `handleCheckoutCompleted`, l'unico che chiama `transitionLabStato` direttamente). Prima del fix: nessuna eccezione, funzione ritorna silenziosamente — RED. Dopo: `await expect(handleCheckoutCompleted(...)).rejects.toThrow()` — GREEN.
3. **Stesso scenario per i 4 handler basati su `findLabBySubscription`:** mock del client Supabase che ritorna `error` non nullo (o nessuna riga) sulla query `laboratori` → l'handler **lancia**. Prima del fix: `return` silenzioso, nessuna eccezione — RED.
4. `transitionLabStato` mockato con `{ success: false, error: '...', retryable: false }` (caso terminale) su un qualsiasi handler → **nessuna eccezione**, `console.error` chiamato (spy `vi.spyOn(console, 'error')`).
5. `handleSubscriptionUpdated`, ramo metadata-only: mock dell'update che fallisce → `console.error` chiamato, nessuna eccezione.

**Non in scope per questo piano:** test di integrazione end-to-end sul `POST /api/stripe/webhook` (verifica idempotenza `stripe_events`, verifica firma HMAC, comportamento del `try/catch` di `route.ts` su eccezione) — quel meccanismo è già corretto e invariato da questo lavoro; un test dedicato a `route.ts` stesso resta backlog separato se Francesco lo richiede in futuro.

## File toccati

- `src/lib/stripe/state-machine.ts` (campo `retryable` sul tipo di ritorno)
- `src/lib/stripe/webhook-handlers.ts` (`findLabBySubscription` throw, nuovo helper `assertTransitionOk`, 5 call site aggiornati, fix ramo metadata-only)
- `tests/unit/state-machine.test.ts` (nuovo)
- `tests/unit/webhook-handlers.test.ts` (nuovo)

## Verifica finale

`tsc --noEmit` + `vitest run` + `next build`. Nessuna migration → nessun gate FASE 6b. Nessuna QA browser (logica server-side su un webhook esterno, non osservabile in UI — verifica manuale opzionale via Stripe CLI `stripe trigger` se Francesco vuole un test end-to-end reale in ambiente di test Stripe, ma non richiesta per chiudere questo piano).

## Fuori scope

- Test di integrazione su `POST /api/stripe/webhook` (idempotenza, firma HMAC) — meccanismo già corretto, non toccato da questo fix.
- Estensione della stessa disciplina di error-handling ad altri punti dell'app che ignorano errori Supabase — pattern isolato a questo file per questo backlog item.
