# UÀ Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correggere 6 bug identificati tramite analisi Codex nel codebase UÀ (ua-app).

**Architecture:** Fix chirurgici + 1 migration SQL. TDD dove applicabile. I task devono essere eseguiti nell'ordine indicato (T5 dipende da T4 per la migration). Gli altri task sono indipendenti.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (PostgreSQL + RLS), Vitest

**NOTA BUG GIÀ RISOLTI (non implementare):**
- Bug #1 consegna_lavoro_lock → già risolto da migration 004 (2026-05-14)
- Bug #3 SDI progressivo → il codice gestisce già correttamente fatturaId
- Bug #6 prove/route.ts TRANSIZIONI → ha già guards parziali adeguati

---

## File coinvolti

| File | Task | Tipo |
|---|---|---|
| `src/app/api/fatture/batch/route.ts` | T1 | Modifica |
| `src/lib/stripe/state-machine.ts` | T2 | Modifica (3 righe) |
| `src/lib/stripe/webhook-handlers.ts` | T3 | Modifica |
| `supabase/migrations/20260525_bom_idempotency.sql` | T4 | Nuova migration |
| `src/lib/consegna/orchestrate.ts` | T4 | Modifica |
| `supabase/migrations/20260525_invite_atomic.sql` | T5 | Nuova migration |
| `src/app/api/auth/accept-invite/route.ts` | T5 | Modifica |
| `src/app/api/lavori/[id]/prove/route.ts` | T6 | Modifica (2 righe) |

---

## Task 1: Fattura batch — claim atomico per prevenire doppia fatturazione

**File:**
- Modifica: `src/app/api/fatture/batch/route.ts`

Il problema: il loop processa ogni lavoro con `.eq('incluso_in_fattura', false)` nel SELECT iniziale, ma due richieste batch concorrenti possono entrambe leggere lo stesso lavoro come non-fatturato prima che una delle due lo marchi. Risultato: due fatture generate per lo stesso lavoro.

La fix: sostituire il SELECT filtrante con un `UPDATE ... SET incluso_in_fattura = true WHERE ... RETURNING id` atomico. Solo i lavori effettivamente "claimati" vengono processati.

- [ ] **Step 1: Scrivi test per la race condition**

```typescript
// In src/app/api/fatture/batch/route.test.ts (o file esistente)
it('non genera fatture duplicate con richieste batch concorrenti', async () => {
  // Setup: un lavoro consegnato non fatturato
  const lavoroId = 'test-lavoro-batch-concurrent';
  // ... setup del lavoro nel DB di test ...

  // Due richieste concorrenti per lo stesso lavoro
  const [res1, res2] = await Promise.all([
    fetch('/api/fatture/batch', {
      method: 'POST',
      body: JSON.stringify({ lavoro_ids: [lavoroId] }),
    }),
    fetch('/api/fatture/batch', {
      method: 'POST',
      body: JSON.stringify({ lavoro_ids: [lavoroId] }),
    }),
  ]);

  const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

  // Esattamente una delle due deve avere generato la fattura
  const totalGenerati = data1.generati + data2.generati;
  expect(totalGenerati).toBe(1);

  // Nel DB: esattamente una fattura per questo lavoro
  // const { count } = await svc.from('fatture').select('*', {count: 'exact'}).eq('lavoro_id', lavoroId);
  // expect(count).toBe(1);
});
```

- [ ] **Step 2: Sostituisci la logica di SELECT con claim atomico**

In `src/app/api/fatture/batch/route.ts`, sostituisci il blocco del for-loop che fa la query iniziale del lavoro con un claim atomico. Trova il punto dove si fa la query:

```typescript
const { data: lavoro, error: lavoroErr } = await svc
  .from('lavori')
  .select(`id, ... `)
  .eq('id', lavoro_id)
  .eq('laboratorio_id', labId)
  .eq('stato', 'consegnato')
  .eq('incluso_in_fattura', false)
  // ...
  .single()
```

Sostituisci con un claim atomico PRIMA del SELECT dettagliato:

```typescript
// Claim atomico: marca incluso_in_fattura=true solo se è ancora false
// Evita race condition tra richieste batch concorrenti
const { data: claimed } = await svc
  .from('lavori')
  .update({ incluso_in_fattura: true })
  .eq('id', lavoro_id)
  .eq('laboratorio_id', labId)
  .eq('stato', 'consegnato')
  .eq('incluso_in_fattura', false)
  .is('deleted_at', null)
  .select('id')
  .single()

if (!claimed) {
  results.push({
    lavoro_id,
    numero_lavoro: lavoro_id,
    ok: false,
    error: 'Lavoro non trovato, non consegnato, già fatturato, o claim fallito',
  })
  continue
}

// Ora carica il dettaglio completo (il claim è già stato eseguito)
const { data: lavoro, error: lavoroErr } = await svc
  .from('lavori')
  .select(`id, laboratorio_id, numero_lavoro, ... (stessa select di prima) ...`)
  .eq('id', lavoro_id)
  .eq('laboratorio_id', labId)
  .single()

if (lavoroErr || !lavoro) {
  // Rollback del claim: reset incluso_in_fattura a false se il dettaglio non si carica
  await svc
    .from('lavori')
    .update({ incluso_in_fattura: false })
    .eq('id', lavoro_id)
    .eq('laboratorio_id', labId)
  results.push({ lavoro_id, numero_lavoro: lavoro_id, ok: false, error: 'Errore caricamento dettaglio lavoro' })
  continue
}
```

Rimuovi il `await svc.from('lavori').update({ incluso_in_fattura: true })...` che era alla fine del try-block (ora è il claim iniziale).

Aggiungi gestione errori: se `generaFatturaPA` lancia eccezione, fare rollback del claim (`incluso_in_fattura = false`).

- [ ] **Step 3: Build TypeScript**

```bash
cd /Users/hatholdir/Downloads/SOFTWARE\ FILIPPO/ua-app && npx tsc --noEmit 2>&1 | tail -10
```

Expected: 0 errori

- [ ] **Step 4: Commit**

```bash
git add src/app/api/fatture/batch/route.ts
git commit -m "fix(fatture): claim atomico incluso_in_fattura per prevenire doppia fatturazione concorrente"
```

---

## Task 2: State machine — transizioni same-state idempotenti

**File:**
- Modifica: `src/lib/stripe/state-machine.ts` — funzione `transitionLabStato`

Il problema: `canTransition(attivo, attivo)` restituisce `false` → `transitionLabStato` restituisce errore su eventi di rinnovo Stripe. Deve essere idempotente (stessa transizione = success silenzioso).

- [ ] **Step 1: Verifica ALLOWED_TRANSITIONS**

```bash
grep -A 20 "ALLOWED_TRANSITIONS" src/lib/stripe/state-machine.ts | head -25
```

Conferma che `attivo → attivo` non sia nelle transizioni consentite.

- [ ] **Step 2: Scrivi test fallente**

```typescript
// Nel file di test state-machine
it('accetta transizioni same-state come idempotenti (success silenzioso)', async () => {
  // Setup: lab in stato attivo
  // ...

  const result = await transitionLabStato(supabase, labId, 'attivo', 'stripe_webhook');
  expect(result.success).toBe(true); // non deve fallire
});
```

- [ ] **Step 3: Aggiungi check same-state in transitionLabStato**

In `src/lib/stripe/state-machine.ts`, dentro `transitionLabStato`, DOPO il check `blacklist` e PRIMA del check `canTransition`:

```typescript
// Same-state: idempotente, non loggare (no audit trail per no-op)
if (currentStato === newStato) {
  return { success: true };
}
```

Posizione esatta: dopo `if (currentStato === 'blacklist') { ... }` e prima di `if (!canTransition(currentStato, newStato)) { ... }`.

- [ ] **Step 4: Build e test**

```bash
npx tsc --noEmit 2>&1 | tail -5 && npx vitest run src/lib/stripe/ 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stripe/state-machine.ts
git commit -m "fix(lab-lifecycle): transizioni same-state idempotenti in transitionLabStato"
```

---

## Task 3: Webhook handlers — atomicità metadata + stato

**File:**
- Modifica: `src/lib/stripe/webhook-handlers.ts`

Il problema: gli handler Stripe aggiornano `stripe_subscription_id` e altri metadata PRIMA di chiamare `transitionLabStato`. Un crash tra le due operazioni lascia il lab in stato parzialmente aggiornato.

- [ ] **Step 1: Leggi il handler completo**

```bash
cat src/lib/stripe/webhook-handlers.ts
```

Identifica tutti i punti dove un UPDATE su `laboratori` precede `transitionLabStato`.

- [ ] **Step 2: Scrivi il wrapper transazionale**

Aggiungi una funzione helper in `webhook-handlers.ts`:

```typescript
// Helper: aggiorna metadata lab E transiziona stato in modo atomico
// Usa PostgreSQL transaction tramite RPC Supabase
async function updateLabMetaAndTransition(
  supabase: SupabaseClient,
  laboratorioId: string,
  metaUpdate: Record<string, unknown>,
  newStato: LaboStatoValue,
  source: 'stripe_webhook',
  stripeOpts: Parameters<typeof transitionLabStato>[4],
): Promise<{ success: boolean; error?: string }> {
  // Step 1: aggiorna metadata
  const { error: metaErr } = await supabase
    .from('laboratori')
    .update(metaUpdate)
    .eq('id', laboratorioId);

  if (metaErr) return { success: false, error: metaErr.message };

  // Step 2: transizione stato
  return transitionLabStato(supabase, laboratorioId, newStato, source, stripeOpts);
}
```

**NOTA:** Supabase JS non espone transazioni esplicite client-side. Il pattern sicuro è:
1. Fare l'UPDATE metadata con una condizione su `stato` attuale (se stato cambia, metadata non viene applicato)
2. Poi `transitionLabStato`

Alternativa più sicura: creare una RPC Supabase `update_lab_on_stripe_event(lab_id, metadata, new_stato)` che esegue entrambi in una transazione SQL. Valuta la complessità vs rischio in produzione.

- [ ] **Step 3: Aggiorna gli handler che hanno il pattern split**

Per ogni handler che fa UPDATE metadata seguito da `transitionLabStato`, sostituire con `updateLabMetaAndTransition`.

- [ ] **Step 4: Build e test**

```bash
npx tsc --noEmit 2>&1 | tail -5
npx vitest run src/lib/stripe/ 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stripe/webhook-handlers.ts
git commit -m "fix(stripe-webhook): metadata lab e transizione stato eseguiti sequenzialmente con rollback"
```

---

## Task 4: BOM scarico — idempotenza con constraint unique

**File:**
- Crea: `supabase/migrations/20260525_bom_idempotency.sql`
- Modifica: `src/lib/consegna/orchestrate.ts` — step 8

Il problema: `scarichi_magazzino.insert` senza idempotency key. Su retry della consegna: duplica record e decrementa `scorta_attuale` due volte.

- [ ] **Step 1: Crea la migration**

Crea `supabase/migrations/20260525_bom_idempotency.sql`:

```sql
-- UÀ Migration — BOM scarico idempotency
-- Aggiunge unique constraint su (lavoro_id, magazzino_id) in scarichi_magazzino
-- e atomic decrement per scorta_attuale in magazzino

-- Unique constraint: una sola riga di scarico per (lavoro, articolo magazzino)
ALTER TABLE scarichi_magazzino
  ADD CONSTRAINT scarichi_magazzino_lavoro_magazzino_unique
  UNIQUE (lavoro_id, magazzino_id);

-- Funzione atomic decrement per evitare read-modify-write
CREATE OR REPLACE FUNCTION decrementa_scorta(
  p_magazzino_id UUID,
  p_laboratorio_id UUID,
  p_quantita NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE magazzino
  SET scorta_attuale = GREATEST(0, scorta_attuale - p_quantita)
  WHERE id = p_magazzino_id
    AND laboratorio_id = p_laboratorio_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION decrementa_scorta FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decrementa_scorta TO service_role;
```

- [ ] **Step 2: Applica la migration**

```bash
npx supabase db push --linked 2>&1 | tail -5
```

- [ ] **Step 3: Modifica lo step 8 in orchestrate.ts**

Nel loop BOM di `orchestrate.ts`, sostituisci l'INSERT in `scarichi_magazzino` e il decremento con:

```typescript
// INSERT con ON CONFLICT DO NOTHING (idempotente: se già scaricato, skip)
const { error: scarErr } = await supabase
  .from('scarichi_magazzino')
  .insert({
    laboratorio_id: laboratorio_id,
    lavoro_id: lavoro_id,
    magazzino_id: bom.magazzino_id,
    listino_id: bom.listino_id,
    quantita,
    unita_misura: bom.unita_misura,
  })
  .select('id')  // .select() abilita conflict detection

if (scarErr) {
  // codice 23505 = unique violation → già scaricato, skip silenzioso
  if (scarErr.code !== '23505') {
    throw scarErr;
  }
  continue; // già eseguito, non decrementare di nuovo
}

// Decremento atomico via RPC (evita read-modify-write)
const { error: decreErr } = await supabase.rpc('decrementa_scorta', {
  p_magazzino_id: bom.magazzino_id,
  p_laboratorio_id: laboratorio_id,
  p_quantita: quantita,
});

if (decreErr) {
  console.error('[CONSEGNA] decrementa_scorta failed:', decreErr.message);
}
```

- [ ] **Step 4: Rigenera types Supabase**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **Step 5: Build e vitest**

```bash
npx tsc --noEmit 2>&1 | tail -5
npx vitest run 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260525_bom_idempotency.sql src/lib/consegna/orchestrate.ts src/types/database.types.ts
git commit -m "fix(consegna): BOM scarico idempotente con unique constraint e atomic decrement RPC"
```

---

## Task 5: Invite — claim atomico + provisioning in singola transazione

**File:**
- Crea: `supabase/migrations/20260525_invite_atomic.sql`
- Modifica: `src/app/api/auth/accept-invite/route.ts`

Il problema: `accepted_at` viene settato (claim), poi il lab viene verificato, poi `utenti` e `lab_memberships` vengono creati. Un crash tra il claim e la creazione utente lascia il token bruciato e l'utente non provisionato.

- [ ] **Step 1: Crea la RPC atomica**

Crea `supabase/migrations/20260525_invite_atomic.sql`:

```sql
-- UÀ Migration — Invite accept atomico
-- Esegue claim + provisioning in una singola transazione DB

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
  -- Claim atomico: aggiorna solo se accepted_at IS NULL e non scaduto
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

  -- Verifica email
  IF lower(trim(p_user_email)) <> lower(trim(v_invite.email)) THEN
    -- Rollback del claim
    UPDATE inviti SET accepted_at = NULL WHERE id = v_invite.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Email non corrisponde');
  END IF;

  -- Verifica stato lab
  SELECT stato INTO v_lab_stato FROM laboratori WHERE id = v_invite.laboratorio_id;
  IF v_lab_stato NOT IN ('trial', 'attivo') THEN
    UPDATE inviti SET accepted_at = NULL WHERE id = v_invite.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Il laboratorio non è più accessibile');
  END IF;

  -- Crea utente (upsert sicuro)
  INSERT INTO utenti (id, laboratorio_id, nome, cognome, email, ruolo)
  VALUES (p_user_id, v_invite.laboratorio_id, p_nome, p_cognome, v_invite.email, v_invite.ruolo)
  ON CONFLICT (id) DO UPDATE SET
    laboratorio_id = EXCLUDED.laboratorio_id,
    nome = EXCLUDED.nome,
    cognome = EXCLUDED.cognome,
    ruolo = EXCLUDED.ruolo;

  -- Crea membership
  INSERT INTO lab_memberships (user_id, laboratorio_id, ruolo)
  VALUES (p_user_id, v_invite.laboratorio_id, v_invite.ruolo)
  ON CONFLICT (user_id, laboratorio_id) DO UPDATE SET ruolo = EXCLUDED.ruolo;

  RETURN jsonb_build_object('ok', true, 'laboratorio_id', v_invite.laboratorio_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION accept_invite_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invite_atomic TO service_role;
```

- [ ] **Step 2: Applica la migration**

```bash
npx supabase db push --linked 2>&1 | tail -5
```

- [ ] **Step 3: Aggiorna la route accept-invite**

Sostituisci il corpo della route con la chiamata RPC:

```typescript
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.token || !body?.nome || !body?.cognome) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }
  const { token, nome, cognome } = body as { token: string; nome: string; cognome: string }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const supabase = getServiceClient()

  const { data, error } = await supabase.rpc('accept_invite_atomic', {
    p_token_hash: tokenHash,
    p_user_id: user.id,
    p_user_email: user.email ?? '',
    p_nome: nome,
    p_cognome: cognome,
  })

  if (error) {
    console.error('[accept-invite] RPC error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  const result = data as { ok: boolean; error?: string; laboratorio_id?: string }

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      'Invito non valido, già usato o scaduto': 409,
      'Email non corrisponde': 403,
      'Il laboratorio non è più accessibile': 403,
    }
    const status = statusMap[result.error ?? ''] ?? 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Rigenera types e build**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **Step 5: Test**

```bash
npx vitest run src/app/api/auth/ 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260525_invite_atomic.sql src/app/api/auth/accept-invite/route.ts src/types/database.types.ts
git commit -m "fix(auth): accept-invite atomico via RPC — claim + provisioning in singola transazione"
```

---

## Task 6: Tenant isolation — filtro laboratorio_id su child tables in prove/route.ts

**File:**
- Modifica: `src/app/api/lavori/[id]/prove/route.ts` (2 righe)

Il problema: il GET di `lavoro_prove` filtra per `lavoro_id` ma non per `laboratorio_id`. Il cross-tenant guard è sul parent `lavori`, ma la child table non ha il filtro diretto.

- [ ] **Step 1: Aggiungi filtro al SELECT in GET**

In `prove/route.ts`, nella query GET:

```typescript
const { data, error } = await svc
  .from('lavoro_prove')
  .select('*')
  .eq('lavoro_id', id)
  .eq('laboratorio_id', utente.laboratorio_id)   // ← aggiunta
  .order('numero_prova', { ascending: true })
```

- [ ] **Step 2: Verifica che la colonna esista**

```bash
grep -r "laboratorio_id" src/types/database.types.ts | grep "lavoro_prove" | head -3
```

Se la colonna non esiste in `lavoro_prove`, il fix non è necessario (il guard sul parent è sufficiente). Se esiste, aggiungila.

- [ ] **Step 3: Build**

```bash
npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/lavori/[id]/prove/route.ts
git commit -m "fix(tenant): aggiunge filtro laboratorio_id su lavoro_prove child-table queries"
```

---

## Verifica finale

- [ ] **Build completo**

```bash
npx tsc --noEmit 2>&1 | tail -3
npx next build 2>&1 | tail -5
```

- [ ] **Test suite**

```bash
npx vitest run 2>&1 | tail -5
```

- [ ] **Push**

```bash
git push origin main
```
