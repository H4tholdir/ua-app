# D333 — le prove d'integrazione si accendono in CI

**Data:** 09/08/2026 · **Ramo:** `intervento-post-consegna` · **File toccati:** `.github/workflows/ci.yml`, `vitest.config.ts`

| cosa | esito |
|---|---|
| La riga | **messa** — `SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}` nel passo «Unit tests» |
| ① Dieci giri in locale | **10 verdi su 10** · `458/458` file · `5809/5809` prove · **zero saltate** · zero deadlock (**+5 verdi** dall'alternanza di §③) |
| ② La CI su GitHub | 🛑 **NON È GIRATA, E NON PUÒ GIRARE DA QUESTO RAMO** — nessun numero di esecuzione da incollare, perché non esiste |
| ③ Tempi (locale) | **accenderle costa: direzione certa, cifra no** (da +6,6 s a +16,7 s). 🔴 Il mandato diceva «non allunga»; 🔴 la mia prima correzione diceva «+9%» ed era misurata male |
| FASE 7 | `VERIFY_EXIT=0` · `458/458` · `5809/5809` · zero saltate |
| 🛑 Aspetta Francesco | **una scelta su come far partire la CI** (§②-bis) e **la conferma che il segreto sia il pooler** (§②-ter) |

---

## ① I dieci giri in locale — col numero vero

```
cd "…/ua-app" && set -a && . ./.env.local; set +a && npx vitest run     (dieci volte)
```

| giro | esito | file | prove | durata |
|---|---|---|---|---|
| 1 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 40,08 s |
| 2 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 42,85 s |
| 3 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 54,79 s |
| 4 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 57,19 s |
| 5 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 52,91 s |
| 6 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 52,83 s |
| 7 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 51,83 s |
| 8 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 50,80 s |
| 9 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 50,37 s |
| 10 | ✅ exit=0 | 458 passed (458) | 5809 passed (5809) | 50,45 s |

**Il numero atteso dal mandato è il numero vero: 458 file su 458, 5809 prove su 5809, zero saltate, dieci volte su dieci.**

**Due controlli in più, perché «dieci verdi» da solo si legge male.** Il conteggio «458 passed» non nomina i saltati, quindi «zero saltate» va provato da un'altra porta invece che dedotto dall'assenza:

```
provato:  grep -il "skipped"  giro-*.log   →  NESSUN log contiene 'skipped'
provato:  grep -il "deadlock" giro-*.log   →  NESSUN log contiene 'deadlock'
```

🔑 **`5809 = 5725 + 84`**: le 84 prove che finora si saltavano da sole sono esattamente quelle accese. Il difetto chiuso ieri (l'ordine dei lucchetti in `torna-a-pronto.rpc.test.ts`) **regge anche nella piscina piena** — cioè con i 7 file d'integrazione mescolati ai 451 unitari, che è la concorrenza in cui il referto precedente **non** aveva potuto misurare oltre i tre giri.

---

## ② 🛑 La prova che conta davvero NON si è potuta fare — e non è un intoppo, è un fatto di configurazione

**`.github/workflows/ci.yml` non si accende su questo ramo.** Non è un'opinione tratta leggendo il file: è misurata tre volte, e la terza è la prova col valore che DEVE essere rifiutato (R-P1).

**1. I filtri, letti da un parser e non a occhio:**

```
provato:  python3 -c "import yaml; …" .github/workflows/ci.yml
   →  TRIGGERS: {"push": {"branches": ["main", "develop"]},
                 "pull_request": {"branches": ["main"]}}
```

`intervento-post-consegna` non è `main`, non è `develop`, e non è una richiesta di unione verso `main`. **Non corrisponde a niente.**

**2. Quante volte la CI è girata su questo ramo, da sempre:**

```
provato:  gh run list --branch intervento-post-consegna --limit 10
   →  (nessuna riga)
```

**3. E non la si può avviare a mano** — `ci.yml` non ha `workflow_dispatch`:

```
provato:  gh workflow run ci.yml --ref intervento-post-consegna
   →  could not create workflow dispatch event: HTTP 422:
      Workflow does not have 'workflow_dispatch' trigger
```

**Il ramo è stato pubblicato lo stesso** (D296: un ramo si pubblica volentieri, è la copia di sicurezza fuori dal computer), e dopo il push il conteggio delle esecuzioni **è rimasto zero**: §②-quater.

### ②-bis — Le tre strade per farla partire, e perché NON ne ho presa nessuna

| strada | funziona? | perché non l'ho fatta |
|---|---|---|
| **Aprire una richiesta di unione verso `main`** | sì (`pull_request` corrisponde) | ⚠️ Il repository è **pubblico**, e `deploy.yml` parte su `workflow_run` della CI. Il filtro `branches: [main]` di `workflow_run` guarda il ramo di **partenza** (`head_branch`), che sarebbe `intervento-post-consegna` — quindi **quasi certamente** non pubblicherebbe. **«Quasi certamente» non è una cifra che si spende su uachelab.com**, e il mandato dice che l'ondata non è finita. Fuori mandato. |
| **Spingere il ramo anche su `develop`** | sì (`develop` è nei filtri) | `develop` **non esiste** sul server: la creerei io, con dentro un ramo di lavoro. È un nome convenzionale, permanente e visibile su un repository pubblico — una decisione di Francesco, non mia. |
| **Aggiungere il ramo ai filtri di `ci.yml`** | sì | Sarebbe una modifica da rimettere a posto subito dopo, e lo stato rimesso a posto **non sarebbe provato da niente**. In più il mandato dice «aggiungi UNA riga». |

➡️ **Questo è esattamente il caso ③ del mandato** («fermati e riferisci»), traslato: l'ostacolo non è che i server di GitHub non raggiungano il database — è che **da questo ramo i server di GitHub non partono affatto**. Non è un ostacolo da aggirare a tentativi: è una cosa che deve sapere Francesco, e la decisione è sua.

🛑 **E c'è una scadenza dentro questa scelta, che è la ragione per cui non è una decisione da rimandare.** Se non si prende **nessuna** delle tre strade, la prima volta in assoluto che questa CI girerà con l'integrazione accesa sarà **al merge su `main`, a fine ondata**. Cioè: se il segreto è nella forma sbagliata (§②-ter), il rosso arriva **su `main`** — il ramo dove un rosso costa di più — e `deploy.yml`, che parte su `workflow_run` con `if: conclusion == 'success'`, **non pubblicherà**. Il rischio non è spalmato su qualche tentativo: è **concentrato tutto nell'istante del merge**.

🔑 **Il rovescio utile: tutte e tre le strade della tabella provano il segreto PRIMA di `main`** — la richiesta di unione lo prova via `pull_request`, `develop` via `push`, l'allargamento dei filtri direttamente su questo ramo. Qualunque delle tre trasforma un «lo scopriremo al merge» in un «lo abbiamo scoperto adesso».

### ②-ter — E resta un secondo pezzo che solo la CI vera può retirare

Il segreto **esiste** su GitHub, e la data dice che l'ha messo Francesco stamattina:

```
provato:  gh secret list
   →  SUPABASE_DB_URL     2026-08-09T10:03:40Z
```

🛑 **Ma il valore di un segreto non è leggibile, per costruzione.** Quello che ho sotto mano è **la mia copia locale**, e ha la forma giusta:

```
provato:  lettura di .env.local (solo la forma, mai la credenziale)
   →  protocol: postgresql:   host: aws-0-eu-west-1.pooler.supabase.com
      port: 6543              user: postgres.iagibumwjstnveqpjbwq
```

🔑 **Perché la forma è la cosa importante, e non un dettaglio — e qui la misura c'è, perché è la riga su cui poggia tutto il rischio di questo referto e non poteva restare un ragionamento (R-P1):**

```
provato:  dig +short db.iagibumwjstnveqpjbwq.supabase.co A
   →  (vuoto)                                        ← NESSUN indirizzo IPv4

provato:  dig +short db.iagibumwjstnveqpjbwq.supabase.co AAAA
   →  2a05:d018:1701:d200:9d3c:def1:a507:b2c2        ← solo IPv6

provato:  dig +short aws-0-eu-west-1.pooler.supabase.com A
   →  52.209.89.87 · 34.241.16.247 · 108.128.216.176 ← tre indirizzi IPv4
```

La forma **diretta** del nostro progetto — `db.<progetto>.supabase.co:5432` — **non ha proprio un indirizzo IPv4**, e i server di GitHub non hanno IPv6. La forma del **pooler**, quella che ho in locale, ne ha tre. ➡️ **Se il segreto su GitHub è stato incollato nella forma diretta invece che in quella del pooler, i server di GitHub non arriveranno mai al database**, e cadranno **tutte e 84 le prove insieme**. È il modo di sbagliare che il passo ② esisteva per escludere, ed è rimasto **non escluso**.

**Tre modi di rompersi, invece, li ho tolti di mezzo qui:**
- `pg` è una dipendenza dichiarata (`dependencies: ^8.22.0`) ed è nel lockfile → `npm ci` la installa. Non è un pacchetto che ho solo io.
- Le prove d'integrazione **non chiedono nient'altro all'ambiente**: `provato:` `grep -rn "process\.env\." tests/integration/` → **due sole righe, entrambe `SUPABASE_DB_URL`** (`helpers/pg-client.ts:9,20`). Nessun client Supabase, nessuna chiave di servizio: `provato:` gli unici `import` di tutta la cartella sono `pg`, `vitest`, `node:crypto` e il proprio helper.
- Un segreto **non viene passato** alle richieste di unione che arrivano da una copia esterna del repository, quindi «pubblico» non vuol dire «la credenziale del banco è alla portata di chiunque apra una PR». ⚠️ Resta però una scelta consapevole da tenere a mente: **una credenziale diretta al database vive ora nella CI di un repository pubblico**, ed è il motivo per cui il commento in `pg-client.ts:5-8` la distingueva dalle chiavi REST già in uso.

### ②-quater — Il push è avvenuto, e il conteggio è rimasto a zero

**Non è un ragionamento: è la stessa domanda fatta al server DOPO aver pubblicato.** Commit `eeb7701b`.

```
provato:  git push origin intervento-post-consegna
   →  To https://github.com/H4tholdir/ua-app.git
         1af2d0b6..eeb7701b  intervento-post-consegna -> intervento-post-consegna

provato:  (25 s dopo)  gh run list --branch intervento-post-consegna --limit 10
   →  (nessuna riga)

provato:  gh run list --limit 5        # tutto il repository, non solo il ramo
   →  perf-budget   main  schedule     31298122302  2026-08-09T06:05:46Z
      perf-budget   main  schedule     31243081295  2026-08-08T06:03:55Z
      perf-budget   main  schedule     31154909177  2026-08-07T06:42:45Z
      CD — Deploy   main  workflow_run 31091991804  2026-08-06T10:07:46Z
      CD — Deploy   main  workflow_run 31091930471  2026-08-06T10:06:53Z
```

**La cosa più recente successa su questo repository è la misura di prestazioni programmata delle 06:05 di stamattina.** Il push delle 13:29 non ha prodotto niente: nessuna CI, e — di conseguenza — **nessun Vercel**.

```
provato:  git ls-remote origin refs/heads/intervento-post-consegna refs/heads/main
   →  eeb7701b…  refs/heads/intervento-post-consegna     ← il lavoro è al sicuro fuori dal Mac
      7427a680…  refs/heads/main                         ← invariato, non l'ho sfiorato
```

🔑 **Questo elenco vuoto È la risposta al punto ②, non la sua mancanza.** Il numero di esecuzione che il mandato chiedeva di incollare non esiste, e ora si sa perché.

---

## ③ I tempi, prima e dopo — e qui il mandato ha un numero sbagliato

### 🔴 Prima correzione a me stesso: la mia prima misura era confusa quanto quella che stavo correggendo

**Avevo scritto «+4,3 s, il 9%», e quel numero non regge.** Avevo confrontato **due serie di fila** — dieci giri accesi, poi tre spenti — e in una serie sequenziale la macchina deriva: i miei due giri più veloci in assoluto erano **accesi** (40,08 e 42,85 s), cioè più rapidi di *tutti* gli spenti. Un costo fisso non può fare questo. E i due giri accesi più lenti circondano le **13:14:31**, l'istante in cui l'altra sessione ha committato e ha fatto girare `eslint` sulla stessa macchina. **Stavo indicando il mandato per un confronto fra cose non confrontabili (§④.2) mentre ne facevo uno anch'io.**

**L'ho rifatto alternando** — acceso, spento, acceso, spento, cinque volte ciascuno: l'alternanza annulla la deriva, perché ogni coppia vive nello stesso minuto.

| coppia | acceso | spento | differenza |
|---|---|---|---|
| 1 | 41,60 s | 49,66 s | **−8,06 s** (acceso più veloce!) |
| 2 | 82,16 s | 51,42 s | +30,74 s |
| 3 | 66,43 s | 46,83 s | +19,60 s |
| 4 | 60,01 s | 38,85 s | +21,16 s |
| 5 | 58,25 s | 38,32 s | +19,93 s |
| **media** | **61,69 s** | **45,02 s** | **+16,67 s (+37%)** |

**Su tutti e 23 i giri della giornata:** mediana accesa **52,83 s** contro spenta **46,28 s** → **+6,6 s**. Le due stime — +6,6 s di mediana e +16,7 s di media alternata — non coincidono, **e la loro distanza è essa stessa il risultato**: gli spenti sono stabilissimi (45,0 e 46,1 s di media in due serie diverse), gli accesi ballano fra 41,6 e 82,2 s, cioè **il doppio da un giro all'altro**. È la firma di un lavoro dominato dall'attesa di rete verso un database remoto, non dalla CPU.

### La cosa che invece si separa in modo netto

L'orologio da parete si sovrappone; **il tempo speso *dentro* le prove no.** È la sotto-misura `tests` che vitest stampa, e su **23 giri su 23 non c'è un solo punto di sovrapposizione**:

| | valori | minimo | massimo |
|---|---|---|---|
| **acceso** (15 giri) | 170,0 · 172,0 · 175,0 · 205,5 · 206,3 · 206,3 · 206,4 · 208,3 · 210,6 · 212,4 · 218,9 · 225,3 · 237,0 · 252,3 · 304,7 | **170,0 s** | 304,7 s |
| **spento** (8 giri) | 126,5 · 128,9 · 152,8 · 155,5 · 157,9 · 162,3 · 162,4 · 163,2 | 126,5 s | **163,2 s** |

**Il minimo degli accesi (170,0 s) sta sopra il massimo degli spenti (163,2 s).** ➡️ **La suite fa dimostrabilmente più lavoro** — il che era ovvio (84 prove in più che parlano con un database), ma ora è misurato invece che dedotto.

### Che cosa si può dire, e che cosa no

- ✅ **Accenderle costa.** Direzione confermata da ogni aggregato: mediana, media alternata, e la separazione netta del tempo dentro le prove.
- 🛑 **Quanto costa, NON lo so dire con un numero solo.** Le stime vanno da +6,6 s a +16,7 s sul mio Mac, e la variabilità di un singolo giro (41-82 s) è più grande della differenza che sto misurando. **Chiunque citi una cifra sola da questo referto la sta citando male.**
- 🛑 **E sui server questa misura non esiste**, perché la CI non è girata. Lì la latenza verso il database in Irlanda è un'altra, ed è proprio la latenza a dominare. ⚠️ Va però detto: se il costo vero fosse dalle parti dei **+17 s alternati** invece che dei +6,6 s di mediana, il passo di prove passerebbe da ~45 s a ~62 s, **un terzo in più** — non un dettaglio, ma neanche una cifra che cambi la decisione: 84 prove che parlano col database valgono largamente venti secondi di CI.

**FASE 7** — `npm run verify:full`, con l'integrazione accesa:

```
 Test Files  458 passed (458)
      Tests  5809 passed (5809)
   Duration  58.81s

✓ Compiled successfully in 3.3s        (next build)
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde — ogni route mutante verifica l'origine, o è esclusa con una ragione scritta
✅ reduced-motion: niente si sposta a preferenza accesa, tutto arriva a riposo
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto, e la rete di sicurezza è recente
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti
✅ verifica «full» registrata (.claude/state/ultima-verifica)
VERIFY_EXIT=0
```

📌 **E i cinque giri «acceso» dell'alternanza sono cinque conferme in più di §①**: `Tests 5809 passed (5809)`, zero saltate, cinque volte su cinque. **Fanno 15 giri accesi verdi in totale, oltre alla FASE 7.**

**FASE 7** — `npm run verify:full`, con l'integrazione accesa:

```
 Test Files  458 passed (458)
      Tests  5809 passed (5809)
   Duration  58.81s

✓ Compiled successfully in 3.3s        (next build)
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde — ogni route mutante verifica l'origine, o è esclusa con una ragione scritta
✅ reduced-motion: niente si sposta a preferenza accesa, tutto arriva a riposo
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto, e la rete di sicurezza è recente
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti
✅ verifica «full» registrata (.claude/state/ultima-verifica)
VERIFY_EXIT=0
```

---

## ④ 🔴 Dove questo mandato sbaglia

**1. 🛑 Il difetto grosso: «Pubblica e guarda l'esito reale» dà per scontato che pubblicare il ramo faccia partire la CI. Non la fa partire.** Il mandato prescrive `gh run list`, `gh run watch`, `gh run view --log-failed` — tre strumenti che presuppongono un'esecuzione che non nascerà mai, perché i filtri di `ci.yml` non contengono questo ramo e il workflow non è avviabile a mano (§②). **E il mandato vieta esplicitamente l'unica strada che resta**: `main`. ➡️ Il passo ② non era eseguibile dentro il mandato, e il mandato non poteva accorgersene perché **la riga sui filtri di `ci.yml` non è mai stata guardata**: il brief cita `ci.yml:33-37`, cioè il passo «Unit tests», e le righe 3-7 dello stesso file — quelle che decidono *se* quel passo gira — non compaiono. 🔑 **È lo stesso modo di sbagliare del difetto del referto precedente: si guarda il punto giusto del file giusto, e non si guarda se quel file viene mai eseguito.**

**2. «Accenderle non allunga» poggia su un confronto fra due cose diverse — e la mia prima correzione poggiava su un confronto storto pure lei.** Il mandato mette «47-60 s» contro «64 s», e le due cifre vengono da due comandi diversi: la prima da `npx vitest run` da solo, la seconda dalla FASE 7 con l'integrazione spenta — cioè `verify:full`, che prima di vitest fa girare anche `tsc` e `eslint`. **A parità di comando il segno si rovescia: accenderle allunga** (§③). ⚠️ **Ma la mia prima cifra — «+4,3 s, il 9%» — era a sua volta il frutto di due serie messe una dopo l'altra**, dove la deriva della macchina e il commit dell'altra sessione entravano nel conto; rifatta **alternando**, la differenza sale a +16,7 s medi, e la mediana su 23 giri dice +6,6 s. **La direzione è certa, il numero no**, e in §③ ho smesso di darne uno solo. 🔑 **Questo è il difetto n. 4 del referto di ieri che si ripete a una generazione di distanza**: un marchio che copre la premessa mentre la conclusione parte da sola verso il compito successivo. Ci sono ricascato dentro io, nello stesso documento in cui lo stavo indicando.

**3. «Il segreto è già inserito su GitHub» è vero come nome e falso come garanzia.** Che il segreto **esista** l'ho verificato (`gh secret list`, ore 10:03 di oggi). Che **funzioni** no, e non è verificabile da qui: il valore di un segreto non si legge. Il mandato tratta la sua esistenza come il pezzo difficile e la corsa della CI come conferma; in realtà **l'esistenza era il pezzo facile**, e l'unica cosa che poteva retirare il rischio della forma diretta contro pooler (§②-ter) è proprio il passo che non si è potuto fare.

**3-bis. E «una riga» sono diventate cinque — lo dichiaro invece di lasciarlo scoprire dal diff.** In `ci.yml` ho aggiunto **la riga direttiva** chiesta dal mandato **più quattro righe di commento** che dicono perché esiste e dove sta il meccanismo (`vitest.config.ts`, `pg-client.ts:9`). Non cambia niente di ciò che la CI esegue — YAML, sono commenti — ma il mandato diceva «una riga» e le righe sono cinque. ⚠️ **E in quelle quattro righe ho subito piantato un difetto mio:** il commento rimandava a `vitest.config.ts:31-35`, numeri che la mia *stessa altra modifica* aveva già spostato a **35-39** allungando il commento lì accanto. `provato:` `sed -n '35,39p' vitest.config.ts` → è il blocco `include:`. Corretto. 🔑 **È la famiglia di difetto che questo repository si è già visto** (`generate-ddc.ts:99-108`, «*numero di riga corretto il 07/08/2026: diceva 85-95*») — e l'ho prodotto a quattro righe di distanza dalla modifica che lo invalidava, nella stessa sessione.

**4. «Aggiungi una riga» ne lasciava indietro una seconda, e sarebbe rimasta falsa.** Il commento di `vitest.config.ts:25-30` — quello che il mandato cita come prova che una riga basta — **dice** che in CI le prove d'integrazione «*si saltano da sole senza SUPABASE_DB_URL*». Dal momento in cui la variabile entra nell'ambiente, quella frase descrive un mondo che non esiste più, **nel file che chi verrà dopo leggerà per capire come gira la CI**. L'ho riscritto: non è una correzione fuori mandato (R-E2), è una falsità che avrei introdotto io.

**5. «Tre è proprio la cifra che ha ingannato la misura precedente» è un buon avvertimento montato su un fatto storto.** La misura ingannata dai tre giri era quella di `tests/integration` **da solo**; i tre giri del referto di ieri (§⑨) erano invece già sulla suite intera, ed erano dichiarati come insufficienti dall'autore stesso. Non cambia niente di operativo — i dieci giri andavano fatti e li ho fatti — ma il pericolo non era «ripetere l'errore di ieri»: era misurare in una concorrenza diversa da quella vera, ed è la ragione per cui i dieci giri di §① valgono, mentre dieci giri su `tests/integration` da solo non sarebbero serviti a molto.

**Dove il mandato ha ragione, e conviene dirlo.** «Una configurazione di CI non è provata finché non è girata sui server veri» è **esattamente** il principio giusto, ed è ciò che rende questo referto onesto invece che rassicurante: la riga è messa, in locale è verde dieci volte, e **non è provata**. La cifra attesa (458/5809/zero saltate) era giusta al numero. E il divieto di `--no-file-parallelism` e `retry` regge alla prova: dieci giri con i 7 file d'integrazione mescolati ai 451 unitari, zero rossi, zero deadlock — non serve nessuna delle due, confermato anche nella piscina piena.

**Un rischio nuovo che nessuno dei due referti nomina, e che vive solo in CI.** In locale gira **una** suite alla volta. Sui server no: due esecuzioni contemporanee (una spinta su `main` e una richiesta di unione, per dire) userebbero **lo stesso database di prova** e **lo stesso `LAB_A = 00000000-…-0001`**, quindi il doppio delle transazioni sulla stessa riga `dashboard_kpi_cache[LAB_A]` descritta nel referto di ieri. Non è un deadlock — il cerchio è chiuso e l'ordine dei lucchetti è unico per tutti — ma è **attesa in coda**, e con abbastanza contemporaneità può diventare un `timeout` di vitest, che è un rosso dall'aria completamente diversa. **Non misurato, e non misurabile senza far girare la CI due volte insieme.** Se un giorno la CI diventa rossa a intermittenza solo quando si spingono due cose insieme, la prima cosa da guardare è questa riga.

---

## ④-bis — L'albero condiviso: niente in attesa di altri, ma il push ha portato su un commit non mio

`git status` prima di ogni salvataggio non ha mai mostrato file in attesa che non fossero i miei, e ho usato `git add <percorsi>` con i tre percorsi scritti a mano. **Ma la sessione viva ha comunque lasciato una traccia, in un modo che `git status` non poteva mostrare: ha COMMITTATO mentre lavoravo.**

```
provato:  git show --stat 3941b787
   →  2026-08-09 13:14:31 +0200 · Francesco Formicola
      docs(piano): l'avviso al dentista — dieci task, con il cancello del mockup…
      docs/…/plans/2026-08-09-avviso-al-dentista.md | 419 +++++
      1 file changed, 419 insertions(+)
```

Le 13:14:31 cadono **dentro il mio secondo giro** dei dieci. Il mio commit `eeb7701b` è nato sopra il suo, e **`git push` ha quindi portato sul server anche `3941b787`** — l'intervallo lo dice: `1af2d0b6..eeb7701b`, non `3941b787..eeb7701b`.

**Tre conseguenze, tutte innocue, e le scrivo perché innocue lo sono qui e non in generale:**
- **Le misure tengono:** è un documento nuovo, 419 righe aggiunte e nient'altro. Nessun file sorgente, nessuna configurazione, nessuna prova. Non poteva spostare né i conteggi né i tempi.
- **Il mio commit non contiene lavoro altrui:** i tre percorsi erano espliciti, e il suo lavoro era già un commit, non roba in attesa.
- **Il push l'ha pubblicato:** è un ramo, cioè la copia di sicurezza fuori dal Mac (D296), ed è lavoro di Francesco che va lì comunque. ⚠️ Ma vale la pena saperlo: **`git add <percorsi>` protegge il proprio commit, non il proprio push** — un push porta su tutta la catena, e in un albero condiviso la catena può contenere il lavoro di qualcun altro, anche se `git status` è pulito.

---

## ⑤ Che cosa NON ho fatto

- **Non ho toccato `main`**, in nessun modo: nessuna unione, nessuna spinta, nessuna richiesta di unione aperta. Vercel non è partito.
- **Non ho aperto una richiesta di unione** e **non ho creato il ramo `develop`**: sono le due strade che avrebbero fatto partire la CI, ed entrambe sono decisioni di Francesco su un repository pubblico (§②-bis).
- **Non ho aggiunto `--no-file-parallelism`, né `retry`, né `testTimeout`**, e non ho separato le prove d'integrazione in un passo suo. Dieci giri dicono che non serve.
- **Non ho toccato `vitest.config.ts` nella sostanza**: la modifica è di solo commento, non una riga di configurazione (§④ punto 4). `include`, `pool` e `fileParallelism` sono come erano.
- **Non ho aggiunto `workflow_dispatch` a `ci.yml`** — è la modifica che renderebbe la CI avviabile a mano in futuro, ma **non avrebbe aiutato oggi**: GitHub la riconosce solo quando quel trigger esiste già sul ramo predefinito, cioè `main`. Va con la prossima unione, se Francesco la vuole.
- **Non ho verificato il valore del segreto su GitHub**: non è leggibile (§②-ter).
- **Non ho misurato la contemporaneità in CI** né il tempo della CI sui server: la CI non è girata. **E non do una cifra sola per il costo in locale**, perché i miei stessi giri non la reggono (§③).
- **Non ho corretto `trg_refresh_dashboard`**, il difetto di produzione riferito ieri (R-E2): resta aperto e resta fuori da ogni mandato finora.
- **Non ho toccato** `memory/MEMORY.md`, la roadmap né il verbale.
- I dieci giri, i tre giri «prima» e i log stanno nella cartella temporanea della sessione, **fuori dal repository**, e non sono stati committati.
