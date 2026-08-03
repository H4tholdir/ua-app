# P30-a censita, il panel che ha smontato D195 — e un colore cambiato che nessuno ha guardato

**Per:** Francesco, e per la sessione nuova a contesto pulito.
**Quando:** lunedì **3 agosto 2026**, ore **22:57** (`provato:` `date` → `2026-08-03 22:56:59 CEST`).
**Stato:** ✅ **`main` = `0db6e519`**, albero **pulito**, 🛑 **2 salvataggi da pubblicare**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, E ANDAVA FATTO

Sono **tre**, e **le prime due sono mie**.

### ① 🔴 **Ho cambiato un colore del design system e NON L'HO MAI GUARDATO A SCHERMO**

**D193** ha schiarito `--faint` in tema scuro (`#928778` → `#9A8F80`): tocca **l'etichetta di ogni campo
dentro ogni foglio v3 dell'app**. La modifica è **verificata solo con i NUMERI** — contrasti ricalcolati,
`tsc`, 4542 prove, build.

`provato:` `ls docs/design/screenshots/` → l'ultima cartella è `2026-08-03-p31`; `grep -rl "9A8F80"
docs/design/screenshots/` → **nessuno scatto contiene il colore nuovo**.

🛑 **Quindi FASE 9 e FASE 9b non sono state percorse per questo cambiamento**, e `../CLAUDE.md` §0B
chiede l'approvazione visiva **prima** del React, non dopo. **Francesco ha approvato la STRADA (opzione
B), non il RISULTATO.**

⚠️ **E c'è una ragione in più per guardarlo, non solo formale:** il calcolo dice che il nuovo grigio
resta **0,77 sotto `--muted`**. È un margine **stretto**: sulla carta i due grigi restano distinguibili,
**a occhio non è stato verificato da nessuno**. Se si fossero appiattiti, la gerarchia fra «etichetta» e
«testo secondario» sparirebbe in tutta l'app in tema scuro.

➡️ **Che cosa serve:** accendere l'app, fare gli scatti **390 · 768 · 1280 × chiaro · scuro** di un
foglio con campi (il wizard va benissimo), metterli in `docs/design/screenshots/2026-08-03-d193/` e
mostrarli a Francesco. **È una verifica a posteriori**, non un cancello: il codice è salvato ma **non
pubblicato**, quindi si è ancora in tempo a ritoccare senza toccare la produzione.

🔑 **È esattamente la stessa forma del difetto §0① dell'handoff precedente** — un lavoro fatto e mai
consegnato. **Due sessioni di fila.**

### ② 🔴 **D179 è aperta da TRE handoff, e non l'ha ancora eseguita nessuno**

`provato:` `grep -rn "playwright\|e2e" .github/workflows/*.yml` → **una sola riga**, in
`perf-budget.yml:16`, che **installa** il motore per il controllo delle prestazioni. **Le ~20 prove a
schermo non girano in nessuna macchina automatica.**

**D179** è stata ratificata il **03/08 mattina** e da allora è stata rimandata **due volte**. 🔑 **Non è
più una dimenticanza: è una voce che il processo non riesce a prendere.** Se non entra in un'ondata con
un suo posto, la sessione nuova la rimanderà una terza volta.

### ③ ⚠️ **Una guardia NON è stata misurata** (dichiarato, non nascosto)

`guardia-stili-collaudo.mjs` vuole **l'app accesa** su una porta di collaudo e in questa sessione non è
stata avviata: `provato:` uscita `NON MISURATO — nessun server di collaudo su http://localhost:3020`.
⚠️ **È la guardia che guarda gli stili resi davvero** — cioè **proprio quella che avrebbe qualcosa da
dire su ①.** Le altre quattro sono verdi.

---

## 1. Che cosa è successo

| | |
|---|---|
| ✅ **§0① dell'handoff precedente CHIUSA** | I **sei scatti** del pannello «Modifica cliente» sono stati **consegnati a Francesco e approvati** (**D190**). Approvazione **a posteriori**: il codice era già in produzione |
| ✅ **Le schede generiche dei consulenti sono fuori gioco (D189)** | `misurato:` **0 riferimenti al progetto** in tutte e cinque le schede citate da §0C; `ux-designer.md` = **506 byte** e chiedeva un file Figma e un punteggio SUS, che in UÀ **non esistono**. Spostate (**non cancellate**: quella cartella non è sotto git) in `~/Downloads/.claude/agents-DISATTIVATE-2026-08-03`. ⚠️ **Fragilità chiusa da qui:** stavano in una cartella appesa a `Downloads`, non al progetto — aprendo il terminale **dentro `ua-app`** §0C era **ineseguibile senza dare errore** |
| ✅ **D-Q5 CHIUSA** (D193 + D194) | Opzione **B** eseguita e verificata; il token vecchio di v2.3 **resta com'è**, perché la migrazione per route lo chiuderà da sé |
| 🔍 **P30-a CENSITA** | **Sette forme reali** di cliente e **una sola modellata**. `misurato:` 5 società · 3 studi associati con 2+ dentisti · 1 riga che **non è un cliente** (`Pazienti Storici pre-UÀ`, tiene **911 dei 917 pazienti**) · solo **17 clienti su 39** hanno lavori. Referto: `docs/roadmap/2026-08-03-p30a-censimento-anagrafica-referto.md` |
| ⚖️ **PANEL su D195 — nessuna delle tre lenti approva** | Primo panel secondo **D189**, con le lenti **dichiarate nel verbale**. Ha **smontato** D195 e prodotto **P38 · P39 · P40** |
| ✅ **Riformulata da Francesco → D196** | «*è la forma giuridica a decidere se UÀ chiede chi ha prescritto*» |
| 🆕 **Quattro voci nuove** | **P37 · P38 · P39 · P40** |

**FASE 7 misurata in chiusura:** `provato:` `npx tsc --noEmit` → **0** · `npx vitest run` → **4542
passate | 19 saltate** (394 file passati | 3 saltati, 4561 prove) · `npx next build` → **uscita 0** ·
`guardia-coerenza-documenti` → **verde a 23 documenti** · `guardia-reduced-motion` → verde.

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

### ① **Il colore giusto si cerca per VALORE, non per nome**

`provato:` `grep -rni "928778"` → **quattro** occorrenze. Tre erano `--faint` e andavano cambiate; la
quarta è **`--brd-cmd` in `globals.css:192`**, un **token diverso** che porta **lo stesso identico
esadecimale** per derivazione storica. 🔑 **Cercando `--faint` se ne trovavano tre e si cambiavano tre;
cercando il valore se ne trovano quattro e si capisce perché una non si tocca.** È R-P2/R-P3 applicata a
un colore.

### ② **Un contrasto si misura su OGNI fondo su cui il token può cadere, non su quelli comodi**

La nota di rev. 3.1 della spec diceva «*ora 5.21/4.75*»: **due fondi su tre**, saltando `--elv` — che è
la superficie che **quella stessa spec** assegna ai fogli in §3.2, e dove il valore dava **4,25**, sotto
soglia. 🔑 **I numeri erano veri, l'elenco no.** Stessa forma dell'elenco «completo» che ha sbagliato
cinque volte in P31.

### ③ **Una precauzione non misurata è una decisione presa di nascosto**

Avevo scritto a Francesco «*stasera non si tocca la banca dati, P33 blocca fino a domani*». **Falso, e la
voce P33 lo diceva già:** è bloccato **solo `db push`**, mentre **D151** (Management API +
`migration repair`) funziona ed era stata usata **quella mattina stessa**. 🔑 **Un limite inventato
restringe il lavoro senza che nessuno l'abbia deciso.** Francesco l'ha rifiutato: «*non importi limiti
inutili*».

### ④ **Un ripiego automatico che sembra giusto è peggio di uno che sembra sbagliato**

Il rilievo più forte del panel. Oggi la DdC stampa una **ragione sociale** alla voce «persona che ha
prescritto»: è falso, **ma un ispettore lo vede**. La prima stesura di D195 avrebbe stampato **il nome
plausibile di un odontoiatra vero**, ugualmente non confermato — e **invisibile**. 🔑 **Rendere
credibile un dato non verificato è un peggioramento travestito da correzione.**

### ⑤ **Le misure hanno smentito il codice due volte, in direzioni opposte**

`misurato:` la fila di pillole «medici dello stesso studio» **non si renderizza in nessuna schermata**
(`LavoroFormClient.tsx:139-145` monta `TabDati` **senza `clienteId`**) — quindi il mio «2 clienti su 39»
descriveva **la risposta dell'API, non lo schermo**, dove è **0 su 39**. E il campo del prescrittore
**non è nel wizard**: `provato:` `crea-lavoro.ts:332-360` non lo spedisce, `api/lavori/route.ts:233` lo
mette a `null`. 🔑 **«1 lavoro su 295» non era scarsa adozione: era un campo mai chiesto.**

### ⑥ **Guardare il NUMERO della guardia, non il colore, ha preso un difetto mio in diretta**

Riscrivendo `SESSION_ACTIVE.md` ho scritto «RIPRESA» invece di «PUNTO DI RIPRESA»: la guardia è rimasta
**verde** e il conteggio è passato **da 7 a 3**. 🔑 **P32, riprodotta per la quinta volta, e vista solo
perché si guarda il numero.** Rimessa la formula giusta → **23**.

---

## 3. Che cosa resta aperto, in ordine di importanza

| | voce | perché conta |
|---|---|---|
| 🔴 | **§0①** il colore di D193 mai guardato | modifica del design system verificata **solo coi numeri**; margine di 0,77 da `--muted` **non visto a occhio** |
| 🔴 | **P38** | `provato:` `generate-ddc.ts:156` scrive `prescrizione_caratteristiche: null` **cablato** → un elemento **obbligatorio** dell'Allegato XIII è vuoto su **ogni DdC mai emessa**. Incrociato con Art. 2(3) e MDCG 2021-3 Q6, **tocca la qualificazione del dispositivo**, non l'anagrafica |
| 🔴 | **P39** | `misurato:` **22 clienti su 39** senza P.IVA **né** codice fiscale → `<CodiceFiscale></CodiceFiscale>` vuoto → **scarto SDI 00417 certo** (`generate-xml.ts:331-333`). Oggi vi appartengono **10 lavori su 295** |
| 🔴 | **§0②** D179 | ~20 prove a schermo che **nessuno lancia mai**, rimandate **tre volte** |
| 🔴 | **P37** | **172 lavori vivi su 295 (58%)** stampano una ragione sociale come prescrittore. 🐛 E un difetto vivo: **uno spazio** nella casella (`TabDati.tsx:311`) + salvataggio automatico a 30 s → **prescrittore in bianco, precheck verde** |
| 🟠 | **P40** | copia della DdC **al paziente** mai prevista (Art. 21(2)) · conservazione **oltre la cessazione** · **DPR 633/72 abrogato dal 01/01/2027** · quattro correzioni ad `ANALISI/17` |
| 🟡 | **P30-a / P30-b / P30** | l'anagrafica con **D191 + D196**; poi il React |
| 🟡 | **P36 · P35 · P34 · P33** | invariate dall'handoff precedente |
| 🟠 | **P32** | ⚠️ **si è manifestata DUE volte in questa sessione, e la seconda è misurata in chiusura:** `misurato:` la catena è passata **7 → 3** (per un «PUNTO DI RIPRESA» scritto male, rimesso subito → **23**) e poi **23 → 5** scrivendo questo handoff, **restando verde tutte e tre le volte**. 🔑 **Il 5 è legittimo** — la catena riparte da un documento nuovo che ne cita meno — **ma è indistinguibile da una catena rotta**, ed è esattamente il difetto: `SALTI` è fisso a 2 |
| ⚠️ | **due «non verificato» di D196** | se lo **studio associato** conti come «società» (`L. 124/2017 c. 153`) · se uno **studio individuale** sia «istituzione sanitaria» (Art. 2(36) MDR) |
| ⚠️ | **la N4 fra due laboratori** | regge, ma su **tre fonti secondarie e nessuna primaria**: **va firmata da un commercialista** |
| ❓ | **D-Q2** | `provato:` ancora aperta. Quale prova a schermo scrivere per prima |

---

## 4. Da dove ripartire

**Ordine deciso da chi esegue, su delega esplicita di Francesco** («*decidi tu la strada migliore*»):

1. **§0①** — gli scatti di D193 (30 minuti, e chiude un difetto di consegna che si ripete da due sessioni)
2. **P38 e P39** — 🔑 **gli unici due che non dipendono da NESSUNA scelta di disegno**: si chiudono mentre
   l'anagrafica è ancora in discussione
3. **P30-a** con **D191 + D196**, poi **P30-b**, poi il **React di P30** (D180) — e dentro la stessa
   ondata il **Passo 1 del wizard**: `dati-wizard.ts:103` etichetta col solo `studio_nome` (che ce
   l'hanno **39 su 39**), quindi due dentisti dello stesso studio danno **due riquadri identici
   affiancati**, e `PassoDentista.tsx:49` **filtra sull'etichetta**, non sul cognome

📎 **Documenti:** referto P30-a `docs/roadmap/2026-08-03-p30a-censimento-anagrafica-referto.md` ·
verbale **D189-D196** e **esito del panel** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` ·
voci **P37 · P38 · P39 · P40** in `docs/roadmap/ROADMAP-UFFICIALE.md` · handoff precedente
`docs/roadmap/2026-08-03-sera-p31-in-produzione-handoff.md`.

---

## 5. Il minimo per non sbagliare

```bash
npx tsc --noEmit && npx vitest run && npx next build   # i tre sono TRE
node scripts/guardia-coerenza-documenti.mjs            # guarda il NUMERO, non il colore (P32)
```

**Entrare nel banco di prova (D103) — le credenziali sono in `.env.local`, non si chiede il permesso:**

```bash
npx tsx scripts/tmp/link-accesso.ts <email> <percorso>   # link monouso, nessuna password da digitare
```

**Script di misura riusabili scritti in questa sessione** (`scripts/tmp/`, non committati):
`p30a-censimento-anagrafica.ts` · `p30a-forme.ts` · `p30a-esposizione.ts` · `p30a-doppioni.ts` ·
`p30a-studio-members.ts` · `p30a-scarto-sdi.ts` · `dq5-contrasti.ts`.

**Le trappole pagate, per non ripagarle:**

- 🛑 **Il messaggio di un commit si passa da un FILE** (`git commit -F`), mai dalla riga di comando.
- 🛑 **Mai un `git worktree`** in questo progetto (404 su tutte le rotte). Si usa una branch.
- 🛑 **Le migration si applicano con la Management API + `migration repair` (D151)**, non con `db push`
  — **ma P33 blocca solo `db push`: NON è un motivo per rimandare una migration.**
- 🛑 **Il punto di ripresa in `SESSION_ACTIVE.md` deve dire letteralmente «PUNTO DI RIPRESA»**, o la
  catena della guardia si spezza **restando verde** (visto oggi: 7 → 3).
- 🛑 **EUR-Lex si tronca prima degli allegati** se lo si fa riassumere: si **scarica il documento intero**
  (`curl`) e si cerca dentro. È così che l'Allegato XIII è stato ottenuto alla lettera.
- 🛑 **In SQL si raddoppia solo l'APOSTROFO, mai la lettera accentata.**
