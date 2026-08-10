# Task 4-quater — ⚖️ D354: UN ATTO CHIUDE TUTTE LE RIGHE APERTE DEL LAVORO

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna` (già attivo — NON crearne un altro, MAI un worktree)
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` — sezione «Task 4-quater» (fra Task 4-ter e Task 5).
**Nasce da:** ⚖️ **D354**, ratificata il 10/08/2026 mattina (verbale, centocinquantatreesima tornata).
Referto del panel che l'ha fondata: `docs/roadmap/2026-08-10-panel-due-avvisi-referto.md` — **leggi §3, §4 e §6**.

---

## 0. Dove sta questo compito

Il Task 4 ha costruito la rotta `POST /api/lavori/[id]/avviso`: segna un avviso come comunicato
(dall'app o a voce). Oggi chiude **la sola riga indicata** dal corpo (`.eq('id', avvisoId)`).

⚖️ **D354 cambia la semantica dell'atto:** se un lavoro ha **più** promemoria aperti (due correzioni
prima di un solo avviso), **un solo atto di comunicazione li chiude TUTTI** — stesso `stato`, stesso
`comunicato_at`, stesso `comunicato_da` (e stesso `testo_inviato` se dall'app) su ogni riga.
In banca dati le righe restano tante quante sono nate (il registro è la prova); ciò che diventa uno
è **l'atto di chiusura**. Il Task 8 (portale) costruirà sopra questa semantica.

**Un file di codice, un file di prove:** `src/app/api/lavori/[id]/avviso/route.ts` (383 righe, modificare) ·
`tests/unit/api-avviso.test.ts` (esistente, estendere).

## 1. Il testo del task (dal piano — è il tuo mandato, valori esatti compresi)

**Apri PRIMA:** la rotta INTERA (383 righe) · `tests/unit/api-avviso.test.ts` — **censisci quali prove
presuppongono il filtro per id**: si aggiornano DICHIARANDOLO nel resoconto, non in silenzio ·
`src/lib/avvisi/stati.ts` (`STATI_APERTI`, `chiudeIlPromemoria`, `ammetteTestoInviato`).

**Il contratto verso il client NON cambia** — corpo `{ avviso_id, come, testo? }` → `200 { ok: true,
avviso }`, dove `avviso` resta **la riga indicata dal corpo** (unico chiamante vivo:
`src/components/features/lavori/scheda-v3/AvvisoDentista.tsx:513-531`, legge `esito.avviso`).

**Che cosa cambia** (`non eseguito` — il quadro; il codice lo scrivi tu sotto prova):
1. L'avviso indicato dal corpo si verifica **PRIMA** dell'aggiornamento, nel perimetro
   `laboratorio_id + lavoro_id`: assente → **404** · già chiuso → **409**. I due rami esistono già nel
   ramo zero-righe (righe 345-374): si **spostano davanti** alla scrittura. 🛑 **Senza questa verifica,
   un `avviso_id` di un ALTRO lavoro chiuderebbe comunque le righe di questo** — il corpo dichiarerebbe
   una cosa e l'atto ne farebbe un'altra.
2. L'UPDATE perde `.eq('id', avvisoId)`: il perimetro diventa `lavoro_id + laboratorio_id + stato IN
   STATI_APERTI` — **stessi tre valori su ogni riga**. L'oggetto `daScrivere` è **uno**, quindi
   l'identità dei valori è per costruzione.
3. La risposta seleziona dalla lista aggiornata **la riga con `id === avviso_id`** — fail-closed se
   manca (appena verificata aperta: se non c'è più è la corsa con un collega, e il ramo zero-righe
   la copre).
4. Il ramo «zero righe aggiornate» resta **fail-closed** com'è oggi (righe 364-374).

**I passi (TDD, RED→GREEN):**
- [ ] **Passo 1 — enumera le FORME della scrittura (R-P4)**, una prova per ciascuna:
  ① due righe aperte → un atto → **entrambe** chiuse, stessi tre valori
  ② una aperta + una **già chiusa** → l'aperta si chiude, la chiusa **non si tocca** (né
    `comunicato_at` né `testo_inviato` riscritti)
  ③ `avviso_id` fuori dal perimetro, con righe aperte nel lavoro → **404 e NESSUN update**
    (coppia: codice giusto **+** il finto client non riceve l'update)
  ④ riga indicata già chiusa → **409 e NESSUN update**
  ⑤ il giro di oggi a UNA riga aperta resta identico: 200, `avviso` = la riga.
- [ ] **Passo 2 — prove rosse**, poi abbozzo inerte e **conteggio** delle asserzioni che si accendono
  (`N su M` — il numero va nel resoconto).
- [ ] **Passo 3 — la rotta.** I quattro punti del quadro; le guardie (origine · contesto · ruolo ·
  operativo, righe 183-225) **NON si toccano**.
- [ ] **Passo 4 — verde** · **Passo 5 — FASE 7** (`npx tsc --noEmit` · `npx vitest run` ·
  `npx next build`, tutti e tre con output reale) · **Passo 6 — salva**.

⚠️ **La prova del Task 2 («due riemissioni → due avvisi») deve restare verde e INTOCCATA**: le righe
continuano a nascere due (referto §6). ⚠️ Il caso di confine «portale aperto fra le due correzioni» è
**deciso-di-non-deciderlo** (referto §4): questo task **non** lo affronta e non lo anticipa.

## 2. Trappole note, da guardare prima di scrivere

- **Il ramo zero-righe di oggi fa TRE distinzioni** (404 / 409 / fail-closed 409 con log). Spostando
  404 e 409 davanti alla scrittura, chiediti che cosa può ANCORA produrre «zero righe aggiornate»
  dopo una verifica riuscita: la corsa con un collega (ha chiuso tutto fra la tua lettura e il tuo
  UPDATE). La risposta a quel caso deve restare **fail-closed e onesta**, non un 200 vuoto.
- **La lettura di verifica va fatta con lo STESSO perimetro** (`laboratorio_id` + `lavoro_id`): senza,
  un avviso di un altro laboratorio riceverebbe un 409 — cioè la conferma che esiste (il commento alle
  righe 346-348 lo dice già: conserva quella proprietà).
- **`comunicato_da` viene dalla sessione, MAI dal corpo** (com'è oggi, riga 297). Non toccarlo.
- **Le prove esistenti che asseriscono la catena `.eq('id', …)`** sul finto client: aggiornale al
  perimetro nuovo e **dichiaralo nel resoconto** (quali, e perché il significato non si perde).
- Il finto client del file di prove traccia già le chiamate: usa quel meccanismo per le coppie
  «codice giusto + NESSUN update» — è l'idioma di casa (v. prove ⑪ e ㉖-㉙ esistenti).

## 3. Regole di casa per l'esecuzione (vincolanti)

- Lavora in `/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app`, sul ramo già attivo.
- 🛑 **`git status` PRIMA di ogni add** · **`git add <percorsi>`, MAI `-A`** · messaggi lunghi con
  `-F <file>` (metti il file del messaggio in `/tmp` o nella scratchpad, non nel repo).
- 🛑 **NON eseguire `git push`**: agli esecutori è rifiutato; lo lancia l'orchestratore.
- ⚠️ `npx tsc --noEmit` NON vede `server-only` né la firma degli handler di rotta: per questo la
  FASE 7 chiede anche `npx next build`.
- ⚠️ `npx vitest run` locale SALTA le prove d'integrazione (manca `.env.local` nel comando): è atteso,
  si dichiara. Mentre iteri, lancia il file singolo (`npx vitest run tests/unit/api-avviso.test.ts`);
  la suite intera UNA volta prima del commit.
- 🛑 **Un difetto fuori dal tuo mandato si RIFERISCE nel resoconto, non si corregge** (R-E2).
- Commit format di casa: `feat(avvisi): …` / `fix(avvisi): …` — Co-Authored-By come da repo.

## 4. Il resoconto

Scrivi il resoconto completo in `.superpowers/sdd/avviso-dentista-task-4quater-report.md`:
che cosa hai fatto · prove e risultati · **evidenza TDD** (RED: comando e output del rosso atteso;
conteggio `N su M` sull'abbozzo inerte; GREEN: comando e output) · file toccati · autorevisione ·
riserve. Poi rispondi con SOLO (max 15 righe): **Status** (DONE / DONE_WITH_CONCERNS / BLOCKED /
NEEDS_CONTEXT) · commit creati (sha corto + oggetto) · una riga sui test · riserve · percorso del resoconto.
