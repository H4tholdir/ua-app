# Handoff — 07/08/2026 sera: i Task 5 e 6 sono costruiti, e la PROVA A SCHERMO ha trovato ciò che 15 prove verdi non vedevano

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 7 agosto 2026, 16:52 (`provato:` `date`, letto in un comando **separato**).
**Stato:** ramo **`intervento-post-consegna`**, ✅ **PUBBLICATO**, albero **pulito**.
🔑 **`main` NON è stato toccato** ed è `7427a680` (= `origin/main`, e base del ramo).
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD`
(al momento della scrittura: **80**).

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0 letta da variabile**):
tsc **0** · eslint **0** · `npm run build` ok · **sei guardie verdi** ·
`vitest` **5435 passate | 68 saltate** su **449 file**.
📈 **Riferimento di stamattina: 5353 | 56 su 443.** Questa sessione ha aggiunto **+82 prove e +6 file**.
⚠️ **Le 68 saltate NON sono un peggioramento:** 12 di quelle in più sono le prove d'integrazione
nuove del Task 5, che girano **solo con le credenziali** — lanciate a parte, **12 su 12 verdi**.
Le sei famiglie che si saltano così sono in `tests/integration/*.rpc.test.ts`.

⚖️ **SETTE DECISIONI in quattro tornate: D297-D303** (tornate 124-127 del verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`). Totale: **303 in 127 tornate**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🔴 IL GATE ESTETICO L2 (FASE 9b) NON È STATO FATTO, ED È DOVUTO
`provato:` `ls docs/design/screenshots/ | grep -i intervento` → **nessuna cartella**.
L'ondata **cambia l'aspetto** della scheda del lavoro (una riga nuova, un foglio nuovo, cinque
famiglie, quattro gruppi di pastiglie): per **D245** il gate è dovuto, e va fatto **prima del merge**.
Serve il micro-audit a **12 sezioni × 390/768/1280 × chiaro/scuro** contro
`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`, con gli screenshot before/after in
`docs/design/screenshots/2026-08-XX-intervento/`.
🔑 **La FASE 9 invece È FATTA** (v. §1) e non la sostituisce: quella guarda che il contenuto ci stia
dentro, il gate guarda **com'è fatta** la schermata. Le due non si coprono a vicenda.

### ② 🔴 I COMPITI 7, 8 E 9 NON SONO STATI TOCCATI — ma il 7 NON È PIÙ BLOCCATO
`provato:` `FINESTRA_ANNULLO_MS` è ancora `10 * 60 * 1000` (`src/lib/consegna/costanti.ts:7`) ·
`AnnullaConsegnaBanner.tsx` **esiste ancora** · il letterale nudo `10 * 60 * 1000` è ancora in
`FrameConsegnato.tsx` (**1 riscontro**, e una ricerca sul nome della costante NON lo trova).
🟢 **CADE IL VINCOLO CHE REGGEVA DA DUE GIORNI.** L'handoff di stamattina diceva «il Task 7 non si
chiude prima di D283». **D283 è ora SODDISFATTA dal Task 6**: `provato:` il dialogo d'ingresso
chiede conferma **e nomina il lavoro** (`DevoIntervenire.tsx`, `testo={descrizione}` — a schermo:
«*ELEMENTO CERAMICA 21 — Paz: DE CESARE VITO*»), che è esattamente ciò che D283 chiede — «*la
conferma NOMINA IL LAVORO*», perché l'errore più frequente è il **lavoro sbagliato**, che un «sei
sicuro?» nudo non prende. ➡️ **Il Task 7 si può fare.**

### ③ 🟠 IL COMPITO DEL RITIRO (D273) NON HA ANCORA UN NUMERO NEL PIANO
`provato:` i Task del piano sono 1-9 e nessuno è il ritiro. Invariato da ieri; le sue condizioni dal
panel sono scritte nell'handoff del mattino, §3 punto 2, e **non sono state riportate qui apposta**:
si leggono da lì, non si ricopiano.

### ④ 🟠 LA RIGA «reso senza difetto» DELL'ELENCO DEGLI EFFETTI RESTA VUOTA
`provato:` nessun vocabolario dei motivi del reso esiste in `src/`. **D292**: dipende dal perché è
tornato. È un **lavoro**, non una domanda — lista chiusa nuova → migration → percorso GRANDE — e
**si progetta insieme alla riga 9 della coda di ROADMAP** («era fuori in prova»), o si modella lo
stesso fatto due volte in due colonne diverse.
🚦 **Non blocca il resto:** l'elenco è pieno per **otto motivi su nove**.

### ⑤ 🔴 LA TRANSIZIONE «TORNA A `pronto` COL DOCUMENTO INTATTO» NON ESISTE (ritrovamento R9 → ROADMAP 23)
`provato:` nessuna migration porta un lavoro a `pronto` senza toccare `dichiarazioni_conformita`
(le tre candidate della ricerca sono dashboard e contabilità). Serve a **tre motivi su nove** —
persona sbagliata (D291) e i due difetti nel ramo «si sistema» (D290 · D297 · D298) — e **blocca
quei rami del Task 6**: oggi il foglio li registra e propone, ma nessuno riporta indietro il lavoro.
➡️ Serve una **seconda RPC** e quindi una migration. **Va assegnata esplicitamente**, o si ripete
identico R1 (una funzione decisa e nessuno che la scrive).

### ⑥ 🟠 IL DATO SCRITTO È MUTO (R13 → ROADMAP 25)
Da oggi ogni dichiarazione rifatta porta `sostituisce_id` e ogni annullata `annullata_da_evento_id`.
🛑 **Nessuna schermata legge nessuna delle due.** Il destinatario di quel filo è un **ispettore**
(spec §8.2: «a un ispettore va DETTO, non fatto dedurre»), e finché non c'è una superficie che
mostri la catena, il dato è conservato e invisibile.

### ⑦ 🟡 INVARIATI, e nessuno è stato toccato
Le **4 prove rotte del TD04** (`tests/integration/annulla-effetti-storno-td04.rpc.test.ts`, fuori
ondata, priorità alta) · i **due ritrovamenti del Task 1** · **`audit_log` svuotabile e cieco** · la
**§17.2** impossibile per un laboratorio `non_certificato` · `psur/route.ts:190` (`totale_reclami: 0`) ·
**`CRON_SECRET`** · i cinque deferiti delle tinte · l'igiene **D257** · le voci di roadmap **8-bis · 9 · 10** ·
la **porta di idempotenza** di `generateDdC` (R12 → ROADMAP 24).

### ⑧ 📌 DATI VERI CREATI NEL BANCO DI PROVA, e lo dichiaro
La FASE 9 ha registrato **un evento di qualità vero** sul lavoro `STOR/2026/088`
(`11cd3f11-7410-47af-9d4e-87b2a7ce1727`): motivo `difetto_lavorazione`, valutazione `incidente`
depositata, `post_consegna_correzioni` salito a **1**. Il banco contiene **soli dati di prova**
(`CLAUDE.md` §8), quindi non è un problema — ma chi rilegge quel lavoro deve sapere **da dove
arriva** quella riga.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| 🔴 **§0① e §0② dell'handoff del mattino** | chiusi **insieme**: il testo falso non era una frase da riscrivere, era un **ramo che teneva due casi opposti** — e `riapri_lavoro_atomica`, costruita il 06/08, **adesso gira** |
| ✅ **Task 5 — la riemissione** | **atomica**: annulla e riemette in **una transazione sola**, con la sua rotta che **nasce insieme al meccanismo** |
| ✅ **Task 6 — «Devo intervenire»** | mockup approvato (variante B) → React → **vivo sullo schermo**, provato end-to-end contro il banco vero |
| ⚖️ **D297-D303, sette decisioni** | difetto del materiale · il documento del difetto di lavorazione · «si riconsegna» = la carta · variante B · «il manufatto» · «la dichiarazione» · le due parole convivono |
| 🔴 **TRE difetti trovati da revisioni, DOPO aver salvato** | una combinazione che **annullava la dichiarazione di un manufatto applicato a un paziente** · la riemissione **aperta a tutti e nove i motivi** · una colonna su due |
| 🔴 **DUE difetti trovati dalla PROVA A SCHERMO** | il foglio **non si apriva mai** · la schermata finale **non compariva** mentre nei dati era andato tutto bene |
| ✅ **FASE 9 fatta** | 390 · 768 · 1280, chiaro e scuro, e un **giro completo contro il database vero** |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **UNA PROVA UNITARIA NON PUÒ VEDERE UN DIFETTO CHE VIVE NEL FRAMEWORK CHE LA PROVA
   SOSTITUISCE.** Quindici prove verdi, e sullo schermo vero il foglio **non si apriva mai**: quel
   difetto vive nella `history` del browser, che jsdom non simula. Il secondo viveva in
   `router.refresh()`, che nelle prove è **una finzione che non rirende niente**. ➡️ **La FASE 9 non
   è un rituale: è l'unica rete per una classe intera di difetti.** E quando per un difetto non
   esiste un invariante provabile, **si scrive che non esiste** invece di far finta.
2. 🔴 **RIUSCIRE SENZA DIRLO È UN DIFETTO QUANTO FALLIRE DICHIARANDO SUCCESSO.** La schermata finale
   non compariva mentre evento e valutazione erano regolarmente in banca dati. È la §8.1 letta
   all'incontrario, e costa uguale: la persona rifà tutto da capo.
3. 🛑 **UNA COPPIA INCOERENTE (motivo, azione) CHE ARRIVA A UN ATTO DISTRUTTIVO — TRE VOLTE IN UN
   GIORNO, TRE VESTITI DIVERSI.** «altro» che si prendeva la natura `errore_registrazione` · «ho
   premuto per sbaglio» su un manufatto **applicato** · la riemissione aperta a tutti e nove.
   ➡️ **La guardia sta sempre nell'API, mai nell'interfaccia**, e il permesso **si deriva dalla
   tabella delle decisioni**, non si assume dal fatto che l'utente sia arrivato fin lì.
4. 🟠 **UN RITROVAMENTO SCRITTO MALE È PEGGIO DI UNO NON SCRITTO: sembra già trattato.** Avevo
   censito la combinazione distruttiva e l'avevo classificata sul suo effetto **meno grave** (un
   contatore), rimandandola all'interfaccia. ➡️ Dove un ingresso incoerente ha **più** conseguenze,
   la riga si scrive sulla **peggiore**.
5. 🔑 **UNA SCELTA FATTA INTERPRETANDO DUE DOCUMENTI CHE SI CONTRADDICONO NON È UN DETTAGLIO DI
   IMPLEMENTAZIONE: È UNA DECISIONE.** Senza numero esiste solo dentro un file `.ts` che nessuno
   rilegge come un verbale (D299).
6. 🛑 **DENTRO UN REGISTRO LA PAROLA È UNA.** `effetti.ts` diceva «il pezzo» e «il manufatto» nella
   stessa manciata di righe, e se n'è accorto **Francesco leggendo lo schermo**, non una prova.
   Ora c'è la rete (D301-D303).
7. 🔑 **UNA CORREZIONE DI PAROLE PUÒ SCOPRIRE UN DIFETTO DI STRUTTURA.** «la carta» → «la
   dichiarazione» ha rivelato che quel gruppo teneva insieme **due documenti diversi** — la
   dichiarazione e la fattura — contro la regola di casa che vuole clinico e fiscale indipendenti.
8. 🛑 **UN ELENCO DI 58 COLONNE NON SI RISCRIVE A MANO IN UN SECONDO POSTO.** La RPC della
   riemissione parte dalla **riga vecchia** e ne sovrascrive i campi mandati; le chiavi che non sono
   colonne le **rifiuta il database** contro il catalogo, non una prova che può invecchiare.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **Il gate estetico L2** (§0①) — **dovuto prima del merge**.
2. 🔴 **La transizione mancante** (§0⑤, ROADMAP 23) — **blocca tre rami su nove del Task 6**.
3. 🟡 **Task 7** (i dieci minuti spariscono) — 🟢 **ora sbloccato**, D283 è soddisfatta · poi **8** (il
   testo della riga bloccata) · poi **9** (chiusura).
4. 🟠 **Il compito del ritiro** (§0③) e **il vocabolario del reso** (§0④, insieme alla riga 9 di roadmap).
5. 🟠 **Le voci nuove di roadmap: 23 · 24 · 25**, tutte nate eseguendo.
6. 🔴 **Le 4 prove rotte del TD04** (§0⑦) — fuori ondata, priorità alta.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. `docs/superpowers/plans/2026-08-06-intervento-post-consegna.md`, **le sezioni in fondo**: «✅ TASK 5
   — FATTO», «🔨 TASK 6 — COSTRUITO», e i ritrovamenti **R9 · R10 · R11 · R12 · R13 · R14**.
3. Il verbale, **tornate 124-127** (D297-D303).
4. `docs/roadmap/ROADMAP-UFFICIALE.md`, la coda: **8-bis · 9 · 10 · 23 · 24 · 25**.

## 5. Il minimo per non sbagliare

- 🛑 **`date` in un comando SEPARATO**, e il testo si scrive **dopo** aver letto l'output.
- **L'uscita dietro una pipe è quella dell'ULTIMO comando**: `verify:full` si legge **da variabile**.
  ⚠️ Pagata di nuovo oggi: `npx tsc --noEmit | head` dava «uscita 0» ed era l'uscita di `head`.
- **Le prove di integrazione vogliono le credenziali**, o si saltano **in silenzio**:
  `set -a && . ./.env.local; set +a`. **Sei famiglie** si comportano così.
- ⚖️ **D284 — applicare una migration al banco NON si chiede:** `npx supabase db push --linked --yes`.
  ⚠️ **E dopo una migration la FASE 6b è dovuta:** `supabase gen types` → `tsc`.
- ⚖️ **D296 — il push del RAMO non si chiede.** 🛑 Il **merge su `main`** resta un giudizio: fa partire
  Vercel, e quest'ondata ha una §0 con **otto voci**.
- 🛑 **`scripts/psql.mjs` prende un PERCORSO DI FILE, non una stringa SQL.**
- 🛑 **Il browser di prova PERDE i parametri dell'indirizzo** con `navigate`: il link d'accesso si
  apre con `javascript_tool` (`window.location.href = …`). E il link è **monouso**.
- ⚠️ **In `memory/MEMORY.md` la formula «voce N» è RISERVATA** alle sezioni della memoria — per la
  roadmap si scrive «la riga N della coda di ROADMAP». La guardia blocca il commit (pagato oggi).
- **I nomi in `.superpowers/sdd/` NON sono distinti per ondata** — prefisso `intervento-`.
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- 🛑 **Worktree VIETATI.** Branch nel repo principale.
