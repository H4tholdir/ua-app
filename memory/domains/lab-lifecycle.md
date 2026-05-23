# Lab Lifecycle + Subscription
**Carica quando:** task tocca stati lab, Stripe, webhook, transizioni, billing, trial, blacklist.

## File chiave
- `src/lib/stripe/state-machine.ts` — macchina a stati, `ALLOWED_TRANSITIONS`, `transitionLabStato()`
- `src/lib/stripe/webhook-handlers.ts` — handler Stripe con idempotency su `last_stripe_event_at`
- `src/app/api/stripe/webhook/route.ts` — ingresso webhook
- `supabase/migrations/001_commercial_infra.sql` — colonne Stripe, `lab_stato_log`, stati lab
- `src/app/(app)/layout.tsx` — enforcement stati → redirect a /blocked, /billing

## Invariante critica
**`transitionLabStato()` sempre — MAI `UPDATE laboratori SET stato = ...` diretto.**
`blacklist` è uno stato terminale senza transizioni uscenti — irreversibile.
Direct UPDATE = audit trail rotto + stato machine corrotto.

## Regole operative
- Stripe webhook: idempotency su `last_stripe_event_at` — un evento ripetuto con timestamp precedente viene scartato silenziosamente
- Stati: `trial → attivo → sospeso → scaduto → blacklist`
- Transizioni `attivo → attivo` (rinnovo Stripe): devono essere accettate silenziosamente, non rifiutate
- Layout enforcement: `blacklist → /blocked`, `sospeso/scaduto → /billing`, `trial_expired → /billing?trial_expired=true`
- Metadata Stripe (subscription_id ecc.) aggiornati intorno a `transitionLabStato()` — devono essere in un'unica transazione per evitare stato parziale

## Issue nota (Codex)
Webhook handlers aggiornano campi subscription prima/dopo `transitionLabStato()` in chiamate separate. Un crash tra le due lascia stato parziale. Da consolidare in transazione atomica.
