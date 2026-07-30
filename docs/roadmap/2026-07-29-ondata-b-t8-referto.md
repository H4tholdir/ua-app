# Report — T8 · ondata (b) · «la foto si può togliere, e sparisce davvero»

**Esecutore:** fresco, un compito solo (R-E1), modello leggero (D54). **Ramo:** `ondata-b-schermate`
(nessun worktree, nessun push). **Brief seguito:** `docs/roadmap/2026-07-29-ondata-b-t8-brief.md`.
**Piano:** `docs/roadmap/2026-07-29-ondata-b-piano-v2.md` §6/T8, §5/P12. **Decisioni:**
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` D51/D52/D54.

> ⚠️ **Nome del file cambiato rispetto al brief — vedi §3, difetto #0.** Il brief chiede alla lettera
> `docs/roadmap/2026-07-29-ondata-b-t8-report.md`; quel nome esatto è **gitignorato**
> (`.gitignore:77`, `*-report.*`) e non sarebbe mai entrato nel repo, contraddicendo la ragione
> stessa per cui il brief lo voleva in `docs/` e non in `.superpowers/sdd/`. Rinominato in
> `…-t8-referto.md`, stessa cartella, stesso contenuto — coerente con il precedente in casa
> `docs/roadmap/2026-07-28-collaudo-ondata-a-referto.md`, che usa lo stesso escamotage.

---

## 1. Cosa è stato fatto — i tre pezzi del mandato

### (A) Handler `DELETE` — nuovo

File: `src/app/api/lavori/[id]/immagini/[imgId]/route.ts` (esisteva già, solo `PATCH`; aggiunto un
handler, non creata una rotta). Forma: `isSameOrigin` → `getFreshLabContext` →
`assertLabOperativo(context, 'DELETE')` → `getServiceClient()`, **nessun gate di ruolo** (D-3).

1. Guardia di esistenza: `id` + `lavoro_id` + `laboratorio_id` + `.is('deleted_at', null)` → 404 se manca.
2. Finestra: legge `lavori.stato`; **fuori finestra `409`** quando `stato === 'consegnato'`, con
   messaggio proprio (mai «diritto all'oblio»/«richiesta del paziente» — vincolo del brief §2 rispettato).
3. Mutazione con **TRE `.eq()`** (`id`, `lavoro_id`, `laboratorio_id`) sulla `update()` stessa +
   `.is('deleted_at', null)` + `.select()` per contare le righe.
4. Conteggio righe: 0 → 404 (già cancellata nel frattempo); >1 → 500 fail-closed, mai un successo silenzioso.
5. **Nessuna chiamata a `storage.remove`** — il blob non si tocca.
6. Successo: `{ ok: true }` (precedente `api/cicli/[id]/route.ts:170`, **senza** copiarne il difetto
   a `:167`, che rimanda `deleteError.message` grezzo — il mio handler logga server-side e risponde
   con un messaggio nostro).

### (B) I due difetti del `PATCH` chiusi (D52 — dentro il mandato, non R-E2)

- **D52(a):** la guardia di esistenza del `PATCH` (`:37-43` originali) ora porta `.is('deleted_at', null)`:
  da quando il `DELETE` esiste, senza questo filtro il `PATCH` avrebbe modificato allegramente una
  riga già cancellata rispondendo 200 su un fantasma.
- **D52(b):** l'errore del database non arriva più grezzo al client. Prima: `{ error: updateError.message }`.
  Ora: `console.error('PATCH … — aggiornamento fallito:', updateError.message)` +
  `{ error: 'Non è stato possibile aggiornare la foto' }`, ricalcando `api/pazienti/route.ts:227-228`
  (coordinata riverificata oggi: due righe, `console.error` poi `NextResponse.json(..., 500)`).

### (C) Il filtro sugli otto siti di lettura

`.is('lavori_immagini.deleted_at', null)` aggiunto a tutti e otto:

| # | sito | riga (dopo l'aggiunta, il filtro è la riga subito prima di `.single()`) |
|---|---|---|
| 1 🔴 | `src/app/(app)/lavori/[id]/page.tsx` | dopo `.neq('ddc.stato', 'annullata')` |
| 2 🔴 | `src/app/(app)/lavori/[id]/modifica/page.tsx` | dopo `.neq('ddc.stato', 'annullata')` |
| 3 | `src/app/api/lavori/[id]/route.ts` | dopo `.neq('ddc.stato', 'annullata')` |
| 4 | `src/app/api/fatture/batch/route.ts` | dopo `.neq('ddc.stato', 'annullata')` |
| 5 | `src/app/api/fatture/[id]/xml/route.ts` | dopo `.neq('ddc.stato', 'annullata')` (query-builder, prima del branch `.in()`) |
| 6 | `src/lib/pdf/generate-ricevuta-consegna.ts` | dopo `.is('deleted_at', null)` (nessun embed `ddc` qui) |
| 7 | `src/lib/pdf/generate-etichetta.ts` | idem |
| 8 | `src/lib/pdf/generate-ifu.ts` | idem |

Grafia: quella del piano (nome di tabella, non alias) — **non corretta**, per il motivo scritto in
P12 (§3 sotto: il rilievo che la voleva con l'alias è falso, e resta scritto nel piano apposta).

---

## 2. Le prove — cosa ho scritto, e cosa hanno ucciso le mutazioni

### R-P4 — misura con l'abbozzo inerte (incollata anche in testa a
`tests/unit/lavori-id-immagini-imgid-route.test.ts`, con lo stesso comando)

**Primo rosso** (comando `npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts`, nessun
export `DELETE` nel file): **27 falliti su 28** (1 verde: il PATCH non toccato, "immagine viva → 200").

Poi ho incollato nel route file questo **abbozzo inerte** — guardie iniziali identiche al `PATCH`
esistente (CSRF, auth, lab, lab-guard), **nessuna** guardia di esistenza, **nessuna** finestra,
**nessuna** mutazione: risponde sempre `{ ok: true }` se supera le guardie iniziali.

```ts
export async function DELETE(req: Request, { params }: RouteContext) {
  const { id: lavoro_id, imgId } = await params
  void lavoro_id; void imgId
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }
  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  const guard = assertLabOperativo(context, 'DELETE')
  if (guard) return guard
  return NextResponse.json({ ok: true })
}
```

Comando: `npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts`.
**Esito con l'abbozzo: 6 su 28 si accendono** (passano) — CSRF 403, non-autenticato 401,
laboratorio-non-trovato 403, nessun-gate-di-ruolo 200, "successo → `{ok:true}`" 200 (trivialmente
vero con l'abbozzo), e il PATCH non toccato. **22 su 28 restano rosse**: sono le prove che contano
(guardia di esistenza, `deleted_at`, finestra sullo stato, i tre `.eq()` sulla mutazione, il
conteggio delle righe, l'errore mascherato, i due difetti D52) — l'abbozzo non le soddisfa, quindi
misurano qualcosa di reale.

L'abbozzo è stato rimosso subito dopo la misura e sostituito dall'implementazione vera.

### Le forme d'ingresso enumerate (handler `DELETE`)

id inesistente · immagine di un altro lavoro · immagine di un altro laboratorio · immagine già
cancellata · lavoro consegnato · lavoro inesistente (difensivo — la FK lo rende irraggiungibile in
pratica, ma testato via mock) · **corpo non-JSON: non coperta, perché `DELETE` non legge un body** ·
più le 8 varianti di stato ≠ `consegnato` (`it.each`) · 0 righe toccate · >1 riga toccata · errore DB
mascherato · CSRF · non autenticato · laboratorio non trovato · nessun gate di ruolo.
**28 test totali** in `tests/unit/lavori-id-immagini-imgid-route.test.ts` (25 DELETE + 3 PATCH/D52),
tutti verdi con l'implementazione vera.

### Le mutazioni fatte sul codice di produzione, e quali prove hanno ucciso

Ogni mutazione è stata applicata, testata (`npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts`),
verificata rossa, poi **ripristinata immediatamente** (nessuna delle mutazioni è rimasta nel codice
consegnato):

| mutazione | test morto | esito |
|---|---|---|
| tolto `.eq('lavoro_id', lavoro_id)` dalla `update()` | "la mutazione porta TRE `.eq()`…" | ✅ muore (3→2, `toHaveLength(3)` fallisce) |
| tolto `.is('deleted_at', null)` dalla `update()` | "la mutazione porta anche `.is(deleted_at, null)`…" | ✅ muore |
| disattivata la finestra (`if (false && lavoro.stato === 'consegnato')`) | "lavoro consegnato → 409…" | ✅ muore (200 invece di 409) |
| tolto il blocco di conteggio righe | "0 righe toccate…" **e** "più di una riga toccata…" | ✅ entrambi muoiono |
| tolto `.is('deleted_at', null)` dalla guardia di esistenza del `DELETE` | "immagine già cancellata → 404…" | ✅ muore |
| tolto `.eq('lavoro_id', lavoro_id)` dalla guardia di esistenza del `DELETE` | "immagine di un altro lavoro → 404…" | ✅ muore |
| tolto `.is('deleted_at', null)` dalla guardia di esistenza del `PATCH` (D52-a) | "D52(a): la guardia … ORA filtra deleted_at…" | ✅ muore |
| ripristinato `{ error: updateError.message }` grezzo nel `PATCH` (D52-b) | "D52(b): errore DB … mai updateError.message grezzo" | ✅ muore |
| tolto `.is('lavori_immagini.deleted_at', null)` dal sito 3 (`api/lavori/[id]/route.ts`) | test del sito 3 in `lavori-immagini-deleted-embed.test.ts` | ✅ muore |

**Nessuna prova è rimasta verde dopo la mutazione corrispondente.** Non ho trovato prove vuote in
questo giro — se ne avessi trovate le avrei riscritte e dichiarate qui, come richiesto dal brief §4.

### Gli otto siti — prova statica (tutti e otto) + prova vera (siti 1 e 2)

`tests/unit/lavori-immagini-deleted-embed.test.ts`, stessa forma di
`tests/unit/ddc-lettori-gruppo-b.test.ts` (precedente in casa riusato, non un'impalcatura nuova):
conta le occorrenze di `immagini:lavori_immagini(*)` e quelle di
`.is('lavori_immagini.deleted_at', null)`, asserisce **uguaglianza numerica** — un `it` per file,
più un `it` gemello che verifica l'assenza di `!inner` (i nove siti non lo usano, verificato con la
stessa lettura del sorgente, non "a occhio"). **16 test, tutti verdi.** Mutazione fatta sul sito 3
(tolto il filtro): il test del sito 3 muore, gli altri sette restano verdi — l'uguaglianza è **per
file**, non globale, quindi un sito rotto non si nasconde dietro gli altri sette corretti.

**Sonda in sola lettura per i siti 1 e 2** (query ESATTA di produzione, non la forma semplificata di
P12): `scripts/tmp/sonda-t8-siti-1-2.mjs` — **incollata qui per intero** perché `scripts/tmp/` è
ignorato da git e sparisce con la sessione.

```js
// Sonda T8 — siti 1 e 2 — SOLA LETTURA, solo conteggi.
// Estende P12 (che usava un innesto SEMPLIFICATO a 2 colonne) alla FORMA ESATTA
// delle query di produzione dei siti 1 e 2 — stessa proiezione `*`, stessi
// nove embed, stesso `.neq('ddc.stato', 'annullata')`.
// Niente scrittura: 0 righe con deleted_at valorizzato in banca dati (baseline
// riverificata), quindi il sostituto è lo stesso di P12: un VALORE CHE DEVE
// ESSERE RIFIUTATO (qui: un id di immagine inesistente).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter((r) => r.includes('=') && !r.trim().startsWith('#'))
    .map((r) => [r.slice(0, r.indexOf('=')).trim(), r.slice(r.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
)
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const SELECT = `
  *,
  cliente:clienti(*),
  paziente:pazienti(*),
  tecnico:tecnici(*),
  lavorazioni:lavori_lavorazioni(*),
  appuntamenti:lavori_appuntamenti(*),
  immagini:lavori_immagini(*),
  fasi:lavori_fasi(*, fase:fasi_produzione(*)),
  materiali:lavori_materiali(*),
  ddc:dichiarazioni_conformita(*),
  laboratorio:laboratori(nome, telefono)
`

const LAVORO_CON_FOTO = 'e7c942f4-0283-4365-89ff-f7aa6fca75ae' // 1 immagine, verificata via SQL diretto
const IMMAGINE_ID_INESISTENTE = '00000000-0000-0000-0000-000000000000'

async function prova(etichetta, applicaFiltro) {
  let q = svc.from('lavori').select(SELECT).eq('id', LAVORO_CON_FOTO)
  q = applicaFiltro(q)
  const { data, error } = await q.single()
  if (error) return console.log(`${etichetta.padEnd(62)} -> ERRORE ${error.code ?? ''} :: ${(error.message ?? '').slice(0, 90)}`)
  const figli = data?.immagini?.length ?? 0
  console.log(`${etichetta.padEnd(62)} -> HTTP OK · lavoro trovato · figli ${figli}`)
}

await prova('baseline (query di oggi, pre-T8)', (q) =>
  q.is('deleted_at', null).neq('ddc.stato', 'annullata')
)
await prova("+ .is('lavori_immagini.deleted_at', null)  [controllo +: la foto vera resta]", (q) =>
  q.is('deleted_at', null).neq('ddc.stato', 'annullata').is('lavori_immagini.deleted_at', null)
)
await prova("+ .eq('lavori_immagini.id', '<uuid inesistente>')  [morde: figli -> 0]", (q) =>
  q.is('deleted_at', null).neq('ddc.stato', 'annullata').eq('lavori_immagini.id', IMMAGINE_ID_INESISTENTE)
)
```

**Esito (comando `node scripts/tmp/sonda-t8-siti-1-2.mjs`):**

```
--- riferimento: query IDENTICA al sito, senza il filtro T8 ---
baseline (query di oggi, pre-T8)                               -> HTTP OK · lavoro trovato · figli 1

--- query IDENTICA al sito + filtro T8 (grafia del piano) ---
+ .is('lavori_immagini.deleted_at', null)  [controllo +: la foto vera resta] -> HTTP OK · lavoro trovato · figli 1

--- valore che DEVE essere rifiutato (surrogato di una riga cancellata) ---
+ .eq('lavori_immagini.id', '<uuid inesistente>')  [morde: figli -> 0] -> HTTP OK · lavoro trovato · figli 0
```

**Lettura:** (1) controllo positivo — con il filtro T8 applicato alla query ESATTA e completa dei
siti 1/2 (nove embed insieme, non la forma minimale di P12), la foto vera del lavoro
`e7c942f4-…` resta (`figli 1`, invariato rispetto al baseline senza filtro) — il filtro non rompe
niente combinato con gli altri otto embed e con `.neq('ddc.stato', …)`; (2) valore che deve essere
rifiutato — un id di immagine inesistente azzera i figli mantenendo il padre, la stessa firma che
avrebbe un `deleted_at` reale filtrato. Non è stata creata né soft-cancellata nessuna riga reale (il
brief vieta la scrittura anche temporanea): il sostituto è lo stesso metodo già validato da P12.

Ho anche rieseguito `scripts/tmp/sonda-t8-alias.mjs` (la sonda di P12, ancora su disco benché
ignorata da git) per riconfermare, prima di partire, che la grafia del piano morde: **invariato**,
`nessun filtro → padri 60 · figli 2` / `.is('lavori_immagini.deleted_at', null) → padri 60 · figli
2` / `.eq('lavori_immagini.tipo', 'INESISTENTE') → padri 60 · figli 0`.

---

## 3. Difetti trovati nel brief e nel piano (la parte più preziosa, per istruzione esplicita)

0. **Il nome file che il brief detta alla lettera per questo stesso rapporto è gitignorato.**
   Brief §6: «Crea `docs/roadmap/2026-07-29-ondata-b-t8-report.md`», con la motivazione esplicita che
   stare in `docs/` (invece che in `.superpowers/sdd/`, ignorato per intero) garantisce che il file
   **sopravviva alla sessione dentro il repo**. Ma `.gitignore:77` porta la regola `*-report.*`, che
   **quel nome esatto** soddisfa — `git check-ignore -v` lo conferma (`.gitignore:77:*-report.*`).
   Il file sarebbe rimasto **per sempre non tracciato**, esattamente il difetto che il brief voleva
   evitare scegliendo `docs/` — un vuoto silenzioso, non segnalato da nessun errore. **Non è un
   dettaglio isolato**: il precedente in casa più vicino,
   `docs/roadmap/2026-07-28-collaudo-ondata-a-referto.md`, usa "referto" invece di "report" — cioè
   qualcuno ha già urtato contro questa stessa regola ed è passato al nome alternativo, ma quella
   scelta non è mai stata scritta come lezione da riusare, e così si è ripresentata identica un giorno
   dopo. **Rinominato** in `docs/roadmap/2026-07-29-ondata-b-t8-referto.md` (stessa cartella, stesso
   contenuto) — `git check-ignore` conferma che il nuovo nome non è ignorato.
1. **Conteggio righe del file `route.ts` prima delle mie modifiche: 81, non 82.** Il brief (§3(A)) e
   il piano dicono «82 righe, oggi solo `PATCH`» — `wc -l` dava **81**. Scarto minimo (probabilmente un
   filo di conteggio sull'ultima riga/newline), non cambia nulla di sostanziale: il file esisteva
   davvero con solo `PATCH`, la struttura descritta era esatta in tutto il resto. Lo scrivo perché il
   brief stesso chiede di controllare ogni coordinata riusata, e questa non tornava per un'unità.
2. **`database.types.ts`: le righe 3030 e 3041 non sono esattamente `deleted_at`.** Il brief cita
   `database.types.ts:3019/3030/3041` come le tre riflessioni di `deleted_at` (Row/Insert/Update).
   Verificato: **3019** è davvero `deleted_at: string | null` (Row) ✅; **3030** è `Insert: {` (l'inizio
   del blocco, non la riga del campo) e **3041** è `tipo?: string` (non `deleted_at`). La colonna
   `deleted_at` **esiste comunque** nei tre blocchi (Row/Insert/Update), verificato leggendo l'intorno —
   solo le tre coordinate puntuali sono scivolate di qualche riga. Nessun impatto: non ho toccato
   quel file (nessuna migration, come da mandato) e la verifica sostanziale (la colonna c'è) regge.
3. **Tutto il resto verificato è risultato esatto**, incluse le parti che il brief segnalava come
   "riverificate apposta": le otto coordinate dei siti di lettura (tutte e otto restituiscono
   `immagini:lavori_immagini(*),` sulla riga indicata), `002_fase2_schema.sql:255/258-259/262-263`
   (colonna, RLS, indice — esatti alla riga), i tre precedenti in casa (`lavorazioni/route.ts:62-67`,
   `cicli/[id]/route.ts:167/170`, `pazienti/route.ts:227-228`), e P12 (la grafia del filtro, riprodotta
   e riconfermata con la sonda originale prima di partire).

Non ho trovato altri scarti. Non è la conferma che il brief sia "perfetto" — è la misura di dove ho
guardato: ogni coordinata citata sopra è stata riaperta, non presa per buona.

---

## 4. Ritrovamenti fuori mandato (R-E2 — riferiti, NON corretti)

- **`TabImmagini.tsx:571`** — il contatore (`{immagini.length} … allegate`) conta l'intero array
  `immagini` ricevuto come prop. **Non l'ho toccato.** Osservazione aggiuntiva rispetto al brief: una
  volta che il filtro del sito 2 è in produzione, il caricamento **da server** (page load) della
  pagina `/modifica` già esclude le foto cancellate dall'array `immagini` passato al componente — il
  problema descritto dal brief ("il contatore mente, l'utente ricancella e la ritrova") riguarda
  soprattutto il **momento fra un'eventuale azione client-side futura e il refresh della pagina**
  (stato locale del componente non ancora sincronizzato), che è esattamente il territorio del task
  successivo (bottone «Elimina foto» + fix del contatore, D51). Non ho verificato oltre perché
  è fuori mandato: lo segnalo come dettaglio utile a chi eseguirà quel task, non come correzione.
- **`[imgId]/route.ts` — l'`update()` del `PATCH` porta due `.eq()` (`id`, `laboratorio_id`), non tre
  (manca `lavoro_id`).** Confermato leggendo il file finale (riga 75-76 dopo le mie modifiche). Non
  sfruttabile (`id` è chiave primaria), non deciso (D52 lo esclude esplicitamente dal mandato). **Non
  l'ho toccato.** Il mio `DELETE` porta tre `.eq()` sulla mutazione, come richiesto — non ho copiato
  quel modello.
- **`tipo` resta nell'allowlist PATCH** (`ALLOWED_PATCH_FIELDS`) pur essendo, per quanto riportato dal
  piano, una colonna morta cablata a `'foto'` all'INSERT. Non l'ho toccato (fuori mandato, colonna
  esplicitamente non-toccare nel brief §2).

---

## 5. Output reale — FASE 7

### `npx tsc --noEmit`
Nessun output, exit 0 (silenzio = successo).

### `npx vitest run`
```
 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

Not implemented: navigation to another Document

 Test Files  358 passed | 3 skipped (361)
      Tests  3850 passed | 19 skipped (3869)
   Start at  09:01:34
   Duration  56.52s (transform 18.62s, setup 130.37s, import 70.71s, tests 198.83s, environment 375.81s)
```
Nessun rosso in questo giro (il flake descritto dal brief — un solo test con durata anomala — **non
si è manifestato**: suite intera verde al primo colpo, nessun isolamento necessario).

### `npx next build`
Exit 0. La tabella delle rotte mostra `ƒ /api/lavori/[id]/immagini/[imgId]` (dinamica, come atteso) —
è la verifica che `tsc` da solo non fa: la firma dell'handler `DELETE` è valida per Next.js.

### `node scripts/guardia-coerenza-documenti.mjs`
```
=== Guardia coerenza documenti — 9 documenti vivi controllati ===
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
```

### Baseline database — riverificata, invariata (solo letture)

```sql
SELECT (SELECT count(*) FROM lavori) AS lavori,
       (SELECT count(*) FROM lavori_denti) AS denti,
       (SELECT count(*) FROM pazienti) AS pazienti,
       (SELECT count(*) FROM colori_dentali) AS colori,
       (SELECT count(*) FROM lavori_immagini) AS immagini_totali,
       (SELECT count(*) FROM lavori_immagini WHERE deleted_at IS NOT NULL) AS immagini_cancellate;
```
Risultato: **294 · 0 · 916 · 48** (lavori · denti · pazienti · colori — baseline del brief, invariata)
e **3 · 0** (immagini totali · immagini cancellate — invariato rispetto a prima della sessione:
nessuna riga toccata, tutte le sonde erano di sola lettura o mutazioni temporanee ripristinate subito
nel codice, mai nel database).

---

## 6. File toccati

- `src/app/api/lavori/[id]/immagini/[imgId]/route.ts` — handler `DELETE` aggiunto, D52(a) e D52(b) chiusi.
- `src/app/(app)/lavori/[id]/page.tsx` — filtro sito 1.
- `src/app/(app)/lavori/[id]/modifica/page.tsx` — filtro sito 2.
- `src/app/api/lavori/[id]/route.ts` — filtro sito 3.
- `src/app/api/fatture/batch/route.ts` — filtro sito 4.
- `src/app/api/fatture/[id]/xml/route.ts` — filtro sito 5.
- `src/lib/pdf/generate-ricevuta-consegna.ts` — filtro sito 6.
- `src/lib/pdf/generate-etichetta.ts` — filtro sito 7.
- `src/lib/pdf/generate-ifu.ts` — filtro sito 8.
- `tests/unit/lavori-id-immagini-imgid-route.test.ts` — nuovo, 28 test (DELETE + D52).
- `tests/unit/lavori-immagini-deleted-embed.test.ts` — nuovo, 16 test (8 siti × 2).
- `scripts/tmp/sonda-t8-siti-1-2.mjs` — nuovo, sonda di sola lettura (ignorato da git, incollata sopra).

Non toccati (per mandato esplicito): UI/bottone «Elimina foto», `TabImmagini.tsx:571`, l'`update()`
del `PATCH` a due `.eq()`, le colonne `url`/`tipo`, il bucket storage (resta privato).
