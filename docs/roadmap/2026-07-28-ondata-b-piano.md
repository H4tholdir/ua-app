# Piano — Ondata (b) del wizard «Nuovo lavoro»

**Data:** 28 luglio 2026 (sera) · **Stato:** 🟡 **BOZZA — non ancora eseguibile** (v. §9, cosa manca)
**Percorso:** GRANDE (gate FASE 3 superato, v. §2) · **Fonte:** spec ratificata
`docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md` + verbale D1-D26
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`

> ⛔ **Questo piano NON esce dalla FASE 4 finché §3 (registro letture), §4 (censimento) e §5 (registro
> prove) non sono completi.** Al momento **non lo sono**: §3 ha **11** file `NON letto`, §5 ha 4 sonde
> `da eseguire`. Sono elencati apposta, con nome — un piano che sembra completo e non lo è è il difetto
> che l'ondata (a) ha pagato otto volte su otto.

> 🛑 **SUPERATO DAL PANEL DI VALIDAZIONE DEL 29/07** — `docs/roadmap/2026-07-29-ondata-b-panel-validazione.md`.
> **29 rilievi, 6 bloccanti, 15 affermazioni di questo piano verificate FALSE.** Il piano **non si esegue
> nella forma attuale**: si riscrive la parte che i rilievi hanno spostato. Le correzioni puntuali già
> applicate qui sono marcate 🔧; tutto il resto vive nel verbale del panel, che è il documento da leggere
> **prima** di questo.
> 🔑 Il conteggio qui sopra era **10** in questa riga e **11** al §9: sono **11** (12 percorsi meno
> `tipi-lavoro.ts`, già letto). 🔧

---

## 1. Perimetro — e il taglio in tre ondate (D26)

✅ **D26 (Francesco, 28/07 sera): «mi sta bene dividere il lavoro in ondate, scegli tu la divisione più
consona».** Criterio applicato: **resta in (b) ciò senza cui il wizard non funziona; esce ciò che ha una
casa migliore altrove e che, fatto lì, si scrive una volta invece di due.**

| ondata | contenuto | perché lì |
|---|---|---|
| **(b) Il wizard** — questo piano | 38 tipi nel codice · passi adattivi · testata a pagine + uscita + freccia corretta · passo paziente + ricerca · indice unico + avviso codice · odontogramma v3 + colore · **galleria di più foto (etichette già esistenti) + cancellazione** · **cassette libere disegnate vere + crea + salta** · bozza `v:2` · via «Dimmelo a voce» · gate L2 | tutto dentro il wizard; ogni pezzo o esiste già o è piccolo |
| **(c) Le foto, per bene** | **editor**: ruota · ritaglia · ingrandisci — e **le stesse azioni sulla scheda del lavoro** | l'editor si scrive **una volta** e serve in due posti; dentro (b) andrebbe scritto due volte |
| **(d) Le cassette, per bene** | parete in «modo scelta» **con la ricerca** · **tavolozza più ricca** (con la regola che ricava la tonalità scura invece di scriverla) | tocca la parete, la sua ricerca e la sua grafica: casa sua |

**Fuori da tutte e tre, già tracciato:** unione di due schede paziente doppie · pagina `/pazienti` in
scrittura · le tre eredità della scheda del lavoro (R1, R2, colore di caso) · i due difetti della home ·
la fotografia congelata `paziente_nome_snapshot` (tappa 1-bis) · R5, R7, R8, R10 del verbale §6.

---

## 2. Gate FASE 3 — le cinque risposte (riportate, non rifatte)

Il gate è stato superato nella spec §14. Qui **solo il delta** portato da D21-D26:

1. **Tenant isolation.** Invariata: nessuna policy RLS toccata. 🆕 Due scritture nuove passano da route già
   protette: `POST /api/cassette` (già filtra per lab) e il nuovo `DELETE` sulle immagini, che **deve**
   ricalcare la verifica di appartenenza già scritta nel `PATCH` fratello
   (`immagini/[imgId]/route.ts:36-44`: `.eq('lavoro_id')` **e** `.eq('laboratorio_id')`).
2. **Schema drift.** Una sola migration (§6, T4). FASE 6b obbligatoria.
3. **Contratto API.** `GET /api/pazienti` guadagna `q=`; `DELETE` è un metodo **nuovo** su una route
   esistente, quindi non rompe nessun client. `POST /api/lavori/[id]/immagini` invariato.
4. **Rollback.** UI: revert del commit. Migration: `DROP INDEX`. Immagini: il `DELETE` è l'unica azione
   distruttiva nuova → v. la domanda aperta in §9.
5. **Dominio critico?** **Sì, GRANDE**, invariato: migration + dati sanitari con deroga (D7).

---

## 3. R-P2 — REGISTRO DELLE LETTURE

**L'innesco è il censimento (§4), non «i file che il piano nomina».** Ogni percorso porta `letto: righe X-Y`
oppure **`NON letto`**. Le letture sono state fatte **in questa sessione, aprendo i file** — non delegate
(questa sessione non ha subagenti autorizzati; se la prossima li avrà, si chiede una **domanda falsificabile
con le righe citate**, mai un riassunto).

### Letti

| file | letto | cosa ne è uscito |
|---|---|---|
| `src/components/features/wizard/WizardNuovoLavoro.tsx` | righe 1-120, 120-300, 340-546 | `StatoWizard` a 8 campi con `passo: 1\|2\|3` · testata = `TastoTondo` + `ProgressDots` (`:421-422`) · `vaIndietro` fa `router.push('/dashboard')` al passo 1 (`:219-222`) · `colonnaStile` max-width **480 fisso** (`:533-538`) · `continuaPaziente` è **l'unico** chiamante di `creaLavoroDaWizard` (`:365-400`) · `azzeraStato()` alla creazione riuscita (`:389`) |
| `src/lib/wizard/persistenza.ts` | righe 1-88 (intero) | `v: 1` · chiave `ua:wizard-lavoro:v1` (`:26`) · finestra 24 h **scorrevole** (`:28,71`) · guardia `userId`+`labId` (`:76`) · scaduto → chiave rimossa (`:72`) |
| `src/components/features/wizard/RipresaSheet.tsx` | righe 1-88 (intero) | chiusura **non distruttiva** (`:16-24`) · **le frasi sono scritte sui tre passi di oggi** (`:59-75`) → da rifare con i passi variabili |
| `src/lib/wizard/crea-lavoro.ts` | righe 199-236 (input+pazienti), 320-345 (foto) | `nome: ''`/`cognome: alias \|\| pz` **fissi** (`:229-230`) · ricerca per `codice_paziente === pz` (`:214`) · **la foto si carica DOPO la creazione** (`:328-341`) e manda `descrizione: 'impronta'` **fissa** (`:333`) |
| `src/app/api/pazienti/route.ts` | righe 31-36 (proiezione), 110-124 (scrittura) | proiezione a 7 campi, fino a 500 righe · la lettura filtra **`archiviato`** (`:33`), non `deleted_at` · `cognomeEffettivo` + `risolviNomePaziente` (`:110-124`) — **non si riscrive** |
| `src/app/api/lavori/[id]/immagini/route.ts` | righe 1-120 | **solo `POST`** · max 20 MB (`:81`) · scrive su `lavori_immagini` (`:101-116`) via `uploadToStorage` |
| `src/app/api/lavori/[id]/immagini/[imgId]/route.ts` | righe 13-60 | **solo `PATCH`** — nessun `DELETE` (**R12**) · la verifica di appartenenza è a `:36-44` ed è il modello da ricalcare |
| `src/components/features/lavori/form/TabImmagini.tsx` | righe 15-22, 300-320, 400-660 (a campione) | `multiple` (`:310`) · compressione a **0,4 MB** (`:37`) · **`TIPI_FOTO` esistono già**, sei valori (`:15-22`) e si cambiano via `PATCH {descrizione}` (`:236,253`) · **nessun ingranditore, nessuna cancellazione** |
| `src/lib/cassette/colore.ts` | righe 1-28 (intero) | `normalizzaColore` accetta **le sei parole O un esadecimale**, altrimenti `null` → 422 · `HEX_RE` è l'unica fonte sul formato |
| `src/design-system/v3/tokens.ts` | righe 118-128 | `facciaHex`, con scritto «MAI ridichiarare questi hex nei .tsx» |
| `src/design-system/v3/motion.ts` | righe 24-43 | `molla.snappy/smooth/bouncy/press/wizard` — **le molle esistono già**, niente da inventare |
| `src/app/ds-v3.css` | righe 494-499 | le sei facce sono **gradienti a due stop**: la parola non è un doppione dell'esadecimale |
| `src/components/features/cassette/NuovaCassettaSheet.tsx` | righe 1-46 (contratto) | `{aperto, onChiudi, prossimoNome, onCreata}` — **riusabile dal wizard come `NuovoDentistaSheet`** |
| `src/components/features/cassette/PareteClient.tsx` | righe 105-125, 180-215, 259-320 (a campione) | embeddabile (`scrollerRef`) **ma** il chrome di pagina **rende sempre** (il prop `contesto` è morto per decisione di Francesco del 24/07) → serve un «modo scelta»: **fuori (b)**, va in (d) |
| `src/app/api/cassette/route.ts` | righe 7-75 | `POST` valida il colore con `normalizzaColore` → 422 · la creazione passa da una **RPC**, mai un insert diretto |
| `src/lib/cassette/parco-shared.ts` | righe 1-110 | `CassettaParete` porta `{id,nome,colore,posizione,lavoro}` · `CHIUSI` è l'unica verità su «stati vivi» · `derivaAlias` (`:69-75`) — la targa mostra il nome vero |
| `src/lib/domain/tipi-lavoro.ts` | righe 1-93 (intero) | **38 voci confermate**, 6 campi (`id, tile, aliases, macro, classeRischio, giorniFallback`) — **nessun flag su denti/colore/arcata**, come la spec §8 diceva. I tre casi di prova **esistono con quegli `id` esatti**: `anti_russamento` (`:62`), `duplicato_protesi` (`:43`), `overdenture` (`:52`). ⚠️ **Trovato leggendo, fuori mandato:** il file dichiara in testa un **drift noto** — «nessuna CHECK a DB contiene `bite_splint`» (`:12-15`), deferito alla sessione DB. T2 **non lo tocca** (aggiunge flag, non valori di `macro`), ma chi scrive la migration T4 **deve saperlo** |

### 🛑 NON letti — e il piano non può uscire dalla FASE 4 così

| file | perché serve | rischio se resta chiuso |
|---|---|---|
| ~~`src/lib/domain/tipi-lavoro.ts`~~ | — | ✅ **letto** (v. sopra) |
| `src/lib/wizard/dati-wizard.ts` | T2/T13 — `prossimoPz`, le frequenze | alto: qui nasce il codice paziente |
| `src/components/features/wizard/PassoPaziente.tsx` | T11/T12 lo riscrivono | alto |
| `src/components/features/wizard/PassoTipo.tsx` | T18 (cambio tipo) + D13 (via PillVoce) | medio |
| `src/components/features/wizard/PassoDentista.tsx` | T18 (cambio dentista) + D13 | medio |
| `src/components/ds/ProgressDots.tsx` · `src/components/ds/PillVoce.tsx` | T10 li cancella | basso (si cancellano) — **ma i loro token orfani no** |
| `tests/unit/WizardNuovoLavoro.test.tsx` · `tests/unit/PassoPaziente.test.tsx` · `tests/unit/PassoTipo.test.tsx` · `tests/unit/wizard-persistenza.test.ts` | **si romperanno tutti** | **alto**: senza leggerli non si sa quali asserzioni vanno riscritte e quali tolte |
| `supabase/schema.sql` righe 450-500 | T4 (indice + commento) | medio |

---

## 4. R-P6 — CENSIMENTO DEGLI IDENTIFICATORI

**Ogni nome che sparisce porta la sua destinazione.** Un nome tolto senza destinazione è un dato che smette
di salvarsi in silenzio (`api/lavori/[id]/route.ts:259-264`).

### Campi di `StatoWizard` (`WizardNuovoLavoro.tsx:50-59`)

| nome oggi | destinazione |
|---|---|
| `passo: 1\|2\|3` | ➡️ **cambia significato**: indice nella **sequenza calcolata**, non assoluto (spec §7) |
| `cliente` | resta |
| `tipo` | resta |
| `pz` | resta |
| `alias` | 🗑️ **muore** → sostituito da **`cognome` + `nome`** (D2). ⚠️ Portato anche in `StatoSalvato` (`persistenza.ts:22`) e in `crea-lavoro.ts:230` |
| `elemento` | 🗑️ **muore** → i denti diventano righe in `lavori_denti` (già fatto dall'ondata (a)); nel wizard diventa il **passo denti** |
| `colore` | 🗑️ **muore come stringa singola** → **passo colore per dente** (W19) |
| `foto: File \| null` | ➡️ **diventa `foto: File[]`** (D23) |
| — | 🆕 `cognome`, `nome`, `pazienteIdScelto`, `denti`, `colori`, `cassettaId` |

### Simboli esportati che spariscono

| simbolo | file | destinazione |
|---|---|---|
| `ProgressDots`, `ProgressDotsStanze` | `src/components/ds/ProgressDots.tsx` | 🗑️ **file cancellato** (D16) — più la voce di catalogo (`ds-v3-catalogo/page.tsx:31,80,1140-1144`), `tests/unit/ProgressDots.test.tsx`, **DS v3 §5.32** |
| `PillVoce` | `src/components/ds/PillVoce.tsx` | 🗑️ **file cancellato** (D13) — 4 usi + `tests/unit/ds-v3/componenti/PillVoce.test.tsx` + `tests/unit/PassoTipo.test.tsx:191` + **DS v3 §5.15** |
| `CHIAVE_WIZARD` = `'ua:wizard-lavoro:v1'` | `persistenza.ts:26` | ➡️ **il valore cambia** (`…:v2`)? **DA DECIDERE nel piano** — v. §9, domanda 3 |

### Token e coreografie da verificare orfani (D13)

`coreografie` in `motion.ts:56` · il token `pillVoce` in `v3/tokens.ts` · le regole `.ds-pillvoce`/`.ds-dots`
in `ds-v3.css`. **Un token orfano non si lascia** — stessa specie delle dichiarazioni morte già rimosse tre
volte. 🛑 **Censimento NON eseguito**: i tre percorsi vanno aperti (§3, non letti).

### Chiavi JSON e campi API

| chiave | dove | nota |
|---|---|---|
| `descrizione` | `POST /api/lavori/[id]/immagini` (form-data), `PATCH …/[imgId]` | **esiste già**, e i sei valori sono `TIPI_FOTO` (`TabImmagini.tsx:15-22`). Il wizard oggi manda `'impronta'` **fissa** → deve diventare scelta |
| `q` | 🆕 `GET /api/pazienti` | proiezione ridotta **solo quando presente** |
| `id, codice_paziente, cognome, nome, ultimoLavoro` | 🆕 forma della risposta con `q` | **B2** la blinda: un test che fallisce se qualcuno riaggiunge `codice_fiscale` |
| `colore` | `POST /api/cassette` | **non si tocca**: `normalizzaColore` è già l'unica porta |

---

## 5. R-P1 — REGISTRO DELLE PROVE

**Fail-closed: un blocco senza marchio è NON provato.** Qui si provano le **assunzioni sull'ambiente**, non
il codice del piano. 🛑 **Le sonde girano su transazione annullata o schema usa-e-getta, MAI su una
migration registrata** — una migration che aborta disallinea il ledger anche su dati di test.

| # | assunzione | come si prova | stato |
|---|---|---|---|
| **P1** | L'indice unico parziale **rifiuta davvero** un codice ripetuto nello stesso laboratorio | tabella **temporanea** `ON COMMIT DROP` + lo stesso indice della migration, tre inserimenti | ✅ **PROVATA, 28/07 sera** — `provato:` blocco `DO` su tabella temporanea, output reale incollato:<br>① stesso lab, stesso codice → **`RIFIUTATO: duplicate key value violates unique constraint "sonda_p1_uniq"`**<br>② **controllo positivo** — lab diverso, stesso codice → **`PASSA`** (nessun canale laterale fra tenant)<br>③ due `NULL` nello stesso lab → **passano** (l'indice **parziale** non li tocca)<br>🔑 Nessuna traccia lasciata: `tabelle_sonda: 0`, baseline riverificata **294 · 0 · 916 · 48** |
| **P2** | Il conteggio dei duplicati **regge ancora** (era 0 il 28/07 mattina) | `scripts/tmp/sql.mjs`, sola lettura | ✅ **PROVATA, 28/07 sera** — `provato: node scripts/tmp/sql.mjs "select …"` → `coppie_duplicate: 0 · pazienti_totali: 916 · senza_codice: 1 · lavori: 294 · denti: 0 · colori: 48`. **La migration T4 non aborta**, e la baseline è intatta. ⚠️ **Decade col tempo**: si riesegue immediatamente prima di T4 |
| **P3** | La proiezione ridotta **non rompe** `crea-lavoro.ts:213-214`, che legge `codice_paziente` | lettura del file + test che chiama la route con `q` e verifica che `codice_paziente` ci sia | 🔴 **da eseguire** |
| **P4** | `leggiStato` scarta davvero un payload `v:1` **e rimuove la chiave** | test unitario con payload `{v:1,…}` → `null`, e `localStorage.getItem` → `null` | 🟡 **metà provata**: il codice a `persistenza.ts:69` restituisce `null` per `v !== 1`; **la rimozione della chiave avviene solo per scadenza** (`:71-73`), **non** per versione sbagliata → ⚠️ **la spec §7 dice «e la chiave viene rimossa»: OGGI NON È VERO.** Difetto del piano trovato scrivendolo |
| **P5** | Cancellare una riga di `lavori_immagini` **toglie anche il file** dallo storage, o lo lascia orfano | sonda: `uploadToStorage` + delete riga + `list` sul bucket | 🔴 **da eseguire** — decide se il `DELETE` deve toccare due posti |
| **P6** | La lettura «data dell'ultimo lavoro» in **una sola andata** regge (D—Francesco: si tiene) | query aggregata su `lavori` per i `paziente_id` candidati, con `EXPLAIN ANALYZE`, su 916 pazienti / 294 lavori | 🔴 **da eseguire** |

🔴 **P4 è già un difetto reale del piano, trovato prima di scrivere codice.** La spec §7 promette «la chiave
viene rimossa»; il codice rimuove **solo** allo scadere delle 24 h. Con `v:2` una bozza `v:1` resterebbe in
`localStorage` **per sempre** (nessuno la scade più, perché `leggiStato` esce prima di guardare la data).
➡️ **T7 deve rimuovere la chiave anche sul mismatch di versione**, e B5 deve provarlo.

---

## 6. I task

Ogni task: **un esecutore fresco** (R-E1), col mandato di **cercare dove il piano sbaglia**; i difetti fuori
mandato si **riferiscono**, non si correggono (R-E2). Ordine scelto perché ogni task poggia solo sui
precedenti.

### Blocco 0 — apertura
- **T1** — ramo `ondata-b-schermate` **nel repo principale** (🛑 mai un worktree). Baseline DB riverificata e
  incollata. `/usr/bin/trash .next` se si arriva da un altro ramo.

### Blocco 1 — le fondamenta (nessuna UI)
- **T2** — `src/lib/domain/tipi-lavoro.ts`: i 38 tipi guadagnano `prevedeDenti`/`prevedeColore`/`prevedeArcata`.
  Fonte: **verbale 27/07 §6-quater, riga 352+**. ⚠️ Il file oggi ha 6 campi (93 righe) — **da leggere prima**.
- **T3** — `src/lib/wizard/sequenza-passi.ts` (nuovo, puro): `sequenzaPassi(tipo)` e **`cosaSiPerde(tipoVecchio, tipoNuovo, stato)`**.
  🔑 **Una sola funzione per due domande** (D17): una seconda lista scritta a mano sarebbe R1/R3 daccapo.
  Casi di prova già scritti: `anti_russamento` e `duplicato_protesi` → nessuna delle tre domande;
  `overdenture` → tutte.

### Blocco 2 — banca dati
- **T4** — migration: indice unico **parziale** su `(laboratorio_id, codice_paziente) WHERE codice_paziente IS NOT NULL`
  **+ correzione del commento** `supabase/schema.sql:461` («assegnato dallo studio» non è più vero, D15).
  Poi **FASE 6b**: `supabase gen types` + `tsc --noEmit`. Precondizione: **P2 rieseguita**.

### Blocco 3 — le porte
- **T5** — `GET /api/pazienti?q=`: proiezione ridotta + **data dell'ultimo lavoro in una sola andata**
  (P6). ⚠️ `laboratorio_id` e `cliente_id` **non si toccano**: sono l'isolamento.
- **T6** — 🆕 `DELETE /api/lavori/[id]/immagini/[imgId]`, ricalcando la verifica di appartenenza del `PATCH`
  fratello (`:36-44`). Esito di **P5** decide se tocca anche lo storage.

### Blocco 4 — la memoria del wizard
- **T7** — `StatoSalvato` → `v:2` con i campi nuovi · **rimozione della chiave anche sul mismatch di
  versione** (difetto P4) · **frasi di `RipresaSheet` rifatte** sui passi variabili · avviso «il codice è
  stato preso» dentro la ripresa (D25).

### Blocco 5 — la testata
- **T8** — `src/components/ds/BricioleTestata.tsx` (nuovo): **fila a pagine** (D22). Regole non negoziabili,
  tutte già provate nel mockup: si tiene **`inizio`** (non `fine`) · si **riempie da capo** a ogni cambio di
  larghezza finché l'utente non ha scorso · **niente frecce** (rubano 68 px su 230) · contatore intero
  «+N» · molle da `motion.ts`, **mai inline**.
- **T9** — uscita esplicita **T2** (✕ leggera) **dal passo 2 in poi** (D21) + `DialogConferma` + `azzeraStato()`
  sull'abbandono volontario + 🐛 **correzione di `vaIndietro`**: `router.back()` con fallback, mai
  `router.push('/dashboard')` (`WizardNuovoLavoro.tsx:219-222`).
- **T10** — 🗑️ `ProgressDots` e `PillVoce`: componenti, voci di catalogo, test, **DS v3 §5.15 e §5.32**, e i
  **token/coreografie orfani** (censimento §4 da completare).

### Blocco 6 — i passi
- **T11** — `PassoPaziente` rifatto: due caselle, i quattro testi (D20 compreso), nessun `autoFocus`.
- **T12** — ricerca paziente dentro la casella «Cognome» (variante A) + stato «paziente ritrovato».
- **T13** — i due scrittori: `crea-lavoro.ts:229-230` manda i valori digitati; con un paziente scelto si
  manda il suo `id` e **non si crea nulla**. 🛑 Invarianti: **mai `null`**, **mai** il codice fuori da
  `nome_cognome` senza ripiego (`precheck.ts:40-43` si ferma su `' '`).
- **T14** — passo foto: **galleria multipla** (riuso delle meccaniche di `TabImmagini`: `multiple`,
  compressione 0,4 MB, `TIPI_FOTO`) + ingranditore + **elimina con conferma** (D—Francesco: sì).
  🛑 **Le foto restano in memoria fino alla creazione** (`crea-lavoro.ts:328`): comprimere **allo scatto**.
- **T15** — passo cassetta: **griglia delle sole libere disegnate vere** (classi `.ds-cassetta.<slug>`, come
  già fa `SwatchesColore`) + `NuovaCassettaSheet` riusato (**il lavoro entra subito**, D—Francesco) + salta.
- **T16** — 🚧 **GATE**: passo denti (odontogramma v3). **Non parte** finché il mockup 27/07 non è
  riverificato in larghezza (D14).
- **T17** — 🚧 **GATE**: passo colore. Stesso gate di T16.
- **T18** — macchina dei passi: sequenza da T3 · briciole toccabili · **avviso di perdita** solo quando
  `cosaSiPerde` restituisce qualcosa · rilascio del paziente al cambio di dentista.

### Blocco 7 — chiusura
- **T19** — FASE 7: `tsc --noEmit` · `vitest run` · `next build`. **Tutti e tre**, output reale.
- **T20** — FASE 9 (Playwright 390/768/1280 × chiaro/scuro) + **FASE 9b, GATE ESTETICO L2**, non negoziabile:
  screenshot before/after in `docs/design/screenshots/2026-07-XX-wizard-ondata-b/`.

---

## 7. Le prove da scrivere (R-P4 sulla FASE 6)

B1-B15 stanno nella spec §12 e **valgono tutte**. Si aggiungono, dalle decisioni D21-D26:

| # | rischio | prova |
|---|---|---|
| **B16** | La testata taglia una briciola | per ogni pagina, a 390/768/1280: **zero** pastiglie con testo troncato e **zero** fuori dal contenitore (il mockup lo prova già: `scripts/tmp/misura-pagine.mjs`) |
| **B17** | Premere il contatore toglie una briciola invece di rivelarla | dopo ogni pressione, l'insieme mostrato **contiene** una briciola più vecchia della precedente |
| **B18** | La ✕ compare al passo 1 | al passo 1 **non esiste** nel DOM; dal passo 2 sì |
| **B19** | Una foto cancellata resta | `DELETE` → la riga sparisce **e** (secondo P5) il file pure; e il **controllo negativo**: l'immagine di **un altro laboratorio** dà 404 |
| **B20** | La bozza `v:1` resta in eterno | `leggiStato` su `v:1` → `null` **e chiave rimossa** (difetto P4) |

⚠️ **R-P4:** dopo il primo rosso si mette un **abbozzo inerte** e si **conta** quante asserzioni si accendono
(`N su M`), **enumerando prima le forme d'input** (tipo sbagliato, chiave assente, `null`, array al posto di
scalare, body non-JSON) — ognuna col suo caso o col suo «non coperta, perché».

---

## 8. Le trappole già pagate — si leggono prima, non dopo

🛑 **Mai un git worktree** (404 su tutte le route) · ⚠️ `.next` stantio dopo un cambio di ramo fa fallire
`tsc` nel pre-commit → `/usr/bin/trash .next` · ⚠️ i **backtick nel messaggio di commit vengono eseguiti
dalla shell** → messaggi lunghi con `-F` · ⚠️ `.gitignore` ignora `*.png` → `git add -f` · 🔑
`file://` è bloccato per Playwright → `python3 -m http.server 8899` dentro `docs/design/mockups/` ·
🔑 `fileURLToPath`, mai `new URL(...).pathname` (il percorso contiene uno spazio) · 🔑 SQL diretto:
`node scripts/tmp/sql.mjs "<query>"`, **non è nel repo** · 🛑 lasciare il DB alla baseline **294 · 0 · 916 · 48**.

🆕 **Dalle sere del 28/07, e valgono nel codice React:**
- `text-overflow: ellipsis` **non funziona dentro un flex** → la pastiglia dev'essere un **blocco**.
- `justify-content: flex-end` su un contenitore che scorre rende **irraggiungibile** ciò che esce a sinistra.
- Una fila che scorre **taglia sempre** il bordo → il modello a **pagine** è l'unico che non taglia.
- Un flag «primo giro» sbaglia: **la larghezza vera arriva dopo** (vista a schermo intero, passi larghi).

---

## 9. 🛑 Cosa manca a questo piano prima di poter essere eseguito

Dichiarato, non nascosto — è il punto delle regole di piano.

1. **§3: 11 file `NON letto`**, fra cui **quattro file di test che si romperanno di sicuro**. Senza quelli
   non si sa quali asserzioni vanno riscritte e quali tolte.
2. **§5: quattro sonde da eseguire** (P3, P5, P6 — P1 e P2 sono ✅ **provate**, con output incollato). Nessun blocco di codice del piano è marcato «provato»: quelli nascono `non eseguito`, col comando accanto.
3. **§4: il censimento dei token orfani non è eseguito** (`pillVoce`, `coreografie:56`, le regole CSS).
4. **Domanda aperta 1:** il `DELETE` dell'immagine è **soft o hard**? La direttiva «ogni campo si corregge
   fino alla consegna» e l'Art. 10(8) MDR tirano in direzioni diverse **dopo** l'emissione della
   Dichiarazione. → **panel normativo**, non si assume.
5. **Domanda aperta 2:** il tetto delle foto resta **libero** (D—Francesco), ma la compressione allo scatto
   è la difesa: **da misurare** su un telefono vero, non da assumere.
6. **Domanda aperta 3:** la chiave di `localStorage` cambia nome (`…:v2`) o resta `…:v1` con dentro `v:2`?
   Cambiarla rende la vecchia **irraggiungibile e non cancellabile**; tenerla richiede la rimozione esplicita
   (difetto P4).
7. **T16/T17 sono dietro un gate**: i mockup di denti e colore vanno riverificati in larghezza (D14).

---

## 10. Come si esegue

`/superpowers:executing-plans` o `/superpowers:subagent-driven-development` — **un compito alla volta a un
esecutore fresco** (R-E1), revisione fra l'uno e l'altro, e nel brief l'istruzione esplicita di **cercare
dove il piano sbaglia**. L'esecutore di **T1** verifica per primo che marchi e registri **ci siano**
(presenza, non verità) e, se mancano, **si ferma e riferisce**.
