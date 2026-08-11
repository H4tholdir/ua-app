# Task 10c — margini di tempo su due prove instabili in CI

## Perimetro

Due file, nessuna asserzione toccata, nessun retry aggiunto:
- `tests/integration/avvisi-dentista-schema.rpc.test.ts` — prova (p7)
- `tests/unit/DevoIntervenire.test.tsx` — prova «dopo una riemissione riuscita, un secondo intervento registra un evento NUOVO»

## (p7) — margine di rete, non di logica

La prova fa ~36 chiamate `has_column_privilege` in sequenza (2 ruoli × 12 colonne, più 12 per `anon`), ognuna un giro verso il catalogo Postgres remoto. Morta per timeout due volte, entrambe appena sopra il default 5000ms (5007ms concorrente, 5006ms senza concorrenza — il secondo run esclude che sia contesa di CPU: è margine di rete insufficiente).

Aggiunto un timeout esplicito per-prova, `}, 15000)`, con commento che cita i due run rossi e il ragionamento (rete, non logica). Nessun'altra prova del file aveva un timeout esplicito da cui copiare una "convenzione locale"; ho usato la forma numerica-terzo-argomento già in uso nella suite più ampia (`tests/unit/salvataggio-archivio-paginazione.test.ts`, `tests/unit/documenti-data-roma.test.ts`).

`provato:` run reale contro il banco (`.env.local` caricato) — 27/27 verdi, p7 impiega **2374ms** in locale (file completo 19,1s). 15000ms dà oltre 6× il tempo misurato e oltre 3× i due quasi-rossi di CI.

## DevoIntervenire — margine di render sotto carico, non un difetto vero

Il punto che scadeva: `await waitFor(() => expect(refreshMock).toHaveBeenCalled())` dopo `fireEvent.keyDown(window, { key: 'Escape' })` — usa il default testing-library di 1000ms. Fallita in CI il 10/08 con «expected "vi.fn()" to be called at least once» a 1600ms.

**Verifica che non fosse un difetto vero (prima di toccare il timeout):** ho tracciato `ricomincia()` in `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx:577-589` — chiama `router.refresh()` solo `if (daRinfrescare)`. Il rischio era che `setDaRinfrescare(true)` (in `accogliEvento`, riga 724) arrivasse DOPO l'Escape, rendendo il refresh permanentemente saltato — nessun timeout avrebbe potuto salvare quel caso.
Tracciando `correggiERifai()` (righe 738-810): `accogliEvento(evento)` (riga 754) viene chiamato SUBITO dopo che la prima fetch (`/eventi-qualita`) risolve, e PRIMA — senza nessun `await` in mezzo — di iniziare la seconda fetch (`/dichiarazione/riemetti`, riga 766), che è esattamente quella che il primo `waitFor` della prova (riga 1240) aspetta di vedere registrata dallo spy. Quindi per costruzione JS, quando il primo `waitFor` si risolve, `setDaRinfrescare(true)` è già stato dispatchato — il resto è solo il tempo che React impiega a flushare il render sotto una macchina satura. È la stessa classe di flake già diagnosticata in `tests/setup.ts` (motion/rAF sotto contesa multi-worker).

Aggiunto: timeout esplicito `{ timeout: 5000 }` su quel singolo `waitFor` (5× il default, stessa convenzione già in uso in `tests/unit/linguetta-cassette.test.tsx:76`), e — come conseguenza necessaria, non perché fosse lui a fallire — il timeout della prova intera alzato a `}, 15000)` (il tetto di 5000ms altrimenti diventerebbe il nuovo collo di bottiglia sommando i quattro `waitFor` della prova).

`provato:` `npx vitest run tests/unit/DevoIntervenire.test.tsx` → 80/80 verdi, la prova toccata impiega 335ms in locale.

## Verifica

- `npx tsc --noEmit` → nessun errore
- `npx vitest run tests/unit/DevoIntervenire.test.tsx` → 80/80 verdi
- `npx vitest run tests/integration/avvisi-dentista-schema.rpc.test.ts` (con `.env.local` caricato) → 27/27 verdi

Nessun `next build` (nessun file di produzione toccato).

## Riserve

Un run verde in locale non è prova contro un flake da carico: la prova vera arriva dal prossimo CI verde su entrambi i file. Se dovesse ripresentarsi anche coi nuovi margini, il sospetto si sposta da "margine" a "difetto vero" e va riaperto come tale.
