# Handoff — Ondata «Redesign parete/home», dopo il collaudo device del 26/07

**Per:** sessione NUOVA a contesto pulito (richiesta esplicita di Francesco).
**Prassi:** BP-0 → `superpowers:subagent-driven-development` (un subagent fresco per task,
review a due stadi). Ha retto per tutta l'ondata, comprese due sessioni consecutive.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (CLAUDE.md §7 / ua-app §0D) · rm-guard ·
**Regola Advisor** (panel per ogni decisione significativa — usata oggi, ha evitato una
regressione: v. §«La trappola») · mockup PRIMA del codice, **e controllare i mockup prima di
inoltrarli**.

---

## Base di lavoro (NON ricreare niente)

- **Worktree ESISTENTE:** `.claude/worktrees/redesign-parete-home`, branch
  `worktree-redesign-parete-home`, HEAD **`a1c4fcb`** + la voce di memoria sopra.
  **Suite 3127 verdi / 19 skip · tsc 0 · build ok.**
- **Il ramo è ora anche su GitHub** (`origin/worktree-redesign-parete-home`, spinto il 26/07).
  ⚠️ Non fa partire nessuna pubblicazione: `deploy.yml` gira **solo da `main`**, e `ci.yml` solo
  su `main`/`develop`. È un backup, non un'anteprima.
- **Server di collaudo:** build di produzione su **:3020** dal worktree
  (`npx next build && npx next start -p 3020 -H 0.0.0.0`), IP `ipconfig getifaddr en0`.
  ⚠️ **Ogni `next build` invalida i chunk del server acceso**: dopo aver ricompilato, RIAVVIALO,
  altrimenti serve file che non esistono più e le pagine arrivano **senza CSS** — sembrano giuste
  perché ogni stile inline ha un fallback, ma **ogni misura fatta in quello stato è falsa**.
  Guardia pronta: `scripts/tmp/guardia-stili-3020.mjs`.
  Login collaudo: `e2e-titolare@ua-test.local` / `TestE2E!2026`.
- **Verbale QA unico (È LEGGE):** `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`
  — tutti i collaudi e le ratifiche, compresi i due APPEND del 26/07.
- **Ledger:** `<worktree>/.superpowers/sdd/progress.md` (gitignorato). La **lista MINOR per la
  review finale T17** è lì: cerca «Minor (per review finale)», ~15 voci.
- ⚠️ **La memoria di questo ramo è INDIETRO rispetto a `main`**: il worktree è a MEMORY (38),
  `main` è a (40)+. Le voci nuove vanno su **main**, dove la sessione nuova legge (BP-0). Questo
  handoff è copiato su main apposta — è la stessa trappola annotata dalla sessione scorsa.

---

## Cosa è stato chiuso il 26/07 (tutto verificato, non riferito)

| Fronte | Esito | Commit |
|---|---|---|
| **1a TastoPiù scentrato** | ✅ Un `*/` nella prosa di un commento CSS inghiottiva `.ua-home .foot`. Provato col parser (7 regole vs 8). −114,3px → 0 | `5dd3166` |
| **1b muro fino in fondo** | ✅ + round 2: una regola più specifica scartava il recupero in silenzio (18px invece di 58) | `8b2bc01` · `71c6a8b` |
| **Fondo unico in tutta l'app** | ✅ `#DDD8D3`→`#F4F0E7`, `#1A1916`→`#171411` in **4 posti** (`--bg`, `--ua-bg`, `--adm-bg`, **manifest**) | `90f3940` · `5ccc564` |
| **Note di contrasto scadute** | ✅ 6 commenti ri-misurati (erano tarati sul vecchio fondo) | `fc4c428` |
| **Variante 6 nomi studio** | ✅ gradino di corpo 10→9,5→9, poi via le parole di categoria | `ea02c45` · `8c2f81a` |
| **Guardia via A** | ✅ la cassetta non scrive più «SRL UNIPERSONALE» al posto del nome | `74ca230` |
| **Scala che girava due volte** | ✅ bandierina font alzata alla prenotazione, non dentro la promessa | `a1c4fcb` |

**Collaudo device di Francesco (build `5ccc564`): 4 punti su 5 PASS.** Tasto centrato · fondo
unico · suoni · **striscia panna SPARITA**. Vedi sotto per il quinto.

---

## 🛑 L'UNICA cosa in sospeso sul device

**La barra gesture NON è un difetto dell'app.** Francesco vede che il contenuto non continua
sotto la barra: in **scheda di Chrome** quell'area appartiene al browser, `env(safe-area-inset-bottom)`
resta 0 e `viewport-fit: cover` non ha effetto. Il manifest dichiara `display: standalone`
(`public/manifest.json:6`), quindi **da PWA installata** la pagina prende tutto lo schermo.

**Decisione di Francesco (26/07):** «la prova dell'installazione la faccio dopo **in produzione**».
→ Non c'è codice da scrivere. La verifica avverrà dopo il merge, installando l'app da icona.
**Non riaprire il difetto 1b**: la parte che dipendeva da noi è chiusa e misurata.

---

## Decisioni ratificate il 26/07 (non ridiscuterle)

1. **Nomi studio = variante 6**, e «DI SANTI GIUSEPPE» va bene. ⚠️ Nota: il nome intero entra
   solo **da 390px in su**; il telefono di Francesco è più stretto, quindi il gradino di corpo
   non basta e si passa correttamente a togliere le parole di categoria.
2. **Guardia = via A** (si rinuncia ad accorciare) e **non** via B (salta la sigla e riprendi).
   Panel: `docs/design/decisions/2026-07-26-parole-categoria-panel.md`.
3. **Le due parole nuove (`stomatologico`, `dentista`) NON si aggiungono.** Francesco: «i due nomi
   non li aggiungere». Motivo di merito già a verbale: con `stomatologico` in lista,
   `Istituto Stomatologico Italiano` si leggerebbe «ITALIANO».
4. **Campo «nome breve» in anagrafica: NON si fa** («per ora lascia perdere»). La regola copre 3
   nomi lunghi su 8; gli altri 5 si riscrivono a mano in anagrafica se danno fastidio.
5. **Nomi paziente: il wizard chiederà nome e cognome separati**, campo **non obbligatorio**.
   È il dato che oggi manca — v. §«Il prossimo lavoro».
6. **Bottone oro e difetti di leggibilità: DEFERITI** alle ondate di migrazione che possiedono
   quelle pagine («può essere che scomparirà del tutto»). Già appuntati in ROADMAP con contrasto
   misurato e ondata proprietaria. **Non intervenire ora.**
7. **`studio_nome` è INTOCCABILE.** È la denominazione del cliente in fattura elettronica
   (`src/lib/fattura/generate-xml.ts:262`, verificato) e la chiave a **confronto esatto** con cui
   si trovano i «colleghi di studio» (`src/app/api/clienti/[id]/studio-members/route.ts:50`), che
   alimentano il prescrittore sulla DdC. Nessuna «pulizia», mai.

---

## Il prossimo lavoro, in ordine

### 1. Nome e cognome del paziente nel wizard (ratificato, da progettare)
**Perché serve:** oggi l'app **non sa quale parola è il cognome**, e non per distrazione — le due
strade di scrittura compongono `nome_cognome` in ordine **opposto**:
- wizard: `src/lib/wizard/crea-lavoro.ts:144-145` manda `nome: ''`, `cognome: alias` → finisce
  quello che Francesco digita, nell'ordine in cui lo digita;
- form paziente + trigger `sync_paziente_nome_cognome` (`supabase/migrations/002_fase2_schema.sql:121`)
  → `upper(cognome) || ' ' || upper(nome)`, **cognome davanti**;
- e `src/lib/cassette/parco-shared.ts` seleziona **solo la stringa già composta**: le due parti non
  arrivano nemmeno al componente.

**Conseguenza:** «abbrevia la prima parola» su metà dei pazienti dà «B. Giuseppe» — cancella il
cognome. Il confronto visivo con le 6 proposte è pronto:
`docs/design/mockups/2026-07-26-nomi-paziente.html` (misurato: **34 studi su 38 occupano 2 righe**,
quindi il paziente schiacciato su una riga è il caso NORMALE, non il limite; l'ipotesi
«rimpicciolisco lo studio per liberare la riga» è scartata coi numeri).
⚠️ Il campo nuovo tocca il wizard: **percorso BP-2 completo** (brainstorm → validazione arch →
piano → TDD). Verificare se serve una migration (probabilmente no: le colonne `nome`/`cognome`
esistono già su `pazienti`).

### 2. T16 — la striscia in home
Valori già ratificati, brief nel piano `docs/superpowers/plans/2026-07-23-redesign-parete-home.md`
(Task 16), demo animazioni `docs/design/mockups/2026-07-24-striscia-animazioni.html` ratificata.

### 3. T17 — chiusura ondata
- rimozione overlay diagnostico `?diag=suoni` + `src/design-system/v3/sound-diag.ts` + le chiamate
  (commit dedicato, pattern `9416d25`);
- **pulizia `scripts/tmp/`**: la cartella è piena di banchi di misura di due sessioni (untracked,
  ma `scripts/tmp/shot-rete-ancorata.mjs` era finito committato dai commit rete);
- FASE 7 reale (tsc + vitest + build, output);
- FASE 8 review WHOLE-BRANCH con la **lista MINOR dal ledger** (~15 voci);
- allineamento spec DS v3 §9 (7 suoni + semantica enqueue/restart) e §piede (statico);
- FASE 9 Playwright 390/768/1280 × 2 temi;
- **FASE 9b GATE ESTETICO L2** (obbligatorio prima del merge);
- 🛑 **merge SOLO a parola di Francesco**;
- FASE 11 BP-1 pieno **su `main`** (v. la trappola della memoria sopra).

---

## Parcheggiati (NON toccare senza Francesco)

- **Parete centrata su tablet/desktop** — richiesta VERA («solo che venga centrato nella
  visualizzazione tablet e desktop, punto»). I mockup rete (`105c6ba`/`f1236d5`) sono ARCHIVIATI.
- **Priorità paziente/clinico nella fascia** — deferita.
- **Drag scattoso iPad** → filone «iOS fluidità» in ROADMAP (root cause misurata: FLIP
  `layout="position"` 169 recalc/24,9ms vs 0,6ms compositor — preesistente).
- **Rilievo delle card sulle pagine v2.3**: col fondo unico le card non sembrano più sollevate
  (segno card−fondo ribaltato, costo misurato e ACCETTATO da Francesco). Si recupererebbe
  schiarendo `--sfc`/`--elv`: intervento SEPARATO, mai chiesto.

---

## Vincoli tecnici accumulati (non ripetere gli errori)

Tutti quelli degli handoff precedenti (jsdom non fa layout → harness reale · `.ds-parete` mai
`overflow:hidden` · pattern muro `--passo-maglia` · sheet history `uaSheet` · refresh gated ·
**il checkout PADRE è su `main`: ogni misura va fatta NEL WORKTREE** · Playwright-WebKit ≠ Safari
reale · **misure, non ipotesi** · `is-troncato` si misura PRE-PAINT) **PIÙ i sei nuovi del 26/07**:

1. **Un `*/` nella prosa di un commento CSS chiude il commento in anticipo** e inghiotte la regola
   che segue. Le guardie che fanno `toMatch` sul **sorgente grezzo** non lo vedono: la regola è
   ancora nel testo. Guardia nuova: `tests/unit/home-style-parsabile.test.ts` (simula la rimozione
   dei commenti come un parser e cerca le regole in ciò che RESTA).
2. **Una regola più specifica che ridichiara uno shorthand scarta l'intero valore, in silenzio.**
   `.ds-parete-shell .ds-parete` (0,3,0) sovrascriveva il `padding` della regola base (0,2,0).
   Guardia nuova: `tests/unit/ds-v3/parete-fino-in-fondo.test.ts` pretende il recupero da **OGNI**
   regola del foglio che dichiari `padding` su `.ds-parete`.
3. **In `ds-v3.css` i commenti vanno FUORI dalle graffe.** Le guardie letterali di
   `parete-fluida.test.ts` leggono il foglio **coi commenti dentro**, coi soli spazi normalizzati.
4. **`.gitignore:58` ignora `*.png`.** Un `git add -A` salta gli screenshot **in silenzio**: serve
   `git add -f`. Gli storici erano stati aggiunti così.
5. **Il ResizeObserver non riscatta se la scatola resta cappata da `max-height`.** Iniettare nomi
   in sequenza nello stesso nodo dà una classe stantia → **falso positivo dell'harness**. Misurare
   con **pagina pulita per ogni nome**, o su un **clone** dentro la stessa cassetta.
6. **Le affermazioni di contrasto scritte nei commenti scadono** quando cambia una superficie.
   Sei note erano tarate sul vecchio fondo. Se tocchi `--bg`/`--sfc`, **ri-misura e correggi le
   note**: una nota che dice un numero e un render che ne dice un altro è la stessa classe di
   difetto del padding sovrascritto.

---

## La trappola che il panel ha evitato (da ricordare come metodo)

Il documento di ricerca `2026-07-26-parole-categoria-ricerca.md` descrive la correzione in **due
punti con parole diverse**. Il §5.1 è giusto; il **§3.5 è sbagliato**: dice «le 4 lettere contate
sulla **prima parola**». Preso alla lettera **uccide due esiti già approvati da Francesco** —
`DI SANTI GIUSEPPE` («DI» = 2 lettere) e `SAN RAFFAELE` («SAN» = 3). In italiano San/Santa/Di/Del/De
sono fra le teste di nome più comuni.

Se ne è accorto **solo** l'advisor di architettura, leggendo il codice riga per riga. Senza il
panel, quel documento sarebbe stato ratificato così com'era. **È il motivo per cui la Regola
Advisor esiste** — e il motivo per cui i pareri vanno chiesti a prospettive DIVERSE, non a tre
copie dello stesso profilo.
