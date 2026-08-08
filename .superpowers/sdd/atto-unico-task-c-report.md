# RESOCONTO — Task C: la rotta che riceve le correzioni

**Ramo:** `intervento-post-consegna` · **Migration: NESSUNA** — il contratto SQL è rimasto fermo a
`20260808112700`, non ho toccato una riga di SQL.

| cosa | esito |
|---|---|
| `verify:full` | **uscita 0** — `5606 passate \| 68 saltate su 454 file` (prima: `5492 \| 68 su 451`) |
| prove nuove | **+114**, file di prova **+3** |
| R-P4 | **95 asserzioni su 129** si accendono con l'abbozzo inerte |
| difetti del piano/brief trovati | **3** (uno non lo nominava nessun documento) |
| ritrovamenti fuori mandato | **2 nuovi** + i 4 già noti, **di cui uno era descritto a metà** — tutti riferiti e non toccati |
| difetti nelle **mie** prove | **3**, trovati dall'abbozzo inerte, dal primo verde e dalla revisione finale |
| contratto SQL | **non toccato** |

---

## 1. CHE COSA FACEVA LA ROTTA PRIMA (Passo 1)

`POST /api/lavori/[id]/dichiarazione/riemetti`, 173 righe. In ordine:

1. `isSameOrigin` → 403 · `getFreshLabContext` → 401 · `laboratorioId` assente → 403 ·
   `assertLabOperativo` → la sua risposta.
2. `id` di percorso non a forma di UUID → **404** (non 400: un id impossibile è indistinguibile da uno
   inesistente).
3. corpo non-JSON, o non oggetto → **400**.
4. `evento_id` assente o non-UUID → **422**.
5. carica il lavoro **con gli stessi embed della consegna** (`cliente`, `paziente`, `lavorazioni`,
   `materiali`, `prescrizione`), filtrato su `laboratorio_id` e `deleted_at IS NULL` → assente = **404**.
6. carica l'evento (`id` + `lavoro_id` + `laboratorio_id`) → assente = **422**; se
   `effettoDaMotivo(motivo).documento !== 'riemetti'` → **422** col perché composto dall'elenco degli
   effetti.
7. normalizza l'embed della prescrizione (D295: arriva come **array**).
8. `riemettiDdC(lavoro, eventoId)` → `nessuna_dichiarazione_viva` = 409 · `evento_non_valido` = 422 ·
   altrimenti 200 con `{numero, url, numero_superato, dichiarazione_id, sostituisce_id}`; un lancio = 500.

🔑 **Ciò che NON faceva, ed è tutto il compito:** non riceveva nessuna correzione. `riemettiDdC` ricopia
i dati da una riga che nessuno ha potuto correggere, quindi il documento «rifatto» era **identico**.

---

## 2. LA DECISIONE CHE REGGE TUTTO IL RESTO — il confine è UNA CHIAVE

**Senza `correzioni` la rotta fa esattamente ciò che faceva prima.** Con `correzioni` entra l'atto unico.

Non ho spostato tutto sulla strada nuova, benché sia migliore, per due ragioni misurate:

- **`riemetti_ddc_atomica` ha un chiamante pubblicato** ed è una voce di roadmap a sé (la riga 26 della
  coda). Chiuderlo di nascosto da qui renderebbe **falsa** quella riga — e sarebbe una correzione
  silenziosa fuori mandato (R-E2).
- **Il gettone di concorrenza è obbligatorio sulla strada nuova.** Imporlo anche a chi non corregge
  niente romperebbe una porta che oggi funziona **senza proteggere niente**: senza correzioni non si
  scrive su `lavori`, quindi non c'è nessun aggiornamento da perdere.

📌 **E da qui viene la risposta a C2 senza perdere una capacità.** Il brief chiede di chiudere
`p_correzioni = {}`. L'ho chiuso: `correzioni: {}` mandato apposta è **422**. Ma chi vuole solo rifare la
carta **omette la chiave** — quella strada resta aperta. Se avessi reso `correzioni` obbligatorio, `{}`
sarebbe rimasto l'unica ortografia di «rifai e basta» e chiuderlo avrebbe tolto una capacità.

⚠️ **Le 17 prove preesistenti della rotta girano invariate e passano.** È la prova che «si estende, non
si riscrive» non è una dichiarazione.

---

## 3. LA SONDA — dove PostgREST mette il nome del vincolo

🛑 Fatta con **supabase-js** e non con `scripts/psql.mjs`: quello parla direttamente col database e non
può mostrare in quale campo dell'oggetto `error` PostgREST deposita il nome. Ricetta in
`scripts/tmp/sonda-forma-errori-postgrest.ts` (cartella ignorata da git — la ricetta sopravvive, il file
no). Nessuna scrittura: (a) il controllo sulle chiavi di `p_nuova` scatta prima di ogni lettura, quindi
gli UUID sono inventati; (b) si rilegge una riga esistente e la si reinserisce identica, così l'INSERT
collide e non avviene.

**Output reale:**

```
═══ (a) P0001 — RAISE EXCEPTION dentro correggi_e_riemetti_atomica ═══
data  : null
error : {
  "code": "P0001",
  "details": null,
  "hint": null,
  "message": "atto unico: chiavi che non sono colonne di dichiarazioni_conformita: {chiave_inventata}"
}

═══ (a-bis) P0001 — un altro dei tredici, per confronto ═══
error : {
  "code": "P0001",
  "details": null,
  "hint": null,
  "message": "atto unico: chiavi che non sono voci correggibili del documento: {classe_rischio} (ammesse: {richiedente_nome,paziente_id,paziente_nome_snapshot,numero_prescrizione,tipo_dispositivo,descrizione,denti_coinvolti,prescrizione_caratteristiche})"
}

═══ (b) 23505 — violazione di vincolo unico ═══
error : {
  "code": "23505",
  "details": "Key (id)=(72c82343-fc5c-4877-882b-22e87a6da544) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint \"dichiarazioni_conformita_pkey\""
}

═══ (b-bis) 23505 sul vincolo COMPOSITO anno+progressivo ═══
error : {
  "code": "23505",
  "details": "Key (laboratorio_id, anno_ddc, progressivo_ddc)=(00000000-0000-0000-0000-000000000001, 2026, 2) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint \"dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key\""
}
```

➡️ **Il nome del vincolo sta in `message`.** `details` porta i **valori** della chiave, `hint` è **sempre
nullo**. E le eccezioni `RAISE` tornano in una forma **diversa**: `P0001` col nostro testo in `message`,
`details` e `hint` nulli. Senza questa misura la traduzione sarebbe nata su un'assunzione.

---

## 4. I TREDICI `P0001` — come li ho separati, e perché in quel verso

🛑 **Non ho chiesto una `RAISE … USING ERRCODE` diversa**, che avrebbe toccato il contratto. Ho separato
**per prefisso del messaggio**, in `src/lib/dichiarazione/atto-unico-errori.ts`.

**Il verso del ripiego è la decisione, non il meccanismo.** Si riconoscono i **nove di colpa del
chiamante** (→ 400) e **tutto ciò che non si riconosce è un guasto** (→ 500). Mai il contrario: una
`RAISE` aggiunta domani e non classificata diventa un 500 — brutto, ma onesto — invece di un 400 che dice
all'odontotecnico che ha sbagliato lui mentre l'app si è rotta.

**Sono prefissi, non parole, e la ragione è misurabile:** **quattro** messaggi su tredici cominciano con
«chiavi», e il quarto — `atto unico: chiavi accettate ma NON atterrate su lavori` — succede **dopo
l'annullo**, cioè è un guasto. Un riconoscimento fatto sulla parola scambierebbe proprio quello. C'è una
prova dedicata a quella coppia.

**Il censimento R-P6 meccanizzato:** una prova apre la migration che definisce oggi la funzione, ne
estrae le `RAISE EXCEPTION` col loro testo, e asserisce che sono **tredici**, che **nove** classificano
`richiesta` e **quattro** `guasto`. La quattordicesima accende il rosso invece di diventare un 500 muto.
🔑 I messaggi **non sono ricopiati nella prova**: si leggono dal corpo vivo, o il giorno in cui una
`RAISE` cambia parola la prova resterebbe verde su un testo che il database non produce più.

---

## 5. R-P4 — LE FORME D'INPUT, PRIMA DELLE ASSERZIONI

| # | forma | coperta? |
|---|---|---|
| 1 | corpo non-JSON | ✅ 400 (prova preesistente, ancora verde) |
| 2 | corpo che non è un oggetto | ✅ 400 (preesistente) |
| 3 | `correzioni` **assente** | ✅ strada vecchia, 200 — e la prova verifica che l'atto unico **non** sia chiamato |
| 4 | `correzioni` non-oggetto (array · stringa · `null`) | ✅ 422, tre casi |
| 5 | `correzioni = {}` (C2) | ✅ 422 |
| 6 | chiave fuori dalle otto | ✅ 422, e il messaggio **la nomina** |
| 7 | chiave buona + chiave ignota insieme | ✅ 422 — non si scarta in silenzio la seconda |
| 8 | **valori vuoti** (C2): `''` · `'   '` · `null` · `[]` · `{}` | ✅ 422, sette casi, **una regola sola** |
| 9 | `denti_coinvolti` come array di **stringhe** | ✅ 422, e **prima del render** |
| 10 | `denti_coinvolti` con FDI fuori dominio | ✅ 422 (stessa validazione delle altre due porte) |
| 11 | `prescrizione_caratteristiche` non-oggetto (stringa · array · numero) | ✅ 422, tre casi |
| 12 | `prescrizione_caratteristiche` con sotto-chiave **ignota** | ✅ 422 — o sarebbe un 500 post-annullo |
| 13 | `prescrizione_caratteristiche` con sotto-chiave di forma sbagliata | ✅ 422 |
| 14 | testi non-stringa (numero · booleano · oggetto) | ✅ 422, tre casi |
| 15 | `paziente_id` non-UUID | ✅ 422 (altrimenti `22P02` → 500 illeggibile) |
| 16 | `paziente_id` di un **altro laboratorio** | ✅ 422, e **l'atto unico non viene chiamato** — quindi non si costruisce niente. ⚠️ **Precisione dovuta:** nessuna asserzione osserva `mockUpload`, perché il render vive **dentro** `correggiERiemettiDdC`, che nel finto della rotta è sostituito per intero. La prova è transitiva: «non chiamata» ⇒ «niente costruito, niente caricato». Il piano chiedeva letteralmente «e nessun file caricato»: quella riga sarebbe misurabile solo in una prova d'integrazione |
| 17 | `paziente_id` valido → l'**embed** viaggia col lavoro corretto | ✅ asserito sull'oggetto passato al generatore |
| 18 | gettone **assente** | ✅ 422 |
| 19 | gettone stringa **vuota** / di soli spazi | ✅ 422 |
| 20 | gettone non-stringa (numero) | ✅ 422 |
| 21 | gettone **non interpretabile** come istante (`'pippo'`) | 🛑 **NON COPERTA, e il perché:** riconoscere qui tutte le forme che Postgres accetta non è il perimetro di questo compito. È lo **stesso limite già dichiarato** in `denti/route.ts:100-103`. Arriva come `22007` → **500**, cioè fail-closed |
| 22 | correzione della prescrizione su un lavoro **senza** prescrizione | ✅ 422 prima del render |
| 23 | secondo tocco con lo **stesso evento** | ✅ 200 col **successore**, nessuna seconda generazione, **e le due letture filtrano sulle colonne giuste** (v. §5-bis) |
| 24 | evento già consumato **senza successore** | ✅ 409 |
| 25 | i **sei esiti gentili** | ✅ uno per uno, sia in libreria sia in rotta |
| 26 | esito **ignoto** / risposta vuota / `ok` senza `nuova_id` | ✅ lancia → 500 |
| 27 | `laboratorio_id`/`lavoro_id` nel **corpo** | ✅ ignorati, si derivano da sessione e URL |
| 28 | i **tredici** `P0001` | ✅ letti dalla migration viva, 9→400 e 4→500 |
| 29 | i **tre** `23505` per nome + un quarto vincolo ignoto | ✅ tre esiti + guasto |
| 30 | gli altri SQLSTATE (`23502` · `22P02` · `22003` · `22007` · `42501`) | ✅ tutti guasto |
| 31 | motivo dell'evento che **non** ammette la riemissione, sulla strada nuova | ✅ 422 |

### Il conteggio dell'abbozzo inerte

Dopo il primo rosso (`51 fallite / 20 passate`) ho messo un **abbozzo inerte** — allowlist vuota,
`validaCorrezioni` che accetta tutto, `fondiCorrezioni` che restituisce il lavoro intatto,
`correggiERiemettiDdC` che risponde `ok` senza chiamare niente, classificatore che risponde sempre
`guasto`.

➡️ **95 asserzioni su 129 si accendono.** Le 34 che restano verdi, una per una:

- **20** sono le prove **preesistenti** della strada vecchia: devono passare, ed è la prova che la rotta
  è stata estesa e non riscritta.
- **12** sono i casi in cui il ripiego dell'abbozzo (`guasto`) **coincide** col comportamento voluto — i
  cinque SQLSTATE non noti, l'errore assente, il `P0001` sconosciuto, il vincolo non noto, il messaggio
  che non deve uscire. Non sono deboli: sono le prove che **sorvegliano il verso del ripiego**, e per
  costruzione non possono distinguere un ripiego giusto da un modulo che non fa niente.
- **2** sono positivi di passaggio (le tre sotto-chiavi vere passano · la fusione non muta l'originale).

🔴 **E l'abbozzo inerte ha trovato DUE PROVE MIE DEBOLI**, che ho corretto prima di implementare:
la porta d'idempotenza asseriva solo `mockCorreggi non chiamato` — e passava anche su una rotta che
**ignorava del tutto le correzioni** e rifaceva il documento dalla strada vecchia. Ora asserisce che
**nessuna delle due** strade è stata percorsa, più l'identità del documento restituito.

### 🔴 5-bis — UN TERZO DIFETTO NELLE MIE PROVE, trovato alla revisione finale

Il finto della rotta rispondeva alle due letture di `dichiarazioni_conformita` **in base all'ordine della
chiamata**, e la catena inghiottiva i `.eq()` senza registrarli. ➡️ Le due prove della porta d'idempotenza
sarebbero rimaste **verdi anche con le due letture INVERTITE** — cioè con la rotta che cerca per
`sostituisce_id` la riga da cercare per `annullata_da_evento_id`, e restituisce il documento **annullato**
dicendo «rifatto».

🔑 **Cioè: la prova che doveva sorvegliare il difetto ① del piano non lo sorvegliava.** La condizione
**è** il difetto; una prova che guarda solo l'ordine non guarda la condizione.

➡️ Corretto: la catena finta **annota** ogni coppia `(colonna, valore)`, e una prova nuova asserisce che
la prima lettura filtra su `annullata_da_evento_id` + `laboratorio_id` (**e non** su `sostituisce_id`) e
la seconda su `sostituisce_id` + `laboratorio_id` (**e non** su `annullata_da_evento_id`). Il filtro sul
laboratorio non è decorativo: è la coppia di `ddc_evento_annulla_unique`, ed è ciò che rende sicuro il
`maybeSingle()` — toglierlo lo farebbe diventare un errore a tempo d'esecuzione fra laboratori.

### Due difetti nelle mie prove, trovati al primo verde

- `fdi: 9` **non è un numero FDI valido** (il dominio è 11-48 e 51-85): la fixture dei denti era sbagliata
  e il rosso lo diceva. ⚠️ E misurando l'ho scoperto: **tutti gli FDI sono a due cifre**, quindi ordine
  numerico e alfabetico **coincidono** e quella prova non li sa distinguere. Il codice ordina comunque per
  numero (come la penna); **il limite è scritto nella prova**, non nascosto.
- Passare `undefined` a un parametro con valore predefinito **fa scattare il predefinito**: la prova «senza
  gettone» mandava il gettone e passava per un altro motivo. Ora il caso si chiede con un `Symbol`.

---

## 6. I DIFETTI DEL BRIEF E DEL PIANO

### 🔴 ① Passo 4 — «restituisci **quella**» restituirebbe il documento VECCHIO

> *«esiste già una dichiarazione con `annullata_da_evento_id = evento_id`? → **restituisci quella**»*
> (brief §7 e piano, Passo 4)

`annullata_da_evento_id = E` marca la dichiarazione **ANNULLATA**. Restituirla vuol dire consegnare il
documento **superato** dicendo «rifatto» — che è **esattamente** il difetto che il brief chiama «il
peggiore possibile» due paragrafi più su, e la ragione per cui `riemettiDdC` è una funzione a sé
(`generate-ddc.ts:378-392`). La carta buona è quella che la **supera**: `sostituisce_id = quella.id`,
unica per costruzione (`ddc_sostituisce_unique`). **Vince il codice.**

### 🔴 ② Correggere `paziente_id` senza portarsi dietro l'EMBED stampa il nome della persona sbagliata

**Nessun documento a monte lo nomina** — né il brief, né §12, né il piano.

`generate-ddc.ts:258`:
```ts
paziente_nome: lavoro.paziente_nome_snapshot ?? lavoro.paziente?.nome_cognome ?? lavoro.paziente?.codice_paziente ?? ''
```
Correggere il solo `paziente_id` e lasciare l'embed stantìo scrive sul documento il nome della **persona
vecchia**, mentre la riga in banca dati punta a quella **nuova**. Su una carta a valore legale è il
difetto peggiore di tutti, e sarebbe passato silenzioso: nessun controllo lo guarda.

➡️ Una sola lettura fa **due lavori**: la guardia sul laboratorio (Passo 3) **e** lo scambio dell'embed.

### 🟠 ③ Il brief dice «`riga` NON si può passare così com'è» ma non che il PDF va costruito DOPO la fusione

Il Passo 5 dice «fondi in memoria e passa **quello** al generatore» e il 5-bis dice «togli da `riga`».
Sono due passi separati e l'ordine fra loro non è scritto: **il 5 deve venire prima del 5-bis**, perché
`riga` **nasce** dalla costruzione. Se qualcuno li facesse nell'altro ordine, il documento uscirebbe con
i dati vecchi e la riga con quelli nuovi. Nel codice l'ordine è forzato dalla struttura, e una prova
sorveglia che `tipo_dispositivo` corretto arrivi **prima** della costruzione (che ci pesca i rischi
residui, `:216`).

---

## 7. RITROVAMENTI FUORI MANDATO (R-E2 — riferiti, non corretti)

### 🆕 🟠 A — «predecessore senza successore» è uno stato RAGGIUNGIBILE, e non era censito

`riapri_lavoro_atomica` (`20260807143623:241`) e `riporta_a_pronto_atomica` (`20260807182614:146`)
scrivono anch'esse `annullata_da_evento_id = p_evento_id` e **non creano nessun successore**. Quindi una
riga annullata-da-questo-evento **senza** chi la superi esiste davvero. La rotta lo tratta come **409**
(«quella registrazione è già stata usata per un altro intervento»): non 200 — sarebbe un documento vuoto
— e non 500 — non è un guasto. Andare avanti sbatterebbe comunque su `ddc_evento_annulla_unique`.

### 🆕 🟠 B — la strada VECCHIA non ha la porta d'idempotenza, e da C-bis in poi il doppio tocco lì è un 500

Sulla strada senza `correzioni`, un secondo invio con lo stesso evento arriva a
`riemetti_ddc_atomica` → `23505` su `ddc_evento_annulla_unique` → `riemettiDdC` lancia → **500**. È
comportamento **preesistente** (nato quando il Task B ha creato l'indice) e appartiene alla riga 26 della
coda, non a questo mandato. **Non l'ho toccato.**

### Già noti, riconfermati e non toccati

- `riemetti_ddc_atomica` accetta ancora tutto ed è quella col chiamante pubblicato — **riga 26 della
  coda**. 🔑 **E questo compito ne alza il rischio invece di abbassarlo:** da oggi le due funzioni hanno
  due chiamanti **nella stessa rotta**, separati da un `if`. La riga 26 è stata aggiornata perché lo dica.
- `{"denti_coinvolti": []}` cancella tutti i denti — la rotta lo rifiuta a monte (C2), il **contratto no**.
- 🔴 **`numero_prescrizione` — la riga «vive in due posti» è VERA ma dice METÀ della cosa, e la metà che
  manca l'ho misurata solo alla revisione finale.** `src/app/api/lavori/[id]/route.ts:79-83` esclude
  `numero_prescrizione` dall'allowlist della PATCH **con la sua ragione scritta**: «*vive su
  `lavori_prescrizioni`, scrittura via RPC dedicate (ondata B, spec §3). La colonna omonima su `lavori` è
  **legacy**: riaprirla qui sarebbe **una seconda penna sullo stesso fatto**, la classe già pagata con
  `numero_cassetta`*». E `src/types/domain.ts:504-506` lo ripete: «*P38: il numero facoltativo vive QUI,
  non su `lavori.numero_prescrizione` (colonna legacy)*».
  ➡️ **L'allowlist dell'atto unico (`c_su_lavori`) scrive esattamente quella colonna legacy** — cioè
  riapre la seconda penna che la PATCH tiene chiusa da mesi con una ragione scritta.
  📌 **Il documento non ne soffre**, ed è il motivo per cui non si vede: `generate-ddc.ts:257` legge
  `lavoro.numero_prescrizione`, cioè **la stessa colonna legacy**. Dopo una correzione, carta e riga di
  `lavori` concordano. **A divergere è `lavori_prescrizioni.numero_prescrizione`**, che secondo P38 è
  quella vera: chi legge di là vede il numero **vecchio** mentre il documento porta il nuovo.
  🛑 **Non l'ho toccato, ed è la scelta giusta due volte:** il contratto è fermo (togliere la chiave
  sarebbe una migration), e togliere il nome dalla sola allowlist della rotta la farebbe divergere dal
  contratto — cioè creerebbe la terza penna al posto di chiudere la seconda. **Va deciso dov'è la penna
  unica prima di scrivere altro codice**, ed è materia di roadmap.
- `{anno_ddc: null}` supera il controllo di presenza e muore su `23502` nominando `numero_ddc`, una
  colonna che il chiamante non ha toccato. La rotta non può mandare quella forma (manda sempre la coppia
  che ha stampato), ma il contratto resta com'è.

---

## 8. LE OTTO COSE DEL CONTRATTO — voce per voce

| # | imposto dal contratto | come l'ho chiuso |
|---|---|---|
| 1 | tredici `P0001`, nove 400 e quattro 500 | prefissi in `atto-unico-errori.ts`, ripiego su **guasto**, censimento dalla migration viva |
| 2 | sei esiti **JSON**, non errori | unione discriminata + fail-closed su tutto il resto (`generate-ddc.ts`) |
| 3 | `riga` senza `stato` né `numero_ddc`, **con** anno e progressivo | destrutturazione per nome; due prove separate, una per il tolto e una per il rimasto |
| 4 | otto chiavi, e `{}` non rifiutato dal DB | `CAMPI_CORREGGIBILI_DOCUMENTO` + **una regola sola** sul vuoto |
| 5 | laboratorio validato **prima** del render | lettura di `pazienti` scoped al lab prima di `fondiCorrezioni`; 409 col messaggio **onesto** sul costo |
| 6 | gettone dal corpo, obbligatorio, mai riconvertito | 422 su assente/vuoto/non-stringa; una prova asserisce che i **microsecondi** arrivano intatti |
| 7 | porta d'ingresso sull'**evento**, portante | due letture, e si restituisce il **successore** |
| 8 | dodici chiavi accettate e ignorate | la rotta non si fonda su nessuna: `nuova` nasce da `riga`, che non le porta |

---

## 9. CHE COSA **NON** HO FATTO

- 🛑 **Nessuna migration, nessun `db push`, nessuna FASE 6b.** Il contratto SQL non è stato toccato di una
  riga. Non ho mai avuto bisogno di piegarlo.
- 🛑 **Non ho allineato `riemetti_ddc_atomica`** né toccato la strada vecchia della rotta (R-E2).
- 🛑 **FASE 9 / 9b non dovute e non fatte:** nessuna superficie toccata. Il foglio è il **Task D**, e
  finché non esiste **a schermo non cambia niente**: nessun client manda `correzioni`.
- 🛑 **Non ho provato l'atto unico contro il database vero end-to-end.** Le prove sono unitarie, col
  contratto finto. Serve un lavoro consegnato, con dichiarazione viva, evento di qualità del motivo
  giusto e prescrizione: è materia del Task 10 («le prove d'integrazione e la chiusura dell'ondata»).
  ⚠️ **Questo è il limite più pesante di questo compito**, e va detto per primo a chi lo riprende.
- 🛑 **Il gettone non interpretabile** (forma 21) resta scoperto, come già su `…/denti`.
- 🛑 **`contiene_sostanze_o_tessuti`** resta cablato a `false` e fuori dalle otto — era già riferito
  nell'autorevisione del piano, non l'ho toccato.
- 🛑 **Non ho pubblicato niente.** Salvataggio locale, `main` intatto.

---

## 10. FASE 7 PIENA — output reale

```
$ npm run verify:full ; ESITO=$? ; echo "VERIFY_EXIT=$ESITO"
VERIFY_EXIT=0

 Test Files  448 passed | 6 skipped (454)
      Tests  5606 passed | 68 skipped (5674)

✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde — ogni route mutante verifica l'origine, o è esclusa con una ragione scritta
✅ reduced-motion: niente si sposta a preferenza accesa, tutto arriva a riposo, la molla resta a preferenza spenta
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto, e la rete di sicurezza è recente
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti: nessuna squadra vuota, nessuna prova orfana
✅ verifica «full» registrata (.claude/state/ultima-verifica)
```

📌 Questo è il **secondo** giro di FASE 7, dopo la correzione della prova sulla porta d'idempotenza
(§5-bis): il primo era `5605 | 68 su 454`, questo `5606`.

🔑 **LA PROMESSA È RISCOSSA: `5492 | 68 su 451` → `5606 | 68 su 454`.** +114 prove, +3 file. Era
l'aspettativa dichiarata, ed è il primo compito TypeScript dell'ondata.

---

## 11. I FILE

| percorso | cosa |
|---|---|
| `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts` | **estesa** — la strada delle correzioni |
| `src/lib/dichiarazione/correzioni.ts` | **nuovo** — le otto voci, la regola sola sul vuoto, la fusione |
| `src/lib/dichiarazione/atto-unico-errori.ts` | **nuovo** — la separazione dei tredici `P0001` e dei tre `23505` |
| `src/lib/pdf/generate-ddc.ts` | `correggiERiemettiDdC` accanto a `riemettiDdC` (che **non è stata toccata**) |
| `src/lib/domain/prescrizione-mapper.ts` | `normalizzaContenuto` **esportata**, per non ricopiare l'elenco delle sotto-chiavi |
| `tests/unit/correzioni-documento.test.ts` | **nuovo** — 36 prove |
| `tests/unit/atto-unico-errori.test.ts` | **nuovo** — 27 prove, fra cui il censimento dalla migration viva |
| `tests/unit/correggi-e-riemetti.test.ts` | **nuovo** — 16 prove |
| `tests/unit/riemissione-route.test.ts` | **esteso** — le 17 vecchie invariate + 33 nuove |
