# Portale Dentista v2 — Ondata 1: lista + proposta + conferma — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il dentista vede sul suo portale (dietro PIN) la lista dei lavori consegnati non fatturati con i prezzi, propone cosa fatturare; il laboratorio conferma dallo scadenzario. Nessun automatismo fiscale.

**Architecture:** Colonne additive su `lavori` (proposta) e `clienti` (interruttore + PIN scrypt+pepper); 3 API portale nuove sotto `/api/portale/[token]/` protette da token+interruttore+sessione economica (cookie HMAC 30 min); PATCH clienti convertita ad allowlist (I-2, PRIMA di tutto) poi estesa con i campi portale; conferma lab = PATCH `decisione-fatturazione` esistente, arricchita solo dell'azzeramento proposta su riapertura (M-3). Audit dettagliato su `portale_accessi` (F9), fail-loud sugli eventi economici.

**Tech Stack:** Next.js 16 App Router, Supabase (service client), Node `node:crypto` (scrypt + HMAC — nessuna dipendenza nuova), Vitest, web-push esistente.

**Spec:** `docs/superpowers/specs/2026-07-10-portale-dentista-v2-fatturazione-concordata-design.md` §4–§8 (leggerla PRIMA di ogni task).

## Global Constraints

- **I-2 è il Task 1** e va completato PRIMA di aggiungere le colonne portale a `clienti` (vincolo esplicito di Francesco).
- **Esclusione «già fatturato» a doppia sorgente (vincolo esplicito di Francesco):** la lista «Da fatturare» esclude un lavoro se `incluso_in_fattura = true` **OPPURE** se esiste una riga `fatture` con `lavoro_id = lavoro.id` e `stato_sdi <> 'rifiutata'`. Motivo: il percorso `/api/fatture/[id]/xml` multi-lavoro (i>0) crea fatture con `lavoro_id` valorizzato ma NON setta `incluso_in_fattura = true`. Lo stesso doppio gate protegge il POST proposta.
- **Gate mockup obbligatorio** per ogni schermata nuova: mockup HTML in `docs/design/mockups/` (MAI /tmp) → screenshot → approvazione esplicita di Francesco → solo dopo il React (CLAUDE.md §0B). Le schermate nuove di quest'ondata: (a) portale — tastierino PIN + sezione «Da fatturare» + layout stampa; (b) lab — blocco «Portale — fatturazione concordata» in scheda cliente + riga proposta nello scadenzario.
- **Migration al DB live (`iagibumwjstnveqpjbwq`) SOLO con conferma esplicita di Francesco**, via `npx supabase db push` (MAI MCP `apply_migration` — timestampa da sé la history, gotcha B21). Idem per le env Vercel nuove `PORTALE_PIN_PEPPER` e `PORTALE_SESSION_SECRET`.
- **QA browser SOLO sul lab E2E `00000000-0000-0000-0000-000000000001` — MAI il lab Filippo.**
- Worktree dedicato da `main` (`superpowers:using-git-worktrees`); copiare nel worktree `.env.local` e `supabase/.temp` dal repo principale (gotcha noto: build e CLI supabase falliscono senza).
- PIN: formato hash `scrypt$32768$8$1$<salt b64>$<hash b64>` con input `HMAC-SHA256(PORTALE_PIN_PEPPER, pin)` (F1); mai in chiaro nel DB, mai loggato, mai in risposta API.
- Cookie sessione economica: HMAC-SHA256 con `PORTALE_SESSION_SECRET` (env distinta dal pepper), payload `{cliente_id, exp, pin_generation}`, durata 30 min non rinnovabile, `HttpOnly; Secure; SameSite=Strict` (F2).
- `isSameOrigin(req)` (`src/lib/utils/csrf.ts`) su TUTTE le POST del portale (F3).
- Contatore tentativi PIN: incremento atomico single-statement via RPC dedicata, MAI check-then-increment (F4). 5 errori → blocco 15 min.
- Rate limit per-IP sul POST pin: 20 richieste/15 min, contate su `portale_accessi` (F5).
- Eventi audit economici: sempre con IP e user-agent; insert MAI ingoiato in silenzio (fail-loud: la richiesta risponde 500 se l'audit fallisce). Retention 24 mesi con purge (F10).
- Risposta **uniforme** per token invalido/scaduto sulle route economiche: sempre 401 `{ errore: 'non_autorizzato' }` (F13 — niente oracolo di esistenza).
- Errori senza leak: MAI messaggi Postgres grezzi nelle risposte (solo `console.error`).
- Invariante D7: `proposta_dentista`/`proposta_at` MAI in `PATCHABLE_FIELDS` della PATCH lavori (commento-sentinella + test di regressione).
- Niente nomi paziente in chiaro nel portale: `minimizzaPhi` (iniziale del cognome). Mai prezzi né saldi nelle push.
- UI in-app (lab): DS esistente della pagina che si tocca (scheda cliente = pattern `SectionCard`; scadenzario = `DS` da `estratto-conto-shared`). Portale: stile del portale esistente (DM Sans, CSS inline). Animazioni SOLO da `src/design-system/motion.ts`.
- Commit format del repo: `feat(portale): …`, `fix(clienti): …`, ecc.
- Verifica di ogni task: il comando di test del task + a fine ondata `npx tsc --noEmit` + `npx vitest run` (baseline: **1168 pass | 4 skipped**) + `npx next build`.

## File Structure (nuovi / modificati)

**Nuovi:**
- `supabase/migrations/20260710180000_ondata1_portale_fatturazione_concordata.sql` — colonne + RPC contatore PIN + RPC annullo aggiornata + purge audit
- `src/lib/portale/pin.ts` — hash/verify PIN (scrypt+pepper) + blocklist PIN banali
- `src/lib/portale/sessione.ts` — cookie sessione economica (HMAC)
- `src/lib/portale/audit.ts` — writer unico di `portale_accessi` con IP/UA
- `src/lib/portale/minimizza-phi.ts` — estrazione dell'helper oggi duplicato nella page portale
- `src/app/api/portale/[token]/pin/route.ts` — POST verifica PIN
- `src/app/api/portale/[token]/fatturazione/route.ts` — GET lista
- `src/app/api/portale/[token]/fatturazione/stampa/route.ts` — POST audit stampa
- `src/app/api/portale/[token]/fatturazione/[lavoro_id]/route.ts` — POST proposta
- `src/app/api/clienti/[id]/rigenera-portale-token/route.ts` — POST rotazione link (F6)
- `src/components/features/portale/FatturazioneSection.tsx` — sezione portale (PIN gate + lista + stampa)
- `src/components/features/clienti/PortaleFatturazioneCard.tsx` — blocco scheda cliente
- `docs/design/mockups/2026-07-10-portale-da-fatturare.html` + `docs/design/mockups/2026-07-10-lab-portale-cliente-scadenzario.html` + `scripts/screenshot-mockups.mjs`
- Test: `tests/unit/clienti-patch-allowlist.test.ts`, `tests/unit/portale-pin-lib.test.ts`, `tests/unit/portale-sessione-lib.test.ts`, `tests/unit/portale-pin-route.test.ts`, `tests/unit/portale-fatturazione-get-route.test.ts`, `tests/unit/portale-proposta-route.test.ts`, `tests/unit/clienti-patch-portale.test.ts`, `tests/unit/rigenera-portale-token-route.test.ts`, `tests/unit/decisione-fatturazione-riapertura.test.ts`, `tests/unit/lavori-patch-invariante-d7.test.ts`

**Modificati:**
- `src/app/api/clienti/[id]/route.ts` — Task 1 (allowlist) + Task 7 (campi portale)
- `src/app/api/lavori/[id]/route.ts` — solo commento-sentinella D7
- `src/app/api/lavori/[id]/decisione-fatturazione/route.ts` — M-3 (riapertura azzera proposta)
- `src/app/portale/[token]/page.tsx` — monta `FatturazioneSection`, usa `minimizzaPhi` condiviso
- `src/app/(app)/clienti/[id]/page.tsx` — monta `PortaleFatturazioneCard`
- `src/lib/contabilita/queries.ts` + `src/app/api/scadenzario/[cliente_id]/route.ts` + `src/components/features/scadenzario/LavoriInAttesaSection.tsx` — proposta nello scadenzario
- `src/app/(app)/scadenzario/[cliente_id]/page.tsx` — passa `studioNome` alla sezione

---

### Task 1: I-2 — PATCH clienti da blocklist ad allowlist

La PATCH attuale (`src/app/api/clienti/[id]/route.ts:123-141`) cancella 5 campi `IMMUTABLE` dal body e passa **tutto il resto** a `.update()`. Chiunque nel lab può scrivere qualsiasi colonna. Va convertita ad allowlist esplicita PRIMA che esistano le colonne portale (altrimenti si potrebbe scrivere un hash arbitrario o azzerare i contatori anti-brute-force dal body).

**Files:**
- Modify: `src/app/api/clienti/[id]/route.ts` (solo la PATCH, righe 92-155)
- Test: `tests/unit/clienti-patch-allowlist.test.ts` (nuovo)

**Interfaces:**
- Consumes: `isSameOrigin` da `@/lib/utils/csrf`; `getServerUserClient`/`getServiceClient` esistenti.
- Produces: costante `PATCHABLE_FIELDS_CLIENTE` esportata dal route file (il Task 7 la estende con la gestione dedicata dei campi portale; i test la importano).

- [ ] **Step 1: Scrivi i test che falliscono**

Crea `tests/unit/clienti-patch-allowlist.test.ts`:

```ts
// tests/unit/clienti-patch-allowlist.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/clienti/[id]/route'

function req(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/clienti/cli-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const ctx = { params: Promise.resolve({ id: 'cli-1' }) }

/** Cattura il payload passato a .update() sulla tabella clienti. */
let updatePayload: Record<string, unknown> | null

beforeEach(() => {
  updatePayload = null
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: { laboratorio_id: 'lab-1', ruolo: 'titolare' },
              error: null,
            }),
          }),
        }),
      }
    }
    // clienti
    return {
      update: (payload: Record<string, unknown>) => {
        updatePayload = payload
        return {
          eq: () => ({
            eq: () => ({
              is: () => ({
                select: () => ({
                  single: async () => ({
                    data: { id: 'cli-1', nome: 'Mario', cognome: 'Rossi', studio_nome: null, updated_at: 'x' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      },
    }
  })
})

describe('PATCH /api/clienti/[id] — allowlist I-2', () => {
  it('passa i campi anagrafici legittimi', async () => {
    const res = await PATCH(req({ nome: 'Mario', email: 'm@x.it', sconto_percentuale: 5 }), ctx)
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ nome: 'Mario', email: 'm@x.it', sconto_percentuale: 5 })
    expect(updatePayload).toHaveProperty('updated_at')
  })

  it('scarta i campi di sistema e quelli ignoti', async () => {
    const res = await PATCH(
      req({
        nome: 'Mario',
        portale_token: 'evil-token',
        portale_token_scade_at: '2099-01-01',
        laboratorio_id: 'lab-evil',
        id: 'cli-evil',
        created_at: '2020-01-01',
        deleted_at: null,
        campo_inesistente: 42,
      }),
      ctx,
    )
    expect(res.status).toBe(200)
    expect(updatePayload).not.toHaveProperty('portale_token')
    expect(updatePayload).not.toHaveProperty('portale_token_scade_at')
    expect(updatePayload).not.toHaveProperty('laboratorio_id')
    expect(updatePayload).not.toHaveProperty('id')
    expect(updatePayload).not.toHaveProperty('created_at')
    expect(updatePayload).not.toHaveProperty('deleted_at')
    expect(updatePayload).not.toHaveProperty('campo_inesistente')
  })

  it('400 se dopo il filtro non resta alcun campo', async () => {
    const res = await PATCH(req({ campo_inesistente: 1 }), ctx)
    expect(res.status).toBe(400)
  })

  it('403 se tecnico_default_id appartiene a un altro lab', async () => {
    // il mock tecnici risponde "non trovato" per il lab corrente
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', ruolo: 'titolare' }, error: null }) }) }) }
      }
      if (table === 'tecnici') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
              }),
            }),
          }),
        }
      }
      return { update: () => { throw new Error('update non deve essere chiamata') } }
    })
    const res = await PATCH(req({ tecnico_default_id: 'tec-altrui' }), ctx)
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Esegui i test per vederli fallire**

Run: `npx vitest run tests/unit/clienti-patch-allowlist.test.ts`
Expected: FAIL — i campi ignoti oggi passano (il test "scarta i campi" fallisce), 400/403 non implementati.

- [ ] **Step 3: Riscrivi la PATCH con allowlist**

In `src/app/api/clienti/[id]/route.ts`, sostituisci integralmente il blocco blocklist (da `// Whitelist campi modificabili` fino a `body.updated_at = ...`) con:

```ts
// I-2 (spec portale-dentista-v2 §6): allowlist esplicita — MAI blocklist (CLAUDE.md §9).
// I campi portale (portale_fatturazione_attiva, portale_pin) hanno gestione
// dedicata con controllo ruolo: vedi più sotto, NON aggiungerli qui.
export const PATCHABLE_FIELDS_CLIENTE = [
  'studio_nome', 'nome', 'cognome', 'telefono', 'email',
  'partita_iva', 'codice_fiscale', 'codice_sdi', 'pec',
  'indirizzo', 'cap', 'citta', 'provincia', 'paese',
  'listino_numero', 'sconto_percentuale', 'tecnico_default_id',
  'modalita_pagamento', 'non_soggetto_fe', 'fatturare_al_paziente',
  'laboratorio_odontotecnico', 'iban', 'note',
] as const
```

(la costante va a livello di modulo, sopra `export async function PATCH`). Poi nel corpo della PATCH, al posto del loop `delete`:

```ts
    const update: Record<string, unknown> = {}
    for (const field of PATCHABLE_FIELDS_CLIENTE) {
      if (field in body) update[field] = body[field]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nessun campo modificabile nel body' }, { status: 400 })
    }

    // FK cross-tenant: il tecnico di default deve appartenere al lab (pattern PATCH lavori)
    if (update.tecnico_default_id != null) {
      const { data: tec, error: tecErr } = await svc
        .from('tecnici')
        .select('id')
        .eq('id', update.tecnico_default_id as string)
        .eq('laboratorio_id', utente.laboratorio_id)
        .is('deleted_at', null)
        .maybeSingle()
      if (tecErr) {
        console.error('[clienti PATCH] verifica tecnico_default_id:', tecErr.message)
        return NextResponse.json({ error: 'Errore verifica tecnico' }, { status: 500 })
      }
      if (!tec) {
        return NextResponse.json({ error: 'Tecnico non valido' }, { status: 403 })
      }
    }

    update.updated_at = new Date().toISOString()
```

e usa `update` (non più `body`) nella chiamata `.update(update)` esistente. Adatta il lookup `utenti` esistente perché selezioni anche `ruolo` (`select('laboratorio_id, ruolo')`) — serve al Task 7, innocuo ora.

- [ ] **Step 4: Esegui i test**

Run: `npx vitest run tests/unit/clienti-patch-allowlist.test.ts`
Expected: PASS (4/4). Poi `npx tsc --noEmit` → 0 errori. Poi `npx vitest run` intera → nessuna regressione (il test esistente `clienti-route` se copre la PATCH va aggiornato SOLO se fallisce per il nuovo 400 su body vuoto — comportamento voluto).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/clienti/[id]/route.ts tests/unit/clienti-patch-allowlist.test.ts
git commit -m "fix(clienti): PATCH ad allowlist esplicita (I-2, prerequisito portale)"
```

---

### Task 2: Migration Ondata 1 (SOLO file — l'apply è nel Task 6, gate Francesco)

**Files:**
- Create: `supabase/migrations/20260710180000_ondata1_portale_fatturazione_concordata.sql`

**Interfaces:**
- Produces: colonne `lavori.proposta_dentista/proposta_at`, `clienti.portale_fatturazione_attiva/portale_pin_hash/portale_pin_tentativi/portale_pin_bloccato_fino_a/portale_pin_generation`, `portale_accessi.lavoro_id/dettaglio`; RPC `portale_pin_tentativo_fallito(uuid)`; `annulla_consegna_atomica` aggiornata (azzera proposta); job pg_cron `portale-accessi-purge`.
- NOTA: fino al Task 6 (apply + regen types) il codice applicativo NON può riferire queste colonne — i task 3-5 non le toccano.

- [ ] **Step 1: Scrivi la migration**

Contenuto COMPLETO del file:

```sql
-- supabase/migrations/20260710180000_ondata1_portale_fatturazione_concordata.sql
-- Ondata 1 spec Portale Dentista v2 §4 — proposta dentista (D7), interruttore+PIN
-- per cliente (D2, D5, F1, F4), audit dettagliato (I-3, F9), retention 24 mesi
-- (F10), azzeramento proposta su annullo consegna (§8).

-- 1. lavori: la proposta del dentista (approccio A — D7).
--    Scrivibile SOLO dall'API portale; il congelamento sta nell'API (unica
--    scrittrice), nessun trigger.
ALTER TABLE public.lavori
  ADD COLUMN proposta_dentista text NULL
    CHECK (proposta_dentista IN ('fatturare','non_fatturare')),
  ADD COLUMN proposta_at timestamptz NULL;

-- 2. clienti: interruttore per-cliente (OFF di default) + PIN.
--    portale_pin_hash: formato scrypt$N$r$p$salt$hash, input peppered
--    (HMAC-SHA256 con PORTALE_PIN_PEPPER, env server-side — MAI nel DB).
ALTER TABLE public.clienti
  ADD COLUMN portale_fatturazione_attiva boolean NOT NULL DEFAULT false,
  ADD COLUMN portale_pin_hash text NULL,
  ADD COLUMN portale_pin_tentativi int NOT NULL DEFAULT 0,
  ADD COLUMN portale_pin_bloccato_fino_a timestamptz NULL,
  ADD COLUMN portale_pin_generation int NOT NULL DEFAULT 0;

-- 3. portale_accessi: dettaglio per gli eventi nuovi (I-3, F9).
ALTER TABLE public.portale_accessi
  ADD COLUMN lavoro_id uuid NULL REFERENCES public.lavori(id),
  ADD COLUMN dettaglio jsonb NULL;

-- Indice per il rate-limit per-IP del POST pin (F5): la query filtra
-- azione+ip+created_at. Parziale sulle sole azioni PIN per tenerlo piccolo.
CREATE INDEX idx_portale_accessi_pin_ip
  ON public.portale_accessi (ip_address, created_at)
  WHERE azione IN ('pin_ok','pin_errato','pin_bloccato');

-- 4. Incremento tentativi PIN atomico single-statement (F4 — mai
--    check-then-increment). Se un blocco precedente è scaduto, il ciclo
--    riparte da 1; al 5° errore scatta il blocco di 15 minuti.
CREATE FUNCTION public.portale_pin_tentativo_fallito(p_cliente_id uuid)
RETURNS TABLE(tentativi int, bloccato_fino_a timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE clienti SET
    portale_pin_tentativi = CASE
      WHEN portale_pin_bloccato_fino_a IS NOT NULL AND portale_pin_bloccato_fino_a <= now()
        THEN 1
      ELSE portale_pin_tentativi + 1
    END,
    portale_pin_bloccato_fino_a = CASE
      WHEN portale_pin_bloccato_fino_a IS NOT NULL AND portale_pin_bloccato_fino_a <= now()
        THEN NULL
      WHEN portale_pin_tentativi + 1 >= 5
        THEN now() + interval '15 minutes'
      ELSE portale_pin_bloccato_fino_a
    END
  WHERE id = p_cliente_id AND deleted_at IS NULL
  RETURNING portale_pin_tentativi, portale_pin_bloccato_fino_a;
$$;
REVOKE ALL ON FUNCTION public.portale_pin_tentativo_fallito(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portale_pin_tentativo_fallito(uuid) TO service_role;

-- 5. annulla_consegna_atomica: al ripristino del lavoro in 'pronto' si azzera
--    anche la proposta del dentista (§8 — la decisione_fatturazione invece
--    SOPRAVVIVE, posizione esplicita M-4). Stessa firma (uuid,uuid,integer):
--    CREATE OR REPLACE ammesso, REVOKE/GRANT rifatti comunque.
CREATE OR REPLACE FUNCTION public.annulla_consegna_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_finestra_ms integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_lavoro record;
  v_rows int;
  v_ddc_tot int;
  v_ddc_assente boolean := false;
BEGIN
  IF p_finestra_ms IS NULL OR p_finestra_ms < 1000 OR p_finestra_ms > 900000 THEN
    RAISE EXCEPTION 'p_finestra_ms fuori range (1s..15min)';
  END IF;

  SELECT id, stato, data_consegna_effettiva, incluso_in_fattura INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;
  IF v_lavoro.data_consegna_effettiva IS NULL
     OR now() - v_lavoro.data_consegna_effettiva > make_interval(secs => p_finestra_ms / 1000.0) THEN
    RETURN json_build_object('esito', 'finestra_scaduta');
  END IF;

  -- Doppio gate fiscale (i): fattura attiva collegata al lavoro
  PERFORM 1 FROM fatture
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato_sdi <> 'rifiutata';
  IF FOUND THEN
    RETURN json_build_object('esito', 'fattura_gia_emessa');
  END IF;

  -- Doppio gate fiscale (ii): cintura sul flag di claim
  IF v_lavoro.incluso_in_fattura THEN
    RETURN json_build_object('esito', 'fattura_gia_emessa');
  END IF;

  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL,
    -- Ondata 1 (§8): il lavoro esce dalla lista del portale — la proposta
    -- pre-annullo non deve rinascere alla riconsegna. Resta in portale_accessi.
    proposta_dentista = NULL, proposta_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'annullo: ripristino lavoro fallito'; END IF;

  -- P2-1: filtro corretto (include 'generata') + fail-closed sulla matrice esiti
  UPDATE dichiarazioni_conformita SET stato = 'annullata'
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato IN ('bozza','generata','firmata');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
    WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
    IF v_ddc_tot = 0 THEN
      v_ddc_assente := true; -- dato legacy/stub: consenti, segnala
    ELSE
      RAISE EXCEPTION 'annullo: DdC in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito', 'ok', 'ddc_assente', v_ddc_assente);
END;
$$;
REVOKE ALL ON FUNCTION public.annulla_consegna_atomica(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.annulla_consegna_atomica(uuid, uuid, integer) TO service_role;

-- 6. Retention log portale: 24 mesi con purge mensile (F10).
--    cron.schedule con jobname è idempotente (upsert) su pg_cron >= 1.4
--    (già attivo sul progetto: job refresh-dashboard-kpi).
SELECT cron.schedule(
  'portale-accessi-purge',
  '15 3 1 * *',
  $$DELETE FROM public.portale_accessi WHERE created_at < now() - interval '24 months'$$
);
```

- [ ] **Step 2: Verifica sintassi a freddo**

Run: `npx supabase db push --dry-run` (nel worktree, con `supabase/.temp` copiata)
Expected: elenca `20260710180000_ondata1_portale_fatturazione_concordata.sql` come pendente, nessun errore di parsing. **NON eseguire senza `--dry-run`: l'apply è il Task 6.**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260710180000_ondata1_portale_fatturazione_concordata.sql
git commit -m "feat(db): migration Ondata 1 — proposta dentista, PIN portale, audit dettagliato (file only, apply al gate)"
```

---

### Task 3: Fondamenta crypto — `pin.ts` + `sessione.ts` (nessuna dipendenza dal DB)

Due moduli puri, TDD, zero dipendenze nuove (solo `node:crypto`). Nessuna colonna DB toccata: eseguibile prima del gate.

**Files:**
- Create: `src/lib/portale/pin.ts`
- Create: `src/lib/portale/sessione.ts`
- Test: `tests/unit/portale-pin-lib.test.ts`, `tests/unit/portale-sessione-lib.test.ts`

**Interfaces:**
- Consumes: `process.env.PORTALE_PIN_PEPPER`, `process.env.PORTALE_SESSION_SECRET` (nei test: `vi.stubEnv`).
- Produces (usati dai Task 7-10 e 12):
  - `validaPinNuovo(pin: string): { ok: true } | { ok: false; errore: string }`
  - `hashPin(pin: string): string` — formato `scrypt$32768$8$1$<salt b64>$<hash b64>`
  - `verifyPin(pin: string, stored: string): boolean`
  - `SESSIONE_ECONOMICA_COOKIE = 'ua_portale_sessione'`, `SESSIONE_ECONOMICA_DURATA_MS = 1_800_000`
  - `creaSessioneEconomica(clienteId: string, pinGeneration: number): string`
  - `verificaSessioneEconomica(token: string | null | undefined, attesi: { clienteId: string; pinGeneration: number }): boolean`
  - `estraiCookie(cookieHeader: string | null, nome: string): string | null`

- [ ] **Step 1: Scrivi i test che falliscono**

`tests/unit/portale-pin-lib.test.ts`:

```ts
// tests/unit/portale-pin-lib.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('PORTALE_PIN_PEPPER', 'pepper-di-test-lungo-a-sufficienza')
})

import { validaPinNuovo, hashPin, verifyPin } from '@/lib/portale/pin'

describe('validaPinNuovo', () => {
  it('accetta un PIN a 6 cifre non banale', () => {
    expect(validaPinNuovo('483951')).toEqual({ ok: true })
  })
  it.each(['12345', '1234567', 'abc123', '12 456', ''])('rifiuta formato non valido: %s', (pin) => {
    expect(validaPinNuovo(pin).ok).toBe(false)
  })
  it.each(['000000', '111111', '999999'])('rifiuta le ripetizioni: %s', (pin) => {
    expect(validaPinNuovo(pin).ok).toBe(false)
  })
  it.each(['123456', '654321', '012345', '543210', '456789', '987654'])('rifiuta le sequenze: %s', (pin) => {
    expect(validaPinNuovo(pin).ok).toBe(false)
  })
  it.each(['010190', '311299', '250626'])('rifiuta le date evidenti DDMMYY: %s', (pin) => {
    expect(validaPinNuovo(pin).ok).toBe(false)
  })
})

describe('hashPin / verifyPin', () => {
  it('round-trip: il PIN corretto verifica, uno sbagliato no', () => {
    const stored = hashPin('483951')
    expect(stored).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/)
    expect(verifyPin('483951', stored)).toBe(true)
    expect(verifyPin('483952', stored)).toBe(false)
  })
  it('due hash dello stesso PIN differiscono (salt casuale)', () => {
    expect(hashPin('483951')).not.toBe(hashPin('483951'))
  })
  it('il pepper è parte dell\'input: con pepper diverso la verifica fallisce', () => {
    const stored = hashPin('483951')
    vi.stubEnv('PORTALE_PIN_PEPPER', 'un-altro-pepper')
    expect(verifyPin('483951', stored)).toBe(false)
  })
  it('verifyPin è robusta su stored malformato', () => {
    expect(verifyPin('483951', 'garbage')).toBe(false)
    expect(verifyPin('483951', 'scrypt$32768$8$1$soloquattroparti')).toBe(false)
  })
  it('hashPin esplode se il pepper manca (mai hash senza pepper — F1)', () => {
    vi.stubEnv('PORTALE_PIN_PEPPER', '')
    expect(() => hashPin('483951')).toThrow()
  })
})
```

`tests/unit/portale-sessione-lib.test.ts`:

```ts
// tests/unit/portale-sessione-lib.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-di-sessione-di-test')
})

import {
  creaSessioneEconomica, verificaSessioneEconomica, estraiCookie,
  SESSIONE_ECONOMICA_COOKIE, SESSIONE_ECONOMICA_DURATA_MS,
} from '@/lib/portale/sessione'

const attesi = { clienteId: 'cli-1', pinGeneration: 3 }

describe('sessione economica', () => {
  it('round-trip valido', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    expect(verificaSessioneEconomica(tok, attesi)).toBe(true)
  })
  it('binding cookie↔token: cliente diverso → invalida (F2)', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    expect(verificaSessioneEconomica(tok, { clienteId: 'cli-2', pinGeneration: 3 })).toBe(false)
  })
  it('cambio PIN (pin_generation) invalida la sessione', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    expect(verificaSessioneEconomica(tok, { clienteId: 'cli-1', pinGeneration: 4 })).toBe(false)
  })
  it('scadenza: oltre 30 minuti → invalida', () => {
    vi.useFakeTimers()
    const tok = creaSessioneEconomica('cli-1', 3)
    vi.advanceTimersByTime(SESSIONE_ECONOMICA_DURATA_MS + 1000)
    expect(verificaSessioneEconomica(tok, attesi)).toBe(false)
    vi.useRealTimers()
  })
  it('firma manomessa → invalida', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    const [body] = tok.split('.')
    expect(verificaSessioneEconomica(`${body}.AAAA`, attesi)).toBe(false)
  })
  it('payload manomesso (firma di un altro payload) → invalida', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    const sig = tok.split('.')[1]
    const forged = Buffer.from(JSON.stringify({ cliente_id: 'cli-1', exp: Date.now() + 9e9, pin_generation: 3 })).toString('base64url')
    expect(verificaSessioneEconomica(`${forged}.${sig}`, attesi)).toBe(false)
  })
  it('token assente/garbage → invalida senza throw', () => {
    expect(verificaSessioneEconomica(null, attesi)).toBe(false)
    expect(verificaSessioneEconomica(undefined, attesi)).toBe(false)
    expect(verificaSessioneEconomica('non.un.token', attesi)).toBe(false)
  })
})

describe('estraiCookie', () => {
  it('estrae il cookie dal header', () => {
    expect(estraiCookie(`a=1; ${SESSIONE_ECONOMICA_COOKIE}=tok123; b=2`, SESSIONE_ECONOMICA_COOKIE)).toBe('tok123')
  })
  it('null se assente o header nullo', () => {
    expect(estraiCookie('a=1', SESSIONE_ECONOMICA_COOKIE)).toBeNull()
    expect(estraiCookie(null, SESSIONE_ECONOMICA_COOKIE)).toBeNull()
  })
})
```

- [ ] **Step 2: Esegui i test per vederli fallire**

Run: `npx vitest run tests/unit/portale-pin-lib.test.ts tests/unit/portale-sessione-lib.test.ts`
Expected: FAIL — moduli inesistenti.

- [ ] **Step 3: Implementa `src/lib/portale/pin.ts`**

```ts
// src/lib/portale/pin.ts
// PIN portale dentista (spec portale-dentista-v2 §4/§5, audit F1).
// Formato hash: scrypt$N$r$p$<salt base64>$<hash base64>, parametri espliciti.
// Input di scrypt = HMAC-SHA256(PORTALE_PIN_PEPPER, pin): senza pepper un PIN
// a 6 cifre (10^6) si cracka offline da qualsiasi dump del DB.
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from 'node:crypto'

const SCRYPT_N = 32768 // 2^15
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEYLEN = 64
const SALT_BYTES = 16
// 128 * N * r = 32 MiB esatti: il default maxmem (32 MiB) non basta.
const SCRYPT_MAXMEM = 64 * 1024 * 1024

function pepper(): string {
  const p = process.env.PORTALE_PIN_PEPPER
  if (!p) throw new Error('PORTALE_PIN_PEPPER non configurato')
  return p
}

function pepperedPin(pin: string): Buffer {
  return createHmac('sha256', pepper()).update(pin).digest()
}

const SEQUENZE = new Set<string>()
for (let start = 0; start <= 9; start++) {
  let asc = ''
  let desc = ''
  for (let i = 0; i < 6; i++) {
    asc += (start + i) % 10
    desc += (start - i + 10) % 10
  }
  SEQUENZE.add(asc)
  SEQUENZE.add(desc)
}

function isDataEvidente(pin: string): boolean {
  // DDMMYY plausibile (01-31 / 01-12 / qualsiasi anno a 2 cifre)
  const gg = Number(pin.slice(0, 2))
  const mm = Number(pin.slice(2, 4))
  return gg >= 1 && gg <= 31 && mm >= 1 && mm <= 12
}

export function validaPinNuovo(pin: string): { ok: true } | { ok: false; errore: string } {
  if (!/^\d{6}$/.test(pin)) return { ok: false, errore: 'Il PIN deve essere di 6 cifre' }
  if (/^(\d)\1{5}$/.test(pin)) return { ok: false, errore: 'PIN troppo prevedibile' }
  if (SEQUENZE.has(pin)) return { ok: false, errore: 'PIN troppo prevedibile' }
  if (isDataEvidente(pin)) return { ok: false, errore: 'PIN troppo prevedibile (sembra una data)' }
  return { ok: true }
}

export function hashPin(pin: string): string {
  const salt = randomBytes(SALT_BYTES)
  const hash = scryptSync(pepperedPin(pin), salt, KEYLEN, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyPin(pin: string, stored: string): boolean {
  try {
    const parti = stored.split('$')
    if (parti.length !== 6 || parti[0] !== 'scrypt') return false
    const [, nStr, rStr, pStr, saltB64, hashB64] = parti
    const N = Number(nStr); const r = Number(rStr); const p = Number(pStr)
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false
    const salt = Buffer.from(saltB64, 'base64')
    const atteso = Buffer.from(hashB64, 'base64')
    if (salt.length === 0 || atteso.length === 0) return false
    const calcolato = scryptSync(pepperedPin(pin), salt, atteso.length, {
      N, r, p, maxmem: SCRYPT_MAXMEM,
    })
    return timingSafeEqual(calcolato, atteso)
  } catch {
    return false
  }
}
```

**Nota per l'implementer:** il test delle date usa `250626` (25/06/26) — valida come DDMMYY → rifiutata. Il PIN di riferimento nei test, `483951`, non è una data (mese 39) né sequenza né ripetizione.

- [ ] **Step 4: Implementa `src/lib/portale/sessione.ts`**

```ts
// src/lib/portale/sessione.ts
// Sessione economica del portale (spec §5, audit F2 — specifica vincolante).
// Cookie firmato HMAC-SHA256 con PORTALE_SESSION_SECRET (env DISTINTA dal
// pepper del PIN). Nasce SOLO dal POST pin riuscito; durata 30 min non
// rinnovabile; binding al cliente del token e alla pin_generation corrente.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSIONE_ECONOMICA_COOKIE = 'ua_portale_sessione'
export const SESSIONE_ECONOMICA_DURATA_MS = 30 * 60 * 1000

type SessionePayload = {
  cliente_id: string
  exp: number
  pin_generation: number
  nonce: string
}

function secret(): string {
  const s = process.env.PORTALE_SESSION_SECRET
  if (!s) throw new Error('PORTALE_SESSION_SECRET non configurato')
  return s
}

function firma(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url')
}

export function creaSessioneEconomica(clienteId: string, pinGeneration: number): string {
  const payload: SessionePayload = {
    cliente_id: clienteId,
    exp: Date.now() + SESSIONE_ECONOMICA_DURATA_MS,
    pin_generation: pinGeneration,
    nonce: randomBytes(8).toString('base64url'), // anti-fissazione: valore sempre nuovo, generato dal server
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${firma(body)}`
}

export function verificaSessioneEconomica(
  token: string | null | undefined,
  attesi: { clienteId: string; pinGeneration: number },
): boolean {
  try {
    if (!token) return false
    const [body, sig] = token.split('.')
    if (!body || !sig) return false
    const sigAttesa = firma(body)
    const a = Buffer.from(sig)
    const b = Buffer.from(sigAttesa)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionePayload
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return false
    if (payload.cliente_id !== attesi.clienteId) return false
    if (payload.pin_generation !== attesi.pinGeneration) return false
    return true
  } catch {
    return false
  }
}

export function estraiCookie(cookieHeader: string | null, nome: string): string | null {
  if (!cookieHeader) return null
  for (const parte of cookieHeader.split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nome) return v.join('=') || null
  }
  return null
}
```

- [ ] **Step 5: Esegui i test**

Run: `npx vitest run tests/unit/portale-pin-lib.test.ts tests/unit/portale-sessione-lib.test.ts`
Expected: PASS. `npx tsc --noEmit` → 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/lib/portale/pin.ts src/lib/portale/sessione.ts tests/unit/portale-pin-lib.test.ts tests/unit/portale-sessione-lib.test.ts
git commit -m "feat(portale): fondamenta crypto — PIN scrypt+pepper e sessione economica HMAC (F1, F2)"
```

---

### Task 4: Mockup portale — tastierino PIN + «Da fatturare» + stampa

Nessun codice React. Mockup HTML con dati realistici simulati, poi screenshot. **Il gate di approvazione è nel Task 6.**

**Files:**
- Create: `docs/design/mockups/2026-07-10-portale-da-fatturare.html`
- Create: `scripts/screenshot-mockups.mjs`
- Output: `docs/design/mockups/screenshots/2026-07-10-portale-da-fatturare-{390,768}.png`

**Interfaces:**
- Consumes: stile del portale esistente (`src/app/portale/[token]/page.tsx` — DM Sans, sfondo `#F8F9FA`, card bianche radius 16, testi `#111827`/`#6B7280`, primario `#D90012`). Il portale è fuori dal DS in-app: il mockup deve essere COERENTE col portale esistente, non col DS v3.
- Produces: il layout che il Task 12 implementa fedelmente.

- [ ] **Step 1: Scrivi il mockup**

Un solo file HTML `lang="it"` con `<style>` inline (pattern dei mockup del repo), che mostra in sequenza verticale 4 pannelli etichettati (mobile-first 390px, il file si adatta fino a 768):

1. **Tastierino PIN** — card centrata: titolo "Area riservata", sottotitolo "Inserisci il PIN che ti ha comunicato il laboratorio", 6 pallini che si riempiono, tastierino numerico 3×4 (1-9, vuoto, 0, ⌫) con tasti ≥44px, `inputmode` irrilevante (è un mockup: bottoni). Stato errore sotto i pallini: "PIN errato — 3 tentativi rimasti" in `#D90012`. Variante bloccato: pallini disabilitati + banner ambra "Troppi tentativi. Riprova tra 14:32" (countdown).
2. **Lista «Da fatturare»** — header sezione con titolo "Da fatturare" + bottone secondario "Stampa lista"; gruppi per mese ("Luglio 2026", "Giugno 2026"); per riga: numero lavoro (es. "N. 2026-0141"), tipo dispositivo ("Corona zirconia"), paziente minimizzato ("R. MARIO"), data consegna ("3 lug"), prezzo a destra ("€ 180,00"); sotto la riga il **toggle a due opzioni** "Fatturare / Non fatturare" (pill segmentata, selezione evidenziata); righe confermate: toggle sostituito da "✓ Confermato dal laboratorio — Fatturare" (e una variante in cui la decisione del lab differisce dalla proposta: mostra la decisione del lab); footer sticky: "Totale da fatturare: € 1.240,00".
3. **Stato vuoto** — "Nessun lavoro da fatturare al momento."
4. **Layout stampa** — pannello che simula la resa print: intestazione (nome laboratorio + studio dentistico + data), tabella righe (numero, dispositivo, consegna, proposta, prezzo), totale; bianco e nero sobrio.

Dati simulati realistici: 5-6 lavori tra giugno/luglio 2026, prezzi plausibili (€ 80–€ 450), 2 confermati (uno difforme), 1 non_fatturare.

- [ ] **Step 2: Scrivi `scripts/screenshot-mockups.mjs`**

```js
// scripts/screenshot-mockups.mjs
// Screenshot dei mockup HTML statici (file://) a 390 e 768 px.
// Uso: node scripts/screenshot-mockups.mjs docs/design/mockups/<file>.html
import { chromium } from '@playwright/test'
import { resolve, basename } from 'node:path'
import { mkdirSync } from 'node:fs'

const file = process.argv[2]
if (!file) { console.error('Uso: node scripts/screenshot-mockups.mjs <mockup.html>'); process.exit(1) }

const outDir = 'docs/design/mockups/screenshots'
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
for (const width of [390, 768]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.goto(`file://${resolve(file)}`)
  await page.waitForTimeout(300)
  const nome = basename(file, '.html')
  await page.screenshot({ path: `${outDir}/${nome}-${width}.png`, fullPage: true })
  await page.close()
}
await browser.close()
console.log('Screenshot salvati in', outDir)
```

- [ ] **Step 3: Genera gli screenshot**

Run: `node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-10-portale-da-fatturare.html`
Expected: 2 PNG in `docs/design/mockups/screenshots/`.

- [ ] **Step 4: Commit**

```bash
git add docs/design/mockups/2026-07-10-portale-da-fatturare.html scripts/screenshot-mockups.mjs docs/design/mockups/screenshots/2026-07-10-portale-da-fatturare-*.png
git commit -m "docs(design): mockup portale Da fatturare + PIN (gate CLAUDE.md 0B)"
```

---

### Task 5: Mockup lab — blocco scheda cliente + proposta nello scadenzario

**Files:**
- Create: `docs/design/mockups/2026-07-10-lab-portale-cliente-scadenzario.html`
- Output: `docs/design/mockups/screenshots/2026-07-10-lab-portale-cliente-scadenzario-{390,768}.png`

**Interfaces:**
- Consumes: DS v2.3 warm panna (`--bg:#DDD8D3 --sfc:#E4DFD9 --elv:#EDEDEA --t1:#1C1916 --t2:#4A3D33 --t3:#6B5C51 --primary:#D90012`, DM Sans) — queste schermate sono IN-APP, a differenza del portale. Layout scheda cliente: card `SectionCard` (radius 16, sfondo sfc). Scadenzario: card come `LavoriInAttesaSection` attuale (sfc, radius 16, bottoni pill elv).
- Produces: il layout che i Task 13 e 14 implementano fedelmente.

- [ ] **Step 1: Scrivi il mockup**

File HTML unico, due pannelli:

1. **Scheda cliente — card "Portale — fatturazione concordata"**: interruttore ON/OFF (switch con stato e label "Sezione economica del portale"); riga PIN: se mai impostato → campo 6 cifre + bottone "Imposta PIN"; se impostato → "PIN impostato ✓" + bottone "Cambia PIN" (il PIN NON si rivede mai); bottone secondario "Rigenera link portale" con testo di aiuto "Invalida il link attuale. Comunica il nuovo link al dentista."; nota operativa in piccolo: "Comunica il PIN a voce o per telefono, mai nello stesso messaggio del link."
2. **Scadenzario — riga "in attesa di decisione" con proposta**: la card attuale (N. lavoro, data, prezzo, bottoni "Fatturare"/"Non fatturare") arricchita con una riga evidenziata sopra i bottoni: "💬 Studio Bianchi propone: **Fatturare** · 2 lug, 14:30" e il bottone "Fatturare" evidenziato (bordo primary). Variante seconda card con proposta "Non fatturare". Terza card senza proposta (identica a oggi, per confronto).

Entrambi i temi: due colonne affiancate light/dark (pattern mockup del repo) o due sezioni; dark = flat, card leggermente più chiara del bg (`--bg:#1A1916 --sfc:#232018`).

- [ ] **Step 2: Genera gli screenshot**

Run: `node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-10-lab-portale-cliente-scadenzario.html`
Expected: 2 PNG.

- [ ] **Step 3: Commit**

```bash
git add docs/design/mockups/2026-07-10-lab-portale-cliente-scadenzario.html docs/design/mockups/screenshots/2026-07-10-lab-portale-cliente-scadenzario-*.png
git commit -m "docs(design): mockup lab — card portale in scheda cliente + proposta in scadenzario"
```

---

### Task 6: GATE FRANCESCO — approvazione mockup + apply migration + env (BLOCCANTE)

**Questo task NON procede senza risposta esplicita di Francesco.** Presentargli in un unico messaggio i 3 punti e attendere.

**Files:**
- Modify: `src/types/database.types.ts` (rigenerato, solo dopo l'apply)
- Modify: `.env.local` del worktree (valori dev delle 2 env nuove)
- Create: `docs/design/decisions/2026-07-10-portale-fatturazione-ui.md` (decisione mockup, dopo approvazione)

- [ ] **Step 1: Presenta a Francesco (e ATTENDI conferma esplicita)**

Mostra: (a) gli screenshot dei 2 mockup (Task 4-5); (b) la migration `20260710180000` con sintesi di cosa aggiunge; (c) la richiesta di creare le 2 env Vercel. Chiedi TRE conferme distinte:
1. "Ok mockup portale" (eventuali modifiche → iterare sul mockup PRIMA di procedere)
2. "Ok mockup lab"
3. "Ok apply migration al DB live + env Vercel"

- [ ] **Step 2 (solo dopo conferma 3): Apply migration al DB live**

Run (nel worktree, MAI MCP apply_migration):
```bash
npx supabase db push
```
Expected: applica SOLO `20260710180000_ondata1_portale_fatturazione_concordata.sql`, "Finished". Verifica post-apply oggetto per oggetto via MCP `execute_sql` (sola lettura):
```sql
SELECT column_name FROM information_schema.columns WHERE table_name='lavori' AND column_name LIKE 'proposta%';
SELECT column_name FROM information_schema.columns WHERE table_name='clienti' AND column_name LIKE 'portale_pin%' OR table_name='clienti' AND column_name='portale_fatturazione_attiva';
SELECT column_name FROM information_schema.columns WHERE table_name='portale_accessi' AND column_name IN ('lavoro_id','dettaglio');
SELECT proname FROM pg_proc WHERE proname='portale_pin_tentativo_fallito';
SELECT jobname, schedule FROM cron.job WHERE jobname='portale-accessi-purge';
SELECT prosrc LIKE '%proposta_dentista = NULL%' FROM pg_proc WHERE proname='annulla_consegna_atomica';
```
Expected: 2 colonne proposta, 4+1 colonne clienti, 2 colonne audit, RPC presente, job schedulato, `true` sulla RPC annullo.

- [ ] **Step 3 (solo dopo conferma 3): Env**

1. Genera i 2 segreti: `openssl rand -hex 32` (due volte, valori distinti).
2. Chiedi a Francesco di inserirli su Vercel (Production+Preview): `PORTALE_PIN_PEPPER`, `PORTALE_SESSION_SECRET` — oppure, se autorizza l'uso della CLI, `npx vercel env add`.
3. Aggiungi al `.env.local` del worktree i valori dev (possono essere diversi da quelli prod):
```
PORTALE_PIN_PEPPER=<hex dev>
PORTALE_SESSION_SECRET=<hex dev>
```
NON committare `.env.local`. Documenta nel messaggio a Francesco che la rotazione del pepper invalida TUTTI i PIN salvati (runbook: rotazione = reimpostare i PIN dei clienti).

- [ ] **Step 4: FASE 6b — rigenera i tipi**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```
Expected: tipi con le colonne nuove, tsc pulito (rimuovere eventuale log CLI in coda al file — gotcha noto).

- [ ] **Step 5: Scrivi la decisione design e committa**

Crea `docs/design/decisions/2026-07-10-portale-fatturazione-ui.md` con: data, screenshot approvati, eventuali modifiche richieste da Francesco e recepite, frase "Approvato da Francesco il <data>".

```bash
git add src/types/database.types.ts docs/design/decisions/2026-07-10-portale-fatturazione-ui.md
git commit -m "chore(db): FASE 6b — types rigenerati post-migration Ondata 1 + decisione design approvata"
```

---

### Task 7: Audit writer + PATCH clienti estesa (interruttore + PIN write-only) + rigenera link

**Files:**
- Create: `src/lib/portale/audit.ts`
- Create: `src/app/api/clienti/[id]/rigenera-portale-token/route.ts`
- Modify: `src/app/api/clienti/[id]/route.ts` (GET: campi portale derivati; PATCH: gestione dedicata campi portale)
- Test: `tests/unit/clienti-patch-portale.test.ts`, `tests/unit/rigenera-portale-token-route.test.ts`

**Interfaces:**
- Consumes: `validaPinNuovo`/`hashPin` da `@/lib/portale/pin` (Task 3); `PATCHABLE_FIELDS_CLIENTE` (Task 1); colonne del Task 2 (types rigenerati al Task 6).
- Produces:
  - `logPortaleAudit(svc, entry): Promise<boolean>` e `ipDaRequest(req): string | null` da `@/lib/portale/audit` (usati dai Task 8-10)
  - `AzionePortale` (union type delle azioni F9)
  - GET clienti/[id] risponde anche `portale_fatturazione_attiva: boolean` e `portale_pin_impostato: boolean` (MAI l'hash)
  - PATCH accetta `portale_fatturazione_attiva` (boolean) e `portale_pin` (string write-only, hashata server-side) — SOLO per ruoli `titolare`/`front_desk`
  - POST `/api/clienti/[id]/rigenera-portale-token` → `{ portale_token }`

- [ ] **Step 1: Scrivi `src/lib/portale/audit.ts`**

```ts
// src/lib/portale/audit.ts
// Writer unico di portale_accessi (spec §4, audit F9/I-3).
// Gli eventi economici NON vengono ingoiati in silenzio: il chiamante
// controlla il boolean di ritorno e risponde 500 se false (fail-loud).
import type { getServiceClient } from '@/lib/supabase/server-service'

type Svc = ReturnType<typeof getServiceClient>

export type AzionePortale =
  | 'view_lavori' | 'download_ddc' | 'download_buono'
  | 'view_fatturazione' | 'lista_stampata' | 'proposta_fatturazione'
  | 'pin_ok' | 'pin_errato' | 'pin_bloccato'
  | 'pin_impostato' | 'pin_reimpostato'
  | 'interruttore_on' | 'interruttore_off'
  | 'link_rigenerato'

export function ipDaRequest(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd ? fwd.split(',')[0].trim() : null
}

export async function logPortaleAudit(
  svc: Svc,
  entry: {
    laboratorio_id: string
    cliente_id: string
    azione: AzionePortale
    lavoro_id?: string | null
    dettaglio?: Record<string, unknown> | null
    req?: Request
  },
): Promise<boolean> {
  const { error } = await svc.from('portale_accessi').insert({
    laboratorio_id: entry.laboratorio_id,
    cliente_id: entry.cliente_id,
    azione: entry.azione,
    lavoro_id: entry.lavoro_id ?? null,
    dettaglio: entry.dettaglio ?? null,
    ip_address: entry.req ? ipDaRequest(entry.req) : null,
    user_agent: entry.req ? entry.req.headers.get('user-agent') : null,
  })
  if (error) {
    console.error('[portale audit] insert fallito:', error.message)
    return false
  }
  return true
}
```

- [ ] **Step 2: Scrivi i test della PATCH estesa (falliscono)**

`tests/unit/clienti-patch-portale.test.ts` — stesso scaffold mock del Task 1 (`vi.hoisted` + `mockFrom` con branch per tabella; il branch `clienti` deve gestire sia `select` — lettura stato attuale — sia `update` con cattura payload, sia il branch `portale_accessi` con cattura degli insert audit):

```ts
// tests/unit/clienti-patch-portale.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(), mockFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH, GET } from '../../src/app/api/clienti/[id]/route'

function req(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/clienti/cli-1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
const ctx = { params: Promise.resolve({ id: 'cli-1' }) }

let updatePayload: Record<string, unknown> | null
let auditInserts: Array<Record<string, unknown>>
let ruolo = 'titolare'
let clienteAttuale: Record<string, unknown>

beforeEach(() => {
  vi.stubEnv('PORTALE_PIN_PEPPER', 'pepper-test')
  updatePayload = null
  auditInserts = []
  ruolo = 'titolare'
  clienteAttuale = {
    portale_pin_hash: null, portale_pin_generation: 0, portale_fatturazione_attiva: false,
  }
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', ruolo }, error: null }) }) }) }
    }
    if (table === 'portale_accessi') {
      return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: null } } }
    }
    // clienti: select (stato attuale) + update (cattura payload)
    return {
      select: () => ({
        eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: clienteAttuale, error: null }) }) }) }),
      }),
      update: (payload: Record<string, unknown>) => {
        updatePayload = payload
        return { eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'cli-1', nome: 'M', cognome: 'R', studio_nome: null, updated_at: 'x' }, error: null }) }) }) }) }) }
      },
    }
  })
})

describe('PATCH clienti — campi portale', () => {
  it('403 se un tecnico tocca i campi portale', async () => {
    ruolo = 'tecnico'
    const res = await PATCH(req({ portale_fatturazione_attiva: true }), ctx)
    expect(res.status).toBe(403)
  })

  it('400 su PIN banale', async () => {
    const res = await PATCH(req({ portale_pin: '123456' }), ctx)
    expect(res.status).toBe(400)
  })

  it('PIN valido: hash scrypt, generation+1, contatori azzerati, audit pin_impostato con autore', async () => {
    const res = await PATCH(req({ portale_pin: '483951' }), ctx)
    expect(res.status).toBe(200)
    expect(String(updatePayload!.portale_pin_hash)).toMatch(/^scrypt\$32768\$8\$1\$/)
    expect(updatePayload).toMatchObject({ portale_pin_generation: 1, portale_pin_tentativi: 0, portale_pin_bloccato_fino_a: null })
    expect(updatePayload).not.toHaveProperty('portale_pin')
    expect(auditInserts).toHaveLength(1)
    expect(auditInserts[0]).toMatchObject({ azione: 'pin_impostato', cliente_id: 'cli-1' })
    expect((auditInserts[0].dettaglio as Record<string, unknown>).autore).toBe('user-1')
  })

  it('cambio PIN con hash già presente → azione pin_reimpostato', async () => {
    clienteAttuale = { ...clienteAttuale, portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_generation: 2 }
    await PATCH(req({ portale_pin: '483951' }), ctx)
    expect(updatePayload).toMatchObject({ portale_pin_generation: 3 })
    expect(auditInserts[0]).toMatchObject({ azione: 'pin_reimpostato' })
  })

  it('interruttore: solo boolean, audit interruttore_on quando cambia', async () => {
    expect((await PATCH(req({ portale_fatturazione_attiva: 'si' }), ctx)).status).toBe(400)
    const res = await PATCH(req({ portale_fatturazione_attiva: true }), ctx)
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ portale_fatturazione_attiva: true })
    expect(auditInserts.some((a) => a.azione === 'interruttore_on')).toBe(true)
  })

  it('la risposta non contiene mai l\'hash', async () => {
    const res = await PATCH(req({ portale_pin: '483951' }), ctx)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('scrypt$')
  })

  it('GET espone portale_pin_impostato boolean, mai l\'hash', async () => {
    clienteAttuale = { id: 'cli-1', portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_fatturazione_attiva: true }
    // adatta il mock select GET del describe se serve; l'asserzione chiave:
    const res = await GET(new Request('http://localhost/api/clienti/cli-1'), ctx)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('scrypt$')
    if (res.status === 200) {
      expect(json.cliente.portale_pin_impostato).toBe(true)
      expect(json.cliente).not.toHaveProperty('portale_pin_hash')
    }
  })
})
```

(Nota per l'implementer: il mock GET esistente nel file di test va completato con la chain reale della GET — `select().eq().eq().is().single()` + il conteggio `lavori` — copiare lo stile da `tests/unit/clienti-route.test.ts` se esiste, altrimenti replicare la chain della route.)

- [ ] **Step 3: Run test → FAIL**

Run: `npx vitest run tests/unit/clienti-patch-portale.test.ts`
Expected: FAIL (campi portale oggi scartati dall'allowlist, nessun audit).

- [ ] **Step 4: Estendi la route `src/app/api/clienti/[id]/route.ts`**

Nella PATCH, DOPO il parse del body e PRIMA del loop allowlist del Task 1, inserisci la gestione dedicata:

```ts
    // Campi portale (spec §6): gestione dedicata, MAI nell'allowlist generica.
    const toccaPortale = 'portale_fatturazione_attiva' in body || 'portale_pin' in body
    const azioniAudit: Array<{ azione: AzionePortale; dettaglio: Record<string, unknown> }> = []
    let statoAttuale: { portale_pin_hash: string | null; portale_pin_generation: number; portale_fatturazione_attiva: boolean } | null = null

    if (toccaPortale) {
      if (!['titolare', 'front_desk'].includes(utente.ruolo)) {
        return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
      }
      const { data: attuale, error: attErr } = await svc
        .from('clienti')
        .select('portale_pin_hash, portale_pin_generation, portale_fatturazione_attiva')
        .eq('id', id)
        .eq('laboratorio_id', utente.laboratorio_id)
        .is('deleted_at', null)
        .single()
      if (attErr || !attuale) {
        return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
      }
      statoAttuale = attuale
    }
```

poi, dopo il loop allowlist (che NON contiene i campi portale) e prima di `update.updated_at = ...`:

```ts
    if (toccaPortale && statoAttuale) {
      if ('portale_fatturazione_attiva' in body) {
        if (typeof body.portale_fatturazione_attiva !== 'boolean') {
          return NextResponse.json({ error: 'portale_fatturazione_attiva deve essere boolean' }, { status: 400 })
        }
        update.portale_fatturazione_attiva = body.portale_fatturazione_attiva
        if (body.portale_fatturazione_attiva !== statoAttuale.portale_fatturazione_attiva) {
          azioniAudit.push({
            azione: body.portale_fatturazione_attiva ? 'interruttore_on' : 'interruttore_off',
            dettaglio: { autore: user.id },
          })
        }
      }
      if ('portale_pin' in body) {
        // Write-only: arriva in chiaro dal form del lab, si hasha QUI (mai l'hash dal client)
        if (typeof body.portale_pin !== 'string') {
          return NextResponse.json({ error: 'PIN non valido' }, { status: 400 })
        }
        const valido = validaPinNuovo(body.portale_pin)
        if (!valido.ok) {
          return NextResponse.json({ error: valido.errore }, { status: 400 })
        }
        update.portale_pin_hash = hashPin(body.portale_pin)
        update.portale_pin_generation = (statoAttuale.portale_pin_generation ?? 0) + 1 // invalida le sessioni economiche in corso
        update.portale_pin_tentativi = 0
        update.portale_pin_bloccato_fino_a = null
        azioniAudit.push({
          azione: statoAttuale.portale_pin_hash ? 'pin_reimpostato' : 'pin_impostato',
          dettaglio: { autore: user.id },
        })
      }
    }
```

e DOPO l'update riuscito, prima del `return` finale:

```ts
    for (const a of azioniAudit) {
      const okAudit = await logPortaleAudit(svc, {
        laboratorio_id: utente.laboratorio_id,
        cliente_id: id,
        azione: a.azione,
        dettaglio: a.dettaglio,
        req,
      })
      if (!okAudit) {
        return NextResponse.json({ error: 'Errore registrazione audit' }, { status: 500 })
      }
    }
```

Import in testa: `import { validaPinNuovo, hashPin } from '@/lib/portale/pin'` e `import { logPortaleAudit, type AzionePortale } from '@/lib/portale/audit'`.

Nella **GET**: aggiungi `portale_fatturazione_attiva, portale_pin_hash` al select esistente, poi PRIMA della risposta:

```ts
    const { portale_pin_hash, ...clientePubblico } = cliente
    return NextResponse.json({
      cliente: { ...clientePubblico, portale_pin_impostato: portale_pin_hash != null, lavori_recenti_count },
    })
```

(l'hash non lascia MAI la route).

- [ ] **Step 5: Scrivi `src/app/api/clienti/[id]/rigenera-portale-token/route.ts` + test**

```ts
// src/app/api/clienti/[id]/rigenera-portale-token/route.ts
// F6 (spec §6): rotazione del link portale — nessuna rotation esisteva e il
// TTL è 1 anno. Invalida il link vecchio all'istante; nuovo TTL 1 anno.
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { logPortaleAudit } from '@/lib/portale/audit'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params

    const supabase = await getServerUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const svc = getServiceClient()
    const { data: utente } = await svc.from('utenti').select('laboratorio_id, ruolo').eq('id', user.id).single()
    if (!utente?.laboratorio_id) return NextResponse.json({ error: 'Nessun laboratorio' }, { status: 403 })
    if (!['titolare', 'front_desk'].includes(utente.ruolo)) {
      return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
    }

    const nuovoToken = randomUUID()
    const { data: aggiornato, error: updErr } = await svc
      .from('clienti')
      .update({
        portale_token: nuovoToken,
        portale_token_scade_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('laboratorio_id', utente.laboratorio_id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (updErr) {
      console.error('[rigenera token] update:', updErr.message)
      return NextResponse.json({ error: 'Errore rigenerazione link' }, { status: 500 })
    }
    if (!aggiornato) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: utente.laboratorio_id, cliente_id: id,
      azione: 'link_rigenerato', dettaglio: { autore: user.id }, req,
    })
    if (!okAudit) return NextResponse.json({ error: 'Errore registrazione audit' }, { status: 500 })

    return NextResponse.json({ portale_token: nuovoToken })
  } catch (err) {
    console.error('[rigenera token] errore:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
```

Test `tests/unit/rigenera-portale-token-route.test.ts` (stesso scaffold): 401 senza user; 403 ruolo `tecnico`; 200 con token UUID nuovo nel payload + update contiene `portale_token` e `portale_token_scade_at` + audit `link_rigenerato`; 404 cliente inesistente (`maybeSingle` → null).

- [ ] **Step 6: Run test → PASS, poi commit**

Run: `npx vitest run tests/unit/clienti-patch-portale.test.ts tests/unit/rigenera-portale-token-route.test.ts tests/unit/clienti-patch-allowlist.test.ts`
Expected: PASS tutti (anche i test Task 1 — regressione). `npx tsc --noEmit` pulito.

```bash
git add src/lib/portale/audit.ts src/app/api/clienti/[id]/route.ts src/app/api/clienti/[id]/rigenera-portale-token/route.ts tests/unit/clienti-patch-portale.test.ts tests/unit/rigenera-portale-token-route.test.ts
git commit -m "feat(clienti): interruttore portale + PIN write-only + rigenera link, con audit (D2, F6, F9)"
```

---

### Task 8: POST `/api/portale/[token]/pin` — verifica PIN e sessione economica

**Files:**
- Create: `src/lib/portale/guardie.ts`
- Create: `src/app/api/portale/[token]/pin/route.ts`
- Test: `tests/unit/portale-pin-route.test.ts`

**Interfaces:**
- Consumes: `verifyPin` (Task 3), sessione (Task 3), audit (Task 7), RPC `portale_pin_tentativo_fallito` (Task 2).
- Produces:
  - `risolviClientePortale(svc, token)` da `@/lib/portale/guardie` → `{ esito: 'ok', cliente: ClientePortale } | { esito: 'non_autorizzato' } | { esito: 'errore' }` (usata da Task 9-10)
  - `ClientePortale = { id, laboratorio_id, studio_nome, portale_fatturazione_attiva, portale_pin_hash, portale_pin_tentativi, portale_pin_bloccato_fino_a, portale_pin_generation }`
  - Cookie `ua_portale_sessione` sul 200

- [ ] **Step 1: Scrivi `src/lib/portale/guardie.ts`**

```ts
// src/lib/portale/guardie.ts
// Risoluzione del cliente dal token per le route ECONOMICHE del portale.
// F13: la risposta per token invalido/scaduto/inesistente è sempre la stessa
// (401 uniforme, mappata dal chiamante) — niente oracolo di esistenza.
import type { getServiceClient } from '@/lib/supabase/server-service'

type Svc = ReturnType<typeof getServiceClient>

export type ClientePortale = {
  id: string
  laboratorio_id: string
  studio_nome: string | null
  portale_fatturazione_attiva: boolean
  portale_pin_hash: string | null
  portale_pin_tentativi: number
  portale_pin_bloccato_fino_a: string | null
  portale_pin_generation: number
}

export async function risolviClientePortale(
  svc: Svc, token: string,
): Promise<{ esito: 'ok'; cliente: ClientePortale } | { esito: 'non_autorizzato' } | { esito: 'errore' }> {
  const { data, error } = await svc
    .from('clienti')
    .select('id, laboratorio_id, studio_nome, portale_token_scade_at, portale_fatturazione_attiva, portale_pin_hash, portale_pin_tentativi, portale_pin_bloccato_fino_a, portale_pin_generation')
    .eq('portale_token', token)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    console.error('[portale guardie] risoluzione token:', error.message)
    return { esito: 'errore' }
  }
  if (!data) return { esito: 'non_autorizzato' }
  if (data.portale_token_scade_at && new Date(data.portale_token_scade_at).getTime() < Date.now()) {
    return { esito: 'non_autorizzato' }
  }
  const { portale_token_scade_at: _scade, ...cliente } = data
  return { esito: 'ok', cliente }
}
```

- [ ] **Step 2: Scrivi i test (falliscono)**

`tests/unit/portale-pin-route.test.ts` — scaffold `vi.hoisted` con `mockFrom` + `mockRpc`; `vi.stubEnv` per pepper e session secret. Il branch `clienti` risponde alla `select` del token con un cliente configurabile; `portale_accessi` cattura insert e risponde al conteggio rate-limit; `mockRpc` simula `portale_pin_tentativo_fallito`.

```ts
// tests/unit/portale-pin-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockRpc: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { hashPin } from '@/lib/portale/pin'
import { POST } from '../../src/app/api/portale/[token]/pin/route'

const ctx = { params: Promise.resolve({ token: 'tok-1' }) }
function req(pin: string): Request {
  return new Request('http://localhost/api/portale/tok-1/pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest' },
    body: JSON.stringify({ pin }),
  })
}

let cliente: Record<string, unknown> | null
let auditInserts: Array<Record<string, unknown>>
let rateLimitCount = 0
let updatePayload: Record<string, unknown> | null

beforeEach(() => {
  vi.stubEnv('PORTALE_PIN_PEPPER', 'pepper-test')
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  rateLimitCount = 0
  updatePayload = null
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true,
    portale_pin_hash: hashPin('483951'), portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  mockRpc.mockResolvedValue({ data: [{ tentativi: 1, bloccato_fino_a: null }], error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return {
        select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }),
        update: (p: Record<string, unknown>) => { updatePayload = p; return { eq: async () => ({ error: null }) } },
      }
    }
    // portale_accessi: insert audit + count rate-limit
    return {
      insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: null } },
      select: () => ({
        eq: () => ({ in: () => ({ gte: async () => ({ count: rateLimitCount, error: null }) }) }),
      }),
    }
  })
})

describe('POST /api/portale/[token]/pin', () => {
  it('successo: 200, cookie di sessione, contatori azzerati, audit pin_ok con IP e UA', async () => {
    const res = await POST(req('483951'), ctx)
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('ua_portale_sessione=')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Strict')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('Max-Age=1800')
    expect(updatePayload).toMatchObject({ portale_pin_tentativi: 0, portale_pin_bloccato_fino_a: null })
    expect(auditInserts.some((a) => a.azione === 'pin_ok' && a.ip_address === '1.2.3.4' && a.user_agent === 'vitest')).toBe(true)
  })

  it('PIN errato: 401 con tentativi_rimasti, delega alla RPC atomica (F4), audit pin_errato', async () => {
    const res = await POST(req('000001'), ctx)
    expect(res.status).toBe(401)
    expect(mockRpc).toHaveBeenCalledWith('portale_pin_tentativo_fallito', { p_cliente_id: 'cli-1' })
    const json = await res.json()
    expect(json.tentativi_rimasti).toBe(4)
    expect(auditInserts.some((a) => a.azione === 'pin_errato')).toBe(true)
  })

  it('5° errore: la RPC blocca → 429 pin_bloccato con riprova_alle', async () => {
    const fra15 = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    mockRpc.mockResolvedValue({ data: [{ tentativi: 5, bloccato_fino_a: fra15 }], error: null })
    const res = await POST(req('000001'), ctx)
    expect(res.status).toBe(429)
    expect((await res.json()).riprova_alle).toBe(fra15)
    expect(auditInserts.some((a) => a.azione === 'pin_bloccato')).toBe(true)
  })

  it('già bloccato: 429 senza nemmeno verificare il PIN', async () => {
    cliente!.portale_pin_bloccato_fino_a = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const res = await POST(req('483951'), ctx)
    expect(res.status).toBe(429)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('interruttore OFF → 403; PIN non impostato → 403', async () => {
    cliente!.portale_fatturazione_attiva = false
    expect((await POST(req('483951'), ctx)).status).toBe(403)
    cliente!.portale_fatturazione_attiva = true
    cliente!.portale_pin_hash = null
    expect((await POST(req('483951'), ctx)).status).toBe(403)
  })

  it('token invalido/scaduto → 401 uniforme (F13)', async () => {
    cliente = null
    const res = await POST(req('483951'), ctx)
    expect(res.status).toBe(401)
    expect((await res.json()).errore).toBe('non_autorizzato')
  })

  it('rate limit per-IP: 20 eventi negli ultimi 15 min → 429 (F5)', async () => {
    rateLimitCount = 20
    expect((await POST(req('483951'), ctx)).status).toBe(429)
  })

  it('formato PIN non valido → 400 senza toccare contatori', async () => {
    expect((await POST(req('12ab56'), ctx)).status).toBe(400)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('audit pin_ok fallito → 500 (fail-loud, mai ingoiato)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') {
        return {
          select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      return {
        insert: async () => ({ error: { message: 'insert ko' } }),
        select: () => ({ eq: () => ({ in: () => ({ gte: async () => ({ count: 0, error: null }) }) }) }),
      }
    })
    expect((await POST(req('483951'), ctx)).status).toBe(500)
  })

  it('nessuna risposta contiene mai l\'hash del PIN', async () => {
    for (const pin of ['483951', '000001']) {
      const res = await POST(req(pin), ctx)
      expect(JSON.stringify(await res.json())).not.toContain('scrypt$')
    }
  })
})
```

- [ ] **Step 3: Run test → FAIL** (`npx vitest run tests/unit/portale-pin-route.test.ts` — route inesistente)

- [ ] **Step 4: Implementa la route**

```ts
// src/app/api/portale/[token]/pin/route.ts
// Spec §5/§7 — verifica PIN e apertura sessione economica.
// F4: incremento tentativi SOLO via RPC atomica. F5: rate limit per-IP.
// F13: 401 uniforme per token invalido/scaduto. Audit fail-loud.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { verifyPin } from '@/lib/portale/pin'
import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE, SESSIONE_ECONOMICA_DURATA_MS } from '@/lib/portale/sessione'
import { logPortaleAudit, ipDaRequest } from '@/lib/portale/audit'
import { risolviClientePortale } from '@/lib/portale/guardie'

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_FINESTRA_MS = 15 * 60 * 1000
const MAX_TENTATIVI_PIN = 5

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ errore: 'forbidden' }, { status: 403 })
    const { token } = await params

    let body: { pin?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ errore: 'body_non_valido' }, { status: 400 })
    }
    if (typeof body.pin !== 'string' || !/^\d{6}$/.test(body.pin)) {
      return NextResponse.json({ errore: 'formato_pin' }, { status: 400 })
    }

    const svc = getServiceClient()
    const ris = await risolviClientePortale(svc, token)
    if (ris.esito === 'errore') return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    if (ris.esito === 'non_autorizzato') return NextResponse.json({ errore: 'non_autorizzato' }, { status: 401 })
    const cliente = ris.cliente

    // F5 — rate limit per-IP, contato sugli eventi audit PIN degli ultimi 15 min.
    // Best-effort sul conteggio (il lockout per-cliente resta la difesa primaria).
    const ip = ipDaRequest(req)
    if (ip) {
      const { count, error: rlErr } = await svc
        .from('portale_accessi')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .in('azione', ['pin_ok', 'pin_errato', 'pin_bloccato'])
        .gte('created_at', new Date(Date.now() - RATE_LIMIT_FINESTRA_MS).toISOString())
      if (rlErr) {
        console.error('[portale pin] conteggio rate limit:', rlErr.message)
      } else if ((count ?? 0) >= RATE_LIMIT_MAX) {
        return NextResponse.json({ errore: 'troppi_tentativi' }, { status: 429 })
      }
    }

    if (!cliente.portale_fatturazione_attiva) {
      return NextResponse.json({ errore: 'sezione_disattivata' }, { status: 403 })
    }
    if (!cliente.portale_pin_hash) {
      return NextResponse.json({ errore: 'pin_non_impostato' }, { status: 403 })
    }

    if (cliente.portale_pin_bloccato_fino_a && new Date(cliente.portale_pin_bloccato_fino_a).getTime() > Date.now()) {
      const okAudit = await logPortaleAudit(svc, {
        laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'pin_bloccato', req,
      })
      if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
      return NextResponse.json(
        { errore: 'pin_bloccato', riprova_alle: cliente.portale_pin_bloccato_fino_a },
        { status: 429 },
      )
    }

    if (!verifyPin(body.pin, cliente.portale_pin_hash)) {
      const { data: esito, error: rpcErr } = await svc.rpc('portale_pin_tentativo_fallito', {
        p_cliente_id: cliente.id,
      })
      if (rpcErr || !esito || esito.length === 0) {
        console.error('[portale pin] rpc tentativo fallito:', rpcErr?.message)
        return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
      }
      const { tentativi, bloccato_fino_a } = esito[0]
      const appenaBloccato = bloccato_fino_a != null && new Date(bloccato_fino_a).getTime() > Date.now()
      const okAudit = await logPortaleAudit(svc, {
        laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id,
        azione: appenaBloccato ? 'pin_bloccato' : 'pin_errato',
        dettaglio: { tentativi }, req,
      })
      if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
      if (appenaBloccato) {
        return NextResponse.json({ errore: 'pin_bloccato', riprova_alle: bloccato_fino_a }, { status: 429 })
      }
      return NextResponse.json(
        { errore: 'pin_errato', tentativi_rimasti: Math.max(0, MAX_TENTATIVI_PIN - tentativi) },
        { status: 401 },
      )
    }

    // PIN corretto: reset contatori (best-effort), audit fail-loud, cookie di sessione.
    const { error: resetErr } = await svc
      .from('clienti')
      .update({ portale_pin_tentativi: 0, portale_pin_bloccato_fino_a: null })
      .eq('id', cliente.id)
    if (resetErr) console.error('[portale pin] reset tentativi:', resetErr.message)

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'pin_ok', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const sessione = creaSessioneEconomica(cliente.id, cliente.portale_pin_generation)
    const res = NextResponse.json({ ok: true })
    res.headers.set(
      'Set-Cookie',
      `${SESSIONE_ECONOMICA_COOKIE}=${sessione}; Max-Age=${Math.floor(SESSIONE_ECONOMICA_DURATA_MS / 1000)}; Path=/; HttpOnly; Secure; SameSite=Strict`,
    )
    return res
  } catch (err) {
    console.error('[portale pin] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run test → PASS** (`npx vitest run tests/unit/portale-pin-route.test.ts`), `npx tsc --noEmit` pulito.

- [ ] **Step 6: Commit**

```bash
git add src/lib/portale/guardie.ts src/app/api/portale/[token]/pin/route.ts tests/unit/portale-pin-route.test.ts
git commit -m "feat(portale): POST pin — verifica scrypt, lockout atomico, rate limit per-IP, sessione economica (F1-F5, F13)"
```

---

### Task 9: GET `/api/portale/[token]/fatturazione` + POST `…/fatturazione/stampa`

**Files:**
- Create: `src/lib/portale/minimizza-phi.ts` (estrazione dell'helper esistente)
- Modify: `src/app/portale/[token]/page.tsx` (usa l'helper condiviso al posto della copia locale)
- Create: `src/app/api/portale/[token]/fatturazione/route.ts`
- Create: `src/app/api/portale/[token]/fatturazione/stampa/route.ts`
- Test: `tests/unit/portale-fatturazione-get-route.test.ts`

**Interfaces:**
- Consumes: `risolviClientePortale` (Task 8), sessione (Task 3), audit (Task 7).
- Produces (consumati dalla UI Task 12):
  - `type RigaDaFatturare = { id: string; numero_lavoro: string; tipo_dispositivo: string; data_consegna: string | null; prezzo: number; paziente: string; proposta: 'fatturare' | 'non_fatturare' | null; proposta_at: string | null; confermato: boolean; decisione: 'fatturare' | 'non_fatturare' | null }`
  - `type FatturazioneResponse = { studio: string | null; gruppi: Array<{ mese: string; lavori: RigaDaFatturare[] }>; totale_fatturare: number }` (mese = `YYYY-MM`, gruppi ordinati dal più recente)
  - `minimizzaPhi(nome: string | null): string`

- [ ] **Step 1: Estrai `minimizzaPhi`**

Crea `src/lib/portale/minimizza-phi.ts` **spostando VERBATIM** la funzione `minimizzaPhi` da `src/app/portale/[token]/page.tsx` (righe ~10-17 — comportamento: `"ROSSI MARIO"` → `"R. MARIO"`), con `export function`. In `page.tsx` rimuovi la copia locale e importa `import { minimizzaPhi } from '@/lib/portale/minimizza-phi'`. Nessun cambio di comportamento: `npx vitest run` resta verde.

- [ ] **Step 2: Scrivi i test GET (falliscono)**

`tests/unit/portale-fatturazione-get-route.test.ts` — scaffold come Task 8. Il mock `lavori` risponde con una lista configurabile; il mock `fatture` risponde alla query `select('lavoro_id')…in('lavoro_id', ids)`; cookie di sessione generato con la lib vera (`creaSessioneEconomica`).

```ts
// tests/unit/portale-fatturazione-get-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { GET } from '../../src/app/api/portale/[token]/fatturazione/route'

const ctx = { params: Promise.resolve({ token: 'tok-1' }) }
function req(cookie?: string): Request {
  return new Request('http://localhost/api/portale/tok-1/fatturazione', {
    headers: {
      'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest',
      ...(cookie ? { cookie } : {}),
    },
  })
}
function cookieValido(): string {
  return `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`
}

let cliente: Record<string, unknown> | null
let lavori: Array<Record<string, unknown>>
let fattureLavoroIds: string[]
let fattureErrore: { message: string } | null
let auditInserts: Array<Record<string, unknown>>

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  fattureErrore = null
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true,
    portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  lavori = [
    { id: 'lav-1', numero_lavoro: '2026-0141', tipo_dispositivo: 'corona', data_consegna_effettiva: '2026-07-03T10:00:00Z', prezzo_unitario: 180, paziente_nome_snapshot: 'ROSSI MARIO', proposta_dentista: null, proposta_at: null, decisione_fatturazione: 'in_attesa' },
    { id: 'lav-2', numero_lavoro: '2026-0139', tipo_dispositivo: 'ponte', data_consegna_effettiva: '2026-06-28T10:00:00Z', prezzo_unitario: 450, paziente_nome_snapshot: 'VERDI ANNA', proposta_dentista: 'fatturare', proposta_at: '2026-07-01T09:00:00Z', decisione_fatturazione: 'in_attesa' },
    { id: 'lav-3', numero_lavoro: '2026-0135', tipo_dispositivo: 'protesi', data_consegna_effettiva: '2026-06-20T10:00:00Z', prezzo_unitario: 900, paziente_nome_snapshot: 'NERI LUCA', proposta_dentista: null, proposta_at: null, decisione_fatturazione: 'fatturare' },
  ]
  fattureLavoroIds = []
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }) }
    }
    if (table === 'lavori') {
      return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ order: async () => ({ data: lavori, error: null }) }) }) }) }) }) }) }
    }
    if (table === 'fatture') {
      return { select: () => ({ eq: () => ({ neq: () => ({ in: async () => (fattureErrore ? { data: null, error: fattureErrore } : { data: fattureLavoroIds.map((id) => ({ lavoro_id: id })), error: null }) }) }) }) }
    }
    // portale_accessi
    return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: null } } }
  })
})

describe('GET /api/portale/[token]/fatturazione', () => {
  it('lista completa: gruppi per mese desc, paziente minimizzato, prezzi, totale dei fatturare', async () => {
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.gruppi.map((g: { mese: string }) => g.mese)).toEqual(['2026-07', '2026-06'])
    const tutte = json.gruppi.flatMap((g: { lavori: unknown[] }) => g.lavori)
    expect(tutte).toHaveLength(3)
    expect(tutte[0].paziente).toBe('R. MARIO')
    expect(JSON.stringify(json)).not.toContain('ROSSI')
    // totale: lav-2 (proposta fatturare, in_attesa) + lav-3 (decisione fatturare) = 450 + 900
    expect(json.totale_fatturare).toBe(1350)
    expect(auditInserts.some((a) => a.azione === 'view_fatturazione' && a.ip_address === '1.2.3.4')).toBe(true)
  })

  it('VINCOLO doppia sorgente: lavoro con fattura attiva via fatture.lavoro_id escluso anche se incluso_in_fattura=false', async () => {
    fattureLavoroIds = ['lav-3'] // fatturato via xml route multi-lavoro: incluso_in_fattura resta false
    const res = await GET(req(cookieValido()), ctx)
    const json = await res.json()
    const tutte = json.gruppi.flatMap((g: { lavori: Array<{ id: string }> }) => g.lavori)
    expect(tutte.map((l: { id: string }) => l.id)).not.toContain('lav-3')
    expect(json.totale_fatturare).toBe(450)
  })

  it('FAIL-CLOSED: errore sulla lettura fatture → 500, mai lista parziale', async () => {
    fattureErrore = { message: 'boom' }
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })

  it('riga confermata: confermato=true e decisione esposta', async () => {
    const res = await GET(req(cookieValido()), ctx)
    const json = await res.json()
    const lav3 = json.gruppi.flatMap((g: { lavori: Array<{ id: string; confermato: boolean; decisione: string }> }) => g.lavori).find((l: { id: string }) => l.id === 'lav-3')
    expect(lav3.confermato).toBe(true)
    expect(lav3.decisione).toBe('fatturare')
  })

  it('senza sessione → 401; sessione di un altro cliente → 401; pin_generation cambiata → 401', async () => {
    expect((await GET(req(), ctx)).status).toBe(401)
    expect((await GET(req(`${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-2', 1)}`), ctx)).status).toBe(401)
    expect((await GET(req(`${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 99)}`), ctx)).status).toBe(401)
  })

  it('interruttore OFF → 403; token invalido → 401 uniforme', async () => {
    cliente!.portale_fatturazione_attiva = false
    expect((await GET(req(cookieValido()), ctx)).status).toBe(403)
    cliente = null
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(401)
    expect((await res.json()).errore).toBe('non_autorizzato')
  })
})
```

- [ ] **Step 3: Run test → FAIL** (`npx vitest run tests/unit/portale-fatturazione-get-route.test.ts`)

- [ ] **Step 4: Implementa la GET**

```ts
// src/app/api/portale/[token]/fatturazione/route.ts
// Spec §5/§7 — lista «Da fatturare» dietro PIN.
// VINCOLO doppia sorgente (Francesco): un lavoro è «già fatturato» se
// incluso_in_fattura=true OPPURE se esiste una fattura attiva con
// fatture.lavoro_id = lavoro (il percorso xml multi-lavoro non setta il flag).
// La seconda sorgente è FAIL-CLOSED: se la lettura fatture fallisce → 500.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { verificaSessioneEconomica, estraiCookie, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { logPortaleAudit } from '@/lib/portale/audit'
import { risolviClientePortale, type ClientePortale } from '@/lib/portale/guardie'
import { minimizzaPhi } from '@/lib/portale/minimizza-phi'

type RouteContext = { params: Promise<{ token: string }> }

export type RigaDaFatturare = {
  id: string
  numero_lavoro: string
  tipo_dispositivo: string
  data_consegna: string | null
  prezzo: number
  paziente: string
  proposta: 'fatturare' | 'non_fatturare' | null
  proposta_at: string | null
  confermato: boolean
  decisione: 'fatturare' | 'non_fatturare' | null
}
export type FatturazioneResponse = {
  studio: string | null
  gruppi: Array<{ mese: string; lavori: RigaDaFatturare[] }>
  totale_fatturare: number
}

/** Guardie comuni delle route economiche: token (401 uniforme) + interruttore + sessione. */
export async function guardieEconomiche(
  svc: ReturnType<typeof getServiceClient>, req: Request, token: string,
): Promise<{ ok: true; cliente: ClientePortale } | { ok: false; res: NextResponse }> {
  const ris = await risolviClientePortale(svc, token)
  if (ris.esito === 'errore') {
    return { ok: false, res: NextResponse.json({ errore: 'errore_interno' }, { status: 500 }) }
  }
  if (ris.esito === 'non_autorizzato') {
    return { ok: false, res: NextResponse.json({ errore: 'non_autorizzato' }, { status: 401 }) }
  }
  if (!ris.cliente.portale_fatturazione_attiva) {
    return { ok: false, res: NextResponse.json({ errore: 'sezione_disattivata' }, { status: 403 }) }
  }
  const cookie = estraiCookie(req.headers.get('cookie'), SESSIONE_ECONOMICA_COOKIE)
  if (!verificaSessioneEconomica(cookie, { clienteId: ris.cliente.id, pinGeneration: ris.cliente.portale_pin_generation })) {
    return { ok: false, res: NextResponse.json({ errore: 'sessione_scaduta' }, { status: 401 }) }
  }
  return { ok: true, cliente: ris.cliente }
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { token } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    const { data: lavori, error: lavErr } = await svc
      .from('lavori')
      .select('id, numero_lavoro, tipo_dispositivo, data_consegna_effettiva, prezzo_unitario, paziente_nome_snapshot, proposta_dentista, proposta_at, decisione_fatturazione')
      .eq('cliente_id', cliente.id)
      .eq('laboratorio_id', cliente.laboratorio_id)
      .eq('stato', 'consegnato')
      .eq('incluso_in_fattura', false)
      .is('deleted_at', null)
      .order('data_consegna_effettiva', { ascending: false })
    if (lavErr) {
      console.error('[portale fatturazione] lettura lavori:', lavErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }

    // Seconda sorgente di esclusione: fatture.lavoro_id (fail-closed).
    let esclusi = new Set<string>()
    const ids = (lavori ?? []).map((l) => l.id)
    if (ids.length > 0) {
      const { data: fatt, error: fatErr } = await svc
        .from('fatture')
        .select('lavoro_id')
        .eq('laboratorio_id', cliente.laboratorio_id)
        .neq('stato_sdi', 'rifiutata')
        .in('lavoro_id', ids)
      if (fatErr) {
        console.error('[portale fatturazione] lettura fatture:', fatErr.message)
        return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
      }
      esclusi = new Set((fatt ?? []).map((f) => f.lavoro_id).filter((x): x is string => x != null))
    }

    const righe: RigaDaFatturare[] = (lavori ?? [])
      .filter((l) => !esclusi.has(l.id))
      .map((l) => ({
        id: l.id,
        numero_lavoro: l.numero_lavoro,
        tipo_dispositivo: l.tipo_dispositivo,
        data_consegna: l.data_consegna_effettiva,
        prezzo: Number(l.prezzo_unitario ?? 0),
        paziente: minimizzaPhi(l.paziente_nome_snapshot),
        proposta: (l.proposta_dentista as RigaDaFatturare['proposta']) ?? null,
        proposta_at: l.proposta_at,
        confermato: l.decisione_fatturazione !== 'in_attesa',
        decisione: l.decisione_fatturazione !== 'in_attesa'
          ? (l.decisione_fatturazione as 'fatturare' | 'non_fatturare')
          : null,
      }))

    const gruppiMap = new Map<string, RigaDaFatturare[]>()
    for (const r of righe) {
      const mese = (r.data_consegna ?? '').slice(0, 7) || 'senza-data'
      const gruppo = gruppiMap.get(mese) ?? []
      gruppo.push(r)
      gruppiMap.set(mese, gruppo)
    }
    const gruppi = [...gruppiMap.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mese, lavoriMese]) => ({ mese, lavori: lavoriMese }))

    const totale_fatturare = righe
      .filter((r) => r.decisione === 'fatturare' || (!r.confermato && r.proposta === 'fatturare'))
      .reduce((s, r) => s + r.prezzo, 0)

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'view_fatturazione', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const risposta: FatturazioneResponse = { studio: cliente.studio_nome, gruppi, totale_fatturare }
    return NextResponse.json(risposta)
  } catch (err) {
    console.error('[portale fatturazione] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
```

**Nota Next.js:** esportare `guardieEconomiche` da un file route non è consentito (Next valida gli export dei route file). Metti `guardieEconomiche` in `src/lib/portale/guardie.ts` (stesso codice, import di `NextResponse`, `verificaSessioneEconomica`, `estraiCookie`, `SESSIONE_ECONOMICA_COOKIE`) e importala qui e nei Task 10. Anche `RigaDaFatturare`/`FatturazioneResponse` come `export type` sono ammessi nei route file (sono type-only) — se il build li rifiuta, spostali in `src/lib/portale/guardie.ts`.

- [ ] **Step 5: Implementa la POST stampa**

```ts
// src/app/api/portale/[token]/fatturazione/stampa/route.ts
// Spec §5 — l'azione «Stampa lista» va in audit (lista_stampata, fail-loud).
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { logPortaleAudit } from '@/lib/portale/audit'
import { guardieEconomiche } from '@/lib/portale/guardie'

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ errore: 'forbidden' }, { status: 403 })
    const { token } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: g.cliente.laboratorio_id, cliente_id: g.cliente.id, azione: 'lista_stampata', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[portale stampa] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Run test → PASS**, `npx tsc --noEmit` pulito, `npx vitest run` intera (regressione portale page dopo l'estrazione di minimizzaPhi).

- [ ] **Step 7: Commit**

```bash
git add src/lib/portale/minimizza-phi.ts src/lib/portale/guardie.ts src/app/portale/[token]/page.tsx src/app/api/portale/[token]/fatturazione/route.ts src/app/api/portale/[token]/fatturazione/stampa/route.ts tests/unit/portale-fatturazione-get-route.test.ts
git commit -m "feat(portale): GET lista Da fatturare con esclusione a doppia sorgente (incluso_in_fattura + fatture.lavoro_id, fail-closed) + audit stampa"
```

---

### Task 10: POST proposta + push aggregata + invariante D7

**Files:**
- Create: `src/app/api/portale/[token]/fatturazione/[lavoro_id]/route.ts`
- Modify: `src/app/api/lavori/[id]/route.ts` (SOLO commento-sentinella sopra `PATCHABLE_FIELDS`)
- Test: `tests/unit/portale-proposta-route.test.ts`, `tests/unit/lavori-patch-invariante-d7.test.ts`

**Interfaces:**
- Consumes: `guardieEconomiche` (Task 9), audit (Task 7), `triggerPushByRole(laboratorio_id, ruolo, payload)` da `@/lib/notifications/trigger` (esistente).
- Produces: POST body `{ proposta: 'fatturare' | 'non_fatturare' }` → 200 `{ ok: true, proposta }` | 400 | 401 | 403 | 404 | 409.

- [ ] **Step 1: Scrivi i test (falliscono)**

`tests/unit/portale-proposta-route.test.ts` — scaffold come Task 9, in più `vi.mock('@/lib/notifications/trigger')` con spy `mockTriggerPushByRole`. Il mock `lavori.update` cattura payload e chain di `.eq()` e risponde con N righe configurabili; secondo branch `lavori.select` per la rilettura 404/409; `fatture` come Task 9; `portale_accessi` cattura insert e risponde al conteggio aggregazione push.

Casi da coprire (ognuno un `it` con assert espliciti):
1. **Successo**: 200; l'update contiene SOLO `proposta_dentista` e `proposta_at` (`expect(Object.keys(updatePayload!).sort()).toEqual(['proposta_at','proposta_dentista'])` — colonne hardcoded, mai spread del body anche se il body contiene campi extra tipo `prezzo_unitario: 1`); audit `proposta_fatturazione` con `lavoro_id` e `dettaglio.proposta` e IP/UA.
2. **UPDATE condizionale single-statement (I-5)**: la chain dell'update registra i filtri `.eq('stato','consegnato')`, `.eq('decisione_fatturazione','in_attesa')`, `.eq('incluso_in_fattura',false)` — usare `createChain` di `tests/unit/helpers/supabase-chain-mock.ts` per registrare le calls, oppure un mock chain manuale che accumula `[metodo, args]`.
3. **0 righe aggiornate + lavoro esistente** → 409 `{ errore: 'non_modificabile' }` (congelamento post-conferma D6).
4. **0 righe + lavoro inesistente/di altro cliente** → 404 (mai 403 disambiguante).
5. **Gate fattura attiva (vincolo doppia sorgente)**: `fatture` risponde 1 riga → 409 `{ errore: 'gia_fatturato' }`, update MAI chiamato; errore lettura fatture → 500 (fail-closed).
6. **Body invalido** (`proposta: 'boh'`, body non JSON) → 400.
7. **Push aggregata**: conteggio audit `proposta_fatturazione` recente = 1 (solo quella corrente) → `mockTriggerPushByRole` chiamata per `titolare` E `front_desk` con payload SENZA prezzi (`expect(JSON.stringify(payload)).not.toMatch(/€|\d+[.,]\d{2}/)`); conteggio = 3 → push NON chiamata.
8. **Audit fallito** → 500 (fail-loud).
9. **Guardie**: senza sessione → 401; interruttore OFF → 403; token invalido → 401 uniforme.

`tests/unit/lavori-patch-invariante-d7.test.ts`:

```ts
// tests/unit/lavori-patch-invariante-d7.test.ts
// Invariante D7 (spec §7): la proposta del dentista NON è patchabile dal lab
// via PATCH lavori — se questa regressione scatta, qualcuno ha aggiunto
// proposta_dentista/proposta_at a PATCHABLE_FIELDS.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({ getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/route'

let updatePayload: Record<string, unknown> | null

beforeEach(() => {
  updatePayload = null
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1' }, error: null }) }) }) }
    }
    // lavori: select existing (incluso_in_fattura) + update
    return {
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { incluso_in_fattura: false }, error: null }) }) }) }) }),
      update: (p: Record<string, unknown>) => {
        updatePayload = p
        return { eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'lav-1', numero_lavoro: 'x', stato: 'pronto', updated_at: 'x' }, error: null }) }) }) }) }) }
      },
    }
  })
})

it('PATCH lavori con proposta_dentista/proposta_at nel body: i campi NON arrivano all\'update', async () => {
  const res = await PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descrizione: 'ok', proposta_dentista: 'fatturare', proposta_at: '2026-07-10T00:00:00Z' }),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
  expect(res.status).toBe(200)
  expect(updatePayload).not.toHaveProperty('proposta_dentista')
  expect(updatePayload).not.toHaveProperty('proposta_at')
  expect(updatePayload).toHaveProperty('descrizione')
})
```

(Nota: se la PATCH lavori reale ha una chain diversa, l'implementer adatta il mock alla chain vera leggendo `src/app/api/lavori/[id]/route.ts` — l'asserzione sul payload è ciò che conta.)

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implementa la route proposta**

```ts
// src/app/api/portale/[token]/fatturazione/[lavoro_id]/route.ts
// Spec §7 — il dentista propone. UPDATE condizionale single-statement (I-5):
// TUTTE le guardie nella WHERE, 0 righe → rilettura e mappa 404/409.
// Colonne hardcoded, mai spread del body — scrive SOLO i 2 campi proposta.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { logPortaleAudit } from '@/lib/portale/audit'
import { guardieEconomiche } from '@/lib/portale/guardie'
import { triggerPushByRole } from '@/lib/notifications/trigger'

const FINESTRA_AGGREGAZIONE_PUSH_MS = 15 * 60 * 1000

type RouteContext = { params: Promise<{ token: string; lavoro_id: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ errore: 'forbidden' }, { status: 403 })
    const { token, lavoro_id } = await params

    let body: { proposta?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ errore: 'body_non_valido' }, { status: 400 })
    }
    const proposta = body.proposta
    if (proposta !== 'fatturare' && proposta !== 'non_fatturare') {
      return NextResponse.json({ errore: 'proposta_non_valida' }, { status: 400 })
    }

    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    // Vincolo doppia sorgente: fattura attiva via fatture.lavoro_id → 409.
    // FAIL-CLOSED: errore in lettura → 500, mai proposta su lavoro forse fatturato.
    const { data: fatt, error: fatErr } = await svc
      .from('fatture')
      .select('id')
      .eq('laboratorio_id', cliente.laboratorio_id)
      .eq('lavoro_id', lavoro_id)
      .neq('stato_sdi', 'rifiutata')
      .limit(1)
    if (fatErr) {
      console.error('[portale proposta] lettura fatture:', fatErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }
    if (fatt && fatt.length > 0) {
      return NextResponse.json({ errore: 'gia_fatturato' }, { status: 409 })
    }

    const { data: aggiornati, error: updErr } = await svc
      .from('lavori')
      .update({ proposta_dentista: proposta, proposta_at: new Date().toISOString() })
      .eq('id', lavoro_id)
      .eq('cliente_id', cliente.id)
      .eq('laboratorio_id', cliente.laboratorio_id)
      .eq('stato', 'consegnato')
      .eq('decisione_fatturazione', 'in_attesa')
      .eq('incluso_in_fattura', false)
      .is('deleted_at', null)
      .select('id')
    if (updErr) {
      console.error('[portale proposta] update:', updErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }
    if (!aggiornati || aggiornati.length === 0) {
      // Rilettura per distinguere 404 (non del cliente / inesistente) da 409
      // (esiste ma non più proponibile: confermato, annullato, in fattura…).
      const { data: esiste } = await svc
        .from('lavori')
        .select('id')
        .eq('id', lavoro_id)
        .eq('cliente_id', cliente.id)
        .eq('laboratorio_id', cliente.laboratorio_id)
        .is('deleted_at', null)
        .maybeSingle()
      if (!esiste) return NextResponse.json({ errore: 'non_trovato' }, { status: 404 })
      return NextResponse.json({ errore: 'non_modificabile' }, { status: 409 })
    }

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id,
      azione: 'proposta_fatturazione', lavoro_id, dettaglio: { proposta }, req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    // Push aggregata per sessione di proposte (spec §6): una sola push quando
    // parte una raffica — se negli ultimi 15 min c'è solo l'evento appena
    // scritto, è la prima della sessione. Mai prezzi né saldi nel payload.
    try {
      const { count, error: cntErr } = await svc
        .from('portale_accessi')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', cliente.id)
        .eq('azione', 'proposta_fatturazione')
        .gte('created_at', new Date(Date.now() - FINESTRA_AGGREGAZIONE_PUSH_MS).toISOString())
      if (!cntErr && (count ?? 0) <= 1) {
        const payload = {
          title: 'Proposte di fatturazione',
          body: `${cliente.studio_nome ?? 'Un cliente'} ha inviato proposte di fatturazione`,
          url: `/scadenzario/${cliente.id}`,
        }
        await Promise.allSettled([
          triggerPushByRole(cliente.laboratorio_id, 'titolare', payload),
          triggerPushByRole(cliente.laboratorio_id, 'front_desk', payload),
        ])
      }
    } catch (pushErr) {
      console.error('[portale proposta] push:', pushErr) // mai bloccare la proposta per una push
    }

    return NextResponse.json({ ok: true, proposta })
  } catch (err) {
    console.error('[portale proposta] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commento-sentinella D7**

In `src/app/api/lavori/[id]/route.ts`, immediatamente sopra la dichiarazione `PATCHABLE_FIELDS`:

```ts
// ═══ SENTINELLA D7 (spec portale-dentista-v2 §7) ══════════════════════════
// proposta_dentista e proposta_at NON devono MAI entrare in questa allowlist:
// si scrivono SOLO dall'API portale (/api/portale/[token]/fatturazione/[id]).
// Test di regressione: tests/unit/lavori-patch-invariante-d7.test.ts
// ═══════════════════════════════════════════════════════════════════════════
```

- [ ] **Step 5: Run test → PASS** (`npx vitest run tests/unit/portale-proposta-route.test.ts tests/unit/lavori-patch-invariante-d7.test.ts`), `npx tsc --noEmit` pulito.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/portale/[token]/fatturazione/[lavoro_id]/route.ts src/app/api/lavori/[id]/route.ts tests/unit/portale-proposta-route.test.ts tests/unit/lavori-patch-invariante-d7.test.ts
git commit -m "feat(portale): POST proposta — UPDATE condizionale I-5, gate doppia sorgente, push aggregata, sentinella D7"
```

---

### Task 11: M-3 — la riapertura della decisione azzera la proposta

**Files:**
- Modify: `src/app/api/lavori/[id]/decisione-fatturazione/route.ts` (solo il payload dell'update)
- Test: `tests/unit/decisione-fatturazione-riapertura.test.ts`

**Interfaces:**
- Consumes: route esistente (guardie invariate: CSRF, auth, ruoli titolare/front_desk, `validaDecisioneFatturazione`).
- Produces: PATCH con `decisione: 'in_attesa'` azzera anche `proposta_dentista`/`proposta_at`; con `fatturare`/`non_fatturare` NON li tocca (la proposta resta come storia visibile della conferma).

- [ ] **Step 1: Scrivi il test (fallisce)**

```ts
// tests/unit/decisione-fatturazione-riapertura.test.ts
// M-3 (spec §8): riaprire la decisione (→ in_attesa) azzera la proposta —
// mai rimostrare come attiva una proposta pre-conferma stantia.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({ getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/decisione-fatturazione/route'

const ctx = { params: Promise.resolve({ id: 'lav-1' }) }
function req(decisione: string): Request {
  return new Request('http://localhost/api/lavori/lav-1/decisione-fatturazione', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisione }),
  })
}

let updatePayload: Record<string, unknown> | null

beforeEach(() => {
  updatePayload = null
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', ruolo: 'titolare' }, error: null }) }) }) }
    }
    // lavori: select existing + update — adattare alla chain reale della route
    return {
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { stato: 'consegnato', incluso_in_fattura: false }, error: null }) }) }) }) }),
      update: (p: Record<string, unknown>) => {
        updatePayload = p
        return { eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'lav-1', decisione_fatturazione: 'in_attesa' }, error: null }) }) }) }) }) }
      },
    }
  })
})

it('riapertura (in_attesa): azzera proposta_dentista e proposta_at', async () => {
  const res = await PATCH(req('in_attesa'), ctx)
  expect(res.status).toBe(200)
  expect(updatePayload).toMatchObject({ decisione_fatturazione: 'in_attesa', proposta_dentista: null, proposta_at: null })
})

it('conferma (fatturare): NON tocca la proposta', async () => {
  const res = await PATCH(req('fatturare'), ctx)
  expect(res.status).toBe(200)
  expect(updatePayload).not.toHaveProperty('proposta_dentista')
  expect(updatePayload).not.toHaveProperty('proposta_at')
})
```

(Adattare il mock alla chain reale di `decisione-fatturazione/route.ts` — la route esistente fa `select('stato, incluso_in_fattura')` poi `update(...)`; verificare la sequenza esatta di `.eq()`/`.is()` nel file e replicarla.)

- [ ] **Step 2: Run → FAIL**, poi implementa

Nella route, sostituisci il payload dell'update:

```ts
    const updatePayload: Record<string, unknown> = {
      decisione_fatturazione: decisione,
      updated_at: new Date().toISOString(),
    }
    if (decisione === 'in_attesa') {
      // M-3 (spec §8): la riapertura azzera la proposta del dentista — la
      // storia resta in portale_accessi; il dentista riparte da zero.
      updatePayload.proposta_dentista = null
      updatePayload.proposta_at = null
    }
```

e passa `updatePayload` alla `.update(...)` esistente (che oggi riceve l'oggetto inline).

- [ ] **Step 3: Run → PASS**, `npx tsc --noEmit` pulito, poi commit

```bash
git add src/app/api/lavori/[id]/decisione-fatturazione/route.ts tests/unit/decisione-fatturazione-riapertura.test.ts
git commit -m "feat(lavori): riapertura decisione azzera la proposta del dentista (M-3)"
```

---

### Task 12: UI portale — `FatturazioneSection` (PIN gate + lista + stampa)

**PREREQUISITO: mockup del Task 4 approvato da Francesco (Task 6). Il componente è fedele al mockup approvato — dove questo piano e il mockup divergono, VINCE IL MOCKUP.**

**Files:**
- Create: `src/components/features/portale/FatturazioneSection.tsx`
- Modify: `src/app/portale/[token]/page.tsx` (monta la sezione se `portale_fatturazione_attiva`)

**Interfaces:**
- Consumes: API dei Task 8-10 (`POST …/pin`, `GET …/fatturazione`, `POST …/fatturazione/[lavoro_id]`, `POST …/fatturazione/stampa`); tipi `RigaDaFatturare`/`FatturazioneResponse` (importati type-only da `@/lib/portale/guardie` o dal route file, come deciso al Task 9).
- Produces: `<FatturazioneSection token={string} />` (client component).

- [ ] **Step 1: Estendi la page**

In `src/app/portale/[token]/page.tsx`: aggiungi `portale_fatturazione_attiva` al select del cliente; dopo la sezione lavori consegnati renderizza:

```tsx
{cliente.portale_fatturazione_attiva && <FatturazioneSection token={token} />}
```

La page resta Server Component; la sezione è tutta client (`'use client'`).

- [ ] **Step 2: Implementa `FatturazioneSection.tsx`**

Struttura obbligata del componente (stile: coerente col portale esistente — DM Sans, card bianche radius 16, `#111827`/`#6B7280`, primario `#D90012` — e col mockup approvato):

```tsx
// src/components/features/portale/FatturazioneSection.tsx
'use client'
// Sezione economica del portale (spec §5) — fedele al mockup approvato
// docs/design/mockups/2026-07-10-portale-da-fatturare.html.
import { useCallback, useEffect, useState } from 'react'

type Riga = {
  id: string; numero_lavoro: string; tipo_dispositivo: string
  data_consegna: string | null; prezzo: number; paziente: string
  proposta: 'fatturare' | 'non_fatturare' | null; proposta_at: string | null
  confermato: boolean; decisione: 'fatturare' | 'non_fatturare' | null
}
type Dati = { studio: string | null; gruppi: Array<{ mese: string; lavori: Riga[] }>; totale_fatturare: number }

type Stato =
  | { fase: 'pin'; errore: string | null; tentativiRimasti: number | null; bloccatoFinoA: string | null; pinNonImpostato: boolean }
  | { fase: 'lista'; dati: Dati; errore: string | null }
  | { fase: 'caricamento' }

export function FatturazioneSection({ token }: { token: string }) {
  // stato macchina: caricamento → (GET fatturazione 401 → pin) | lista
  // Il primo GET sonda la sessione: se un cookie valido esiste già si salta il PIN.
  ...
}
```

Comportamenti obbligatori (ciascuno verificato a mano nel QA del Task 15):
1. **Mount** → `GET /api/portale/${token}/fatturazione`: 200 → fase `lista`; 401 → fase `pin`; 403 con `errore: 'pin_non_impostato'` dal POST pin → messaggio "Chiedi il PIN al tuo laboratorio" (spec §8); 403 `sezione_disattivata` → il componente non renderizza nulla (la page non lo monta comunque se OFF, doppia cintura).
2. **Tastierino PIN**: 6 pallini + griglia 3×4 (`1-9`, vuoto, `0`, `⌫`), tasti ≥44px, `aria-label` per tasto; al 6° digit → `POST …/pin` con `credentials: 'same-origin'`; su 200 → GET lista; su 401 `pin_errato` → shake + "PIN errato — N tentativi rimasti"; su 429 `pin_bloccato` → countdown `mm:ss` da `riprova_alle` (aggiornato con `setInterval` 1s, cleanup su unmount) e tastierino disabilitato; su 429 `troppi_tentativi` → "Troppi tentativi da questo dispositivo. Riprova più tardi."
3. **Lista**: gruppi per mese (intestazione "Luglio 2026" — formatter `new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })` su `mese + '-01'`, prima lettera maiuscola); riga con numero, tipo dispositivo, paziente minimizzato, data (`toLocaleDateString('it-IT')`), prezzo (`Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })`).
4. **Toggle proposta** (righe non confermate): due pill "Fatturare"/"Non fatturare", selezione = `proposta`; tap → `POST …/fatturazione/${id}` body `{ proposta }`; optimistic update locale + rollback su errore; su 409 → alert cortese "Il laboratorio ha già confermato questo lavoro" e ricarica lista (spec §8); su 401 `sessione_scaduta` → torna a fase `pin`.
5. **Righe confermate**: niente toggle; "✓ Confermato dal laboratorio — Fatturare/Non fatturare" (mostra la DECISIONE del lab, che può differire dalla proposta).
6. **Footer totale**: "Totale da fatturare: €X" (ricalcolato client-side dopo ogni optimistic update con la stessa regola del server: decisione `fatturare` oppure non confermato con proposta `fatturare`).
7. **Stampa**: bottone "Stampa lista" → `POST …/fatturazione/stampa` (fire-and-forget con `catch` silenzioso) poi `window.print()`. CSS print inline nel componente (`<style>{`@media print { … }`}</style>`): nasconde tastierino/toggle/bottoni, mostra intestazione (studio + data), righe tabellari e totali — fedele al pannello 4 del mockup.
8. **Stato vuoto**: "Nessun lavoro da fatturare al momento."
9. Fetch sempre con `credentials: 'same-origin'` (il cookie di sessione deve viaggiare).

- [ ] **Step 3: Verifica build e manuale**

Run: `npx tsc --noEmit && npx next build`
Expected: puliti. Verifica visiva rapida col dev server del worktree (`npm run dev -- -p 3013`) su `/portale/<token del cliente E2E>` — la QA completa è al Task 15.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/portale/FatturazioneSection.tsx src/app/portale/[token]/page.tsx
git commit -m "feat(portale): sezione Da fatturare — PIN gate, proposte, stampa (fedele al mockup approvato)"
```

---

### Task 13: UI lab — card "Portale — fatturazione concordata" in scheda cliente

**PREREQUISITO: mockup del Task 5 approvato (Task 6). Vince il mockup.**

**Files:**
- Create: `src/components/features/clienti/PortaleFatturazioneCard.tsx`
- Modify: `src/app/(app)/clienti/[id]/page.tsx`

**Interfaces:**
- Consumes: PATCH clienti estesa e POST rigenera token (Task 7); GET clienti page (select diretto server-side).
- Produces: `<PortaleFatturazioneCard clienteId={string} attiva={boolean} pinImpostato={boolean} />` (client component).

- [ ] **Step 1: Estendi la page**

In `src/app/(app)/clienti/[id]/page.tsx`: aggiungi `portale_fatturazione_attiva, portale_pin_hash` al select diretto; renderizza la card dentro/accanto alla sezione "Portale dentista" esistente (dove sta `PortaleLinkButtons`):

```tsx
<PortaleFatturazioneCard
  clienteId={cliente.id}
  attiva={cliente.portale_fatturazione_attiva}
  pinImpostato={cliente.portale_pin_hash != null}
/>
```

(`portale_pin_hash` NON scende mai al client: la page è Server Component, al componente passa solo il boolean.)

- [ ] **Step 2: Implementa la card**

Client component, stile DS v2.3 della scheda cliente (SectionCard pattern). Contenuti e comportamenti (fedeli al mockup):

1. **Interruttore** "Sezione economica del portale" → `PATCH /api/clienti/${id}` body `{ portale_fatturazione_attiva: !attiva }` + `router.refresh()`; pending state sul toggle.
2. **PIN**: se `!pinImpostato` → input 6 cifre (`inputMode="numeric"`, `pattern="\d{6}"`, `autoComplete="off"`) + bottone "Imposta PIN"; se impostato → riga "PIN impostato ✓" + bottone "Cambia PIN" che riapre l'input. Submit → `PATCH` body `{ portale_pin: valore }`; su 400 mostra l'errore del server (PIN banale); su successo svuota SEMPRE il campo (il PIN non si rivede mai) e `router.refresh()`. Nota fissa sotto: "Comunica il PIN a voce o per telefono, mai nello stesso messaggio del link."
3. **Rigenera link**: bottone secondario + conferma inline a due tap ("Sicuro? Il link attuale smette di funzionare" → "Conferma") → `POST /api/clienti/${id}/rigenera-portale-token` → su 200 `router.refresh()` + avviso "Link rigenerato. Comunica il nuovo link al dentista."
4. Fetch con `headers: { 'Content-Type': 'application/json' }` come `ClienteEditSheet` (same-origin per il CSRF).
5. Se l'utente non è titolare/front_desk la PATCH risponde 403: mostra "Solo il titolare o il front desk possono modificare il portale."

- [ ] **Step 3: Verifica** — `npx tsc --noEmit && npx next build` puliti; smoke test visivo sul dev server (scheda cliente E2E), 390/768/1280 light+dark.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/clienti/PortaleFatturazioneCard.tsx src/app/(app)/clienti/[id]/page.tsx
git commit -m "feat(clienti): card portale fatturazione concordata — interruttore, PIN, rigenera link (fedele al mockup)"
```

---

### Task 14: Scadenzario — la proposta del dentista sulla riga in attesa

**PREREQUISITO: mockup del Task 5 approvato (Task 6).**

**Files:**
- Modify: `src/lib/contabilita/queries.ts` (select + mapping `lavoriInAttesa`)
- Modify: `src/app/api/scadenzario/[cliente_id]/route.ts` (tipo `LavoroInAttesa`)
- Modify: `src/components/features/scadenzario/LavoriInAttesaSection.tsx`
- Modify: `src/app/(app)/scadenzario/[cliente_id]/page.tsx` (prop `studioNome`)
- Test: estendi `tests/unit/` SOLO se esiste già un test su `getContabilitaCliente` (verificare con `grep -rl getContabilitaCliente tests/`); altrimenti la copertura è il test visivo QA (la logica nuova è presentazionale).

**Interfaces:**
- Consumes: colonne `proposta_dentista`/`proposta_at` (Task 2/6).
- Produces: `LavoroInAttesa` esteso: `{ id, numero_lavoro, prezzo_unitario, data_consegna_prevista, proposta_dentista: 'fatturare' | 'non_fatturare' | null, proposta_at: string | null }`.

- [ ] **Step 1: Estendi query e tipo**

In `src/lib/contabilita/queries.ts` (riga ~207): aggiungi `proposta_dentista, proposta_at` al select dei lavori; nel blocco `if (l.decisione_fatturazione === 'in_attesa')` (riga ~232) estendi il push:

```ts
      lavoriInAttesa.push({
        id: l.id,
        numero_lavoro: l.numero_lavoro,
        prezzo_unitario: Number(l.prezzo_unitario ?? 0),
        data_consegna_prevista: l.data_consegna_prevista,
        proposta_dentista: (l.proposta_dentista as 'fatturare' | 'non_fatturare' | null) ?? null,
        proposta_at: l.proposta_at ?? null,
      })
```

(estendi anche il cast del `for` con `proposta_dentista: string | null; proposta_at: string | null`). In `src/app/api/scadenzario/[cliente_id]/route.ts` estendi l'interface `LavoroInAttesa` con i 2 campi.

- [ ] **Step 2: Estendi la sezione**

`LavoriInAttesaSection.tsx`: nuova prop `studioNome: string | null` (passata dalla page: `dati.cliente.studio_nome` — verificare il nome esatto del campo cliente in `EstrattoContoResponse`). Dentro la card, sopra i bottoni, se `l.proposta_dentista`:

```tsx
{l.proposta_dentista && (
  <div style={{
    fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: DS.t2,
    background: DS.elv, borderRadius: 10, padding: '6px 10px', marginTop: 8,
  }}>
    💬 {studioNome ?? 'Il dentista'} propone:{' '}
    <strong style={{ color: DS.t1 }}>
      {l.proposta_dentista === 'fatturare' ? 'Fatturare' : 'Non fatturare'}
    </strong>
    {l.proposta_at ? ` · ${formatData(l.proposta_at)}` : ''}
  </div>
)}
```

e il bottone corrispondente alla proposta evidenziato (`border: 2px solid var(--primary, #D90012)` sul bottone che coincide con `l.proposta_dentista`; l'altro invariato) — fedele al mockup. La card va ristrutturata: riga info + (proposta) + riga bottoni in colonna (`flexDirection: 'column'`) per far spazio alla proposta; la conferma usa la PATCH esistente invariata (D3).

- [ ] **Step 3: Verifica** — `npx tsc --noEmit && npx vitest run && npx next build` puliti.

- [ ] **Step 4: Commit**

```bash
git add src/lib/contabilita/queries.ts src/app/api/scadenzario/[cliente_id]/route.ts src/components/features/scadenzario/LavoriInAttesaSection.tsx src/app/(app)/scadenzario/[cliente_id]/page.tsx
git commit -m "feat(scadenzario): proposta del dentista visibile sulla riga in attesa, conferma via PATCH esistente (D3)"
```

---

### Task 15: Verifica finale + QA browser (lab E2E) + review

**Files:** nessuno nuovo (fix eventuali emersi dalla QA, ognuno col suo mini ciclo test+commit).

- [ ] **Step 1: Verifica completa (output reale, FASE 7)**

```bash
npx tsc --noEmit          # atteso: 0 errori
npx vitest run            # atteso: >= 1168 pass (baseline) + i nuovi, 4 skipped, 0 fail
npx next build            # atteso: build pulita
```

- [ ] **Step 2: Seed QA sul lab E2E**

Prerequisito: `.env.local` presente nel worktree; seed con `DOTENV_CONFIG_PATH=.env.local npx tsx scripts/seed-e2e.ts` (gotcha dotenv noto). Poi via SQL diretto (MCP `execute_sql`) o fetch autenticate sul dev server: (a) attiva `portale_fatturazione_attiva` sul cliente E2E e imposta un PIN noto (es. `483951`) VIA API (`PATCH /api/clienti/[id]` — così si testa il percorso reale di hashing); (b) crea 3-4 lavori `consegnato` con `incluso_in_fattura=false` e prezzi; (c) crea 1 fattura attiva con `lavoro_id` di uno di essi e `incluso_in_fattura=false` (il caso xml multi-lavoro) — questo lavoro NON deve comparire nella lista.

- [ ] **Step 3: QA browser (dev server worktree, es. porta 3013)**

Percorsi da verificare (390px primario per il portale; 390/768/1280 light+dark per le schermate lab):
1. Portale `/portale/<token E2E>`: sezione presente; PIN sbagliato ×2 → messaggi tentativi; PIN giusto → lista; **il lavoro con fattura via `lavoro_id` NON c'è**; toggle proposta → riga aggiornata; refresh → proposta persistita.
2. 5 PIN errati → blocco con countdown; verifica su DB `portale_pin_bloccato_fino_a` valorizzato; reset del PIN dalla scheda cliente → sblocco + sessioni invalidate (la lista chiede di nuovo il PIN: `pin_generation` cambiata).
3. Scadenzario cliente E2E: riga con "propone: Fatturare"; conferma → riga sparita dalle in-attesa; portale → riga "✓ Confermato".
4. Conferma difforme (dentista propone fatturare, lab sceglie non fatturare) → portale mostra la decisione del lab.
5. Scheda cliente: interruttore OFF → portale senza sezione al refresh (messaggio cortese); ON di nuovo; "Rigenera link" → vecchio link 404/LinkScaduto, nuovo link funziona.
6. Stampa: anteprima print del browser corretta (headless: `page.emulateMedia({ media: 'print' })` + screenshot).
7. Audit: `SELECT azione, ip_address, user_agent, lavoro_id, dettaglio FROM portale_accessi WHERE cliente_id = '<E2E>' ORDER BY created_at DESC` → presenti `pin_errato`×n con IP/UA, `pin_bloccato`, `pin_ok`, `view_fatturazione`, `proposta_fatturazione` (con lavoro_id e dettaglio), `pin_impostato`/`pin_reimpostato`/`interruttore_on`/`interruttore_off`/`link_rigenerato` con autore.
8. Annullo+riconsegna entro 10 min su un lavoro con proposta → alla riconsegna `proposta_dentista IS NULL` (RPC aggiornata), `decisione_fatturazione` sopravvive (M-4).

- [ ] **Step 4: Cleanup QA a baseline**

Rimuovi i dati QA dal lab E2E (DELETE mirati su lavori/fatture di test creati, reset colonne portale del cliente E2E: interruttore OFF, hash NULL, contatori 0, generation invariata va bene; righe `portale_accessi` di test eliminate). Verifica il baseline con una SELECT di conteggio.

- [ ] **Step 5: Review finale whole-branch**

`superpowers:requesting-code-review` sull'intero branch (diff da `main`). Dominio critico (fiscale + portale esposto): review rafforzata su F1-F13, I-2, I-5, D7. Fix eventuali con TDD. Poi BP-1 (MEMORY.md + ROADMAP) e proposta di merge a Francesco (`superpowers:finishing-a-development-branch`).

---

## Ordine di esecuzione e dipendenze

```
Task 1 (I-2) → Task 2 (migration file) → Task 3 (lib crypto) → Task 4-5 (mockup)
     → TASK 6 = GATE FRANCESCO (mockup + db push + env) →
Task 7 (PATCH clienti + audit) → Task 8 (POST pin) → Task 9 (GET lista + stampa)
     → Task 10 (POST proposta + D7) → Task 11 (M-3)
     → Task 12 (UI portale) → Task 13 (UI scheda cliente) → Task 14 (scadenzario)
     → Task 15 (verifica + QA + review)
```

I Task 7-14 dipendono TUTTI dal Task 6 (types rigenerati + env). I Task 1-5 non toccano colonne nuove e girano prima del gate.

## Self-review (eseguita in stesura)

1. **Copertura spec §4-§8:** §4 modello dati → Task 2; congelamento in API → Task 10 (WHERE) e §8 riapertura → Task 11; audit F9+I-3+F10 → Task 2+7; §5 due livelli/PIN/sessione/CSRF/lista/stampa → Task 3, 8, 9, 12; §6 scheda cliente+interruttore+PIN+rigenera (F6)+prerequisito I-2 → Task 1, 7, 13; scadenzario D3 → Task 14; push aggregata → Task 10; §7 tabella API → Task 7-10 (PATCH decisione invariata salvo M-3); regole trasversali (fail-closed, risposte minime, F13, F5, D7) → Global Constraints + Task 8-10; §8 edge case → annullo/riconsegna (Task 2), riapertura (Task 11), OFF a metà sessione / 409+ricarica / PIN dimenticato / senza PIN / lavori pre-deploy / ultima-vince / M-5 LIMIT 50 (solo da rivedere coi volumi: nessuna azione, notato per il ledger).
2. **Tipi coerenti tra task:** `RigaDaFatturare`/`FatturazioneResponse` (Task 9→12), `ClientePortale`+`guardieEconomiche` (Task 8→9→10), `PATCHABLE_FIELDS_CLIENTE` (Task 1→7), firme pin/sessione (Task 3→7/8/12), `LavoroInAttesa` esteso (Task 14).
3. **Placeholder:** i Task UI 12-14 descrivono comportamenti puntuali ma delegano il dettaglio visivo al mockup approvato — deliberato (gate CLAUDE.md 0B: il mockup È la specifica visiva; scriverlo due volte creerebbe conflitto). Nessun TBD/TODO.
