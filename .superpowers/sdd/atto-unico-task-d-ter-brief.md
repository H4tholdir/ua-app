# BRIEF — Task D-ter: i quattro rilievi della revisione del Task D

**Ramo:** `intervento-post-consegna` (🛑 **MAI un worktree**) · **Base:** il salvataggio che porta questo brief
**Nasce da:** `.superpowers/sdd/atto-unico-task-d-review.md` — **APPROVATO CON RILIEVI, zero critici,
quattro IMPORTANTI**. Il Task D resta **valido e non si rifà**: qui si chiudono i suoi rilievi.
**Piano:** `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md`

---

## 0. IL MANDATO IN UNA FRASE

**Quattro cose, in quest'ordine di importanza: ① la rete di sicurezza ha buchi misurati — cinque
mutazioni su cinque non accendono niente · ② un commento nuovo dice il FALSO su un token, e chi arriva
al gate estetico lo leggerà come una verifica già fatta · ③ dopo un 409 la persona resta in un vicolo
cieco che crea eventi orfani · ④ il difetto F1 rende quel 409 l'esito PROBABILE, non l'eccezione.**

🛑 **Non è in questo compito la prova a schermo** (FASE 9) **né il gate estetico L2**: sono il **Task
D-bis**, a un esecutore diverso, e vengono **dopo** di te.

---

## ① 🔴 IL CENSIMENTO DELLE PROVE È INCOMPLETO — ed è il rilievo che vale più degli altri tre

**Il fatto, misurato dal revisore:** ha rotto il codice di produzione in **cinque punti** che avrebbero
dovuto accendere qualcosa. **Tutte e cinque le volte: 45 prove su 45 verdi.**

🔑 **Non è un difetto del codice — il codice è giusto. È un difetto della RETE**, e va corretto il
**censimento**, non il comportamento. R-P4 lo dice per esteso: *il conteggio misura la **forza** delle
prove scritte, mai la loro **copertura**; prima delle asserzioni si enumerano le **forme d'input**.*

**Il buco, misurato:** delle **sei** voci correggibili, solo **tre** hanno un'asserzione sul carico che
parte davvero — `descrizione`, `richiedente_nome`, `denti_coinvolti`. **Non ne hanno nessuna:**

| voce senza asserzione | perché è grave |
|---|---|
| `paziente_id` | è un **UUID**, e D320 dice che da qui si cambia **quale persona**, mai come si chiama |
| `tipo_dispositivo` | **F2**: entra nell'atto unico **senza controllo di vocabolario**; l'unico argine è la CHECK di banca dati, che scatta **dopo** il render del PDF |
| `prescrizione_caratteristiche` | 🔴 **è LA trappola del compito** — `elementi` è `number[]`, e mandarlo come stringhe prende **422 a ogni invio**. Il resoconto del Task D dedica **trecento parole** a questo scostamento… e **zero asserzioni**. `provato:` dal revisore: `elementi` mandato come stringhe **non accende niente** |

🔴 **E una sesta, che non è una voce ma è la peggiore:** **`stato_dispositivo` ricablato a
`mai_uscito_dal_lab` sul percorso NUOVO non accende niente.** È **il difetto del Task A** — «la bugia
smette di essere silenziosa» — che **può rinascere sulla strada nuova con la rete tutta verde**. La prova
di lessico del Task A copre **il solo percorso corto**, e questo è un percorso che allora non esisteva.

### Che cosa devi fare

- [ ] **Enumera le forme d'input PRIMA di scrivere le asserzioni**, e scrivi l'elenco nel resoconto: per
  **ognuna** delle sei voci, la forma del carico che deve partire (tipo, e per gli oggetti la forma delle
  sotto-chiavi) più le forme sbagliate plausibili. **Ogni forma porta il suo caso, o il suo «non coperta,
  perché».**
- [ ] **Un'asserzione sul CARICO CHE PARTE** per ognuna delle tre voci scoperte. 🛑 Non «la funzione è
  stata chiamata»: **che cosa c'era dentro il corpo**.
- [ ] **Una prova che `stato_dispositivo` NON è cablato sul percorso nuovo** e porta la risposta della
  persona.
- [ ] 🛑 **OGNI PROVA NUOVA VA VISTA DIVENTARE ROSSA rompendo apposta il codice**, e il numero si scrive.
  Riproduci **le cinque mutazioni del revisore** e verifica che **adesso si accendano**: è il modo di
  provare che il buco è chiuso davvero, non che ci hai scritto sopra delle righe.
- [ ] 📌 **Aspettativa dichiarata:** il numero delle prove **deve muoversi**. Base: **5649 | 68 su 454**.

---

## ② 🔴 UN COMMENTO NUOVO DICE IL FALSO, e sta nel punto peggiore

**Dentro `RigaVoce`** (`DevoIntervenire.tsx`) un commento nuovo afferma che **in tema scuro `--bg-deep` è
più chiaro di `--card`**. `provato:` dal revisore — `ds-v3.css:52`: `--bg-deep: #100E0B` contro
`--card: #211D18`. **È il contrario: `--bg-deep` è più SCURO, e scende sotto il fondo pagina.**

🔑 **Perché è più grave del suo peso apparente:** è un commento che **dichiara una verifica di aspetto
già fatta**. Chi arriverà al gate estetico L2 (Task D-bis) lo legge e conclude che quella superficie è a
posto — cioè il commento **spegne** proprio il controllo che dovrebbe accendersi. La stessa decisione,
presa sul serio, è già registrata in casa: `Sheet.tsx:499-501` la porta come esito di un gate L2 del 22
luglio, e il **mockup approvato** scrive `--elv` su tutte e quattro le superfici nuove.

- [ ] **Correggi il commento**, dicendo il vero e citando la riga del token.
- [ ] ⚠️ **Le TINTE non sono tue**: che le superfici salgano a `--elv` è materia del **gate L2** (Task
  D-bis), ed è già registrato come **scostamento numero sette del mockup, non dichiarato**. Tu chiudi
  **la riga che mente**, non la palette. Se ti sembra un confine artificioso, **riferiscilo** — non
  allargarti.

---

## ③ 🟠 DOPO UN 409 SI RESTA IN UN VICOLO CIECO, e ogni ritentativo crea un evento orfano

**Il fatto:** il 409 (qualcuno ha cambiato il lavoro nel frattempo) **chiude il tasto** — ed è la scelta
giusta. Ma dal passo delle quattro caselle **non c'è via di ritorno**: l'unica uscita è **chiudere il
foglio**, che azzera l'evento. ➡️ **Ogni ritentativo ne crea uno nuovo**, e i vecchi restano orfani.

- [ ] **Dai una via d'uscita che non butti via l'evento**, oppure — se decidi che l'evento vada buttato —
  **scrivi perché** e fa' in modo che il testo a schermo lo dica.
  🔑 Il contratto della rotta aiuta: la porta d'idempotenza, **dopo un successo**, restituisce il
  **successore**; dopo un fallimento non è stato scritto niente, quindi **riusare lo stesso evento è
  legittimo**.
- [ ] **Il messaggio deve restare onesto**: chi legge deve capire che i valori che vedeva non sono più
  quelli, e che cosa fare adesso.

---

## ④ 🟠 F1 — il gettone stantìo, che rende quel 409 l'esito PROBABILE

**Il fatto, riferito dall'esecutore del Task D e confermato dal revisore:** dopo una modifica fatta dal
foglietto della scheda, il gettone locale resta **vecchio**. La `PATCH` **restituisce** l'`updated_at`
nuovo, ma `ModificaRigaSheet` passa al padre **il patch della richiesta**, non **la risposta**.
➡️ Chi corregge le note e poi apre «Devo intervenire» prende un **409 che dà la colpa a «qualcun
altro»** — e la colpa è sua di dieci secondi prima.

🔑 **La ricetta giusta esiste già in casa**, nello stesso file: `handleColoreSalvato`. **Cercala per
COMPORTAMENTO e riusala**, non farne una seconda.

- [ ] Chiudi F1, con la sua prova. ⚠️ **Fail-closed, nessun dato perso** — quindi non c'è fretta di
  scorciatoie: si fa bene.
- [ ] 🛑 **Se toccando F1 scopri che il perimetro è più largo di così** (altri punti che rattoppano lo
  specchio locale senza rileggere la risposta), **NON allargarti: censisci e riferisci.** Il revisore ha
  già scritto che `lavoro` è «*uno specchio locale rattoppato in cinque punti*».

---

## 5. LE REGOLE DI CASA

- **Animazioni SOLO da `src/design-system/v3/motion.ts`** — mai `duration: 0.3` inline. Componenti solo
  da `src/components/ds/`.
- **Mai un secondo overlay**; **navigare da dentro un overlay v3 SOLO con `useNavigaDaOverlay`**.
- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — 🛑 **`timeout: 600000`**, ci
  mette più di due minuti; l'uscita si legge **da variabile**.
- ⚖️ **D318 — `git add <percorsi>`, MAI `git add -A`.** Per i messaggi lunghi `-F <file>` (con `-m` la
  shell **esegue i backtick**).
- **R-E2:** un difetto fuori mandato si **riferisce**, non si corregge di nascosto.
- 🛑 **Non toccare i contratti fermi:** `src/lib/dichiarazione/correzioni.ts`, la rotta `…/riemetti`, la
  RPC, `generate-ddc.ts`, `precheck.ts`, `PATCH /api/pazienti/[id]`.

---

## 6. ⚠️ GIÀ NOTI — non segnalarli come nuovi

**I3** · **M1** · `Esc` con due ascoltatori · la riga 8 del corpo vivo della RPC («SETTE NOMI» sopra sei)
· **F2** (`tipo_dispositivo` senza vocabolario nell'atto unico — tu gli dai **una prova**, non un
controllo nuovo) · **F3** («Protesi Fissa» sulla carta contro «Protesi fissa» a schermo) · le tinte
`--elv` delle quattro superfici nuove (**gate L2, Task D-bis**).

📌 **E una cosa che NESSUNO dei due ha fatto, dichiarata da entrambi:** `scripts/guardia-navigazione-overlay.mjs`
**non è stata lanciata**, benché il passo nuovo aggiunga **due navigazioni da dentro un overlay**. È
**manuale** (le servono l'app accesa, le credenziali del banco e una fixture preparata: la ricetta sta
nell'intestazione dello script). 🛑 **Non è tua** — va al **Task D-bis**, che l'app accesa ce l'ha già.
Scrivilo nel resoconto perché non si perda una terza volta.

---

## 7. CHE COSA IL RESOCONTO DEVE CONTENERE

`.superpowers/sdd/atto-unico-task-d-ter-report.md`:

1. **L'enumerazione delle forme d'input** per tutte e sei le voci, ognuna col suo caso o col suo «non
   coperta, perché».
2. **Le cinque mutazioni del revisore riprodotte**, e che cosa si accende **adesso** — con l'output.
3. **Le altre mutazioni** che hai fatto per vedere le prove nuove diventare rosse.
4. **Che cosa hai deciso sul 409** e perché.
5. **F1 chiuso**, con la prova e col censimento degli altri punti che rattoppano lo specchio locale
   (**riferiti, non corretti**).
6. **La FASE 7** con l'uscita letta da variabile. Base: **5649 | 68 su 454**.
7. 🔴 **DOVE QUESTO BRIEF SBAGLIA.** Cercalo attivamente. Se non trovi niente, **scrivilo**.
8. **I ritrovamenti fuori mandato (R-E2).**
9. **Che cosa NON hai fatto**, per intero.
