# Referto operativo — Task 3: le prove di comportamento sul database vivo

Ramo: `p7-registro-dpa-cancello-traccia`. Brief: `.superpowers/sdd/task-3-brief.md`.
Deliverable ufficiale (committato): `docs/roadmap/2026-08-04-p7-referto-prove.md`.
Questo file è il dettaglio operativo per chi eredita il ramo (Task 4), NON è versionato.

## 0. Lettura preliminare (BP-0) e ricognizione

Letti per intero: `task-3-brief.md`, sezione Task 3 del piano (righe 407-486), `task-1-report.md`,
`task-2-report.md`. Fatta una ricognizione a strati, tutta `read_only:true`, PRIMA di scrivere una
riga di script di prova (dettaglio comandi in `/private/tmp/.../p7-ricognizione{1..8}.mjs`, session
scratchpad, non nel repo):

1. Quale lab ha DPA reali → solo Filippo (`971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c`), 2 righe, entrambe
   `emesso_da IS NULL`.
2. Utenti per lab (per l'impersonazione di T1).
3. Stato vivo della regola `dpa_laboratorio` → `polcmd='r'`, `ha_with_check=false` — combacia col
   Task 1.
4. Corpo di `current_lab_id()` e di `auth.uid()` → per costruire correttamente
   `SET LOCAL request.jwt.claims`.
5. Corpo COMPLETO di `admin_delete_laboratorio()` → **letto per intero prima di usarlo**, non solo
   "esiste": ha confermato l'ordine DPA (riga ~155) prima di utenti (riga ~163) dichiarato dal
   Task 1, ma questa lettura completa è anche quella che ha permesso di riconoscere l'errore di T4
   come "non è quello che stiamo cercando" invece di scambiarlo per un fallimento della prova.
6. Grants/RLS di `audit_log` e `prosecdef` di `_audit_trigger_fn` (SECURITY DEFINER) — **fatto
   PRIMA di scrivere T1(a)**, su suggerimento esplicito dell'advisor, perché altrimenti un `INSERT`
   di servizio nel registro delle modifiche durante il controllo positivo avrebbe potuto fallire per
   un motivo estraneo (grant mancante) e sembrare "il controllo positivo non funziona".
7. Colonne, CHECK e indici UNIQUE di `data_processing_agreements` — necessario per costruire un
   `INSERT` di T2 che rispetti `dpa_emissione_coerente`, `dpa_impronte_esadecimali`,
   `dpa_percorso_nel_proprio_laboratorio`, `dpa_emissione_numero_unico`,
   `dpa_emissione_viva_unica` senza tentativi a vuoto.

## 1. Consultazione advisor PRIMA di scrivere lo script (obbligatoria: task ad alto rischio)

Ho chiamato l'advisor dopo la ricognizione e PRIMA di scrivere `p7-prove-comportamento.mjs`. Punti
bloccanti segnalati e applicati:

1. **T3 non va ripiegata su un INSERT sintetico spacciato per "prova".** L'assertion di T3
   («`emesso_da` uguale all'utente che ha premuto») richiede un evento REALE; un UUID scelto da me
   in un INSERT sintetico non lo è strutturalmente. → Eseguita T3 **letterale**, in sola lettura, sul
   dato vivo; dichiarata non soddisfatta con motivo; l'INSERT sintetico di T2 rietichettato
   esplicitamente come "proxy di comportamento", MAI come T3.
2. **Precondizione di T1(a) da controllare PRIMA**, non dopo un fallimento: `prosecdef` di
   `_audit_trigger_fn` + privilegi/RLS di `audit_log`. Fatto (§0.6): SECURITY DEFINER, quindi
   l'`INSERT` in `audit_log` riesce sotto qualunque ruolo chiamante.
3. **T4 va fatta sul lab Filippo (non su un lab più leggero)**: su un lab senza DPA reali
   l'`UPDATE... WHERE laboratorio_id=<lab>` del brief toccherebbe 0 righe e la FK non verrebbe mai
   esercitata — un test vuoto, esattamente il rischio che il brief segnala. Da fare **per ultima** fra
   le prove che scrivono.
4. **T5**: la FK non è deferrable (verificato prima), quindi l'errore 23503 deve emergere
   sull'`UPDATE`, non a fine transazione — se fosse emerso silenzio o successo, sarebbe stato un
   ritrovamento, non un verde.
5. **Meccanica**: `audit_log.changed_at` (non `created_at`), `row_id` è `TEXT` (confronto con
   `::text`), ogni prova impersonata con `read_only:false` (altrimenti la connessione gira come
   `supabase_read_only_user` e i numeri sono sbagliati per il motivo sbagliato), T1(a) e T1(b) come
   DUE chiamate HTTP separate (altrimenti l'API restituisce solo l'ultimo result-set e il controllo
   positivo sparisce — scoperta empirica fatta in ricognizione, non anticipata dal brief), mai
   `COMMIT` da nessuna parte (grep sulle righe non-commento del file finito), dichiarare l'avanzamento
   della sequenza `audit_log.id` come residuo non annullabile ma innocuo.

Ho seguito tutti e cinque i punti alla lettera; nessun conflitto fra advisor e prove empiriche
successive (a differenza di quanto capitato in altri task del progetto, qui l'advisor ha anticipato
correttamente sia il problema di T3 sia la struttura corretta di T1).

## 2. Scoperta tecnica non anticipata dal brief: multi-statement e result-set

`SELECT 1 AS uno; SELECT 2 AS due;` in un'unica chiamata alla Management API restituisce **solo**
`{"due":2}` — solo l'ultima istruzione che produce righe. Conseguenza: ogni prova che deve mostrare
più numeri insieme (T1: righe lette + righe toccate; T2: prima/dopo dell'audit + contenuto della riga;
T4: righe aggiornate + risultato della funzione) li unisce in **una SELECT finale con CTE**, oppure
usa un blocco `DO $$...$$` che scrive in una tabella temporanea letta come ultima istruzione. Senza
questo accorgimento, metà dei numeri richiesti dal brief per ciascuna prova sarebbe andata persa (non
un errore — un `null`/risultato incompleto silenzioso, il tipo di difetto peggiore).

## 3. Esecuzione — T1, T2, T3, T5 (in quest'ordine, poi T4 per ultima)

Vedi `docs/roadmap/2026-08-04-p7-referto-prove.md` per l'output incollato per intero. Riassunto
tecnico più fine qui:

- **T1(a)** controllo positivo: `DROP POLICY`/`CREATE POLICY FOR ALL` dentro la stessa transazione
  annullata, PRIMA di `SET LOCAL ROLE authenticated` (la DDL richiede privilegi che il ruolo
  impersonato non ha) → 2 righe toccate.
- **T1(b)**: nessuna DDL (la regola viva è già quella nuova), stessa identità impersonata → 2 righe
  lette, 0 toccate.
- **T1 post-hoc**: riletto lo stato della policy in produzione DOPO le due prove, per certificare che
  il `DROP`/`CREATE` di (a) non sia sopravvissuto.
- **T2**: `DO $$...$$` con variabili locali (`v_prima`, `v_dopo`, `v_id`, `v_op`, `v_new_data_ok`),
  scritte in una TEMP TABLE letta come istruzione finale. `INSERT` con `dentista_id` = un cliente
  reale del lab Filippo (`76115a50-...`), `progressivo_dpa=9999` per evitare collisione con
  l'indice UNIQUE `dpa_emissione_numero_unico` (righe reali a progressivo 1 e 2).
- **T3**: query letterale, sola lettura, **nessuna scrittura in questo step** — 0 righe, come
  previsto dall'advisor e dalla ricognizione preliminare.
- **T5**: `UPDATE ... SET emesso_da = gen_random_uuid()` senza `WHERE` (letterale dal brief, tocca
  anche righe di altri lab — tutti dati di test, e comunque abortisce all'istante). Errore 23503
  ricevuto come risposta HTTP 400 dalla Management API (non un HTTP 201 con corpo d'errore — nota per
  chi debug in futuro: un errore SQL sulla Management API si vede dallo status HTTP, non dal corpo).

## 4. T4 — la sorpresa, e come l'ho verificata prima di scriverla nel referto

Prima esecuzione (letterale, lab Filippo): HTTP 400, 23503 ma su
`data_processing_agreements_dentista_id_fkey` durante `DELETE FROM clienti` (riga 37 della
funzione), non sulla FK `emesso_da`. Ho **resistito alla tentazione di scrivere "T4 fallita" e
basta**: ho fermato, riletto il corpo completo della funzione (già fatto in ricognizione, §0.5), e
notato che `clienti` viene cancellata MOLTO prima di `data_processing_agreements` — un ordine
diverso da quello (DPA-poi-utenti) che T1 del Task 1 dichiara "portante".

Due verifiche fatte PRIMA di scrivere qualunque conclusione nel referto (non assunte):

1. **È un effetto di questo piano, o preesiste?** Rifatto lo stesso identico `SELECT
   admin_delete_laboratorio(...)` **senza toccare `emesso_da`** (`p7-t4-followup.mjs`, Follow-up A):
   stesso identico errore, stessa riga 37. **Preesistente, indipendente da P7.**
2. **La claim originaria di T4 (DPA-prima-di-utenti protegge `emesso_da`) è falsa, o solo
   irraggiungibile per un motivo diverso?** Primo tentativo di isolarla a mano (Follow-up B: solo
   `DELETE FROM data_processing_agreements` + `DELETE FROM utenti`, saltando le altre ~38 istruzioni
   della funzione reale) → un ALTRO errore (`lavori.segnalazione_by_fkey`), perché il lab Filippo ha
   287 `lavori` che referenziano `utenti` e che il mio sottoinsieme scritto a mano non cancellava.
   **Errore mio, non del piano**: un sottoinsieme scritto a mano della funzione non è la funzione.
   Corretto usando **la funzione reale e completa**, su un lab (Pepe, `314cd040-...`) che non ha
   `lavori` né DPA reali oggi, con un `INSERT` sintetico minimale (`tipo_controparte='sub_responsabile'`,
   `dentista_id=NULL` per evitare sia la CHECK di emissione sia il bug di F1, ma `emesso_da` riempito
   per davvero) → **`ok:true`, arrivata in fondo**, `data_processing_agreements:1`, `utenti:1`,
   `laboratori:1` cancellati. La claim regge, isolatamente.

Questa sequenza (fermarsi, verificare l'ipotesi "è mio o del sistema" con un test mirato, poi
correggere il proprio metodo quando il primo tentativo di isolamento fallisce per un motivo diverso
da quello cercato) è esattamente il tipo di rigore che il mandato (R-E1/R-E2, "cercare dove il piano
sbaglia") chiede — e ha prodotto un ritrovamento reale (F1) che altrimenti sarebbe rimasto invisibile
finché qualcuno non avesse provato a cancellare un laboratorio con una DPA vera in produzione.

## 5. T3 — non un difetto di piano nello stesso senso dei 5 precedenti, ma un esito da riportare

Dopo un giro dell'advisor ho tolto l'etichetta iniziale "difetto #6 del piano" per T3: i 5 difetti
già trovati dai due esecutori precedenti erano tutti verificabili al momento in cui il piano è stato
SCRITTO (un numero di riga, un grep che non può dare 0, un conteggio di asserzioni). Il caso di T3 è
diverso: il brief è stato scritto PRIMA che il Task 2 girasse, e solo il Task 2 (referto, §4) rivela
che il ramo di riuso non scrive `emesso_da` e che nessuna emissione nuova è mai stata generata. Non è
un errore nel testo del brief — è un fatto sul mondo che cambia dopo che il brief è stato scritto.
Resta comunque un esito diverso da quello atteso, riportato come tale nel referto ufficiale (§T3),
senza forzarlo con una scrittura permanente (fuori dalla mia autorizzazione D151, che vale solo per
scritture chiuse in `ROLLBACK`): decisione lasciata a Francesco.

Nessun altro difetto trovato nel testo del brief stesso (la sequenza T1→T2→T3→T4→T5, i valori attesi
di T1/T2/T5, e i riferimenti SQL sono tutti risultati accurati alla verifica).

## 6. Ritrovamenti FUORI mandato (R-E2)

**F1 🔴 reale, di codice, indipendente da P7**: `admin_delete_laboratorio()` cancella `clienti` (riga
37) prima di `data_processing_agreements` (riga ~155), ma `data_processing_agreements.dentista_id →
clienti(id)` è NO ACTION. **Misurato** (non ipotizzato): oggi solo il laboratorio Filippo ha righe DPA
con `dentista_id` valorizzato (`SELECT laboratorio_id, count(*) ... GROUP BY laboratorio_id` → una
sola riga, Filippo, 2). L'estensione a "ogni laboratorio futuro" è un'**inferenza dal vincolo**
`dpa_emissione_coerente` (ogni DPA emessa per davvero ha `dentista_id` obbligatoriamente valorizzato),
dichiarata come inferenza e non come misura. Verificato che il bug è indipendente da `emesso_da`
(Follow-up A). Non corretto: fuori mandato, e toccare l'ordine di ~40 `DELETE` in una funzione che
gestisce la cancellazione di un intero laboratorio merita lo stesso rigore di una migration di schema,
non una riga di questo referto. Segnalato per decisione di Francesco nella §9 del referto ufficiale.

**F2 🟡 metodologico**: il mio primo tentativo di isolare la claim di T4 (Follow-up B, sottoinsieme
scritto a mano di due sole `DELETE`) era sbagliato — non per il piano, per un mio errore di modellazione
(dimenticavo che il lab Filippo ha 287 `lavori` che referenziano `utenti`). Corretto usando la
funzione reale su un lab senza quella dipendenza (Follow-up C). Documentato per trasparenza, non
perché sia un difetto altrui.

## 7. File

- `scripts/tmp/p7-prove-comportamento.mjs` — script principale (T1-T5 + step 0)
- `scripts/tmp/p7-t4-followup.mjs` — Follow-up A (bug indipendente da emesso_da) + B (fallito, errore
  mio di modellazione, lasciato nello script per trasparenza — non cancellato/riscritto a posteriori)
- `scripts/tmp/p7-t4-followup-c.mjs` — Follow-up C (claim isolata, confermata)
- Tutti e tre `scripts/tmp/` (gitignored, non committati)
- `docs/roadmap/2026-08-04-p7-referto-prove.md` — referto ufficiale, **committato** (`ad096afc`)

## 8. BP-1 (memoria/roadmap)

**Non eseguito deliberatamente**, come per il Task 2: P7 ha un Task 4 dopo questo che copre FASE 7 +
BP-1 + merge. Un aggiornamento di `memory/MEMORY.md`/`ROADMAP-UFFICIALE.md` a metà piano rischierebbe
di essere riscritto o disallineato quando il piano chiude. **Segnalo però che il Task 4 deve sapere
di F1** (il bug reale su `admin_delete_laboratorio`) per poterlo eventualmente registrare in memoria
come rischio aperto, anche se non è nel suo mandato risolverlo.

## 9. Stato

`DONE_WITH_CONCERNS` — 4 prove su 5 pienamente confermate (T1 a due bracci, T2 con rafforzamento
`new_data` a 23 chiavi, T5), T3 eseguita ma non chiudibile oggi sul dato vivo (motivo dichiarato, §5),
T4 letterale bloccata da un bug reale e indipendente (F1, misurato su un solo laboratorio oggi, con
claim di fondo comunque isolata e confermata in F2/Follow-up C). Nessuna riga del database è rimasta
modificata. Commit `ad096afc` (+ eventuale commit di rifinitura post-advisor, v. referto ufficiale).
Guardie pre-commit tutte verdi.
