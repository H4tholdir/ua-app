# Le quattro prove rosse del TD04 — diagnosi e riparazione

**Data:** 09/08/2026 · **Ramo:** `intervento-post-consegna` · **File in causa:** `tests/integration/annulla-effetti-storno-td04.rpc.test.ts`

| cosa | esito |
|---|---|
| Difetto | **nella PROVA**, non nel codice di produzione |
| Causa | la prova descrive il `DELETE` del movimento `storno`, sostituito dal contro-movimento a delta (**D-2**) |
| Da quando | commit **`2306f239`, 15/07/2026 21:29** — *non* il 06/08 come diceva il mandato |
| Prove d'integrazione dopo | **84 su 84**, verdi 9 giri su 10 |
| FASE 7 | 5725 passate \| 84 saltate su 458 file · `VERIFY_EXIT=0` — base invariata |
| 🛑 Ritrovamento fuori mandato | la suite d'integrazione ha un **deadlock intermittente** (1 giro su 10) in un file non mio — **riferito, non corretto** (R-E2). 🔴 **Da solo, il verde non basta ad accendere `ci.yml`: v. §7 punto 3** |

---

## ① Che cosa si rompe davvero

Tutte e quattro le rosse cadono sulla **stessa asserzione**: il movimento di credito `storno` non viene eliminato. L'azzeramento di `stornata_at`, il ripristino del lavoro e l'MDR passavano già.

```
 ❯ tests/integration/annulla-effetti-storno-td04.rpc.test.ts (5 tests | 4 failed) 4693ms

 FAIL  > rifiuto TD04: stornata_at azzerato, movimento storno eliminato, …
AssertionError: expected 1 to be +0 // Object.is equality
 ❯ tests/integration/annulla-effetti-storno-td04.rpc.test.ts:132:24
    132|       expect(storno.n).toBe(0)

 FAIL  > doppio-rifiuto idempotente: …
AssertionError: expected 2 to be 1 // Object.is equality
 ❯ tests/integration/annulla-effetti-storno-td04.rpc.test.ts:181:30
    181|       expect(dopoRistorno.n).toBe(1) // il primo eliminato, il secondo…

 FAIL  > isolamento fra originali: …
AssertionError: expected 1 to be +0        ❯ …:229:24   expect(a.storni).toBe(0)

 FAIL  > collisione fatture_lavoro_attiva_unique: …
AssertionError: expected 1 to be +0        ❯ …:273:24   expect(storno.n).toBe(0)

 Test Files  1 failed (1)
      Tests  4 failed | 1 passed (5)
```

La forma delle rosse dice già tutto: `expected 1 to be 0` significa **la riga c'è ancora**, non «il trigger non ha fatto niente».

---

## ② La causa, letta sul catalogo vivo (non sui file)

`pg_get_functiondef` su `annulla_effetti_storno_td04()` — **il DELETE non esiste più**, al suo posto c'è un contro-movimento:

```sql
  -- 2. Contro-movimento a DELTA (spec §6.2 — bloccante panel: il NOT EXISTS
  --    lascerebbe credito fantasma dal secondo ciclo storno→rifiuto in poi).
  SELECT COALESCE(SUM(CASE tipo WHEN 'storno' THEN importo
                                WHEN 'annullo_storno' THEN -importo END), 0), …
    INTO v_delta, v_cliente_id
    FROM public.credito_clienti_movimenti
   WHERE laboratorio_id = NEW.laboratorio_id
     AND tipo IN ('storno','annullo_storno')
     AND fattura_id = NEW.fattura_collegata_id;

  IF v_delta > 0 THEN
    INSERT INTO public.credito_clienti_movimenti
      (…, tipo, fattura_id, importo, …) VALUES (…, 'annullo_storno', …, v_delta, …);
    INSERT INTO public.fatture_sdi_eventi (…, motivo, lista_errori)
      VALUES (…, 'annullo_credito_storno', jsonb_build_object('importo', v_delta, 'td04_id', NEW.id));
  END IF;
```

Il trigger `trg_fatture_td04_rifiutata` è invece **intatto** e punta a questa funzione (`AFTER UPDATE OF stato_sdi … WHEN tipo_documento='TD04' AND new.stato_sdi='rifiutata' AND old.stato_sdi IS DISTINCT FROM 'rifiutata'`).

**Sonda su transazione annullata** — stato vero dopo un rifiuto:

```
--- movimenti PRIMA del rifiuto ---
[ { tipo: 'storno', importo: '102.00', su_originale: true } ]

--- movimenti DOPO il rifiuto ---
[ { tipo: 'storno',         importo: '102.00', su_originale: true },
  { tipo: 'annullo_storno', importo: '102.00', su_originale: true } ]

--- eventi SdI ---
[ { origine: 'trigger_td04', motivo: 'annullo_credito_storno',
    lista_errori: { importo: 102, td04_id: 'ae597ee0-…' } } ]
```

Il ledger del credito è **append-only**: la riga `storno` resta per sempre, e un `annullo_storno` di pari importo la neutralizza. Il saldo (`eccedenza + storno − applicazione − rimborso − annullo_storno`, `src/lib/contabilita/saldo.ts:57`) torna a **0**.

### Perché il DELETE è stato tolto — e perché rimetterlo sarebbe stato il vero difetto

Spec `docs/superpowers/specs/2026-07-15-riconciliazioni-ricevute-pec-design.md` §6 e **D-2** (riga 23), *scelta esplicita di Francesco*, con panel 3× che l'ha resa **bloccante**:

> **D-2 — Contro-movimento al posto del DELETE nel trigger** (scelta esplicita di Francesco): ledger credito append-only, storia visibile, audit. **La guardia di idempotenza è a delta, non a esistenza** … il `NOT EXISTS` romperebbe il ciclo legittimo storno→rifiuto→ri-storno→secondo rifiuto (credito fantasma del secondo storno).

Sonda del doppio ciclo, che è il caso che ha imposto il delta:

```
dopo TD04 #1 emesso   : { storni: 1, annulli: 0, s_storni: 102, s_annulli:   0, delta: 102 }
dopo rifiuto #1       : { storni: 1, annulli: 1, s_storni: 102, s_annulli: 102, delta:   0 }
dopo ri-storno (TD #2): { storni: 2, annulli: 1, s_storni: 204, s_annulli: 102, delta: 102 }
dopo ri-SET su #1     : { storni: 2, annulli: 1, s_storni: 204, s_annulli: 102, delta: 102 }  (WHEN falso → invariato)
dopo tocco causale    : { storni: 2, annulli: 1, s_storni: 204, s_annulli: 102, delta: 102 }  (colonna fuori scope → invariato)
dopo rifiuto #2       : { storni: 2, annulli: 2, s_storni: 204, s_annulli: 204, delta:   0 }
```

Con una guardia «a esistenza» l'ultima riga non sarebbe scattata (un `annullo_storno` c'era già) e **102 € di credito fantasma sarebbero rimasti spendibili**. È esattamente ciò che il panel aveva bloccato.

Sonda del caso collisione:

```
dopo rifiuto (coll.)  : { storni: 1, annulli: 1, s_storni: 102, s_annulli: 102, delta: 0 }
td04 stato:            [ { stato_sdi: 'rifiutata' } ]
originale stornata_at valorizzato: [ { stornata: true } ]
eventi: [ { motivo: 'collisione_rifatturazione', importo: null },
          { motivo: 'annullo_credito_storno',    importo: '102.00' } ]
```

**Il lato produzione è coerente in ogni punto**, e questo è il fatto che chiude la questione:

| dove | prova |
|---|---|
| `src/lib/contabilita/saldo.ts:57` | `… − somma('annullo_storno')` — il lettore sottrae |
| `src/types/domain.ts:941` | `TipoMovimentoCredito` include `'annullo_storno'` |
| `src/lib/contabilita/queries.ts:133,144` | union estese |
| vincolo `credito_clienti_movimenti_tipo_check` | accetta `annullo_storno` |
| `tests/unit/contabilita-annullo-storno.test.ts` | prove unitarie del saldo già verdi |
| `src/components/features/scadenzario/CreditoDisponibileSection.tsx:21` | variante allerta per saldo `< 0` già presente |

---

## ③ Da quando

| commit | quando | che cosa |
|---|---|---|
| `d61d289a` | **15/07/2026 12:31** | nasce la prova **e** la migration `20260715140000` (versione col `DELETE`) |
| `2306f239` | **15/07/2026 21:29** | `feat(db): trigger TD04 a contro-movimento delta + eventi audit (**mai DELETE**)` |

`git show --stat 2306f239` → **un solo file toccato**, la migration:

```
 ...20260716091000_annullo_storno_trigger_delta.sql | 101 +++++++++++++++++++++
 1 file changed, 101 insertions(+)
```

➡️ **Il comportamento è cambiato nove ore dopo la nascita della prova, e la prova non è stata toccata.** Nessuno se n'è accorto perché le prove d'integrazione non girano in automatico e si **saltano** in silenzio senza `SUPABASE_DB_URL` (`tests/integration/helpers/pg-client.ts:9`).

⚠️ **Limite di ciò che posso provare:** ho la data di **scrittura** della causa. `supabase_migrations.schema_migrations` conserva `version` e `name` ma **nessun istante di applicazione**, quindi il giorno esatto in cui le prove sono diventate rosse *sul banco* non è recuperabile dal ledger. Entrambe le migration risultano registrate.

---

## ④ Difetto nella prova, non in produzione

**Nella prova.** La prova è stata scritta contro un disegno superato nove ore dopo, da una decisione ratificata da Francesco, validata da un panel 3× e attuata in modo completo su tutti i lettori. Rimettere il `DELETE` avrebbe **reintrodotto il credito fantasma** che il panel aveva bloccato.

**Non ho quindi nulla da riferire a produzione su questo asse** — il codice fa la cosa giusta.

Cosa ho cambiato nella prova (5 blocchi `it()` prima, 5 dopo — il conteggio dei saltati non si muove):

- l'intestazione (righe 5-15) diceva «*movimento credito 'storno' eliminato*»: **riscritta**, con il richiamo esplicito a D-2 e alla migration che l'ha introdotto. Lasciarla sarebbe stato lasciare in casa il documento falso che ha generato il difetto;
- le asserzioni non contano più righe soltanto: verificano **importi, delta e saldo** con la stessa formula dei lettori (`ledgerStorno`, `saldoCliente`). Una riparazione che avesse solo girato `toBe(0)` in `toBe(1)` sarebbe passata anche con gli importi sbagliati — cioè proprio ciò che il disegno a delta esiste per impedire;
- il commento «*il primo eliminato, il secondo creato*» era **esattamente al contrario**: rimosso;
- coperte due invarianti che la prova non toccava, richieste dalla spec §8.7-8.8: gli **eventi di audit** (`annullo_credito_storno` con importo e `td04_id`; `collisione_rifatturazione` sul ramo collisione) e la **guardia `v_delta > 0`** (originale senza credito → nessun contro-movimento inventato dal nulla);
- 🛑 nessuna asserzione ordina o distingue i movimenti per `created_at`: dentro `withRollback` `now()` è **costante**, quindi tutte le righe hanno lo stesso istante. Si contano e si sommano.

**Nessuna migration scritta**, nessun file di produzione toccato. L'unico file modificato è la prova.

---

## ⑤ Le prove d'integrazione dopo

```
 Test Files  7 passed (7)
      Tests  84 passed (84)
   Duration  17.92s
```

**80 su 84 → 84 su 84.** Ripetuto **9 giri su 10** con lo stesso esito (il decimo in §7).

---

## ⑥ FASE 7

```
 Test Files  451 passed | 7 skipped (458)
      Tests  5725 passed | 84 skipped (5809)

✓ Compiled successfully in 17.1s        (next build)
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde
✅ reduced-motion verde
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti
✅ verifica «full» registrata (.claude/state/ultima-verifica)
VERIFY_EXIT=0
```

**Base identica in ogni cifra: 5725 passate | 84 saltate su 458 file.** I saltati non si sono mossi perché i blocchi `it()` del file restano **5 prima e 5 dopo** — le asserzioni sono cambiate, non il loro numero. `tsc --noEmit` copre anche le prove (`tsconfig.json` include `**/*.ts`), quindi i due nuovi aiutanti tipizzati sono verificati.

---

## ⑦ 🔴 Dove questo mandato sbaglia

**1. «ROSSE dal 06/08/2026» è falso, e la data mandava a cercare nel posto sbagliato.** La causa è del **15/07/2026 21:29**. Il mandato indicava come «ipotesi da verificare per prima» le migration del 06/08 e 07/08 che «*hanno riscritto funzioni e trigger*»: nessuna di quelle tocca questo trigger. `grep -rl "td04_rifiutata" supabase/` restituisce **due soli file, entrambi di luglio**. Seguendo l'ipotesi del mandato si sarebbero lette una quindicina di migration senza trovare niente.

**2. Il confronto col gemello, indicato come «la prima cosa da guardare», non porta da nessuna parte.** `emetti-nota-credito-atomica.rpc.test.ts` prova la RPC di emissione e **non tocca il trigger del rifiuto**: passa perché prova un'altra cosa, non perché sia scritto meglio. La mossa che ha risolto è quella che il mandato metteva in fondo: leggere il **corpo vivo** con `pg_get_functiondef`. Su quella il mandato aveva ragione — ed è l'unica strada che ha prodotto la risposta.

**3. 🛑 Il difetto più importante: togliere le quattro rosse NON basta ad accendere le prove in CI.** Il mandato dice «*il tuo compito è togliere quel blocco*», dando per inteso che dopo il verde la strada sia libera. Non lo è. Al primo giro completo ho preso questa:

```
 ❯ tests/integration/riapri-lavoro-atomica.rpc.test.ts (17 tests | 1 failed)
     × quando il fail-closed solleva, il ripristino del lavoro NON sopravvive: la funzione è davvero atomica
error: deadlock detected
 ❯ creaLavoroConsegnato tests/integration/riapri-lavoro-atomica.rpc.test.ts:75:3
 Tests  1 failed | 83 passed (84)
```

Poi **nove giri verdi di fila**: **1 fallimento su 10**, in un file che **non è il mio** e su cui non ho toccato niente.

`provato:` il meccanismo è la **corsa fra file di prova paralleli**, non un difetto del file — `vitest.config.ts` **non dichiara né `fileParallelism` né `pool`**, quindi vale il default di vitest: i file girano in **parallelo**, ognuno con la sua connessione e la sua transazione aperta sullo stesso banco. Due transazioni che inseriscono sulle stesse tabelle si incrociano, e Postgres ne uccide una.

➡️ **Accendere le prove in CI oggi, così come sono, produrrebbe una pubblicazione rossa circa una volta su dieci per un motivo che non c'entra col codice** — cioè esattamente «l'allarme che suona sempre» contro cui il mandato mette in guardia.

🔑 **E c'è un dettaglio che rende la scelta meno ovvia di quanto sembri, scritto nel commento di `vitest.config.ts:25-30`:** la CI usa **`vitest run` senza argomenti**, e quel comando **raccoglie già anche `tests/integration/**`** — oggi si salvano da soli per via dello `skipIf`. Quindi, appena `SUPABASE_DB_URL` arriva nell'ambiente del passo «Unit tests», i 7 file d'integrazione entrano **nello stesso giro dei 451 file unitari e nella stessa piscina di lavoratori**. Conseguenza pratica: `--no-file-parallelism` **serializzerebbe tutta la suite**, non solo l'integrazione — 194 s che diventano molti di più.

📌 **La scelta è del compito su `ci.yml`, non mia**, e le forme sul tavolo sono almeno tre: un **passo separato** per `tests/integration` (che è anche l'unico modo di serializzare solo quelli), un **laboratorio dedicato per file di prova** invece del `LAB_E2E_ID` condiviso, oppure un **rinvio con ripetizione** sui codici di deadlock. Non ho deciso e non ho provato nessuna delle tre: il compito successivo **ha bisogno di saperlo prima di partire**.

**Dove il mandato aveva ragione, e conviene dirlo:** le prove d'integrazione davvero non sorvegliano niente oggi, il salto silenzioso di `pg-client.ts:9` è davvero il meccanismo, e il catalogo vivo è davvero l'unica fonte attendibile — i file di migration mostrano *una* versione della funzione, non quella in vigore.

---

## ⑧ Che cosa NON ho fatto

- **Non ho toccato `ci.yml`**: è il compito successivo, di un altro esecutore (§7 punto 3 è materiale per il suo brief).
- **Non ho corretto il deadlock** di `riapri-lavoro-atomica.rpc.test.ts`: fuori mandato, si riferisce e non si corregge di nascosto (**R-E2**).
- **Non ho scritto migration** e non ho toccato il codice di produzione: il difetto non era lì. Nessuna FASE 6b dovuta.
- **Non ho toccato** `memory/MEMORY.md`, la roadmap, il verbale.
- **Non ho verificato** se altri file di prova descrivano comportamenti superati come questo: ho controllato **solo** questo asse (`grep -rni "eliminat" tests/ | grep -i storno` → nessuna occorrenza fuori da questo file, ora tutte corrette). Un censimento generale «prove che descrivono un disegno superato» non è stato fatto.
- Le sonde stanno in `scripts/tmp/` (`sonda-td04.mjs`, `sonda-td04-doppio.mjs`, `dump-fn.mjs`) — cartella **ignorata da git**, usa e getta, mai committate.

### 🔴 Un errore mio, da raccontare per intero

**Il mio salvataggio è finito dentro il commit di un'altra sessione, e la colpa è di come l'ho fatto.**

Lavoravo nello stesso albero di una sessione viva che stava scrivendo il verbale delle decisioni (D331-D335). Ho eseguito `git add` sui miei due percorsi e poi `git commit`: il commit **è fallito** con `error: impossibile scrivere l'indice` (contesa sull'indice, lint-staged si è fermato). Nel frattempo l'altra sessione ha salvato — e ha trovato **i miei file già nell'indice**, quindi se li è portati dentro:

```
commit a06870e2  docs(decisioni): D331-D335 — l'avviso al dentista, deciso in cinque risposte
 .superpowers/sdd/td04-prove-rosse-report.md        | 234 +++++++++++++++++++++
 .../2026-07-28-wizard-ondata-b-decisioni.md        |  45 +++-
 .../annulla-effetti-storno-td04.rpc.test.ts        | 216 +++++++++++++------
```

**Nessun contenuto è andato perso** — la prova salvata è la versione corretta e l'albero è pulito. **Ciò che si è perso è il messaggio:** la storia non dice da nessuna parte perché quelle prove sono cambiate, e il messaggio che l'avrebbe spiegato è finito nel cestino insieme al commit fallito. Questo referto è l'unico posto dove quella spiegazione esiste.

🛑 **Non ho riscritto la storia per rimediare** (`reset`, `amend`): il ramo è **in uso da una sessione viva**, e riscrivere sotto i piedi di chi ci sta lavorando è un danno peggiore di un messaggio di commit sbagliato.

🔑 **La lezione, che vale oltre questo caso:** in un albero condiviso con una sessione attiva, `git add` **non è un gesto locale** — mette i file in una zona comune da cui chiunque può salvarli. O si salva in un colpo solo (`git commit <percorsi>`, che non passa dall'indice condiviso), o si aspetta che l'albero sia fermo.
