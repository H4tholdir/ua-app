# Code 58-59 — La prova non si riscrive: one-way sulla chiusura degli avvisi + firma same-lab

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Scritto:** 11 agosto 2026, 15:13 (`provato:` `date` → `Tue Aug 11 15:13:05 CEST 2026`).
**Mandato:** ⚖️ **D361** (156ª tornata) — le due strutturali di banca dati della revisione finale di ramo
(`docs/roadmap/2026-08-11-revisione-finale-ramo-referto.md`, Area A → righe **58** e **59** della coda in
`docs/roadmap/ROADMAP-UFFICIALE.md`). Panel advisor non necessario: già istruite dal referto (fondamento D361).
**Ramo:** `code-58-59-prova-inalterabile` (nel repo principale — 🛑 worktree VIETATI).

**Goal:** rendere la chiusura di un avviso al dentista **irreversibile e inalterabile** (riga 58) e la sua
firma **impossibile da attribuire a un utente di un altro laboratorio** (riga 59) — al livello del database,
prima della prima onboarding reale.

**Architecture:** due migration indipendenti. ① Un **trigger BEFORE UPDATE one-way** su
`avvisi_dentista`: una riga già comunicata non cambia mai più `stato`, `comunicato_at`, `comunicato_da`,
`testo_inviato` (le altre colonne — `visto_dal_dentista_at`, `campi_corretti` — restano libere per i loro
flussi). ② Il **modello FK composita anti cross-tenant** già usato tre volte nel progetto
(`20260806142910`): `UNIQUE (id, laboratorio_id)` su `utenti` + sostituzione della FK semplice di
`comunicato_da` con la composita `(comunicato_da, laboratorio_id) → utenti (id, laboratorio_id)`.

**Tech Stack:** PostgreSQL (Supabase, progetto `iagibumwjstnveqpjbwq`) · migrations SQL ·
test d'integrazione vitest (progetto `integration`, `tests/integration/*.rpc.test.ts`, client `pg`,
transazioni sempre annullate).

## Global Constraints

- 🗄️ **D311:** timestamp migration con `date -u "+%Y%m%d%H%M%S"`, in comando SEPARATO, e si usa QUELL'output. **Pavimento: `20260810072748`** (qualunque timestamp di oggi lo supera; verificarlo comunque a vista).
- 🗄️ **D284:** le migration si applicano da soli: `npx supabase db push --linked --yes` (dalla cartella `ua-app/`, `--yes` obbligatorio). ⚠️ `scripts/psql.mjs` NON registra la migration nel ledger: non è un sostituto.
- 🗄️ **Il file NON è la prova:** dopo ogni push, verifica sul catalogo vivo via `node scripts/psql.mjs -c "…"`.
- 🧪 Test d'integrazione in locale: servono le variabili di `.env.local` — `set -a && . ./.env.local; set +a && npx vitest run tests/integration/<file>`. Senza, i test si SALTANO (non falliscono): un run «verde» senza `SUPABASE_DB_URL` non prova niente — controllare che il conteggio dica *passed*, non *skipped*.
- 🧪 Margine di gruppo del progetto `integration`: 15000 ms (`vitest.config.ts`) — non aggiungere timeout per-prova salvo misura che lo imponga.
- 📐 Convenzioni di nome (misurate sul modello `20260806142910`): UNIQUE composito → `<tabella>_id_lab_uk` · FK composita → `<nome>_fk` (sostituisce la `_fkey` auto-generata, che si droppa) · trigger → prefisso `trg_`.
- 🛑 **D318:** `git status` prima di ogni commit · `git add <percorsi>` (MAI `-A`) · messaggi con `-F <file>`.
- 🛑 FASE 6b dopo OGNI migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → rimuovere eventuale riga CLI spuria in fondo → `npx tsc --noEmit`.
- 🛑 R-E2: un difetto trovato fuori mandato si RIFERISCE nel report del task, non si corregge.
- Gate estetico L2 e FASE 9 browser: **non dovuti** — nessuna superficie toccata, solo banca dati e test. La FASE 7 piena (tsc + vitest + next build) resta dovuta e sta nel Task 3.

---

## Registro delle prove (R-P1) — tutte eseguite l'11/08/2026 sul catalogo/banco vivo

| # | Sonda | Esito incollato |
|---|---|---|
| P0 | `SELECT to_regclass('public.avvisi_dentista')` | `'avvisi_dentista'` (il nome vero; `public.avvisi` → `null`) |
| P1 | vincoli su `avvisi_dentista` e `utenti` (`pg_constraint`) | avvisi: 5 FK + PK + 3 CHECK (`avviso_stato_vocabolario` · `avviso_comunicato_ha_autore_e_data` · `avviso_testo_solo_se_dall_app`); `comunicato_da` FK **semplice** `REFERENCES utenti(id)`. utenti: PK(id) · CHECK `utenti_lab_required_for_non_admin` = `ruolo='admin_sistema' OR laboratorio_id IS NOT NULL` · **NESSUN UNIQUE (id, laboratorio_id)** |
| P2 | FK che referenziano `utenti(id)` (catalogo) | **23 vincoli** (censimento sotto), nessuno composito |
| P3 | GRANT UPDATE per colonna su `avvisi_dentista` | `authenticated` e `service_role`: esattamente `stato · comunicato_at · comunicato_da · testo_inviato` |
| P4 | trigger su `avvisi_dentista` (`pg_trigger`, non-internal) | **0 righe** — nessun trigger: niente impedisce la riapertura |
| P5 | nullabilità | `utenti.laboratorio_id` → `attnotnull = false` (nullable) |
| P6a | **riapertura di un avviso chiuso** (BEGIN…ROLLBACK TO SAVEPOINT) | `UPDATE … SET stato='da_comunicare', comunicato_at=NULL, comunicato_da=NULL, testo_inviato=NULL WHERE stato='comunicato_dall_app'` → **1 riga, RIUSCITO** (il difetto 58 è vivo) |
| P6b | **riattribuzione firma su avviso chiuso** (stessa transazione annullata) | `UPDATE … SET comunicato_da=(SELECT id FROM utenti WHERE ruolo='admin_sistema' LIMIT 1)` → **1 riga, RIUSCITO** verso un utente con `laboratorio_id NULL` (il difetto 59 è vivo) |
| P7 | funzioni che toccano `avvisi_dentista` (`pg_proc`) | solo `avvisi_segna_visti` e `correggi_e_riemetti_atomica`, entrambe SECURITY DEFINER |
| P8 | dati esistenti | utenti: 1 `admin_sistema` con lab **NULL**, 6 utenti lab-bound · **0 firme cross-tenant** in `avvisi_dentista` (la FK composita valida i dati di oggi senza pulizia) |
| P9 | collisioni sui nomi nuovi | `avviso_chiusura_one_way` (pg_proc) → 0 · `trg_avviso_chiusura_one_way` (pg_trigger) → 0 · `utenti_id_lab_uk` / `avvisi_dentista_comunicato_da_fk` (pg_constraint) → 0 |
| P10 | ordine in `admin_delete_laboratorio` (corpo vivo, `pg_get_functiondef`) | `DELETE FROM dichiarazioni_conformita` e `DELETE FROM lavori` (che portano via gli avvisi in CASCATA) stanno **PRIMA** di `DELETE FROM utenti … ruolo <> 'admin_sistema'` → `UPDATE utenti SET laboratorio_id=NULL … ruolo='admin_sistema'` → `DELETE FROM laboratori`. Quando la funzione tocca `utenti`, nessun avviso è più vivo: la FK composita **non cambia** il comportamento della cancellazione |

I blocchi SQL e di test nei task qui sotto sono **`non eseguito`**: accanto a ciascuno sta il comando con
cui l'esecutore li verifica (è la forma R-P1 per il codice di piano).

## Registro delle letture (R-P2)

Letture delegabili fatte da **sei lettori subagent con domande falsificabili** (risposte con citazioni
testuali, workflow `letture-piano-code-58-59` dell'11/08/2026); letture dirette dell'autore del piano
marcate «diretta».

| File | Letto | Da chi |
|---|---|---|
| `supabase/migrations/20260809123206_avvisi_dentista.sql` | intero | lettore grant-e-check (DDL, 3 CHECK, RLS, righe 15-97 citate) |
| `supabase/migrations/20260809124517_avvisi_dentista_update_per_colonne.sql` | intero | lettore grant-e-check (REVOKE:32, GRANT:38-39, 4 minacce:11-22) |
| `supabase/migrations/20260806142910_correzione_eventi_qualita_cross_tenant.sql` | intero | lettore modello-fk (UNIQUE:23-26, 3 FK composite:30-50, REVOKE/GRANT:89-90) |
| `supabase/migrations/20260806140823_eventi_qualita.sql` | intero | lettore modello-fk (RLS append-only:78-84, COMMENT:86-89) |
| `supabase/migrations/20260810072748_avvisi_segna_visti.sql` | intero | lettore rpc-recenti (firma:31-36, UPDATE solo `visto_dal_dentista_at`:41-45, REVOKE/GRANT:51-52) |
| `supabase/migrations/20260809133546_correggi_e_riemetti_con_avviso.sql` | intero | lettore rpc-recenti (INSERT incondizionato:488-496, MAI update di avvisi esistenti) |
| `src/app/api/lavori/[id]/avviso/route.ts` | funzioni intere | lettore scritture-server (UPDATE:414-420 con `.in('stato', STATI_APERTI)` — mai una riga chiusa; 409 sul già chiuso:362-364; cancello `puoChiudereAvviso`:249-251) |
| `src/lib/avvisi/{stati,ruoli,portale,queries}.ts` | funzioni intere | lettore scritture-server (STATI_AVVISO:8, STATI_CHIUSI:18, `RUOLI_CHIUSURA_AVVISO = ['titolare','tecnico','front_desk']`:72 — **admin_rete e admin_sistema esclusi per nome, D342**) |
| `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` | commenti architetturali 60-101 | lettore scritture-server («non esiste uno stato annullato», il ritorno è vietato di proposito) |
| `supabase/schema.sql` + migrations su `utenti` | mirate | lettore censimento-utenti (nullable da `20260517000003`; ⚠️ schema.sql è una FOTO STANTIA: NOT NULL e 4 ruoli — non fidarsene) |
| `vitest.config.ts` · `tests/integration/helpers/pg-client.ts` · `tests/integration/eventi-qualita-schema.rpc.test.ts` | intero/mirate | lettore pattern-test (progetto `integration`:58-65, `withRollback`, `skipIntegrationTests`, prove FK composite:103-145) |
| `tests/integration/avvisi-dentista-schema.rpc.test.ts` | **intero, diretta** (633 righe) | autore del piano — helper `riferimentiVeri`/`attesoRifiuto`/`inserisci` da rispecchiare; ⚠️ riga 349 asserisce il NOME della FK che il Task 2 rinomina; riga 335: `INSERT INTO auth.users (id)` funziona in transazione annullata (ricetta per utenti usa-e-getta) |
| `docs/roadmap/2026-08-11-revisione-finale-ramo-referto.md` | intero, diretta | autore del piano (il mandato, Area A) |
| corpo vivo di `admin_delete_laboratorio` | intero, diretta (P10) | autore del piano |

**NON letti** (dichiarato): gli altri file che referenziano `utenti(id)` — nessuno è toccato da questo piano
(v. censimento).

## Censimento degli identificatori (R-P6)

**Toccati da questo piano:**

| Identificatore | Dove | Che cosa gli succede |
|---|---|---|
| `avvisi_dentista_comunicato_da_fkey` | catalogo · `src/types/database.types.ts:218` · `tests/integration/avvisi-dentista-schema.rpc.test.ts:349` | **DROPPATA e sostituita** da `avvisi_dentista_comunicato_da_fk` (composita). I tre punti si aggiornano così: catalogo → migration Task 2 · types → rigenerazione FASE 6b (Task 2, passo 7) · test:349 → modifica esplicita (Task 2, passo 3). `grep -rn "comunicato_da_fkey" src tests supabase docs` DEVE dare 0 hit di codice a fine Task 2 (la citazione STORICA in `ROADMAP-UFFICIALE.md` riga 43 resta: racconta il passato, non il presente — e la riga 59 chiusa nel Task 3 dichiarerà il nome nuovo) |
| `utenti_id_lab_uk` (nuovo) | `utenti` | UNIQUE (id, laboratorio_id) — P9: nessuna collisione |
| `avviso_chiusura_one_way()` + `trg_avviso_chiusura_one_way` (nuovi) | `avvisi_dentista` | funzione + trigger — P9: nessuna collisione |
| `stato · comunicato_at · comunicato_da · testo_inviato` | `avvisi_dentista` | congelate DOPO la chiusura dal trigger; il GRANT per colonna (P3) resta INVARIATO (serve alla chiusura legittima delle righe aperte) |
| `visto_dal_dentista_at` · `campi_corretti` | `avvisi_dentista` | **fuori dal congelamento**, di proposito: la ricevuta di lettura (`avvisi_segna_visti`) e gli update futuri anticipati da `20260809133546:60-67` devono passare anche su righe chiuse |

**Censiti e NON toccati (fuori mandato, si dichiara e basta):** le altre **22 FK verso `utenti(id)`**
(P2: `cicli_produzione.created_by/updated_by`, `credito_clienti_movimenti.registrato_da`,
`data_processing_agreements.emesso_da`, `dichiarazioni_conformita.generated_by`,
`eventi_qualita.created_by`, `fascicoli_tecnici.approvato_da`, `fasi_produzione.updated_by`,
`inviti_rete.invitato_da`, `lavori.segnalazione_by`, `lavori_prescrizioni.confermata_da`,
`lavori_rifacimenti.created_by`, `lavoro_prove.created_by`, `messaggi.utente_id`, `notifiche.utente_id`,
`pagamenti.registrato_da/annullato_da`, `reti_membri.aggiunto_da_admin`, `risk_analyses.approvato_da`,
`scarichi_magazzino.operatore_id`, `tecnici.utente_id`, `valutazioni_evento.classificato_da`,
`incidenti_mdr.created_by`) restano semplici: se meritino la composita è una valutazione da riferire
(R-E2) come voce di coda futura, NON si corregge qui. Nessuna allowlist TypeScript è toccata; nessun nome
esce da un'allowlist (la casistica R-P6 «riga senza destinazione» non si dà).

## FASE 3 — gate architetturale (risposte)

1. **Tenant isolation:** tocca l'isolamento NEL VERSO GIUSTO — la FK composita lo rafforza. RLS e `current_lab_id()` invariati (P1/p5: le due policy restano identiche).
2. **Schema drift:** 2 migration → FASE 6b (gen types + tsc) dopo ciascuna. Il diff atteso dei types è la sola voce `foreignKeyName`/`columns` della Relationship di `comunicato_da` (censimento).
3. **API contract:** nessun payload cambia. La rotta di chiusura filtra già `.in('stato', STATI_APERTI)` e risponde 409 sul già-chiuso: **nessun flusso legittimo incontra il trigger né la FK** (lettore scritture-server, domanda 2: «NON TROVATO» un percorso che riapre — con tre prove citate).
4. **Rollback:** una migration inversa (DROP TRIGGER + DROP FUNCTION; DROP CONSTRAINT composita + ricrea la `_fkey` semplice + DROP UNIQUE). Nessun dato viene riscritto da queste migration: reversibilità piena.
5. **Dominio critico:** sì (migrations) → percorso Grande: questo piano, esecutori freschi per task (R-E1), review fra i task.

---

### Task 1: Vincolo one-way sulla chiusura (riga 58)

**Files:**
- Create: `tests/integration/avvisi-chiusura-one-way.rpc.test.ts`
- Create: `supabase/migrations/<TS1>_avvisi_chiusura_one_way.sql` (TS1 dal passo 1)

**Interfaces:**
- Consumes: helper `withRollback`/`skipIntegrationTests` da `tests/integration/helpers/pg-client` (esistenti, invariati).
- Produces: trigger `trg_avviso_chiusura_one_way` + funzione `public.avviso_chiusura_one_way()` sul banco. Il Task 2 non dipende da questo task; il Task 3 verifica entrambi.

- [ ] **Step 1: timestamp della migration (D311)**

```bash
date -u "+%Y%m%d%H%M%S"
```
Output = `<TS1>`. Deve superare `20260810072748` (lo supera per costruzione: oggi è l'11/08).

- [ ] **Step 2: scrivi il test che DEVE fallire** — `non eseguito` · verifica: passo 3

Crea `tests/integration/avvisi-chiusura-one-way.rpc.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Riga 58 della coda (revisione finale di ramo, 11/08/2026): un avviso GIÀ
// COMUNICATO restava riscrivibile e riapribile — `provato:` in transazione
// annullata l'11/08 la riapertura coi tre NULL e la riattribuzione della firma
// RIUSCIVANO entrambe. La tabella è «la prova che è avvenuta» (GDPR Art. 5(2)):
// da questa migration un trigger one-way congela stato, autore, data e testo
// DOPO la chiusura. Le altre colonne (visto_dal_dentista_at, campi_corretti)
// restano libere: la ricevuta di lettura e le correzioni future devono passare.
//
// ⚠️ Helper locali RICOPIATI da avvisi-dentista-schema.rpc.test.ts (riferimentiVeri,
// attesoRifiuto, inserisci): è la convenzione viva di tests/integration/ (ogni file
// è autosufficiente). La loro estrazione in helpers/ è pulizia da riferire, non da
// fare qui (R-E2).

const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

async function riferimentiVeri(client: Client) {
  const { rows } = await client.query(
    `SELECT (SELECT id FROM lavori   WHERE laboratorio_id = $1 ORDER BY created_at LIMIT 1) AS lavoro_id,
            (SELECT id FROM clienti  WHERE laboratorio_id = $1 ORDER BY created_at LIMIT 1) AS cliente_id,
            (SELECT id FROM dichiarazioni_conformita WHERE laboratorio_id = $1
              ORDER BY created_at LIMIT 1) AS dichiarazione_id,
            (SELECT id FROM utenti   WHERE laboratorio_id = $1 ORDER BY created_at LIMIT 1) AS utente_id`,
    [LAB_A]
  )
  const r = rows[0]
  for (const [nome, valore] of Object.entries(r)) {
    if (!valore) throw new Error(`il lab E2E ${LAB_A} non ha ${nome}: eseguire scripts/seed-e2e.ts`)
  }
  return r as {
    lavoro_id: string; cliente_id: string; dichiarazione_id: string; utente_id: string
  }
}

async function attesoRifiuto(
  client: Client, cosa: string, fn: () => Promise<unknown>
): Promise<{ code: string; message: string }> {
  const sp = `sp_${randomUUID().replace(/-/g, '').slice(0, 12)}`
  await client.query(`SAVEPOINT ${sp}`)
  try {
    await fn()
    throw new Error(`ATTESO RIFIUTO, INVECE ACCETTATO: ${cosa}`)
  } catch (e) {
    const err = e as Error & { code?: string }
    if (err.message.startsWith('ATTESO RIFIUTO')) {
      await client.query(`ROLLBACK TO SAVEPOINT ${sp}`)
      throw err
    }
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`)
    return { code: err.code ?? '', message: err.message.split('\n')[0] }
  }
}

function inserisci(
  client: Client,
  rif: { lavoro_id: string; cliente_id: string; dichiarazione_id: string },
  campi: Record<string, unknown>
) {
  const base: Record<string, unknown> = {
    laboratorio_id: LAB_A,
    lavoro_id: rif.lavoro_id,
    cliente_id: rif.cliente_id,
    dichiarazione_id: rif.dichiarazione_id,
    ...campi,
  }
  const nomi = Object.keys(base)
  const segnaposti = nomi.map((_, i) => `$${i + 1}`).join(', ')
  return client.query(
    `INSERT INTO public.avvisi_dentista (${nomi.join(', ')}) VALUES (${segnaposti})
     RETURNING id, stato, testo_inviato, comunicato_at, comunicato_da, visto_dal_dentista_at, campi_corretti`,
    Object.values(base)
  )
}

/** Un avviso già comunicato a voce, nato dentro la transazione. */
async function avvisoChiusoAVoce(client: Client) {
  const rif = await riferimentiVeri(client)
  const { rows: [avviso] } = await inserisci(client, rif, {
    stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: rif.utente_id,
  })
  return { rif, avviso }
}

/** Un avviso già comunicato dall'app (col testo), nato dentro la transazione. */
async function avvisoChiusoDallApp(client: Client) {
  const rif = await riferimentiVeri(client)
  const { rows: [avviso] } = await inserisci(client, rif, {
    stato: 'comunicato_dall_app', comunicato_at: new Date(),
    comunicato_da: rif.utente_id, testo_inviato: 'La dichiarazione e stata corretta e rifatta.',
  })
  return { rif, avviso }
}

describe.skipIf(skipIntegrationTests)('avvisi_dentista — la chiusura è one-way (riga 58)', () => {
  // ── i cinque movimenti che DEVONO essere respinti ─────────────────────────
  describe('una riga comunicata non si riscrive', () => {
    it('① la RIAPERTURA (ritorno a da_comunicare coi tre NULL) è respinta', async () => {
      // `provato:` l'11/08, PRIMA del trigger, questo UPDATE riusciva (P6a).
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const e = await attesoRifiuto(client, 'riapertura di un avviso comunicato', () =>
          client.query(
            `UPDATE public.avvisi_dentista
                SET stato='da_comunicare', comunicato_at=NULL, comunicato_da=NULL, testo_inviato=NULL
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('② la RIATTRIBUZIONE della firma è respinta', async () => {
      // `provato:` P6b — prima del trigger la firma si spostava perfino su un
      // utente con laboratorio_id NULL.
      await withRollback(async (client) => {
        const { rif, avviso } = await avvisoChiusoAVoce(client)
        // un secondo utente vero, usa-e-getta (ricetta avvisi-dentista-schema:335)
        const altroId = randomUUID()
        await client.query(`INSERT INTO auth.users (id) VALUES ($1)`, [altroId])
        await client.query(
          `INSERT INTO public.utenti (id, laboratorio_id, nome, cognome, ruolo)
           VALUES ($1, $2, 'Altro', 'Autore', 'tecnico')`, [altroId, LAB_A]
        )
        void rif
        const e = await attesoRifiuto(client, 'cambio di comunicato_da su riga chiusa', () =>
          client.query(
            `UPDATE public.avvisi_dentista SET comunicato_da = $2 WHERE id = $1`,
            [avviso.id, altroId]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('③ la RETRODATAZIONE di comunicato_at è respinta', async () => {
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const e = await attesoRifiuto(client, 'retrodatazione della comunicazione', () =>
          client.query(
            `UPDATE public.avvisi_dentista SET comunicato_at = comunicato_at - interval '30 days'
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('④ la RISCRITTURA del testo già mandato è respinta', async () => {
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoDallApp(client)
        const e = await attesoRifiuto(client, 'riscrittura di testo_inviato', () =>
          client.query(
            `UPDATE public.avvisi_dentista SET testo_inviato = 'un testo mai mandato'
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('⑤ lo SCAMBIO fra i due stati chiusi è respinto', async () => {
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const e = await attesoRifiuto(client, 'comunicato_a_voce → comunicato_dall_app', () =>
          client.query(
            `UPDATE public.avvisi_dentista
                SET stato='comunicato_dall_app', testo_inviato='fabbricato dopo'
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('⑥ e vale anche per service_role, il ruolo VERO delle rotte: il GRANT resta, il trigger morde', async () => {
      // È la minaccia della riga 58 così com'è scritta: «riscrivibile dai ruoli
      // col GRANT delle quattro colonne». Il GRANT c'è ancora (serve alla
      // chiusura legittima): a fermare la riscrittura ora è il trigger.
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        await client.query('SET LOCAL ROLE service_role')
        const { rows: [chi] } = await client.query('SELECT current_user AS u')
        expect(chi.u).toBe('service_role')
        const e = await attesoRifiuto(client, 'riapertura come service_role', () =>
          client.query(
            `UPDATE public.avvisi_dentista
                SET stato='da_comunicare', comunicato_at=NULL, comunicato_da=NULL, testo_inviato=NULL
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
        await client.query('RESET ROLE')
      })
    })
  })

  // ── le controprove: ciò che DEVE continuare a passare ─────────────────────
  describe('i flussi legittimi non sono toccati', () => {
    it('⑦ la chiusura di un avviso APERTO passa (a voce)', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const { rows: [aperto] } = await inserisci(client, rif, { stato: 'da_comunicare' })
        const { rows } = await client.query(
          `UPDATE public.avvisi_dentista
              SET stato='comunicato_a_voce', comunicato_at=now(), comunicato_da=$2
            WHERE id = $1 RETURNING stato`, [aperto.id, rif.utente_id]
        )
        expect(rows[0].stato).toBe('comunicato_a_voce')
      })
    })

    it('⑧ la chiusura di un avviso APERTO passa (dall\'app, col testo)', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const { rows: [aperto] } = await inserisci(client, rif, { stato: 'da_comunicare' })
        const { rows } = await client.query(
          `UPDATE public.avvisi_dentista
              SET stato='comunicato_dall_app', comunicato_at=now(), comunicato_da=$2,
                  testo_inviato='Il documento del lavoro e stato rifatto.'
            WHERE id = $1 RETURNING stato, testo_inviato`, [aperto.id, rif.utente_id]
        )
        expect(rows[0].stato).toBe('comunicato_dall_app')
        expect(rows[0].testo_inviato).not.toBeNull()
      })
    })

    it('⑨ la ricevuta di lettura passa ANCHE su una riga chiusa (avvisi_segna_visti)', async () => {
      // visto_dal_dentista_at è FUORI dalle quattro colonne congelate, di
      // proposito: il dentista legge QUANDO legge, anche dopo la chiusura.
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const { rows: [ris] } = await client.query(
          `SELECT public.avvisi_segna_visti(ARRAY[$1]::uuid[], $2) AS r`,
          [avviso.id, LAB_A]
        )
        expect(ris.r.aggiornati).toBe(1)
        const { rows: [dopo] } = await client.query(
          `SELECT visto_dal_dentista_at FROM public.avvisi_dentista WHERE id = $1`,
          [avviso.id]
        )
        expect(dopo.visto_dal_dentista_at).not.toBeNull()
      })
    })

    it('⑩ campi_corretti resta correggibile anche dopo la chiusura (20260809133546:60-67 lo anticipa)', async () => {
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const { rows } = await client.query(
          `UPDATE public.avvisi_dentista SET campi_corretti = ARRAY['paziente_nome']
            WHERE id = $1 RETURNING campi_corretti`, [avviso.id]
        )
        expect(rows[0].campi_corretti).toEqual(['paziente_nome'])
      })
    })
  })

  // ── il catalogo: il trigger esiste ed è BEFORE UPDATE per riga ────────────
  it('⑪ il trigger è nel catalogo: BEFORE UPDATE, FOR EACH ROW, con la sua WHEN', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_triggerdef(oid) AS def FROM pg_trigger
          WHERE tgrelid = 'public.avvisi_dentista'::regclass AND NOT tgisinternal
            AND tgname = 'trg_avviso_chiusura_one_way'`
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].def).toMatch(/BEFORE UPDATE/)
      expect(rows[0].def).toMatch(/FOR EACH ROW/)
      expect(rows[0].def).toMatch(/WHEN \(\(old\.stato <> 'da_comunicare'::text\)\)/)
      expect(rows[0].def).toMatch(/EXECUTE FUNCTION avviso_chiusura_one_way\(\)/)
    })
  })
})
```

⚠️ Nota su ⑨: il valore di ritorno di `avvisi_segna_visti` — la chiave `aggiornati` — va verificato
sul corpo vivo PRIMA di fidarsi dell'asserzione: `node scripts/psql.mjs -c "SELECT prosrc FROM pg_proc WHERE proname='avvisi_segna_visti'"`.
Se la chiave è diversa (es. `json_build_object` con altro nome), l'asserzione si adegua al corpo vero.

- [ ] **Step 3: RED — esegui e CONTA (R-P4)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-chiusura-one-way.rpc.test.ts
```
Atteso: **6 rossi su 11** — ①-⑥ falliscono con `ATTESO RIFIUTO, INVECE ACCETTATO` (il banco accetta
ancora tutto) e ⑪ fallisce con `expected [] to have length 1` (il trigger non esiste); ⚠️ sono 7 rossi
contando ⑪. **Conteggio da scrivere nel report: `7 su 11`** (6 di comportamento + 1 di catalogo);
⑦-⑩ verdi da subito (controprove: passano anche senza trigger).
Le forme d'input enumerate: riapertura · riattribuzione · retrodatazione · riscrittura testo · scambio
chiusa→chiusa · ruolo service_role · chiusura legittima ×2 · ricevuta su chiusa · campi_corretti su chiusa.
Non coperta, e perché: l'UPDATE no-op su riga chiusa (`SET stato=stato`) — `IS DISTINCT FROM` lo lascia
passare per costruzione e nessun flusso lo esegue.

- [ ] **Step 4: scrivi la migration** — `non eseguito` · verifica: passi 5-6

Crea `supabase/migrations/<TS1>_avvisi_chiusura_one_way.sql`:

```sql
-- ═══ PERCHÉ QUESTA MIGRATION ═════════════════════════════════════════════════
-- Riga 58 della coda (revisione finale di ramo, 11/08/2026, area banca dati):
-- un avviso GIÀ COMUNICATO restava riscrivibile — e perfino riapribile — da
-- chiunque avesse il GRANT delle quattro colonne (20260809124517): il ritorno
-- a 'da_comunicare' coi tre NULL soddisfa avviso_comunicato_ha_autore_e_data
-- e avviso_testo_solo_se_dall_app, e nessun trigger esisteva (pg_trigger: 0).
-- `provato:` 11/08/2026, transazione annullata sul banco vero — riapertura coi
-- tre NULL: RIUSCITA; riattribuzione della firma a un altro utente: RIUSCITA.
-- COMMENT ON TABLE dichiara questa tabella «la prova che è avvenuta» (GDPR
-- Art. 5(2)): una prova riscrivibile a piacere non è una prova.
--
-- ═══ IL RIMEDIO: TRIGGER DI TRANSIZIONE ONE-WAY ══════════════════════════════
-- Una riga con stato ≠ 'da_comunicare' non cambia MAI più le quattro colonne
-- della chiusura: stato, comunicato_at, comunicato_da, testo_inviato. Le altre
-- colonne restano libere DI PROPOSITO: visto_dal_dentista_at è la ricevuta di
-- lettura (avvisi_segna_visti scrive DOPO la chiusura, è il suo mestiere) e
-- campi_corretti ha già una nota che ne anticipa gli update su avvisi vecchi
-- (20260809133546:60-67).
--
-- PERCHÉ IL TRIGGER E NON IL MODELLO REVOKE+RPC (valutazione_supera,
-- 20260806142910): là l'UPDATE era revocabile PER INTERO perché nessuna rotta
-- lo usava; qui la chiusura legittima È un UPDATE di rotta
-- (src/app/api/lavori/[id]/avviso/route.ts:414-420, ridisegnato da D354 e
-- collaudato sul banco vero il 10/08). Revocare e spostare in RPC
-- riscriverebbe una rotta appena approvata; il trigger chiude il buco per
-- OGNI attore (service_role col suo BYPASSRLS compreso) senza toccare una
-- riga di server. Il GRANT per colonna resta: serve alle righe APERTE.
--
-- I flussi vivi NON incontrano il trigger, misurato prima di scriverlo:
-- · la rotta di chiusura filtra .in('stato', STATI_APERTI) — mai una riga chiusa;
-- · correggi_e_riemetti_atomica fa un INSERT, mai update (20260809133546:488);
-- · avvisi_segna_visti tocca solo visto_dal_dentista_at (20260810072748:41-45).

CREATE FUNCTION public.avviso_chiusura_one_way()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stato         IS DISTINCT FROM OLD.stato
  OR NEW.comunicato_at IS DISTINCT FROM OLD.comunicato_at
  OR NEW.comunicato_da IS DISTINCT FROM OLD.comunicato_da
  OR NEW.testo_inviato IS DISTINCT FROM OLD.testo_inviato
  THEN
    RAISE EXCEPTION
      'trg_avviso_chiusura_one_way: l''avviso % è già comunicato (stato %): stato, autore, data e testo non si riscrivono — la riga è la prova (GDPR Art. 5(2))',
      OLD.id, OLD.stato;
  END IF;
  RETURN NEW;
END;
$$;

-- Una funzione RETURNS trigger non è chiamabile direttamente («trigger
-- functions can only be called as triggers»), ma l'idioma di casa REVOca
-- comunque: dopo un CREATE, Postgres concede EXECUTE a PUBLIC.
REVOKE ALL ON FUNCTION public.avviso_chiusura_one_way() FROM PUBLIC, anon, authenticated;

-- La WHEN tiene il trigger FUORI dal percorso caldo: sulle righe aperte
-- (la chiusura legittima, l'unico UPDATE che l'app esegue) non scatta affatto.
CREATE TRIGGER trg_avviso_chiusura_one_way
  BEFORE UPDATE ON public.avvisi_dentista
  FOR EACH ROW
  WHEN (OLD.stato <> 'da_comunicare')
  EXECUTE FUNCTION public.avviso_chiusura_one_way();

COMMENT ON FUNCTION public.avviso_chiusura_one_way() IS
  'Riga 58: dopo la chiusura, stato/comunicato_at/comunicato_da/testo_inviato '
  'sono congelati per OGNI attore (service_role compreso). visto_dal_dentista_at '
  'e campi_corretti restano liberi di proposito. La riga è la prova ex Art. 5(2) '
  'GDPR: one-way, senza strada di ritorno.';
```

- [ ] **Step 5: applica (D284)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```
Atteso: applica `<TS1>_avvisi_chiusura_one_way.sql` senza errori.

- [ ] **Step 6: GREEN — riesegui e verifica sul catalogo**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-chiusura-one-way.rpc.test.ts
```
Atteso: **11 passed** (nessuno saltato: controlla il conteggio).
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && node scripts/psql.mjs -c "SELECT tgname FROM pg_trigger WHERE tgrelid='public.avvisi_dentista'::regclass AND NOT tgisinternal"
```
Atteso: `trg_avviso_chiusura_one_way` — il file non è la prova, il catalogo sì.

- [ ] **Step 7: FASE 6b + suite avvisi esistente**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit
```
Atteso: tsc pulito; `git diff --stat src/types/database.types.ts` → **nessun diff** (un trigger non
appare nei types). Se un diff c'è, si legge e si capisce PRIMA di proseguire.
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-dentista-schema.rpc.test.ts tests/integration/avvisi-segna-visti.rpc.test.ts
```
Atteso: tutti passed — il trigger non rompe le prove esistenti (in particolare (p8) e la famiglia D274).

- [ ] **Step 8: commit (D318)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && git status --short
git add supabase/migrations/<TS1>_avvisi_chiusura_one_way.sql tests/integration/avvisi-chiusura-one-way.rpc.test.ts
git commit -F <file-messaggio>
```
Messaggio: `feat(db): trigger one-way sulla chiusura degli avvisi — la prova non si riscrive (riga 58)`
più due righe sul perché (trigger e non RPC; le due colonne lasciate libere).

---

### Task 2: La firma non può puntare a un altro laboratorio (riga 59)

**Files:**
- Create: `tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts`
- Modify: `tests/integration/avvisi-dentista-schema.rpc.test.ts:349` (asserzione sul nome della FK)
- Create: `supabase/migrations/<TS2>_avvisi_firma_stesso_laboratorio.sql` (TS2 dal passo 1, > TS1)

**Interfaces:**
- Consumes: niente dal Task 1 (indipendente).
- Produces: `utenti_id_lab_uk` UNIQUE (id, laboratorio_id) su `utenti` — disponibile come bersaglio per
  OGNI futura FK composita verso utenti (le altre 22 restano semplici, fuori mandato) — e
  `avvisi_dentista_comunicato_da_fk` composita al posto della `_fkey` semplice.

- [ ] **Step 1: timestamp (D311)**

```bash
date -u "+%Y%m%d%H%M%S"
```
Output = `<TS2>`. Deve superare `<TS1>` (lo supera: l'orologio UTC cresce sempre — è il punto di D311).

- [ ] **Step 2: scrivi il test che DEVE fallire** — `non eseguito` · verifica: passo 4

Crea `tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts` (stessi helper locali del file del
Task 1 — `riferimentiVeri`, `attesoRifiuto`, `inserisci`, ricopiati identici; qui si mostrano solo le
prove):

```typescript
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Riga 59 della coda (revisione finale di ramo, 11/08/2026): comunicato_da era
// una FK SEMPLICE verso utenti(id) — la chiusura poteva essere attribuita a un
// utente di UN ALTRO laboratorio (`provato:` P6b, 11/08: la firma si spostava
// perfino su un utente con laboratorio_id NULL). Il rimedio è il modello già
// applicato tre volte da 20260806142910: UNIQUE (id, laboratorio_id) sul padre
// e FK composita (comunicato_da, laboratorio_id) sul figlio.
// [helper locali identici a avvisi-chiusura-one-way.rpc.test.ts — v. quel file]

const LAB_A = '00000000-0000-0000-0000-000000000001'

// … riferimentiVeri, attesoRifiuto, inserisci: COPIARE dal file del Task 1 …

/** Un utente vero usa-e-getta, nel laboratorio scelto (ricetta avvisi-dentista-schema:335). */
async function utenteUsaEGetta(
  client: Parameters<Parameters<typeof withRollback>[0]>[0],
  laboratorioId: string | null,
  ruolo = 'tecnico'
) {
  const id = randomUUID()
  await client.query(`INSERT INTO auth.users (id) VALUES ($1)`, [id])
  await client.query(
    `INSERT INTO public.utenti (id, laboratorio_id, nome, cognome, ruolo)
     VALUES ($1, $2, 'Usa', 'E getta', $3)`, [id, laboratorioId, ruolo]
  )
  return id
}

describe.skipIf(skipIntegrationTests)('avvisi_dentista — la firma è dello stesso laboratorio (riga 59)', () => {
  // ── il catalogo: i due vincoli nuovi esistono, il vecchio non c'è più ─────
  it('① utenti ha il vincolo UNIQUE (id, laboratorio_id) — il bersaglio delle composite', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid='public.utenti'::regclass AND conname='utenti_id_lab_uk'`)
      expect(rows).toHaveLength(1)
      expect(rows[0].def).toBe('UNIQUE (id, laboratorio_id)')
    })
  })

  it('② la FK di comunicato_da è COMPOSITA e punta a utenti (id, laboratorio_id)', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid='public.avvisi_dentista'::regclass
            AND conname='avvisi_dentista_comunicato_da_fk'`)
      expect(rows).toHaveLength(1)
      expect(rows[0].def).toBe(
        'FOREIGN KEY (comunicato_da, laboratorio_id) REFERENCES utenti(id, laboratorio_id)')
    })
  })

  it('③ la vecchia FK semplice non esiste più', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM pg_constraint
          WHERE conrelid='public.avvisi_dentista'::regclass
            AND conname='avvisi_dentista_comunicato_da_fkey'`)
      expect(rows).toHaveLength(0)
    })
  })

  // ── il comportamento: la coppia deve esistere in utenti ───────────────────
  it('④ la firma di un utente di UN ALTRO laboratorio è respinta con 23503', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const labB = randomUUID()
      await client.query(`INSERT INTO laboratori (id, nome) VALUES ($1, $2)`, [
        labB, 'Lab B — prova firma cross-tenant',
      ])
      const utenteB = await utenteUsaEGetta(client, labB)
      const e = await attesoRifiuto(client, 'avviso del lab A firmato dal lab B', () =>
        inserisci(client, rif, {
          stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: utenteB,
        })
      )
      expect(e.code).toBe('23503')
      expect(e.message).toMatch(/"avvisi_dentista_comunicato_da_fk"/)
    })
  })

  it('⑤ la firma di un admin_sistema senza laboratorio è respinta con 23503', async () => {
    // laboratorio_id NULL è legale per admin_sistema (CHECK
    // utenti_lab_required_for_non_admin) — ma la coppia (id, NULL) non esiste
    // per la FK. Coerente con D342: admin_rete e admin_sistema sono già
    // esclusi PER NOME dalla chiusura (RUOLI_CHIUSURA_AVVISO, ruoli.ts:72).
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const admin = await utenteUsaEGetta(client, null, 'admin_sistema')
      const e = await attesoRifiuto(client, 'avviso firmato da un admin senza lab', () =>
        inserisci(client, rif, {
          stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: admin,
        })
      )
      expect(e.code).toBe('23503')
      expect(e.message).toMatch(/"avvisi_dentista_comunicato_da_fk"/)
    })
  })

  // ── le controprove ────────────────────────────────────────────────────────
  it('⑥ la firma di un utente DELLO STESSO laboratorio passa', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const utenteA = await utenteUsaEGetta(client, LAB_A)
      const { rows } = await inserisci(client, rif, {
        stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: utenteA,
      })
      expect(rows[0].comunicato_da).toBe(utenteA)
    })
  })

  it('⑦ un avviso APERTO (comunicato_da NULL) nasce ancora: MATCH SIMPLE non morde sui NULL', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const { rows } = await inserisci(client, rif, { stato: 'da_comunicare' })
      expect(rows[0].stato).toBe('da_comunicare')
      expect(rows[0].comunicato_da).toBeNull()
    })
  })
})
```

- [ ] **Step 3: aggiorna l'asserzione sul nome della FK nel test esistente** — `non eseguito` · verifica: passo 4 (rosso) e 6 (verde)

In `tests/integration/avvisi-dentista-schema.rpc.test.ts`, riga 349:

```typescript
// PRIMA:
        expect(e.message).toMatch(/avvisi_dentista_comunicato_da_fkey/)
// DOPO (il nome nuovo; le virgolette ancorano il nome ESATTO nel messaggio Postgres):
        expect(e.message).toMatch(/"avvisi_dentista_comunicato_da_fk"/)
```
⚠️ SOLO questa riga: il resto del file non si tocca (il test a riga 306-317 asserisce `/comunicato_da/`,
che il nome nuovo soddisfa; il test-catalogo a riga 285-304 cerca per COLONNA, non per nome).

- [ ] **Step 4: RED — esegui e CONTA (R-P4)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts tests/integration/avvisi-dentista-schema.rpc.test.ts
```
Atteso: **6 rossi** nel file nuovo — ①②③ (catalogo: i vincoli non esistono ancora) e ④⑤ (`ATTESO
RIFIUTO, INVECE ACCETTATO`: il banco accetta ancora le firme altrui) più la riga 349 aggiornata (nel
messaggio c'è ancora `_fkey`) — **conteggio da scrivere: `5 su 7` nel file nuovo + `1` nell'esistente**;
⑥⑦ verdi da subito. Forme d'input: cross-tenant · lab NULL · stesso lab · NULL (riga aperta) ·
uuid inesistente (già coperto dall'esistente:306) · DELETE dell'autore (già coperto dall'esistente:319).

- [ ] **Step 5: scrivi la migration** — `non eseguito` · verifica: passi 6-7

Crea `supabase/migrations/<TS2>_avvisi_firma_stesso_laboratorio.sql`:

```sql
-- ═══ PERCHÉ QUESTA MIGRATION ═════════════════════════════════════════════════
-- Riga 59 della coda (revisione finale di ramo, 11/08/2026): comunicato_da era
-- una FK SEMPLICE verso utenti(id) — la RLS vincola solo laboratorio_id, quindi
-- la chiusura poteva essere attribuita a un utente di UN ALTRO laboratorio.
-- `provato:` 11/08, transazione annullata: la firma di un avviso chiuso si
-- spostava su un utente con laboratorio_id NULL, senza errori.
-- È la stessa classe che il ramo ha bollato CRITICA e chiuso con la FK
-- COMPOSITA in 20260806142910 (tre volte: eventi_qualita→lavori,
-- valutazioni_evento→eventi_qualita, lavori_rifacimenti→eventi_qualita) —
-- qui non applicata perché a utenti mancava il bersaglio UNIQUE.
--
-- ═══ I DUE ATTI ══════════════════════════════════════════════════════════════
-- ① Il bersaglio: UNIQUE (id, laboratorio_id) su utenti. id è già PK, quindi
--    la coppia è unica per costruzione: il vincolo non può fallire sui dati
--    esistenti e costa un indice. Modello di nome: lavori_id_lab_uk
--    (20260727120000), eventi_qualita_id_lab_uk (20260806142910).
-- ② La sostituzione: via la _fkey semplice, dentro la composita. MATCH SIMPLE
--    (default): sulle righe APERTE comunicato_da è NULL e la FK non morde;
--    sulle righe CHIUSE la coppia (autore, laboratorio dell'avviso) DEVE
--    esistere in utenti — cioè l'autore è del laboratorio dell'avviso.
--    NO ACTION (default), come il modello e come la _fkey che sostituisce.
--
-- `provato:` prima di scrivere: 0 firme cross-tenant nei dati vivi (la ADD
-- CONSTRAINT valida le righe esistenti senza pulizia) · admin_delete_laboratorio
-- porta via gli avvisi IN CASCATA (dichiarazioni_conformita e lavori) PRIMA di
-- toccare utenti, quindi la composita non cambia la cancellazione di un lab ·
-- l'unico admin_sistema (lab NULL) non è mai una firma legittima: D342 esclude
-- admin_rete e admin_sistema PER NOME dalla chiusura (RUOLI_CHIUSURA_AVVISO).
--
-- ⚠️ Il nome cambia (…_fkey → …_fk, convenzione delle composite): i tre punti
-- che lo nominavano sono censiti nel piano — database.types.ts (rigenerato),
-- avvisi-dentista-schema.rpc.test.ts:349 (aggiornato nello stesso task),
-- ROADMAP riga 43 (citazione storica, resta).

ALTER TABLE public.utenti
  ADD CONSTRAINT utenti_id_lab_uk UNIQUE (id, laboratorio_id);

ALTER TABLE public.avvisi_dentista
  DROP CONSTRAINT avvisi_dentista_comunicato_da_fkey,
  ADD CONSTRAINT avvisi_dentista_comunicato_da_fk
    FOREIGN KEY (comunicato_da, laboratorio_id)
    REFERENCES public.utenti (id, laboratorio_id);

COMMENT ON CONSTRAINT avvisi_dentista_comunicato_da_fk ON public.avvisi_dentista IS
  'Riga 59: la firma della chiusura è un utente DELLO STESSO laboratorio. '
  'Composita anti cross-tenant, modello 20260806142910. MATCH SIMPLE: le righe '
  'aperte (comunicato_da NULL) non sono vincolate.';
```

- [ ] **Step 6: applica (D284) e GREEN**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts tests/integration/avvisi-dentista-schema.rpc.test.ts
```
Atteso: **tutti passed** (7 nuovi + l'intero file esistente, riga 349 compresa).

- [ ] **Step 7: FASE 6b — i types CAMBIANO qui**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit
```
Atteso: `git diff src/types/database.types.ts` mostra SOLO la Relationship di `comunicato_da`:
`foreignKeyName: "avvisi_dentista_comunicato_da_fk"` e `columns: ["comunicato_da", "laboratorio_id"]`
(o forma equivalente del generatore). tsc pulito. Un diff più ampio si legge e si capisce PRIMA di
proseguire. Controllo finale del censimento:
```bash
grep -rn "comunicato_da_fkey" src tests supabase --include="*.ts" --include="*.sql"
```
Atteso: **0 hit**.

- [ ] **Step 8: commit (D318)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && git status --short
git add supabase/migrations/<TS2>_avvisi_firma_stesso_laboratorio.sql tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts tests/integration/avvisi-dentista-schema.rpc.test.ts src/types/database.types.ts
git commit -F <file-messaggio>
```
Messaggio: `feat(db): la firma dell'avviso è dello stesso laboratorio — FK composita (riga 59)`
più il censimento del nome in due righe.

---

### Task 3: Verifica piena, chiusura delle righe 58-59, pubblicazione

**Files:**
- Modify: `docs/roadmap/ROADMAP-UFFICIALE.md` (righe 58 e 59 → CHIUSE, con le prove; testa aggiornata)
- Modify: `memory/MEMORY.md` (testa: code 58-59 chiuse)

**Interfaces:** consuma i due task; nessun produce.

- [ ] **Step 1: FASE 7 piena, output reale**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit && echo TSC_OK
```
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npm run verify:full; VERIFY_EXIT=$?; echo "VERIFY_EXIT=$VERIFY_EXIT"
```
(⚠️ uscita da variabile, SENZA pipe, timeout 600000 — le ~137 saltate d'integrazione in locale sono
attese; le nostre nuove prove girano col comando sotto.)
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/
```
Atteso: l'intero progetto integration verde (nessun file saltato).
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx next build
```
Atteso: build pulita (nessun handler toccato, ma i tre comandi sono tre — FASE 7).

- [ ] **Step 2: chiudi le righe 58 e 59 nella roadmap**

In `docs/roadmap/ROADMAP-UFFICIALE.md`: le righe **58** e **59** si riscrivono CHIUSE — ✅, la data, il
rimedio vero (trigger `trg_avviso_chiusura_one_way` · `utenti_id_lab_uk` + `avvisi_dentista_comunicato_da_fk`),
le migration `<TS1>`/`<TS2>`, i due file di prova, e il nome nuovo della FK dichiarato dove la riga 59
citava il vecchio. Testa del documento aggiornata (code 58-59 chiuse). In `memory/MEMORY.md`: testa
aggiornata allo stesso modo. La guardia di coerenza (`node scripts/guardia-coerenza-documenti.mjs`)
DEVE restare verde.

- [ ] **Step 3: commit docs + push del ramo**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && git status --short
git add docs/roadmap/ROADMAP-UFFICIALE.md memory/MEMORY.md
git commit -F <file-messaggio>   # docs(roadmap): righe 58-59 chiuse — prova inalterabile e firma same-lab
git push -u origin code-58-59-prova-inalterabile
```

- [ ] **Step 4: review di ramo (FASE 8) e merge (FASE 10 — giudizio D296)**

Review con `/code-review` + `superpowers:requesting-code-review` sul diff del ramo. Poi il giudizio
D296, motivato: ondata COMPLETA (nessun difetto dichiarato), CI verde sul ramo, migrations già vive sul
banco di prova, zero superfici toccate → merge su `main`, push, CI, verifica deploy. Se un Critical o un
Important emergono dalla review, si chiudono PRIMA del merge.

---

## Self-Review (fatta il 11/08/2026 prima di consegnare il piano)

1. **Copertura del mandato:** riga 58 → Task 1 (trigger + 11 prove); riga 59 → Task 2 (UNIQUE + FK + 7
   prove + 1 asserzione esistente aggiornata); «prima dell'onboarding reale» → Task 3 chiude le righe e
   pubblica. ✔
2. **Segnaposto:** nessun TBD/TODO; l'unico blocco «da copiare» (helper del Task 2) rimanda a codice
   COMPLETO nel Task 1 dello stesso documento, con la ragione (convenzione file-locali). L'asserzione ⑨
   (`ris.r.aggiornati`) porta il comando per verificarla sul corpo vivo prima di fidarsene. ✔
3. **Coerenza dei nomi fra i task:** `trg_avviso_chiusura_one_way` (Task 1, prova ⑪ e messaggio RAISE) ·
   `utenti_id_lab_uk` e `avvisi_dentista_comunicato_da_fk` (Task 2, prove ①②③④⑤ e migration) — identici
   ovunque, verificati rileggendo. ✔
4. **Rischio dichiarato:** la forma esatta del diff dei types al Task 2/7 dipende dal generatore
   Supabase — per questo il passo prescrive di LEGGERE il diff, non di assumerlo. Il valore di ritorno
   di `avvisi_segna_visti` (⑨) va verificato sul corpo vivo. Sono i due soli punti in cui il piano
   prevede una lettura invece di un'asserzione cieca.
