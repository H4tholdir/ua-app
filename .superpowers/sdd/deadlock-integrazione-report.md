# Il deadlock intermittente delle prove d'integrazione — diagnosi e chiusura

**Data:** 09/08/2026 · **Ramo:** `intervento-post-consegna` · **File riparato:** `tests/integration/torna-a-pronto.rpc.test.ts`

| cosa | esito |
|---|---|
| Difetto | **nella PROVA**, non nel codice di produzione |
| Colpevole | `torna-a-pronto.rpc.test.ts` — `CREATE TRIGGER … ON public.lavori` chiesto **dopo** aver già scritto righe |
| Vittime | `riapri-lavoro-atomica` (4) e `riemetti-ddc-atomica` (3) — **mai il colpevole** |
| Prima | **5 giri rossi su 10**, 7 prove cadute — il mandato diceva «1 su 10» |
| Dopo | **0 giri rossi su 10**, 84/84 dieci volte su dieci |
| FASE 7 | 5725 passate \| 84 saltate su 458 file · `VERIFY_EXIT=0` — **base invariata** |
| 🛑 Fuori mandato | `trg_refresh_dashboard` su `lavori` — **riferito, non corretto** (R-E2), §⑤ |

---

## ① Quante volte, su quanti giri

Stesso comando, stesse condizioni (sonda sui lucchetti attaccata in entrambe le serie), dieci giri per serie:

```
cd "…/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration
```

| | giri rossi | prove cadute | quali |
|---|---|---|---|
| **prima** | **5 su 10** (giri 2, 5, 6, 9, 10) | **7** | `riapri-lavoro-atomica` ×4 · `riemetti-ddc-atomica` ×3 |
| **dopo** | **0 su 10** | **0** | — `Tests 84 passed (84)` dieci volte |

🔴 **Il mandato diceva «circa 1 giro su 10». È cinque volte tanto.** La cifra di partenza veniva dal referto del TD04, che aveva visto un fallimento in dieci giri; con dieci giri nuovi e la sonda accesa il difetto compare una volta ogni due. Non è una divergenza da spiegare con la fortuna: **un difetto che si presenta una volta su due non ha bisogno di essere «cercato», ha bisogno di essere guardato una seconda volta.**

**Due controlli in più, perché «zero rossi» da solo non basta.**

*La prova che serializza non è diventata lenta* — è l'unico modo in cui questa riparazione poteva tornare rossa da un'altra porta (un timeout invece di un deadlock: stesso rosso, messaggio che non nomina nessun lucchetto). Durata della prova della sonda, dieci giri per serie, in millisecondi:

```
prima:  906  918  954 1071 1120 1922 1926 2014 2299 2429      (peggiore 2429)
dopo:   898  917  926  931  953  978 1055 1071 1074 1119      (peggiore 1119)
```

**È diventata più veloce e più regolare**, non più lenta: il limite di vitest è 5000 ms e il caso peggiore è sceso a meno di un quarto. Nessun `testTimeout` aggiunto, nessuna configurazione toccata.

*La suite intera non è rallentata:*

```
prima:  16,09 → 19,71 s
dopo:   16,20 → 18,87 s
```

---

## ② Il rapporto di deadlock di Postgres, incollato

Dal giro 2 della serie «prima» (`scripts/tmp/giri/prima-2.log`). Codice `40P01`:

```
error: deadlock detected

detail:
  Process 3175207 waits for ShareLock on transaction 89955; blocked by process 3175209.
  Process 3175209 waits for ShareRowExclusiveLock on relation 20422 of database 5; blocked by process 3175207.

where:
  while inserting index tuple (3,2) in relation "dashboard_kpi_cache"
  SQL statement "INSERT INTO dashboard_kpi_cache ( … ) SELECT … FROM lavori
                 WHERE laboratorio_id = p_lab_id AND deleted_at IS NULL
                 ON CONFLICT (laboratorio_id) DO UPDATE SET …"
  PL/pgSQL function refresh_dashboard_cache(uuid) line 51 at SQL statement
  SQL statement "SELECT refresh_dashboard_cache(COALESCE(NEW.laboratorio_id, OLD.laboratorio_id))"
  PL/pgSQL function trg_refresh_dashboard() line 3 at PERFORM
```

**Chi è `relation 20422`, misurato e non dedotto:**

```
provato:  node scripts/psql.mjs -c "SELECT 20422::regclass"
   →  [ { r: 'lavori', dbid: 5 } ]
```

🔑 **È un lucchetto sulla TABELLA `lavori`, non su una riga.** È il fatto che rende la diagnosi diversa da tutte le ipotesi di partenza, ed è anche il motivo per cui un censimento delle *righe* condivise non poteva trovarlo.

**Le due righe contese, quindi, sono di due specie diverse:**

| chi | tiene | aspetta |
|---|---|---|
| **P1** = 3175207 (`riapri-lavoro-atomica`) | `ROW EXCLUSIVE` sulla **tabella** `lavori` (dal suo `INSERT`) | la **riga** `dashboard_kpi_cache[LAB_A]`, tenuta dalla transazione 89955 di P2 |
| **P2** = 3175209 (`torna-a-pronto`, la sonda) | la **riga** `dashboard_kpi_cache[LAB_A]` (dal suo `INSERT` di poco prima) | `SHARE ROW EXCLUSIVE` sulla **tabella** `lavori`, per il `CREATE TRIGGER` |

**Gli altri quattro giri rossi hanno la forma identica** — stessi due lucchetti, stessa `relation 20422`, stesso `index tuple (3,2)`:

```
giro  5: Process 3175210 waits for ShareLock on transaction 90213; blocked by process 3175207.
         Process 3175207 waits for ShareRowExclusiveLock on relation 20422 of database 5; blocked by process 3175210.
         Process 3175212 waits for ShareLock on transaction 90213; blocked by process 3175207.  (+1)
giro  6: Process 3175210 waits for ShareLock on transaction 90307; blocked by process 3175209.
         Process 3175209 waits for ShareRowExclusiveLock on relation 20422 of database 5; blocked by process 3175210.  (+1)
giro  9: Process 3175209 waits for ShareLock on transaction 90575; blocked by process 3175213.
         Process 3175213 waits for ShareRowExclusiveLock on relation 20422 of database 5; blocked by process 3175209.
giro 10: Process 3175213 waits for ShareLock on transaction 90663; blocked by process 3175205.
         Process 3175205 waits for ShareRowExclusiveLock on relation 20422 of database 5; blocked by process 3175213.
```

**7 su 7.** Nessun deadlock di forma diversa: una sola causa, non una famiglia.

**E la sonda sui lucchetti coglie il colpevole in flagrante**, mentre è ancora in attesa (`scripts/tmp/monitor-prima.log`, sonda su `pg_locks` + `pg_blocking_pids()` ogni 150 ms):

```
2026-08-09T10:39:18.632Z
IN ATTESA  pid=3175209  Lock/relation
  query    : CREATE FUNCTION pg_temp.sonda_blocca_pronto() … CREATE TRIGGER zz_sonda_blocca_pronto
             BEFORE UPDATE ON public.lavori …
  lucchetti: relation:lavori(-,-) ShareRowExclusiveLock granted=false
  bloccato da: [3175207]
  BLOCCANTE pid=3175207  INSERT INTO lavori ( id, laboratorio_id, numero_lavoro, … )

2026-08-09T10:39:19.839Z
IN ATTESA  pid=3175209  Lock/relation
  query    : DROP TRIGGER zz_sonda_blocca_pronto ON public.lavori
  lucchetti: relation:lavori(-,-) AccessExclusiveLock granted=false
```

---

## ③ La causa, provata

**Due lucchetti presi in ordine opposto — la definizione stessa di deadlock, e il mandato lo diceva.** Quello che il mandato non poteva sapere è che uno dei due non è una riga.

**L'ordine di tutti (sei file su sette):**
1. `INSERT INTO lavori` → `ROW EXCLUSIVE` sulla **tabella** `lavori`;
2. il trigger `trg_dashboard_lavori` → `trg_refresh_dashboard()` → `refresh_dashboard_cache(lab)` → `INSERT … ON CONFLICT (laboratorio_id) DO UPDATE` sull'**unica riga** `dashboard_kpi_cache[LAB_A]`.

Sempre **tabella, poi riga**. Fra loro non possono incrociarsi: chi tiene la riga della cache tiene già il lucchetto sulla tabella, quindi non tornerà mai ad aspettarlo. **Per questo la suite non è mai andata in deadlock prima che questa prova nascesse.**

**L'ordine della sonda (un file, una prova):** faceva prima gli inserimenti — quindi prendeva **la riga della cache** — e *solo dopo* chiedeva `CREATE TRIGGER … ON public.lavori`, cioè **il lucchetto sulla tabella**. Riga, poi tabella. **L'ordine opposto.** Chiuso il cerchio, Postgres taglia — e taglia sempre l'altro.

**Perché la riga della cache è una sola, ed è di tutti** (`refresh_dashboard_cache`, letta dal catalogo vivo con `pg_get_functiondef`, non dai file): la funzione ricalcola i KPI del laboratorio e li scrive con `ON CONFLICT (laboratorio_id) DO UPDATE`, cioè **una riga per laboratorio**. Tutti e sette i file d'integrazione usano lo stesso `LAB_A = 00000000-…-0001`, quindi **tutte le transazioni di prova si danno appuntamento su quella riga**. È l'`index tuple (3,2)` del rapporto.

**Perché è deterministico e non fortuito:**
`CREATE TRIGGER` chiede `SHARE ROW EXCLUSIVE`, che urta il `ROW EXCLUSIVE` di **qualunque** scrittura su `lavori`. Con sette file in parallelo e la sonda che chiede il lucchetto a metà transazione, la coincidenza serve solo per il *momento*, non per l'*esito*: 5 volte su 10.

**Le due premesse del mandato, verificate invece che credute:**
- ① `withRollback` tiene davvero una transazione aperta per tutta la prova — `tests/integration/helpers/pg-client.ts:23-26`: `BEGIN` in testa, `ROLLBACK` in un `finally`. ✅
- ② vitest gira davvero i file in parallelo — `vitest.config.ts` non dichiara né `fileParallelism` né `pool`, quindi vale il default; e la sonda ha visto **sette backend distinti vivi insieme** (pid 3175205, 3175207-3175213). ✅

---

## ④ Il rimedio, e perché chiude la causa invece di nasconderla

🛑 **Nessun rinvio con ripetizione, nessuna serializzazione della suite.** Un `retry` avrebbe reso verde lo stesso schermo lasciando in casa l'incrocio; `--no-file-parallelism` avrebbe spento il difetto spegnendo il parallelismo — e, come già osservato dall'esecutore del TD04, in CI avrebbe serializzato anche i 451 file unitari.

**Si è tolta la causa: l'ordine opposto.** La cura di manuale per un incrocio di lucchetti è **un ordine solo per tutti**, e qui si ottiene con una riga.

```ts
await withRollback(async (client) => {
  // PRIMA di ogni altra cosa
  await client.query(`LOCK TABLE public.lavori IN SHARE ROW EXCLUSIVE MODE`)
  …
```

**Perché questo chiude il cerchio, e non è un'opinione.**
1. `withRollback` apre **una connessione nuova** per ogni prova: quando questa istruzione parte, la transazione **non tiene ancora niente**. Una transazione che aspetta **a mani vuote** non può essere il secondo anello di un cerchio — può solo essere in coda.
2. È **esattamente il modo** (`SHARE ROW EXCLUSIVE`) che `CREATE TRIGGER` chiederà più giù: tenendolo già, quel passo non torna mai ad aspettare.
3. Ottenuto il lucchetto, **nessun altro può tenere la riga `dashboard_kpi_cache[LAB_A]`**: quella riga si prende solo scrivendo `lavori`, cosa che richiede `ROW EXCLUSIVE`, che `SHARE ROW EXCLUSIVE` esclude. Il resto della transazione non aspetta più nessuno.
4. Non blocca chi legge: `SHARE ROW EXCLUSIVE` non urta `ACCESS SHARE`.

**E si è tolto il `DROP TRIGGER` finale**, che era l'**unico** a chiedere `ACCESS EXCLUSIVE` sull'intera tabella — e non serviva a niente: il DDL in Postgres è transazionale, quindi il `ROLLBACK` di `withRollback` porta via da sé sia il trigger sia la funzione temporanea.

**La conferma indipendente dal conteggio delle prove** — la sonda sui lucchetti, stesse condizioni nelle due serie:

| attesa osservata su `lavori` | prima | dopo |
|---|---|---|
| `AccessExclusiveLock` | **3** (tutte e tre: `DROP TRIGGER …`) | **0** |
| `ShareRowExclusiveLock` | 4 (da `CREATE TRIGGER`, **a metà transazione**) | 2 (da `LOCK TABLE`, **a mani vuote**) |

Le due attese rimaste hanno la forma giusta e sono innocue:

```
IN ATTESA  pid=3175955  query: LOCK TABLE public.lavori IN SHARE ROW EXCLUSIVE MODE
  lucchetti: relation:lavori(-,-) ShareRowExclusiveLock granted=false
```

**Il commento della prova è stato riscritto**, perché quello vecchio (righe 344-351) aveva previsto il guaio e sbagliato tre fatti su quattro — e i tre insieme rendevano il difetto inattribuibile:
- diceva «*si pianta*»: non si piantava, andava in **deadlock**, e Postgres uccideva **sempre l'altro**;
- diceva che `CREATE TRIGGER` prende **ACCESS EXCLUSIVE**: prende `SHARE ROW EXCLUSIVE` (misurato); l'`ACCESS EXCLUSIVE` era del `DROP TRIGGER`;
- diceva «*oggi è accettabile*»: **5 giri su 10**.

**Non c'è una seconda porta, e l'ho cercata invece di darlo per scontato.** Censimento del DDL dentro `tests/`: gli unici altri lucchetti di tabella sono i `TRUNCATE` di `eventi-qualita-schema.rpc.test.ts:380,393`, che pure girano su tabelle scritte dagli altri file. **Provato con il valore che deve essere rifiutato**, su transazioni annullate, con una seconda connessione che tiene `ROW EXCLUSIVE` su quella stessa tabella:

```
A: tiene ROW EXCLUSIVE su eventi_qualita (transazione aperta)
B: dopo 56 ms → 42501 permission denied for table eventi_qualita
```

**56 ms, non un'attesa:** Postgres verifica il permesso *prima* di concedere il lucchetto, quindi quel `TRUNCATE` non entra mai in coda. Non è una seconda sorgente — misurato, non dedotto.

---

## ⑤ Il difetto è nella PROVA — e ciò che va riferito a produzione

**Nella prova.** Il codice di produzione non esegue DDL su `lavori`: senza il `CREATE TRIGGER` della sonda l'ordine è unico per tutti e il cerchio non esiste. **Nessuna migration scritta, nessun file di produzione toccato, nessuna FASE 6b dovuta.**

🛑 **Ma il secondo anello del cerchio è di produzione, e va riferito (R-E2 — si riferisce, non si corregge di nascosto).**

`trg_dashboard_lavori` è `AFTER INSERT OR DELETE OR UPDATE ON public.lavori **FOR EACH ROW**`, e chiama `refresh_dashboard_cache(laboratorio_id)`, che **ricalcola da capo tutti i KPI del laboratorio** — scansione dei `lavori` del lab più sottoquery su `fatture` (due volte), `pagamenti`, `credito_clienti_movimenti`, `magazzino` — e li scrive su **una riga sola**. Due conseguenze che vivono in produzione, non nelle prove:

- **moltiplicazione della scrittura:** un'operazione che tocca N righe di `lavori` esegue N volte l'intero ricalcolo — e il costo di ogni ricalcolo cresce col numero di lavori del laboratorio;
- **incolonnamento:** la riga `dashboard_kpi_cache[lab]` resta bloccata fino a fine transazione, quindi **due scritture qualunque su `lavori` dello stesso laboratorio si mettono in fila**, anche se toccano lavori diversi.

Non è un deadlock in produzione e **non l'ho corretto**: è fuori mandato, tocca una funzione viva del banco, e la scelta (trigger per riga → per istruzione, oppure ricalcolo differito) è una decisione di architettura, non una riparazione. Origine: `supabase/migrations/002_fase2_schema.sql`, ripresa da `20260704190000_security_hardening_search_path.sql`.

---

## ⑥ FASE 7

```
 Test Files  451 passed | 7 skipped (458)
      Tests  5725 passed | 84 skipped (5809)

✓ Compiled successfully in 3.9s        (next build)
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde
✅ reduced-motion verde
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti
✅ verifica «full» registrata (.claude/state/ultima-verifica)
VERIFY_EXIT=0
```

**Base identica in ogni cifra: 5725 passate | 84 saltate su 458 file.** I saltati non si muovono perché il numero dei blocchi `it()` non cambia: la riparazione aggiunge un'istruzione dentro una prova e ne toglie un'altra.

---

## ⑦ 🔴 Dove questo mandato sbaglia

**1. «circa 1 giro su 10» è sbagliato di cinque volte: sono 5 su 10, con 7 prove cadute.** Non è pedanteria di conteggio: la frequenza decide il metodo. A 1 su 10 si è tentati di raccogliere un caso e ragionarci sopra; a 1 su 2 si mette una sonda e si guarda, che è ciò che ha risolto in un giro.

**2. 🛑 Il difetto peggiore: «il punto segnalato è `riapri-lavoro-atomica.rpc.test.ts`» indica LA VITTIMA, non il colpevole.** Quel file non contiene una riga di DDL, non ha nessun errore di ordine, e non è mai stato modificato per chiudere il difetto. Compare nei rossi perché Postgres, di due transazioni incrociate, ne uccide una — e ha ucciso **sempre** quella che aspettava la riga della cache, **mai** quella che aspettava la tabella. Chi avesse letto quel file cercando l'errore non avrebbe trovato niente, e sarebbe stato **il comportamento corretto**: l'errore non c'è. 🔑 **In un deadlock il nome nel referto è quello di chi ha perso, e chi perde non è chi ha sbagliato.**

**3. Il suggerimento operativo del mandato — «*guarda quali RIGHE condividono davvero*» — porta a metà della risposta e si ferma lì.** Le righe condivise ci sono davvero (`dashboard_kpi_cache[LAB_A]`) ed è metà del cerchio; l'altra metà è un lucchetto sull'**intera tabella** `lavori`, che nessun censimento di righe può trovare, perché non è una riga. Il fatto strutturale che mancava al mandato non è ① né ②, è: **una prova d'integrazione esegue DDL dentro la transazione.**

**4. La riga che il mandato eredita dal referto precedente è marcata `provato:` ma prova qualcosa di più debole di ciò che afferma** (R-P1). Il testo: «*il meccanismo è la corsa fra file paralleli … Due transazioni che inseriscono sulle stesse tabelle si incrociano, e Postgres ne uccide una*». Ciò che era provato è che vitest gira i file in parallelo — vero, riverificato. Ma **due transazioni che inseriscono sulle stesse tabelle non vanno in deadlock**: sei dei sette file lo fanno da settimane senza incrociarsi mai, e continuano a farlo oggi che il difetto è chiuso. Il marchio copriva la premessa, non la conclusione, e la conclusione è diventata la premessa del compito successivo.

**5. Conseguenza pratica per il compito su `ci.yml`, che ne ha bisogno prima di partire: delle tre forme messe sul tavolo dal referto precedente, DUE NON AVREBBERO FUNZIONATO.**
- **«un laboratorio dedicato per file di prova»** — **non funziona**: il lucchetto conteso è sull'intera tabella `lavori`, non sulle righe di un laboratorio. Separare i laboratori avrebbe tolto la contesa sulla riga della cache e lasciato intatta quella sulla tabella, cioè avrebbe cambiato la frequenza senza chiudere la causa: il modo peggiore di sbagliare, perché sembra funzionare.
- **«un rinvio con ripetizione sui codici di deadlock»** — avrebbe nascosto il difetto, ed è ciò che il mandato stesso vieta.
- **«un passo separato per `tests/integration`»** — avrebbe funzionato, ma spegnendo il parallelismo invece dell'incrocio.
➡️ **Oggi nessuna delle tre serve.** La suite d'integrazione è verde in parallelo, dieci giri su dieci.

**Dove il mandato aveva ragione, e conviene dirlo.** «*Un deadlock è due transazioni che prendono gli stessi lucchetti in ordine opposto*»: è esattamente questo, ed è la frase che ha indirizzato la diagnosi. «*Riproducilo prima di spiegarlo*, dieci giri, e conta»: senza i dieci giri la cifra sarebbe rimasta quella sbagliata del mandato. «*Il rapporto di deadlock di Postgres nomina entrambi i processi e le righe contese: è la prova che cerchi*»: vero alla lettera — e il campo che ha risolto il caso è il `where`, che nomina la funzione e il trigger da cui l'attesa nasce.

---

## ⑧ Che cosa NON ho fatto

- **Non ho toccato `.github/workflows/ci.yml`**, né deciso la forma del passo d'integrazione: è il compito successivo. §⑦ punto 5 è materiale per il suo brief.
- **Non ho toccato `vitest.config.ts`**: nessun `fileParallelism`, nessun `pool`, nessun `testTimeout`. La riparazione non ha avuto bisogno di configurazione, e le durate misurate in §① dicono che non ne ha bisogno adesso.
- **Non ho messo nessun rinvio con ripetizione**, in nessuna forma.
- **Non ho corretto `trg_refresh_dashboard`** né la sua funzione: fuori mandato, riferito in §⑤ (R-E2).
- **Non ho scritto migration** e non ho toccato codice di produzione: nessuna FASE 6b dovuta.
- **Non ho toccato** `memory/MEMORY.md`, la roadmap né il verbale.
- **Non ho toccato la CI — ma la sua forma l'ho MISURATA**, perché era l'unica riga di questo referto che sarebbe rimasta un ragionamento in mezzo a misure, e proprio quella che serve al compito successivo. Vedi §⑨.
- **Non ho controllato le altre prove d'integrazione per difetti diversi da questo**: ho seguito un asse solo, l'ordine dei lucchetti, e il censimento del DDL dentro `tests/` (§④) copre quell'asse e nessun altro.
- Le sonde stanno in `scripts/tmp/` (`monitor-lock.mjs`, `dieci-giri.sh`, `giri/`, `monitor-prima.log`, `monitor-dopo.log`) — cartella **ignorata da git**, usa e getta, mai committate.

---

## ⑨ La forma vera della CI, misurata (non è il mio mandato — è il regalo al successivo)

`vitest run` **senza argomenti** raccoglie già `tests/integration/**` (`vitest.config.ts:25-30`): oggi quei file si saltano da soli per mancanza della credenziale. Appena `SUPABASE_DB_URL` entra nell'ambiente, i 7 file d'integrazione finiscono **nella stessa piscina di lavoratori** dei 451 unitari — cioè in una concorrenza diversa da quella in cui ho misurato tutto il resto.

Le mie venti misure erano su `tests/integration` da solo. Il cerchio chiuso qui è chiuso comunque, perché **non dipende da quante transazioni ci sono ma dall'ordine in cui una sola di esse prendeva i lucchetti** — ma quello è un ragionamento, e in questo referto è l'unica riga che non sarebbe stata una misura. Quindi l'ho misurata:

```
provato:  cd "…/ua-app" && set -a && . ./.env.local; set +a && npx vitest run     (tre giri)

 Test Files  458 passed (458)          Duration 51,59s
      Tests  5809 passed (5809)

 Test Files  458 passed (458)          Duration 59,84s
      Tests  5809 passed (5809)

 Test Files  458 passed (458)          Duration 47,56s
      Tests  5809 passed (5809)

giri con deadlock: 0 su 3
```

🔑 **`5809 = 5725 + 84`, e i saltati sono ZERO.** È la prima volta che l'intera suite gira con le prove d'integrazione **accese**: 458 file su 458, tre giri su tre, nessun deadlock, e nessun passo separato né serializzazione. Per confronto, la FASE 7 con l'integrazione spenta dura 64,41 s: **accenderle non allunga niente** (la durata è tempo di parete e oscilla, ma non c'è nessun costo visibile).

⚠️ **Tre giri non sono dieci**, e lo scrivo perché è la stessa cifra che ha ingannato il referto precedente: tre giri verdi non provano che un difetto raro non esista. Provano che **non c'è un difetto frequente** in questa forma, ed è ciò che serviva sapere prima di partire. Chi accende l'interruttore ripeta con dieci.
