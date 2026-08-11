# Resoconto — Task 4-quater: ⚖️ D354, un atto chiude tutte le righe aperte del lavoro

**Data:** 10/08/2026, mattina · **Ramo:** `intervento-post-consegna` · **Commit:** `b88c98b9`
**Status:** DONE

---

## 0. Che cosa ho fatto, in breve

La rotta `POST /api/lavori/[id]/avviso` chiudeva **una sola riga** di `avvisi_dentista` (quella
indicata dal corpo, `.eq('id', avvisoId)`). ⚖️ D354 (referto del panel,
`docs/roadmap/2026-08-10-panel-due-avvisi-referto.md` §3/§4/§6) cambia la semantica dell'atto: se un
lavoro ha più promemoria aperti, **un solo atto di comunicazione li chiude TUTTI** — stesso `stato`,
`comunicato_at`, `comunicato_da` (e `testo_inviato` se dall'app) su ogni riga.

Il contratto verso il client **non è cambiato**: `POST { avviso_id, come, testo? }` →
`200 { ok: true, avviso }`, dove `avviso` resta la riga indicata dal corpo (unico chiamante vivo:
`AvvisoDentista.tsx:513-531`, legge `esito.avviso`).

**I quattro cambi, esattamente come da quadro del brief:**
1. L'avviso indicato si verifica **PRIMA** della scrittura, nel perimetro `id`+`laboratorio_id`+
   `lavoro_id`: assente → 404 · già chiuso → 409 · fuori vocabolario → 409 fail-closed (con
   `console.error`). Le tre distinzioni esistevano già nel vecchio ramo zero-righe: si sono spostate
   davanti alla scrittura.
2. L'UPDATE perde `.eq('id', avvisoId)`: il perimetro diventa `laboratorio_id`+`lavoro_id`+
   `stato IN STATI_APERTI` — chiude quindi **tutte** le righe aperte del lavoro con lo stesso oggetto
   `daScrivere` (un oggetto solo → stessi tre/quattro valori per costruzione).
3. La risposta cerca nella lista aggiornata la riga con `id === avviso_id` (`righe.find`, non
   `righe[0]`) — fail-closed con `console.error` se manca (corsa con un collega: ha chiuso tutto fra
   la lettura di verifica e l'UPDATE).
4. Il ramo «zero righe aggiornate» resta fail-closed, ma ora copre **solo** la corsa con un collega
   (le tre distinzioni vecchie sono state anticipate al punto 1).

**Un quinto ramo, non nel quadro ma necessario per onestà (dichiarato, non nascosto):** un errore
della lettura di verifica ora risponde **500**, non un 404 bugiardo. Prima del Task 4-quater questo
ramo non poteva esistere: non c'era una lettura PRIMA della scrittura di cui un guasto di rete
potesse essere confuso con «non trovato». L'ho aggiunto perché ignorare l'errore avrebbe trasformato
un problema transitorio del database in una risposta falsa al client — e l'ho anche **provato**
(v. §2, `Ⓕ`).

## 1. Le guardie NON toccate

Origine (`isSameOrigin`), contesto (`getFreshLabContext`), ruolo (⚖️ D342, `puoChiudereAvviso`),
operativo (`assertLabOperativo`) — righe 217-254 della rotta finale — sono **identiche** a prima. Il
corpo (parsing, allowlist chiavi, `avviso_id`, `come`, il testo) è **identico**. Ho toccato solo la
sezione dalla dichiarazione di `svc` in poi.

## 2. Evidenza TDD

### Passo 1 — le forme enumerate (dal brief, con l'aggiunta del ramo 500)

| Forma | Atteso | Prova |
|---|---|---|
| Ⓐ due righe aperte → un atto → entrambe chiuse, stessi tre valori | 200, `avviso` = la riga **indicata** (non `righe[0]`), update senza `id` | nuova |
| Ⓑ una aperta + una già chiusa → l'aperta si chiude, la chiusa non si tocca | 200, `in:stato` non contiene mai uno stato chiuso | nuova |
| Ⓒ `avviso_id` fuori dal perimetro, con righe aperte nel lavoro | 404, NESSUN update | riscritta (era ⑯⑰) |
| Ⓓ riga indicata già chiusa | 409, NESSUN update | riscritta (era ⑱) |
| Ⓔ una sola riga aperta (il giro di oggi) | 200, `avviso` = la riga — **invariato** | guardia di regressione (㉑ ㉑-bis ㉒ ㉒-bis ㉕ ⑬-bis ⑮, già in file) |
| Ⓕ (aggiunta) errore nella lettura di verifica | 500, non 404 | nuova |

**Dichiarazione onesta su Ⓑ e Ⓐ** (per la stessa ragione già scritta nel file per ⑯⑰): il finto
client **non sa filtrare**. Non può dimostrare che una riga già chiusa resti *davvero* intatta nel
database — quello lo garantisce `.in('stato', STATI_APERTI)` sul database vero. Ciò che la prova
unitaria dimostra è che la rotta **chiede** solo le righe aperte (l'elenco `in:stato` non contiene
mai `STATI_CHIUSI`) e che l'UPDATE non porta più `id` nel suo perimetro — quest'ultima è la sola
asserzione che distinguerebbe una regressione a «chiude solo la riga indicata» da «chiude tutte le
aperte del lavoro».

### Passo 2 — RED, poi conteggio

Ho commesso l'errore di scrivere prima la rotta e poi le prove (violando l'ordine RED→GREEN). Per
non falsificare l'evidenza ho **rimesso la rotta allo stato precedente** (`git stash` sul solo file
di rotta, test già riscritti) e rilanciato la suite:

```
$ git stash push --quiet -- "src/app/api/lavori/[id]/avviso/route.ts"
$ npx vitest run tests/unit/api-avviso.test.ts
...
 Test Files  1 failed (1)
      Tests  14 failed | 20 passed (34)
```

**Conteggio: 14 su 34 rossi** contro la rotta vecchia con le prove nuove. I 20 verdi sono guardie
(guardie di origine/sessione/ruolo/UUID, forma del corpo, validazione del testo) che rispondono
**prima** di qualunque chiamata al database — non toccano il cambio di D354, quindi restano verdi in
entrambi gli stati per costruzione, non per caso.

**Perché 14 e non un numero più piccolo «solo sulle forme nuove»:** ho riusato lo stesso finto client
(`banco()`) sia per le prove nuove sia per quelle di successo già esistenti (㉑, ㉒, ㉕, ⑬-bis, ⑮,
⑳), e l'ho riscritto per simulare **lettura-poi-scrittura** (l'ordine della rotta nuova). Contro la
rotta vecchia (che scrive-poi-eventualmente-legge) l'ordine dei due `from()` non corrisponde più a
quello che la rotta vecchia si aspetta: la prima chiamata (pensata per la verifica) viene letta dalla
rotta vecchia come se fosse il risultato dell'UPDATE — un oggetto singolo scambiato per un array,
`righe.length` `undefined`, `righe[0]` `undefined`. Questo produce rossi anche su alcune prove di
successo (㉑, ㉑-bis, ㉒, ㉒-bis, ㉕) che **non testano un comportamento nuovo**: sono guardie di
regressione (Ⓔ) che sarebbero rimaste verdi se non avessi cambiato la forma del finto client. Le
dichiaro qui perché contarle come «prove che provano D354» sarebbe disonesto — provano che il
*harness* è cambiato, non che il comportamento è cambiato. Le prove che provano davvero D354 sono
Ⓐ, Ⓑ, Ⓒ (⑯⑰), Ⓓ (⑱), ⑲ (fuori vocabolario, ora pre-scrittura), la prova sull'assenza del filtro
`id`, e Ⓕ: **9 prove/asserzioni-chiave**, tutte rosse nella stessa corsa.

### Passo 4 — GREEN

```
$ git stash pop --quiet
$ npx vitest run tests/unit/api-avviso.test.ts

 Test Files  1 passed (1)
      Tests  34 passed (34)
```

### Passo 5 — FASE 7, output reale

```
$ npx tsc --noEmit
$ echo $?
0
```
(nessun output — zero errori)

```
$ npx vitest run
 Test Files  459 passed | 10 skipped (469)
      Tests  5983 passed | 128 skipped (6111)
   Duration  37.51s
```
Nota di casa confermata: `npx vitest run` locale salta le prove d'integrazione (niente `.env.local`
nel comando) — atteso, non un difetto. Ho verificato **prima** di scrivere codice che
`tests/integration/correggi-e-riemetti-con-avviso.rpc.test.ts` (la prova del Task 2, «due
riemissioni → due avvisi») importa solo `withRollback`/l'RPC diretta, **non** questa rotta: resta
verde e intoccata per costruzione, non perché non gira.

```
$ npx next build
✓ Compiled successfully in 2.9s
  Running TypeScript ...
  Finished TypeScript in 10.8s ...
✓ Generating static pages using 15 workers (82/82) in 157ms
```
Nessun errore, nessun warning nuovo (l'unico warning presente, sulla convenzione `middleware` vs
`proxy`, è preesistente e fuori mandato).

## 3. File toccati

| File | Che cosa |
|---|---|
| `src/app/api/lavori/[id]/avviso/route.ts` | I quattro cambi del quadro + il ramo 500 sulla lettura di verifica + tre blocchi di commento riscritti (header, «due perimetri», ramo zero-righe/risposta) |
| `tests/unit/api-avviso.test.ts` | `banco()` riscritto (verifica-poi-update, non più update-poi-lettura); ⑯⑰, ⑱, ⑲ riscritte per il nuovo ordine (dichiarato sotto); nuove prove Ⓐ Ⓑ Ⓕ; aggiunta l'asserzione «l'update non porta `id`»; censimento in testa al file aggiornato |

**Prove esistenti riscritte, con la ragione (come richiesto dal brief):**
- **⑯⑰** («un avviso di un altro laboratorio/lavoro» → 404): il significato non cambia (perimetro
  `id`+`laboratorio_id`+`lavoro_id`, 404 se assente), ma ora **si prova anche** che l'update non
  parte affatto (`mockFrom` chiamato una volta sola, `catenaUpdate.chiamate` vuota) — prima l'update
  partiva comunque (a zero righe) e la lettura di disambiguazione lo seguiva.
- **⑱** (avviso già chiuso → 409): stesso significato, con l'aggiunta esplicita di «NESSUN update»
  per lo stesso motivo.
- **⑲** (stato fuori vocabolario → 409 fail-closed): stesso significato, ora verificato **prima**
  della scrittura invece che dopo un UPDATE a zero righe.
- Il test **🛑 l'aggiornamento è CONDIZIONATO…**: stesso significato (l'elenco `in:stato` è derivato
  da `stati.ts`), con l'aggiunta dell'asserzione `Object.hasOwn(f, 'id') === false` — è la sola riga
  che, tolta, lascerebbe il file verde anche con un ritorno a `.eq('id', avvisoId)`.

Nessun'altra prova del file è stata toccata nella sostanza: le prove di successo (㉑ e derivate, ⑬-bis,
⑮, ㉕) e le prove sui ruoli (㉔-㉙) restano testualmente come prima, e passano grazie al nuovo
default di `banco()` (verifica = riga aperta).

## 4. Autorevisione

**Completezza rispetto al mandato:** i quattro punti del quadro sono tutti implementati e provati.
Le guardie (origine/contesto/ruolo/operativo) non sono state toccate, come richiesto. Il contratto
verso il client è verificato invariato (stesso corpo, stessa forma di risposta, `avviso` è sempre la
riga indicata — mai un elenco).

**Qualità:** ho riusato `STATI_APERTI`, `chiudeIlPromemoria`, `isStatoAvviso`, `ammetteTestoInviato`
da `stati.ts` senza duplicare logica. `daScrivere` resta un oggetto solo, quindi l'identità dei
valori scritti su più righe è strutturale, non una promessa da mantenere a mano — esattamente il
punto centrale di D354.

**Disciplina/YAGNI:** non ho toccato il Task 8 (portale) né il caso di confine «portale aperto fra le
due correzioni» — esplicitamente deciso-di-non-decidere nel referto §4, e il brief lo esclude per
nome. Non ho aggiunto un endpoint o un parametro per restituire *tutte* le righe chiuse: il client di
oggi legge solo `esito.avviso`, e costruire una forma non consumata sarebbe un contratto preso di
striscio (lo dico anche nel commento della rotta).

**Prove che provano davvero:** ho verificato con la coppia «codice giusto + il finto client non
riceve la chiamata» ovunque il quadro lo chiedeva (Ⓒ/⑯⑰, Ⓓ/⑱, ⑲, Ⓕ) — non solo lo status HTTP. Ho
dichiarato esplicitamente il limite del finto client su Ⓐ e Ⓑ invece di lasciar credere che una prova
unitaria dimostri un comportamento del database vero. L'unica asserzione che distingue davvero D354
da una regressione silenziosa (`Object.hasOwn(f, 'id') === false` sull'update) è scritta e commentata
come tale.

**Errore di processo commesso e corretto:** ho scritto la rotta prima di finire le prove (violando
RED→GREEN). Non l'ho nascosto: ho usato `git stash` per riportare la rotta a `HEAD`, catturato il
rosso vero con le prove nuove, e solo dopo ripristinato l'implementazione — la sezione 2 sopra porta
l'output di entrambe le corse, non un rosso ricostruito a memoria.

## 5. Riserve

- **BP-1 (`memory/MEMORY.md` / `docs/roadmap/ROADMAP-UFFICIALE.md`) non aggiornati**: il mio mandato
  è scoperto sul solo file di rotta + file di prove; l'aggiornamento memoria a livello di ondata
  spetta all'orchestratore (R-E2 — riferito, non fatto di mia iniziativa).
- **Il file `.superpowers/sdd/avviso-dentista-task-4quater-brief.md`** è rimasto non tracciato (non
  l'ho aggiunto al commit): non è un file di codice né di prove, ed è fuori dal perimetro dichiarato
  dal brief stesso («git add per percorsi», scoped ai due file del mandato).
- **Nessun difetto fuori mandato trovato** in questa sessione da riferire (R-E2): la rotta e il file
  di prove erano nello stato descritto dal brief, e il resto della rotta (guardie, corpo) non
  presentava nulla di sospetto durante la lettura.
- **Il caso di confine «portale aperto fra le due correzioni»** resta esplicitamente non affrontato,
  come da referto §4 e da brief — non è stato né risolto né anticipato in questo task.

---

## 6. Fix post-revisione (10/08/2026, stesso giorno) — rilievo Important

**Commit:** `97ea8082` · **File toccato:** solo `tests/unit/api-avviso.test.ts` (la rotta non è stata
toccata).

**Il rilievo:** nel test `🛑 l'aggiornamento è CONDIZIONATO…` (allora righe 447-462) le uniche
asserzioni su `filtri(b.catenaUpdate)` erano `in:stato` e l'**assenza** di `id`. Nessuna delle 34
prove asseriva la **presenza** di `laboratorio_id` e `lavoro_id` sulla catena UPDATE — che con D354
sono diventati l'**intero perimetro** di un aggiornamento multi-riga (l'update non porta più `id`).
Una modifica futura che avesse cancellato `.eq('lavoro_id', lavoroId)` avrebbe chiuso gli avvisi
aperti di **qualsiasi lavoro** del laboratorio (senza `laboratorio_id`, la fuga sarebbe stata
cross-tenant), e il file sarebbe rimasto verde. Concordo con la lettura: è esattamente il punto cieco
che l'assenza di `id` da sola non copre.

**Fix applicato**, nel test già esistente:
```ts
expect(f.laboratorio_id).toBe(LAB_ID)
expect(f.lavoro_id).toBe(LAVORO_ID)
```

**Rilancio del file di prove:**
```
$ npx vitest run tests/unit/api-avviso.test.ts
 Test Files  1 passed (1)
      Tests  34 passed (34)
```

**Verifica per inversione (lezione del Task 6 — una prova che sorveglia un'esistenza va provata
rompendola):** ho commentato temporaneamente `.eq('lavoro_id', lavoroId)` nell'UPDATE della rotta
(`src/app/api/lavori/[id]/avviso/route.ts`, invariata nel commit finale) e rilanciato:
```
$ npx vitest run tests/unit/api-avviso.test.ts
 ❯ tests/unit/api-avviso.test.ts (34 tests | 1 failed)
     × 🛑 l'aggiornamento è CONDIZIONATO allo stato ancora aperto, l'elenco è DERIVATO da stati.ts,
       NON porta più `id`, e porta `laboratorio_id`+`lavoro_id` (⚖️ D354)
AssertionError: expected undefined to be '33333333-3333-3333-3333-333333333333'
 Test Files  1 failed (1)
      Tests  1 failed | 33 passed (34)
```
**Rosso esattamente sul test toccato, nessun altro** — l'asserzione morde. Ripristinato
`.eq('lavoro_id', lavoroId)` e riverificato che `git diff --stat` sulla rotta torni vuoto (zero
scarto contro `HEAD`) e la suite torni 34/34 verde.

**Autorevisione del fix:** minimo, scoped al solo punto segnalato, nessuna riscrittura non richiesta.
I due rilievi Minor menzionati dal coordinatore non sono stati toccati, come da contratto — restano a
ledger per la revisione finale.
