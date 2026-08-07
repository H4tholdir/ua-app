# Task 4 — referto: FASE 7, memoria, chiusura P7

**Ramo:** `p7-registro-dpa-cancello-traccia` · **base:** `2527fdfa` (fine Task 3)
**Brief:** `.superpowers/sdd/task-4-brief.md` · **registro di avanzamento letto prima di iniziare:**
`.superpowers/sdd/progress.md`

---

## 0. Cosa dice il brief, in una riga

Chiudere quattro pezzi: (a) provare che `emesso_da` arrivi DAVVERO in banca dati con un'emissione vera
del DPA; (b) due voci nuove in roadmap (P27, P28); (c) la voce P7 e la testa della spec, onesta su ciò
che resta; (d) BP-1 (memoria) + FASE 7 (le tre verifiche).

---

## (a) T3 — chiusa con un'emissione VERA (D152)

### Perché non si poteva premere il tasto vero su `uachelab.com`

Prima di toccare qualunque cosa, verificato che `origin/main` (ciò che gira in produzione) porti
davvero il codice del Task 2 che scrive `emesso_da`:

```
$ git log --oneline -3 origin/main
2f1939d3 docs(handoff): pubblicati — la §0 ② si chiude, e resta scritta
4674056e docs(handoff): chiusura — il salvataggio che non partiva, la spec del contratto, e la roadmap in ordine
6ca93092 fix(roadmap): controllo incrociato — P24 rafforzata nei Termini, e una sua affermazione corretta

$ git show origin/main:src/lib/pdf/generate-dpa.ts | grep -c "emesso_da"
0
```

**`origin/main` non ha il parametro `emesso_da`.** Premere il vero tasto su `uachelab.com` avrebbe
bruciato il progressivo `DPA-2026-0003` e scritto una riga permanente con `emesso_da = NULL` —
l'esatto contrario di quello che T3 deve provare, e senza modo di tornare indietro (il progressivo è
un contatore, non si "restituisce").

**Deviazione dichiarata, non un ripiego silenzioso:** server locale (`npm run dev`) sul ramo
`p7-registro-dpa-cancello-traccia`, puntato sullo **stesso database Supabase di produzione**
(`.env.local` → progetto `iagibumwjstnveqpjbwq`, lo stesso di sempre — non un progetto di test).
Stesso handler (`src/app/api/clienti/[id]/dpa/route.ts`), stessa autenticazione Supabase reale via
cookie di sessione, stesso database vivo. «Percorso applicativo vero» è soddisfatto (stesso codice del
Task 2, stessa rotta, stesso database); «in produzione» (cioè sul deploy Vercel) no — e il motivo è
che farlo lì non avrebbe provato nulla, avrebbe solo prodotto un falso negativo permanente.

### Scelta del cliente

Letto in sola lettura (`read_only:true`, Management API) chi fosse `TEST_EMAIL` e quali clienti del suo
laboratorio non avessero già un DPA riusabile:

```
Chi è TEST_EMAIL: [{"utente_id":"eb161af4-0232-4e8e-b0e2-3283d551e2fd","ruolo":"titolare",
  "laboratorio_id":"971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c","laboratorio_nome":"Filippo Opromolla","lab_stato":"trial"}]

Righe DPA esistenti PRIMA: [
 {"numero_dpa":"DPA-2026-0002","dentista_id":"f8d3a733-…","emesso_da":null,"emesso_at":"2026-08-01 22:56:21…"},
 {"numero_dpa":"DPA-2026-0001","dentista_id":"76115a50-…","emesso_da":null,"emesso_at":"2026-08-01 22:56:06…"}
]
```

Cliente scelto: **BARALE S.A.S.** (`f6e8774d-2618-4d28-9759-b6853dd18c7f`) — **zero** righe DPA vive
riusabili per questo cliente (`n_dpa_vivi_riusabili: 0`), Partita IVA presente (`04732740651`,
requisito di `validateDpaData` in `generate-dpa.ts:80-85`).

### Snapshot PRIMA (sola lettura)

```sql
SELECT id, laboratorio_id, dentista_id, numero_dpa, stato, emesso_da, emesso_at, deleted_at
FROM public.data_processing_agreements ORDER BY emesso_at DESC NULLS LAST;
```
```
[{"numero_dpa":"DPA-2026-0002","emesso_da":null,"emesso_at":"2026-08-01 22:56:21.35+00"},
 {"numero_dpa":"DPA-2026-0001","emesso_da":null,"emesso_at":"2026-08-01 22:56:06.774+00"}]
now(): 2026-08-02 15:03:28.404624+00
audit_log per data_processing_agreements: count = 0
```

### Il tasto premuto ESATTAMENTE UNA VOLTA

Dev server avviato sul ramo (`ua-dev`, porta 3000), sessione autenticata reale confermata (dashboard
mostra "Buon pomeriggio, Francesco"; `GET /api/clienti` con credenziali di sessione conferma che BARALE
è nell'elenco del laboratorio corretto). Poi, dalla pagina già autenticata, una singola `fetch`
same-origin verso la rotta vera:

```
GET http://localhost:3000/api/clienti/f6e8774d-2618-4d28-9759-b6853dd18c7f/dpa  (credentials: include)
→ HTTP 200
  content-disposition: attachment; filename="DPA-2026-0003.pdf"
  content-type: application/pdf
  server-timing: auth;dur=2, db;dur=175, total;dur=978
  byteLength: 13402
```

Nessun secondo tentativo: un secondo click avrebbe incontrato il guard di riuso e restituito lo stesso
file senza scrivere, confondendo la prova.

### DOPO — la query LETTERALE del brief (sola lettura)

```sql
SELECT numero_dpa, emesso_da FROM public.data_processing_agreements
 WHERE emesso_da IS NOT NULL ORDER BY emesso_at DESC LIMIT 1;
```
```
[{"numero_dpa":"DPA-2026-0003","emesso_da":"eb161af4-0232-4e8e-b0e2-3283d551e2fd"}]
```

**Una riga, non zero.** `emesso_da` è arrivato in banca dati.

### Controllo che sia una riga VERA e NUOVA (non il riuso di una vecchia)

```sql
SELECT id, laboratorio_id, dentista_id, numero_dpa, stato, emesso_da, emesso_at, deleted_at
FROM public.data_processing_agreements ORDER BY emesso_at DESC NULLS LAST;
```
```
[{"numero_dpa":"DPA-2026-0003","dentista_id":"f6e8774d-2618-4d28-9759-b6853dd18c7f",
  "emesso_da":"eb161af4-0232-4e8e-b0e2-3283d551e2fd","emesso_at":"2026-08-02 15:03:38.296+00"},
 {"numero_dpa":"DPA-2026-0002","emesso_da":null,"emesso_at":"2026-08-01 22:56:21.35+00"},
 {"numero_dpa":"DPA-2026-0001","emesso_da":null,"emesso_at":"2026-08-01 22:56:06.774+00"}]
```

- `numero_dpa = DPA-2026-0003` — nuovo, non uno dei due preesistenti (0001/0002).
- `dentista_id` = BARALE, il cliente scelto.
- `emesso_at = 15:03:38.296` — ~10 secondi dopo lo snapshot PRIMA (`15:03:28`), non un residuo vecchio.
- `emesso_da = eb161af4-…`, verificato per nome:

```sql
SELECT d.numero_dpa, d.emesso_da, u.ruolo, au.email FROM public.data_processing_agreements d
JOIN public.utenti u ON u.id = d.emesso_da JOIN auth.users au ON au.id = u.id
WHERE d.numero_dpa = 'DPA-2026-0003';
```
```
[{"numero_dpa":"DPA-2026-0003","emesso_da":"eb161af4-…","ruolo":"titolare","email":"h4t@live.it"}]
```

`h4t@live.it` è esattamente `TEST_EMAIL`, la sessione con cui si è premuto il tasto.

### Rinforzo gratuito — T2 si ripete sul dato vivo (non su una transazione annullata)

```sql
SELECT id, operation, actor_id, row_id, changed_at,
       new_data->>'emesso_da' AS new_emesso_da, new_data->>'numero_dpa' AS new_numero_dpa,
       (SELECT count(*) FROM jsonb_object_keys(new_data)) AS n_chiavi
FROM public.audit_log WHERE table_name = 'data_processing_agreements' ORDER BY changed_at DESC;
```
```
[{"id":2772,"operation":"INSERT","actor_id":null,"row_id":"20387331-…","changed_at":"2026-08-02 15:03:38.397…",
  "new_emesso_da":"eb161af4-…","new_numero_dpa":"DPA-2026-0003","n_chiavi":23}]
```

`operation='INSERT'` ✅ · `new_data->>'emesso_da'` valorizzato ✅ · 23 chiavi (riga intera) ✅.
`actor_id: null` **non è un difetto di questa prova: è P25 in carne** — la stessa ragione per cui D148
ha scelto una colonna sulla riga invece di fidarsi dell'attore del trigger (`auth.uid()` torna vuoto
perché la scrittura passa dal client di servizio anche quando parte da un click umano reale).

**Esito: T3 ✅ CHIUSA.** Riga permanente lasciata in banca dati per scelta esplicita (D152) — non
ripulita, non annullata. Dettaglio completo, con tutti i comandi: `docs/roadmap/2026-08-04-p7-referto-prove.md` §10 (aggiunto in questo task; §§0-9 restano come scritti nel Task 3, con un rimando `🔄` verso §10 dove serve).

---

## (b) Due voci nuove in roadmap — verificate indipendentemente, non solo riprese da `progress.md`

Prima di scrivere le voci ho riverificato entrambe le claim sul catalogo vivo (Management API,
`read_only:true`), invece di limitarmi a copiare F4/F1 da `progress.md`.

**P27 — `schema.sql` non rispecchia il registro delle modifiche:**
```sql
SELECT c.relname AS tabella, t.tgname AS trigger FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgname LIKE '\_audit\_%' AND NOT t.tgisinternal ORDER BY c.relname;
```
→ **undici** trigger vivi (`cicli_produzione` · `clienti` · `data_processing_agreements` ·
`dichiarazioni_conformita` · `fasi_produzione` · `fatture` · `laboratori` · `lavori` · `listino` ·
`magazzino` · `utenti`).
```
$ grep -c "EXECUTE FUNCTION.*_audit_trigger_fn" supabase/schema.sql
1
```
Solo `_audit_data_processing_agreements` (quello di oggi) è nel file. Confermato: **10 automatismi su
11 mancano dalla fotografia.**

**P28 — l'ordine dei DELETE in `admin_delete_laboratorio()`:**
```sql
SELECT array_agg(riga.n || ': ' || riga.testo ORDER BY riga.n) FROM (
  SELECT n, testo FROM unnest(string_to_array(
    (SELECT prosrc FROM pg_proc WHERE proname='admin_delete_laboratorio'), E'\n'
  )) WITH ORDINALITY AS t(testo, n) WHERE testo ILIKE '%DELETE FROM%'
) riga;
```
→ riga **37**: `DELETE FROM clienti …` · riga **62**: `DELETE FROM data_processing_agreements …` —
`clienti` **prima**.
```sql
SELECT conname, confdeltype, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.data_processing_agreements'::regclass AND contype='f' AND conname LIKE '%dentista%';
```
→ `data_processing_agreements_dentista_id_fkey`, `confdeltype: 'a'` (**NO ACTION**),
`FOREIGN KEY (dentista_id) REFERENCES clienti(id)`.
```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='dpa_emissione_coerente';
```
→ il ramo «emesso» del CHECK impone `dentista_id IS NOT NULL AND tipo_controparte='dentista'` sempre.

Confermato: ogni emissione vera lascia un `dentista_id` che, se il DELETE su `clienti` corre prima,
fa fallire il DELETE su quella riga (23503). 🛑 **Correzione fatta dopo un giro dell'advisor, prima di
committare la versione finale:** la prima stesura di questo referto diceva che l'emissione del punto
(a) avesse «reso raggiungibile» questo difetto per il laboratorio Filippo Opromolla. **È falso, e il
Task 3 lo prova da solo:** le due righe seminate il 01/08 (`DPA-2026-0001` → `dentista_id
76115a50-…`, `DPA-2026-0002` → `f8d3a733-…`) avevano **già** `dentista_id` valorizzato, e la sezione T4
del referto di Task 3 (`docs/roadmap/2026-08-04-p7-referto-prove.md`) mostra il **23503** ottenuto in
una transazione ANNULLATA su questo stesso laboratorio, **prima** che il Task 4 scrivesse alcunché —
`progress.md` lo dichiarava già («*Oggi colpisce un laboratorio*»). Il laboratorio Filippo Opromolla
era **già** incancellabile prima di questo task; l'emissione vera del punto (a) ha solo **aggiunto una
terza riga**, nata dal percorso applicativo reale, a conferma della previsione «per costruzione
colpirà ogni laboratorio che emette un DPA» — non l'origine della condizione.

Righe scritte in `docs/roadmap/ROADMAP-UFFICIALE.md`, dopo P26 (riga ~1007), stesso formato delle
altre voci P: **P27** (🟠) e **P28** (🔴, con la distinzione esplicita dalla voce del 28/07/2026 —
«un laboratorio può diventare INCANCELLABILE» — che elenca sei tabelle mai toccate affatto, mentre qui
le due `DELETE` esistono entrambe ed è l'ordine a sbagliare). P28 collocata **FASE 2, accanto a P21**
per D153, con nota che l'assunzione A7 del piano era incompleta (provata solo su `utenti`, mai su
`clienti`).

Anche corrette, per lo stesso motivo che le rende necessarie (numerazione che non torna più altrimenti):
- riga di testa `### 🔎 Referto dell'audit del 04/08/2026` — «le voci P»: P1-P26 → nota P1-P28.
- stessa sezione, riga «controllo incrociato»: stessa nota.
- **FASE 1 ③** (riga ~98): diceva ancora «piano e codice non ancora scritti» per P7 — falso da tre
  task. Aggiornata per dire lo stato vero (vedi punto (c)).

---

## (c) La voce P7 e la testa della spec — onesta, non ✅

**Voce P7 in roadmap** (`docs/roadmap/ROADMAP-UFFICIALE.md`, dopo la riga esistente, in coda —
il testo originale del 04/08 non è stato toccato, si è aggiunto un paragrafo `🔄 AGGIORNATA nel
Task 4`): T1 · T2 · T5 · T3 ✅, **T4 NON ESEGUIBILE** (bloccata da P28, riferito non corretto qui —
R-E2), assunzione A7 dichiarata incompleta. **Nessun ✅ sulla voce.**

**Testa della spec** `docs/superpowers/specs/2026-08-04-p7-registro-dpa-cancello-traccia-design.md`:
`Stato: NON ESEGUITA` → `Stato: ESEGUITA IN PARTE`, con lo stesso elenco (T1·T2·T5·T3 verdi, T4 non
eseguibile, A7 incompleta) e i riferimenti a D152/D153.

**Anche il piano** (`docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md`), riga A7
del registro delle assunzioni: annotata `🔄 INCOMPLETA` con la stessa spiegazione — è lì che A7 è
formalmente definita (la spec la cita in prosa, il piano la tabella).

**Guardia dei documenti (controllo 5 — ✅ non può citare una spec non eseguita):** verificato che
questa regola non si applica meccanicamente alla voce P7 (che vive nella tabella
"USCITI DAL LAVORO SUL REGISTRO DPA", non nella tabella digit-only "Le prossime voci" che il
controllo 5 scansiona) — ma il principio è stato applicato comunque, per scelta, non perché la rete
lo imponesse: **se scrivo ✅ da una parte, allineo l'altra; e qui non scrivo ✅ da nessuna parte.**

```
$ node scripts/guardia-coerenza-documenti.mjs
=== Guardia coerenza documenti — 4 documenti vivi controllati ===
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
```

---

## (d) BP-1 (memoria) + FASE 7

**Memoria:** `memory/MEMORY.md` (nuova riga in testa, voce 120, la precedente diventata
"Aggiornamento precedente") · `memory/SESSION_ACTIVE.md` (sostituito per intero, 249 parole) ·
`docs/roadmap/ROADMAP-UFFICIALE.md` (nuova riga in testa, voce 47, oltre alle voci P27/P28 e alla
correzione della voce P7 nel corpo). D152 e D153 erano **già a verbale** in
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (modifica non committata, presente
prima dell'inizio di questo task — verificato con `git diff`, contiene solo l'aggiunta di D152/D153 e
l'aggiornamento del conteggio in testa a 153/54): non ho dovuto scriverle, solo verificarle e
includerle nel commit.

### FASE 7 — le tre verifiche, separate, output reale

```
$ npx tsc --noEmit
(nessun output — exit code 0)
```

```
$ npx vitest run
 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

Not implemented: navigation to another Document

 Test Files  375 passed | 3 skipped (378)
      Tests  4382 passed | 19 skipped (4401)
   Start at  17:11:09
   Duration  32.32s (transform 11.29s, setup 85.41s, import 40.10s, tests 92.27s, environment 216.49s)
```
`4382 | 19` — esattamente l'atteso (4380 di partenza + 2, dal Task 2).
La riga `Not implemented: navigation to another Document` è un warning noto di jsdom, non un
fallimento (0 file falliti, 0 test falliti).

```
$ npx next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 3.1s
  Running TypeScript ...
  Finished TypeScript in 9.9s ...
  Collecting page data using 15 workers ...
✓ Generating static pages using 15 workers (81/81) in 150ms
  Finalizing page optimization ...
(exit code 0, 81 rotte, nessun errore)
```

**Guardia coerenza documenti (di nuovo, dopo tutte le modifiche):**
```
$ node scripts/guardia-coerenza-documenti.mjs
=== Guardia coerenza documenti — 4 documenti vivi controllati ===
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
```

🛑 **Nota trovata e corretta in corsa:** la prima stesura di `memory/SESSION_ACTIVE.md` metteva un
backtick col nome del ramo (`` `p7-registro-dpa-cancello-traccia` ``) subito dopo la frase «PUNTO DI
RIPRESA», e la guardia l'ha letto come SE il punto di ripresa fosse quel nome di ramo (non un file) —
falso positivo del controllo 4, causato dalla mia formattazione, non un difetto della guardia.
Corretto mettendo il vero percorso (`docs/superpowers/specs/…-design.md`) come primo elemento fra
backtick dopo la frase.

---

## Difetti del piano/brief trovati eseguendo (④ del mandato) — nessuno grave

Nessun comando del brief si è rivelato non eseguibile come scritto, a parte quanto già segnalato nel
Task 3 (T4/F1, D153). L'unica cosa che il brief NON copriva esplicitamente e che ho dovuto decidere da
solo: **come premere il tasto vero senza usare `uachelab.com`**, dato che il brief dice «rotta vera
`GET /api/clienti/[id]/dpa`» e «accesso in produzione», ma il codice che scrive `emesso_da` non è
ancora su `origin/main`. Ho verificato il fatto (`git show origin/main:…` → 0 occorrenze) PRIMA di
scegliere la deviazione, l'ho dichiarata esplicitamente nel referto e in roadmap/memoria, e non ho
proceduto senza prima confermarlo. Non lo classifico come un sesto difetto del piano nello stesso
senso degli altri cinque (quelli erano verificabili leggendo il testo del piano prima di eseguirlo;
questo dipende dallo stato del branch `main` al momento dell'esecuzione, che cambia nel tempo) — ma
va segnalato perché un futuro esecutore che rilegga questo brief dopo il merge su `main` non incontrerà
più il problema, e uno che lo rilegga PRIMA del merge sì.

---

## File toccati in questo task

- `docs/roadmap/2026-08-04-p7-referto-prove.md` — §10 nuova (chiusura T3), più annotazioni `🔄` su
  §5, header T3, §9.
- `docs/roadmap/ROADMAP-UFFICIALE.md` — riga di testa nuova (voce 47) · righe P27, P28 · correzione
  P7 (paragrafo in coda alla voce esistente) · correzioni FASE 1 ③, righe "le voci P" e "controllo
  incrociato".
- `docs/superpowers/specs/2026-08-04-p7-registro-dpa-cancello-traccia-design.md` — testa (Stato).
- `docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md` — riga A7 del registro
  delle assunzioni.
- `memory/MEMORY.md` — riga di testa nuova (voce 120).
- `memory/SESSION_ACTIVE.md` — sostituito per intero.
- `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — modifica pre-esistente
  (D152/D153), non mia, inclusa nel commit perché non ancora salvata.

**Scrittura in banca dati:** una sola, autorizzata (D152) — l'emissione vera di `DPA-2026-0003` per
BARALE S.A.S., laboratorio Filippo Opromolla. Riga permanente, lasciata così per scelta esplicita di
Francesco. Nessun'altra scrittura: tutte le altre query di questo task sono `read_only:true`.

**Nessun `git add -A` usato.** Nessun merge, nessun push.

---

## Correzioni post-revisione finale

**Ramo:** stesso, `p7-registro-dpa-cancello-traccia`. **Innesco:** tre note della revisione finale
di questo task (R1, M1, M3) — tutte di commento/testo dichiarate dal mandato, nessun cambiamento di
comportamento.

### R1 — `supabase/schema.sql`: il trigger invoca una funzione non definita nel file

`_audit_data_processing_agreements` (ora riga **2951**) invoca `_audit_trigger_fn()`, e quella
funzione NON è definita in `schema.sql`: vive in
`supabase/migrations/20260517000002_fix_audit_trigger_jsonb.sql` (letta: contiene la
`CREATE OR REPLACE FUNCTION _audit_trigger_fn()`).

🔑 **La tabella `audit_log` è un difetto ancora più profondo — trovato correggendo la mia stessa
prima stesura, su segnalazione dell'advisor.** La prima versione del commento indicava la stessa
migration anche per la tabella `audit_log`; falso. `provato:` `grep -rn "CREATE TABLE.*audit_log"
supabase/migrations/` → **zero righe in tutto il repository**. La migration `20260517000002` fa
solo `INSERT INTO audit_log`; `20260704160000_security_hardening_rls_tables.sql` fa solo
`ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY`. Nessuna delle due la crea. La tabella
esiste **solo nel database vivo**, non riproducibile applicando ogni migration del repo in ordine
da zero — più grave della sola omissione dei dieci trigger che P27 descriveva prima di oggi.

**Fatto:** commento aggiunto accanto al trigger (`schema.sql:2943-2950`) con entrambe le
precisazioni (funzione → dove vive davvero; tabella → non esiste in nessuna migration) e la frase
che il file non è più eseguibile da zero. Stessa correzione aggiunta alla voce **P27** di
`docs/roadmap/ROADMAP-UFFICIALE.md`, inclusa la cella di riferimento (`schema.sql:2940` era già
stale per le righe aggiunte sopra dagli edit stessi → aggiornata a `schema.sql:2951`, il numero
vero dopo tutte le modifiche).

### M1 — `supabase/schema.sql`: il commento «sette campi» sopra un CHECK che oggi ne vincola 7 su 8

`emesso_da` (aggiunto da questo stesso ramo) è l'ottavo campo di emissione e resta FUORI dal CHECK
`dpa_emissione_coerente` di proposito: le righe DPA nate prima del 04/08/2026 non hanno un «chi» e
riempirlo all'indietro significherebbe inventare una prova. Il vecchio commento («i sette campi
viaggiano tutti insieme o nessuno») non descriveva più il blocco sotto di lui, che oggi ha otto
campi. Riscritto (`schema.sql:2874-2877`): il CHECK vincola sette DEGLI OTTO campi di emissione,
l'ottavo (`emesso_da`) è deliberatamente escluso, con la ragione in una riga.

### M3 — apostrofi ASCII al posto delle vocali accentate, nei commenti aggiunti da questo ramo

Cercati con un grep mirato sulle parole italiane più comuni che finiscono in vocale accentata
(`e' puo' perche' cioe' gia' cosi' pero' piu'`, lookahead negativo per non toccare le elisioni
legittime `l' c' un' dell'…`), e confermati contro `git diff main...p7-registro-dpa-cancello-traccia`
per correggere solo testo aggiunto da questo ramo:

- `src/lib/pdf/generate-dpa.ts:92-94` — 3 correzioni (`e'`→`è` ×2, `puo'`→`può` ×1) nel commento
  JSDoc del parametro `emesso_da`.
- `tests/unit/dpa-registro.test.ts` — 8 correzioni: righe **463, 467** (nel mandato) più righe
  **712 (`gia'`→`già`), 716 (`Perche'`→`Perché`), 717, 718, 719**. 🔑 **717 (`cioe'`→`cioè`) e 719
  (`e'`→`è`) NON erano nell'elenco del mandato** e sono stati trovati dal grep, come richiesto
  («cercali tu con un grep invece di fidarti di questo elenco»).
- `docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md` — è la FONTE, stessa
  correzione righe **289, 293, 299, 303-306, 353-355** (i due blocchi copiati verbatim nel Task 2:
  il test e la firma di `generateDpa`). **Confermato via `git diff` che le 24 occorrenze nel blocco
  SQL del Task 1 (righe 92-267) sono testo che cita le convenzioni SQL del progetto — NON toccate**,
  per rispettare sia «non toccare gli accenti nei file di migration SQL» (quelle citazioni
  rispecchiano `supabase/schema.sql` e la migration, dove l'ASCII è una scelta consapevole) sia «non
  toccare testo non aggiunto da questo ramo».

**Sweep di conferma, oltre l'elenco del mandato:** grep esteso a un set più ampio di parole italiane
in -à/-ì/-ò/-ù (`sara' potra' dovra' fara' andra' verra' citta' universita' qualita' realta'
necessita' meta' …`) sui tre file coinvolti → **zero ulteriori hit**. Grep generico
`[a-zA-Z]+'(?!\w)` (ogni parola finale in apostrofo, per non fidarsi del solo elenco lessicale) sugli
stessi file → gli unici match residui sono chiusure di stringa letterale (`'utente-007'`,
`'DIVERSO'`) o elisioni legittime (`l'`, `un'`) — nessun altro apostrofo-per-accento rimasto.
`supabase/schema.sql` conserva i suoi `puo'`/`e'` pre-esistenti (righe 2941-2942) intatti, per la
stessa regola.

### Verifiche rieseguite (FASE 7, output reale, dopo tutte le correzioni)

```
$ npx tsc --noEmit
(exit 0, nessun errore)

$ npx vitest run tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts tests/unit/dpa-route.test.ts
 Test Files  3 passed (3)
      Tests  79 passed (79)

$ node scripts/guardia-coerenza-documenti.mjs
=== Guardia coerenza documenti — 4 documenti vivi controllati ===
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
```

Anche `node scripts/guardia-coerenza-documenti.mjs --staged` (sui 5 file di questa correzione,
prima del commit) → stesso verde: nessun avviso "tocchi la roadmap senza toccare la memoria",
coerente col fatto che questa correzione non introduce una nuova decisione (§0A-bis non si applica).

### File toccati in questa correzione

- `supabase/schema.sql` — commento M1 (righe 2874-2877) + commento R1 (righe 2943-2950).
- `docs/roadmap/ROADMAP-UFFICIALE.md` — voce P27, paragrafo aggiunto + cella di riferimento riga
  corretta.
- `src/lib/pdf/generate-dpa.ts` — 3 correzioni di accento, righe 92-94.
- `tests/unit/dpa-registro.test.ts` — 8 correzioni di accento, righe 463-467 e 712-719.
- `docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md` — stesse 8 correzioni
  nella FONTE (Task 2), righe 289-306 e 353-355.

**Nessun `git add -A` usato** — 5 file elencati esplicitamente. **Nessuna migration eseguita,
nessuna lettura né scrittura sul database.** Nessun merge, nessun push.
