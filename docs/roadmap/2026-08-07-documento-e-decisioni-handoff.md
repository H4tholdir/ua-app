# Handoff — 07/08/2026: la dichiarazione è rifatta, e cercando che cosa TOGLIERE abbiamo trovato che cosa MANCAVA

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 7 agosto 2026 (`provato:` `date`, letto in un comando **separato** — v. §2 lezione 6).
**Stato:** ramo **`intervento-post-consegna`**, ✅ **PUBBLICATO** (`origin/intervento-post-consegna`),
albero **pulito**. 🔑 **`main` NON è stato toccato**: il merge è un giudizio a sé (D296), e quest'ondata
è a metà.
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD`.
`main` è **intatto** e coincide con `origin/main` (`7427a680`), che è anche la **base** del ramo.

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0 letta da variabile e non da
pipe**): tsc **0** · eslint **0** · `npm run build` ok · **sei guardie verdi** · `vitest`
**5353 passate | 56 saltate** su **443 file**.
📈 **Riferimento di ieri sera: 5168 | 56 su 437.** Questa sessione ha aggiunto **+185 prove e +6 file**.

⚖️ **DIECI DECISIONI in sette tornate: D286-D295** (tornate 116-122 del verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`).

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

> ## ✅ AGGIORNAMENTO DEL 07/08/2026, POMERIGGIO — I PUNTI ①, ② E ③ SONO CHIUSI
>
> Salvataggio **`62ed00a3`** (+ il giro di revisione che segue), ramo `intervento-post-consegna`,
> pubblicato. **Il resto della §0 vale invariato**: ④ ⑤ ⑥ ⑦ sono ancora tutti aperti.
>
> - **①+② chiusi INSIEME**, come una cosa sola: correggere il testo lasciando la funzione senza
>   chiamanti avrebbe sostituito un testo falso con una **promessa**. Il difetto di
>   `classifica.ts:164` **non era la frase, era il RAMO** — `commerciale` ed `errore_registrazione`
>   ne condividevano uno, e la stessa frase era vera per il primo e falsa per il secondo.
>   `src/lib/qualita/effetti.ts` 🆕 porta l'elenco dei nove motivi; la rotta
>   `POST …/eventi-qualita` **chiama finalmente `riapri_lavoro_atomica`**.
> - **③ chiuso** con **D297** (difetto del materiale: stessa scelta di D290) e **D298** (difetto di
>   lavorazione → il documento: la casella diceva «panel in corso» e **il panel c'era già stato**,
>   è D293 a rispondere). L'elenco è pieno per **otto righe su nove**: resta il solo
>   `reso_senza_difetto`, che **non è una domanda ma un lavoro** (vocabolario in banca dati →
>   migration → percorso GRANDE, da progettare **insieme alla riga 9 della coda di ROADMAP**).
> - 🔴 **TRE RITROVAMENTI NUOVI**, in fondo al piano: **R9** la transizione «torna a `pronto` col
>   documento INTATTO» **non esiste** e serve a tre motivi su nove (→ ROADMAP **23**) · **R10** il
>   Task 6 **deve disegnare** gli esiti negativi della riapertura · **R11** una combinazione che
>   **annullava la dichiarazione di un manufatto applicato a un paziente**, raggiungibile e ora
>   chiusa nella rotta.
>
> ⚠️ **Le righe originali qui sotto restano, barrate dove servono**: dicono *perché* il difetto era
> lì, e quella parte non invecchia.

### ① ~~🔴 UN TESTO CHE L'APP MOSTRA È FALSO~~ ✅ CHIUSO — e non era una frase da riscrivere
`provato:` `src/lib/qualita/classifica.ts:164` dice ancora, per «commerciale» ed «errore di
registrazione»: «**Non tocca il dispositivo né il documento sanitario.**»
🛑 **D288 stabilisce l'opposto**: «ho sbagliato a premere consegna» **riporta il lavoro a `pronto` e
annulla la dichiarazione**. Il testo è quindi **falso proprio nel caso più frequente**, ed è un testo
che una persona legge per decidere.
➡️ Va corretto **insieme** all'elenco degli effetti (§3.1), non prima: la frase giusta dipende da quella.

### ② ~~🔴 `riapri_lavoro_atomica` NON HA CHIAMANTI~~ ✅ CHIUSO — la chiama la rotta degli eventi
`provato:` `grep -rl` in `src/` → **un solo file**, ed è `src/types/database.types.ts` (generato).
La funzione è stata **costruita col Task 3 e applicata al database** il 06/08. **D288 ha deciso chi la
invoca** — la derivazione dal motivo — ma **nessuno l'ha scritto**.
➡️ È la famiglia della **guardia mai agganciata**: una cosa che esiste, sembra copertura, e non gira.

### ③ ~~🟠 PIENO PER SETTE SU NOVE~~ ✅ OTTO SU NOVE (D297-D298) — resta il solo «reso senza difetto»
Deciso: dato sbagliato sul documento · **difetto di lavorazione (D290)** · **persona sbagliata (D291)** ·
modifica chiesta dal medico · prezzo/quantità · **ho sbagliato a premere consegna (D288)** · altro.
**Mancano:**
- **`difetto_materiale`** — 🟡 ho **proposto** di estendergli la stessa scelta di D290 («si sistema o se
  ne fa uno nuovo?»), **non è stato chiesto a Francesco**: è una proposta, non una decisione.
- **`reso_senza_difetto`** — **D292**: «dipende dal perché è tornato», e **il vocabolario dei motivi del
  reso non esiste**: va progettato.
🛑 **Questo elenco va completato PRIMA del cancello §0B sui testi**: le frasi da approvare devono dire
*cosa cambia*, e non si può dirlo finché non è deciso che cosa cambia.

### ④ 🔴 I COMPITI ~~5,~~ 6, 7, 8, 9 DEL PIANO NON SONO STATI TOCCATI, e il 7 resta pericoloso

> ✅ **IL TASK 5 È FATTO** (07/08 pomeriggio, `686841d7` + il giro sulla guardia del motivo).
> La riga qui sotto — «`sostituisce_id` → 0 riscontri» — **era vera stamattina e adesso non lo è
> più**: la colonna c'è, insieme a `annullata_da_evento_id`, e la riemissione è atomica.
> ⚠️ **Il resto del ④ regge invariato**: 6, 7, 8, 9 non sono toccati, e **il 7 non si chiude prima
> di D283**. Il prossimo è il **6**, che è dietro il cancello §0B (mockup → screenshot →
> approvazione di Francesco, prima di scrivere React).

~~`provato:` `sostituisce_id` su `dichiarazioni_conformita` → **0 riscontri** nelle migration (Task 5 non
fatto)~~ · `FINESTRA_ANNULLO_MS` è ancora a `10 * 60 * 1000` (`src/lib/consegna/costanti.ts:7`, Task 7 non
fatto) · `onClick={handleAnnulla}` è ancora lì (`AnnullaConsegnaBanner.tsx`, **D283 non in piedi**).
🛑 **Il vincolo di ieri regge invariato: il Task 7 non si chiude prima di D283**, o fra i due esiste una
finestra in cui **un tocco involontario è irreversibile**.

### ⑤ 🔴 IL COMPITO DEL RITIRO (D273) NON HA ANCORA UN NUMERO NEL PIANO
Invariato da ieri, **ma ora ha le sue condizioni**, dal panel su D285 (v. §2). Il `REVOKE DELETE` su
`eventi_qualita` **continua a non esserci, deliberatamente** (`provato:` i 3 riscontri in
`20260806170700` sono **commenti** che spiegano perché) e la **sentinella**
(`tests/integration/eventi-qualita-schema.rpc.test.ts:422`) è al suo posto: **quando il ritiro arriva,
quella prova si CAPOVOLGE, non si cancella.**

### ⑥ 🟠 IL GATE ESTETICO E LA PROVA A SCHERMO SU `FlussoConsegna` — DOVUTI E NON FATTI
Il testo degli avvisi è cambiato (`FlussoConsegna.tsx:133-160`): per **D245 è ASPETTO**, quindi
**FASE 9 + 9b sono dovute**. L'esecutore ha guardato **solo** la nota a 390px chiaro/scuro su un mockup
(`docs/design/mockups/2026-08-07-nota-avvisi-consegna.html`), **e lo ha dichiarato**: non è il gate.

### ⑦ 🟡 INVARIATI DA IERI, e nessuno è stato toccato
Le **quattro prove rotte del TD04** (note di credito, `tests/integration/annulla-effetti-storno-td04.rpc.test.ts`
— fuori ondata, priorità alta) · i **due ritrovamenti del Task 1** (`valutazioni_evento.sostituisce_id`
FK semplice · `valutazione_supera()` a metà) · **`audit_log` svuotabile e cieco** · la **§17.2**
impossibile per un laboratorio `non_certificato` finché un CHECK del Task 1 non cambia · `psur/route.ts:190`
(`totale_reclami: 0`) · **`CRON_SECRET`** · il gate L2 arretrato del wizard · i cinque deferiti delle tinte ·
l'igiene **D257** (33 rami locali, e `.superpowers/sdd/` è cresciuta ancora).

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| ✅ **Task 4 — le due rotte** | chiuso: `POST …/eventi-qualita` (registra il fatto e **restituisce la proposta**) e `POST …/valutazioni` (deposita il giudizio, **non riclassifica**) |
| 📄 **La dichiarazione è RIFATTA** | il **sesto** contenuto obbligatorio collegato · il **luogo di fabbricazione** stampato · il controllo con l'elenco **vero** · **dodici tagli** · l'**ottavo** contenuto di nuovo percorribile |
| ⚖️ **D286-D295, dieci decisioni** | l'orario di Roma · il contatore · l'effetto derivato dal motivo · i tre effetti di mestiere · **la dichiarazione non si annulla mai** · il documento porta solo il dovuto |
| 🔬 **Cinque panel su fonti primarie** | e il testo del Regolamento preso dal **Cellar UE** perché **EUR-Lex era spento** |
| 🇮🇹 **Il diritto italiano ha ribaltato la domanda** | i materiali sulla dichiarazione sono una **scelta**, non un obbligo — e la prassi nasce da una nota del **1998**, oggi abrogata |
| 🔴 **Un difetto vivo nelle istruzioni, corretto** | la **vigilanza è cambiata il 1° maggio 2026**: il MIR va sulla piattaforma NSIS, **non più via PEC** |
| 🛑 **La revisione a due verdetti ha pagato 3 volte su 3** | e ogni volta con una **mutazione** |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **DUE METÀ GIUSTE NON FANNO UNA COSA CHE FUNZIONA, e nessuna prova guarda la giuntura.** Il
   contenuto obbligatorio mancava perché il modello sapeva stamparlo e il generatore non glielo passava:
   **tre delle quattro prove sul documento erano già verdi**. ➡️ Dove due pezzi si incontrano, **la prova
   va messa sulla cucitura**, non sui due lati.
2. 🔴 **UN DIFETTO CHIUSO SENZA RETE SI RIAPRE IDENTICO.** Ricollegato il filo, il revisore l'ha **ritagliato**:
   **5327 prove su 5327 restavano verdi**. ➡️ **La prova che una correzione morde è la stessa rottura
   rifatta** — e va fatta, non immaginata.
3. 🛑 **UN ELENCO SCRITTO A MANO SEMBRA COMPLETO E NON LO È — quarta volta.** Il controllo che doveva
   garantire i contenuti del documento **ne elencava tre inventati e ne ometteva tre veri**, e quella
   numerazione arrivava **all'operatore**. ➡️ Dove esiste una **fonte** (un testo di legge, un vincolo,
   un indice), si cita quella, non una copia riscritta.
4. 🔑 **UNA PROVA PUÒ PASSARE PER IL MOTIVO SBAGLIATO, ed è indistinguibile da una che funziona.** La
   forma «prescrizione senza caratteristiche → avviso» **non** rileva il collegamento rotto: senza il
   dato l'avviso esce lo stesso. Morde solo la forma **opposta**.
5. 🟠 **TOGLIERE È PIÙ PERICOLOSO DI AGGIUNGERE, perché si può togliere anche una PORTA.** Nei tagli è
   uscito il ramo che permette di dichiarare le sostanze — **e una prova verde lo blindava**, col nome
   che diceva che il silenzio era voluto. ➡️ Quando si toglie un ramo condizionale, **si distingue il
   valore dal percorso**: il valore può sparire, il percorso deve restare.
6. 🛑 **UN COMANDO CHE LEGGE L'OROLOGIO NELLO STESSO BLOCCO DEL TESTO DA DATARE NON DATA NIENTE: DECORA.**
   Due orari sbagliati in una mattina, entrambi miei. ➡️ **`date` in un comando SEPARATO, e il testo si
   compone DOPO averne letto l'output.**
7. 🟠 **DUE VOCABOLARI CHE COLLIDONO SU UNA PAROLA:** «voce N» in memoria indica una sua sezione, e io la
   usavo per i contenuti dell'Allegato XIII. La guardia mi ha bloccato **due volte**; un rilettore umano
   non l'avrebbe mai visto.
8. 🔑 **«RICORDATI CHE A NOI INTERESSANO LE LEGGI ITALIANE» È STATA L'AGGIUNTA PIÙ PRODUTTIVA DELLA
   GIORNATA:** ha **ribaltato la domanda** invece di rispondervi, e ha scoperto che una prassi data per
   obbligo era una **scelta**, nata da una nota di un regime abrogato.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **Completare l'elenco degli effetti** (§0③) e con esso **il testo falso** di `classifica.ts:164`
   (§0①). **Va prima del cancello §0B.**
2. 🔴 **Scrivere il compito «l'evento si ritira»** (§0⑤), **ora con le condizioni del panel**: il test che
   decide la porta è l'**origine dell'informazione** (da fuori ⇒ mai ritirabile, **e il divieto sta nel
   database**) · il ritiro non è raggiungibile **prima che una derivazione sia girata** · il rapporto
   porta **entrambi i numeri** · 🛑 **`incidenti_mdr` NON è il modello** · il ritiro passa da una **RPC
   `SECURITY DEFINER`** o non ha storia · l'eccezione dell'atto verso l'esterno è oggi applicabile su
   **0 rami su 3** · e **un evento ritirato deve far scendere `post_consegna_correzioni`**, o è un
   secondo generatore di numeri falsi.
3. 🔴 **Dare un chiamante a `riapri_lavoro_atomica`** (§0②) — dipende da 1.
4. 🟡 **Task 5** (riemissione) → **6** («Devo intervenire», col cancello §0B) → **7** (i dieci minuti, **mai
   prima di D283**) → **8** (il testo della riga bloccata) → **9** (gate L2).
5. 🟠 **La FASE 9/9b su `FlussoConsegna`** (§0⑥).
6. 🟠 **Le voci nuove di roadmap:** **8-bis** (i difetti del fuso ancora aperti) · **9** (la casella «era
   fuori in prova», **panel normativo obbligatorio**) · **10** (i tre avvisi della consegna, aperta da
   Francesco oggi).
7. 🔴 **Le 4 prove rotte del TD04** (§0⑦) — fuori ondata, priorità alta.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. `docs/superpowers/plans/2026-08-06-intervento-post-consegna.md` — **le sezioni di ritrovamenti in
   fondo**: Task 4 · le due revisioni · il censimento D294 · i due panel · il ritrovamento sulle prove.
3. Il verbale, **tornate 116-122** (D286-D295).
4. `docs/roadmap/ROADMAP-UFFICIALE.md`, la coda «le prossime voci»: **8-bis · 9 · 10**.

## 5. Il minimo per non sbagliare

- 🛑 **`date` in un comando SEPARATO**, e il testo si scrive **dopo** aver letto l'output (§2.6).
- **L'uscita dietro una pipe è quella dell'ULTIMO comando**: `verify:full` si legge **da variabile**.
- **Per un'ASSENZA, un percorso alla volta**: un glob non quotato in zsh **aborta tutto**. Pagato di nuovo.
- **Le prove di integrazione vogliono le credenziali**, o si saltano in silenzio:
  `set -a && . ./.env.local; set +a`. La forma `grep .env.local | cut` **è rifiutata dal classificatore**.
- ⚖️ **D284 — applicare una migration al banco NON si chiede:** `npx supabase db push --linked --yes`
  (il `--yes` è **obbligatorio**). 🛑 Il **push su `main` resta di Francesco**.
- ⚠️ **In `memory/MEMORY.md` la formula «voce N» è RISERVATA alle sezioni della memoria** — per i contenuti
  dell'Allegato XIII si scrive «contenuto obbligatorio». La guardia blocca il commit (§2.7).
- 📄 **Il testo del Regolamento consolidato italiano è già scaricato**:
  `scratchpad/mdr_it.txt` (`02017R0745 — IT — 01.01.2026 — 006.001`). ⚠️ **Vive nello scratchpad e non
  sopravvive alla sessione**: se serve di nuovo e EUR-Lex è spento, la strada è
  **`publications.europa.eu` (Cellar)**, che **non è uno specchio**.
- **I nomi in `.superpowers/sdd/` NON sono distinti per ondata** — prefisso `intervento-`.
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- 🛑 **Worktree VIETATI.** Branch nel repo principale.
