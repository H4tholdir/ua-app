# Handoff — l'ondata (b) è decisa e disegnata: si scrive il piano (28/07/2026, sera)

**Per:** la sessione successiva, contesto pulito.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**, poi **la spec**
`docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md`. Il resto solo se serve.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **REGOLE DI PIANO R-P1/R-P2/R-P6** · **BP-1**.

> 🛑 **Sostituisce `docs/roadmap/2026-07-28-ondata-b-handoff.md`** (quello di stamattina), che resta come
> storia ma contiene una premessa **falsificata** e una richiesta di panel **decaduta**. Se lo apri, leggi
> prima il banner in testa.

---

## 0. In una riga

**L'ondata (b) non ha più domande aperte: ha 20 decisioni ratificate e una spec RATIFICATA.
Manca il piano — e quattro anteprime.** Nessuna riga di codice scritta, database toccato **solo in lettura**.

> 🆕 **Aggiornato la sera del 28/07, dopo la ratifica.** La spec è stata portata a Francesco sezione per
> sezione ed è **approvata**, ma con **quattro emendamenti** (D17-D20, verbale «terza tornata»): briciole
> **toccabili** con avviso quando un cambio a monte perde dati · **via d'uscita esplicita** dal wizard, che
> azzera il salvataggio locale, **più la correzione della freccia indietro** (difetto contro la direttiva
> del 22/07: `WizardNuovoLavoro.tsx:219-222` fa `router.push('/dashboard')`) · la **rete di ripresa 24h
> resta com'è** · l'aiuto dichiara che **il codice si può cambiare**.
> ➡️ **Ne segue che le anteprime mancanti sono QUATTRO, non tre:** la testata (briciole toccabili + tasto
> d'uscita) era approvata nella variante 3, ma quel mockup **non ha** né l'una né l'altro.

---

## 1. Lo stato, in tre righe

- **6 commit su `main` locale, NIENTE pubblicato.** Solo documenti: verbale, spec, mockup, screenshot,
  memoria. `git log --oneline -6` parte da `4e2e74fe`.
- **Database alla baseline, invariata: 294 lavori · 0 righe in `lavori_denti` · 916 pazienti · 48 colori.**
  L'unica interrogazione della giornata è stata una **SELECT di conteggio**.
- **Gate FASE 3 superato → percorso GRANDE** (c'è una migration, e si toccano dati sanitari con una deroga).

---

## 2. Le sedici decisioni — dove stanno, non ripetute qui

Verbale completo, con le parole di Francesco e le prove: **`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`**.
Le cinque che cambiano di più il lavoro di chi legge:

| | |
|---|---|
| **D1** | Perimetro = **il solo wizard**. Scheda del lavoro e home restano fuori |
| **D3** | 🛑 **Il catalogo colori è CHIUSO.** «Non esiste poter inserire un colore che non esiste». Nessuna validazione da progettare, nessun panel da rifare |
| **D4/D5/D9/D11** | `pazienti` diventa **anagrafica**, ma **solo lato wizard**: si cerca prima di creare, **per cognome**, **dentro il solo studio scelto**, con la ricerca **dentro la casella «Cognome»** |
| **D10/D16** | Avanzamento a **briciole**; `ProgressDots` **muore** (componente, catalogo, test, DS §5.32) |
| **D13** | **«Dimmelo a voce» esce del tutto**: 4 usi + 2 test + 1 regola DS, già censiti |

---

## 3. 🛑 Quello che NON si può saltare prima del codice

1. ✅ **FATTO (28/07, sera): la spec è ratificata**, con i quattro emendamenti D17-D20. Il piano può partire.
2. ✅ **FATTO (28/07, sera): le quattro anteprime sono scritte** — `2026-07-28-wizard-testata-uscita.html`
   (T1/T2/T3 · O1/O2/O3/O4 · le due conferme) · `…-wizard-passo-foto-e-cassetta.html` (F1/F2/F3 · K1/K2) ·
   `…-wizard-avviso-codice-gia-in-uso.html` (V1/V2 · i due inneschi). **44 screenshot** in
   `docs/design/mockups/screenshots/ob-*.png`, 390/768/1280 × chiaro/scuro.
   ✅ **E LE VARIANTI SONO STATE SCELTE** (28/07 sera, §4 di ciascun mockup — **D21-D25**):
   **D21** uscita **T2** (✕ leggera, senza cerchio) e **la ✕ compare solo dal passo 2**, perché al passo 1
   farebbe la stessa cosa della freccia · **D22** ⚠️ **riscritta dopo una rettifica di Francesco**: la fila
   **scorre sempre, ancorata a destra**; **quello che è in vista si legge intero**; il resto è **fuori vista,
   non compresso**, e una **sfumatura** dice che c'è; l'**icona è il solo caso limite** della briciola al
   bordo, e scorrendo si riapre ·
   **D23** foto **F2** + **più foto** (rivedere · ingrandire · rifare · **eliminare** · aggiungere) ·
   **D24** cassetta: **solo le libere**, con **crea al volo** e **salta** · **D25** avviso **V1** (sotto la
   casella) e la ripresa che **dice cos'è cambiato e mette già il codice nuovo**.
   ⚠️ **Un'ipotesi di Francesco corretta con la misura:** «su tablet/desktop c'è più spazio» è vero solo a
   metà — la colonna è **bloccata a 480 px**, quindi **768 e 1280 sono IDENTICI** (320 px alle briciole
   invece di 230). Lo spazio vero arriva **sui passi larghi** (denti/colore, D14): lì ci stanno tutte.
   ✅ **Regola verificata a schermo, non assunta** (`scripts/tmp/misura-forma-ratificata.mjs`): **zero
   briciole troncate** in tutti e sette i casi provati (390 · 768 · 1280, passo stretto e passo largo).
   🐛 **DUE DIFETTI DELL'IMPLEMENTAZIONE TROVATI MISURANDO, e valgono identici in React:**
   ① `justify-content: flex-end` ancora a destra **ma rende IRRAGGIUNGIBILE** ciò che esce dal bordo
   sinistro (le briciole vecchie sparirebbero) → la forma corretta è `margin-left:auto` sul primo figlio
   **più** `scrollLeft = scrollWidth` al montaggio del passo;
   ② una fila che scorre **taglia sempre** la pastiglia al bordo — il vincolo «niente pezzetti tagliati» non
   si soddisfa con un'icona ma con una **maschera sfumata**, e **direzionale**: sfumare l'ultima quando dopo
   non c'è niente è una **bugia visiva** (trovato guardando lo scatto: «Foto» sbiadiva pur essendo l'ultima).
   ⚠️ **Prezzo residuo, dichiarato:** l'unica icona al bordo dice **quale passo**, non **quale scelta** —
   ma è una sola e basta un dito per farle dire il nome. Baratto accettato perché
   le due più recenti restano parole.
   🔴 **E la misura ha smentito il disegno:** a 390 px, con l'uscita in testata, restano **230 px** alle
   briciole — «Dr. Puleo» 87 · «Overdenture» 113 · «Esposito» 85. **Due intere ci stanno (208), tre no
   (302).** Senza uscita in testata sono 286: tre **ancora** non bastano. Per questo è nata **O4** (testata
   su due righe), l'unica che non taglia niente.
   🛑 **Nel piano quelle tre superfici stanno DIETRO UN GATE, non in coda:** il task che le tocca non
   parte finché il loro mockup non è approvato. Scriverle in fondo al piano significa scoprire all'ultimo
   task che manca l'anteprima — e a quel punto o si aspetta, o si sfonda la §0B.
3. **I mockup di denti e colore vanno riaperti**: approvati il 27/07 nella forma, ma
   `2026-07-27-denti-colore-wizard.html` **non nomina né tablet né desktop** — e **D14** ha appena deciso
   che proprio quella superficie **si allarga** sugli schermi grandi. ⚠️ Il terzo file,
   `…-denti-illustrazioni-vere.html`, è in `.gitignore` (30 MB) e **vive solo su questo disco**: si
   rigenera con `scripts/design/`.

---

## 4. I fatti già verificati — NON rifarli, sono nel registro

Tutti letti aprendo i file o interrogando il database. Chi scrive il piano li **cita**, non li riscopre.

| fatto | prova |
|---|---|
| Il wizard **non ritrova mai un paziente**: il codice proposto è sempre nuovo, e il confronto cerca **quel** codice | `dati-wizard.ts:44-50` vs `crea-lavoro.ts:209,214` |
| **Due caselle non arriverebbero a nulla**: `nome`/`cognome` sono **fissi nel codice** | `crea-lavoro.ts:229-230` |
| **Nessun vincolo di unicità** su `codice_paziente` | `supabase/schema.sql:461` (testo nudo) + grep su tutte le migration: **zero riscontri** |
| **Zero duplicati in banca dati**, con entrambe le chiavi possibili | `scripts/tmp/sql.mjs`, 28/07: `0 · 0 · 916 pazienti · 0 archiviati · 1 senza codice` |
| Le colonne di sparizione di `pazienti` sono **due**, e la lettura usa **`archiviato`**, non `deleted_at` | `002_fase2_schema.sql:118` · `api/pazienti/route.ts:33` |
| Un paziente **appartiene a uno studio** | `supabase/schema.sql:458` — `cliente_id UUID NOT NULL` |
| La bozza del wizard è **`v:1`** e porta campi che spariscono | `persistenza.ts:12-24`, gate a `:69` |
| `TIPI_LAVORO` **non ha** i flag «prevede denti/colore/arcata»; la tabella dei 38 è nel **verbale del 27/07 §6-quater**, non nel codice | `src/lib/domain/tipi-lavoro.ts` (93 righe, 6 campi) |
| `paziente_nome_snapshot` **non è scritto da nessuno** → scheda del lavoro «—», portale mostra il dispositivo, **buono senza ripiego sul codice** | grep su `src/`, `supabase/`, `scripts/` |
| 🆕 **Nel wizard non esiste nessuna via d'uscita**: la testata ha **solo** la freccia indietro, e dal terzo passo si esce premendola tre volte, senza conferma | `WizardNuovoLavoro.tsx:421` (testata) · `:219-227` (`vaIndietro`) |
| 🆕 🐛 **La freccia indietro, al primo passo, spara sulla home** invece di tornare alla pagina precedente — contro la **direttiva permanente del 22/07** | `WizardNuovoLavoro.tsx:219-222`, `router.push('/dashboard')` |
| 🆕 **La «bozza» non esiste nel gestionale**: è `localStorage`, 24h scorrevoli dall'ultima modifica, guardia `userId`+`labId`, **una sola chiave**, **senza foto**, non viaggia fra dispositivi | `persistenza.ts:26-79` · sheet di ripresa `RipresaSheet.tsx` |
| 🆕 **Le frasi dello sheet «Riprendo da dove eri?» sono scritte sui tre passi di oggi** («ti mancava il tipo», «ti mancava il paziente») → con i passi variabili vanno rifatte | `RipresaSheet.tsx:59-75` |
| 🆕 **Il ritorno indietro già oggi non distrugge nulla**, e il codice paziente non viene mai sovrascritto se già digitato: il precedente per D17 **esiste** | `WizardNuovoLavoro.tsx:226` · `:258` (`s.pz \|\| dati.prossimoPz`) |

---

## 5. Che cosa deve contenere il piano (FASE 4)

Percorso **GRANDE**. Le regole di piano non sono formalità: nell'ondata (a) **8 task su 8** hanno trovato
un difetto **nel piano**.

- **R-P1 — registro delle prove.** Si provano le **assunzioni sull'ambiente**, non le righe di codice del
  piano. Qui le assunzioni da sondare sono almeno tre: che l'indice unico **rifiuti davvero** un codice
  ripetuto (con il valore che deve essere respinto e il messaggio incollato) · che la proiezione ridotta
  **non rompa** `crea-lavoro.ts:213` · che `leggiStato` scarti davvero un payload `v:1`.
  🛑 Le sonde girano su **transazione annullata o schema usa-e-getta**, MAI su una migration registrata.
- **R-P2 — registro delle letture.** L'innesco è il **censimento**, non «i file che il piano nomina».
  Ogni percorso porta `letto: righe X-Y` oppure `NON letto`.
- **R-P6 — censimento degli identificatori**, non solo delle colonne: `PillVoce`, `ProgressDots`,
  `StatoSalvato`, `alias`, `elemento`, `colore`, `passo`, i campi della proiezione API. **Ogni nome tolto
  porta la sua destinazione.**
- **R-P4 — sulla FASE 6:** dopo il primo rosso, abbozzo inerte e si **conta** quante asserzioni si
  accendono (`N su M`), enumerando prima le **forme d'input**.
- **R-E1/R-E2 in esecuzione:** un compito a un esecutore fresco, col mandato di **cercare dove il piano
  sbaglia**; i difetti fuori mandato si **riferiscono** in una sezione sola.
- **Lo step finale obbligatorio è il GATE ESTETICO L2 (FASE 9b)**, ed è un'ondata con UI: non è
  negoziabile. Screenshot before/after in `docs/design/screenshots/<data>-<superficie>/`.

**I blocchi di lavoro che si vedono già** (non è il piano, è la sua ossatura): tabella dei 38 tipi portata
nel codice · macchina dei passi variabili · testata a **briciole toccabili** + **uscita esplicita** +
**correzione della freccia indietro** + morte di `ProgressDots` · **avviso di perdita quando un cambio a
monte svuota un passo** (D17: il calcolo viene dalla funzione della sequenza, mai da una lista a mano) ·
passo paziente con due caselle · ricerca paziente (API + UI, **con la data dell'ultimo lavoro letta in una
sola andata**) · indice unico + correzione del commento di schema · i due scrittori di `crea-lavoro.ts` ·
bozza `v:2` **con le frasi dello sheet di ripresa rifatte** · odontogramma v3 · passo colore · passo foto ·
cassetta · rimozione di «Dimmelo a voce» · gate L2.

---

## 6. 🛠️ Le trappole già pagate — comprese due NUOVE di oggi

- 🛑 **MAI un git worktree**: doppio `package-lock.json` → **404 su tutte le route**. Si fa
  `git checkout -b` nel repo principale, **anche quando è una skill a proporlo**.
- ⚠️ **`.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit** → `/usr/bin/trash .next`.
- ⚠️ Il pre-commit gira eslint + DS compliance + guardia CSRF + guardia «Riduci movimento» (~5 s).
- ⚠️ `.gitignore` ignora `*.png`: gli screenshot vogliono `git add -f`.
- 🆕 **I backtick nel messaggio di commit vengono ESEGUITI dalla shell.** Successo oggi: due nomi di
  colonna fra backtick sono spariti dal messaggio e la shell ha risposto «command not found».
  ➡️ **I messaggi di commit lunghi si scrivono in un file e si passano con `-F`**, oppure niente backtick.
- 🆕 **`text-overflow: ellipsis` NON funziona dentro un contenitore flex.** Le pastiglie delle briciole
  erano `display: inline-flex`: il testo veniva tagliato **a metà lettera, senza puntini**. Vale identico nel
  codice React — la pastiglia dev'essere un **blocco** (`display: block` + `line-height`), oppure il testo va
  chiuso in un figlio suo. 🔑 **Trovato guardando lo screenshot, non leggendo il CSS.**
- 🆕 **Un mockup con un riquadro di prova più corto dello schermo fotografa gli sheet a metà pagina.**
  In vista «schermo intero» il frame va portato a `100dvh`, altrimenti lo scatto mostra una posizione che
  nell'app non esiste — stessa specie dei «tre viewport» che erano tre inquadrature della pagina.
- 🆕 **`new URL(...).pathname` NON decodifica gli spazi.** Su questo disco il percorso contiene
  «SOFTWARE FILIPPO», e uno script ha creato per davvero una cartella `SOFTWARE%20FILIPPO` accanto a quella
  vera. ➡️ **`fileURLToPath`**, sempre. (Corretto in `scripts/tmp/screenshot-mockup-ondata-b.mjs`.)
- ⚠️ La cancellazione ricorsiva è bloccata fuori da `/private/tmp/claude-*`, `scripts/tmp/`,
  `node_modules`: si usa `/usr/bin/trash`. 🔑 Il blocco legge **l'intero comando**, quindi scatta anche se
  la sequenza vietata compare in un **messaggio di commit**.
- 🔑 **SQL diretto:** `node scripts/tmp/sql.mjs "<query>"` — funziona (usato oggi). 🛑 **Non è nel repo:
  vive solo su questo disco**, non sopravvive a un clone pulito.
- 🔑 **Mockup nel browser:** `file://` è **bloccato** per Playwright. Si serve la cartella
  (`python3 -m http.server 8899` dentro `docs/design/mockups/`) e si naviga su `127.0.0.1`.
- 🔑 **Collaudo dell'app:** `preview_start {name: "ua-dev"}` (porta 3000), utente **sintetico**
  `e2e-titolare@ua-test.local` (credenziale versionata in `scripts/seed-e2e.ts:201`, **non di una
  persona**) — **e lo si dichiara**.
- 🛑 **Lasciare il database alla baseline** dopo ogni prova: **294 · 0 · 916 · 48**.

---

## 7. I ritrovamenti fuori mandato — tutti con una casa

Sono **dieci**, raccolti in **una sola sezione** (§6 del verbale) e non sparsi: R1 tendina 19/48 · R2 la
correzione butta l'avviso invece di mostrarlo · R3 il controllo del catalogo legge un file congelato ·
R4 l'etichetta stampa `PAZ-PZ-0042` · R5 il precheck si blocca su un nome di soli spazi, e `precheck.ts`
fa `.trim()` mentre `generate-ddc.ts` no · R6 lo snapshot del nome non è scritto da nessuno (e il **buono**
non ripiega sul codice) · R7 il contratto per il dentista promette dati che non si raccolgono · R8
l'identificatore che il dentista scrive dal portale non lo legge nessuno · R9 la dettatura parte sul campo
sbagliato *(decaduto con D13)* · R10 `ANALISI/17` chiama il laboratorio «titolare» in un punto e
«responsabile» in un altro.

🚫 **R11 — RITIRATO nel giro di un'ora, e vale la pena tenerne il verbale.**
Avevo scritto: «delle 28 cassette, 8 hanno il colore in esadecimale e 20 a parole → una griglia ne colora 8
su 28». **La misura era giusta, la conclusione era sbagliata.** Il doppio formato **è previsto**, non è una
deriva:
- `src/lib/cassette/colore.ts:6,11` — `normalizzaColore` accetta **due forme e solo quelle**: le **sei
  parole** (`bianca`, `azzurra`, `rossa`, `blu`, `verde`, `grigia`) oppure un esadecimale a sei cifre;
  qualunque altra cosa è `null` → **422** in `api/cassette/route.ts:37-38`.
- `src/design-system/v3/tokens.ts:121-128` — `facciaHex` **traduce già** le sei parole in colore, ed è
  dichiarata «MAI ridichiarare questi hex nei .tsx».
- `SwatchesColore.tsx:37-65` — il selettore esiste già e gestisce **entrambe** le forme.
🔑 **La lezione, la stessa del panel sui colori:** avevo misurato un dato e dedotto un difetto **senza
aprire il codice che lo consuma**. Un'anomalia nei dati non è un difetto finché non si guarda chi li legge.
✅ **Conseguenza operativa (buona):** il passo cassetta **non deve risolvere niente** — riusa `facciaHex`.
E `NuovaCassettaSheet.tsx:33-43` + `POST /api/cassette` esistono già: **creare una cassetta dal wizard è
riuso, non lavoro nuovo.**

🆕 **R12 (28/07 sera, questo è vero): un'immagine del lavoro NON si può cancellare.**
`src/app/api/lavori/[id]/immagini/[imgId]/route.ts` espone **solo `PATCH`** — nessun `DELETE`. Il POST
esiste (`immagini/route.ts:20`, max 20 MB, scrive su `lavori_immagini`), quindi **caricarne più d'una è già
possibile lato dati**; toglierne una no. **Destinazione: dentro l'ondata (b)**, perché la richiesta di
Francesco del 28/07 sera («devo poterle rivedere, ingrandire, rifare, eliminare o aggiungerne altre») la
mette in perimetro. Oggi in banca dati ci sono **3 immagini** su 294 lavori.

---

## 8. 📌 Quello che questa giornata lascia come metodo

> **Una premessa scritta in un handoff è un'ipotesi, non un fatto.**

Il panel sui colori è stato convocato per rispondere a una domanda, e ha **falsificato entrambe le gambe**
della domanda stessa. Poi Francesco l'ha chiusa a monte. Il valore non è stato nella risposta: è stato nello
scoprire che stavamo per progettare intorno a una cosa non vera.

> **Lo screenshot della pagina che contiene la schermata non è lo screenshot della schermata.**

Per mezza giornata i «tre viewport» erano tre inquadrature della **pagina di presentazione**. Se ne è
accorto Francesco, con una domanda semplice: *perché non mi mostri mai tablet e desktop?*

> **Un componente senza consumatori non si lascia in casa** — applicato due volte in un'ora (PillVoce,
> ProgressDots), la seconda perché la prima aveva creato la regola.

> **Un commento non si sbaglia: si scolla.** `schema.sql:461` dice «codice assegnato dallo studio»; il
> generatore vivo lo calcola sul laboratorio. Nessuna delle due era una decisione: lo è diventata oggi.
