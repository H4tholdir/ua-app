# BRIEF — Task C del piano «Correggi e rifai la dichiarazione»

**La rotta che riceve le correzioni. Il contratto SQL è FERMO: tre migration, tre revisioni.**

**Piano:** `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md` — sezione
**«Task C»** per intero (le voci **C0-C3**, le misure **P13-P17 + P16-bis**, e i Passi 1-7).
🛑 **Prima di tutto:** `.superpowers/sdd/atto-unico-task-c-ter-review.md`, **§12** — è la lista di ciò
che il contratto SQL impone a questa rotta, misurata voce per voce e **col grado di prova accanto**.
Quella lista è la spina dorsale del tuo compito.
**Ramo:** `intervento-post-consegna` (in checkout, albero pulito). 🛑 **MAI un git worktree.**
**Base:** `b6b9592c`. **Task A · B · C-bis · C-ter sono COMPLETI** e non si rifanno.

📌 **QUESTO TASK NON HA MIGRATION.** Niente `date -u`, niente `db push`, niente FASE 6b. **Il contratto
non si tocca più:** se ti serve cambiarlo, **ti fermi e riferisci** — sarebbe un quarto compito SQL, e la
ragione per cui l'abbiamo separato è proprio che chi scrive il consumatore non pieghi il contratto.

---

## 🔴 IL COMPITO IN UNA FRASE

Oggi `POST /api/lavori/[id]/dichiarazione/riemetti` rifà il documento **identico**, perché ricopia i dati
da una riga che nessuno ha potuto correggere. Deve poter ricevere **le correzioni** e passarle all'atto
unico, che le applica e rifà il documento **in una transazione sola**.

🛑 **Si ESTENDE, non si riscrive.** La rotta ha già CSRF, autenticazione, guardia sul laboratorio, 404 su
UUID storto, caricamento del lavoro con gli stessi embed della consegna, e la guardia sul motivo
(`effettoDaMotivo(motivo).documento !== 'riemetti'`). **Tutto questo resta.**

---

## 🛑 LE OTTO COSE CHE IL CONTRATTO TI IMPONE

Vengono dalla revisione del C-ter, che le ha **misurate una per una**. Ordinate per quanto costa
sbagliarle.

### 1. 🔴 TREDICI CASI CONDIVIDONO `P0001`, e nove sono colpa tua mentre quattro sono guasti

**Non puoi smistare per SQLSTATE.** Nove `P0001` nascono da un chiamante sbagliato e succedono **prima
di ogni scrittura** → **400**. **Quattro succedono DOPO l'annullo** — annullo fallito, penna dei denti
non-`ok`, penna della prescrizione non-`ok`, chiavi non atterrate — e sono **guasti interni** → **500**.

➡️ **Devi decidere come separarli e scriverlo**: un prefisso nel messaggio, oppure una
`RAISE … USING ERRCODE` diversa. 🛑 Se scegli la seconda **ti fermi e riferisci**, perché tocca il
contratto. 🔑 **Perché conta:** tradurre un guasto interno in un 400 dice all'odontotecnico **che ha
sbagliato lui**, mentre l'app si è rotta.

### 2. 🔴 SEI ESITI ARRIVANO COME JSON, NON COME ERRORE

`non_trovato` · `conflitto` (porta l'`updated_at` fresco) · `evento_non_valido` · `paziente_non_valido` ·
`senza_prescrizione` · `nessuna_dichiarazione_viva`.

🛑 **Una rotta che guarda solo `error` li tratta come SUCCESSO.** È il difetto peggiore possibile su
questo documento: dichiarare «rifatta» quando non è successo niente. L'idioma giusto è già in casa —
`generate-ddc.ts:477-487` (fail-closed su ogni esito non riconosciuto) e `denti/route.ts:150-163`.

### 3. 🔴 `riga` NON SI PUÒ PASSARE COSÌ COM'È

`costruisciDichiarazione` mette **`numero_ddc`** (`generate-ddc.ts:234`) e **`stato`** (**`:323`**) —
entrambi ora **rifiutati** con `P0001`. ➡️ Vanno **tolti** prima di chiamare.
⚠️ **`anno_ddc` e `progressivo_ddc` (`:235-236`) restano TUTTE E DUE**: la coppia è indivisibile, una
sola dà `P0001`, nessuna dà `23505`.
📌 E il **numero** si prende da quello che **torna la RPC**, non si ricalcola: il formato vive in due
posti (`generate-ddc.ts:226` e la RPC) e si muovono insieme.

### 4. 🟠 `CAMPI_CORREGGIBILI_DOCUMENTO` — otto nomi, e **`{}` non è rifiutato dal database** (C2)

Otto chiavi: sei su `lavori` (`richiedente_nome` · `paziente_id` · `paziente_nome_snapshot` ·
`numero_prescrizione` · `tipo_dispositivo` · `descrizione`) e due alle penne — `denti_coinvolti` è un
**array di oggetti** `{fdi, ruolo}` (**non** di stringhe: la forma della colonna è una trappola già
pagata), `prescrizione_caratteristiche` è un **oggetto**.

🛑 **Il database accetta `p_correzioni = {}` e torna `ok`**, riemettendo senza correggere niente. E
`provato:` dalla revisione del Task B: una chiamata con `denti_coinvolti: []`, `paziente_id: null` e
stringhe vuote **ha svuotato cinque campi** con `esito: ok`.
➡️ **È il Task C a chiuderlo, con UNA regola sola, non tre casi speciali.**
⚠️ **D242, il precedente già pagato:** uno snapshot **vuoto** vince sul nome vivo e stampa
**un'identificazione paziente assente** su un documento di legge.

### 5. 🟠 LA VALIDAZIONE DEL LABORATORIO STA **PRIMA** DEL RENDER

Il PDF si rende e si carica **prima** della transazione (`generate-ddc.ts:457-460`, scelta dichiarata: è
ciò che permette alla transazione di esistere). ➡️ Se validi dopo, **un documento col paziente di un
altro laboratorio resta su Storage anche dopo il rollback**.
📌 **Costo da dichiarare, non da nascondere:** un `conflitto` costa comunque **un file orfano e un
progressivo bruciato**. Accettabile — ma **il messaggio del 409 dev'essere onesto**.
🔑 E l'idioma del tenant è già in casa: `denti/route.ts:129-130` — `laboratorio_id` e `lavoro_id` nel
corpo **si ignorano**, si derivano da sessione e URL. **Il client non sceglie il proprio tenant.**

### 6. 🟠 IL GETTONE ARRIVA DAL CORPO, E NON SI RICONVERTE MAI

`p_atteso_updated_at` viene dal `req.json()` (modello: `denti/route.ts:104-111`), **obbligatorio**: il
contratto è «*i valori che hai visto sono ancora quelli*».
🛑 **Mai un `new Date(...)`**: `timestamptz` è al **microsecondo**, `Date` di JS al **millisecondo** — un
solo riparsing tronca e dà **409 permanente**, che nemmeno ricaricando si sana (`:88-93`).
⚠️ La stringa vuota si rifiuta con **422**, o diventa un `22007` → 500 illeggibile.
📌 `p_atteso_updated_at = NULL` **spegne** il controllo: non mandarlo mai nullo.

### 7. 🟠 LA PORTA D'INGRESSO STA SULL'**EVENTO**, ed è portante

Esiste già una dichiarazione con `annullata_da_evento_id = evento_id`? → **restituisci quella**.
🛑 **Mai** una porta su «esiste una dichiarazione viva»: quella è vietata alla riemissione
(`generate-ddc.ts:378-392`) e restituirebbe **il documento vecchio** dicendo «rifatto».
📌 Da C3 è **portante**, non una comodità: `23505` ora vale **tre vincoli**
(`ddc_evento_annulla_unique` · `ddc_sostituisce_unique` · quello della coppia anno+progressivo) →
**ramifica sul NOME**, mai sul solo codice. ⚠️ **Misura PRIMA dove PostgREST mette quel nome**
(`message` / `details` / `hint`): una sonda sola te lo dice, e senza la traduzione nasce su un'assunzione.

### 8. 🔵 DODICI CHIAVI SONO ACCETTATE E IGNORATE IN SILENZIO

`id`, `laboratorio_id`, `lavoro_id`, `sostituisce_id`, `created_at`, `updated_at`,
`annullata_da_evento_id`, `firmata_at`, `firma_digitale_url`, `inviata_al_dentista`,
`inviata_al_dentista_at`, `deleted_at`. **La rotta non deve fondarsi su nessuna di esse.**

---

## 📋 I PASSI (piano, sezione «Task C»)

1. **Leggi la rotta per intero** e scrivi nel resoconto che cosa fa oggi.
2. **`CAMPI_CORREGGIBILI_DOCUMENTO`**, otto nomi e basta. 🛑 **Mai «i campi di `lavori`»**: nascerebbe
   una **seconda penna** che non conosce le ~200 righe di regole della PATCH (colore di caso, tinta,
   sentinelle, blocco fiscale). ⚠️ Sono **otto nomi per sette voci a schermo** — il paziente si corregge
   **scegliendone un altro** (`paziente_id`) **o** correggendo l'identificativo per questo documento
   (`paziente_nome_snapshot`): **scrivilo**, o il prossimo lettore penserà a un doppione.
3. **Validazione del laboratorio prima del render** (punto 5). Prova: `paziente_id` di un altro
   laboratorio → rifiutato, **e nessun file caricato**.
4. **La porta sull'evento** (punto 7).
5. **Fondi in memoria** (`lavoroCorretto = merge(riga, correzioni)`) e passa **quello** al generatore.
   ⚠️ I testi passano da `CAMPI_TESTO_NORMALIZZATI` — v. il pericolo D242 al punto 4.
6. **5-bis: togli da `riga`** `stato` e `numero_ddc` (punto 3).
7. **Traduci gli esiti**: i sei gentili (punto 2), `conflitto` → **409**, i `P0001` separati fra 400 e
   500 (punto 1), i `23505` per **nome** di vincolo (punto 7).
8. **Verde + salva.**

---

## ✅ LA PROMESSA DA RISCUOTERE — questa volta il numero DEVE muoversi

`verify:full` è fermo a **`5492 | 68 su 451`** da **tre migration**, e ogni volta era giusto: erano SQL,
e le sonde SQL **non girano in CI** (verificato: la RPC ha **zero chiamanti** in `src/` e in banca dati).

🛑 **Il Task C è TypeScript. Se dopo il Task C `verify:full` torna ancora 5492, qualcosa non è stato
provato.**

**R-P4:** dopo il primo rosso, **abbozzo inerte** e **conta** quante asserzioni si accendono (`N su M`).
E **prima delle asserzioni, enumera le forme d'input** — ognuna col suo caso o col suo «non coperta,
perché»: corpo non-JSON · `correzioni` assente · `correzioni` non-oggetto · chiave fuori dalle otto ·
**valori vuoti** (C2) · `denti_coinvolti` come array di **stringhe** invece che di oggetti ·
`paziente_id` di un altro laboratorio · gettone assente · gettone stringa vuota · gettone non
interpretabile.

---

## 🛑 LE REGOLE DI CASA

- **FASE 7 PIENA, mai solo `tsc`:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` —
  timeout ≥ 400000 ms, uscita **da variabile**. Il Task B si era fermato a `tsc` e l'ha dovuto rifare
  l'orchestratore.
- ⚖️ **D318 — `git add <percorsi>` coi tuoi file, MAI `git add -A`.** ⚠️ E se usi `-m` per il commit,
  attento ai **backtick**: la shell li esegue e ti mangia la parola. Oggi è già successo: usa `-F <file>`.
- **R-E2 — un difetto fuori mandato si RIFERISCE.** Già noti, da **non** toccare: `riemetti_ddc_atomica`
  accetta ancora tutto ed è quella col chiamante **pubblicato** (roadmap, riga **26** della coda) ·
  `{"denti_coinvolti": []}` cancella tutti i denti · `numero_prescrizione` vive in due posti ·
  `{anno_ddc: null}` passa il controllo di presenza e muore su `23502` nominando una colonna che il
  chiamante non ha toccato.
- **BP-1** (§0A): `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md`. ⚠️ In MEMORY.md «voce N» è
  **riservata** alle sezioni della memoria: per la roadmap si scrive «la riga N della coda». La guardia
  blocca il commit.
- **FASE 9 / 9b: NON dovute qui** — questo compito non tocca nessuna superficie. Il foglio è il **Task D**.
- **Cerca attivamente dove questo brief sbaglia.** Oggi: il Task B ha trovato **cinque** difetti nel
  proprio (due dell'orchestratore), il C-bis **tre**, il C-ter **tre**, e le revisioni ne hanno trovati
  **tre** dell'orchestratore nel piano — righe marcate «provato» che erano **false**. Se il brief dice
  una cosa e il codice un'altra, **vince il codice**, e lo scrivi.
- **Resoconto** in `.superpowers/sdd/atto-unico-task-c-report.md`: output **reale incollato**, R-P4,
  difetti del brief, ritrovamenti fuori mandato, **cosa NON hai fatto**.
