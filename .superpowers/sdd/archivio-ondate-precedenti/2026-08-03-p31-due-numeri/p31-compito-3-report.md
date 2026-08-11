# Referto Compito 3 — «Le due allowlist»

Data verifica: 03/08/2026 (letta dall'orologio: `date` → `Mon Aug 3 14:36:06 CEST 2026`).
Ramo: `p31-due-numeri-per-il-cliente`.

## Cosa ho fatto

Ho trattato le due allowlist come cose diverse, come chiede il mandato:

1. **`PATCHABLE_FIELDS_CLIENTE`** (`src/app/api/clienti/[id]/route.ts:16-23`) — aggiunto
   `'cellulare_whatsapp'` subito dopo `'telefono'`. Senza, la PATCH avrebbe scartato la chiave
   **senza errore** (riga 169-171 del file: `if (field in body) update[field] = body[field]`),
   e chi preme «Salva» avrebbe letto «Salvato» su un dato mai scritto.
2. **Creazione (POST)** (`src/app/api/clienti/route.ts:125`) — aggiunta
   `cellulare_whatsapp: body.cellulare_whatsapp ?? null,` subito dopo `telefono`.
3. **`CAMPI_ELENCO`** (`src/app/api/clienti/route.ts:9-17`) — **NON toccato l'array.** Aggiunto
   solo un blocco al commento JSDoc che già spiegava l'esclusione di `portale_token`, con lo
   stesso stile, spiegando **perché** `cellulare_whatsapp` non entra (l'elenco mostra un solo
   numero — quello da chiamare, cioè `telefono` — e due numeri in una riga di ricerca sono
   rumore) e **dove tornare** se un giorno servisse lì.

Ho verificato la citazione `P31, spec §4.4` prima di scriverla nel commento (non me ne sono
fidato per sentito dire): `docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md`
riga 163 dice, testuale, che `CAMPI_ELENCO` «NON si aggiunge, e questa è la destinazione della
riga» con la stessa motivazione — la spec e il brief concordano, non ho scritto una destinazione
inventata.

## Le prove TDD

**Passo 1 — la prova, scritta esattamente come nel brief** (importa
`PATCHABLE_FIELDS_CLIENTE` da `@/app/api/clienti/[id]/route` — **l'importazione ha funzionato
al primo colpo**, nessun ostacolo da riferire: esiste già un precedente,
`tests/unit/clienti-patch-allowlist.test.ts`, che importa `PATCH` dalla stessa rotta).

**Passo 2 — Rosso:**
```
npx vitest run tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts
```
Output:
```
 ❯ tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts (3 tests | 1 failed) 4ms
     × contiene il campo nuovo — senza, la rotta scarta la chiave SENZA errore 3ms
AssertionError: expected [ 'studio_nome', 'nome', …(21) ] to include 'cellulare_whatsapp'
 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
```
Esattamente **1 fallita, 2 passate**, come previsto dal brief: le altre due (contiene `telefono`,
non contiene i campi di sistema) erano già vere prima del mio cambiamento — la rossa isola
davvero il cambiamento, non testa l'intero oggetto.

**Passo 3-5 — implementazione** (allowlist PATCH, POST, commento su `CAMPI_ELENCO`).

**Passo 6 — Verde:**
```
npx vitest run tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts
```
→ `Test Files  1 passed (1)` · `Tests  3 passed (3)`.

**Suite intera:**
```
npx vitest run
```
→ `Test Files  386 passed | 3 skipped (389)` · `Tests  4507 passed | 19 skipped (4526)`.
Nessuna prova esistente diventata rossa (l'avviso jsdom `Not implemented: navigation to another
Document` è preesistente e non tocca questo file, come già documentato nel referto del compito 2).

**`npx tsc --noEmit`** → nessun output, zero errori.

⚠️ Non ho eseguito `npx next build`: il brief di questo compito (Passo 6) chiede esplicitamente
`vitest` + `tsc`, non i tre comandi di FASE 7 — che secondo `ua-app/CLAUDE.md` §0C valgono «a fine
ondata», e questo è il compito 3 di 9. Lo segnalo qui invece di deciderlo di mia iniziativa in
silenzio.

## Prova del VINCOLO (R-P1) — non solo il caso felice

La terza `it()` del brief verifica che l'allowlist **rifiuti** tre campi che non devono essere
scrivibili dal browser: `portale_token`, `laboratorio_id`, `id`. Era già verde prima del mio
cambiamento (l'allowlist non li conteneva né prima né dopo) — l'ho eseguita comunque e confermo
che resta verde dopo l'aggiunta di `cellulare_whatsapp`, cioè l'aggiunta del campo nuovo non ha
allargato l'allowlist oltre quanto richiesto.

## File cambiati

- `src/app/api/clienti/[id]/route.ts` — `cellulare_whatsapp` aggiunto a `PATCHABLE_FIELDS_CLIENTE`.
- `src/app/api/clienti/route.ts` — `cellulare_whatsapp` aggiunto all'insert del POST; commento
  esteso su `CAMPI_ELENCO` (nessun campo aggiunto all'array).
- `tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts` — nuovo, 3 prove.

## Autorevisione

- **Completezza:** entrambe le liste trattate. La ragione della seconda è scritta **nel codice**
  (non solo qui nel referto), nello stesso stile del commento già esistente su `portale_token`.
- **Qualità:** il commento su `CAMPI_ELENCO` spiega il perché (rumore su una schermata di ricerca)
  e dice dove tornare («questa riga è il punto da cambiare» se un giorno servisse mostrare anche
  il cellulare nell'elenco).
- **Disciplina (YAGNI):** non ho toccato `ClienteEditSheet.tsx` né `NuovoDentistaSheet.tsx` (righe
  4.1 della spec, compiti successivi — verificato leggendo la spec, non assunto), non ho toccato
  la GET del singolo cliente (già seleziona `cellulare_whatsapp` implicitamente? — verificato: NO,
  la GET singola usa un `select` esplicito che elenca le colonne una per una e **non** contiene
  ancora `cellulare_whatsapp`; ma quel punto non è nel perimetro dei "3 File" dichiarati dal
  brief, quindi lo riferisco sotto invece di correggerlo).
- **Prove:** la terza `it()` è il valore che deve essere rifiutato — non solo il caso felice.

## Ritrovamento fuori mandato (R-E2 — riferito, non corretto)

Leggendo `src/app/api/clienti/[id]/route.ts` per intero (righe 41-77, la `SELECT` della GET del
singolo cliente) ho notato che l'elenco di colonne di quella query **non include
`cellulare_whatsapp`** — quindi la scheda del cliente, se legge da questa rotta, oggi non riceve
il cellulare WhatsApp dal backend. Il brief di questo compito 3 non nomina questo file/blocco fra
i «File» da modificare (righe 20-23 del brief elencano solo `[id]/route.ts:16-23` per
`PATCHABLE_FIELDS_CLIENTE`, non la `SELECT` della GET), e non l'ho toccato. Segnalo perché
potrebbe essere il compito di un altro brief della serie (probabilmente quello legato a
`ClienteEditSheet.tsx`, che deve leggere il valore da qualche parte) — non ho verificato tutti
gli altri 8 brief per confermarlo, a differenza di quanto fatto nel referto del compito 2.

## Dubbi

Nessuno bloccante. Un solo punto degno di nota, già gestito sopra: ho scelto di non eseguire
`next build` perché il brief del compito lo esclude esplicitamente e la regola generale del
progetto lo riserva alla fine dell'ondata — lo dichiaro qui per trasparenza, non l'ho deciso in
silenzio.
