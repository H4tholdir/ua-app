# Handoff — Riconciliazione ledger migration + decisione draft NYE, poi Bundle E
**Data:** 20 luglio 2026 (sera) · **Da eseguire in sessione NUOVA a contesto pulito** (decisione Francesco)

## Contesto (30 secondi)

Oggi deployati in prod (CI+CD verdi, smoke OK): **Bundle T** (`bacfde9` — O1b helper Europe/Rome, O1a test pile, O4a combobox via API, A18 hash firma DdC con cut-off, anti-SSRF URL storage), **fix test anti-flake** (`9350969`), **date fiscali Europe/Rome** (`3d5fd31` — percorso Grande FatturaPA, panel 3×, review Yes; migration `20260720150000` applicata al DB live e registrata). BP-1 completo fino a MEMORY voce (13). Restano DUE punti segnalati da chiudere, poi si riprende la roadmap ratificata.

---

## Punto 1 — Riconciliazione ledger migration (⚠ PRIORITÀ: sblocca `db push`)

**Problema:** 7 migration locali risultano NON registrate in `supabase_migrations.schema_migrations` sul remoto (`npx supabase migration list` le mostra con colonna remote vuota). Finché non riconciliate, **MAI eseguire `supabase db push`**: rieseguirebbe tutte le pending alla cieca.

**Verifica GIÀ FATTA in questa sessione (20/07, read-only sul DB live): tutte e 7 risultano DI FATTO APPLICATE** — riconciliazione a rischio zero, è pura contabilità del ledger. Oggetti verificati esistenti:

| Migration | Oggetto verificato nel DB |
|---|---|
| `20260716090000_fatture_sdi_eventi` | tabella `fatture_sdi_eventi` ✓ + fn `sdi_eventi_guard` ✓ |
| `20260716091000_annullo_storno_trigger_delta` | fn `annulla_effetti_storno_td04` ✓ |
| `20260716100000_ricevute_sdi_rpc` | fn `applica_ricevuta_sdi` ✓ + `rank_stato_sdi` ✓ |
| `20260716110000_override_sblocco_rpc` | fn `override_stato_sdi` ✓ + `sblocca_claim_fattura` ✓ |
| `20260716120000_storage_ricevute_sdi_no_client` | (bucket policy — unico NON verificato puntualmente: controllare `pg_policies`/`storage.objects` in sessione) |
| `20260716130000_override_guardia_sorgente` | `override_stato_sdi` con guardia «sorgente» nel body ✓ |
| `20260717120000_n12_prove_atomiche` | fn `manda_in_prova_atomico` ✓ + `registra_rientro_atomico` ✓ |

**Procedura:**
1. (Solo per la `…120000_storage`) verificare la policy storage nel DB; se assente, applicarla a mano (è idempotente) prima del repair.
2. `npx supabase migration repair --status applied 20260716090000 20260716091000 20260716100000 20260716110000 20260716120000 20260716130000 20260717120000` (dal repo principale, che è linkato; in alternativa INSERT diretti in `supabase_migrations.schema_migrations` — pattern usato il 20/07 per la `20260720150000`, script `apply-migration.mjs` come riferimento: legge `SUPABASE_DB_URL` da `.env.local`).
3. `npx supabase migration list` → nessuna riga con remote vuoto.
4. Annotare in MEMORY: `db push` di nuovo utilizzabile; la CAUSA (migration applicate a mano via SQL editor il 16-17/07 senza registrazione) va evitata: d'ora in poi o `db push` o registrazione contestuale.

## Punto 2 — Decisione Francesco: draft fattura di dicembre emesso a gennaio

**Stato attuale (deliberato, pre-esistente, documentato nel fix date fiscali):** un draft creato a dicembre (numero `2026-NNNN`, serie 2026) emesso via XML a gennaio mantiene numero/serie/data del draft congelati. Effetto: fattura con numero 2026-… e `<Data>` del draft (dicembre) anche se l'invio SDI parte a gennaio.

**Opzioni da presentare a Francesco (decisione fiscale → micro-panel advisor prima di implementare, Regola Advisor):**
- **(a) Status quo documentato** — il draft congela tutto; chi vuole la data di gennaio elimina il draft e riemette. Zero codice.
- **(b) Rigenera a cavallo d'anno** — all'emissione, se `draft.anno !== annoRoma()`: nuovo progressivo nella serie nuova + data odierna (il vecchio numero resta bruciato nella serie vecchia — buco di numerazione da motivare in nota fiscale).
- **(c) Blocco esplicito** — all'emissione, se `draft.anno !== annoRoma()`: 422 con messaggio «draft di un anno precedente: eliminalo e riemetti» (nessun buco, scelta all'utente).

Nessuna urgenza pratica fino a dicembre; la finestra reale del problema è l'ultima settimana dell'anno.

## Poi: ripresa della roadmap ratificata (sequenza (1), ordine certificato 20/07)

1. **Bundle E — A16** (worktree, TDD, FASE 7, review, deploy): `GET /api/lavori/export` + `GET /api/tecnici/cedolini-batch` sul pattern di `fatture/export/route.ts`. **Riserve advisor già raccolte:** escaping anti CSV-injection (`=`, `+`, `-`, `@` a inizio cella) + test di scoping tenant. NB dal fix di oggi: `fatture/export` usa già `annoRoma()` come default year — replicare.
2. **Mini-triage design** (regola 0B: mockup in `docs/design/mockups/`, PIÙ VARIANTI light+dark, approvazione PRIMA del React): A13 ponte minimo odontogramma · A14 cassetta in card (conflitto DS v3 §5.8 «4 righe» — decisione di sistema) · O1h back PilaAperta · O1i (voce «Esci» §7.16, riga identità footer NavDesk, segnale trial StrisciaStato). Presentare in UN unico giro + far confermare i deferral A10/A11.
3. **Calendarizzati:** ricalibrazione perf-budget (~27/07-03/08: soglia login = mediana multi-run +15-20%, poi togliere `PERF_BUDGET_LOGIN_MODE=warn`) · sessione DB dedicata **A20+O4b** (created_by/updated_by ratificato + migration CHECK tipi-lavoro — sbloccata dal Punto 1) · **A8 email Resend** (ratificata 20/07, post-Bundle E, riga in ROADMAP tabella V1.9).

## Backlog minore tracciato oggi (non forzare, solo non perdere)

- Serie `lavoro`/`ordine` con anno UTC (lavori/route:154, portale/richiedi:114, ordini/route:93) — internamente coerenti, non fiscali; fix 2 righe con `annoRoma()` quando capita.
- Guard 422 data fattura: accetta formati malformati stesso-anno (aggiungere regex `^\d{4}-\d{2}-\d{2}$` — opzionale).
- TOCTOU hash/PDF firma DdC (fetch unico → buffer sia a hash sia a `<Image>` react-pdf).
- Param `limit` su `GET /api/clienti` (oggi fino a 500 righe complete per keystroke del combobox).
- Residui UTC non fiscali: striscia `oggiMezzanotte` (ddcOggi), sheet client (NuovoOrdine/RegistraPagamento/RichiestaClientForm), range produttività/cedolino, clienti/[id] cutoff.
- A6-bis: regex check-ds (`color:.*var(--c-amber\b` escludendo `-ink`) + sweep ~25 file.
- Hydration mismatch layout portale (pre-esistente) · N1/N2/N3 · A15/O2/A19/O4c/O3 = deferral calendarizzati (invariati).

## Pulizia ambiente

Worktree `bundle-q` + branch ancora presenti (dentro `.superpowers/sdd/` report gitignored — **chiedere a Francesco** se conservarli prima di rimuovere). `scripts/tmp/` contiene gli script QA di oggi (`qa-bundle-t*.ts`) — residui innocui.

## Regole di ingaggio (invariate)

CLAUDE.md §0C (12 fasi + Regola Advisor) · guard N13 su ogni nuova route + mock context con `lab` · UI: mockup + varianti + approvazione PRIMA del React (0B) · lab E2E `00000000-…-0001` per QA, MAI lab Filippo · MAI committare/pushare senza richiesta esplicita (la ratifica del 20/07 copriva T/E: per il Bundle E il deploy è già coperto; per Punto 1 e 2 chiedere conferma esplicita a fine lavoro) · BP-0/BP-1 obbligatori · 3 viewport + light/dark per ogni UI.
