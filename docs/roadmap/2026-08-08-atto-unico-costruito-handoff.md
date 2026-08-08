# Handoff — 08/08/2026 pomeriggio: l'atto unico è costruito per intero sotto il cofano, e non si vede ancora

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 8 agosto 2026, **16:55** (`provato:` `date`, letto in un comando **separato**).
**Stato:** ramo **`intervento-post-consegna`**, ✅ **PUBBLICATO**, albero **pulito**.
🔑 **`main` NON è stato toccato** ed è `7427a680`.
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD`
(al momento della scrittura: **145**).

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **`VERIFY_EXIT=0` letto da variabile**):
tsc **0** · eslint **0** · `npm run build` ok · **sette guardie verdi** ·
`vitest` **5621 passate | 68 saltate** su **454 file** (448 passati, 6 saltati).
📈 **Riferimento di stamattina: 5492 | 68 su 451.** Questa sessione ha aggiunto **+129 prove e +3 file**.

⚖️ **UNA DECISIONE: D319** (centotrentottesima tornata). Totale: **319 in 138 tornate**.
🗄️ **QUATTRO MIGRATION applicate e nel ledger.** Pavimento nuovo: **`20260808142358`**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🔴 IL FOGLIO NON ESISTE ANCORA — il TASK D è il pezzo che si vede, e non è iniziato
`provato:` `grep -c "scelta_intervento" src/components/features/lavori/scheda-v3/DevoIntervenire.tsx`
→ **0**. Tutto ciò che è stato costruito oggi vive **sotto il cofano**: quattro migration, una rotta,
due moduli nuovi — e **nessuna schermata li chiama**. A schermo, oggi, non è cambiato niente.
➡️ Restano **D** (il passo di correzione nel foglio) ed **E** (l'avviso al dentista) del piano
`docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md`.

### ② 🔴 IL GATE ESTETICO L2 È DOVUTO DUE VOLTE E NON È STATO FATTO
`provato:` `ls docs/design/screenshots/ | grep -iE "intervento|atto-unico|correzion"` → **nessuna
cartella**. Uno è arretrato dell'ondata, l'altro l'ha aggiunto il **Task A** di stamattina (cambiano
titolo, corpo ed entrambe le etichette di una finestra, e nasce un riquadro → per **D245 è ASPETTO**).
➡️ Vive nel **Passo 5 del Task D**. 🛑 **Se il Task D non si facesse, il gate resta scoperto e il merge
è bloccato.** E la **FASE 9** (390 · 768 · 1280, chiaro e scuro) resta dovuta **a parte**: le due non si
coprono a vicenda.

### ③ 🔴 NULLA DI QUEST'ONDATA HA MAI GIRATO CONTRO POSTGRES DA UN CHIAMANTE REALE
Lo dichiarano **tutti e sei** gli esecutori. Quattro migration e una rotta sono verdi su prove unitarie
**col contratto finto** — e 🛑 **i finti hanno già mentito, dentro questa stessa ondata**: il finto
rispondeva **per ordine di chiamata** e inghiottiva i filtri, quindi le prove della porta d'idempotenza
sarebbero state verdi **anche con le due letture invertite**.
➡️ **Il Task 10 non è l'adempimento di chiusura che sembrava: è il primo momento in cui sapremo se i
pezzi si parlano.** Serve un lavoro consegnato, con dichiarazione viva, evento del motivo giusto e
prescrizione. ⚠️ **Sul banco `lavori_prescrizioni` ha ZERO righe**: la fixture del Task 10 dovrà
crearsela, o due delle voci correggibili non saranno esercitabili.

### ④ 🔴 E IL PIANO PRECEDENTE HA ANCORA I TASK 9 E 10
`provato:` `grep -c "^## Task"` sul piano del 07/08 → **10**; i Task **1-8** sono COMPLETI.
🛑 **Il Task 9 non è saltabile:** fino a lì **due motivi su nove prendono un 422 a schermo**, perché il
foglio non manda `scelta_intervento` (v. §0①).

### ⑤ 🟠 TRE RITROVAMENTI FUORI MANDATO, riferiti e NON corretti (R-E2)
- 🟠 **I3 — la porta d'idempotenza ha UNA SOLA asserzione:** con le colonne invertite le due prove di
  comportamento **restano verdi**. 🔑 **È la stessa famiglia dei due critici appena chiusi (C1 · C2), e
  vive nel file che il prossimo esecutore toccherà.**
- 🟠 **M1 — lo `switch` della rotta è senza `default` né guardia di esaustività**
  (`src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts`).
- 🟠 **I2 — `paziente_nome_snapshot` vince sull'embed**, e il **primo scrittore** di quello snapshot sta
  per essere proprio questa rotta. ➡️ **Va deciso nel Task D**, non dopo.

### ⑥ 🟠 UNA DOMANDA APERTA PER FRANCESCO — la riga 27 della coda
Con **D319** il numero di prescrizione è uscito dal documento, ma **una delle tre colonne ha ancora una
porta d'ingresso aperta**: `POST /api/lavori` la valida e la scrive (`route.ts:234-240`).
➡️ **Si toglie la chiave dal contratto pubblico, o il numero resta un appunto interno del laboratorio,
dichiaratamente fuori dal documento?** Non deciso.
🔵 E una divergenza senza decisione numerata, riferita dall'esecutore: `firma_ddc_sha256` è una chiave
morta **tenuta** a `null` per stabilità del payload, `prescrizione_id` è stata **tolta** — **misurate
entrambe 0/6**, e nessuna differenza nei dati giustifica il trattamento diverso.

### ⑦ 🟡 INVARIATI dalla sessione precedente, e nessuno è stato toccato
Le **4 prove rotte del TD04** (`tests/integration/annulla-effetti-storno-td04.rpc.test.ts` — il file
c'è, **non rilanciato**: servono le credenziali) · la **terza copia dei nove campi** in
`annulla_consegna_atomica` · il compito del **ritiro** (D273) senza numero · la riga **«reso senza
difetto»** vuota · `audit_log` · la §17.2 · `psur/route.ts:190` · **`CRON_SECRET`** · i cinque deferiti
delle tinte · l'igiene **D257** · le righe di roadmap **8-bis · 9 · 10 · 24 · 25 · 26 · 27** · i
**quattro difetti ereditati** dal rifacimento (riga 12 della coda, D307).

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| ✅ **SEI compiti costruiti**: B · C-bis · C-ter · C · C-quater · C-quinquies | sei esecutori freschi, **sei revisioni indipendenti**, nessun critico sopravvissuto |
| 🗄️ **Quattro migration**, tutte applicate e nel ledger | l'atto unico · le due porte chiuse · la coppia indivisibile · via il numero di prescrizione |
| 📈 **Prove: 5492 → 5621** (+129), file 451 → 454 | la promessa scritta nel brief del Task C — «*se resta 5492, qualcosa non è stato provato*» — **riscossa** |
| 🔴 **Il Task C non era un compito: erano tre** | C0 e C1 vivevano **in SQL**, non in TypeScript. Spezzato in C-bis → revisione → C-ter → revisione → C, perché **chi scrive il contratto non deve essere chi scrive il consumatore** |
| ⚖️ **D319 — una domanda di Francesco ha cancellato un compito già istruito** | «*ma siamo sicuri che il numero di prescrizione deve essere indicato?*» → **no**, e cadono la radice, la sua migration e la casella nel wizard |
| 🔑 **Quattro difetti del piano erano miei**, tutti in righe marcate «provato» | P10 · P16 · P17 · il Passo 4 · più le due correzioni a D319 |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **QUATTRO VOLTE, IN UN GIORNO, UNA PROVA CHE NON POTEVA FALLIRE. Nessuna era una svista: erano
   prove scritte bene, che non avevano modo di accendersi.**
   ① **`now()` è costante dentro una transazione** (`now() = transaction_timestamp()` → `true`): una
   fixture creata lì dentro nasce col gettone già «giusto», quindi la sonda sul conflitto era verde per
   forza · ② **`scripts/psql.mjs` si collega come `postgres`, cioè come PROPRIETARIO**: ogni sonda sui
   permessi senza `SET LOCAL ROLE` non provava niente · ③ **la fixture viveva nell'anno che faceva
   coincidere per caso il valore ereditato** — sedici sonde di fila non hanno visto il buco ·
   ④ **il finto rispondeva per ordine di chiamata** e inghiottiva i filtri: le prove restavano verdi
   **con le letture invertite**.
   🔑 **E una quinta, di specie diversa:** una prova che passava **sia con la regola vecchia sia con
   quella nuova** — *era decorazione, non una prova.*
   ➡️ **La regola che ne esce: una prova nuova non è finita finché non l'hai vista diventare ROSSA
   rompendo apposta il codice.**
2. 🛑 **UN CONTRATTO SI GIUDICA PER CIÒ CHE PERMETTE, NON PER CIÒ CHE OGGI GLI SI CHIEDE.** Avevo
   declassato due chiusure a «prudenza» sostenendo che nessuno passasse quei valori. **Falso, misurato:**
   quella porta era in uso a ogni riemissione.
3. 🛑 **CHI SCRIVE IL CONTRATTO NON DEVE ESSERE CHI SCRIVE IL CONSUMATORE.** È il motivo per cui il Task
   C è stato spezzato in tre: un esecutore solo sarebbe stato libero di **piegare il contratto** per far
   tornare il proprio codice — il rischio numero uno che il piano si attribuiva da solo.
4. 🔑 **UNA CHIUSURA PUÒ CREARE IL DIFETTO CHE VUOLE CHIUDERE.** «Rifiuta `stato` **oppure** forzalo» era
   sbagliato: servono **tutti e due**. Rifiutarlo soltanto lo fa **ereditare** dalla vecchia — e con una
   vecchia `firmata`, la nuova nasce **firmata con la firma vuota**.
5. 🛑 **`lpad` TRONCA, `padStart` NO.** `lpad('10000',4,'0')` → `'1000'`: un numero **plausibile** su un
   documento a valore legale. Chiuso con `greatest(4, length(…))`, equivalenza provata su 18 valori.
6. 🔑 **UN CONTROLLO CHE RISPONDE IN MODO TROPPO NETTO VA RIFATTO PRIMA DI ESSERE CREDUTO** — di nuovo.
   Cercando `'stato', 'generata'` sul catalogo ho avuto **`false`**, e il codice era **giusto**: era il
   mio pattern a essere sbagliato.
7. 🕛 **LO STESSO NUMERO DI RIGA SBAGLIATO HA ATTRAVERSATO TRE DOCUMENTI E DUE CORREZIONI** prima di
   essere giusto (`:326` → `:323`, e la spiegazione dell'errore era anch'essa sbagliata). *Una citazione
   sbagliata manda qualcuno a cercare dove la cosa non c'è.*
8. 🔑 **UNA DOMANDA IN SETTE PAROLE VALE PIÙ DI UN COMPITO ISTRUITO.** «*Siamo sicuri che debba essere
   indicato?*» ha fermato una migration, una casella nel wizard e una contraddizione ereditata —
   **prima** che partissero. ⚖️ **Un vincolo che sembra di legge si verifica sul testo, non si eredita.**

## 3. Che cosa resta aperto, in ordine

1. 🔴 **Il Task D** — il foglio, e con lui il **gate estetico L2 ×2** (§0②) e la decisione su **I2**.
2. 🔴 **Il Task E** — l'avviso al dentista (D317).
3. 🔴 **I Task 9 e 10** del piano `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`.
   🛑 Il **10** è il primo contatto vero col database (§0③).
4. 🟠 I tre ritrovamenti fuori mandato (§0⑤) — **I3 per primo**, sta nel file che si tocca.
5. 🟠 La domanda della **riga 27** (§0⑥).
6. 🔴 **Le 4 prove rotte del TD04** — fuori ondata, priorità alta.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. `.superpowers/sdd/progress.md`, le sezioni «PIANO TORNA A PRONTO» e «PIANO CORREGGI E RIFAI LA
   DICHIARAZIONE» — è la mappa di recupero: **i compiti marcati COMPLETO non si rifanno**.
3. Il piano `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md`, **dal Task D**,
   con le misure **P13-P17** (il gettone arriva dal corpo e non si riconverte mai) e il blocco
   **«DUE COSE CHE IL TASK D DEVE SAPERE»**.
4. Il verbale, **centotrentottesima tornata** (D319), e le sei revisioni in `.superpowers/sdd/`.

## 5. Il minimo per non sbagliare

- 🛑 **`date` in un comando SEPARATO** — e per le **migration** l'orologio è **UNIVERSALE**:
  `date -u "+%Y%m%d%H%M%S"` (**D311**). **Pavimento: `20260808142358`.**
- 📌 **D318 — `git add <percorsi>`, MAI `git add -A`.** ⚠️ E con `-m` attenzione ai **backtick**: la
  shell li esegue e **ti mangia la parola** — oggi è successo. Per i messaggi lunghi: `-F <file>`.
- **L'uscita dietro una pipe è quella dell'ULTIMO comando**: `verify:full` si legge **da variabile**.
  ⚠️ E **ci mette più di due minuti**: con un limite di due minuti si interrompe senza aver finito.
- ⚖️ **D284 — applicare una migration NON si chiede:** `npx supabase db push --linked --yes`.
  **E dopo è dovuta la FASE 6b:** `supabase gen types` → `tsc`.
- ⚖️ **D296 — il push del RAMO non si chiede, e FUNZIONA** (fatto sette volte oggi). 🛑 Il **merge su
  `main`** resta un giudizio, e oggi la risposta è **NO**: la §0 ha sette voci.
- 🛑 **`scripts/psql.mjs` accetta un PERCORSO DI FILE *e* `-c "SQL"`** (🔄 l'handoff precedente diceva
  «non una stringa SQL»: **falso**, e verificato oggi cinque volte) — ma **non** accetta `\echo`.
  🛑 **Si collega come `postgres`, cioè come PROPRIETARIO.** Credenziali: `set -a && . ./.env.local; set +a`.
- 🛑 **Le sonde: UNA INVOCAZIONE PER SONDA**, in transazione annullata, fixture creata **dentro**.
- 🛑 **Il file di migration NON è la prova: la verità è il catalogo vivo** (`pg_get_functiondef`, `proacl`).
- 🛑 **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`**: dopo un `CREATE` fresco Postgres concede
  `EXECUTE` a **`PUBLIC`, `anon` e `authenticated`** (misurato) — il `REVOKE` è **portante**.
- 🛑 **Niente `rm -rf` fuori dalle aree temporanee:** c'è una guardia, e si usa `/usr/bin/trash`.
- ⚠️ **In `memory/MEMORY.md` la formula «voce N» è RISERVATA** alle sezioni della memoria — per la
  roadmap si scrive «la riga N della coda». **La guardia blocca il commit, e oggi l'ha fatto.**
- **I nomi in `.superpowers/sdd/` NON sono distinti per ondata** — questo piano usa `atto-unico-`.
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- 🛑 **Worktree VIETATI.** Branch nel repo principale.
