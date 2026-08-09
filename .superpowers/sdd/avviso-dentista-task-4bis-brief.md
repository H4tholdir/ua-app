# Mandato — Task 4-bis: applicare ⚖️ D342 alla rotta dell'avviso

**Data:** 09/08/2026, 17:39. **Ramo:** `intervento-post-consegna` (attivo, pubblicato).
**Nasce da:** la domanda che il Task 4 ha portato a Francesco. **Ora è decisa.**
**Verbale:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, **centoquarantottesima
tornata**. **Leggila prima di toccare il codice**: porta il *perché*, e il perché cambia come si scrive.

## La decisione, in una riga

⚖️ **D342 — chi chiude un avviso sta *in* laboratorio: `titolare` · `tecnico` · `front_desk`.
Esclusi `admin_rete` **e** `admin_sistema`, entrambi PER NOME.**

🛑 **«Per nome» non è un dettaglio, è il cuore del mandato.** Oggi `admin_sistema` non passa **per effetto
collaterale**: cade sul 403 di `!laboratorioId`, che sta prima. Il verbale spiega perché non basta —
`src/lib/supabase/lab-context.ts:16` dice che *laboratorio nullo ⟹ `admin_sistema`*, **non** il converso:
non è provato che ogni `admin_sistema` abbia il laboratorio nullo. ➡️ **Il cancello deve rifiutarlo per
nome, e restare in piedi anche se un giorno quell'utente avesse un laboratorio.**

## Il perimetro

**SOLO** `src/app/api/lavori/[id]/avviso/route.ts` e `tests/unit/api-avviso.test.ts`.
🛑 **NON toccare** `src/lib/dashboard/striscia.ts` (è il Task 7) · nessun componente · nessuna migration ·
niente di visibile (il cancello §0B del disegno viene prima del Task 5).

## 🔴 Le quattro cose da fare, in ordine

### ① LA PROVA `㉓` DEVE ARROSSIRE — e se non arrossisce, è lei il difetto

Il Task 4 ha scritto una prova che **fissa il comportamento di oggi** (nessun cancello di ruolo)
*proprio perché* una decisione futura dovesse farla arrossire. **Quella decisione è arrivata.**
➡️ **Primo passo, prima di cambiare la rotta:** trova quella prova, e **scrivi nel resoconto se il
comportamento nuovo la fa fallire.** 🔑 **Se la modifica al codice la lascia verde, la prova non provava
ciò che dichiarava** — e quello è un difetto da riferire, più importante del lavoro di oggi.

### ② IL CANCELLO, CON UN'ALLOWLIST ESPLICITA

- **Allowlist**, mai blocklist (`CLAUDE.md` §9): si elencano i **tre ammessi**, non i due esclusi.
- 🛑 **`context.ruolo` è `string`, non un'unione** — l'ha misurato il Task 4: **`tsc` non ti protegge da
  un `'admin'` nudo scritto per sbaglio**, e `admin` nudo **non è un ruolo di questo progetto**.
  ➡️ **Censisci prima:** esiste già in `src/` una costante o un tipo con i cinque ruoli
  (`titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`)? **Se esiste, usa quella.** Se non
  esiste, dichiara nel resoconto come hai evitato il refuso — e **una prova che confronta la tua
  allowlist con l'elenco vero dei ruoli** è la forma giusta.
  📌 La fonte autoritativa dei ruoli è il `CHECK` su `public.utenti.ruolo` (`ruolo` è `text` + CHECK,
  **non** un enum: `enum_range` non funziona).
- **Dove:** una riga propria, **dopo** l'identità e **prima** di qualunque lettura o scrittura. Il 403
  deve arrivare **senza toccare la banca dati** — ed è la stessa cosa che il Task 4 ha già provato per il
  422 (la coppia «codice giusto» **+** «il finto client non è stato chiamato»): **fai lo stesso qui.**
- **La frase del 403** dice che quel ruolo non può chiudere un avviso, non «non consentito» e basta.

### ③ LE PROVE: TUTTI E CINQUE I RUOLI, UNO PER UNO

Tre passano, due prendono 403. 🛑 **`admin_sistema` va provato con un laboratorio VALORIZZATO**,
altrimenti provi il 403 vecchio (quello di `!laboratorioId`) e **non** il cancello nuovo: sarebbe una
prova verde per il motivo sbagliato — il difetto ⑦ del Task 1, di nuovo.

### ④ NON CAMBIARE NIENT'ALTRO

Il resto della rotta è stato revisionato e tiene: il filtro `lavoro_id`, il 409 sull'avviso già chiuso,
l'aggiornamento condizionato, `isSameOrigin`, `chiudeIlPromemoria()`. **Se ti sembra che qualcosa lì sia
sbagliato, riferisci** (R-E2).

## Le regole di casa

- Skill `superpowers:test-driven-development`. **R-P4:** conta le asserzioni che si accendono (`N su M`).
- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — da variabile, **mai dietro una
  pipe** (il Task 4 ha misurato un `0` falso proprio così: era l'uscita di `head`), timeout 600000 ms.
  📌 Base dopo il Task 4: **`5788 passate | 119 saltate` su 463 file** — **rimisurala**, non ricopiarla.
  Le tue prove sono unitarie: **le passate salgono, le saltate NO.**
- ⚖️ **D318 — `git add <percorsi>`, MAI `-A`**, e `git status` prima di salvare.
- 🛑 Niente `push`, niente `main`, niente worktree.

## Il resoconto

In `.superpowers/sdd/avviso-dentista-task-4bis-report.md`: ① **se la prova `㉓` è arrossita** (e se no,
perché è un difetto) · ② se esisteva già una costante dei ruoli e cosa hai usato · ③ come hai provato che
il 403 arriva **prima** della banca dati · ④ i cinque ruoli, esito uno per uno, e come hai costruito il
caso di `admin_sistema` **con** laboratorio · ⑤ `N su M` · ⑥ i numeri (`VERIFY_EXIT`, passate/saltate prima
e dopo) · ⑦ `non provato` col motivo · ⑧ ritrovamenti fuori mandato · ⑨ il salvataggio.
