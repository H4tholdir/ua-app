# Task 3 — Il vocabolario del rifacimento e l'idempotenza — REPORT

**Ramo:** `intervento-post-consegna` · **Commit:** `22650db150a8c367be6cdb167d525a831f19701f`
**Migration:** `supabase/migrations/20260807180314_rifacimento_motivi_e_idempotenza.sql`
**Timestamp usato:** `20260807180314` (letto da `date -u "+%Y%m%d%H%M%S"` in comando separato, output incollato sotto — successivo a `20260807174850` del Task 2, come richiesto)

---

## Passo 0 — timestamp

```
$ date -u "+%Y%m%d%H%M%S"
20260807180314
```

## Ricognizione preliminare (censimento, prima di scrivere la migration)

**Il vincolo storico è davvero `lavori_rifacimenti_motivo_check`?** Cercato nei file di migration
(`grep -rn "lavori_rifacimenti_motivo_check" supabase/migrations/`): **zero hit letterali** — il
vincolo non è mai stato nominato esplicitamente. Trovato invece in
`supabase/migrations/005_v1_foundation.sql:77-82`: un CHECK **inline, senza nome**, dentro la
`CREATE TABLE lavori_rifacimenti`. Postgres nomina un CHECK senza nome `<tabella>_<colonna>_check`
— cioè esattamente `lavori_rifacimenti_motivo_check`. Coerente col brief; verificato anche a
catalogo vivo dopo l'applicazione (sotto).

**L'indice `lavori_rifacimenti_evento_idx` è davvero non-unique?** Trovato in
`supabase/migrations/20260806142910_correzione_eventi_qualita_cross_tenant.sql:107-108`:
`CREATE INDEX IF NOT EXISTS lavori_rifacimenti_evento_idx ON public.lavori_rifacimenti
(evento_id);` — nessun `UNIQUE`. Confermato.

**FK di `evento_id`:** composita, `(evento_id, laboratorio_id) REFERENCES eventi_qualita(id,
laboratorio_id)` — stessa migration, righe 48-49. Il nuovo indice unico `(laboratorio_id,
evento_id)` è coerente con questa FK (stesso ordine di tenant-scoping delle altre correzioni
cross-tenant di quella migration).

## Verifica in più richiesta dal brief — censimento righe esistenti PRIMA di allargare il vincolo

```
$ node scripts/psql.mjs -c "SELECT motivo, count(*) FROM public.lavori_rifacimenti GROUP BY motivo ORDER BY count(*) DESC;"
[1] SELECT — 2 righe
┌─────────┬─────────────────────┬───────┐
│ (index) │ motivo              │ count │
├─────────┼─────────────────────┼───────┤
│ 0       │ 'fusione_difettosa' │ '1'   │
│ 1       │ 'misura_errata'     │ '1'   │
└─────────┴─────────────────────┴───────┘
```
Entrambi i valori esistenti sono già fra i sette storici → già dentro i nove nuovi. Nessuna riga
può violare il vincolo allargato: l'`ADD CONSTRAINT` non rischia di abortire.

```
$ node scripts/psql.mjs -c "SELECT laboratorio_id, evento_id, count(*) FROM public.lavori_rifacimenti WHERE evento_id IS NOT NULL GROUP BY laboratorio_id, evento_id HAVING count(*) > 1;"
[1] SELECT — 0 righe toccate
```
Nessuna coppia `(laboratorio_id, evento_id)` duplicata già in banca dati → `CREATE UNIQUE INDEX`
non rischia di fallire per righe preesistenti.

## Passo 2 — applica

```
$ npx supabase db push --linked --yes
uscita=0
Initialising login role...
Connecting to remote database...
Skipping migration MANUAL_000_auth_helpers.sql... (file name must match pattern "<timestamp>_name.sql")
Applying migration 20260807180314_rifacimento_motivi_e_idempotenza.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260807180314_rifacimento_motivi_e_idempotenza.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```
Migration applicata e registrata nel ledger (uscita 0, letta da variabile).

## Passo 3 — le tre sonde, ognuna in una invocazione separata (lezione ①), su transazione annullata

**① `motivo` fuori dai nove → atteso 23514.**
```
$ node scripts/psql.mjs /tmp/prova-t3-a.sql
uscita=1
❌ 23514 new row for relation "lavori_rifacimenti" violates check constraint "lavori_rifacimenti_motivo_check"
   dettaglio: Failing row contains (7452aa83-11ab-4c4c-b52a-16a0720da750, 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c, b829afc9-8e3e-410f-87ca-bed6ad688868, b829afc9-8e3e-410f-87ca-bed6ad688868, motivo_inesistente, null, null, null, null, 2026-08-07 18:05:19.63677+00, null).
```
**Esito: come atteso.**

**② due righe con lo stesso `(laboratorio_id, evento_id)` → atteso 23505 sulla seconda.**
Prima riscrittura del probe fallita per un motivo estraneo alla sonda: avevo messo lo stesso
`lavoro_originale_id`/`lavoro_nuovo_id` per entrambe le righe, e un vincolo preesistente
`rifacimento_no_self_ref` (`CHECK (lavoro_originale_id <> lavoro_nuovo_id)`, non nel brief, trovato
solo qui) ha bloccato la prima INSERT prima di arrivare al vincolo che volevo provare:
```
❌ 23514 new row for relation "lavori_rifacimenti" violates check constraint "rifacimento_no_self_ref"
   dettaglio: Failing row contains (5bc743d3-922a-4e31-ae61-752a3110f5d0, 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c, b829afc9-8e3e-410f-87ca-bed6ad688868, b829afc9-8e3e-410f-87ca-bed6ad688868, difetto_lavorazione, null, null, null, null, 2026-08-07 18:05:43.43783+00, 925cac83-8f4a-4806-9953-4783926019f3).
```
Corretto usando quattro `lavori.id` distinti (stesso laboratorio):
```
$ node scripts/psql.mjs /tmp/prova-t3-b.sql
uscita=1
❌ 23505 duplicate key value violates unique constraint "rifacimento_evento_unique"
   dettaglio: Key (laboratorio_id, evento_id)=(971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c, 925cac83-8f4a-4806-9953-4783926019f3) already exists.
```
**Esito: come atteso**, dopo la correzione del fixture (non un difetto della migration — vedi nota
sotto).

**③ due righe con `evento_id = NULL` → attese entrambe passare.**
```
$ node scripts/psql.mjs /tmp/prova-t3-c.sql
uscita=0
[1] BEGIN — 0 righe toccate
[2] INSERT — 1 righe toccate
[3] INSERT — 1 righe toccate
[4] SELECT — 1 righe
┌─────────┬────────────────────────────────┐
│ (index) │ righe_inserite_con_evento_null │
├─────────┼────────────────────────────────┤
│ 0       │ '3'                             │
└─────────┴────────────────────────────────┘
[5] ROLLBACK — 0 righe toccate
```
Entrambe le INSERT sono passate (nessun errore, tutte le istruzioni eseguite fino al ROLLBACK) →
③ **non è fallita**. L'indice parziale non blocca i rifacimenti manuali (`evento_id IS NULL`).

**Verifica di pulizia — nessuna riga lasciata dalle sonde:**
```
$ node scripts/psql.mjs -c "SELECT count(*) FROM public.lavori_rifacimenti;"
[1] SELECT — 1 righe
┌─────────┬───────┐
│ (index) │ count │
├─────────┼───────┤
│ 0       │ '2'   │
└─────────┴───────┘
```
Stesso conteggio di prima (2): tutte e tre le transazioni si sono annullate correttamente.

**Nota sul `3` della sonda ③ (non lasciato come "coincide, verosimilmente" — confermato riga per
riga):**
```
$ node scripts/psql.mjs -c "SELECT laboratorio_id, evento_id, motivo FROM public.lavori_rifacimenti;"
[1] SELECT — 2 righe
┌─────────┬────────────────────────────────────────┬───────────┬─────────────────────┐
│ (index) │ laboratorio_id                         │ evento_id │ motivo              │
├─────────┼────────────────────────────────────────┼───────────┼─────────────────────┤
│ 0       │ '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c' │ null      │ 'misura_errata'     │
│ 1       │ '00000000-0000-0000-0000-000000000001' │ null      │ 'fusione_difettosa' │
└─────────┴────────────────────────────────────────┴───────────┴─────────────────────┘
```
Delle due righe preesistenti, esattamente una ha `laboratorio_id = 971061a1…` (quello usato nella
sonda) **e** `evento_id NULL`; l'altra è di un laboratorio diverso. `1 preesistente + 2 inserite
dalla sonda = 3` — il conteggio torna esattamente, non per approssimazione.

## Verifica catalogo vivo (non il file di migration) — output incollato per intero

```
$ node scripts/psql.mjs /tmp/catalogo-t3.sql
[1] SELECT — 1 righe
┌─────────┬───────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ (index) │ conname                           │ definizione                                                                                         │
├─────────┼───────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 0       │ 'lavori_rifacimenti_motivo_check' │ "CHECK (((motivo)::text = ANY ((ARRAY['colore_sbagliato'::character varying,                        │
│         │                                    │  'misura_errata'::character varying, 'fusione_difettosa'::character varying,                       │
│         │                                    │  'rottura_produzione'::character varying, 'non_confortevole'::character varying,                   │
│         │                                    │  'errore_prescrizione'::character varying, 'altro'::character varying,                             │
│         │                                    │  'difetto_lavorazione'::character varying, 'difetto_materiale'::character varying])::text[])))"    │
└─────────┴───────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘
[2] SELECT — 1 righe
┌─────────┬─────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ (index) │ indexname                   │ indexdef                                                                                             │
├─────────┼─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 0       │ 'rifacimento_evento_unique' │ 'CREATE UNIQUE INDEX rifacimento_evento_unique ON public.lavori_rifacimenti USING btree             │
│         │                             │  (laboratorio_id, evento_id) WHERE (evento_id IS NOT NULL)'                                          │
└─────────┴─────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────┘
[3] SELECT — 10 righe (TUTTI i vincoli di lavori_rifacimenti, non solo i due nuovi)
 0  lavori_rifacimenti_created_by_fkey          f  FOREIGN KEY (created_by) REFERENCES utenti(id)
 1  lavori_rifacimenti_evento_fk                f  FOREIGN KEY (evento_id, laboratorio_id) REFERENCES eventi_qualita(id, laboratorio_id)
 2  lavori_rifacimenti_laboratorio_id_fkey      f  FOREIGN KEY (laboratorio_id) REFERENCES laboratori(id) ON DELETE CASCADE
 3  lavori_rifacimenti_lavoro_nuovo_id_fkey     f  FOREIGN KEY (lavoro_nuovo_id) REFERENCES lavori(id)
 4  lavori_rifacimenti_lavoro_originale_id_fkey f  FOREIGN KEY (lavoro_originale_id) REFERENCES lavori(id)
 5  lavori_rifacimenti_motivo_check             c  CHECK (9 valori, elenco sopra)
 6  lavori_rifacimenti_pkey                     p  PRIMARY KEY (id)
 7  lavori_rifacimenti_rilevato_in_check        c  CHECK (rilevato_in IN produzione/prova_1/prova_2/prova_3/post_consegna)
 8  rifacimento_no_self_ref                     c  CHECK (lavoro_originale_id <> lavoro_nuovo_id)
 9  rifacimento_nuovo_unique                    u  UNIQUE (laboratorio_id, lavoro_nuovo_id)
[4] SELECT — 6 righe (TUTTI gli indici di lavori_rifacimenti)
 0  idx_lavori_rifacimenti_nuovo      CREATE INDEX ... USING btree (lavoro_nuovo_id)
 1  idx_lavori_rifacimenti_originale  CREATE INDEX ... USING btree (lavoro_originale_id)
 2  lavori_rifacimenti_evento_idx     CREATE INDEX ... USING btree (evento_id)              -- VECCHIO, resta: non-unique, ancora utile per lookup
 3  lavori_rifacimenti_pkey           CREATE UNIQUE INDEX ... USING btree (id)
 4  rifacimento_evento_unique         CREATE UNIQUE INDEX ... USING btree (laboratorio_id, evento_id) WHERE (evento_id IS NOT NULL)  -- NUOVO
 5  rifacimento_nuovo_unique          CREATE UNIQUE INDEX ... USING btree (laboratorio_id, lavoro_nuovo_id)
```
(Tabelle 3-4 compattate per leggibilità — i valori sono letti carattere per carattere dall'output
reale sopra, nessuna cella alterata; log integrale in `/tmp/catalogo-t3.log` di questa sessione.)

Entrambi gli oggetti prodotti dal brief esistono nel catalogo esattamente come richiesto: 9 valori
nel CHECK, indice unico parziale su `(laboratorio_id, evento_id)` con `WHERE evento_id IS NOT
NULL`. Nessun vincolo/indice vecchio **duplicato**: il vecchio `lavori_rifacimenti_evento_idx`
(non-unique, su solo `evento_id`) resta, ma non è ridondante — regge i lookup «tutti i rifacimenti
di un evento», mentre il nuovo indice regge l'unicità per tenant. I due vincoli in più che non
faceva parte di questo task (`rifacimento_no_self_ref`, `rifacimento_nuovo_unique`) sono discussi
sotto in R-E2, con origine ora accertata.

## Verifica supplementare — la protezione è reale ma OGGI dormiente (nessun chiamante scrive `evento_id`)

Il commento della migration (ripreso dal brief) dice: «col vincolo, il secondo tentativo è un
23505 riconoscibile». Questa è una previsione di comportamento del sistema **una volta che
qualcosa scrive `evento_id`**, e va marcata per quello che è, non data per scontata (R-P1). Prova
che oggi nessun chiamante lo fa ancora:

```
$ node scripts/psql.mjs -c "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'crea_rifacimento_atomico';" | grep -n "evento_id"
(nessun hit — la definizione VIVA della RPC non menziona evento_id da nessuna parte)

$ grep -rn "crea_rifacimento_atomico" src/
src/types/database.types.ts:6320:      crea_rifacimento_atomico: { ... }
src/app/api/lavori/[id]/rifacimento/route.ts:181:  const { data, error } = await svc.rpc('crea_rifacimento_atomico', { ... })
```
`src/app/api/lavori/[id]/rifacimento/route.ts` è la rotta manuale a 7 motivi (righe 8-16,
`MOTIVI_VALIDI`) e non passa nessun `evento_id`. Nessun'altra rotta (cercato anche in
`src/app/api/lavori/[id]/eventi-qualita/route.ts`, che gestisce gli eventi di qualità: chiama
`riapri_lavoro_atomica` con `p_evento_id`, ma **non** chiama mai `crea_rifacimento_atomico`) crea
oggi un rifacimento automatico.

**Non è un difetto di questo task — è la sequenza prevista dal piano stesso.** Il piano
`docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md` lo dichiara nel proprio
censimento (R-P6, riga 98): `lavori_rifacimenti.evento_id | esiste, mai scritta (P2) | scritta
dalla RPC | T5` — cioè è il **Task 5** («Il rifacimento sa da quale evento nasce», righe 575-612
del piano) a estendere `crea_rifacimento_atomico` con `p_evento_id uuid DEFAULT NULL` e a far
scrivere la colonna; il **Task 7** (righe 743-890) è la rotta che intercetta il 23505. Il vincolo
costruito qui protegge quel percorso **da prima che esista** — cosa corretta, non un buco: quando
Task 5/7 atterrano, la rete di sicurezza è già in produzione invece di arrivare dopo. Lo segnalo
comunque esplicitamente, perché la frase del commento SQL, letta da sola, suona come una
descrizione del presente e non lo è ancora.

## Passo 4 — FASE 6b

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
uscita=0   (nessun messaggio CLI in fondo al file — niente da togliere)

$ npx tsc --noEmit
uscita=0   (output vuoto)
```
`git diff src/types/database.types.ts` dopo la rigenerazione: **nessuna differenza** — atteso,
perché un `CHECK` su `varchar` non genera un union type in `supabase gen types` (solo gli `ENUM`
Postgres lo farebbero); `motivo` resta tipizzato `string`.

```
$ git add -A && git commit -m "feat(rifacimento): due motivi nuovi e l'idempotenza per evento (D306 · D307)"
[intervento-post-consegna 22650db1] feat(rifacimento): due motivi nuovi e l'idempotenza per evento (D306 · D307)
 1 file changed, 48 insertions(+)
 create mode 100644 supabase/migrations/20260807180314_rifacimento_motivi_e_idempotenza.sql
```
Hook pre-commit tutti verdi (DS compliance, guardia CSRF, guardia coerenza documenti, guardia
salvataggio automatico).

---

## Difetti riferiti fuori mandato (R-E2)

Nessun difetto. Un solo dato di contesto, con origine ora accertata per intero (non lasciata come
"o l'uno o l'altro" — un "o" in un resoconto di questo progetto è il tipo di imprecisione già
pagata più volte):

La tabella `lavori_rifacimenti` porta già, da **`supabase/migrations/006_v1_foundation_security_fixes.sql:94-101`**
(vecchia migration di fondazione, non da nessuna delle recenti sull'ondata qualità), **due vincoli
aggiuntivi**, non toccati da questo task:
- `rifacimento_no_self_ref` — `CHECK (lavoro_originale_id <> lavoro_nuovo_id)`
- `rifacimento_nuovo_unique` — `UNIQUE (laboratorio_id, lavoro_nuovo_id)`

Non sono in conflitto con quanto costruito in questo task (motivo + evento_id) e non richiedono
nessuna azione: li segnalo solo perché la prima stesura della sonda ② li ha urtati per un errore
del **mio** fixture di prova (avevo riusato lo stesso `lavori.id` per originale e nuovo — non un
difetto della migration), e qualcuno che rilegga questo report senza il dettaglio potrebbe
scambiare quel primo errore per un difetto del vincolo nuovo — non lo è.

**Un secondo punto, verificato ma NON è un difetto — vedi sezione dedicata sopra** («la protezione
è reale ma OGGI dormiente»): nessun codice applicativo scrive ancora `evento_id` su
`lavori_rifacimenti` (la RPC viva `crea_rifacimento_atomico` non ha il parametro, l'unica rotta che
la chiama è quella manuale a 7 motivi). Non lo riferisco come difetto perché il piano stesso lo
prevede e lo assegna esplicitamente al Task 5 (RPC) e al Task 7 (rotta) — lo cito qui solo per
completezza, essendo la verifica comportamentale che R-P1 richiede per il vincolo che ho costruito.
