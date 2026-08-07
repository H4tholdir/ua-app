# Referto — Task 2: il «chi» nel codice, il parametro obbligatorio

Ramo: `p7-registro-dpa-cancello-traccia`. Brief: `.superpowers/sdd/task-2-brief.md`.

## 0. Lettura preliminare (BP-0)

`memory/MEMORY.md` supera i 256KB e non è leggibile intero in un colpo; ho letto invece il brief
per intero, il file sorgente `generate-dpa.ts`, la rotta `route.ts`, e i tre file di test coinvolti,
prima di scrivere qualunque cosa. Ho anche letto il diff non commesso di
`docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md` (era già sporco quando sono
arrivato — v. §9 «fuori mandato»).

## 1. Stato di partenza

```
$ git branch --show-current
p7-registro-dpa-cancello-traccia

$ git status --short
 M docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md   ← già presente, non mio

$ npx tsc --noEmit
(nessun output)  EXIT:0
```

## 2. Step 1 — le due prove nuove, scritte PRIMA del codice

T3a aggiunta in coda a `describe('emissione nuova', …)` (dopo l'ultimo test payload, riga ~456).
T3b aggiunta in coda a `describe('riuso dell\'emissione', …)` (dopo l'ultimo test del blocco,
riga ~695) — **non** dove il brief mostra il codice unito, perché `CORRENTE` (la riga viva che T3b
usa) è una `const` dichiarata DENTRO quel secondo `describe` e non è visibile fuori. Mettere
entrambe le prove in un unico punto (ipotesi "in coda al blocco che asserisce sul payload" letta
alla lettera) non avrebbe compilato per T3b.

## 3. Step 2 — farle fallire e CONTARE: qui il piano ha un difetto di ORDINE (difetto #1)

Il brief mette il comando tsc di Step 2 (atteso: 54 errori «Expected 3 arguments, but got 2»)
PRIMA di Step 3 (che cambia la firma). Ho eseguito Step 2 esattamente a quel punto — solo Step 1
fatto, firma ancora a 2 parametri — e il risultato NON è 54:

```
$ npx tsc --noEmit 2>&1 | grep -c "TS2554"
2

$ npx tsc --noEmit 2>&1 | grep "TS2554"
tests/unit/dpa-registro.test.ts(460,50): error TS2554: Expected 2 arguments, but got 3.
tests/unit/dpa-registro.test.ts(714,60): error TS2554: Expected 2 arguments, but got 3.
```

Sono i DUE nuovi test (T3a, T3b) che chiamano già con 3 argomenti una funzione che ancora ne
accetta 2 — l'opposto esatto del messaggio che il brief si aspetta. Il numero **54** («Expected 3
arguments, but got 2», dai 50+3+1 chiamanti VECCHI a 2 argomenti) esiste solo DOPO che la firma è
stata allargata a 3 parametri obbligatori — cioè solo dopo aver fatto (almeno la parte meccanica
di) Step 3.

Ho risolto seguendo il metodo che CLAUDE.md prescrive per R-P4 alla lettera — «dopo il primo
rosso si mette un abbozzo inerte (terzo parametro accettato e ignorato)» — cioè ho allargato SOLO
la firma (`emesso_da: string`, non ancora scritto nel payload), e SOLO A QUEL PUNTO il conteggio
del brief torna esatto:

```
$ npx tsc --noEmit 2>&1 | grep -c "TS2554"
54

$ npx tsc --noEmit 2>&1 | grep "TS2554" | sed -E 's/\([0-9]+,[0-9]+\).*//' | sort | uniq -c
   1 src/app/api/clienti/[id]/dpa/route.ts
  50 tests/unit/dpa-registro.test.ts
   3 tests/unit/generate-dpa.test.ts

$ npx tsc --noEmit 2>&1 | grep "TS2554" | head -3
src/app/api/clienti/[id]/dpa/route.ts(49,31): error TS2554: Expected 3 arguments, but got 2.
tests/unit/dpa-registro.test.ts(341,21): error TS2554: Expected 3 arguments, but got 2.
tests/unit/dpa-registro.test.ts(373,11): error TS2554: Expected 3 arguments, but got 2.
```

**54, ripartizione 50/3/1 e testo del messaggio: tutti confermati — ma solo in questo ordine.**
Il piano dice il numero giusto nel punto sbagliato della sequenza. Non l'ho aggiustato in
silenzio: lo marco qui come difetto (§10, voce ①) perché un esecutore che seguisse Step 2 alla
lettera, PRIMA di Step 3, troverebbe 2 e non 54, e — seguendo la regola «se il conteggio non
torna, fermati e riferisci» — si fermerebbe per un motivo che non è un errore del censimento ma
un errore d'ordine dei passi.

Secondo comando di Step 2, sempre prima di ogni modifica al codice sorgente (solo Step 1 fatto):

```
$ npx vitest run tests/unit/dpa-registro.test.ts -t "T3a"
 FAIL  tests/unit/dpa-registro.test.ts > emissione nuova > ✅ T3a — su un'emissione NUOVA il registro sa dire CHI ha premuto
AssertionError: expected undefined to be 'utente-007'
```

Atteso dal brief: FAIL con `expected undefined to be 'utente-007'`. **Confermato esatto** — a
differenza del comando tsc, questo non dipende dall'ordine: vitest transpila con esbuild e non fa
controllo di tipi, quindi i 3 argomenti passano a runtime anche quando `tsc` li rifiuterebbe.

### Conteggio delle asserzioni con l'abbozzo inerte (R-P4) — **1 su 5**

Con la firma allargata a 3 parametri e il terzo IGNORATO (non scritto nel payload):

```
$ npx vitest run tests/unit/dpa-registro.test.ts -t "T3a|T3b"
 ❯ dpa-registro.test.ts (56 tests | 1 failed | 54 skipped)
     × ✅ T3a — su un'emissione NUOVA il registro sa dire CHI ha premuto
AssertionError: expected undefined to be 'utente-007'
 ❯ tests/unit/dpa-registro.test.ts:466:28
      expect(riga.emesso_da).toBe('utente-007')
 Tests  1 failed | 1 passed | 54 skipped (56)
```

**N su M = 1 su 5**, ripartizione onesta:
- **1 si accende (rosso)**: `expect(riga.emesso_da).toBe('utente-007')` in T3a — è la sola prova
  che l'abbozzo inerte non soddisfa, ed è la prova che questo task esiste per far diventare verde.
- **1 non viene MAI raggiunta**: `expect(riga.firmato_da).toBeUndefined()`, seconda asserzione di
  T3a — il test aborta alla prima `expect` fallita, quindi questa riga non viene valutata affatto
  in questo giro. Non è "verde": è "non eseguita". Se fosse valutata sarebbe banalmente vera (nulla
  scrive `firmato_da`), ma non è corretto contarla fra le verdi senza dirlo.
- **3 verdi per davvero**, valutate ed evase: tutte e tre le asserzioni di T3b
  (`r.riemessa`, `mockInsert` non chiamato, `mockUpdate` non chiamato). 🔑 **Questo è voluto, non
  un test debole**: T3b è una prova di NON-REGRESSIONE — esiste per restare verde qui e diventare
  rossa SOLO se qualcuno tocca il ramo di riuso per farlo scrivere anche lì "per coerenza".

### Forme d'input enumerate sul terzo parametro (R-P4)

| Forma | Esito | Nota |
|---|---|---|
| id valido | ✅ coperta (T3a) | |
| stringa vuota | ⚠️ non coperta nel mio mandato | **verificato**: `generateDpa('a','b','')` compila senza errori (sonda usa-e-getta, cancellata). `tsc` non distingue una stringa vuota da un id; la chiave esterna la rifiuterebbe solo a runtime — copertura rimandata a Task 3 T5, come dice il brief. |
| `undefined` esplicito | ✅ coperta da `tsc` | **verificato**, e con una correzione al brief: l'errore è **TS2345** («Argument of type 'undefined' is not assignable to parameter of type 'string'»), **non TS2554**. Il brief non specifica il codice errore; lo misuro qui perché la differenza conta se in futuro qualcuno grep-a `TS2554` aspettandosi di trovarla anche qui. |
| id di un utente di un altro laboratorio | ⚠️ non coperta nel mio mandato | il chiamante è sempre e solo la rotta, che passa `context.userId` — un utente di un altro laboratorio non arriva mai a questo punto per costruzione. |
| id inesistente | ⚠️ non coperta nel mio mandato | rimandata a Task 3 T5: deve mordere la chiave esterna `data_processing_agreements_emesso_da_fkey → utenti(id)` (confermata nei tipi generati, v. §5). |

## 4. Step 3 e 4 — firma, payload, chiamante vero

`src/lib/pdf/generate-dpa.ts`: firma allargata a 3 parametri con il commento del brief; `emesso_da`
scritto nel payload dell'INSERT accanto a `emesso_at`. **Il ramo di riuso (righe ~162-171,
invariate nel diff) non è stato toccato** — verificato col diff qui sotto, non solo a parole.

`src/app/api/clienti/[id]/dpa/route.ts`: `generateDpa(labId, clienteId, context.userId)`.
`context.userId` è `string` non opzionale in `LabContext` (`src/lib/supabase/lab-context.ts:12`),
quindi nessun cast o fallback necessario.

```diff
--- a/src/lib/pdf/generate-dpa.ts
+++ b/src/lib/pdf/generate-dpa.ts
@@ -85,7 +85,16 @@
-export async function generateDpa(laboratorio_id: string, cliente_id: string): Promise<EmissioneDpa> {
+export async function generateDpa(
+  laboratorio_id: string,
+  cliente_id: string,
+  /** Chi ha PREMUTO. […] */
+  emesso_da: string,
+): Promise<EmissioneDpa> {
@@ -298,6 +307,7 @@
       payload_sha256: impronta,
       emesso_at: new Date().toISOString(),
+      emesso_da,
     })

--- a/src/app/api/clienti/[id]/dpa/route.ts
+++ b/src/app/api/clienti/[id]/dpa/route.ts
@@ -46,7 +46,7 @@
-      const emissione = await generateDpa(labId, clienteId)
+      const emissione = await generateDpa(labId, clienteId, context.userId)
```

`EmissioneDpa` non toccata — resta a 4 campi (`buffer`, `numero_dpa`, `emissione_id`, `riemessa`),
verificato leggendo l'interfaccia dopo l'edit.

## 5. Interfaccia in ingresso dal Task 1 — verificata, non assunta

```
$ grep -n "emesso_da" src/types/database.types.ts
796:          emesso_da: string | null      (Row)
821:          emesso_da?: string | null      (Insert)
846:          emesso_da?: string | null      (Update)
879:            foreignKeyName: "data_processing_agreements_emesso_da_fkey"
880:            columns: ["emesso_da"]
882:            referencedRelation: "utenti"
883:            referencedColumns: ["id"]
```

Colonna presente nei tre tipi, con FK verso `utenti(id)`. **Nota, non difetto**: a livello di
colonna/tipo è `| null` — nessun `NOT NULL` in banca dati
(`supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql:59` →
`ADD COLUMN IF NOT EXISTS emesso_da UUID REFERENCES public.utenti(id)`, senza `NOT NULL`). Il
vincolo che questo task doveva costruire è **quello applicativo** (il terzo parametro obbligatorio
di TypeScript, «il rumore lo fa tsc» — la stessa frase del commento nel codice), non un vincolo di
schema: coerente con l'assegnazione del Task 2, non un buco.

## 6. Step 5 — i 53 chiamanti vecchi (dpa-registro + generate-dpa) e il difetto #2 su dpa-route

```
$ grep -c "generateDpa('lab-test-001', 'cli-001')" tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts
tests/unit/generate-dpa.test.ts:3
tests/unit/dpa-registro.test.ts:50

$ sed -i '' "s/generateDpa('lab-test-001', 'cli-001')/generateDpa('lab-test-001', 'cli-001', 'utente-007')/g" tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts
$ npx tsc --noEmit 2>&1 | grep -c "TS2554"
0
$ npx tsc --noEmit
(nessun output) EXIT:0
```

53 confermate (50+3), atteso dopo `sed`: 0 — **confermato**.

### Difetto #2 (in-mandato): `dpa-route.test.ts` ha TRE asserzioni da correggere, non una

Il brief (riga 6 e Step 5) dice «**1** + l'asserzione sugli argomenti alla riga **85**». Misurato:

```
$ grep -n "toHaveBeenCalledWith(LAB_ID, CLIENTE_ID)" tests/unit/dpa-route.test.ts
86:    expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID)
271:      expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID)
370:      expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID)
```

**Tre**, non una — e la riga della prima non è 85 (è un commento), è **86**. Ho eseguito la suite
PRIMA di correggere per avere la prova che tutte e tre si rompono davvero, non solo la prima:

```
$ npx vitest run tests/unit/dpa-route.test.ts
 Tests  3 failed | 17 passed (20)
 FAIL … C1 (riga 86)      — expected [...] to be called with […] +"user-1"
 FAIL … B7-bis (riga 271) — stesso esito
 FAIL … B12 (riga 370)    — stesso esito
```

Le tre prove condividono lo stesso `CONTESTO` di base (`userId: 'user-1'`) — B7-bis e B12 fanno
`{ ...CONTESTO, … }` senza mai toccare `userId` — quindi la correzione è identica per tutte e tre:
`toHaveBeenCalledWith(LAB_ID, CLIENTE_ID, CONTESTO.userId)`. Corretta tutte e tre (questo file è
esplicitamente nel mio elenco di file da modificare — non è un R-E2, è un conteggio da rifare
dentro il mio stesso mandato, quindi corretto qui e basta, non solo riferito).

## 7. Step 6 — verde

```
$ npx vitest run tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts tests/unit/dpa-route.test.ts
 Test Files  3 passed (3)
      Tests  79 passed (79)
```

Ripartizione: `dpa-registro.test.ts` 56 (54 originali + T3a + T3b) · `generate-dpa.test.ts` 3
(invariato) · `dpa-route.test.ts` 20 (invariato). **Due prove in più di prima**, come atteso.

## 8. Verifica allargata (FASE 7 del workflow del repo — oltre il perimetro dello Step 6)

```
$ npx tsc --noEmit
(nessun output) EXIT:0

$ npx vitest run
 Test Files  375 passed | 3 skipped (378)
      Tests  4382 passed | 19 skipped (4401)

$ npx next build
… tutte le rotte compilate, incluso ƒ /api/clienti/[id]/dpa
(nessun errore/fail nell'output)

$ npx eslint src/lib/pdf/generate-dpa.ts "src/app/api/clienti/[id]/dpa/route.ts" \
    tests/unit/dpa-registro.test.ts tests/unit/dpa-route.test.ts tests/unit/generate-dpa.test.ts
(nessun output) — pulito
```

`grep` per altri chiamanti di `generateDpa` fuori dai 5 file assegnati → nessuno (solo commenti in
`clienti/[id]/page.tsx` ed `errori-dpa.ts`, non chiamate).

## 9. Difetti trovati fuori mandato (R-E2)

Uno solo, e non è nel codice: `docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md`
risultava **già modificato e non commesso** quando ho iniziato (`git status` iniziale, §1) — è la
correzione del Task 1 al controllo `grep -c "BEGIN;\|COMMIT;"` (documentata nel diff con
«🔄 CORRETTO dopo il Task 1»). Non l'ho toccato né incluso nel mio commit: non è un file della mia
lista, e chiuderlo/committerlo è una decisione che spetta a chi chiude il Task 1 o il piano intero,
non a questo task. Lo segnalo perché un piano con una correzione fatta ma non salvata rischia di
perdersi al primo `git stash`/checkout di un esecutore successivo.

Nessun altro difetto trovato fuori dal perimetro assegnato.

## 10. Riepilogo difetti del piano trovati IN mandato (non corretti in silenzio)

1. **Ordine Step 2/Step 3**: il conteggio "54, Expected 3 arguments, but got 2" del brief è vero
   solo DOPO aver allargato la firma (Step 3, almeno la parte meccanica). Eseguito Step 2 alla
   lettera, prima di Step 3, il risultato reale è **2** errori "Expected 2 arguments, but got 3"
   (i due test nuovi, non i 54 vecchi). Risolto seguendo l'«abbozzo inerte» prescritto da R-P4 in
   CLAUDE.md, che di fatto anticipa la parte di firma di Step 3 — coerente col metodo del progetto,
   ma il brief andrebbe riordinato per chi lo esegua senza questo contesto.
2. **`dpa-route.test.ts`: 3 asserzioni da correggere, non 1** — righe 86, 271, 370 (non 85), tutte
   misurate rosse prima della correzione. In mandato (file assegnato), corrette tutte e tre.
3. Riferimento di riga minore: brief dice "riga 85" per la prima, il file (prima di ogni mia
   modifica) l'aveva a riga **86** — un commento occupa la 85.

## 11. File toccati (esattamente questi 5, nessun altro)

- `src/lib/pdf/generate-dpa.ts`
- `src/app/api/clienti/[id]/dpa/route.ts`
- `tests/unit/dpa-registro.test.ts`
- `tests/unit/generate-dpa.test.ts`
- `tests/unit/dpa-route.test.ts`

`docs/superpowers/plans/…md` **non** incluso (v. §9). Nessun file di scratch/sonda lasciato nel
repo (`scripts/tmp/probe-*.ts` creati e cancellati con `/bin/rm` durante le verifiche riportate
nella tabella di §3, non presenti in `git status` finale).

## 12. BP-1 (memoria/roadmap)

**Non eseguito in questo task deliberatamente**: il mandato di Task 2 fissa l'elenco file a questi
5, e P7 ha altri task dopo questo (Task 3 copre almeno T5, la mordente della chiave esterna). Un
aggiornamento di `memory/MEMORY.md`/`ROADMAP-UFFICIALE.md` a metà piano rischia di essere riscritto
o disallineato quando il piano chiude. Segnalo che BP-1 resta dovuto per l'onda P7 nel suo insieme,
non per questo singolo task.
