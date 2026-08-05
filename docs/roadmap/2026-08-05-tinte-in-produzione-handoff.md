# Handoff — le tinte sono in produzione a metà, e la giornata ha inseguito una sola famiglia di difetti

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 5 agosto 2026, sera tardi (`provato:` `date` → `2026-08-05 22:30 CEST`).
**Stato:** `main` = **`453d7735`**, **pubblicato**, **0 commit in attesa**, albero **pulito**.
🚀 **T1-T6 dell'ondata «tinte» sono IN PRODUZIONE** (merge fast-forward `c6446d98..0cba8dba`, 25 salvataggi),
CI verde, rilascio verde, sito 200.

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0** letta senza pipe, ore 22:31):
tsc **0** · eslint **0** · `npm run build` ok · **sette guardie verdi** ·
`vitest` **5016 passate | 19 saltate** (**422 file | 3 saltati**, 425 in tutto).
📈 Riferimento di ieri sera: 4991 | 19 su 419 file → **+25 prove, +3 file**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🛑 TRE TASK SU NOVE MANCANO, e senza di loro ciò che è in produzione NON SERVE A NESSUNO
`provato:` `grep -rln "setCampoAttivo('tinta')\|campo=\"tinta\"" src/` → **0 risultati**; e le uniche due
occorrenze di «tinta» nei componenti sono **falsi positivi** (`dis-tinta base`, BOM).
**In produzione la tinta è INERTE:** il dato si salva, si normalizza e si toglie da solo al cambio di tipo —
ma **nessuna schermata la mostra e nessuna la scrive**. `provato:` **0 lavori con tinta** in banca dati.
➡️ Restano **T7** (la riga sulla scheda, **emendata da D247**: si preme e apre il foglietto) · **T8** (il campo
sulla pagina di modifica con la tavolozza) · **T9** (chiusura, collaudo, gate estetico).
🛑 **Il T7 NON parte dal ramo `tinte-manufatto`, che è assorbito: parte da una branch NUOVA su `main`.**

### ② 🟡 Il gate estetico L2 sulle DUE SUPERFICI DEL WIZARD è arretrato da TRE giorni
Invariato rispetto a ieri: il foglio «Allega la prescrizione» e la schermata «Fatto!» non sono mai state
fotografate. `provato:` in `docs/design/screenshots/` **non esiste** una cartella per loro.
🔑 **Costa più di quanto sembra:** si raggiungono **solo dopo aver creato un lavoro**
(`FrameFatto` è montato dentro il wizard e `AllegaPrescrizioneSheet` dentro `FrameFatto`), quindi tre formati
per due temi vuol dire **creare sei lavori veri** e poi cancellarli.

### ③ 🟡 L'ordine della pila blu a 1280 resta NON PROVATO
Invariato da ieri: a 390 e 768 l'ordine è verificato; a 1280 la casa desktop è un'altra composizione
(`HomeDesktop`) e il clic sull'etichetta va in timeout. **Non è un difetto — è un layout diverso** — ma la
prova va rifatta dalla via giusta di quella pagina.

### ④ 🟠 Due rilievi della revisione di ramo sono APERTI di proposito, e uno ha un innesco futuro scritto
`provato:` sono dichiarati nel codice (`grep -c "RILIEVO DELLA REVISIONE DI RAMO"` → 1) e nel piano.
1. **Mezza coppia di tinta azzera senza dichiararlo.** Il blocco entra su *una qualsiasi* delle due chiavi
   mentre il contratto dice «insieme o nessuna»: un corpo col solo `tinta_famiglia` risolve a `NESSUNA_TINTA`
   e cancella una tinta valida **in silenzio**. 🔒 Oggi **irraggiungibile** (nessuna superficie manda la
   tinta) e la forma è **identica al gemello del colore**, che si comporta così **da luglio**.
   ➡️ **Si chiude nel T8, insieme all'altro** — correggerne uno solo creerebbe due regole per lo stesso
   problema, cioè il difetto che quest'ondata combatte.
2. **`colore_scartato` non ha ancora un lettore.** D248 l'ha fatto uscire dalla PATCH, ma **nessuna
   schermata lo legge**. ⚠️ Oggi non serve, perché il campo colore della pagina di modifica è una **tendina
   di 19 codici** tutti in catalogo. 🔴 **Diventa necessario nel momento in cui quel campo torna testo
   libero o si allargano le scale ammesse** — ed è scritto nel codice accanto al blocco.

### ⑤ 🟡 La riga 22 è aperta ma non iniziata, e tre righe restano scoperte da ieri
- **Riga 22** (le liste scritte due volte): censimento fatto e strumento sotto git, **nessuna correzione**.
  Le prime tre toccano **validazione e fiscale** → percorso GRANDE. **L'apertura la decide Francesco.**
- **Riga 16** — le foto **dalla libreria** dell'iPhone: `provato:` `image/heic` è **fuori** dalla lista
  (`src/lib/storage/tipi-immagine.ts:11`), con le due vie scritte lì (allargare il bucket o rifiutare al
  selettore). **Non deciso.**
- **`CRON_SECRET` su Vercel:** il codice che lo usa esiste
  (`src/app/api/internal/orfani-storage/route.ts:52-55`), la **variabile va confermata nel pannello Vercel**
  — non verificabile da qui.
- **Rete mobile vera** e **il 12 contro 13**: nessuna misura nuova. **Non verificati.**

### ⑥ 🟠 Igiene lasciata indietro, dichiarata perché non si scopra per caso
- **`.superpowers/sdd/` è FUORI da git e i referti dell'ondata `ondata-b-sessione-3` non sono mai stati
  archiviati.** La numerazione `task-N` **non è distinta per ondata**: il Task 6 di D42 ha riusato il nome
  `task-6-report.md` e il contenuto originale si è salvato **solo perché l'esecutore se n'è accorto** e l'ha
  messo da parte (`task-6-report-ondata-b-sessione-3-PRESERVATO-2026-08-05.md`). **Gli altri file di quella
  ondata restano esposti alla stessa sorte.**
- **`scripts/tmp/` (ignorato): 297 file, 22 MB**, dal 17 luglio. `provato:` **65 citazioni** nei documenti,
  di cui **6 rotte** (tutte in referti storici, danno nullo). Nelle **direttive permanenti** ce n'era **una
  sola** — sistemata oggi.
- **25 rami locali**, fra cui `tinte-manufatto` **assorbito** e vari `worktree-*` di un'epoca in cui i
  worktree erano ammessi. Nessuno cancellato.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| 🔨 **T4 `risolviTinta`** | ✅ La normalizzazione server-side. **Quattro difetti del piano**, fra cui la guardia sul tipo applicata a **un solo lato** e una prova che sarebbe stata verde **anche senza la regola che verificava** |
| 🔨 **T5 la PATCH** | ✅ Allowlist, normalizzazione, **D117** (al cambio di tipo la tinta si toglie **e lo dichiara**). **Cinque difetti**, fra cui una `select` che non leggeva le colonne necessarie — senza le quali **ogni** correzione di tinta sarebbe stata scartata e il ramo D117 sarebbe stato **codice morto verde coi finti** |
| 🔨 **T6 il rifacimento** | ✅ Eseguito da un **sottoagente** (R-E1, primo uso): la RPC clona la tinta. Allineamento **34 colonne ↔ 34 valori** verificato **due volte in modo indipendente** |
| ⚖️ **D247** | La riga della tinta sulla scheda **si preme** e apre il foglietto — era la domanda «mai arrivata a Francesco», portata **prima** del collaudo |
| ⚖️ **D248** | Il difetto **gemello** del colore chiuso: la PATCH ora dichiara il colore perso, come già faceva la creazione |
| ⚖️ **D249** | La **pubblicazione è delegata** a chi esegue — restano dovute FASE 7, revisione, collaudo, CI e smoke |
| ⚖️ **D250** | La **forma delle risposte in chat** fissata («tabella prima»), **dopo** tre formati a confronto e quattro messaggi di prova |
| 🧬 **Riga 22, nuova** | Censimento delle **liste scritte due volte**: 635 file → **14 gruppi**, 3 falsi allarmi chiusi, **6 copie libere**, 5 non esaminate |
| 🔧 **`type Campo` unificato** | Era ricopiato in due file con un commento che **dichiarava** la duplicazione senza chiuderla |
| 🚀 **Rilascio** | T1-T6 in produzione dopo revisione di ramo (**verde**) e collaudo dal vivo sul **percorso vero** |

## 2. 🔑 Le lezioni

1. 🔴 **Una protezione che nasce PER RIMBALZO non è una protezione: è una coincidenza in servizio
   permanente.** `type Campo` sembrava difeso, ma a protestare era una tabella dei titoli accanto, che
   difende **sé stessa**. Bastava un `Partial<Record<…>>` e un ramo irraggiungibile sarebbe passato in
   silenzio. ➡️ **Quando una rete regge, si chiede PERCHÉ regge:** se la risposta non nomina la cosa che
   deve difendere, non è una rete.
2. 🔴 **Un commento che promette una garanzia è un'affermazione, e vale la regola delle altre: o porta la
   prova, o si scrive più modesto.** Oggi ne sono stati scritti **TRE falsi**, tutti da chi lavorava:
   «la posizione di questo blocco è portante» (`provato:` spostandolo, tutte le prove restano verdi) ·
   «quello script non esiste» (c'era) · «la pagina di modifica toglie il colore dal corpo» (lo toglie e lo
   **rimette** quattordici righe dopo). **Nessuna trovata da un controllo automatico: tutte da una
   rilettura.** Una falsa sicurezza scritta nel codice è **peggio del silenzio** — il prossimo la legge e
   smette di controllare.
3. 🔑 **Quando un comando serve a stabilire un'ASSENZA, l'assenza si verifica un percorso alla volta.**
   In zsh un glob che non trova nulla fa **abortire l'intero comando**: `ls a* b*` con `a*` vuoto non guarda
   mai `b*`. È costato una conclusione sbagliata e un file riscritto da zero. ⚠️ **La stessa trappola è
   tornata un'ora dopo** con `grep --include=*.ts`.
4. 🔑 **Il verde mirato non basta: la rete intera trova ciò che le prove scelte a mano non vedono.**
   Aggiungendo tre colonne a una `select`, **20 prove in 2 file** sono diventate rosse — e le **tre** prove
   sorelle scelte a mano erano **tutte verdi**. Causa: due finti riconoscevano la query confrontando la
   **stringa esatta**, cioè erano diventati un **calco**. ➡️ Un finto riconosce **l'intenzione**, non
   l'ortografia.
5. 🔑 **Una sostituzione automatica non è avvenuta finché non la si è verificata.** Un `perl -pi -e` non ha
   trovato il testo, non ha detto nulla, e per un'ora un documento ha dichiarato «5 task» dopo che era stato
   annunciato «6». ➡️ **Ogni sostituzione porta la sua verifica nello stesso comando.**
6. 🔑 **Un segnale verde può riguardare un'altra cosa.** Il messaggio «rilascio riuscito» era di un commit
   **precedente**: senza confrontare l'identificativo si sarebbe dichiarata in produzione una cosa non
   ancora pubblicata — e lo smoke sul sito **l'avrebbe pure confermato**, perché il sito rispondeva col
   codice di prima.
7. **Un attrezzo che sparisce trasforma una misura in un'affermazione.** Il ponte SQL e il censimento sono
   **sotto git** da oggi per questo. ⚠️ Ma la stessa fretta ha prodotto la lezione ③: prima di dire «non
   c'è», guardare.
8. 🛑 **Le condizioni che ci si dà si contano prima di agire, non dopo.** D249 ne elencava **cinque**; al
   momento di pubblicare ne erano state fatte **tre**. Fermarsi è costato mezz'ora; non fermarsi sarebbe
   costato una revisione saltata su codice che tocca una rotta viva.

## 3. Che cosa resta aperto (in ordine)

1. 🔨 **Il Task 7** dell'ondata tinte — la riga sulla scheda, **come emendata da D247** (si preme, apre il
   foglietto, **non** è muta). ⚠️ Da **branch nuova su `main`**. Il piano ha il task **emendato in testa**,
   col prezzo dichiarato (la tavolozza in due posti) e il ritrovamento sul `type Campo` **già chiuso**.
2. 🔨 **T8** (il campo sulla pagina di modifica) — e con lui **i due rilievi §0④**, che si chiudono insieme.
   📌 Il T8 eredita una lettura fatta stasera: `useLavoroForm.ts` **non manda i sette campi denti/colore
   dalla PATCH** ma da una rotta dedicata; la tinta dovrà scegliere **da quale strada viaggia**.
3. 🔨 **T9** — chiusura, collaudo e **gate estetico L2** (dovuto: D247 cambia l'aspetto della scheda).
4. 🟡 **Riga 22** — le liste scritte due volte. **Apertura da decidere.**
5. 🟡 **Il gate L2 arretrato** (§0②) e **l'ordine a 1280** (§0③).
6. 🔴 **Il resto di P37**: la Dichiarazione stampa come prescrittore una **ragione sociale** dove la norma
   vuole una **persona con qualifiche professionali**, e la casella dell'**istituzione sanitaria** non esiste
   nel documento.
7. 🟡 **Righe 13, 14, 16, 17** · **`CRON_SECRET`** · **rete mobile vera** · **il 12 contro 13**.
8. 🟠 **L'igiene di §0⑥** — archiviare `.superpowers/sdd/`, i 25 rami locali.

## 4. Da dove ripartire

1. **`docs/roadmap/ROADMAP-UFFICIALE.md` riga 6** — dice cosa è in produzione e cosa resta.
2. **`docs/superpowers/plans/2026-08-03-tinte-manufatto.md`** — ⚠️ **prima della prosa si leggono i
   «RITROVAMENTI ESEGUENDO»** in fondo: ora sono **quattro sezioni** (T1 · T2 · T3 · T4 · T5), e il piano ha
   ceduto in **quindici punti** su sei task. Il **Task 7 è emendato in testa** da D247.
3. **`ua-app/CLAUDE.md` §0D** — la forma delle risposte (D250), da oggi **autosufficiente**.

## 5. Il minimo per non sbagliare

- **Il ponte SQL è SOTTO GIT:** `node scripts/psql.mjs -c "SQL"` oppure `<file.sql>`. Esce **non-zero** se
  qualcosa fallisce (provato in entrambi i versi). ⚠️ Avvisa che il certificato del pooler **non è
  verificato**: con `PGSSLROOTCERT` lo verifica davvero.
- **L'accesso al banco è SOTTO GIT:** `BASE=http://localhost:3020 npx tsx scripts/link-accesso.ts [email]
  [percorso]` — l'email ripiega su `TEST_EMAIL`. 🛑 **Il link vale un accesso: si usa e si butta.**
- **Il banco:** `npm run build`, poi la configurazione **`ua-prod-3020`** già esistente (⚠️ **non
  crearne una nuova**: il `launch.json` del progetto è parziale, quello vero sta un livello sopra).
- 🛑 **Per stabilire un'ASSENZA, un percorso alla volta** — in zsh un glob vuoto abortisce tutto il comando.
- 🛑 **Ogni sostituzione automatica porta la sua verifica nello stesso comando** (`grep -c` dopo il `perl`).
- 🛑 **L'uscita di un comando dietro una pipe è quella dell'ULTIMO della pipe.** `npm run verify:full | tail`
  seguito da `$?` legge l'uscita di `tail`. Si redirige su file e si legge `$?` subito.
- **Per più vincoli in una transazione servono i SAVEPOINT**, o al primo errore tutto il resto viene
  **ignorato in silenzio**. **`UPDATE … LIMIT 1` non esiste in Postgres.**
- ⚠️ **Il verbale delle decisioni è FUORI dalla catena della guardia**: il conteggio si verifica a mano
  (oggi: **250 dichiarate, 250 reali, ultima D250, nessun buco**).
- 🛑 **Mai un worktree in questo progetto.** 🛑 **«Voce» e «riga» non sono sinonimi**, e la guardia ferma il
  commit.
- **Il prossimo numero di decisione è D251.**
