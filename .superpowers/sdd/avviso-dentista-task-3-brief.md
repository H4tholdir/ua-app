# Mandato — Task 3 del piano «L'avviso al dentista»

**Data:** 09/08/2026. **Ramo:** `intervento-post-consegna` (attivo, albero pulito, pubblicato).
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`, righe **253-313**.
**Leggi anche:** vincoli globali (righe 11-27) · `.superpowers/sdd/avviso-dentista-task-2-revisione.md`.

## Il perimetro

**SOLO il Task 3:** `src/lib/avvisi/messaggio.ts` e la sua prova. **Due funzioni:**
`buildAvvisoMessage` (il testo proposto per WhatsApp) e `descriviCampiCorretti` (i nomi leggibili dei
campi corretti). **Nessuna migration, nessuna rotta, nessuna interfaccia.**

📌 **Buona notizia sulle prove:** le tue sono **unitarie**, quindi `verify:full` **le esegue** — al
contrario delle 35 dei due task precedenti, che sono d'integrazione e in locale si saltano. **Non
aggiungere prove d'integrazione** se non ti servono davvero.

## 🔴 Sette punti dove il piano può sbagliare

### ① 🔴 LA PROVA DEL PIANO PASSA PER COSTRUZIONE, QUINDI NON PROVA NIENTE

Il Passo 1 verifica `expect(testo).not.toContain('Mario')` — ma la funzione **non riceve** nessun nome:
quella riga sarebbe verde anche se il modulo fosse scritto male in ogni altro modo. **È una prova che
non può fallire.**
➡️ **La prova vera ha due gambe, e le scrivi entrambe:**
- **la firma non dà modo** a un dato personale di arrivare lì (nessun parametro lo porta) — questo si
  prova col tipo, non con una stringa;
- **il testo prodotto non contiene nessuna delle descrizioni dei campi** (v. ②), perché ⚖️ **D334** dice
  che su WhatsApp va **solo il fatto** e il dettaglio **solo** nel portale.
⛔ **R-P4:** dopo il primo rosso, abbozzo inerte e **conta quante asserzioni si accendono** (`N su M`).
Prima delle asserzioni **enumera le forme d'input** (elenco vuoto, campo non previsto, token vuoto,
numero con caratteri strani), ognuna col suo caso **o** col suo «non coperta, perché».

### ② 🔴 `descriviCampiCorretti` PORTA «il paziente», E QUELLA FRASE NON PUÒ FINIRE SU WHATSAPP

Nel `Record` del piano c'è `paziente_id: 'il paziente'`. Non è il *nome* del paziente, ma **dire a un
dentista su WhatsApp che «è cambiato il paziente» è comunque un dettaglio clinico su un canale non
protetto**, e D334 lo vieta.
➡️ **Nel modulo le due funzioni devono restare separate e la separazione va DICHIARATA nel codice:**
`buildAvvisoMessage` **non chiama** `descriviCampiCorretti`, e un commento dice perché. **E una prova
fissa il confine:** il testo di WhatsApp non contiene **nessuna** delle descrizioni. 🛑 Senza quella
prova, il Task 5 o il Task 8 le mescolerà — e nessuno se ne accorgerà.

### ③ 🔴 LE SEI VOCI DEL `Record` SONO COPIATE DAL PIANO: VERIFICALE SUL FILE VIVO

Il Task 2 ha già pagato questo errore: **il piano citava un elenco superato** e ricopiarlo avrebbe
riaperto due campi chiusi per legge. Qui il `Record` elenca `richiedente_nome · paziente_id ·
tipo_dispositivo · descrizione · denti_coinvolti · prescrizione_caratteristiche`.
➡️ **Apri `src/lib/dichiarazione/correzioni.ts` e leggi `CAMPI_CORREGGIBILI_DOCUMENTO` OGGI.** Incolla
l'elenco vero nel resoconto e di' se coincide. 🔑 **Il `Record` completo è la difesa giusta** (se un
giorno nasce una voce nuova, `tsc` si accende qui invece di lasciare una descrizione vuota a schermo):
**verifica che sia davvero tipizzato su `CampoCorreggibile`**, non su `string`.

### ④ 🟠 `portalToken` — CHI LO FORNISCE? SE NESSUNO, LA FIRMA È INUTILIZZABILE

Il piano dà per buono che il chiamante abbia un token del portale. **Censiscilo prima di scrivere:**
dove nasce il token che `src/app/portale/[token]/page.tsx` consuma, su quale tabella vive, ed è per
**lavoro** o per **cliente**? Se il valore non è raggiungibile da chi manderà l'avviso (Task 5), la firma
è sbagliata **adesso** e va detto adesso, non al Task 5.

### ⑤ 🟠 IL FORMATO DEL NUMERO DI LAVORO NELLA FIXTURE È PRESUNTO

La prova usa `'2026/0042'`. **Misura il formato vero** — una riga sul banco
(`SELECT numero_lavoro FROM lavori LIMIT 3`) oppure la funzione che lo genera. Se il formato vero è un
altro, la fixture racconta una cosa che non esiste.

### ⑥ 🟠 `NEXT_PUBLIC_APP_URL` PUÒ ESSERE UNA SECONDA FONTE

Il piano scrive `process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'`. **Guarda come lo fa il
gemello** `src/lib/consegna/whatsapp-template.ts` e il resto di `src/`: se esiste già un posto solo da
cui si prende l'indirizzo dell'app, **usa quello**. Un secondo ripiego scritto a mano è un secondo
indirizzo che un giorno divergerà.

### ⑦ 🟡 IL NOME DEL DOCUMENTO NEL TESTO

Il testo proposto dice «*La dichiarazione del lavoro #… è stata rifatta*». ✅ **È la forma giusta**: per
i dispositivi su misura il nome «dichiarazione di conformità» è **improprio** (`CLAUDE.md` §6 — Art.
10(6) e MDCG 2021-3 Q9), e ogni **testo nuovo** usa il nome corretto. 🛑 **Non «DdC», non «certificato»,
non «dichiarazione di conformità».** Se scrivi altre frasi visibili, valgono le stesse parole.

## I vincoli di decisione che valgono qui

- ⚖️ **D334** — su WhatsApp **solo il fatto**; il dettaglio **solo** nel portale; il testo è
  **modificabile** prima dell'invio → quello che produci è una **proposta**, e il modulo deve dirlo.
- ⚖️ **D336** — **il valore vecchio non si mostra mai**, da nessuna parte. Nessuna funzione di questo
  modulo può ricevere il valore precedente di un campo.
- ⚖️ **D339** — si registra **solo il testo mandato**: la bozza **non** si conserva. ➡️ **Non scrivere
  nessuna funzione che salvi la proposta.**
- ⚖️ **D331** — nessun invio automatico: l'app propone, l'odontotecnico manda.
- 🛑 **GDPR:** i messaggi WhatsApp **non portano mai il nome del paziente** (`CLAUDE.md` §9).

## Le regole di casa

- Skill `superpowers:test-driven-development`: la prova prima.
- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — **da variabile, mai dietro una
  pipe, timeout 600000 ms**. 📌 **Base di oggi, misurata da me poco fa: `5748 passate | 119 saltate` su
  461 file** (le 119 sono d'integrazione e si saltano senza `.env.local`). Le tue prove sono unitarie:
  **il numero delle passate deve salire, quello delle saltate NO.** Se salgono le saltate, hai scritto
  una prova che in locale non gira.
- ⚖️ **D318 — `git add <percorsi>`, MAI `-A`**, e **`git status` prima di salvare**: l'albero è condiviso.
  Messaggi lunghi con `-F <file>`.
- 🛑 Niente `push`, niente `main`, niente worktree, niente `rm -rf` fuori da `scripts/tmp/`.
- **R-E2:** un difetto fuori dal tuo mandato si **riferisce**, non si corregge.
- 🛑 **Nessuna migration in questo task.** Se ti sembra di averne bisogno, **fermati e riferisci**.

## Il resoconto

In `.superpowers/sdd/avviso-dentista-task-3-report.md`: ① i difetti del piano (i sette sopra, uno per
uno, più i nuovi) · ② l'elenco vero di `CAMPI_CORREGGIBILI_DOCUMENTO` incollato · ③ dove nasce il token
del portale · ④ il formato vero del numero di lavoro · ⑤ `N su M` di R-P4 e le forme d'input enumerate ·
⑥ i numeri (`VERIFY_EXIT`, passate/saltate prima e dopo) · ⑦ ciò che resta **`non provato`**, col motivo ·
⑧ i ritrovamenti fuori mandato · ⑨ il salvataggio.

🛑 **Non dichiarare «fatto» ciò che non hai misurato**, e **non ricopiare un numero da questo brief senza
rifare il conto**: due dei tre task precedenti hanno trovato un numero scaduto proprio così.
