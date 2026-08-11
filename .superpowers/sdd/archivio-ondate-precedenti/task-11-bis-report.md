# Task 11-bis — report

Il difetto era esattamente quello descritto nel mandato: `TabImmagini.tsx` era stato riparato in T11
(porta `categoria`), ma **due chiamanti vivi** della stessa rotta (`src/app/api/lavori/[id]/immagini/
route.ts:97-103`) mandavano ancora il campo vecchio `descrizione` e prendevano un 422 —
`isCategoriaFoto` non lo accetta. Risultato pratico: **caricare una foto dal wizard «Nuovo lavoro»
falliva sempre**, sia al Passo 3 (foto dell'impronta) sia dal frame «Fatto!» (foto impronta/
prescrizione). Entrambi i punti sono riparati.

**Branch:** `ondata-b-schermate` (nessun worktree, nessun nuovo ramo). Commit: vedi in fondo al
report — hash riportato anche nella risposta finale.

## 1. Censimento — comando e riscontri

Primo giro, sulle due forme richieste, scoped a `src` (dove sospettavo vivessero i chiamanti):

```
$ grep -rn "append(['\"]descrizione['\"]" src --include='*.ts' --include='*.tsx'
src/components/features/wizard/FrameFatto.tsx:170:      fd.append('descrizione', 'prescrizione')
src/lib/wizard/crea-lavoro.ts:393:      fd.append('descrizione', 'impronta')
→ 2 riscontri, ENTRAMBI già nominati dal mandato.

$ grep -rn "/immagini" src --include='*.ts' --include='*.tsx' | grep -v "route.ts"
→ i SOLI chiamanti della POST /api/lavori/[id]/immagini in src sono tre: TabImmagini.tsx (riparato
  in T11, non toccato qui), FrameFatto.tsx e crea-lavoro.ts (riparati qui).
```

🔴 **Il primo giro era scoped a `src`, non «su tutto il repo» come chiede il mandato** — un terzo
chiamante in `tests/e2e/`, `scripts/` o `supabase/` sarebbe rimasto invisibile, e non sarebbe stato
smascherato nemmeno da `vitest run` se fosse stato in una spec Playwright. Ripetuto senza scoping,
su tutto l'albero (esclusi `node_modules`/`.next`/`.git`, file di codice):

```
$ grep -rln --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
    --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' \
    -E "append\(['\"]descrizione['\"]" .
(nessun riscontro)

$ grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
    --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' "/immagini" . \
    | grep -v "^\./src/"
→ SOLO test (tests/unit/crea-lavoro.test.ts, tests/unit/FrameFatto.test.tsx,
  tests/unit/lavori-id-immagini-route.test.ts, tests/unit/lavori-id-immagini-imgid-route.test.ts,
  tests/unit/lavori/TabImmagini.test.tsx, tests/unit/lavori-immagini-deleted-embed.test.ts). Zero
  hit in tests/e2e/, scripts/ (verificato anche a mano su scripts/seed-e2e.ts: il suo `descrizione`
  è la colonna lavori.descrizione, tabella e concetto diversi — non il campo del form-data foto) o
  supabase/.
```

Nessun terzo chiamante su tutto il repo, non solo su `src`. Ripetuto lo stesso censimento (entrambi
i giri) **dopo** la riparazione: zero riscontri per `append('descrizione'…)` ovunque, stesso elenco
di tre chiamanti client per `/immagini`. Il difetto che questo task esiste per chiudere non ha un
terzo punto non nominato — verificato senza scoping, non solo su `src`.

## 2. La scelta della categoria per la foto di FrameFatto — e la ragione

**`crea-lavoro.ts:393`** (foto del Passo 3): il campo che raccoglie questa foto è letteralmente
«Aggiungi la foto **dell'impronta**» (`PassoPaziente.tsx:256`, componente `RigaFoto`). Il valore
`'impronta'` è una delle sei categorie ratificate in `categorie-foto.ts` — non è un ripiego, è la
categoria vera del contenuto. Cambio: `fd.append('descrizione', 'impronta')` →
`fd.append('categoria', 'impronta')`.

**`FrameFatto.tsx:170`** (foto del frame «Fatto!», tasto «Fotografa impronta **e prescrizione**»):
qui era la trappola. Il vecchio valore `'prescrizione'` **non è** una delle sei categorie
(`impronta, pre_lavoro, colore, post_prova, rx, altro` — `src/lib/domain/categorie-foto.ts:17-24`):
rinominare il campo da solo non basta, il server risponderebbe comunque 422. Una prescrizione
cartacea non è nessuna delle cinque categorie cliniche (non è un'impronta, non è pre-lavoro, non è
una guida colore, non è post-prova, non è una radiografia). L'elenco stesso prevede un valore di
ripiego proprio per questo caso — `'altro'` — ed è lo stesso valore che il commento della rotta
(`route.ts:88`, D74) assegna quando l'utente esce dal foglio-categoria di `TabImmagini` senza
scegliere: «il CLIENT manda 'altro' esplicitamente». Ho scelto **`'altro'`** per coerenza con quel
precedente già in casa, non inventato per l'occasione. Cambio:
`fd.append('descrizione', 'prescrizione')` → `fd.append('categoria', 'altro')`.

## 3. Le prove — scritte PRIMA, guardato il rosso, poi riparato

In entrambi i test (`tests/unit/crea-lavoro.test.ts`, `tests/unit/FrameFatto.test.tsx`) ho importato
la funzione VERA `isCategoriaFoto` da `@/lib/domain/categorie-foto` — la stessa che la rotta usa per
rifiutare — e asserito che il valore mandato la **passerebbe**, non solo che la chiave `'categoria'`
compaia:

```ts
expect(isCategoriaFoto(fd.get('categoria'))).toBe(true)
expect(fd.get('categoria')).toBe('impronta')   // o 'altro' in FrameFatto
expect(fd.get('descrizione')).toBeNull()
```

**Rosso, prima della riparazione** (`npx vitest run tests/unit/crea-lavoro.test.ts
tests/unit/FrameFatto.test.tsx`):
```
Test Files  2 failed (2)
     Tests  2 failed | 49 passed (51)
```
Entrambe le prove nuove fallivano sulla stessa riga (`expect(isCategoriaFoto(fd.get('categoria')))
.toBe(true)` → `false` vs `true` atteso): il vecchio codice non mandava affatto la chiave
`categoria`, quindi `fd.get('categoria')` era `null` e `isCategoriaFoto(null)` è `false`.

**Verde, dopo la riparazione** dei due chiamanti:
```
Test Files  3 passed (3)   (crea-lavoro.test.ts, FrameFatto.test.tsx, crea-lavoro-denti.test.ts)
     Tests  77 passed (77)
```

## 4. Mutazioni — quante prove si accendono

Fatte con backup su file (`cp` in scratchpad, non su `/tmp` del repo) e ripristino verificato con
`diff` a zero dopo ogni ciclo — mai un file di lavoro lasciato mutato.

| # | File | Mutazione | Esito | Prove che si accendono |
|---|------|-----------|-------|-------------------------|
| 1 | `crea-lavoro.ts` | rimesso `fd.append('descrizione', 'impronta')` | 🔴 rosso | 1 su 30 (`crea-lavoro.test.ts`) — l'asserzione `isCategoriaFoto(fd.get('categoria')) → false` |
| 2 | `crea-lavoro.ts` | tenuto `categoria` ma valore fuori elenco (`'prescrizione'`) | 🔴 rosso | 1 su 30 — stessa asserzione, questa volta perché `isCategoriaFoto('prescrizione') → false` |
| 3 | `FrameFatto.tsx` | rimesso `fd.append('descrizione', 'altro')` | 🔴 rosso | 1 su 21 (`FrameFatto.test.tsx`) — stessa asserzione, chiave assente |
| 4 | `FrameFatto.tsx` | tenuto `categoria` ma valore fuori elenco (`'prescrizione'`) | 🔴 rosso | 1 su 21 — stessa asserzione, valore fuori dalle sei categorie |

Ogni mutazione accende **esattamente 1 prova** (quella nuova di questo task): l'asserzione su
`isCategoriaFoto` è la prima a fallire e ferma l'esecuzione del test, quindi le due asserzioni
successive (`toBe('impronta'/'altro')`, `toBeNull()`) non arrivano a eseguire — ma la prima da sola
già lega client e server nel modo richiesto dal mandato, e regge sia sul nome del campo sbagliato sia
sul valore fuori elenco. Nessuna delle altre 76 prove esistenti si accende per nessuna delle quattro
mutazioni: il raggio d'effetto è quello atteso.

Dopo ogni mutazione ho ripristinato dal backup e confermato `diff` vuoto contro il file riparato
prima di procedere alla mutazione successiva.

## 5. Ritrovamenti fuori mandato

Nessun terzo chiamante e nessun codice morto: il censimento (§1, ripetuto senza scoping su tutto il
repo) non ne ha trovati. Un punto da segnalare, non da correggere (fuori mandato — la rotta non si
tocca):

🔴 **La rotta (`route.ts:105-108`) tiene ancora `descrizione` come testo libero opzionale** — la
colonna che D73 ha aggiunto apposta perché la categoria smettesse di viverci impropriamente. Dopo
questa riparazione, la foto del frame «Fatto!» (ex `'prescrizione'`) arriva col solo `categoria:
'altro'` e `descrizione: null`: il fatto che quella specifica foto fosse «la prescrizione» (distinta
da un «altro» generico) non è più registrato da nessuna parte, in nessuna colonna. È la conseguenza
onesta del mandato («mai descrizione» — corretto, ed è quello che la prova impone), non un mio
errore: lo segnalo perché è esattamente il tipo di perdita silenziosa di un dettaglio che le
direttive del progetto chiedono di non lasciare senza una riga scritta da qualche parte. Non l'ho
risolto: né la rotta né `TabImmagini.tsx` sono nel mio perimetro, e un'eventuale settima categoria
(o un uso di `descrizione` per questo caso specifico) è una decisione di prodotto, non mia.

`memory/SESSION_ACTIVE.md` risultava già modificato da prima di questo task (verificato con `git
status` all'avvio) — non l'ho toccato né incluso nel commit.

**BP-1 (aggiornamento di `MEMORY.md`/`ROADMAP-UFFICIALE.md`) è deliberatamente NON eseguito qui**: il
mandato vieta esplicitamente di toccare quei due file per questo task. È in debito verso il
coordinatore dell'ondata, non saltato per svista — la REGOLA ZERO di `ua-app/CLAUDE.md` §0A resta
vera a livello di ondata, solo differita oltre il perimetro di T11-bis.

## FASE 7 — verifica finale, output vero

```
$ npx tsc --noEmit
(nessun output — 0 errori)

$ npx vitest run
 RUN  v4.1.6 …
Not implemented: navigation to another Document
 Test Files  368 passed | 3 skipped (371)
      Tests  4207 passed | 19 skipped (4226)
   Duration  29.03s

$ npx next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 3.0s
  Running TypeScript ...
  Finished TypeScript in 8.9s ...
  Generating static pages using 15 workers (81/81) in 186ms
  Finalizing page optimization ...
(tutte le route elencate, incluse /lavori/nuovo e /lavori/[id], nessun errore)
```

Numeri identici al riferimento ad albero pulito dichiarato nel mandato (368\|3\|371 file,
4207\|19\|4226 prove, `tsc` 0, build ok) — nessuna prova persa, nessuna nuova rossa fuori da quelle
di questo task.

## File toccati

- `src/lib/wizard/crea-lavoro.ts` — `descrizione:'impronta'` → `categoria:'impronta'`
- `src/components/features/wizard/FrameFatto.tsx` — `descrizione:'prescrizione'` → `categoria:'altro'`
- `tests/unit/crea-lavoro.test.ts` — prova aggiornata, lega il client a `isCategoriaFoto`
- `tests/unit/FrameFatto.test.tsx` — prova aggiornata, lega il client a `isCategoriaFoto`

Non toccati (fuori perimetro, come da vincoli): la rotta, i componenti del design system,
`TabImmagini.tsx`, `MEMORY.md`, `SESSION_ACTIVE.md`, roadmap, piano, spec.

**Commit:** messaggio scritto fuori dal repo, `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
in coda — hash riportato nella risposta finale.
