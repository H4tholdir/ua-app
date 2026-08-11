# Referto T7 — «Scheda UI: riga Colore + pastiglia + gesto D212»

**Ramo:** `ondata-b-sessione-3` · **Stato:** ✅ FATTO, con **due limiti dichiarati** e
**quattro rilievi riferiti** (R-E2) che il controllore adjudica.
**Commit:** `550c47c2` (codice) · `244b2d56` (emendamenti spec) · `93b19d5e` (le prove del
giro intero).

---

## 1. La verifica che il brief chiedeva per prima: la VIA DELL'ESEGUITO

> «VERIFICA se esiste una via di scrittura per il colore vivo del lavoro […] SE NON ESISTE
> nessuna via, NON inventarla.»

**LA VIA ESISTE, e non è stata inventata:** `colore_scala`/`colore_codice` sono
in `PATCHABLE_FIELDS` di `src/app/api/lavori/[id]/route.ts:227-228` — **GRUPPO C**,
entrate col Task 12-bis con la loro ragione scritta. La rotta **non copia** il valore
grezzo: lo normalizza col catalogo (`risolviColoreCaso`) prima dell'UPDATE, e risponde col
`updated_at` nuovo (che serve al gettone). Nessuna modifica all'allowlist: non serviva.

**Ma la via NON copre tutti i casi, e i due buchi hanno conseguenze diverse.**

### 1a. Scrive SOLO il DEFAULT DI CASO → limite, e da lì la riga di sola lettura

La precedenza del colore è **riga di dente → default di caso**
(`src/lib/domain/colore-dente.ts`, `risolviColore`). Se una riga di `lavori_denti` porta
una coppia completa, **è lei che si vede**, e scrivere il caso sarebbe — parole del commento
della rotta stessa (`route.ts:437-440`) — «*una seconda verità che nessuno vede*».

**Decisione presa:** quando il colore vivo viene da una riga (`daRiga`), la riga «Colore»
**si vede ma non si tocca** (`RigaDato` nudo, nessun bottone). Stesso principio già in casa
nella stessa scheda (`eliminabile`: «una voce spenta invita comunque»). La via per quei
lavori resta la scheda clinica (`?tab=clinica` → `PUT /api/lavori/[id]/denti`).

🔎 **Quanto pesa davvero:** il wizard scrive il colore **come default di caso**, mai
per-dente (`src/lib/wizard/crea-lavoro.ts:314-318` + `route.ts` `p_denti`). Un lavoro nato
dal wizard — la forma normale — cade quindi nel ramo **modificabile**. Il ramo di sola
lettura si raggiunge solo dopo un passaggio dalla scheda clinica.
➡️ **BLOCKED-parziale da adjudicare:** su quei lavori il gesto D212 non è raggiungibile
dalla scheda. Chiuderlo vorrebbe dire far scrivere a questo foglio anche `PUT /denti`
(payload di tutte le righe) — fuori mandato, e una decisione, non un dettaglio.

### 1b. Il codice fuori catalogo si perde IN SILENZIO → rilievo riferito, non corretto

`risolviColoreCaso` restituisce `scartato: true` quando il codice non è in
`colori_dentali` (`src/lib/api/colore-caso.ts`), **e la PATCH non lo legge né lo rimanda**:
`route.ts:449-453` prende solo la coppia, e la risposta è `{lavoro:{id,numero_lavoro,stato,
updated_at}}`. Un `A3,5` — **la virgola del mockup stesso** — azzererebbe la coppia mentre
l'utente legge «salvato». È la classe «l'utente legge Salvato su un dato che non c'è» che
il commento sopra `PATCHABLE_FIELDS` dichiara di combattere.

🛑 **NON corretto qui (R-E2, dominio critico).** Rete lato client: il foglio controlla
**prima** con `scalaDelCodice` (lo specchio dei 48 codici in `colore-dente.ts`, tenuto
onesto da `tests/unit/colore-dente-idratazione.test.ts`), non manda la PATCH e **lo dice**.
La trascrizione invece si salva **com'è digitata**, sempre (D210): le due cose hanno regole
diverse apposta.

---

## 2. Il punto su cui il brief era ambiguo, e come si è sciolto

> «*Via «Sul foglio c'è scritto X» → route typo (snapshot si aggiorna; il valore VIVO non
> cambia da questa via? NO — attenzione: la via typo CORREGGE LA TRASCRIZIONE; il valore vivo
> del lavoro resta com'è. Rileggi la scena: chi salva stava cambiando il colore della scheda*»

La frase si legge in due modi opposti. **Scelta: la via typo scrive ENTRAMBI** — prima la
rotta typo (trascrizione), poi la PATCH (colore vivo). Le tre ragioni, in ordine di peso:

1. **La Dichiarazione.** Con la sola trascrizione corretta, la DdC stamperebbe
   `prescritto A3.5` / `realizzato A3` **senza nessuna divergenza a registro**: uno
   scostamento muto su un documento a valore legale. La via divergenza esiste proprio per
   non lasciarne.
2. **Le due vie non possono contraddirsi.** Il ramo divergenza aggiorna l'eseguito (lo dice
   il brief); due risposte alla stessa domanda non possono dissentire sul fatto che quello
   che hai digitato abbia effetto.
3. **Il gesto dell'utente.** Ha scritto un colore nel campo «Colore» *del lavoro*. Se la
   risposta «era scritto così» lasciasse fermo proprio quel campo, l'unica cosa che ha
   toccato sarebbe l'unica a non cambiare — e la scheda finirebbe dritta nello stato
   «scostato» (§3, stato e) subito dopo un gesto normale.

⚠️ **Se il controllore legge il brief nell'altro modo**, la modifica è di UNA riga
(`viaTypo`, togliere la chiamata a `scriviColoreVivo`) e un test da riscrivere.

---

## 3. Gli stati della riga (vincolo 0B-5) — sono CINQUE, non quattro

Derivazione pura: `src/lib/lavori/colore-riga-scheda.ts` (`derivaRigaColore`).

| # | Quando | Cosa mostra |
|---|--------|-------------|
| **(a) trascritto** | snapshot col colore, vivo uguale (o vivo assente) | valore + pastiglia verde «✓ dalla prescrizione» |
| **(b) laboratorio** | vivo presente, snapshot **senza** colore | valore + `sub` «scelto dal laboratorio» — segnale **positivo**, nessuna pastiglia |
| **(c) divergente** | divergenze contengono `campo === 'colore'` | realizzato + `sub` «prescritto: A3» (`—` se il vivo manca), **mai** la pastiglia verde |
| **(e) scostato** | vivo ≠ trascritto e **nessuna** divergenza | i due valori insieme, nessuna pastiglia |
| **(d) assente** | niente da nessuna parte | **la riga non compare** |

🔑 **(e) non è nel brief ma è RAGGIUNGIBILE oggi:** il ponte `?tab=clinica` cambia il colore
senza passare per D212. Lì la pastiglia verde asserirebbe una provenienza che il dato non
ha più. Si mostrano i due valori e basta — **senza inventare una divergenza che nessuno ha
registrato**.

**Segnale positivo di (b) — perché `sub` e non una pastiglia quieta:** `TonoPastiglia`
è chiuso a due toni con la nota «*Nessun terzo tono senza una decisione*»
(`CardInfo.tsx:17-21`). Aprirne un terzo è una decisione di design, non di questo task; il
brief ammetteva entrambe le forme («sottotitolo **o** pastiglia quieta»).

**Quando la riga è editabile** (dichiarato come chiesto): sempre, **tranne**
(i) `daRiga` (§1a) e (ii) **DdC attiva** — la query di `page.tsx` filtra
`.neq('ddc.stato','annullata')`, quindi `ddc` presente ⇒ dichiarazione attiva ⇒ entrambe le
rotte risponderebbero `congelata` (V8). Un tocco che torna sempre con un 409 non si offre.
**In (d) la riga non compare, quindi da lì non si può AGGIUNGERE un colore**: resta il ponte
`?tab=clinica`. È il comportamento chiesto dal brief (1d), riferito perché è un vicolo.

---

## 4. Come è fatto il gesto D212

**UN SOLO `Sheet` con tre passi interni** (`passo: 'valore' | 'gesto' | 'motivo'`), mai tre
fogli incatenati. 🛑 Gli overlay v3 tengono **una** entry di history per l'intera pila
(`storia-overlay.ts`) e la disfano con `history.back()` quando la pila si svuota: chiudere
un foglio e aprirne un altro nello stesso commit svuota e riempie la pila, il `back()`
asincrono arriva **dopo** il `pushState` del foglio nuovo e se lo mangia. È la corsa già
pagata due volte su questo ramo (D-2, e il visore che si richiudeva da solo). Un `Sheet` che
resta **aperto** mentre cambia `passo` = una entry sola, e corrisponde al mockup.

**Le scritture, e il loro ORDINE:**
- **typo** → `POST …/prescrizione/typo` `{campo:'colore', valore, atteso_updated_at}` →
  poi PATCH. Il **gettone** è `lavori.updated_at` **stringa opaca** (mai `new Date()`);
  avanza a ogni scrittura riuscita, incluso il ritorno della PATCH (che riscrive
  `updated_at`, quindi il vecchio scade lì).
- **409 `conflitto`** → si legge `updated_at` **dal corpo**, si aggiorna il gettone, **non
  si riprova da soli** (sovrascriverebbe in silenzio la modifica di un altro): si resta sul
  foglio e la seconda pressione riparte col gettone nuovo. Provato.
- **divergenza** → `POST …/prescrizione/divergenza` `{campo, motivo, nota?}` **PRIMA**,
  PATCH dopo. Il verso opposto lascerebbe un colore cambiato senza traccia del perché.
  Nessun `atteso_updated_at` (quella rotta lo rifiuta come chiave ignota). Provato.
- **Riuscite a metà** → si applica **ciò che è avvenuto** e si dice il resto
  («*La trascrizione è corretta. «A3,5» non è un codice del catalogo…*»), mai un «fatto» pieno.
- **`errore` vs `error`:** le rotte della prescrizione rispondono `errore`, la PATCH `error`.
  Nel file si incontrano; da nessuna delle due si legge la chiave sbagliata (provato).

**Testi:** invariati alla lettera dai mockup. Sostituiti solo i **valori dimostrativi**
(«Dr. Colombo», «Studio Bianchi», «A3») coi dati veri del lavoro — nota di fedeltà §4 di
`docs/design/decisions/2026-08-04-ondata-b3-schermate-vere.md`.

**Aggiornamento ottimistico — deviazione DICHIARATA dal pattern esistente (requisito 6).**
Il pattern in casa (`correggiCategoria`, stesso file) applica **subito** e **fa rollback**
se il server rifiuta. Qui si applica **solo dopo il successo del server**, quindi non c'è
niente da annullare. Non è una dimenticanza: con quattro esiti possibili per gesto (typo ok /
409 / catalogo / rete) un colore che salta al valore nuovo e torna indietro sarebbe peggio
di un colore che non si muove finché non è vero — e sulle **riuscite a metà** l'applicazione
parziale (`{trascritto}` senza `{colore}`) è *precisa*, non un ripiego. Chi confronta col
pattern non trovi l'assenza di rollback e la legga come una svista.

**Overlay/navigazione (dichiarato):** **nessuna navigazione aggiunta**. Il messaggio del
caso non scrivibile è **testo, senza link**: un «vai alla scheda clinica» avrebbe richiesto
`useNavigaDaOverlay` e la guardia. Nessun `router.push` nudo, nessun `useNavigaDaOverlay`
nuovo. ➡️ **`scripts/guardia-navigazione-overlay.mjs` NON è stata lanciata** e, per quanto
sopra, non è innescata da questa modifica — resta al controllore, che ha il banco.

---

## 5. Prove

**R-P4 — conteggio sull'abbozzo inerte, MISURATO DUE VOLTE con lo stesso abbozzo:**

| File | Abbozzo inerte | Rosse | misura 1 | misura 2 |
|---|---|---|---|---|
| `colore-riga-scheda.test.ts` | derivazione | **17 su 19** | 17 | 17 ✅ |
| `scheda-v3/scheda-riga-colore.test.tsx` | derivazione | **11 su 12** | 7 su 9¹ | 11 su 12 ✅ |
| `scheda-v3/scheda-riga-colore.test.tsx` | **cerniera** (`handleColoreSalvato`) | **3 su 3**² | 2 su 3 ❌ | 3 su 3 ✅ |
| `scheda-v3/modifica-colore-sheet.test.tsx` | i tre gesti | **17 su 20** | 17 | 17 ✅ |
| **Totale** | | **45 su 51** | | |

¹ il file è cresciuto da 9 a 12 prove **dopo** la misura 1 (v. nota 2): il conteggio è
rifatto sul file finale, non riportato dal vecchio.
² **solo le tre prove del giro intero**, che sono le uniche che quell'abbozzo può toccare.

⚠️ **DUE volte il conteggio ha smascherato un errore MIO, ed è per questo che si misura due
volte:**
- **La prima misura 2 del modulo puro ha dato 10/19: era sbagliata.** Avevo applicato un
  abbozzo *diverso* (parziale) da quello della misura 1. Rifatta con l'abbozzo identico → 17.
- **La prova della via typo PASSAVA con la cerniera inerte** (2 su 3, non 3). Cercava
  «A3.5» mentre il foglio D212 era ancora aperto e lo trovava nel suo prima→dopo, **non
  nella riga**: una prova che non provava niente. Corretta con un'attesa esplicita di
  chiusura del foglio; adesso tutte e tre diventano rosse. **Senza il conteggio sarebbe
  passata inosservata**, perché era verde tanto quanto le altre.

🔑 **La cerniera è stata trovata SCOPERTA in autoreview:** le due metà erano provate — il
foglio chiama `onSalvato` col carico giusto (contro un `vi.fn()`), la riga si disegna giusta
dai suoi dati — ma **nessuna prova girava il cardine in mezzo**, che è esattamente dove vive
il requisito 1(c). Chiusa in `93b19d5e`.

I non-rossi non sono buchi: sono i casi che l'abbozzo soddisfa per caso (la riga assente su
un modulo che torna sempre `null`; «nessuna chiamata partita» su gesti che non fanno niente).

**Le forme d'input enumerate** (R-P4): embed assente (`denti`/`prescrizione` `undefined`) ·
snapshot senza la chiave `colore` (V2) · divergenza su un **altro** campo · divergenza col
campo **fuori dizionario** (`{noto:false}`, che non si spaccia per una vera) · riga di dente
con **mezza** coppia · campo vuoto/soli spazi · codice fuori catalogo · 409 con `updated_at`
nel corpo · corpo di risposta non-JSON (`.json().catch`) · `fetch` che lancia.
**Non coperte, con la ragione:** 401/403/404 delle rotte (mostrano il messaggio del corpo,
percorso identico al 409 già coperto) · doppia pressione rapida sulla stessa via (`salvando`
disabilita i controlli, ma non c'è un test dedicato alla corsa).

**Comandi, output reale:**
- `npx tsc --noEmit` → **0 errori**
- `npx vitest run` (intero) → **408 file passati, 3 saltati · 4795 test passati, 19 saltati, 0 falliti**
- `npx eslint` sui file toccati → pulito (`--max-warnings=0`, girato anche dal pre-commit)
- pre-commit completo (DS compliance · CSRF · reduced-motion · coerenza documenti · backup) → verde

**NON fatto:** collaudo nel browser. Serve un lavoro **con snapshot di prescrizione** e la
sonda che lo cerca in banca dati è stata **negata dal classificatore della sandbox**; il
gate visivo (FASE 9b, 3 viewport × 2 temi) è comunque di fine ondata. **Riferito**, non
dichiarato fatto.

---

### 5-bis. Sulla data dei due emendamenti (§0F)

Le due righe portano **04/08/2026**, che è la data della **DECISIONE** (D225, ratificata il
04/08) — stessa convenzione degli emendamenti già in spec («*Emendamento 30/07/2026 (ondata
(b), D80)*», D80 ratificata il 30/07). Il lavoro è stato scritto a cavallo della mezzanotte:
`provato:` `date` → `Wed Aug 5 00:19:25 CEST 2026`. **Non è la deriva di +2 giorni** che §0F
ha chiuso: chi rilegge non ha trovato un difetto qui.

---

## 6. Rilievi riferiti (R-E2) — fuori mandato, NON corretti

1. **`scartato` non esce dalla PATCH** (§1b). Un colore fuori catalogo si azzera in silenzio
   e la risposta dice 200. Il controllo di T7 è **client**: qualunque altro chiamante della
   PATCH ha ancora il buco. `src/app/api/lavori/[id]/route.ts:449-453`.
2. **§5.10 dice «Max 5 righe per card», la scheda ora ne ha SEI.** Il mockup approvato
   (scena 9) ne mostra sei. `CardInfo` per progetto **non ne nasconde nessuna** e avvisa solo
   chi sviluppa — quindi in sviluppo l'avviso comparirà, ed è giusto che compaia: è un nodo
   di design aperto, non un difetto da mettere a tacere. **Scritto nella spec** come aperto e
   non risolto. Non ho toccato `MASSIMO_RIGHE`: indebolire una legge del DS non è di T7.
3. **Su un lavoro GIÀ divergente, il gesto D212 si ripresenta con un sottotitolo ormai
   falso.** Stato (c): una divergenza sul colore è a registro, l'utente ritocca il realizzato.
   `uguagliaColore(nuovo, trascritto)` è falso → si apre D212 → il sottotitolo dice «*Il
   colore di questo lavoro è trascritto dal foglio di X*», che **non è più vero**. Peggio: la
   via typo, da lì, riscriverebbe la trascrizione lasciando a registro una divergenza che
   punta a una differenza non più esistente. **Segue il brief alla lettera** (il requisito 2
   non prevede l'eccezione «già divergente»), quindi non blocca — ma tocca il registro, cioè
   ciò che la DdC stampa, e il percorso è plausibile, non contorto. **Da adjudicare:**
   probabilmente su (c) il foglio dovrebbe saltare D212 e aggiornare solo il realizzato.
4. **BP-1 non eseguito.** Il commit della spec ha acceso l'avviso della guardia
   («*tocca una SPEC ma NON la memoria*»). `memory/MEMORY.md` e
   `docs/roadmap/ROADMAP-UFFICIALE.md` **non sono stati toccati**: sono file condivisi da
   tutti i task della sessione e R-E1 mi tiene sul mio. **Resta da fare** — al controllore o
   alla chiusura.

---

## 7. File toccati

**Nuovi:** `src/lib/lavori/colore-riga-scheda.ts` ·
`src/components/features/lavori/scheda-v3/ModificaColoreSheet.tsx` ·
`tests/unit/colore-riga-scheda.test.ts` ·
`tests/unit/scheda-v3/scheda-riga-colore.test.tsx` ·
`tests/unit/scheda-v3/modifica-colore-sheet.test.tsx`

**Modificati:** `src/app/(app)/lavori/[id]/page.tsx` (embed `denti` + `prescrizione`,
`normalizzaPrescrizione`) · `SchedaLavoroV3.tsx` (`Campo` += `colore`, la riga,
`RigaEditabile` con `sub`/`pastiglia`, `handleColoreSalvato`) · `ModificaRigaSheet.tsx`
(`Campo` += `colore`, `TITOLI`, delega) · `src/components/ds/CardInfo.tsx` (solo il commento:
la pastiglia non è più «in attesa di ratifica») ·
`docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (§5.10, §7.3).

---

# APPENDICE — Correzioni post-review (05/08/2026)

**Commit:** `88353a3b` · **Mandato:** il Critical e l'Important della review di T7, adjudicati
dal coordinatore. Nient'altro toccato.

## Il difetto, detto una volta sola

`lavori_prescrizioni.divergenze` è **append-only** e finisce nella Dichiarazione di
Conformità. Una voce sbagliata lì **non si cancella e non si corregge: resta per sempre**.
Tre percorsi ne producevano una — «*cambiato per il motivo X*» quando **niente era cambiato**,
oppure una voce che punta a una differenza che non esiste più.

## I tre percorsi chiusi

### ① Valore fuori catalogo → si appendeva comunque
**Era:** con «A3,5» (la virgola — che è il valore del mockup stesso) il flusso appendeva la
divergenza e **solo dopo** `scalaDelCodice` annullava la PATCH. Registro: «cambiato per
esigenza tecnica». Realtà: colore invariato.
**Ora:** il catalogo si controlla **all'ingresso del ramo divergenza** (`vaiAlMotivo`), prima
di qualunque scrittura e prima ancora del passo «Perché cambia?». Messaggio bloccante e
onesto; **nessun append, nessuna PATCH**.
🛑 **La via typo resta libera dal catalogo**, ed è deliberato: lì si scrive la
**trascrizione**, verbatim per D210 — «A3,5» sul foglio è «A3,5» nello snapshot. Provato.

### ② Ordine delle due scritture invertito
**Era:** append → PATCH. **Ora:** **PATCH → append.**
Il criterio non è quale scrittura conti di più, è **quale fallimento si può rimediare**:
- append ok + PATCH fallita → **voce falsa, permanente** su un registro append-only;
- PATCH ok + append fallito → **motivo mancante, riprovabile**.

Fra un buco rimediabile e una bugia permanente si sceglie il buco. Se l'append fallisce dopo
una PATCH riuscita: `onSalvato({colore, updatedAt})` **senza** `divergenza`, messaggio forte
(«*Il cambio è fatto, ma il motivo NON è stato registrato: riprova, o la Dichiarazione
resterà senza la spiegazione*») **più** il messaggio della rotta, e il **foglio resta aperto
sul passo motivo**. Coerente con V9: trasparenza, mai bloccante.

### ③ Da uno stato GIÀ divergente, D212 si ripresentava
**Era:** il foglio si riapriva con un sottotitolo ormai **falso** («*il colore di questo
lavoro è trascritto dal foglio di X*» — mentre una divergenza è già a registro), e da lì la
via typo avrebbe riscritto la trascrizione lasciando **orfana** la divergenza vecchia.
**Ora:** dallo stato (c) **niente D212** — si va dritti al «Perché cambia?» (testi ratificati),
e una **seconda voce** a registro è legittima e vera (la RPC appende a un array).
- Il **prima→dopo** si ripete sul passo motivo, perché il foglio che lo portava non si apre
  più: il «prima» è il **realizzato vecchio**, etichettato `realizzato` (non `trascritto`,
  che è un'altra cosa e sta già nella riga sopra). Etichetta derivata, dichiarata.
- **«Torna indietro»** riporta al campo del valore, non a un foglio mai visto.
- **Due eccezioni, che sarebbero due voci false:** tornare al valore **prescritto** non è
  divergere (è rientrare) → salvataggio semplice; un valore **non cambiato** non è successo
  → salvataggio semplice. Entrambe provate.

## Prove

| Correttivo annullato | Asserzioni che si accendono |
|---|---|
| ① catalogo all'ingresso | **2** |
| ② PATCH prima dell'append | **3** |
| ③ stato divergente → motivo | **5** |

Nessuno dei tre è coperto solo dagli altri: annullato uno per volta, ognuno ha le sue rosse.
`modifica-colore-sheet.test.tsx` passa da 20 a **28** prove.

- `npx tsc --noEmit` → **0 errori**
- `npx vitest run` (intero) → **4806 passati, 19 saltati, 0 falliti** (era 4798)
- `npx eslint --max-warnings=0` sui file toccati → pulito · pre-commit completo → verde

## R-E2 nuovi

1. **«Trascrizione davvero sbagliata su un lavoro già divergente» NON è risolto** — come da
   adjudicazione. Dallo stato (c) la via typo non è più raggiungibile: se la trascrizione
   contiene un refuso vero **e** una divergenza è già a registro, dalla scheda non si corregge.
   È una **questione normativa** (che cosa deve stampare la DdC quando il prescritto cambia
   *dopo* uno scostamento registrato), da portare alla ④ / a Francesco — non da decidere qui.
2. **La finestra fra le due scritture non è atomica**, e non può esserlo dal client: fra PATCH
   e append c'è un istante in cui il colore è cambiato e il motivo non c'è. Con l'ordine
   corretto l'esito peggiore è **rimediabile e dichiarato** (il messaggio lo dice, il foglio
   resta aperto). Chiuderlo davvero vorrebbe dire **una RPC sola** che fa entrambe le cose in
   transazione — decisione di dominio, non di UI.
3. **Il messaggio del catalogo cambia coda a seconda della provenienza** («*…usa l'altra via*»
   solo quando si arriva da D212, dove quella via è sullo schermo). Deviazione minima dal
   testo dato dal coordinatore, dichiarata: da stato (c) l'altra via non esiste, e indicare
   una strada che non c'è è peggio del silenzio.

**Post-scriptum (`2f013a6d`) — la quarta guardia ha la sua prova.** Da stato (c), Salva col
valore INVARIATO non è un evento: nessun «Perché cambia?», nessun append. Il codice lo faceva
già, ma nessuna prova lo teneva — la guardia gemella («torna al prescritto») corto-circuita sul
primo congiunto e non arriva mai al secondo, quindi cancellando `!uguagliaColore(nuovo,
valoreIniziale)` restava tutto verde. ⚠️ **FIX 2 non copre questo percorso**, ed è il punto: la
PATCH con lo stesso valore risponde 200, si arriverebbe all'append e il registro riceverebbe
un cambio mai avvenuto — la voce falsa del Critical da una porta diversa. Mutazione: cancellato
il congiunto → rossa quella prova **e solo quella**; rimesso → verde. File a **29** prove.
