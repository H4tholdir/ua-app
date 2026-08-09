# Task 10 — Le prove d'integrazione e la chiusura

**Ramo:** `intervento-post-consegna` · **9 agosto 2026** (`provato:` `date` → `Sun Aug 9 11:41:56 CEST 2026`)
**Mandato:** `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`, «Task 10» (riga 1142)

> 📁 **Nota d'archivio:** in `.superpowers/sdd/` esisteva già un `task-10-report.md`, dell'ondata (b)
> sessione-3 del 05/08 (il mini-foglio «Chi ha prescritto?»). L'ho **rinominato**
> `task-10-report-ondata-b-sessione-3-PRESERVATO-2026-08-05.md`, come già fatto per il `task-6`, invece
> di sovrascriverlo.

| cosa | esito |
|---|---|
| Passo 0 — la funzione viva | **fatto**: tolta la riapplicazione della migration, e la divergenza era **DUE cambiamenti, non uno** |
| prove nuove | **35**: 19 unitarie di contratto · 14 d'integrazione nuove · 2 aggiunte al file gemello |
| la CATEGORIA (§2 del mandato) | **chiusa in una direzione, misurata**: con la mutazione decisiva il file vecchio resta **80 su 80 verde**, il nuovo va **7 rosse** |
| giro sul banco vero | **fatto** — nessun progressivo bruciato, `prima_immissione_at` **ferma**; banco rimesso **meglio di come l'ho trovato** (§③) |
| FASE 7 | **`VERIFY_EXIT=0`** — 5725 passate \| 84 saltate su 458 file |
| prove d'integrazione (a parte, con le credenziali) | **80 su 84**; le 4 rosse sono **preesistenti e di un altro file** |
| difetti nel piano/mandato | **cinque** (§⑥) |

---

## ① Il Passo 0 — e la divergenza era il DOPPIO di quella dichiarata

**Il piano dice:** «togli `applicaMigrazione` e prova la funzione VIVA, aggiungendo l'asserzione su
`annullata_da_evento_id`». Quella formulazione nomina **un** cambiamento. Sul catalogo vivo ce ne sono
**due**, e il secondo è più grosso del primo.

`provato:` `SELECT pg_get_functiondef(oid) …` su `public.riapri_lavoro_atomica` (md5
`ad8118193e4b59186989784334f936f6`, 1603 caratteri) — **il catalogo, non il file**:

| | corpo del file `20260806210400` (quello che le prove riapplicavano) | corpo VIVO (09/08) |
|---|---|---|
| il ripristino del lavoro | `UPDATE lavori SET …` **dentro** la funzione | `PERFORM public.ripristina_lavoro_a_pronto(...)` — **chiamata annidata** (`20260807182614`) |
| l'annullamento della dichiarazione | `SET stato = 'annullata'` | `SET stato = 'annullata', annullata_da_evento_id = p_evento_id` (`20260807143623` §③) |

🔑 **Perché il primo conta più del secondo, e il piano non lo dice.** In quel file c'è una prova che si
chiama «*la funzione è davvero atomica*». Contro il corpo del 6 agosto misurava l'atomicità di un
**blocco monolitico**; contro il corpo vivo misura l'atomicità **attraverso una chiamata annidata** —
cioè che la funzione chiamata non si porta dietro un blocco `EXCEPTION` che ne assorba il fallimento.
**Il significato della prova è cambiato senza che una sua riga cambiasse.** L'ho scritto accanto alla
prova, non solo qui.

### Che cosa ha trovato la rimozione della scorciatoia — e il risultato è «niente», che è un fatto

```
prima (con applicaMigrazione, corpo del 6 agosto):   15 su 15 verdi
dopo  (funzione viva del catalogo):                  15 su 15 verdi
```

🔑 **Nessun difetto si nascondeva lì.** La frase del mandato — «*i suoi 15 verdi non hanno mai visto il
corpo vivo*» — è **vera ma non portante**: sulle proprietà che quelle quindici prove interrogano, i due
corpi si comportano uguale. Il valore della correzione non è un difetto trovato oggi: è che **da oggi
quel file guarda la cosa vera**, e la prossima divergenza la vedrà.

### La prova che ora guarda il corpo vivo — e che sarebbe ROSSA sull'altro

Due prove nuove (15 → **17**):

- **la causale**: `annullata_da_evento_id` dev'essere **esattamente** l'evento che ha chiesto la
  riapertura (non «non nullo»: una causale sbagliata è peggio di una assente).
- **il valore che DEVE essere rifiutato** (R-P1): lo stesso evento non può annullare **due**
  dichiarazioni — `riapri → riconsegna → riapri con lo stesso evento` esce **23505** su
  `ddc_evento_annulla_unique`, e il rifiuto è atomico (il lavoro resta `consegnato`). Era un effetto
  **dichiarato fuori mandato** dall'esecutore del Task B (`20260808093513:44-49`) e **mai provato**.

`provato:` che la prima è discriminante — riapplicando **a mano** il file del 6 agosto in una
transazione annullata (`scripts/tmp/sonda-t10-causale.sql`):

```
❌ P0001 SONDA-CORPO-06-08 → stato=annullata | annullata_da_evento_id=NULL
                           | atteso dalla prova nuova=393a4b8d-8a96-4d9f-9212-db13ad494733
```

Sotto la vecchia scorciatoia quella prova sarebbe **rossa**. È il senso di R-P1: un vincolo si prova
con un valore che deve essere rifiutato.

---

## ② I rami nuovi — e quali erano GIÀ coperti dal Task 9

**File nuovo:** `tests/integration/torna-a-pronto.rpc.test.ts` — **14 prove**, tutte contro il catalogo
vivo, mai una migration riapplicata.

| ramo | stato prima di oggi | dove sta ora |
|---|---|---|
| `evento_non_valido` (inesistente · **di un altro lavoro dello stesso lab**) | scoperto | 2 prove nuove |
| `non_consegnato` | scoperto | 1 |
| `ddc_viva: false` (nessuna dichiarazione · unica già annullata) | scoperto | 2 (`it.each`) |
| **atomicità attraverso la chiamata annidata** | «*misurata a mano dal Task 4, oggi non ripetibile da nessuno*» | 1 — **ora ripetibile** |
| la dichiarazione resta **viva e INTATTA** (D293) | provato **dal vivo** dal Task 9 (DdC restata `generata`), mai in automatico | 1, e guarda **anche** `annullata_da_evento_id` |
| `prima_immissione_at` non si muove | mai provato in nessun modo | 1 |
| `non_trovato` · `deleted_at` · cross-tenant | scoperti | 3 |
| permessi dal catalogo, **incluso `ripristina_lavoro_a_pronto`** | scoperti | 1 |
| `crea_rifacimento_atomico` — stesso evento due volte | scoperto | 2 |

**Come si fa sollevare una guardia dichiarata irraggiungibile.** La rete difensiva dentro
`ripristina_lavoro_a_pronto` (`v_rows = 0 → RAISE`) è commentata nella sua migration come «oggi
irraggiungibile», perché il chiamante ha già bloccato la riga con `FOR UPDATE`. La prova la rende
raggiungibile con un **trigger usa-e-getta** che restituisce `NULL` sul passaggio a `pronto`: la riga
viene saltata, `ROW_COUNT` vale 0, la guardia parte. Il trigger nasce e muore dentro la transazione
annullata (il DDL in Postgres è transazionale). Effetto collaterale utile: **prova che quella rete non
è codice morto**.

🔑 **Perché `si_rifa` due volte sta qui e non nel giro a schermo.** Il Passo 1 ④ chiede «*due volte → un
solo lavoro nuovo*». **Dal browser non è riproducibile**: a ogni giro il foglio conia un evento nuovo,
quindi lo stesso evento non si ripresenta mai. La ripetizione vera nasce da un secondo tocco o da un
ritentativo dopo un timeout — cioè dal livello in cui l'ho messa.

### Che cosa aveva già coperto il Task 9 — citato, non rifatto

Dal suo §④: `2026/0005` `consegnato → pronto → consegnato`, `post_consegna_correzioni` 9 → 12 → 9,
tre eventi depositati e tolti, `scelta_intervento` arrivata in banca dati (`si_rifa` e `si_sistema`),
`DDC-2026-0003` **rimasta `generata`** dopo due ritorni fra i pronti, e `2026/0017` nato dal
rifacimento. **Non l'ho ripetuto.** Quello che il Task 9 **non** ha toccato è tutta la riga di sotto:
`prima_immissione_at`, la riconsegna, il progressivo.

---

## ③ Il giro sul banco vero — la riconsegna, che nessuno aveva mai fatto

**Accesso** (⚖️ D103), e **non** con la ricetta del `GATE-L2.md` §7 che porta a un 404:

```bash
BASE=http://localhost:3000 npx tsx scripts/link-accesso.ts e2e-titolare@ua-test.local /lavori/<id>
```

🔑 **L'email si passa SEMPRE, non si lascia ripiegare su `TEST_EMAIL`:** in `.env.local` vale
`h4t@live.it`, che è del laboratorio **«Filippo Opromolla»**, mentre la fixture sta in **«Lab Test
E2E»** (`00000000-0000-0000-0000-000000000001`). `provato:` i tre utenti di quel laboratorio sono
`e2e-titolare@` · `e2e-tecnico@` · `e2e-frontdesk@ua-test.local`. Ed è un **server locale** (`BASE`),
non `uachelab.com`: questo ramo non è pubblicato, quindi in produzione il foglio è quello vecchio.

**Il lavoro:** `2026/0005` — `cdfee91f-5952-4eb9-8114-f36e4344645d`.

| | prima (trovato) | dopo «È andato alla persona sbagliata» | dopo la **riconsegna** | dopo il ripristino |
|---|---|---|---|---|
| `stato` | `consegnato` | **`pronto`** | `consegnato` | `consegnato` ✅ |
| `DDC-2026-0003` | `generata` | **`generata`**, causale `NULL` | **`generata`, la STESSA riga** | `generata` ✅ |
| dichiarazioni del lavoro | 1 | 1 | **1 — nessuna nuova** | 1 ✅ |
| `progressivi_anno.ddc` | 10 | 10 | **10 — nessun progressivo bruciato** | 10 ✅ |
| `prima_immissione_at` | `2026-07-06T15:48:03.234Z` | **identica** | **identica** | identica ✅ |
| `post_consegna_correzioni` | 9 | 10 | 10 | 9 ✅ |
| eventi di qualità | 0 | 1 | 1 | **0** ✅ |
| `conformato` / le tre date di consegna | `false` / `NULL` ⚠️ | — | `true` / 09/08 | `true` / **06/07** (v. sotto) |

🔑 **La misura più forte non viene dal confronto prima/dopo: viene dall'`audit_log`.** Ho estratto la
**differenza campo per campo** di ogni riga scritta durante il giro (cinque `UPDATE`), e
**`prima_immissione_at` non compare in nessuna**. Non «era uguale alla fine»: **non è mai stata
toccata**, nemmeno da una consegna nuova. È l'invariante dell'Allegato XIII punto 4 — il termine dei
dieci anni decorre dalla **prima** immissione — e vive in una riga sola (`orchestrate.ts:337`,
`prima_immissione_at: lavoro.prima_immissione_at ?? now`) che nessuna prova toccava.

E la promessa del dialogo di conferma — «*DdC e buono di consegna si generano al tocco*» — sul secondo
giro **non si avvera, ed è giusto così**: la porta di idempotenza di `generate-ddc.ts:99-108` trova la
dichiarazione viva e restituisce quella. Il progressivo resta 10.

### 🔄 Il banco l'ho rimesso **meglio** di come l'ho trovato, e lo dichiaro

`provato:` sull'`audit_log`, riga delle **08:40:14.782Z** del 09/08 (il primo giro del Task 9): quel
giro ha portato `data_consegna_effettiva` da `2026-07-06T15:48:03.234+00` a `NULL` e `conformato` da
`true` a `false`. **Il ripristino del Task 9 ha rimesso solo `stato`.** Il lavoro è quindi rimasto
`consegnato` **senza data di consegna** — uno stato che l'app non produce mai da sola.

➡️ Ho riportato le cinque colonne ai valori **precedenti al Task 9**, letti dall'`audit_log` e non
ricordati, invece che allo stato incoerente in cui l'ho trovato. Il testo integrale della transazione
è qui sotto — **e non solo in `scripts/tmp/`, che è ignorato da git**: rimandare lì sarebbe rifare
l'errore già pagato con lo script del link d'accesso (⚖️ D103).

```sql
BEGIN;
DELETE FROM valutazioni_evento WHERE evento_id = '7fc8a88a-b724-4a90-982d-4f12aed9f6a1';
DELETE FROM eventi_qualita     WHERE id       = '7fc8a88a-b724-4a90-982d-4f12aed9f6a1';
UPDATE lavori SET
  stato                    = 'consegnato',
  conformato               = true,
  data_conformazione       = '2026-07-06T15:48:03.234+00',
  data_consegna_effettiva  = '2026-07-06T15:48:03.234+00',
  consegna_completata_at   = '2026-07-06T15:48:03.234+00',
  consegna_in_corso        = false,
  consegna_tap_at          = '2026-07-06T15:48:01.762226+00',
  proposta_dentista        = NULL,
  proposta_at              = NULL,
  post_consegna_correzioni = 9
WHERE id = 'cdfee91f-5952-4eb9-8114-f36e4344645d';
-- `prima_immissione_at` NON si tocca: è l'invariante misurata.
COMMIT;
```

🛑 **Nessun progressivo è stato consumato da questo giro** — né di dichiarazione (10 → 10) né di lavoro
(18 → 18) né di buono (7 → 7). È la differenza con il Task 9, che ne aveva bruciati sei.

---

## ④ FASE 7 — e i due numeri sono DUE, non uno

```
npm run verify:full > scripts/tmp/verify-task10.log 2>&1; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
→ VERIFY_EXIT=0
   Test Files  451 passed | 7 skipped (458)
        Tests  5725 passed | 84 skipped (5809)
   tsc 0 · eslint --max-warnings 0 · next build ok · le sei guardie verdi
```

Base del mandato: **5706 passate | 68 saltate su 456 file**. Quindi **+19 passate** (le prove di
contratto) e **+16 SALTATE** su **+2 file**.

🔴 **Le mie 16 prove d'integrazione nuove NON sono in quel 5725, e chi legge solo quella riga crede a
una copertura che quella corsa non ha esercitato.** `verify:full` lancia `vitest run` nudo, e
`tests/integration/**` si salta da sé senza `SUPABASE_DB_URL` (`helpers/pg-client.ts:11`). Vanno
lanciate a parte, con le credenziali:

```
set -a && . ./.env.local; set +a; npx vitest run tests/integration
→ Test Files  1 failed | 6 passed (7)
       Tests  4 failed | 80 passed (84)
```

**Le 4 rosse sono PREESISTENTI e di un altro file:** `annulla-effetti-storno-td04.rpc.test.ts`
(rifiuto di una nota di credito), rotte dal 06/08 e già iscritte in roadmap. I miei due file sono
**17 su 17** e **14 su 14**.

---

## ⑤ 🔑 La domanda del §2 — che forma di prova impedisce a un corpo di divergere dal contratto

**La risposta breve: si smette di FINGERE `fetch` e lo si INSTRADA.**

Il file nuovo è `tests/unit/devo-intervenire-contratto.test.tsx` (**19 prove**). La finzione globale di
`fetch` non registra più la richiesta: ne costruisce una `Request` vera e chiama la **`POST` autentica**
della rotta — `import { POST } from '@/app/api/lavori/[id]/eventi-qualita/route'` — restituendo al
componente la `Response` che il server produrrebbe. Il corpo lo compone il foglio, **a giudicarlo è il
contratto stesso**.

🔑 **Non nasce nessuna terza copia**, ed è il vincolo della domanda: la validazione resta **una sola**,
e questa prova la **esegue** invece di descriverla. L'elenco delle strade non è nemmeno scritto a mano —
si deriva da `MOTIVI` (copiato dal `CHECK` vivo) e da `MOTIVI_CON_SCELTA`, così **un motivo nuovo entra
da solo** e diventa rosso il giorno in cui nasce, non il giorno in cui un'operatrice lo preme.

**Costo, misurato:** due `vi.mock` — `@/lib/supabase/server-service` e `@/lib/supabase/lab-context` —
cioè esattamente quelli che `eventi-qualita-route.test.ts` usa già. Nessuna finzione in più:
`isSameOrigin` considera sicura una richiesta senza intestazione `origin` (`csrf.ts:7`), che è il caso
server-to-server, quindi il ponte passa.

### La prova che la prova morde — tre mutazioni sul componente, tutte annullate

| mutazione al foglio | `DevoIntervenire.test.tsx` (1660 righe, 80 prove) | `devo-intervenire-contratto.test.tsx` (19) |
|---|---|---|
| **①** togliere `scelta_intervento` dal corpo (il difetto vero del 09/08) | 2 rosse | **6 rosse** |
| **②** mandarla **sempre**, `null` fuori dal bivio | 2 rosse | 1 rossa |
| **③** mandare `natura` su **ogni** motivo | **0 rosse — 80 su 80 VERDE** | **7 rosse** |

🔴 **La riga ③ è la risposta.** Un rifacimento del tutto plausibile («rendiamo esplicita la natura
invece di lasciarla derivare») fa rispondere **422** alla rotta su sette motivi su nove: il foglio non
salverebbe più niente, e **l'intera suite del componente resterebbe verde**. Con il ponte, sette prove
si accendono. **Quella è la categoria**, e non è un ragionamento: è una misura.

### E che cosa questa forma NON chiude — dichiarato, non sottinteso

1. **Chiude una direzione e mezza, non due.** Il verso **corpo → contratto** è chiuso: forma,
   vocabolari, campi obbligatori, coppie proibite. Il verso **risposta → schermata** è coperto solo
   *dove la prova arriva*: una prova rende la schermata finale a partire dalla risposta **che la rotta
   ha davvero costruito** (`esito_azione.lavoro_nuovo.numero_lavoro`), quindi un campo rinominato nella
   rotta si vede — ma il tipo `RispostaEvento` del componente resta **scritto a mano** e nessuno lo
   confronta con il tipo di ritorno della rotta.
2. **È dinamica, non di tipo.** Copre i cammini che i gesti percorrono davvero. Se domani nasce un
   passo che il mio percorso non attraversa, quel corpo non è sorvegliato.
3. **Il client Supabase resta finto.** Questo file misura il contratto HTTP, non la banca dati — quella
   sta in `tests/integration/`. Le due metà sono deliberate: fingere anche il database *dentro* la
   rotta è ciò che rende la prova veloce e ripetibile senza credenziali.

### 🛠️ Che cosa servirebbe per chiudere la categoria **anche a livello di tipo**

Una sola cosa, e non è una prova: **la rotta deve esportare il tipo del corpo che accetta e il tipo che
restituisce**, e il componente deve comporre `satisfies CorpoEvento` e leggere `RispostaEvento` da lì
invece di ridichiararlo. Allora un campo rinominato sarebbe un errore di **compilazione**, non un
rosso in una prova che qualcuno deve aver pensato a scrivere. 🛑 **Non l'ho fatto: è un cambiamento
alla rotta, cioè fuori dal mandato di questo compito (R-E2).** Ed è il pattern che questa stessa rotta
usa già al proprio interno (`as const satisfies Record<…>` su `CAVEAT_RIPRISTINO`, con la prova
incollata che senza il `satisfies` un refuso passa `tsc` a 0): **la casa sa già farlo, non lo fa
ancora attraverso il confine HTTP.**

---

## ⑥ 🔴 Dove il piano e questo mandato sbagliano — cinque punti

**1. Il Passo 0 nomina UN cambiamento e ce ne sono DUE**, e il secondo è più grosso: il corpo vivo non
aggiorna più `lavori` da sé, chiama `ripristina_lavoro_a_pronto`. Chi seguisse il piano alla lettera
aggiungerebbe l'asserzione sulla causale e **non si accorgerebbe che una prova esistente ha cambiato
significato**. È la stessa forma dell'allowlist che sembra completa e non lo è.

**2. 🔴 Il Passo 2 del piano prescrive un controllo che NON PUÒ vedere il lavoro di questo compito.**
Dice: «`npm run verify:full` … **Atteso:** `uscita=0`». Ma `verify:full` lancia `vitest run` nudo, e
le prove d'integrazione **si saltano da sole** senza `SUPABASE_DB_URL`. Il compito che il piano
descrive è *scrivere prove d'integrazione*, e il controllo che il piano prescrive per verificarle **le
salta tutte**. Il numero cresce lo stesso — di **saltate**, non di passate — quindi il difetto è
invisibile a chi guarda solo l'uscita.

**3. Il mandato dice che il Task 9 ha già fatto «quattro dei cinque giri» del Passo 1: l'affermazione
regge sui MOTIVI, non sulle INVARIANTI.** Il Task 9 ha coperto tre motivi dal vivo, ma **nessuna** delle
tre cose che il Passo 1 chiede davvero di misurare: `prima_immissione_at` (①), la riconsegna senza
progressivo bruciato (②), e la doppia chiamata su `si_rifa` (④). «Quattro su cinque già fatti» avrebbe
portato a saltare il giro, e il giro era il punto.

**4. Il piano chiede il ramo ④ («`si_rifa` due volte») nel Passo 1, cioè fra le prove a schermo.** Dal
browser **non è riproducibile**: ogni giro conia un evento nuovo. O si scende al livello della RPC — che
è dove l'ho messo — o quella riga resta un desiderio.

**5. Il Passo 4 del piano dice che la riga della roadmap da chiudere è la 23.** Oggi la voce del Task 9
è la **38**, e il mandato mi dice di non toccare la roadmap: il numero nel piano è stantìo. Segnalato,
non corretto.

---

## ⑦ Ritrovamenti FUORI mandato — riferiti, non corretti (R-E2)

**1. 🔴 Una RAGIONE FALSA scritta in due posti, e trovata istradando le prove.** Il commento accanto
alla composizione del corpo (`DevoIntervenire.tsx:693-695`) dice che «*`null` esplicito conta come
presente per quella guardia*», e il **nome** di una prova esistente (`DevoIntervenire.test.tsx`) dice
«*`null` prende 422*». **È vero per DUE motivi su nove e falso per gli altri sette**: la guardia della
rotta è `sceltaGrezza !== undefined && sceltaGrezza !== null` (`eventi-qualita/route.ts:264`), quindi
fuori dal bivio un `null` esplicito **è accettato**.
➡️ **Il comportamento del componente resta quello giusto** (omettere la chiave è più stretto che
mandarla nulla): sbagliata è la ragione, non la scelta. Ho **misurato** il vero in una prova del mio
file (§⑥ del file di contratto) e **non ho toccato** né il commento né il nome dell'altra prova.
🔑 Perché lo scrivo come ritrovamento e non come dettaglio: una ragione falsa costa quanto un difetto —
chi la legge crede di avere una rete che non c'è, e il giorno che serve non scatta.

**2. 🟠 Il ripristino del banco del Task 9 era PARZIALE, e lo dichiarava «identico».** Misurato
sull'`audit_log`: il lavoro `2026/0005` è rimasto `consegnato` con `conformato = false` e le tre date
di consegna a `NULL` — uno stato che nessun percorso dell'app produce. Il §④ del suo resoconto lo dà per
«rimesso identico», e la sua tabella confronta **solo** le quattro righe che aveva scelto di guardare.
🔑 **La lezione è sulla forma della tabella, non sulla svista:** un «prima/dopo» che elenca i campi
scelti da chi ha scritto non può dichiarare «identico». La domanda giusta è **quali colonne ha toccato
il giro**, e la risposta sta nell'`audit_log`, non nella memoria. L'ho riparato (§③) **dichiarandolo**.

**3. 🟠 `SCELTE` resta duplicato** (già riferito dal Task 9): la rotta ne tiene una copia privata a
`eventi-qualita/route.ts:115` accanto a `MOTIVI_CON_SCELTA` in `lib/qualita/effetti.ts`. Il commento
dichiara la duplicazione voluta — sono i *valori*, non i *motivi* — ma **il mio file di contratto ora
importa `SCELTE` da `effetti.ts` e percorre le strade da lì**: se le due liste divergessero, la mia
prova di categoria coprirebbe la copia **sbagliata** senza dirlo. Chi farà crescere il vocabolario deve
toccarle tutte e due.

**4. 🟡 `buoni_consegna` è VUOTA su tutto il laboratorio E2E** mentre `progressivi_anno.buono` è a 7.
Il buono vive sulle colonne del lavoro (`buono_numero`, `buono_pdf_url`, `orchestrate.ts:301-305`), non
in quella tabella — quindi **non è per forza un difetto**, e la causa **non l'ho verificata**: la
scrivo perché una tabella vuota con un progressivo a 7 è il genere di cosa che si scopre tardi.

---

## ⑧ Che cosa NON ho fatto

- **Non ho rifatto il gate estetico L2** (Passo 3): il referto c'è ed è
  `docs/design/screenshots/2026-08-09-devo-intervenire/GATE-L2.md`, con 269 file accanto. **Il mio
  lavoro non lo tocca:** tre file di prove e zero righe di sorgente — nessun token, classe, spaziatura,
  struttura di markup o testo visibile. Sotto **D245** non è ASPETTO, e nemmeno CONTENUTO: non arriva
  nessun dato nuovo a nessuna superficie.
- **Non ho toccato `memory/MEMORY.md`, la roadmap né il verbale** (Passo 4): istruzione esplicita del
  mandato.
- **Non ho fatto girare `errore_registrazione` dal vivo.** La gemella distruttiva è coperta contro la
  funzione viva dalle prove d'integrazione (annullamento **e** causale); un giro a schermo avrebbe
  aggiunto solo il collegamento rotta→RPC, al prezzo di un progressivo bruciato e di un ripristino più
  fragile. Costo dichiarato: il cammino HTTP di quel motivo resta provato solo in finzione.
- **Non ho toccato la rotta** per esportare i tipi del corpo e della risposta (§⑤): è la chiusura
  **di tipo** della categoria, ed è un cambiamento fuori mandato.
- **Non ho esteso il ponte alla seconda rotta** (`/api/eventi-qualita/[id]/valutazioni`, il giudizio):
  nel file di contratto risponde in modo inerte. Lo stesso difetto di categoria può vivere lì.
- **Non ho provato i rami `fallito` e `non_applicabile` attraverso il ponte**: servirebbe far fallire
  apposta una RPC finta, e li coprono già le prove del Task 9.
- **Non ho rimesso a posto le 4 prove rosse preesistenti** di
  `tests/integration/annulla-effetti-storno-td04.rpc.test.ts`: sono di un altro flusso e hanno già la
  loro voce in roadmap.
- **Non ho pubblicato il ramo.** L'ultimo salvataggio è `aefd97ef` più questo resoconto.
