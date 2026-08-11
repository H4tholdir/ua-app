# Task 1 — La colonna della scelta — Resoconto

Ramo: `intervento-post-consegna` (nessun worktree usato).
Cartella scratchpad usata per i file SQL usa-e-getta (mai `/tmp` per file che devono
restare leggibili — qui il contenuto è comunque incollato per intero, come richiesto):
`/private/tmp/claude-501/-Users-hatholdir-Downloads-SOFTWARE-FILIPPO/d9abfc44-0fee-44bc-96b0-b15c2b6cd869/scratchpad`

---

## Verifica preliminare delle citazioni del brief

Prima di fidarmi del testo del brief, verificate le citazioni che porta:

```
$ ls docs/superpowers/specs/ | grep 2026-08-0
...
2026-08-07-torna-a-pronto-documento-intatto-design.md   ← esiste
```

```
$ grep -n "D304\|D305" docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md
3149: ### Centoventottesima tornata — D304: il bivio dei due difetti ENTRA nell'ondata...
3182: ### Centoventinovesima tornata — D305 e D306: il bivio si chiede SUBITO...
$ grep -n "D290\b\|D297\b" docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md
2786: | **D290** | DIFETTO DI LAVORAZIONE: LO SCEGLIE CHI REGISTRA...
2979: | **D297** | DIFETTO DEL MATERIALE: STESSA SCELTA DEL DIFETTO DI LAVORAZIONE...
```

Spec e tutti e quattro i numeri di decisione (D290, D297, D304, D305) esistono davvero. Nessuna
citazione a vuoto nella migration.

---

## Passo 1 — timestamp vero

```
$ date -u "+%Y%m%d%H%M%S"
20260807171033
```

File creato: `supabase/migrations/20260807171033_evento_scelta_intervento.sql`
(forma coerente con gli altri file di `supabase/migrations/`, es.
`20260807143623_riemissione_ddc.sql`).

---

## Verifica preliminare dell'assunzione del brief (R-P1 — si provano le assunzioni)

Il commento della migration nel brief afferma: «in banca dati esistono GIÀ 2 righe con
motivo='difetto_lavorazione' e nessuna scelta». Verificato PRIMA di scrivere la migration:

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && \
  node scripts/psql.mjs -c "SELECT motivo, count(*) FROM public.eventi_qualita GROUP BY motivo ORDER BY motivo;"
[1] SELECT — 1 righe
┌─────────┬───────────────────────┬───────┐
│ (index) │ motivo                │ count │
├─────────┼───────────────────────┼───────┤
│ 0       │ 'difetto_lavorazione' │ '2'   │
└─────────┴───────────────────────┴───────┘
```

Confermato: 2 righe, entrambe `difetto_lavorazione`, nessun'altra riga in tabella (0 righe con
qualunque altro motivo). L'assunzione che giustifica «una sola implicazione e non il
bicondizionale» è vera, ed è anche il fatto che rende necessaria la correzione della sonda ②
più sotto.

---

## Passo 2 — migration scritta

File: `supabase/migrations/20260807171033_evento_scelta_intervento.sql`. Testo identico a
quello del brief (Passo 2), con l'intestazione della migration aggiornata al timestamp vero.
Produce `eventi_qualita.scelta_intervento TEXT NULL` con due vincoli CHECK
(`evento_scelta_vocabolario`, `evento_scelta_solo_sui_difetti`).

---

## Passo 3 — applicazione e sonde

### Applicazione (D284 — non si chiede)

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes > /tmp/db-push.log 2>&1; ESITO=$?; echo "uscita=$ESITO"; cat /tmp/db-push.log
uscita=0
Initialising login role...
Connecting to remote database...
Skipping migration MANUAL_000_auth_helpers.sql... (file name must match pattern "<timestamp>_name.sql")
Applying migration 20260807171033_evento_scelta_intervento.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260807171033_evento_scelta_intervento.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

### Difetti trovati NELLA COSTRUZIONE DELLA SONDA (dentro il mandato di questo task — la sonda
### è il deliverable del Passo 3), corretti qui e riportati anche in R-E2 come lezione per i
### task successivi che useranno lo stesso attrezzo

Il brief propone di eseguire in un'UNICA transazione con `SAVEPOINT`/`ROLLBACK TO` tutte e tre
le sonde in un solo file (`/tmp/prova-t1.sql`). Il primo tentativo, fatto esattamente come da
brief, si è fermato alla sonda ①:

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && \
  node scripts/psql.mjs "$SCRATCH/prova-t1.sql" > /tmp/prova-t1-output.log 2>&1; ESITO=$?; echo "uscita=$ESITO"; cat /tmp/prova-t1-output.log
uscita=1
❌ 23514 new row for relation "eventi_qualita" violates check constraint "evento_scelta_vocabolario"
   dettaglio: Failing row contains (925cac83-8f4a-4806-9953-4783926019f3, ..., pippo).
```

Solo l'errore della sonda ① compare: le sonde ② e ③, che nel file seguivano dopo un
`ROLLBACK TO s1`, non vengono mai eseguite. Il motivo è documentato nell'intestazione dello
stesso `scripts/psql.mjs`: `client.query(sql)` usa il *simple query protocol* di Postgres, che al
primo errore in un batch multi-istruzione **interrompe silenziosamente** tutto il resto del
batch — incluso il `ROLLBACK TO SAVEPOINT` che avrebbe dovuto far ripartire la transazione.
**Difetto del brief:** l'idiom `SAVEPOINT`/`ROLLBACK TO` in un solo file non funziona con questo
attrezzo. **Correzione:** ho diviso le tre sonde in **tre file separati**, ognuno con la propria
connessione/transazione `BEGIN … ROLLBACK`, così ogni sonda parte da uno stato pulito.

Dividendo le sonde è emerso un **secondo difetto**, più sostanziale, nella sonda ② come scritta
nel brief: `UPDATE eventi_qualita SET scelta_intervento = 'si_sistema' WHERE motivo =
'errore_registrazione'`. Ma — come verificato sopra — la tabella contiene **solo le 2 righe
`difetto_lavorazione`**, **zero righe** con `motivo = 'errore_registrazione'` o con qualunque
altro motivo. Un `UPDATE` il cui `WHERE` non seleziona nessuna riga non tocca nessuna riga e non
può mai violare un CHECK (il CHECK si valuta solo sulle righe effettivamente scritte): eseguita
alla lettera, la sonda avrebbe dato **uscita 0 con «0 righe toccate»** — un falso verde, la stessa
famiglia di errore che R-P1 esiste per impedire, applicata a un `UPDATE` invece che a un
`CREATE`/`ALTER`. **Correzione:** ho inserito, nella stessa transazione annullata, una riga
usa-e-getta con `motivo = 'errore_registrazione'` prima di tentare l'`UPDATE` — R-P1 lo consente
esplicitamente («le sonde girano su transazione annullata o schema usa-e-getta»).

### ① valore fuori vocabolario — DEVE essere rifiutato

File `prova-t1-1.sql`:
```sql
-- ① valore fuori vocabolario: DEVE essere rifiutato
BEGIN;
UPDATE eventi_qualita SET scelta_intervento = 'pippo'
 WHERE motivo = 'difetto_lavorazione';
ROLLBACK;
```

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && SCRATCH="/private/tmp/claude-501/-Users-hatholdir-Downloads-SOFTWARE-FILIPPO/d9abfc44-0fee-44bc-96b0-b15c2b6cd869/scratchpad" && \
  set -a && . ./.env.local; set +a && \
  node scripts/psql.mjs "$SCRATCH/prova-t1-1.sql" > /tmp/prova1.log 2>&1; E1=$?; echo "uscita_probe1=$E1"; cat /tmp/prova1.log
uscita_probe1=1
❌ 23514 new row for relation "eventi_qualita" violates check constraint "evento_scelta_vocabolario"
   dettaglio: Failing row contains (925cac83-8f4a-4806-9953-4783926019f3, 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c, 11cd3f11-7410-47af-9d4e-87b2a7ce1727, difetto_lavorazione, null, difetto_fisico, laboratorio_interno, 2026-08-07 14:22:00+00, consegnato_non_applicato, da_valutare, null, eb161af4-0232-4e8e-b0e2-3283d551e2fd, 2026-08-07 14:23:16.243845+00, pippo).
```

**Rifiutata**, SQLSTATE `23514`, vincolo `evento_scelta_vocabolario`, come atteso.

### ② scelta su motivo che non la ammette — DEVE essere rifiutata (sonda corretta, v. sopra)

File `prova-t1-2.sql`:
```sql
-- ② scelta su un motivo che non la ammette: DEVE essere rifiutata
-- Corretto rispetto al brief: la tabella ha SOLO 2 righe, entrambe motivo='difetto_lavorazione'
-- (verificato: SELECT motivo, count(*) FROM eventi_qualita GROUP BY motivo → 1 sola riga).
-- La UPDATE del brief con WHERE motivo='errore_registrazione' toccherebbe 0 righe e non
-- eserciterebbe mai il vincolo. Si inserisce una riga usa-e-getta nella stessa transazione
-- annullata (R-P1 lo consente esplicitamente) per avere un motivo non ammesso su cui provare.
BEGIN;
INSERT INTO eventi_qualita
  (laboratorio_id, lavoro_id, motivo, natura, origine_informazione, conosciuto_il, stato_dispositivo, potenziale_di_danno)
VALUES
  ('971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c', '11cd3f11-7410-47af-9d4e-87b2a7ce1727',
   'errore_registrazione', 'errore_registrazione', 'laboratorio_interno', now(), 'non_noto', 'da_valutare');
UPDATE eventi_qualita SET scelta_intervento = 'si_sistema'
 WHERE motivo = 'errore_registrazione';
ROLLBACK;
```

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && SCRATCH="/private/tmp/claude-501/-Users-hatholdir-Downloads-SOFTWARE-FILIPPO/d9abfc44-0fee-44bc-96b0-b15c2b6cd869/scratchpad" && \
  set -a && . ./.env.local; set +a && \
  node scripts/psql.mjs "$SCRATCH/prova-t1-2.sql" > /tmp/prova2.log 2>&1; E2=$?; echo "uscita_probe2=$E2"; cat /tmp/prova2.log
uscita_probe2=1
❌ 23514 new row for relation "eventi_qualita" violates check constraint "evento_scelta_solo_sui_difetti"
   dettaglio: Failing row contains (34547f39-4f98-42f5-8c9b-39a0fda2a006, 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c, 11cd3f11-7410-47af-9d4e-87b2a7ce1727, errore_registrazione, null, errore_registrazione, laboratorio_interno, 2026-08-07 17:13:23.395692+00, non_noto, da_valutare, null, null, 2026-08-07 17:13:23.395692+00, si_sistema).
```

**Rifiutata**, SQLSTATE `23514`, vincolo `evento_scelta_solo_sui_difetti`, come atteso.

### ③ scelta legittima — DEVE passare

File `prova-t1-3.sql`:
```sql
-- ③ scelta legittima: DEVE passare
BEGIN;
UPDATE eventi_qualita SET scelta_intervento = 'si_sistema'
 WHERE motivo = 'difetto_lavorazione';
SELECT count(*) AS aggiornate FROM eventi_qualita WHERE scelta_intervento = 'si_sistema';
ROLLBACK;
```

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && SCRATCH="/private/tmp/claude-501/-Users-hatholdir-Downloads-SOFTWARE-FILIPPO/d9abfc44-0fee-44bc-96b0-b15c2b6cd869/scratchpad" && \
  set -a && . ./.env.local; set +a && \
  node scripts/psql.mjs "$SCRATCH/prova-t1-3.sql" > /tmp/prova3.log 2>&1; E3=$?; echo "uscita_probe3=$E3"; cat /tmp/prova3.log
uscita_probe3=0
[2] UPDATE — 2 righe toccate
[3] SELECT — 1 righe
┌─────────┬────────────┐
│ (index) │ aggiornate │
├─────────┼────────────┤
│ 0       │ '2'        │
└─────────┴────────────┘
[4] ROLLBACK — 0 righe toccate
```

**Passata**: 2 righe aggiornate, come atteso.

### Verifica che il ROLLBACK non abbia lasciato tracce

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && \
  node scripts/psql.mjs -c "SELECT count(*) AS righe_totali, count(scelta_intervento) AS con_scelta FROM public.eventi_qualita;"
┌─────────┬──────────────┬────────────┐
│ (index) │ righe_totali │ con_scelta │
├─────────┼──────────────┼────────────┤
│ 0       │ '2'          │ '0'        │
└─────────┴──────────────┴────────────┘
```

2 righe totali, 0 con `scelta_intervento` valorizzato: nessuna delle tre sonde ha lasciato dati
nel banco.

### Conferma non bloccante — stesso vincolo come ruolo `authenticated`

Le tre sonde sopra girano come proprietario (via `SUPABASE_DB_URL`), che bypassa RLS. Tentata,
sulla scia dell'idiom già usato in `20260806170700_d274_difetti_vivi_intervento.sql` per il buco
del TRUNCATE (`SET LOCAL ROLE authenticated`), una conferma aggiuntiva con `authenticated`:

```
$ node scripts/psql.mjs -c "BEGIN; SET LOCAL ROLE authenticated; UPDATE eventi_qualita SET scelta_intervento = 'pippo' WHERE motivo = 'difetto_lavorazione'; ROLLBACK;"
[3] UPDATE — 0 righe toccate
```

**Inconcludente, non un successo del vincolo:** con `SET LOCAL ROLE authenticated` e nessuna
sessione (nessun JWT), `public.current_lab_id()` risulta `NULL` — verificato con
`SELECT public.current_lab_id();` nella stessa transazione → `null` — e la policy RLS
`laboratorio_id = public.current_lab_id()` filtra **tutte** le righe prima ancora che il CHECK
possa essere valutato (0 righe toccate, nessun errore). Non prova né smentisce che il CHECK morda
per `authenticated`: prova solo che RLS, senza una sessione vera, nasconde le righe. Costruire una
sessione con JWT finto è lavoro ulteriore fuori dal Passo 3 così come descritto nel brief — non
eseguito qui, lasciato alla rotta applicativa (che scriverà con una sessione reale) per la sua
prova end-to-end.

---

## Passo 4 — FASE 6b

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
uscita_gen_types=0
```

Nessun messaggio della CLI in fondo al file (ultime righe verificate: terminano pulite con
`export const Constants = { public: { Enums: {} } } as const`).

```
$ grep -n "scelta_intervento" src/types/database.types.ts
1154:          scelta_intervento: string | null
1170:          scelta_intervento?: string | null
1186:          scelta_intervento?: string | null
```

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"; wc -l /tmp/tsc.log
uscita=0
       0 /tmp/tsc.log
```

`uscita=0`, zero righe di output (nessun errore).

---

## Passo 5 — salva

```
$ git add supabase/migrations src/types/database.types.ts
$ git commit -m "feat(qualita): eventi_qualita.scelta_intervento — il bivio dei due difetti (D304)"
```

Vedi «Esito» in fondo per l'hash effettivo e la verifica `git status` post-commit.

---

## Difetti riferiti fuori mandato (R-E2)

**Nessun difetto fuori mandato** trovato in questo task (il brief dichiara «non tocca nessun
codice applicativo», e non ho toccato altro: solo la migration e i tipi generati). Ho letto, in
sola lettura, `src/lib/qualita/effetti.ts` per capire il contesto — conferma che il modulo
prevede già `EffettoLavoro: 'scelta_richiesta'` per i due motivi di difetto, coerente con questa
colonna; nessuna modifica necessaria né fatta lì.

**Due difetti trovati DENTRO il mandato (la sonda del Passo 3 è il deliverable), ma che si
propagano ai task successivi che useranno lo stesso attrezzo `scripts/psql.mjs` — li segnalo qui
perché la lezione è del piano, non solo di questo task:**

1. **L'idiom `SAVEPOINT` + `ROLLBACK TO` in un unico file NON funziona con
   `scripts/psql.mjs`.** Il simple query protocol interrompe silenziosamente tutte le istruzioni
   successive al primo errore in un batch — anche i `ROLLBACK TO SAVEPOINT` che seguono. Se i
   brief dei Task 2-10 ripetono lo stesso schema «tre sonde con SAVEPOINT in un file solo», ogni
   esecutore rischia di eseguire solo la prima sonda credendo di aver eseguito tutte e tre (o
   peggio, di non accorgersene). **Prescrizione per chi pianifica/esegue i task successivi:** una
   sonda per invocazione di `psql.mjs` (ogni invocazione apre una connessione propria; il proprio
   `ROLLBACK` — o anche solo la chiusura della connessione a fine script — basta ad annullare).
2. **Una sonda `UPDATE … WHERE <colonna> = <valore>` dà un falso verde se in tabella non esiste
   nessuna riga con quel valore.** Specifico di `eventi_qualita`, che oggi ha **solo 2 righe,
   entrambe `motivo = 'difetto_lavorazione'`**: qualunque sonda futura scritta come «aggiorna dove
   motivo = X» per un X diverso da `difetto_lavorazione` tocca zero righe, esce con successo e non
   dimostra nulla — esattamente il fallimento che R-P1 esiste per impedire, ma nella forma UPDATE
   invece che CREATE/ALTER. **Prescrizione:** chi scrive una sonda su questa tabella per un motivo
   diverso da `difetto_lavorazione` deve prima inserire una riga usa-e-getta nella stessa
   transazione annullata (pattern usato qui per la sonda ②), oppure verificare esplicitamente
   `count(*)` prima di fidarsi di un'uscita 0.

---

## Esito

- Stato: **DONE**
- Commit: `35292c72dbee0513d3b5c0c69d2cc6f5a509e23b` — `feat(qualita): eventi_qualita.scelta_intervento — il bivio dei due difetti (D304)`
  (`git status --short` post-commit: pulito, nessun file rimasto in sospeso)
- Sonde: ① rifiutata (23514, `evento_scelta_vocabolario`) · ② rifiutata (23514,
  `evento_scelta_solo_sui_difetti`, sonda corretta rispetto al brief) · ③ passata (2 righe
  aggiornate) · rollback verificato pulito (0 righe con `scelta_intervento` in banca dati dopo
  le sonde)
- FASE 6b: `gen types` uscita 0, colonna presente nei tipi, `tsc --noEmit` uscita 0 con 0 righe
  di output
- BP-1 (MEMORY.md / ROADMAP-UFFICIALE.md): **non eseguito qui** — è a livello di ondata
  (10 task), non di singolo task, e fuori dal mandato di questo esecutore.
