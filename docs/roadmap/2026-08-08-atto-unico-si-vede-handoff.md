# Handoff — 08/08/2026 notte: l'atto unico SI VEDE, e un critico ha dimostrato che le prove verdi non bastano

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 8 agosto 2026, **23:27** (`provato:` `date`, letto in un comando **separato**).
**Stato:** ramo **`intervento-post-consegna`**, ✅ **PUBBLICATO** (`c890ac41`), albero **pulito**.
🔑 **`main` NON è stato toccato** ed è `7427a680`.
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD`
(al momento della scrittura: **169**).

📌 **MISURATO IN CHIUSURA DA CHI SCRIVE** (`provato:` `npm run verify:full`, uscita **letta da variabile
e SENZA pipe**, `VERIFY_EXIT=0`): `vitest` **5685 passate | 68 saltate** su **456 file** (450 passati,
6 saltati) · `tsc` 0 · `next build` ok · **guardie verdi**.
📈 **Riferimento di stamattina: 5621 | 68 su 454.** Questa sessione ha aggiunto **+64 prove e +2 file**.

⚖️ **CINQUE DECISIONI: D320 · D321 · D322 · D323 (con EMENDAMENTO) · D324.** Totale: **324 in 141
tornate.**
🗄️ **DUE MIGRATION** applicate e nel ledger. Pavimento nuovo: **`20260808195344`**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🔴 IL TASK D-bis È L'UNICA COSA CHE BLOCCA IL MERGE, e adesso porta QUATTRO voci
`provato:` `ls docs/design/screenshots/ | grep -iE "intervento|atto-unico|correzion"` → **nessuna
cartella**. Il brief è scritto e pronto: `.superpowers/sdd/atto-unico-task-d-bis-brief.md`.
Le quattro voci, e **nessuna copre le altre**:
1. **FASE 9** — 390 · 768 · 1280, chiaro e scuro, **dal vivo**;
2. **GATE ESTETICO L2 ×2** — l'arretrato dell'ondata **più** quello del **Task A** (che ha cambiato
   titolo, corpo ed entrambe le etichette di una finestra e fatto nascere un riquadro → D245 = ASPETTO);
3. **`scripts/guardia-navigazione-overlay.mjs`** — 🛑 **QUATTRO compiti di fila non l'hanno lanciata**, e
   il passo nuovo aggiunge **due navigazioni da dentro un overlay**. È manuale: vuole l'app accesa, le
   credenziali del banco e una fixture preparata (ricetta nell'intestazione dello script);
4. **il riquadro del conflitto**, nato col Task D-ter, **dichiarato dal suo stesso esecutore** come dovuto
   al gate.

🔴 **E UNA DOMANDA CHE SOLO LA FASE 9 PUÒ SCIOGLIERE, da provare per prima:** il foglio si chiude con
`setFase('chiuso')` **ma è montato con `onChiudi={ricomincia}`**, e `ricomincia` **cancella le correzioni
digitate**. Se su un browser vero la chiusura programmatica facesse partire anche `onChiudi`, il difetto
torna intero. **In jsdom quel meccanismo è finto**: nessuna prova automatica può rispondere.

### ② 🔴 IL TASK E NON È MAI STATO INIZIATO — l'avviso al dentista (D317)
`provato:` ricerca su `src/` per il comportamento (avviso di riemissione · GDPR Art. 19) → **nessun
risultato**. Il piano stesso lo dichiara aperto: «*File: **da decidere** leggendo il codice esistente
degli avvisi*» (`…/2026-08-08-correzione-e-riemissione-atto-unico.md:461`).
🔑 **È un obbligo, non una cortesia:** GDPR Art. 19 chiede di comunicare la rettifica ai destinatari, e
Art. 5(2) chiede di poterlo **dimostrare**. ⚠️ Vincolo già in casa: i messaggi WhatsApp **non portano mai
il nome del paziente**.

### ③ 🔴 I TASK 9 E 10 DEL PIANO PRECEDENTE SONO ANCORA LÌ, e il 10 è cresciuto di importanza
`provato:` `grep -c "scelta_intervento" src/components/features/lavori/scheda-v3/DevoIntervenire.tsx` →
**0**. ➡️ **Fino al Task 9, DUE MOTIVI SU NOVE prendono un 422 a schermo.**
🛑 **E il Task 10 — la prima prova contro Postgres da un chiamante reale — non è un adempimento di
chiusura: oggi ne abbiamo la PROVA.** Il critico chiuso stanotte era invisibile a **5.685 prove verdi**
proprio perché le prove **fingono `fetch`**. *Nulla di quest'ondata ha ancora girato contro il database
da un chiamante vero.*

### ④ 🟠 UNA DECISIONE RIMANDATA E MAI PORTATA A FRANCESCO — trovata dal censimento, non ricordata
`provato:` `generate-ddc.ts:349` → **`contiene_sostanze_o_tessuti: false`**, **cablato** e **stampato sul
documento** (`DdcTemplate.tsx:508`). L'autorevisione del piano la marcava «*O si dichiara fuori perimetro
con il motivo, o l'ondata gli dà uno scrittore. **Riferito, non deciso**»* — e non è mai arrivata a
Francesco.
🔑 **È esattamente il difetto che il passo 3 della procedura di chiusura esiste per prendere:** una scelta
rimandata a un gate, e poi persa perché nessun documento se ne accorge. **Ora è qui, e va decisa.**

### ⑤ 🟠 SEI RIGHE DI CODA APERTE OGGI, e due hanno peso
- **28** 🔴 che fine fa la **fotografia del nome del paziente**: con D320 non ha più scrittori ma resta
  **letta per prima** da generatore e precheck; l'unica riga che ce l'ha ha `paziente_id = NULL`, quindi
  quel nome **non è correggibile da nessuna strada**, e su quel lavoro lo snapshot è **l'unica cosa che
  soddisfa l'elemento 4 dell'Allegato XIII** al cancello di consegna.
- **29** 🔐 **un'allowlist applicativa non protegge da una scrittura diretta**: `anon`/`authenticated`
  hanno `UPDATE` su `lavori`, con due politiche RLS di UPDATE. **Preesistente, mai esercitato dal vivo.**
  Dominio critico → percorso GRANDE, panel obbligatorio.
- **30** indice GIN `idx_lavori_search` **inerte** · la ragione stantìa di `PATCHABLE_FIELDS`.
- **31 · 32** ⚖️ **D324 — il registro del lavoro**: la 31 (far arrivare **l'autore**) è **portante**, la 32
  è la schermata per il solo `titolare`, **con la sua valutazione GDPR**.
- **33** quattro code dell'atto unico, fra cui 🔴 **`atto-unico-errori.ts:88-97` mappa TRE indici unici e
  sono QUATTRO** (manca `ddc_lavoro_attiva_unique` → `throw` → **500 illeggibile**) e 🟡
  **`schema.sql:1000` chiama ancora `apply_updated_at_trigger('lavori')`**: una ricostruzione dello schema
  **revocherebbe D323 in silenzio** — l'avviso c'è, quindici righe, **ma è prosa, non un meccanismo**.

### ⑥ 🟡 INVARIATI dalla sessione precedente, e nessuno è stato toccato
Le **4 prove rotte del TD04** (`tests/integration/annulla-effetti-storno-td04.rpc.test.ts` — il file c'è,
`provato:` `ls`; **non rilanciato**: servono le credenziali) · la **terza copia dei nove campi** in
`annulla_consegna_atomica` · il compito del **ritiro** (D273) senza numero · la riga «**reso senza
difetto**» vuota · la **§17.2** · `psur/route.ts:190` · **`CRON_SECRET`** · i cinque deferiti delle tinte ·
l'igiene **D257** · le righe di roadmap **8-bis · 9 · 10 · 24 · 25 · 26 · 27** · i **quattro difetti
ereditati** dal rifacimento (riga 12, D307) · i ritrovamenti **I3** e **M1** · `Esc` con due ascoltatori.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| ✅ **CINQUE compiti costruiti**: C-sexies · D · D-ter · D-quater · D-quinquies | cinque esecutori freschi, **quattro revisioni indipendenti**, **nessun critico sopravvissuto** |
| 🎨 **Il cancello §0B è passato**: mockup a due varianti, chiaro e scuro | ⚖️ **D322 — variante A**: la correzione viene **prima** delle quattro caselle di legge |
| 👁️ **L'ondata SI VEDE**: il passo «Che cosa c'è di sbagliato?» esiste a schermo | sei righe coi valori veri, sotto-passi, e il blocco «da qui non si corregge» con **due** destinazioni |
| 🔴 **UN CRITICO trovato e chiuso** | l'atto unico **non avrebbe mai funzionato**: la prima chiamata spostava da sola il gettone della seconda |
| 🗄️ **Due migration**, applicate e nel ledger | lo snapshot del nome **fuori dal contratto** · il gettone **si muove solo se cambia qualcosa** |
| 📈 **Prove: 5621 → 5685** (+64), file 454 → 456 | e la **spia meccanica** su D323 è l'unica prova che sorveglia una *decisione* invece che un comportamento |
| ⚖️ **Cinque decisioni di Francesco** | D320 (il nome in anagrafica) · D321 (via il numero di prescrizione) · D322 (variante A) · D323 (+emendamento) · D324 (il registro del lavoro) |
| 🔑 **SEDICI difetti nei mandati**, tutti di chi orchestra | trovati dagli esecutori. **Due erano bloccanti**, uno avrebbe reso la migration **un no-op verde** |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **UNA PROVA VERDE NON DICE CHE IL CODICE FUNZIONA: DICE CHE FA QUELLO CHE LE ABBIAMO CHIESTO.**
   Il critico di stanotte era invisibile a **5.685 prove verdi**, sei esecutori e quattro revisioni,
   perché le prove del foglio **fingono `fetch`**. ➡️ *Finché una cosa non ha girato contro il database da
   un chiamante vero, «verde» vuol dire «coerente con ciò che abbiamo immaginato».*
2. 🛑 **UN DIFETTO CHE RENDE IMPOSSIBILE LA STRADA ONESTA E FUNZIONANTE QUELLA DISONESTA È PEGGIO DI UN
   DIFETTO CHE BLOCCA TUTTO.** La via d'uscita che una persona scopre da sola, davanti al falso conflitto,
   era rispondere «**mai uscito dal laboratorio**» — che fa saltare l'incremento e **fa funzionare tutto**.
   È la bugia che il Task A aveva tolto **la mattina dello stesso giorno**, su un campo che alimenta
   `classifica()`. 🔑 *E il falso conflitto era **intermittente**: un allarme che suona a caso insegna che
   gli allarmi sono rumore, e si paga su quelli veri.*
3. 🛑 **UN PEZZO DI SQL SCRITTO IN UN PIANO È «NON ESEGUITO» FINCHÉ QUALCUNO NON LO ESEGUE.** Il blocco che
   l'orchestratore aveva messo nel brief di D323 **non riagganciava il trigger**: applicato com'era sarebbe
   stato **un no-op verde**, e ogni sonda avrebbe misurato il comportamento **vecchio**.
4. 🔑 **UN ESECUTORE CHE DEVIA DA UNA DECISIONE RATIFICATA, CON UNA MISURA IN MANO, HA RAGIONE.** La forma
   di D323 che Francesco aveva ratificato **rompeva due penne**: sottraendo anche `updated_at`, un `UPDATE`
   che assegna solo quel campo diventa indistinguibile da un no-op e viene **pinzato** — e
   `lavoro_denti_sostituisci_atomica` fa `DELETE`+`INSERT` di tutta la collezione, quindi **l'aggiornamento
   perso è totale**. `provato:` dalla revisione con penne vere e 12 fixture: ratificata **4/6**, spedita
   **6/6**. **Il verbale è stato emendato.**
5. 🛑 **UNA DECISIONE SENZA UNA PROVA CHE LA SORVEGLI DURA FINO ALLA PROSSIMA PULIZIA.** La guardia dei
   documenti controlla la **coerenza**, non la **verità**: non può vedere uno scarto fra un verbale e una
   funzione in banca dati. Senza la spia, il primo che nota la differenza rimette il token **credendo di
   sistemare un refuso**.
6. 🔑 **IL CONTO SI CONTA, NON SI RICOPIA.** L'orchestratore ha scritto «le righe scendono da sei a
   cinque» **elencandone sei**, nello stesso paragrafo. *I nomi scendevano, le righe no.*
7. 🛑 **`$?` DIETRO UNA PIPE LEGGE L'ULTIMO COMANDO.** Un esecutore ha lanciato `verify:full | tail`: quel
   `VERIFY_EXIT=0` **sarebbe stato 0 anche con la verifica rossa**. Colto da lui, e rifatto.
8. 🔑 **IL VALORE MOSTRATO E IL VALORE DA MANDARE NON SONO LA STESSA COSA** — due volte in un giorno:
   `denti_coinvolti` (oggetti, non la lista denormalizzata) e `elementi` (numeri, non testo). ⚠️ E il
   secondo **il mockup approvato lo sbagliava**: le prove unitarie non potevano vederlo, perché il rifiuto
   arriva dal server.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **Task D-bis** — §0①, ed è **l'unica cosa che blocca il merge**. Brief pronto.
2. 🔴 **Task E** — l'avviso al dentista (D317), §0②: **mai iniziato**.
3. 🔴 **Task 9** (`scelta_intervento`, oggi **0** occorrenze) e **Task 10** (il primo contatto vero col
   database) del piano `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`.
4. 🟠 **La decisione ⑤/④**: `contiene_sostanze_o_tessuti` cablato e stampato — **da portare a Francesco**.
5. 🟠 Le righe di coda **28 · 29 · 31 · 32 · 33** (§0⑤).
6. 🔴 **Le 4 prove rotte del TD04** — fuori ondata, priorità alta.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. `.superpowers/sdd/progress.md` — la **mappa di recupero**, sezione «PIANO CORREGGI E RIFAI LA
   DICHIARAZIONE»: **i compiti marcati COMPLETO non si rifanno**. ⚠️ I nomi non sono distinti per ondata:
   questo piano usa `atto-unico-`.
3. **Il brief già scritto**: `.superpowers/sdd/atto-unico-task-d-bis-brief.md` — porta anche **come
   arrivare a quella schermata**, che è la parte che costa più tempo se non è scritta.
4. Il piano `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md` e il verbale,
   **centoquarantunesima tornata** (D323 · D324) **con l'emendamento**.

## 5. Il minimo per non sbagliare

- 🛑 **`date` in un comando SEPARATO** — e per le **migration** l'orologio è **UNIVERSALE**:
  `date -u "+%Y%m%d%H%M%S"` (**D311**). **Pavimento: `20260808195344`.**
- 📌 **D318 — `git add <percorsi>`, MAI `git add -A`.** ⚠️ Con `-m` la shell **esegue i backtick**: per i
  messaggi lunghi `-F <file>`.
- 🛑 **`verify:full` si legge DA VARIABILE e SENZA PIPE** (`$?` dietro una pipe è dell'**ultimo** comando —
  pagato oggi). ⚠️ E **ci mette più di due minuti**: con un limite di due minuti si interrompe senza aver
  finito, e **sembra un guasto**. Usa **600000 ms**.
- ⚖️ **D284 — applicare una migration NON si chiede:** `npx supabase db push --linked --yes`. **Dopo è
  dovuta la FASE 6b** (`gen types` → `tsc`).
- ⚖️ **D296 — il push del RAMO non si chiede, e FUNZIONA.** 🛑 Il **merge su `main`** resta un giudizio, e
  **oggi la risposta è NO**: il gate estetico L2 è dovuto **due volte** e non è fatto, e **nulla ha mai
  girato contro il database da un chiamante reale**. Due caselle vuote con un nome, non prudenza generica.
- 🛑 **`scripts/psql.mjs` accetta un percorso di file *e* `-c "SQL"`** (non `\echo`), e **si collega come
  `postgres`, cioè come PROPRIETARIO**: una sonda sui permessi **senza `SET LOCAL ROLE` non prova niente**.
  Credenziali: `set -a && . ./.env.local; set +a`.
- 🛑 **`now()` è COSTANTE dentro una transazione**: una sonda che simuli due chiamate HTTP dentro un solo
  `BEGIN` **non può mostrare la differenza**. *L'orchestratore ci è cascato stasera.*
- 🛑 **Il file di migration NON è la prova: la verità è il catalogo vivo** (`pg_get_functiondef`, `proacl`).
- 🛑 **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`**: dopo un `CREATE` fresco Postgres concede
  `EXECUTE` a `PUBLIC`, `anon` e `authenticated` — il `REVOKE` è **portante**.
- ⚖️ **D103 — l'accesso al banco non si chiede:** `npx tsx scripts/link-accesso.ts [email] [percorso]`.
  ⚠️ Per consegnare un lavoro di prova servono **due** condizioni o la prova non prova niente: stato
  `pronto`/`in_ritardo` **e** nessuna dichiarazione con stato ≠ `annullata`.
- 🛑 **Il gettone di concorrenza non si riconverte MAI** (`new Date`, `toISOString`): `timestamptz` è al
  **microsecondo**, `Date` di JS al **millisecondo** → **409 permanente** che nemmeno ricaricando si sana.
- 🛑 **Niente `rm -rf` fuori dalle aree temporanee** (c'è una guardia, si usa `/usr/bin/trash`).
  File temporanei in `scripts/tmp/`, che è ignorata da git.
- ⚠️ **In `memory/MEMORY.md` la formula «voce N» è RISERVATA** alle sezioni della memoria: per la roadmap
  si scrive «**la riga N della coda**». **La guardia blocca il commit.**
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- 🛑 **Worktree VIETATI.** Branch nel repo principale.
