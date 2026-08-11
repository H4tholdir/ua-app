# Task 2 — La data della prima immissione sul mercato — Resoconto

Ramo: `intervento-post-consegna` (nessun worktree usato).
Cartella scratchpad usata per i file usa-e-getta:
`/private/tmp/claude-501/-Users-hatholdir-Downloads-SOFTWARE-FILIPPO/d9abfc44-0fee-44bc-96b0-b15c2b6cd869/scratchpad`

---

## Passo 1 — la riga VERA che scrive `data_consegna_effettiva`

Aperto `src/lib/consegna/orchestrate.ts` righe 290-345 (in realtà l'ho letto per intero, 1-422,
per capire dove `lavoro` viene caricato). Il brief cita `orchestrate.ts:324-329` come
un'indicazione, non un fatto verificato — verificato:

```
$ grep -n "data_consegna_effettiva" src/lib/consegna/orchestrate.ts
328:        data_consegna_effettiva: now,
```

**Un solo hit in tutto il file.** La riga vera è **328**, una singola riga
`data_consegna_effettiva: now,` dentro il blocco Step 5 (`.update({...})`, righe **321-331**),
non un intervallo di sei righe come il numero del brief lasciava intendere — quel numero era
la citazione dell'intero blocco `update`, non della riga che scrive il campo. **Un solo punto di
scrittura**, quindi «una sola scrittura corretta su due» (il rischio che il brief segnala) non si
applica qui: non ci sono due scritture da trovare.

Ho anche cercato `data_consegna_effettiva` in tutto `src/` (94 occorrenze) per essere sicuro che
non ci fosse un secondo scrittore fuori da `orchestrate.ts` (es. una route PATCH): **nessuna** —
`data_consegna_effettiva` **non è** in `PATCHABLE_FIELDS`
(`src/app/api/lavori/[id]/route.ts:198-242`), quindi non è mai scritto da un utente. `orchestrate.ts`
è l'unico scrittore, com'è presupposto dal brief.

`lavoro` (la riga su cui si scrive) è caricata allo **Step 1** (righe 193-206) con
`select('*', ...)`: quindi allo Step 5 `lavoro.prima_immissione_at` è **già letto dal database**,
non serve una lettura aggiuntiva — la preoccupazione del brief («se la riga non è già stata letta,
leggila») non si materializza qui, ma l'ho verificata leggendo il codice, non assunta.

---

## Passo 2 — timestamp vero e migration

```
$ date -u "+%Y%m%d%H%M%S"
20260807172520
```

File creato: `supabase/migrations/20260807172520_lavori_prima_immissione.sql` — timestamp
successivo a `20260807171033` (Task 1), come richiesto. Testo identico a quello del brief
(ALTER TABLE + backfill + COMMENT), con l'intestazione aggiornata.

---

## Passo 3 — applicazione e verifica del backfill

### Prova PRIMA della migration (R-P1 — si prova l'assunzione, non solo il risultato atteso)

```
$ set -a && . ./.env.local; set +a && node scripts/psql.mjs -c \
  "SELECT count(*) FILTER (WHERE data_consegna_effettiva IS NOT NULL) AS con_data, count(*) AS consegnati FROM lavori WHERE stato='consegnato';"
[1] SELECT — 1 righe
┌─────────┬──────────┬────────────┐
│ (index) │ con_data │ consegnati │
├─────────┼──────────┼────────────┤
│ 0       │ '223'    │ '224'      │
└─────────┴──────────┴────────────┘
```

Confermato PRIMA di applicare qualunque cosa: 223 lavori consegnati su 224 hanno già
`data_consegna_effettiva` valorizzata — la sorgente del backfill è quella che il brief
dichiarava. Verificata anche l'assenza della colonna, per escludere un run precedente:

```
$ node scripts/psql.mjs -c "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='lavori' AND column_name='prima_immissione_at';"
[1] SELECT — 0 righe toccate
```

### Applicazione (D284 — non si chiede)

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes > /tmp/db-push.log 2>&1; ESITO=$?; echo "uscita=$ESITO"; cat /tmp/db-push.log
uscita=0
Initialising login role...
Connecting to remote database...
Skipping migration MANUAL_000_auth_helpers.sql... (file name must match pattern "<timestamp>_name.sql")
Applying migration 20260807172520_lavori_prima_immissione.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260807172520_lavori_prima_immissione.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

### Sonda del backfill (esattamente quella del brief, un'invocazione unica — nessun SAVEPOINT
### multiplo nello stesso file, lezione pagata dal Task 1)

```
$ set -a && . ./.env.local; set +a && node scripts/psql.mjs "$SCRATCH/prova-t2.sql" > /tmp/prova-t2.log 2>&1; ESITO=$?; echo "uscita=$ESITO"; cat /tmp/prova-t2.log
uscita=0
[1] SELECT — 1 righe
┌─────────┬───────┬────────────┐
│ (index) │ piene │ consegnati │
├─────────┼───────┼────────────┤
│ 0       │ '223' │ '224'      │
└─────────┴───────┴────────────┘
```

**`piene=223`, `consegnati=224` — esattamente l'atteso del brief.** Corrisponde esattamente al
conteggio pre-migration: il backfill ha scritto in tutte e sole le righe che avevano una data
sorgente, e non ha inventato nulla.

### Verifica della riga rimasta NULL — non è un bug del backfill

```
$ node scripts/psql.mjs -c "SELECT id, stato, data_consegna_effettiva, prima_immissione_at FROM lavori WHERE stato='consegnato' AND data_consegna_effettiva IS NULL;"
[1] SELECT — 1 righe
┌─────────┬──────────────────────────────────────┬──────────────┬──────────────────────────┬──────────────────────┐
│ (index) │ id                                     │ stato        │ data_consegna_effettiva │ prima_immissione_at │
├─────────┼──────────────────────────────────────┼──────────────┼──────────────────────────┼──────────────────────┤
│ 0       │ '00000000-0000-0000-0000-000000000032' │ 'consegnato' │ null                    │ null                 │
└─────────┴──────────────────────────────────────┴──────────────┴──────────────────────────┴──────────────────────┘
```

Un lavoro di test con `stato='consegnato'` ma senza mai una `data_consegna_effettiva` (anomalia
del dato di prova, non del codice — §8 CLAUDE.md: banco di soli dati di test). Resta `NULL`
correttamente: non si inventa una data che non c'è.

### Verifica del testo del COMMENT (non solo che la colonna esista — R-P1: si prova quello che si
### afferma, e l'affermazione del brief è anche il TESTO del commento, spezzato su più righe SQL)

```
$ node scripts/psql.mjs -c "SELECT col_description('public.lavori'::regclass, ordinal_position) AS commento FROM information_schema.columns WHERE table_schema='public' AND table_name='lavori' AND column_name='prima_immissione_at';"
[1] SELECT — 1 righe
commento: 'La PRIMA volta che il manufatto è stato messo a disposizione (Art. 2(28)): da qui
decorrono i 10 anni di conservazione della dichiarazione (Allegato XIII p.4). Si scrive una
volta sola e NESSUNA riapertura la azzera — a differenza di data_consegna_effettiva, che
descrive la consegna CORRENTE.'
```

Le tre stringhe adiacenti del brief si sono concatenate correttamente in un unico commento
leggibile, senza troncamenti né newline spurie.

---

## Verifica della premessa che regge tutto il task (letta, non eseguita)

Il task esiste perché `data_consegna_effettiva` viene azzerata da `riapri_lavoro_atomica` («torna
a pronto»). Non ho costruito la sonda d'integrazione (il brief la esclude esplicitamente: «qui
basta la sonda del Passo 3»), ma ho **letto** la funzione per confermare che non tocchi la colonna
nuova:

```
$ sed -n '116,126p' supabase/migrations/20260806210400_riapri_lavoro_atomica.sql
  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL,
    proposta_dentista = NULL, proposta_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
```

**Premessa verificata leggendo la SET list** (nove colonne, `prima_immissione_at` assente) — letta,
non eseguita. Confermo anche che le altre RPC che azzerano `data_consegna_effettiva`
(`rpc_consegna_annullo_atomiche.sql`, `ondata0_pulizia_outbox.sql`,
`ondata1_portale_fatturazione_concordata.sql`, `riemissione_ddc.sql`) non toccano
`prima_immissione_at` per lo stesso motivo (colonna inesistente al momento in cui furono scritte,
e nessuna li ha toccati da allora — questo task non le modifica, R-E1/R-E2).

---

## Passo 4 — la scrittura alla consegna

Modificato `src/lib/consegna/orchestrate.ts`, dentro il blocco Step 5 (riga 328 originale, ora
spostata a **337** dopo l'inserimento del commento):

```typescript
        data_consegna_effettiva: now,
        // 🔑 La prima immissione sul mercato si scrive UNA VOLTA SOLA
        // (Allegato XIII p.4 + Art. 2(28)): da qui decorrono i 10 anni di
        // conservazione della dichiarazione. Una riconsegna dopo una
        // riapertura NON la sposta — `lavoro` è la riga letta allo Step 1
        // (select('*') su questo stesso lavoro), quindi il valore esistente
        // è già in mano: se c'è, vince sempre sul nuovo, o il termine
        // ripartirebbe da capo e la dichiarazione verrebbe distrutta troppo
        // presto.
        prima_immissione_at: lavoro.prima_immissione_at ?? now,
        consegna_completata_at: now,
```

Adattato rispetto al frammento del brief (`lavoroPrima?.prima_immissione_at ?? adesso`): qui non
esiste una variabile `lavoroPrima` né `adesso` — la riga già caricata si chiama `lavoro` (senza
`?.`, perché a quel punto del codice `lavoro` è già garantita non-null dal controllo dello Step 1)
e la variabile del timestamp si chiama `now`. Stessa sostanza: il valore esistente vince sempre.

---

## Passo 5 — la prova che morde (R-P4)

File: `tests/unit/orchestra-consegna-prima-immissione.test.ts`. Consegna lo stesso lavoro due
volte con orologio mockato (`vi.setSystemTime`): la prima con `prima_immissione_at: null` in
banca dati, la seconda con `prima_immissione_at` già valorizzato dalla prima consegna (lo stato in
cui lo lascerebbe una riapertura reale, verificata sopra). **9 asserzioni totali** in un solo `it`.

### Primo rosso (naturale — prima di toccare `orchestrate.ts`)

```
$ npx vitest run tests/unit/orchestra-consegna-prima-immissione.test.ts
uscita=1
AssertionError: expected undefined to be '2026-01-10T09:00:00.000Z'
 ❯ tests/unit/orchestra-consegna-prima-immissione.test.ts:88:42
```

Rosso genuino: il modulo esiste (nessun "modulo non trovato"), ma `prima_immissione_at` non
compare ancora nel payload — la prova prova qualcosa di reale, non un errore di importazione.

### Verde dopo l'implementazione corretta

```
$ npx vitest run tests/unit/orchestra-consegna-prima-immissione.test.ts
uscita=0
Test Files  1 passed (1)
     Tests  1 passed (1)
```

### Abbozzo inerte — conteggio delle asserzioni che si accendono

Ho commentato temporaneamente il `??` (`prima_immissione_at: now,` sempre, ignorando il valore
esistente — l'implementazione naive che il task esiste per evitare). Poiché in un singolo `it`
un `expect()` che lancia interrompe le asserzioni successive, per contare TUTTE quelle che
si accenderebbero ho duplicato temporaneamente il file sostituendo `expect(` → `expect.soft(`
(stesso file, stesse 9 asserzioni, nessuna logica cambiata), eseguito, e poi cancellato il
duplicato — il file committato usa `expect()` normale, non soft.

```
$ grep -c "expect.soft(" tests/unit/__rp4_soft_count.test.ts
9
$ npx vitest run tests/unit/__rp4_soft_count.test.ts
uscita=1
AssertionError: expected '2026-02-20T15:30:00.000Z' to be '2026-01-10T09:00:00.000Z'
 ❯ ...:108:47
AssertionError: expected '2026-02-20T15:30:00.000Z' not to be '2026-02-20T15:30:00.000Z'
 ❯ ...:109:51
Tests  1 failed (1)
```

**2 su 9** asserzioni si accendono con l'abbozzo inerte (le due sulla riconsegna: «`prima_immissione_at`
resta quella della prima consegna» e «`prima_immissione_at` ≠ `data_consegna_effettiva`»). Le
altre 7 restano verdi anche con l'abbozzo inerte perché **la prima consegna** (riga senza valore
pregresso) si comporta identicamente sia con `??` sia senza: `null ?? now === now`. È la
riconsegna, non la prima consegna, a discriminare fra le due implementazioni — motivo per cui la
prova consegna il lavoro **due volte** e non una sola.

File temporaneo cancellato (`tests/unit/__rp4_soft_count.test.ts`, `/tmp/soft-count.test.ts`),
`orchestrate.ts` ripristinato al `??` corretto, riverificato verde:

```
$ npx vitest run tests/unit/orchestra-consegna-prima-immissione.test.ts
uscita=0
Test Files  1 passed (1)
     Tests  1 passed (1)
```

---

## Passo 6 — FASE 6b + verifica piena

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
uscita=0
$ grep -n "prima_immissione_at" src/types/database.types.ts
2596:          prima_immissione_at: string | null
2699:          prima_immissione_at?: string | null
2802:          prima_immissione_at?: string | null
$ tail -c 200 src/types/database.types.ts
export const Constants = {
  public: {
    Enums: {},
  },
} as const
```

Nessun messaggio della CLI in fondo al file (ultime righe pulite, verificate carattere per
carattere).

```
$ npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
uscita=0
```

Non essendo bastato il minimo richiesto dal brief per un task che tocca una migration (§0C
CLAUDE.md: migrations → sempre percorso «Grande» → FASE 7 piena), ho eseguito anche gli altri due
comandi di FASE 7:

```
$ npx vitest run > /tmp/vitest-full.log 2>&1; echo "uscita=$?"
uscita=0
Test Files  444 passed | 6 skipped (450)
     Tests  5436 passed | 68 skipped (5504)
```

```
$ npx next build > /tmp/next-build.log 2>&1; echo "uscita=$?"
uscita=0
```

Suite intera verde (0 fallimenti, 68 skip preesistenti non legati a questo task), build di
produzione riuscita.

### Salva

```
$ git add -A -- src/lib/consegna/orchestrate.ts src/types/database.types.ts \
    supabase/migrations/20260807172520_lavori_prima_immissione.sql \
    tests/unit/orchestra-consegna-prima-immissione.test.ts
$ git commit -m "feat(consegna): prima_immissione_at — i 10 anni decorrono dalla PRIMA consegna (All. XIII p.4)"
```

Hook pre-commit tutti verdi (ESLint, DS compliance, guardia CSRF, guardia coerenza documenti,
guardia salvataggio automatico). Vedi «Esito» in fondo per l'hash.

---

## Difetti riferiti fuori mandato (R-E2)

**Nessun difetto nel codice** trovato fuori dal mandato di questo task. Tre osservazioni, nessuna
delle quali blocca né richiede una correzione mia:

1. **`prima_immissione_at` nasce senza lettori.** Ho cercato in `src/` chi calcola oggi una
   scadenza di conservazione (`grep -rniE "conservazione|10 anni|dieci anni|retention|allegato
   xiii" src/ --include="*.ts" --include="*.tsx"`): tutti gli hit sono testo prosastico nei
   template PDF (`DpaTemplate.tsx`, `RicevutaConsegnaTemplate.tsx`, `DdcTemplate.tsx`) o commenti
   di codice che citano l'Allegato XIII per altri motivi — **nessun codice calcola oggi una data
   di scadenza (`+ 10 anni`) da nessuna colonna**, né da `data_consegna_effettiva` né dalla nuova
   `prima_immissione_at`. Non è un difetto: è il task 2 di 10 di un'ondata, il consumo arriverà
   probabilmente in un task successivo. Lo scrivo perché è un fatto che chi pianifica i task
   successivi deve avere, non assumere.

2. **`prima_immissione_at` è correttamente assente da `PATCHABLE_FIELDS`** (mai scritta
   dall'utente, solo dall'orchestratore — stessa natura di `data_consegna_effettiva`, anch'essa
   assente dall'allowlist), ma la direttiva permanente §9 di CLAUDE.md richiede che ogni campo
   escluso dall'allowlist porti **una ragione scritta lì vicino**, e oggi non ce n'è una per
   nessuno dei due campi in `src/app/api/lavori/[id]/route.ts:198-242`. Non l'ho aggiunta: è un
   altro file, fuori dal perimetro dichiarato di questo task (migration + `orchestrate.ts` +
   prova). Segnalo che un commento di una riga è dovuto lì.

3. **Domanda normativa aperta, non un difetto — sull'interazione con l'annullo entro 10 minuti.**
   `annulla_consegna_atomica` (e le RPC gemelle) azzerano `data_consegna_effettiva` entro la
   finestra di 10 minuti, ma — verificato sopra — **non toccano** `prima_immissione_at`: se un
   lavoro viene consegnato, annullato entro 10 minuti e poi riconsegnato, `prima_immissione_at`
   resta quella del **primo tentativo annullato**, non della consegna che è effettivamente valsa.
   L'errore introdotto è delimitato dalla finestra di 10 minuti su un termine di 10 anni, e il
   comportamento è esattamente quello che il brief chiede («scritta una volta sola, il valore
   esistente vince sempre»): non affermo che sia sbagliato — non ho nessuna delle quattro prove
   richieste da CLAUDE.md per stabilire se un tentativo annullato entro 10 minuti conti come
   «prima messa a disposizione» ai sensi dell'Art. 2(28) — lo segnalo come domanda aperta per un
   panel normativo futuro, non come difetto di questo task.

**BP-1 (MEMORY.md / ROADMAP-UFFICIALE.md): non eseguito qui** — è a livello di ondata (10 task),
non di singolo task, e fuori dal mandato di questo esecutore (stessa scelta del Task 1).

**`git push`: non tentato.** Il classificatore blocca `git push` anche con D296 (verificato dal
Task 1 stesso giorno). Comando pronto per chi ha il permesso:
```
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && git push -u origin intervento-post-consegna
```

---

## Esito

- Stato: **DONE**
- Commit: `87beb28715424e41292e76e7137fd03157c72a78` — `feat(consegna): prima_immissione_at — i
  10 anni decorrono dalla PRIMA consegna (All. XIII p.4)`
- Riga vera che scrive `data_consegna_effettiva`: **328** di `src/lib/consegna/orchestrate.ts`
  (unica occorrenza in tutto il file, blocco update 321-331); la nuova scrittura di
  `prima_immissione_at` è ora alla riga **337**.
- Backfill: `piene=223`, `consegnati=224` — **esattamente l'atteso**, verificato sia PRIMA
  (`con_data=223/224`) sia DOPO la migration; la riga rimasta NULL è un'anomalia del dato di
  test, non del codice.
- Prova (R-P4): primo rosso genuino (campo assente) → verde con `??` → **2 su 9** asserzioni si
  accendono con l'abbozzo inerte (`now` sempre, senza `??`) → verde di nuovo dopo il ripristino.
- FASE 7 piena (dominio critico: migration → percorso Grande): `tsc --noEmit` uscita 0 ·
  `vitest run` 5436 passati/68 skip, 0 falliti · `next build` uscita 0.
- Difetti fuori mandato: 3 osservazioni segnalate (nessuna correzione applicata di nascosto), v.
  sezione sopra.

---

## Correzione dei rilievi della revisione

Ramo: `intervento-post-consegna` (nessun worktree usato). Due rilievi da una revisione
indipendente sul Task 2, in ordine di gravità.

### 🔴 CRITICO — `consegna_finalizza_atomica` non scriveva `prima_immissione_at`

**Passo 1 — corpo dal catalogo vivo, non dal file di migration** (vincolo esplicito del brief:
in questo progetto un file di migration può divergere dalla funzione che gira davvero).

```
$ set -a && . ./.env.local; set +a && node scripts/psql.mjs "$SCRATCH/catalogo-vivo.sql"
[1] SELECT — 1 righe
def: "CREATE OR REPLACE FUNCTION public.consegna_finalizza_atomica(p_lavoro_id uuid, p_laboratorio_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_rows int;
BEGIN
  UPDATE lavori SET
    stato = 'consegnato',
    consegna_in_corso = false,
    conformato = true,
    data_conformazione = now(),
    data_consegna_effettiva = now(),
    consegna_completata_at = now(),
    consegna_precheck_passato_al_primo_tentativo = true
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL;
  ...
$function$"
```

Identico al testo del file `20260710150000_ondata0_pulizia_outbox.sql:28-50` — nessuna
divergenza da riconciliare in questo caso, ma verificato invece che assunto. Controllato anche
l'ACL prima della correzione (`proacl`): `{postgres=X/postgres,service_role=X/postgres}` — nessun
grant a PUBLIC/anon/authenticated, coerente con `REVOKE ALL … / GRANT EXECUTE … TO service_role`.

**Passo 2 — migration nuova**, timestamp successivo a `20260807172520`:

```
$ date -u "+%Y%m%d%H%M%S"
20260807174850
```

File: `supabase/migrations/20260807174850_correzione_prima_immissione_finalizza_atomica.sql` —
`CREATE OR REPLACE FUNCTION` con la stessa firma `(uuid, uuid)` (nessun overload orfano),
`SECURITY DEFINER` e `search_path` conservati, unica aggiunta nell'`UPDATE`:
`prima_immissione_at = COALESCE(lavori.prima_immissione_at, now())`, simmetrica a
`orchestrate.ts:337`. `REVOKE`/`GRANT` riaffermati esplicitamente (ridondanti — `CREATE OR
REPLACE` conserva l'ACL — ma dichiarati invece che impliciti, come nella migration originale).

**Passo 3 — applicazione** (D284, non si chiede):

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
Applying migration 20260807174850_correzione_prima_immissione_finalizza_atomica.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260807174850_correzione_prima_immissione_finalizza_atomica.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

**Passo 4 — verifica sul catalogo vivo dopo l'applicazione** (definizione + ACL invariata):

```
$ node scripts/psql.mjs "$SCRATCH/verifica-post-migration.sql"
def: "... UPDATE lavori SET\n    stato = 'consegnato',\n    ...\n    data_consegna_effettiva = now(),\n
    -- 🔑 Simmetrico a orchestrate.ts:337 …\n    prima_immissione_at = COALESCE(lavori.prima_immissione_at, now()),\n
    consegna_completata_at = now(),\n    ..."
$ node scripts/psql.mjs "$SCRATCH/catalogo-vivo-acl.sql"
proacl: '{postgres=X/postgres,service_role=X/postgres}'   -- invariata
```

**Passo 5 — la prova che morde (transazione annullata, `BEGIN … ROLLBACK`), una sonda per
invocazione con `SAVEPOINT`, riga di prova inserita nella stessa transazione (R-P1: aggiornare
righe inesistenti dà un falso verde).**

⚠️ Nota metodologica trovata **durante** la scrittura della sonda, non prima: `now()` in
PL/pgSQL è costante per tutta la transazione (`transaction_timestamp`). Una prima versione della
sonda che ripartiva da `NULL` per entrambe le chiamate avrebbe dato un **falso verde** anche con
un'implementazione ingenua senza `COALESCE` (perché il secondo `now()` sarebbe stato identico al
primo). Corretta piantando, prima della seconda chiamata, un valore **fisso e lontano nel
passato** (`2020-06-15`, mentre "oggi" della transazione è 2026-08-07): se la funzione lo
sovrascrivesse con `now()`, la differenza sarebbe evidente.

```
$ set -a && . ./.env.local; set +a && node scripts/psql.mjs "$SCRATCH/prova-fix-consegna-finalizza.sql"
[6]  uno_si_valorizza=true | valore_scritto=2026-08-07T17:52:53.764Z
[11] due_valore_dopo_seconda_chiamata=2020-06-15T10:00:00.000Z | due_invariata_come_atteso=true
     | data_consegna_effettiva_aggiornata_a_now=2026-08-07T17:52:53.764Z | due_diversa_da_data_consegna=true
[12] ROLLBACK — 0 righe toccate
```

**① si valorizza:** era `NULL`, dopo la prima chiamata è `2026-08-07T17:52:53.764Z` (`uno_si_valorizza=true`).
**② NON cambia:** era `2020-06-15T10:00:00.000Z` (piantato a mano), dopo la seconda chiamata è
**ancora** `2020-06-15T10:00:00.000Z` (`due_invariata_come_atteso=true`) — nonostante
`data_consegna_effettiva` si sia davvero aggiornata a `2026-08-07T17:52:53.764Z`
(`data_consegna_effettiva_aggiornata_a_now=true` per costruzione, e
`due_diversa_da_data_consegna=true` lo conferma): la funzione ha girato per davvero, e
`prima_immissione_at` è rimasta ferma. Transazione annullata, nessun dato persistito.

### 🟡 IMPORTANTE — `scripts/import-lavori-storici.ts` non scriveva `prima_immissione_at`

Aggiunta `prima_immissione_at: dataConsegna` nell'`insert()` (righe 154-175, subito dopo
`data_consegna_effettiva: dataConsegna`), con lo stesso criterio del backfill della migration
Task 2 (`SET prima_immissione_at = data_consegna_effettiva WHERE stato='consegnato' AND
data_consegna_effettiva IS NOT NULL`): un import storico nasce già consegnato, quindi la data di
consegna importata **è** la prima messa a disposizione. Commento inline che spiega perché
(rischio silenzioso se lo script viene riusato per l'ingresso di un laboratorio vero).

### FASE 6b + verifica

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
uscita=0   (coda del file pulita, nessun messaggio CLI residuo)
$ npx tsc --noEmit
uscita=0
```

### Prove rilanciate (copertura della modifica)

```
$ npx vitest run tests/unit/orchestra-consegna-prima-immissione.test.ts tests/unit/orchestra-consegna-cassetta.test.ts tests/unit/orchestra-consegna-no-fattura.test.ts tests/unit/orchestra-consegna-gate.test.ts tests/unit/orchestra-consegna-prescrizione.test.ts tests/unit/orchestra-consegna-whatsapp-cellulare.test.ts
Test Files  6 passed (6)
     Tests  22 passed (22)
```

Nessun test unitario dedicato esiste per `scripts/import-lavori-storici.ts` (script di import
one-shot, mai stato sotto `tests/`) — non ne è stato scritto uno: fuori dal mandato di questa
correzione, il brief chiedeva la scrittura del campo con un commento, non una suite nuova.

`src/types/database.types.ts`: rigenerato (`gen types`, uscita 0, coda pulita) ma **zero
differenze nel diff** — atteso: la firma `(uuid, uuid) → json` di `consegna_finalizza_atomica`
non è cambiata, solo il corpo, e i tipi generati riflettono le firme, non i corpi. Non incluso
nel commit perché identico a quanto già in `HEAD`.

### Difetti fuori mandato (R-E2) — UNO trovato, riferito e (per necessità) rimosso

Il primo tentativo di commit è stato **respinto dal pre-commit hook**:

```
$ git commit -m "fix(consegna): consegna_finalizza_atomica e import storico scrivono prima_immissione_at"
[STARTED] Running tasks for staged files...
[FAILED] eslint --max-warnings=0 [FAILED]
✖ eslint --max-warnings=0:
/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/scripts/import-lavori-storici.ts
  48:6  warning  'Stato' is defined but never used  @typescript-eslint/no-unused-vars
✖ 1 problem (0 errors, 1 warning)
ESLint found too many warnings (maximum: 0).
husky - pre-commit script failed (code 1)
[COMPLETED] Reverting to original state because of errors...
```

`lint-staged` (`package.json:87-89`, `"*.{ts,tsx}": "eslint --max-warnings=0"`) lint l'INTERO
file quando è staged, non solo le righe toccate. Verificato che il warning **preesisteva**, non
introdotto da questa correzione:

```
$ git show HEAD:scripts/import-lavori-storici.ts > scripts/__orig_check_import.ts && \
  npx eslint --max-warnings=0 scripts/__orig_check_import.ts; rm -f scripts/__orig_check_import.ts
scripts/__orig_check_import.ts
  48:6  warning  'Stato' is defined but never used  @typescript-eslint/no-unused-vars
✖ 1 problem (0 errors, 1 warning)
$ grep -n "\bStato\b" scripts/import-lavori-storici.ts
48:type Stato = 'consegnato' | 'sospeso'
```

`type Stato = 'consegnato' | 'sospeso'` (riga 48), presente dal commit che ha introdotto il file
(`178c7e09`), un solo hit in tutto il file (la sua stessa dichiarazione): codice morto vero, non
un side-effect della mia modifica. **Riferito qui invece di corretto di nascosto (R-E2)** — ma
lasciarlo bloccava il gate ESLint su QUALSIASI commit che tocchi questo file, indipendentemente
dal contenuto della modifica (`--no-verify` è vietato da CLAUDE.md salvo richiesta esplicita, e
qui non c'era). Rimosso con una riga sola, verificato che non serva altrove (`grep` sopra), e
riverificato `tsc --noEmit` (uscita 0) ed `eslint --max-warnings=0` sul file (uscita 0) dopo la
rimozione. Il fatto e la ragione sono scritti anche nel corpo del commit, non solo qui — R-E2
chiede di non nascondere, non di non toccare mai nulla fuori mandato quando bloccante per il
proprio.

### Salva

```
$ git add scripts/import-lavori-storici.ts supabase/migrations/20260807174850_correzione_prima_immissione_finalizza_atomica.sql
$ git commit -m "fix(consegna): consegna_finalizza_atomica e import storico scrivono prima_immissione_at ..."
[intervento-post-consegna b7d7802c] fix(consegna): consegna_finalizza_atomica e import storico scrivono prima_immissione_at
 2 files changed, 70 insertions(+), 2 deletions(-)
 create mode 100644 supabase/migrations/20260807174850_correzione_prima_immissione_finalizza_atomica.sql
```

Hook pre-commit tutti verdi al secondo tentativo (ESLint, DS compliance, guardia CSRF, guardia
coerenza documenti, guardia salvataggio automatico). `.superpowers/` è **fuori da git**
(`.gitignore:140`), quindi questo resoconto non entra nel commit — verificato con
`git check-ignore -v`.

### Esito

- Stato: **DONE**
- Commit: `b7d7802c` — `fix(consegna): consegna_finalizza_atomica e import storico scrivono
  prima_immissione_at`
- Prova CRITICO: `npx supabase db push --linked --yes` → migrazione applicata; sonda a due
  invocazioni in transazione annullata → ① `NULL → 2026-08-07T17:52:53.764Z` ②
  `2020-06-15T10:00:00.000Z → 2020-06-15T10:00:00.000Z` (invariata), con
  `data_consegna_effettiva` davvero aggiornata a conferma che la funzione ha girato.
- FASE 6b: `gen types` pulito (zero diff, atteso — solo la firma conta e non è cambiata),
  `tsc --noEmit` uscita 0.
- Prove rilanciate: 6 file / 22 test di `orchestra-consegna-*`, tutti verdi.
- Difetto fuori mandato: `type Stato` morto in `import-lavori-storici.ts:48` — riferito sopra e
  rimosso perché bloccava il gate ESLint su questo commit; nessun altro difetto trovato.
