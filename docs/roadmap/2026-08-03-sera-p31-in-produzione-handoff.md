# P31 è in produzione — e due cose che dovevo portare a Francesco e non ho portato

**Per:** Francesco, e per la sessione nuova a contesto pulito.
**Quando:** lunedì **3 agosto 2026**, ore **20:22** (`provato:` `date` → `2026-08-03 20:22:58 CEST`).
**Stato:** ✅ **`main` = `dcd727f1`**, albero pulito, **0 da pubblicare**. P31 **in produzione**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, E ANDAVA FATTO

Sono **due**, entrambe **mie**, ed entrambe hanno la stessa forma: **una cosa preparata e mai
consegnata**. Il lavoro c'è; il passaggio a Francesco no.

### ① 🔴 **Gli scatti del pannello di modifica esistono, e non li ho mai fatti vedere a Francesco**

`provato:` `ls docs/design/screenshots/2026-08-03-p31/` → **sei file**
`pannello-modifica-cliente-{390,768,1280}-{chiaro,scuro}.png`.

**Perché conta.** I disegni che Francesco ha approvato (**D186**) raffigurano **due** superfici — il
wizard e il foglio della consegna — ma quelle che cambiano sono **tre**: c'è anche il **pannello di
modifica del cliente**, che riceve un campo nuovo e un'etichetta cambiata. **La sua veste non è mai
passata da un disegno approvato:** è una scelta di chi ha scritto il codice.

**Il difetto era stato visto, tracciato e risolto a metà.** L'esecutore del compito 7 l'ha **riferito**
(R-E2); io l'ho registrato come **DF-2** con una proposta scritta — *«non rifare il giro dei disegni:
fare gli scatti della pagina vera in FASE 9 e mostrarli a Francesco allora»*; il compito 9 **ha fatto gli
scatti**. 🛑 **Poi nessuno li ha mostrati.**

🔑 **È esattamente il caso che il passo 3 della procedura di chiusura esiste per prendere:** una
decisione **rimandata a un gate**, il gate **eseguito**, e la decisione **mai portata a Francesco**. Il
gate risulta fatto, la decisione manca, **e nessun documento se ne accorge** — perché ogni documento
dice il vero sul proprio pezzo.

➡️ **Che cosa serve:** Francesco guarda sei scatti e dice se il pannello gli va bene. **Il codice è già
in produzione**, quindi non è un cancello: è una **verifica a posteriori** che può portare a un ritocco.

### ② 🔴 **D179 è stata decisa stamattina e non è stata eseguita**

`provato:` `grep -rn "playwright\|e2e" .github/workflows/*.yml` → **una sola riga**, in
`perf-budget.yml:16`, che è **un'altra cosa** (il controllo delle prestazioni). **Le prove a schermo non
girano in nessuna macchina automatica.**

**D179** (verbale, tornata 66) dice: *«in CI si accendono solo le prove «pubbliche», ~20 su 30»*. È
stata **ratificata da Francesco al risveglio** insieme a D177-D180, e poi la giornata è andata tutta su
P31.

🔑 **Perché non è una dimenticanza qualsiasi:** quelle prove esistono, sono scritte, e **oggi nessuno le
esegue mai**. È il difetto di **P15** in un'altra forma — lì tre progetti Playwright puntavano a file
mai scritti e uscivano verdi; qui i file ci sono e **non li lancia nessuno**.

➡️ **Costo stimato:** un passo nel flusso di lavoro della CI. **Non stimato davvero** — nessuno l'ha
misurato, e questa riga lo dichiara invece di inventare un numero.

---

## 1. Che cosa è successo

| | |
|---|---|
| ✅ **La notte del 2-3 agosto è in produzione** | **11 salvataggi** uniti (D177): P15 · P9 · P23 (+ la sua revisione) · P18 · P13 · P11. 🔴 **La precondizione più pericolosa eseguita per prima e provata in QUATTRO modi** — l'installatore che esce 0 **non prova niente**, è la forma di P23. La prova vera è la **transizione rosso→verde** della guardia: la copia che girava di notte era del **02/08 alle 12:04**, precedente a P23 |
| ✅ **P31 progettata da zero** | Brainstorming → spec → piano, con **8 decisioni di Francesco** (D181-D188). 🔑 **Tre misure prese PRIMA di chiedere hanno cambiato il perimetro:** il «travaso» **non esisteva** (39 clienti, **1** con telefono, **0** con email) · le due schermate che scrivevano quel campo **si contraddicevano già nelle etichette** · **nessuno metteva il prefisso internazionale**, quindi la colonna nuova da sola **ereditava il difetto** |
| ✅ **P31 eseguita** | **9 compiti**, ognuno a un esecutore **fresco** e a un revisore **fresco**, più una **revisione finale su tutto il ramo**. **24 salvataggi**, uniti e pubblicati (D188) |
| ✅ **Collaudo dal vivo, non simulato** | richiesta → salvataggio → WhatsApp col prefisso `39` messo da UÀ → verificato **in banca dati** → **annullato in 13 s** |
| ✅ **Verificato in produzione** | `provato:` aperto `uachelab.com/lavori/nuovo` → il foglio «Nuovo dentista» ha **cinque** campi, i due numeri con **lo stesso peso**, la riga di aiuto **col testo approvato**, e l'esempio del telefono **senza** il `+39` (D182) |
| 🆕 **Cinque voci nuove di roadmap** | **P32 · P33 · P34 · P35 · P36** — tutte nate da ritrovamenti, nessuna cercata |

**FASE 7 misurata in chiusura, sullo stato pubblicato:**
`provato:` `npx tsc --noEmit` → **0** · `npx vitest run` → **4542 passate | 19 saltate** (394 file
passati | 3 saltati, 4561 prove) · `npx next build` → **uscita 0**, **172** righe di rotta.

---

## 2. 🔑 Le lezioni — e valgono per il codice futuro, non per questa ondata

### ① **Un elenco «completo» ha sbagliato CINQUE volte, e sempre per la stessa causa**

| da | a | come si cercava |
|---|---|---|
| 3 | 5 | per **file** — due punti stavano nello stesso file |
| 5 | 6 | per **nome di funzione** — un punto costruiva il collegamento **a mano** |
| 4 | 5 | i punti di **montaggio** del foglio |
| — | +4 | i punti di **trasporto**, che non compaiono in **nessuna** ricerca per comportamento |

🔑 **Il censimento giusto era `grep "wa\.me/"`, non `grep "buildWhatsappUrl("`** — cioè cercare **il
comportamento**, non il nome. ⚠️ **Ed è precisamente ciò che R-P2 prescrive**: la spec ha violato la
regola **mentre la citava**.

🛑 **I punti di TRASPORTO sono i più insidiosi:** non contengono né `wa.me` né un'azione — contengono
**un nome di colonna dentro una lista**. Non li trova nessuna ricerca per comportamento.

### ② **Il difetto peggiore stava FRA i compiti, non dentro**

Nove revisori hanno approvato nove compiti. La revisione **di ramo** ha trovato che il foglio che chiede
il cellulare **moriva al secondo tentativo**: dopo un salvataggio riuscito il tasto restava disabilitato
**per sempre**, e nella consegna **non c'era via d'uscita**.

🔑 **La causa è una GIUNTURA:** il foglio è montato **incondizionatamente** dal genitore, quindi il suo
stato **sopravvive alla chiusura**. ⚠️ **E tre dei cinque punti sfuggivano PER CASO** — due ribaltano su
un collegamento dopo il salvataggio, uno smonta il foglio con una condizione — **non per progetto**.

➡️ **Una revisione per compito non può vederlo.** Se si esegue un piano a compiti, **la revisione finale
di ramo non è una formalità**: è l'unica che guarda le giunture.

### ③ **Il piano è codice non ancora eseguito, e sbagliava in tre punti**

- **Gli accenti raddoppiati in SQL:** `Puo''` finisce nel database come `Puo'`, **non** come `Può`.
  🔑 **Solo l'apostrofo si raddoppia, mai la lettera accentata.** E la migration era **già applicata**,
  quindi correggere il file non bastava.
- **Quindici prove che non compilavano:** un apostrofo dentro una stringa delimitata da apostrofi.
- **Un testo già superato** da una decisione di Francesco, che una copia futura avrebbe fatto regredire.

🔑 **Tutti e tre corretti ALLA FONTE**, prima che si propagassero ai compiti successivi.

### ④ **Fermarsi è un esito, e ha pagato**

Un esecutore, davanti a una migration che il sistema rifiutava, **ha fatto una domanda invece di
aggirare l'ostacolo**. Rinominare il file con una data comoda avrebbe funzionato — e avrebbe **riaperto
in silenzio la deriva di date** chiusa il 02/08. Da lì nasce **P33**.

### ⑤ **Un rilievo dentro una voce marcata verde è un rilievo che smette di essere cercato**

La voce P31 era stata riscritta come «✅ FATTA e verificata» **prima** che la revisione finale trovasse
il difetto ②. Il revisore finale ha anche notato che **quattro rilievi vivevano solo nei referti** e non
in roadmap — «*esattamente il modo in cui questo progetto ha già perso lavoro*». ✅ Corretto: sono
diventati **P35** e **P36**, e la voce P31 **dice anche ciò che è andato storto**.

---

## 3. Che cosa resta aperto, in ordine di importanza

| | voce | perché conta |
|---|---|---|
| 🔴 | **§0①** gli scatti del pannello, mai mostrati | una decisione preparata e non consegnata |
| 🔴 | **§0②** D179 decisa e non eseguita | ~20 prove a schermo che **nessuno lancia mai** |
| 🔴 | **P36** | il messaggio di consegna contiene il collegamento al portale, che **è una credenziale**: un numero sbagliato di una cifra lo manda a uno sconosciuto. Rischio **preesistente**, ma P31 lo rende **facilmente raggiungibile** (si scrive il numero di fretta e si apre subito WhatsApp). Unica rete oggi: WhatsApp mostra il destinatario **prima** dell'invio |
| 🟡 | **P35** | due difetti **preesistenti** del pannello di modifica, emersi perché P31 è la prima ondata che lo apre e lo salva sul serio. Uno è **accessibilità** (`FieldGroup` non lega etichetta e campo, ~13 campi) |
| 🟡 | **P34** | `src/components/ds/Sheet.tsx:508` dipinge `--card` dove la spec v3 §3.2 vuole `--elv`. 🔑 **Oggi è l'unica ragione per cui P30-bis non morde:** il giorno in cui qualcuno allinea il codice alla spec, **ogni etichetta di campo in tema scuro** scende sotto soglia in un colpo solo |
| 🟠 | **P33** | la deriva di date **blocca le migration** fino al **04/08 alle 12:00**. Strada: **D151** (Management API + `migration repair`) |
| 🟠 | **P32** | la guardia dei documenti perde un anello **a ogni handoff nuovo** (`SALTI` fisso a 2). `misurato:` oggi è oscillata **8 → 1 → 4 → 23** |
| ⚠️ | **il vuoto dichiarato** | che cosa vede chi preme il tasto con un numero malformato — **serve un telefono vero**. Il revisore finale l'ha giudicato **compatibile con l'unione** |
| ❓ | **D-Q2** e **D-Q5** | aperte dal mattino: quale prova a schermo scrivere per prima (consiglio: *che un laboratorio non veda i dati di un altro*) · le etichette in tema scuro |

---

## 4. Da dove ripartire

**L'ordine è di Francesco (D180) e non si scambia:**

1. **P30-a** — 🔍 **la RICERCA che Francesco ha chiesto:** l'anagrafica del cliente **non è mai stata
   progettata**, sono le colonne che c'erano. Che cosa serve davvero a uno studio odontoiatrico e a un
   **laboratorio committente** (`clienti.laboratorio_odontotecnico` esiste già come flag), che cosa
   impongono **fatturazione elettronica** e **MDR**, e che cosa va **TOLTO**. ⚠️ Guardare anche perché
   `pazienti` tiene `nome_cognome` in **un campo solo** e `clienti` li tiene separati — nessun documento
   dice perché.
2. **P30-b** — con la variante 🅰️, scheda e modifica sono quasi la stessa pagina: decidere se diventa
   **una sola**, e come ci si arriva dal tasto «Aggiungi il dato».
3. **POI il React di P30**, sul disegno 🅰️ già approvato.

📎 **Documenti:** spec P31 `docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md` ·
piano `docs/superpowers/plans/2026-08-03-p31-due-numeri-per-il-cliente.md` · verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (**D181-D188**) · voci **P30-a · P30-b ·
P30 · P32 · P33 · P34 · P35 · P36** in `docs/roadmap/ROADMAP-UFFICIALE.md` · referto della notte
`docs/roadmap/2026-08-03-notte-autonoma-referto.md` · referto del compito 9
`docs/roadmap/2026-08-03-p31-compito-9-verifica-handoff.md`.

---

## 5. Il minimo per non sbagliare

```bash
npx tsc --noEmit && npx vitest run && npx next build   # i tre sono TRE: tsc non vede le firme delle rotte
node scripts/guardia-coerenza-documenti.mjs            # guarda il NUMERO, non il colore (P32)
```

**Entrare nel banco di prova (D103) — le credenziali sono in `.env.local`, non si chiede il permesso:**

```bash
npx tsx scripts/tmp/link-accesso.ts <email> <percorso>   # link monouso, nessuna password da digitare
```

⚠️ **Prima di consegnare un lavoro per prova:** stato `pronto`/`in_ritardo`
(`src/lib/consegna/costanti.ts:4`) **e** nessuna DdC con stato ≠ `annullata`, o il guard di idempotenza
(`generate-ddc.ts:85-95`) restituisce quella vecchia **senza generare nulla**. Finestra per annullare:
**10 minuti**. Fixture riusabile già collaudata: **`TEST-DdC-001`**.

**Le trappole pagate oggi, per non ripagarle:**

- 🛑 **Mai un `git worktree`** in questo progetto (404 su tutte le rotte). Si usa una branch.
- 🛑 **Il messaggio di un commit si passa da un FILE** (`git commit -F`), mai dalla riga di comando: in
  questa sessione la shell ha **eseguito** i backtick di due messaggi, mangiandosi le due prove più
  importanti di uno.
- 🛑 **Le migration si applicano con la Management API + `migration repair`** (**D151**), non con
  `db push` — che fino al 04/08 alle 12:00 le **rifiuta** (**P33**).
- 🛑 **Il punto di ripresa non si punta MAI su `memory/MEMORY.md`**: gli archivi sono esclusi dalla
  catena della guardia, e puntarci la porta d'ingresso **la svuota** — 7 documenti → 1, **restando
  verde** (**P32**).
- 🛑 **In SQL si raddoppia solo l'APOSTROFO, mai la lettera accentata.**
