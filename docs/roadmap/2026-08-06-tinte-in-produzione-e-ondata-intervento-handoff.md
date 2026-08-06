# Handoff — le tinte sono in produzione, e la giornata si chiude con una direttiva che apre un'ondata

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 6 agosto 2026, mattina-mezzogiorno (`provato:` `date` → `2026-08-06 11:45 CEST`).
**Stato:** **`main` PUBBLICATO** — `git push origin main` → `affec7ae..1a2d1fc9`. Albero **pulito**,
**0 salvataggi** avanti a `origin/main`.
⚠️ **L'hash non si ricopia da qui**: `git log --oneline -1` e `git log --oneline origin/main..main | wc -l`.

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0** letta da variabile e non da
pipe, ore 11:43): tsc **0** · eslint **0** · `npm run build` ok · **sette guardie verdi** ·
`vitest` **5069 passate | 19 saltate** (**429 file | 3 saltati**, 432 in tutto).
📈 Riferimento di stamattina: 5057 | 19 su 427 file → **+12 prove, +2 file**.
📈 Sull'**intera ondata delle tinte**, contro il riferimento scritto nel piano (4275 prove | 370 file):
**+794 prove, +59 file**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🟡 IL MESSAGGIO DELLA RIGA BLOCCATA È IN PRODUZIONE **SENZA** LA SUA SPIEGAZIONE — e per scelta
`provato:` con la DdC emessa, `SchedaLavoroV3.tsx:462` rende la riga `modificabile: false` e la disegna
come `RigaDato`, **senza una parola** che dica perché. Il gemello «Colore» ha lo stesso vuoto
(`colore-riga-scheda.ts:135,149,171`: i suoi sottotitoli dicono la **provenienza**, mai il congelamento).
🔑 **Non è un lavoro fatto a metà: è un lavoro NON FATTO, con la ragione scritta (D261).** Erano state
portate a Francesco tre proposte di testo; lui ha risposto **«prima decidiamo la finestra»**, e aveva
ragione: «*non si cambia più*» è vero **solo dopo i 10 minuti** — entro, la via d'uscita esiste, e un
messaggio che la nasconde ferma l'utente quando poteva ancora rimediare.
➡️ **Il testo si scrive dentro l'ondata nuova**, una volta sola e già giusto.

### ② 🟡 IL GATE ESTETICO L2 ARRETRATO DEL **WIZARD** è fermo da cinque giorni
Invariato: il foglio «Allega la prescrizione» e la schermata «Fatto!» non sono mai stati fotografati.
Si raggiungono **solo creando lavori veri** (sei, per tre formati × due temi).

### ③ 🟡 CINQUE ⚠️ DEL GATE L2 SONO DEFERITI, col motivo — e uno è una DECISIONE, non un ritocco
Elenco e ragioni in `docs/design/screenshots/2026-08-06-tinte/GATE-L2.md` §4. Il più importante:
**la pagina `/lavori/[id]/modifica` monta DUE design system insieme** (`provato:` 293 elementi ereditano
**DM Sans** dal `<body>` v2.3, mentre la tavolozza nuova usa **Plus Jakarta Sans** v3).
⚠️ **Non è un difetto**, ed è importante non trattarlo come tale: la convivenza migra **per route, mai per
componente**, e questa route non è mai stata migrata. È un'**ondata di migrazione da mettere in programma**.
Gli altri quattro: spazio morto a 1280 · odontogramma (39 testi a **4,38** contro 4,5; due gettoni a
**30px**) · barra laterale desktop (43,3px; «Tema» a **4,17**) · «📦Pacchetto Consegna MDR» senza spazio
dopo l'emoji.

### ④ 🟡 D253 sul COLORE resta sospesa
Invariata: la riga «Nessuna» premibile è stata fatta **per la tinta**; per il **colore** aspetta **D254**
(senza l'id fine del tipo, l'app non sa se un lavoro preveda un colore — quattro macro su nove sono miste,
l'id fine **non è persistito**).

### ⑤ 🟠 Igiene, invariata
`provato:` **32 rami locali** (`git branch | wc -l`) · `.superpowers/sdd/` con **42 file**, ignorata da git
e mai archiviata. **Rientra nell'ondata di riordino (D257), che si apre DOPO le tinte** — e le tinte ora
sono chiuse, quindi la strada è libera.

### ⑥ 🟡 Invariati da ieri
L'ordine della pila blu a **1280** non provato · **riga 16** (`image/heic` fuori lista,
`src/lib/storage/tipi-immagine.ts:11`) · **`CRON_SECRET`** su Vercel · **rete mobile vera** · **il 12
contro 13** · il resto di **P37**.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| ⚖️ **D260 — il rilievo aperto è chiuso su ENTRAMBI i gemelli** | La premessa che l'handoff aveva messo in dubbio **reggeva**, per il verso opposto a quello scritto: le mezze coppie sono **due** e vanno al contrario. Una regola sola |
| 🔬 **Collaudo a schermo — il primo mai fatto sulle tinte** | **4 passi su 4.** Tinta messa dall'app → riletta **dalla banca dati** → vista sulla scheda → cambio tipo con l'avviso. Il ramo **D117 si è acceso per la prima volta** |
| 🎨 **Gate estetico L2** | 12 sezioni × **2 superfici** × 3 viewport × 2 temi. **Due difetti veri trovati e chiusi**; la **tavolozza promossa** |
| 🔴 **Un campo era IRRAGGIUNGIBILE** | Con l'avviso aperto la barra è alta 167px: le **Note interne** restavano sotto di lei **anche scorrendo in fondo**. Chiuso misurando la barra (`ResizeObserver`), mai con un numero a mano |
| 🔴 **Le righe della scheda erano a 43,50px** | Contro i 44 della checklist §8, «Modifica tinta» compresa. Mezzo pixel: **invisibile a occhio**. Ora 44,00 |
| ⚖️ **D261** | Il messaggio della riga bloccata **non si scrive ora**: «prima decidiamo la finestra» |
| ⚖️ **D262 — direttiva permanente** | «*La PWA non deve fornirci blocchi o ostacoli, ma aiuti concreti*». Si deve **sempre poter intervenire**, fino alla fatturazione |
| 🔴 **La finestra dei 10 minuti è un RESIDUO** | Nasceva per non far incontrare all'annullo una fattura **automatica** alla consegna. Quell'architettura **non è mai stata eseguita** |
| ⚖️ **D263** | Si riapre il lavoro **dichiarando il motivo**, e **il motivo sceglie l'iter**. Sette casi istruiti |
| 🚀 **PUBBLICATO E DEPLOYATO** | `affec7ae..1a2d1fc9..4a69800b`. ✅ CI sul codice **success** · job «Deploy to Production» **success** · sito **200** su `/login` in 0,85s |

## 2. 🔑 Le lezioni

1. 🔴 **Una premessa messa in dubbio va verificata come la decisione che regge — e il DUBBIO va verificato
   quanto la premessa.** L'handoff aveva fatto benissimo a fermarsi davanti a «la forma è identica al
   gemello»; ma aveva controllato **una sola delle due metà**, e per **uno solo dei due gemelli**. La
   conclusione («sono due casi diversi») era sbagliata, e la premessa reggeva.
   ➡️ **Chi sospende una decisione scrive ANCHE la lettura che chiuderebbe il sospetto**, o il sospetto si
   tramanda come se fosse un fatto.
2. 🔴 **Una correzione va rimisurata sul fatto, non sulla causa che credevi di aver tolto.** Il difetto
   dell'avviso è stato «chiuso» una prima volta togliendo il fondo trasparente e portando il riquadro nel
   flusso della barra: la **leggibilità** era risolta. Rimisurando, la **copertura** c'era ancora — la
   barra è `sticky` e galleggia comunque — e sotto c'era di peggio: **un campo irraggiungibile**.
   ➡️ **Se non rimisuri, dichiari chiuso un difetto che hai solo spostato.**
3. 🔴 **Un vincolo sopravvive all'architettura che lo giustificava, e da lì in poi sembra una regola.**
   I 10 minuti proteggevano da una collisione con una fattura automatica **che non esiste**. Nessuno li
   aveva più riletti perché **una costante con una sigla accanto (`// C4`) ha l'aria di essere stata
   decisa** — e lo era, ma per un mondo che non c'è più.
   ➡️ Quando un limite dà fastidio, **la prima domanda è «da dove nasce», non «quanto lo allargo»**.
4. 🔑 **Il gate a schermo trova ciò che nessuna prova unitaria può trovare.** Mezzo pixel su un bersaglio
   da dito, e un campo che finisce sotto una barra: due difetti veri, **nessuno dei due visibile** né dal
   codice né dai test. E in cambio ha **promosso** ciò che si temeva (il nome lungo che sfasava la riga).
5. 🟠 **Correzione a me stesso, sullo strumento:** la prima sonda del gate ha dichiarato «+ Nuovo lavoro»
   a **1,24** di contrasto — un valore da allarme rosso. **Falso positivo:** è testo bianco su **gradiente**,
   e la sonda risaliva l'albero fino al pannello panna. **Un gate che riferisce rumore si smette di
   leggere**, ed è il modo in cui un controllo automatico diventa peggio di nessun controllo.
6. 🔑 **Una domanda di Francesco può essere migliore della domanda che gli hai fatto.** Gli erano state
   portate tre proposte di testo; lui ha chiesto **come si rimedia a un errore**, e quella domanda ha
   reso inutile la scelta — oltre ad aprire un'ondata.

## 3. Che cosa resta aperto (in ordine)

1. 🆕 **L'ondata «SI DEVE SEMPRE POTER INTERVENIRE» (D262 + D263)** — è il lavoro nuovo, e va aperto
   **con panel** (dominio critico: documento a valore legale). Materiale già scritto: la **centosettesima
   tornata** del verbale, coi **sette casi**. 🛑 **Il primo nodo:** il confine fra «difetto visto dal
   laboratorio **prima** dell'applicazione» (rilavorazione, **non** sorveglianza) e «difetto segnalato dal
   medico **dopo**» (reclamo, e se c'è rischio **vigilanza Art. 87**).
2. 🟡 **Il microcopy della riga bloccata** (§0①) — dipende dalla ①.
3. 🟡 **Il gate L2 arretrato del wizard** (§0②).
4. 🟡 **L'ondata di migrazione della route `/lavori/[id]/modifica`** (§0③).
5. 🟠 **Il riordino della memoria (D257)** e l'igiene (§0⑤): le tinte sono chiuse, **la strada è libera**.
6. 🟡 Il resto di §0⑥.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. **La centosettesima tornata** di `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`
   (D263, i sette casi) e la **centoseiesima** (D262, con le tre verifiche sulla finestra).
3. **`docs/roadmap/ROADMAP-UFFICIALE.md`** — la voce dell'ondata nuova è in testa.

## 4-bis. ⚠️ Una trappola di LETTURA, pagata oggi — vale per ogni pubblicazione futura

Nell'elenco dei job che `gh run watch` stampa compare la riga «**CI fallita — deploy saltato**». Letta di
fretta sembra il referto di un disastro: **non lo è.** È il **nome** del job che il workflow esegue *solo
se* la CI fallisce (`deploy.yml:56-58`, `if: conclusion != 'success'`), e a pubblicazione riuscita risulta
**`skipped`**.
🔴 **Oggi ha prodotto un falso allarme dichiarato a Francesco** — «le tinte forse non sono in produzione» —
rientrato un minuto dopo guardando i job invece dei nomi:
```bash
gh run view <id> --json jobs --jq '.jobs[] | {name, conclusion}'
# → {"conclusion":"success","name":"Deploy to Production"}
# → {"conclusion":"skipped","name":"CI fallita — deploy saltato"}
```
🔑 **La regola generale:** in una pipeline, **il nome di un job non è il suo esito**. Un ramo di fallimento
ben nominato *compare sempre*, anche quando tutto va bene.

## 5. Il minimo per non sbagliare

- **`main` è pubblicato.** 🛑 Mai un worktree. Per lavorare: `git checkout -b <nome>` nel repo principale.
- **Il banco:** `npm run build`, poi la configurazione **`ua-prod-3020`** (nel `launch.json` della
  **cartella superiore**, non in `ua-app/.claude/`).
- **L'accesso:** `BASE=http://localhost:3020 npx tsx scripts/link-accesso.ts [email] [percorso]`.
  ⚠️ **L'utenza conta:** `francesco.formicola@live.it` è `admin_sistema` e viene **dirottata su
  `/admin/labs`**; per la scheda di un lavoro serve un utente **di quel laboratorio** — es. `h4t@live.it`.
- **Il ponte SQL:** `node scripts/psql.mjs -c "SQL"`.
- ⚠️ **Il browser interno NON riesce a premere le linguette della scheda** (il click seleziona il testo e
  va in timeout a 30s): per il collaudo si usa **Playwright** (`mcp__plugin_playwright_*`). Le schede della
  pagina di modifica si raggiungono anche per indirizzo: `?tab=clinica`, `?tab=dati`.
- 🛑 **Il push può essere rifiutato dal classificatore**: se succede, **si chiede a Francesco**, non si
  aggira. (Successo oggi: rifiutato una volta, poi autorizzato da lui.)
- 🛑 **Per stabilire un'ASSENZA, un percorso alla volta** — in zsh un glob non quotato **aborta tutto il
  comando** (ricapitato oggi con `--include=*.tsx`).
- 🛑 **L'uscita di un comando dietro una pipe è quella dell'ULTIMO**: `verify:full` si legge da variabile.
- 🛑 **La data e l'ora si leggono da `date`, sempre** (D155).
- ⚠️ **`memory/MEMORY.md` e `ROADMAP-UFFICIALE.md` non si aprono col lettore di file** (troppo grandi):
  si leggono con `sed -n '1,60p' … | cut -c1-260`. È il difetto che **D257** deve chiudere.
- **Il prossimo numero di decisione è D264.**
