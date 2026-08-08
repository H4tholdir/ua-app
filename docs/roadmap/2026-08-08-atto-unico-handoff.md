# Handoff — 08/08/2026 mattina: l'ondata è finita in un vicolo cieco, e ne è uscita con un piano nuovo

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 8 agosto 2026, 10:45 (`provato:` `date`, letto in un comando **separato**).
**Stato:** ramo **`intervento-post-consegna`**, ✅ **PUBBLICATO**, albero **pulito**.
🔑 **`main` NON è stato toccato** ed è `7427a680`.
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD`
(al momento della scrittura: **114**).

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0 letta da variabile**):
tsc **0** · eslint **0** · `npm run build` ok · **sette guardie verdi** ·
`vitest` **5492 passate | 68 saltate** su **451 file** (445 passati, 6 saltati).
📈 **Riferimento di ieri sera: 5436 | 68 su 450.** Questa sessione ha aggiunto **+56 prove e +1 file**.

⚖️ **SETTE DECISIONI in cinque tornate: D312-D318** (tornate 133-137 del verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`). Totale: **318 in 137 tornate**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🔴 IL PIANO NUOVO HA CINQUE COMPITI E NE È FATTO **UNO**
`provato:` `.superpowers/sdd/progress.md`, sezione «PIANO CORREGGI E RIFAI LA DICHIARAZIONE»: solo
**ATTO-UNICO-A** è marcato COMPLETO. Restano **B** (l'atto unico in banca dati) · **C** (la rotta che
riceve le correzioni) · **D** (il passo di correzione nel foglio) · **E** (l'avviso al dentista).
Piano: `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md`.

### ② 🔴 E IL PIANO PRECEDENTE HA ANCORA DUE COMPITI APERTI, che vanno DOPO questi cinque
`provato:` `grep -c "^## Task"` sul piano del 07/08 → **10**; i Task **1-8** sono COMPLETI, restano il
**9** (il bivio a schermo e i sei testi d'esito) e il **10** (le prove d'integrazione e la chiusura).
🛑 **Il Task 9 non è saltabile:** fino a lì **due motivi su nove prendono un 422 a schermo**, perché il
foglio non manda ancora `scelta_intervento`.

### ③ 🔴 IL GATE ESTETICO L2 (FASE 9b) NON È STATO FATTO, E ORA È DOVUTO DUE VOLTE
`provato:` `ls docs/design/screenshots/ | grep -iE "intervento|atto-unico"` → **nessuna cartella**.
Era già dovuto per l'ondata; il **Task A di stamattina** ne ha aggiunto un secondo motivo, e l'ha
riferito l'esecutore: cambiano **titolo, corpo ed entrambe le etichette** della finestra del percorso
corto, e nasce un riquadro nuovo → per **D245 è ASPETTO**, non contenuto.
➡️ Deferito al **Passo 5 del Task D**, che copre la stessa superficie. 🛑 **Se il Task D non si
facesse, il gate resta scoperto.**

### ④ 🔴 UN MIO ERRORE DI PROCESSO, e va letto PRIMA di cercare il Task A in git
Il Task A **non vive in un salvataggio che lo nomina**. `provato:` `git show --stat`:
- **`128379ea`** — titolo *«chore(salvataggio): la copia si sposta alle 11:00»* → contiene
  `DevoIntervenire.tsx` **+121** e `DevoIntervenire.test.tsx` **+122**;
- **`b5d0d4c8`** — titolo *«chore(salvataggio): tre sveglie»* → contiene il resoconto del Task A e
  `eventi-qualita-route.test.ts` **+10**;
- **`cd8e0ac0`** — il resoconto.

Causa: **il mio `git add -A`** mentre l'esecutore lavorava in secondo piano. **Niente è perso e la
suite è verde**: il danno è alla **rintracciabilità**. ⚖️ Chiuso da **D318**; la storia **non è stata
riscritta** (è pubblicata, e riscriverla cancellerebbe la prova dell'errore).

### ⑤ 🟠 QUATTRO RITROVAMENTI FUORI MANDATO, riferiti e NON corretti (R-E2)
- 🟠 **`src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx:303-309`** manda `cliente_id` —
  uno dei cinque campi bloccati da D308 — e alla riga `:190-193` **butta via il messaggio del server**
  mostrando «Non è stato possibile salvare la modifica. Riprova.». Chi cambia il dentista su un lavoro
  con dichiarazione viva **non legge la strada, legge un consiglio sbagliato**. L'altra porta mostra il
  messaggio intero. ➡️ Materiale per il **Task D**.
- 🟠 **L'idempotenza `23505` non è raggiungibile dalla rotta degli eventi:** ogni POST inserisce un
  evento nuovo e `postgrest-js` ritenta solo `GET/HEAD/OPTIONS`. Il doppio invio vero **crea due lavori
  e brucia due progressivi**, trattenuto solo dalla spia del componente — cioè da una schermata.
  ➡️ Il **Task B** porta il tappo (indice unico su `annullata_da_evento_id`), ma **per il rifacimento
  resta aperto**.
- 🟠 **`contiene_sostanze_o_tessuti` è STAMPATO e non ha nessuno scrittore.** `provato:` `grep -rn` su
  `src/` → compare **solo** nei tipi (`domain.ts:745`, `:1168`, `database.types.ts:902`, `:963`), mai
  in una scrittura. **Non è fra le sette voci di D316.** O si dichiara fuori perimetro col motivo, o
  l'ondata gli dà uno scrittore.
- 🟠 **`Esc` sopra la finestra fa scattare DUE ascoltatori** (`Sheet.tsx:160` e `DialogConferma.tsx:87`):
  la pila di `storia-overlay.ts` protegge il gesto «indietro», **non `Esc`**. Preesistente.

### ⑥ 🟡 INVARIATI dalla sessione di ieri, e nessuno è stato toccato
Le **4 prove rotte del TD04** (`tests/integration/annulla-effetti-storno-td04.rpc.test.ts` — il file
c'è, **non rilanciato in questa sessione**: servono le credenziali) · la **terza copia dei nove campi**
in `annulla_consegna_atomica` · il compito del **ritiro** (D273) senza numero · la riga **«reso senza
difetto»** vuota (`provato:` `dipende_dal_perche` ancora in `effetti.ts:65` e `:79`) · `audit_log` ·
la §17.2 · `psur/route.ts:190` · **`CRON_SECRET`** · i cinque deferiti delle tinte · l'igiene **D257** ·
le voci di roadmap **8-bis · 9 · 10 · 24 · 25** · i **quattro difetti ereditati** dal rifacimento
(riga 12 della coda, D307).
🟡 Minore: `ua-app/CLAUDE.md:432` dice «3283 test unitari» — oggi sono **5560**. La riga si dichiara già
invecchiabile, ma il numero è a un ordine di grandezza di distanza.

### ⑦ 📌 NESSUNA MIGRATION APPLICATA IN QUESTA SESSIONE
Il pavimento del ledger resta **`20260807185858`**. Il **Task B** sarà il primo a scriverne una nuova:
🕛 `date -u "+%Y%m%d%H%M%S"`, in un comando **separato** (D311).

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| ✅ **I Task 6, 7 e 8 del piano precedente sono COSTRUITI e revisionati** | tre esecutori freschi, tre revisioni indipendenti |
| 🔴 **La revisione del Task 7 ha trovato un CRITICO, e non era nella rotta: era nella FRASE** | la schermata diceva «*la dichiarazione è stata annullata*» **proprio sul ramo che la tiene viva** — inversione esatta di D293 e dell'Art. 21(2) |
| 🔴 **La revisione del Task 8 ha trovato un CRITICO DELL'ONDATA** | la strada che il rifiuto indicava **riportava nella stessa stanza**: non si correggeva né prima, né durante, né dopo |
| ⚖️ **Panel a tre su quel Critico** | normativo · dati e integrità · UX del banco. **Convergenti**, per ragioni indipendenti |
| 🧭 **Francesco ha scelto, e ha allargato** | forma 1 (atto unico) · **sette** voci, non cinque · **il dentista va avvisato** |
| 📐 **Piano nuovo scritto**, con sei prove misurate prima di scriverlo | e due di quelle prove **hanno cambiato il piano** |
| ✅ **Task A costruito** | la bugia del percorso corto smette di essere silenziosa |
| 🔧 **La copia di sicurezza del database non partiva da tre giorni** | tre sveglie invece di un orario, e lo script diventa idempotente nella giornata |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **UN CANCELLO CHE INDICA UNA STRADA DEVE AVERE LA STRADA.** D308 rifiutava con un messaggio che
   diceva «apri *Devo intervenire* → *dato sbagliato sulla dichiarazione*». Quella porta era **dipinta
   sul muro**: nessuna schermata la collegava, il documento rifatto sarebbe stato **identico**, e la
   riemissione è atomica quindi non c'è finestra. *Un rifiuto che indica un percorso inesistente è
   peggio di un rifiuto muto: manda la persona a cercare, e poi a mentire.*
2. 🔴 **QUANDO LA STRADA ONESTA È PIÙ LUNGA DI QUELLA CHE MENTE, LE PERSONE MENTONO — e a volte MENTE
   L'APP AL POSTO LORO.** `DevoIntervenire.tsx:208` mandava `stato_dispositivo: 'mai_uscito_dal_lab'`
   **cablato**, quindi la guardia dell'API non poteva accendersi mai. Chi progetta una guardia deve
   chiedersi **da dove arriva il valore che la guardia controlla**.
3. 🔑 **UN VINCOLO CHE SEMBRA DI LEGGE VA VERIFICATO SUL TESTO, NON EREDITATO.** «Un lavoro consegnato
   non deve mai restare senza dichiarazione viva» era una regola **nostra**, di integrità dei dati.
   `provato:` sul consolidato: `annull` → **0 occorrenze**. Il MDR non conosce nessun istituto con cui
   il fabbricante privi di effetto un documento che ha emesso.
4. 🛑 **UN CONTROLLO CHE RISPONDE IN MODO TROPPO NETTO VA RIFATTO PRIMA DI ESSERE CREDUTO.** Il mio
   primo censimento dei sette campi stampati rispose **«fuori» per tutti e sette**, compreso uno dei
   cinque su cui D308 è costruita. Era l'estrattore, non il codice. *Stessa famiglia:* un `grep` con
   `2>/dev/null` può tornare **vuoto perché non è mai partito**.
5. 🔑 **METTERE UNA COSA SOTTO GIT NON BASTA: BISOGNA CHIEDERSI CHI LA GENERA.** Ho versionato il file
   degli orari del salvataggio credendo di chiudere lo schema di D255/D103/D313. Sbagliato: quel file
   **lo genera l'installatore**, già versionato. Avevo creato **una seconda fonte della stessa verità**.
6. 📌 **`git add -A` ANNULLA R-E1 IN SILENZIO** (D318): un compito salva **nominando i propri
   percorsi**, sempre — non «quando c'è un agente in corso». Una regola che chiede di *ricordarsi*
   fallisce esattamente quando serve.
7. 🕛 **UN DUBBIO LASCIATO IN UN COMMENTO SI PAGA.** In testa allo script del salvataggio c'era scritto
   «*non verificato che cosa faccia macOS se il Mac è spento*». Non recupera. **Tre giorni senza copia**,
   e se n'è accorta la guardia del commit, non una persona.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **I compiti B · C · D · E** del piano `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md`.
   🔑 Il **B** è il primo e sblocca il C.
2. 🔴 **I Task 9 e 10** del piano `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`,
   **dopo** i cinque.
3. 🔴 **Il gate estetico L2** (§0③) — dentro il Task D, **prima del merge**.
4. 🟠 I quattro ritrovamenti fuori mandato (§0⑤).
5. 🟠 La riga 12 della coda e le voci **24 · 25**.
6. 🔴 **Le 4 prove rotte del TD04** — fuori ondata, priorità alta.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. `.superpowers/sdd/progress.md`, **le due sezioni «PIANO TORNA A PRONTO» e «PIANO CORREGGI E RIFAI LA
   DICHIARAZIONE»** — è la mappa di recupero: i compiti marcati COMPLETO **non si rifanno**.
   🛑 **E il Task A vive in salvataggi che non lo nominano** (§0④).
3. Il piano nuovo, **dal Task B**, con il suo **registro delle prove**: P1 e P5 sono quelle che contano.
4. Il verbale, **tornate 133-137** (D312-D318).

## 5. Il minimo per non sbagliare

- 🛑 **`date` in un comando SEPARATO** — e per le **migration** l'orologio è **UNIVERSALE**:
  `date -u "+%Y%m%d%H%M%S"` (**D311**). Pavimento attuale: `20260807185858`.
- 📌 **D318 — `git add <percorsi>`, MAI `git add -A`.** Vale anche per chi orchestra.
- **L'uscita dietro una pipe è quella dell'ULTIMO comando**: `verify:full` si legge **da variabile**.
  ⚠️ E **ci mette più di due minuti**: con un limite di due minuti si interrompe senza aver finito.
- ⚠️ **Un comando con `2>/dev/null` può tornare vuoto perché non è mai partito.** Il vuoto non è una prova.
- ⚖️ **D284 — applicare una migration NON si chiede:** `npx supabase db push --linked --yes`.
  **E dopo è dovuta la FASE 6b:** `supabase gen types` → `tsc`.
- ⚖️ **D296 — il push del RAMO non si chiede**, e funziona. 🛑 Il **merge su `main`** resta un giudizio.
- 🛑 **`scripts/psql.mjs` prende un PERCORSO DI FILE**, non una stringa SQL, e **non accetta `\echo`**.
  Le credenziali: `set -a && . ./.env.local; set +a`.
- 🛑 **Il file di migration NON è la prova: la verità è il catalogo vivo** (`pg_get_functiondef`, `proacl`).
- 🛑 **Niente `rm -rf` fuori dalle aree temporanee:** c'è una guardia, e si usa `/usr/bin/trash`.
- ⚠️ **In `memory/MEMORY.md` la formula «voce N» è RISERVATA** alle sezioni della memoria — per la
  roadmap si scrive «la riga N della coda di ROADMAP». La guardia blocca il commit.
- **I nomi in `.superpowers/sdd/` NON sono distinti per ondata** — questo piano usa il prefisso
  **`atto-unico-`** (i due precedenti: `intervento-` e `pronto-`).
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- 🛑 **Worktree VIETATI.** Branch nel repo principale.
- 📌 **La copia del database ora parte alle 11:00, alle 16:00 e a ogni accensione**, e ne fa **una sola
  al giorno**. Per forzarla: `bash scripts/salvataggio-programmato.sh --forza`.
