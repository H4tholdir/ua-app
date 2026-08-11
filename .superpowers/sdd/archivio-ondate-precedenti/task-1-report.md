# Task 1 — Referto

**Branch:** `accenti-documenti` (già attiva, non creata da me)
**Brief:** `.superpowers/sdd/task-1-brief.md`

## Cosa ho fatto

Ho seguito i 6 step del brief alla lettera, in ordine TDD (prova → verde atteso → codice → riverifica → commit).

### Step 1-2 — La prova che fissa il valore

Aggiunto in `tests/unit/generate-ddc.test.ts`, dentro il `describe('D102 ① — le due firme del
documento...')` (riga 187), subito dopo il test esistente a `:202` (`l'insert porta
template_version e payload_sha256 valorizzati`) e prima di quello a `:209` (impronta dati vs
impronta file). Codice trascritto verbatim dal brief, nessuna modifica.

Comando eseguito:
```
npx vitest run tests/unit/generate-ddc.test.ts
```
Output reale:
```
 Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  01:23:41
   Duration  773ms (transform 48ms, setup 98ms, import 136ms, tests 476ms, environment 0ms)
```
**Verde, come atteso dal brief** (il test nasce verde di proposito — fissa la decisione D105, non
prova un difetto).

### Step 3 — Il registro accanto alla costante

Sostituito il blocco di commento a `src/lib/pdf/generate-ddc.ts:33-41` con il testo esatto del
brief (registro delle versioni, `ddc-v1` copre anche la correzione ortografica del 03/08 e la
comparsa del §2, il salto a `ddc-v2` riservato a un cambiamento di sostanza, con i 4 referral
①②③④ di `docs/superpowers/specs/2026-08-03-accenti-documenti-design.md` §5).
`VERSIONE_TEMPLATE_DDC` resta `'ddc-v1'` — non toccata.

### Step 4 — Tolta la contraddizione nello schema

`supabase/schema.sql:1249`: il commento `-- Es. "ddc-v1.2.0" — versione template react-pdf` è
diventato `-- Es. "ddc-v1" — versione della FORMA del documento; il registro di cosa contiene ogni
versione vive accanto alla costante in src/lib/pdf/generate-ddc.ts. NON è un semver: si conta 1, 2, 3.`
Solo il commento è cambiato. Nessun `ALTER`, nessun file nuovo in `supabase/migrations/`.

### Step 5 — Verifica

Comandi eseguiti, in sequenza, output reale:
```
$ npx tsc --noEmit
(nessun output — exit 0)
---TSC EXIT: 0---

$ npx vitest run tests/unit/generate-ddc.test.ts
 Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  01:24:14
   Duration  754ms
```
tsc: **0 errori**. Suite del file: **verde, 22/22**.

### Step 6 — Commit

`git status --short` prima del commit ha confermato che i soli file modificati sono i tre nominati
nel brief (nessun altro file toccato):
```
 M src/lib/pdf/generate-ddc.ts
 M supabase/schema.sql
 M tests/unit/generate-ddc.test.ts
```
Branch: `accenti-documenti` (verificato con `git branch --show-current`).

Commit eseguito con:
```
git add src/lib/pdf/generate-ddc.ts supabase/schema.sql tests/unit/generate-ddc.test.ts
git commit -F <messaggio fuori dal repo>
```
Messaggio: `docs(ddc): il registro delle versioni, e le due definizioni smettono di contraddirsi (D105)`
+ riga finale `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Autorevisione (oltre ai passi letterali del brief)

Prima di scrivere codice ho verificato che il brief non stesse descrivendo un apparecchio diverso
da quello reale:
- Righe 33-41 di `generate-ddc.ts` corrispondevano esattamente alla descrizione del brief (comment
  block 33-40 + `const` a 41).
- Il `describe` a `:187`, il suo `beforeEach(() => { mockTables(LAB_FIXTURE) })` a `:198-200`, e i
  due test vicini a `:202` e `:209` (il brief dice `:210` — scarto di una riga, non un difetto
  strutturale: la riga 210 è dentro il corpo dello stesso `it`, riferimento comunque
  identificabile) corrispondevano.
- `supabase/schema.sql:1249` conteneva esattamente il commento contraddittorio descritto.

Dopo aver scritto il commento del registro, ho verificato — non dato per buono — il claim che cito
nel commento (i 4 referral ①②③④ di `2026-08-03-accenti-documenti-design.md` §5): letto il file,
§5 (riga 132 in poi, «Fuori perimetro — riferiti, NON accorpati (R-E2)») contiene esattamente quei
4 referral con quel contenuto. Confermato anche che D105 è scritta nel verbale delle decisioni
(`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md:724`), non solo nel piano — non è
un caso di §0A-bis (decisione viva solo in chat/piano).

**Controllo aggiuntivo (segnalato dall'advisor, non nel brief): isolamento del test nuovo.**
Ho lanciato `npx vitest run tests/unit/generate-ddc.test.ts -t 'template_version resta'` per
verificare che il test legga davvero la CHIAMATA generata dalla propria `await generateDdC(...)` e
non un residuo di stato lasciato da altri test. **Fallisce in isolamento**, con
`TypeError: Cannot destructure property 'error' of '(intermediate value)' as it is undefined` su
`generate-ddc.ts:184` (l'upload su storage). Ho verificato che questo NON è un difetto introdotto
da me: lanciando lo stesso filtro `-t` sul test preesistente e non toccato a `:202`
(`l'insert porta template_version...`), fallisce ESATTAMENTE allo stesso modo, con lo stesso
errore, alla stessa riga. È un difetto preesistente dell'apparecchio di test (vedi sezione
«Ritrovamenti fuori mandato» sotto), non del mio task: il mio test, trascritto verbatim dal brief,
si comporta esattamente come il suo vicino. La prova richiesta letteralmente dal brief (Step 2 e
Step 5: `npx vitest run tests/unit/generate-ddc.test.ts` senza filtro) è verde, come richiesto e
riportato sopra.

Ho anche grepato l'intero repo (`grep -rn "ddc-v1\.2\.0"` e `grep -rn "template_version"`) per
escludere una terza copia della definizione contraddittoria fuori dai due file toccati: le uniche
occorrenze residue di `"ddc-v1.2.0"` sono nei documenti di piano/spec (`docs/superpowers/plans/…`,
`docs/superpowers/specs/…`) come registrazione storica di "cosa diceva PRIMA" — non è codice vivo,
non è una terza definizione contraddittoria da correggere.

## Ritrovamenti fuori mandato (R-E2 — riferiti, non corretti)

1. **Accoppiamento implicito fra `describe` fratelli in `tests/unit/generate-ddc.test.ts`.** Il
   `describe('D102 ① — le due firme del documento...')` (riga 187) è un blocco **fratello**, non
   annidato, di `describe('generateDdC', ...)` (riga 44-185). Il suo `beforeEach` proprio
   configura solo `mockTables(LAB_FIXTURE)`; NON configura `mockUpload.mockResolvedValue(...)`,
   `mockGetPublicUrl.mockReturnValue(...)`, né `mockGeneraProgressivo.mockResolvedValue(...)` —
   quelle vengono impostate SOLO dal `beforeEach` del describe fratello (righe 45-51), che gira
   prima nell'ordine del file e la cui `vi.clearAllMocks()` non azzera le implementazioni già
   assegnate con `mockResolvedValue`/`mockReturnValue` (quello richiede `mockReset`, non
   `clearAllMocks`). Risultato: **tutti** i test del blocco D102 (non solo il mio nuovo, anche
   quello preesistente a `:202` e quello a `:209`) passano SOLO perché ereditano stato residuo
   lasciato dall'esecuzione precedente del describe fratello — e falliscono con
   `TypeError: Cannot destructure property 'error' of '(intermediate value)' as it is undefined`
   se eseguiti isolatamente (`vitest run ... -t <nome test>`) o se l'ordine dei describe
   cambiasse. Non è un difetto che riguarda `template_version` — è strutturale al file di test.
   Non l'ho corretto: è fuori dal mandato di questo task (che chiedeva di aggiungere un test
   trascritto verbatim nel `beforeEach` così com'è documentato dal brief), e toccarlo avrebbe
   richiesto di modificare test preesistenti non nominati nel brief.

2. **Colonna omonima non correlata.** `supabase/schema.sql:2854` ha una colonna
   `template_versione` (con la "e" finale, italiano) in una tabella diversa (accordi con
   controparte — dentista/sub-responsabile, non `dichiarazioni_conformita`), con default `'1.0'`
   (stile semver). È un nome simile ma un oggetto diverso, non in contraddizione con quanto
   sistemato in questo task: non l'ho toccata, la segnalo solo per completezza del grep.

## File toccati

- `src/lib/pdf/generate-ddc.ts` (righe 33-41 → registro delle versioni)
- `supabase/schema.sql` (riga 1249 → commento allineato)
- `tests/unit/generate-ddc.test.ts` (nuovo test alla D102 describe)

Nessun altro file toccato. Nessuna migration creata.

---

## Correzioni dopo revisione

Un revisore ha trovato **due rilievi** proprio sul ritrovamento fuori mandato #1 qui sopra (segnalato
allora, non corretto perché fuori mandato del task originale). Questo task chiude quel debito. Unico
file toccato: `tests/unit/generate-ddc.test.ts`. Nessun file di produzione.

### Rilievo 1 (Importante) — `describe('D102 ①…')` fratello, non figlio: mock non puliti

**Misura PRIMA della correzione** (console.log temporaneo su `mockInsert.mock.calls.length`, tolto
dopo la misura, corsa piena `npx vitest run tests/unit/generate-ddc.test.ts --reporter=verbose`):
- test `:202` (`l'insert porta template_version e payload_sha256 valorizzati`) → **2** chiamate
  accumulate su `mockInsert` al momento dell'asserzione
- test `:209` (`template_version resta 'ddc-v1'…`) → **3** chiamate accumulate — combacia con la
  misura del revisore

**In isolamento, prima della correzione** (`npx vitest run tests/unit/generate-ddc.test.ts -t
'template_version resta'` e stesso comando con `-t "l'insert porta"`): entrambi falliscono con lo
stesso errore già segnalato nel ritrovamento fuori mandato #1:
```
TypeError: Cannot destructure property 'error' of '(intermediate value)' as it is undefined.
 ❯ Module.generateDdC src/lib/pdf/generate-ddc.ts:184:18
```

**Correzione:** nel `beforeEach` del blocco `describe('D102 ①…')` (ora righe 198-214), aggiunto
`vi.clearAllMocks()` **più** le stesse resolved value che il `beforeEach` del describe fratello
`generateDdC` imposta (`mockInsert.mockResolvedValue`, `mockUpload.mockResolvedValue`,
`mockGetPublicUrl.mockReturnValue`, `mockGeneraProgressivo.mockResolvedValue`), perché
`vi.clearAllMocks()` da solo pulisce `mock.calls` ma NON rimette le implementazioni — serviva anche
quello, non solo la pulizia, per reggere l'isolamento (come previsto dal task: «se dopo il
clearAllMocks l'isolamento non basta»).

**Misura DOPO la correzione** (stesso `console.log`, prima di toglierlo di nuovo): entrambi i test
→ **1** chiamata su `mockInsert` al momento dell'asserzione.

**Numeri di chiamate — prima → dopo:**
- test `:202`: **2 → 1**
- test `:209`: **3 → 1**

**In isolamento, dopo la correzione:**
```
$ npx vitest run tests/unit/generate-ddc.test.ts -t "template_version resta"
 Test Files  1 passed (1)
      Tests  1 passed | 21 skipped (22)

$ npx vitest run tests/unit/generate-ddc.test.ts -t "l'insert porta"
 Test Files  1 passed (1)
      Tests  1 passed | 21 skipped (22)
```
Il `TypeError` su `generate-ddc.ts:184` non compare più in nessuno dei due.

### Rilievo 2 (Minore) — commento che afferma un fatto ormai falso

Il commento del blocco D102 (riga 190) diceva «ogni DdC mai emessa [`template_version` e
`payload_sha256`] le ha `NULL`». Il task mi riportava il numero già misurato dal revisore («su 4
dichiarazioni in archivio una porta ddc-v1»): **non l'ho preso per buono, l'ho verificato prima di
scrivere il commento nuovo** (Statuto delle fonti, `../CLAUDE.md` §7 «nessun flusso si dà per
buono» — qui si applica a un fatto di banca dati, non solo a un flusso di lavoro, ma il principio
«senza fonte si scrive non verificato» vale lo stesso). `docs/roadmap/2026-08-03-verifica-impronte-
ddc-referto.md` §3-4 conferma la storia (due righe per QUEL lavoro: una vecchia con le colonne
`NULL`, una nuova con `ddc-v1`, poi annullata) ma **non** il totale «4 in archivio» — quel numero è
sull'intero archivio, non su un solo lavoro, e il referto non lo dichiara.

Verificato con query di sola lettura diretta sul DB live (`scripts/tmp/verifica-conteggio-ddc.ts`,
nuovo file usa-e-getta in `scripts/tmp/` — ignorato da git, non tocca il vincolo «un solo file»),
autorizzata da D103 (`../CLAUDE.md` §9 «Collaudo dal vivo»: si accede con le credenziali già in
`.env.local` senza chiedere permesso):
```
$ npx tsx scripts/tmp/verifica-conteggio-ddc.ts

=== TOTALE dichiarazioni_conformita in archivio: 4 ===

DDC-2026-0002    stato=generata   template_version=NULL   payload_sha256=NULL          created_at=2026-07-06T15:36:15.975108+00:00
DDC-2026-0003    stato=generata   template_version=NULL   payload_sha256=NULL          created_at=2026-07-06T15:48:02.809274+00:00
DDC-2026-0001    stato=annullata  template_version=NULL   payload_sha256=NULL          created_at=2026-07-22T14:05:33.14638+00:00
DDC-2026-0002    stato=annullata  template_version=ddc-v1 payload_sha256=(valorizzato) created_at=2026-07-31T21:49:19.671758+00:00

Righe con template_version NON NULL: 1 su 4
```
**Confermato esattamente**: 4 righe totali, 1 sola con `template_version = 'ddc-v1'` — la stessa
riga (stessa `created_at`) descritta nel referto come emessa e poi annullata durante il collaudo dal
vivo. Le altre tre sono tutte antecedenti (06/07 ×2, 22/07) a quella con `ddc-v1` (31/07).

Riscritto il commento (righe 188-199) per dire il vero, citando la query live e il referto come
fonte, senza cancellare il resto del ragionamento (che resta valido: le due colonne, la finestra di
dieci/quindici anni, il parallelo con la guardia dichiarata e non agganciata).

### Verifica finale

```
$ npx vitest run tests/unit/generate-ddc.test.ts
 Test Files  1 passed (1)
      Tests  22 passed (22)
```

`git status --short`, eseguito ORA (dopo aver scritto anche questo referto, non prima) per non
riportare uno stato scaduto:
```
 M tests/unit/generate-ddc.test.ts
```
Un solo file compare — non perché il referto e lo script di verifica non siano stati toccati, ma
perché entrambi sono ignorati da git: `.gitignore:123` per `.superpowers/` (il referto) e
`.gitignore:124` per `scripts/tmp/` (lo script), verificato con `git check-ignore -v` su entrambi i
percorsi. **Solo `tests/unit/generate-ddc.test.ts` va nel commit**, per vincolo esplicito del task
(`git add tests/unit/generate-ddc.test.ts`, mai `-A`).

Commit: `git add tests/unit/generate-ddc.test.ts` (file esplicito) + `git commit -F <messaggio fuori
dal repo>`, con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` come riga finale.

## Ritrovamento fuori mandato #2 (R-E2 — riferito, non corretto)

**Gli altri due `describe` fratelli di `generateDdC` hanno lo STESSO difetto strutturale del
ritrovamento #1, ma restano invisibili perché le loro asserzioni usano `toHaveBeenCalledWith`
(che accetta QUALSIASI chiamata accumulata, non solo l'ultima) invece di `mock.calls[0][0]`.**

- `describe('firma_ddc_sha256 (A18 …)')` (~riga 296-342): il suo `beforeEach` fa solo
  `vi.stubEnv(...)`, mai `vi.clearAllMocks()` né le resolved value di
  `mockInsert`/`mockUpload`/`mockGetPublicUrl`/`mockGeneraProgressivo`. In corsa piena eredita lo
  stato lasciato dal blocco precedente (ora D102, dopo questa correzione, pulito ad ogni test) e
  passa; l'asserzione `expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
  firma_ddc_sha256: null }))` può essere soddisfatta da una qualunque delle chiamate accumulate, non
  necessariamente da quella generata dal test corrente — il caso 'senza firma configurata' è
  particolarmente esposto: se un test precedente ha già inserito una riga con `firma_ddc_sha256:
  null` per un'altra ragione, l'asserzione passerebbe anche se QUESTO test non chiamasse mai
  `generateDdC` correttamente.
- `describe('numero DDC a capodanno …')` (~riga 344-354): stesso `beforeEach` mancante di
  `vi.clearAllMocks()`; l'unico test lì dentro gira per ultimo nel file e in corsa piena non ho
  osservato un falso verde, ma la stessa fragilità strutturale c'è (nessuna pulizia propria,
  dipende dall'ordine dei blocchi precedenti).

Non corretto: fuori dal mandato di questo task, che i due rilievi della revisione delimitano
esplicitamente al `describe('D102 ①…')` e a un solo file. Una correzione qui richiederebbe toccare
`beforeEach` non nominati dal task e rivalutare test aggiuntivi non nominati — esattamente il tipo
di correzione silenziosa che R-E2 vieta.
