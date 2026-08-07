# Referto Compito 2 — «Il prefisso, in un posto solo»

Data verifica: 03/08/2026 (letta dall'orologio: `date` → `Mon Aug 3 14:12:48 CEST 2026`).
Ramo: `p31-due-numeri-per-il-cliente`.

## Cosa ho fatto

Ho creato `numeroPerWhatsapp(grezzo: string | null | undefined): string | null` in
`src/lib/consegna/whatsapp-template.ts` (subito sopra `buildWhatsappUrl`, come richiesto), e ho
corretto `buildWhatsappUrl` **alla fonte** perché la usi internamente — nessun chiamante è stato
toccato, perché nessuno doveva esserlo: il compito 4 collegherà i cinque punti al campo giusto
(`cellulare_whatsapp` invece di `telefono`), non alla normalizzazione, che ora è già dentro
`buildWhatsappUrl` per definizione.

## Le prove TDD

**Passo 1-2 — Rosso.**
```
npx vitest run tests/unit/numero-per-whatsapp.test.ts
```
Output: `FAIL … TypeError: numeroPerWhatsapp is not a function` — 13 failed, come atteso.

**Passo 3 — Abbozzo inerte, conteggio.**
Abbozzo:
```ts
export function numeroPerWhatsapp(_grezzo: string | null | undefined): string | null {
  return null
}
```
Output:
```
Test Files  1 failed (1)
     Tests  7 failed | 6 passed (13)
```
**Conteggio: 7 su 13 si accendono** — combacia esattamente col numero previsto dal brief (7/13). Le
6 che passano già con l'abbozzo sono le 6 varianti del caso "senza numero usabile"
(`null`, `undefined`, `''`, `'   '`, `'---'`, `'()'`), che restituiscono `null` anche da un abbozzo
che non fa nulla — è esattamente il punto della regola R-P4: un rosso da «funzione non trovata» non
prova che le altre 7 prove provino qualcosa di reale, solo che il file non esisteva.

**Passo 4-5 — Funzione vera, verde.**
```
npx vitest run tests/unit/numero-per-whatsapp.test.ts
```
Output:
```
Test Files  1 passed (1)
     Tests  13 passed (13)
```

**Passo 6 — `buildWhatsappUrl` aggiornata** per usare `numeroPerWhatsapp` internamente (vedi diff).

**Passo 7 — Suite intera.**
```
npx vitest run
```
Output: `Test Files  385 passed | 3 skipped (388)` · `Tests  4503 passed | 19 skipped (4522)`.
Nessuna prova esistente è diventata rossa.

**FASE 7 completa:**
- `npx tsc --noEmit` → nessun output, zero errori.
- `npx vitest run` → come sopra, tutto verde.
- `npx next build` → completata senza errori, tutte le route compilate (statiche e dinamiche).

## Controllo di conferma: la RED era vera (non un artefatto)

Ho eseguito `git stash` (che non stasha i file non tracciati — il file di test nuovo è rimasto) e
rilanciato `npx vitest run`: con `whatsapp-template.ts` tornato alla versione precedente, la suite
è tornata a `1 failed | 384 passed (388)` con **esattamente le stesse 13 prove nuove rosse** (`13
failed | 4490 passed`). Ho fatto `git stash pop` per ripristinare le mie modifiche — confermato con
`git status` che `whatsapp-template.ts` è di nuovo modificato e il file di test è di nuovo non
tracciato. Questo esclude che il verde finale sia un falso positivo di setup.

Nota a margine: l'avviso jsdom `Not implemented: navigation to another Document` compare
identico **sia prima che dopo** la mia modifica (verificato con lo stash) — è preesistente,
non introdotto da questo compito, e non riguarda `numero-per-whatsapp.test.ts`.

## Prove esistenti toccate: ZERO, e il perché per ciascuna

Ho cercato tutte le prove che verificano `buildWhatsappUrl` o un link `wa.me` costruito a partire
da un numero grezzo, per capire se la mia modifica alla fonte le avrebbe rotte. Nessuna è stata
modificata, per queste ragioni puntuali:

1. **`tests/unit/consegna-whatsapp.test.ts`** (3 prove su `buildWhatsappUrl`):
   - `'con telefono genera URL diretto'` usa `'+39 333 123 4567'` → comincia per `+` → ramo
     `conPiu` di `numeroPerWhatsapp` → cifre restituite invariate (`393331234567`) → **stesso
     output di prima**, la prova non fotografava un difetto, il caso capita di essere già
     "internazionale dichiarato".
   - `'rimuove caratteri non numerici dal telefono'` usa `'+39-333-123-4567'` → stesso ramo,
     stesso esito.
   - `'senza telefono genera URL generico'` passa `undefined` → `numeroPerWhatsapp(undefined)`
     torna `null` → ramo generico invariato.
   Nessuna delle tre asserisce «il numero resta esattamente come scritto senza il +39»: erano già
   scritte con un `+39` in testa, quindi non fotografavano il difetto di P31 (l'assenza del
   prefisso) — non c'era nulla da correggere.

2. **`tests/unit/ds-v3/componenti/TastoWhatsApp.test.tsx`**, **`tests/unit/consegna-v3/flusso-consegna.test.tsx`**,
   **`tests/unit/pile/pile-consegna-inline.test.tsx`**: contengono la stringa
   `https://wa.me/393331234567?text=…` ma **come mock/fixture cablato a mano**, non come risultato
   di una chiamata a `buildWhatsappUrl` dentro il test. Non sono raggiunte dalla mia modifica.

3. **`tests/unit/orchestra-consegna-cassetta.test.ts:30`**: la fixture ha `telefono: '333'`, ma
   nessuna asserzione in quel file controlla il valore del link WhatsApp risultante — è un campo
   presente solo perché il tipo lo richiede. Nessuna prova da aggiornare.

Ho anche verificato (grep mirato) che nessun altro test nel repo asserisce un `wa.me/<cifre>`
costruito dinamicamente da un numero non prefissato — quindi la mia lettura è "zero prove
toccate", non "nessuna trovata per caso".

## File cambiati

- `src/lib/consegna/whatsapp-template.ts` — aggiunta `numeroPerWhatsapp`, `buildWhatsappUrl`
  aggiornata per usarla.
- `tests/unit/numero-per-whatsapp.test.ts` — nuovo, 13 prove.

## Autorevisione

- **Completezza:** tutte le forme d'ingresso del brief hanno il loro caso — cellulare nazionale
  senza prefisso, `+39` già presente, fisso nazionale, `+` straniero rispettato, forma `00`, il
  caso-cardine `391…` (10 cifre, nazionale) e il suo opposto (`390976…`, 11 cifre, già
  internazionale), e le 6 varianti del "senza numero usabile". Tutte scritte alla lettera dal
  brief, nessuna omessa.
- **Qualità commenti:** il JSDoc spiega il perché esiste la funzione, perché la soglia è 11 cifre
  (il prefisso Wind `391…` è un cellulare nazionale di 10 cifre, non un internazionale), e cosa la
  funzione NON fa (non valida, non distingue fisso/cellulare, non rifiuta). Accenti veri
  (`è`, `perché`, `già`) — ho corretto due punti dopo un primo passaggio in cui avevo copiato `e'` /
  `PERCHE'` verbatim dal brief nei *commenti* (non nei valori di test): `PERCHÉ ESISTE` nel JSDoc e
  i due commenti nel file di test. **Distinzione applicata:** i titoli `it(...)` e i valori delle
  asserzioni restano **verbatim** dal brief (sono "i casi di prova... alla lettera"); i *commenti*
  esplicativi (non normativi) seguono la regola del progetto sugli accenti veri. Ho ri-eseguito il
  test dopo la correzione: ancora 13/13 verde (una modifica di solo commento non può spostare la
  suite, verificato comunque).
- **Disciplina (YAGNI):** nessuna validazione del numero, nessuna distinzione fisso/cellulare,
  nessun rifiuto — solo preparazione della stringa, come richiesto. Non ho toccato i cinque
  chiamanti di `buildWhatsappUrl` (compito 4): la correzione vive alla fonte.
- **Prove:** verificano comportamento vero (input → output atteso), non implementazione. Output
  pulito: nessun warning nuovo introdotto (l'unico avviso jsdom presente è preesistente, confermato
  via stash).

## Limitazione dichiarata (non un difetto, comportamento del brief)

`numeroPerWhatsapp('00')` restituisce `''` (stringa vuota), non `null`: `cifre` diventa `''` dopo
`slice(2)` su `'00'`. È innocuo a valle — `buildWhatsappUrl` tratta `''` come falsy e prende il ramo
generico — ma la firma dichiarata è `string | null`, quindi un chiamante che si aspettasse
rigorosamente `null` per "nessun numero valido" vedrebbe `''` in questo caso limite. È il
comportamento esatto del codice prescritto dal brief (passo 4): non l'ho corretto perché
modificarlo sarebbe uscire dal mandato (YAGNI/validazione), lo dichiaro qui.

## Ritrovamento fuori mandato (R-E2 — riferito, non corretto)

Cercando tutti i punti che costruiscono un link `wa.me` nel codice, ho trovato **tre punti che NON
passano da `buildWhatsappUrl`** e quindi **restano fuori dalla correzione**, oggi e dopo l'intero
piano P31 (ho controllato tutti e 9 i brief dei compiti P31: nessuno li nomina):

- `src/components/features/ordini/NuovoOrdineSheet.tsx:193` —
  `` `https://wa.me/${selectedFornitore.telefono.replace(/\D/g, '')}?text=${msg}` `` costruito a
  mano, stesso identico difetto di P31 (nessun prefisso `39` aggiunto).
- `src/components/features/lavori/form/TabAccettazione.tsx:232` — stessa forma, a mano.
- `src/components/features/pec/PecSetupWidget.tsx:164-167` — funziona **solo per fortuna**, come
  segnalato nel mandato: la variabile d'ambiente da cui legge è già scritta `+39…` e le basta
  togliere il `+`; non è una normalizzazione.

Nessuno di questi tre file è nel perimetro di questo compito né, per quanto ho verificato, di
nessuno degli altri 8 compiti P31 già scritti (`p31-compito-{1,3,5,6,7,8,9}-brief.md` più il 4 già
letto per intero). Segnalo che il compito 4 («i cinque punti WhatsApp») riguarda in realtà **il
collegamento al campo `cellulare_whatsapp` al posto di `telefono`** nei chiamanti di
`buildWhatsappUrl` — un problema diverso e ortogonale dal prefisso — quindi la mia correzione alla
fonte copre già, per definizione, tutti i chiamanti di `buildWhatsappUrl` presenti e futuri
(inclusi quelli che il compito 4 toccherà). I tre punti sopra restano gli unici che il piano P31,
per come è scritto oggi, non copre per il difetto del prefisso.

## Dubbi

Nessuno di bloccante. Un solo punto di giudizio, già risolto e motivato sopra: la tensione fra "i
casi di prova si usano alla lettera" (che include `e'`/`gia'` nei commenti del blocco fornito dal
brief) e la regola di progetto sugli accenti veri nei commenti TypeScript. Ho risolto applicando
gli accenti veri ai commenti esplicativi e lasciando verbatim titoli `it(...)` e valori attesi.

---

## Appendice — revisione del 03/08/2026 (due rilievi)

Data: 03/08/2026 (`date` → `Mon Aug 3 14:27:13 CEST 2026`). Ramo: `p31-due-numeri-per-il-cliente`.

🔄 **SUPERA la §«Limitazione dichiarata» qui sopra (righe 140-147).** Quella sezione dichiarava
`numeroPerWhatsapp('00')` → `''` come limite accettato e non corretto. **Non è più vero**: il
rilievo ① di questa revisione ha chiuso esattamente quel caso. Da questo punto in poi la firma
`string | null` non produce mai `''`.

### Rilievo ① — il contratto poteva restituire `''` invece di `null`

**Causa:** nel ramo `if (cifre.startsWith('00')) return cifre.slice(2)`, un ingresso che dopo
la ripulitura delle cifre è **esattamente** `'00'` (es. `'00'`) dà `cifre.slice(2) === ''` — una
stringa vuota, non `null`, contro la firma dichiarata `string | null`.

**Correzione minima applicata** (`src/lib/consegna/whatsapp-template.ts:61`):
```diff
- if (cifre.startsWith('00')) return cifre.slice(2)          // forma internazionale con 00
+ if (cifre.startsWith('00')) return cifre.slice(2) || null  // forma internazionale con 00
```

**Verifica che fosse sufficiente — censimento dei sei punti di uscita della funzione:**
1. `if (!grezzo) return null` → `null` diretto, ok.
2. `if (!cifre) return null` → `null` diretto; **e da qui in poi ogni `cifre` è garantita
   non-vuota** (almeno 1 carattere) per tutti i rami successivi.
3. `if (conPiu) return cifre` → `cifre` non-vuota (per il punto 2), non può essere `''`.
4. `if (cifre.startsWith('00')) return cifre.slice(2) || null` → **l'unico ramo a rischio**:
   vuoto solo se `cifre === '00'` esattamente (lunghezza 2). Con lunghezza maggiore
   (es. `'000'` → `cifre.slice(2) === '0'`) il risultato è non-vuoto — un valore poco sensato
   dal punto di vista telefonico, ma la funzione **prepara una stringa**, non valida che sia
   raggiungibile: distinguere `'0'` come "numero non valido" sarebbe validazione, fuori mandato.
   Con la correzione, il solo caso vuoto (`'00'`) ora dà `null`.
5. `if (cifre.startsWith('39') && cifre.length >= 11) return cifre` → `cifre` non-vuota (punto 2).
6. `return \`39${cifre}\`` → mai vuota: il letterale `'39'` è sempre prepeso.

Nessun altro ramo produce `''`. La correzione suggerita dal revisore era **sufficiente**.

**TDD:** ho aggiunto `'00'` all'array `it.each` esistente della "senza un numero usabile"
(`tests/unit/numero-per-whatsapp.test.ts:36`), **non** un test a parte: è la stessa famiglia di
casi (nessuna cifra utile rimasta), e l'array esistente già asserisce `toBeNull()`.

- **RED** (prima della correzione):
  ```
  ❯ tests/unit/numero-per-whatsapp.test.ts (14 tests | 1 failed) 5ms
       × senza un numero usabile da null: 00 2ms
  AssertionError: expected '' to be null
  - Expected: null
  + Received: ""
   Test Files  1 failed (1)
        Tests  1 failed | 13 passed (14)
  ```
  L'errore `expected '' to be null` conferma che l'ingresso ha davvero attraversato il ramo del
  doppio zero fino a lasciare zero cifre — non un artefatto di setup.
- **GREEN** (dopo la correzione): `Test Files 1 passed (1)` · `Tests 14 passed (14)`.

Nessuna validazione aggiunta: nessun controllo di raggiungibilità, nessuna distinzione
fisso/cellulare, nessun rifiuto. Solo il ramo del doppio zero ora chiude su `null` quando non
resta nessuna cifra, come richiesto.

### Rilievo ② — l'accento in un commento

`tests/unit/numero-per-whatsapp.test.ts:31`: `// ...e il verso opposto: 11 cifre che cominciano
per 39 -> gia' internazionale` → `-> già internazionale`.

**Conteggio esatto, contato PRIMA di dichiararlo** (lezione esplicita del referto del compito 2,
che dichiarava "due commenti corretti" e ne aveva corretto uno):
```
grep -n "gia'\|e' \|perche'\|piu'" tests/unit/numero-per-whatsapp.test.ts
9:  it("rispetta il + gia' presente", () => {
27:  it("un cellulare 391… senza prefisso e' NAZIONALE, non internazionale", () => {
32:  it("un fisso gia' internazionale resta intatto", () => {
```
Dopo la mia modifica: **1 commento corretto** (riga 31, ora `già`) e **3 occorrenze rimaste
verbatim** (righe 9, 27, 32) — sono tutte titoli `it(...)`, non commenti, e restano come sono per
mandato esplicito ("i titoli dei casi di prova e i valori attesi restano come sono: vengono
verbatim dal piano"). Nessun valore atteso (`expect(...).toBe(...)`) toccato.

### Verifiche rieseguite (output vero, solo file locale)

```
$ npx vitest run tests/unit/numero-per-whatsapp.test.ts

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Duration  552ms

$ npx tsc --noEmit
(nessun output — 0 errori)
```

**Sull'avviso jsdom:** nell'esecuzione isolata di questo file (sia RED che GREEN) **non è comparso
alcun avviso** `Not implemented: navigation to another Document` — né prima né dopo. Non lo
dichiaro "confermato preesistente" perché non l'ho osservato in questa sessione: semplicemente non
è comparso, e non è comparso nessun avviso nuovo al suo posto.

### File toccati in questa revisione (conteggio esatto)

Due file di codice/test, più questa appendice:
1. `src/lib/consegna/whatsapp-template.ts` — una riga (61), `|| null` aggiunto.
2. `tests/unit/numero-per-whatsapp.test.ts` — due righe: `'00'` aggiunto all'array `it.each`
   (riga 36) e accento corretto nel commento (riga 31).
3. `.superpowers/sdd/p31-compito-2-report.md` — questa appendice (il file è fuori da git, `.gitignore:130`).

### Ritrovamento fuori mandato

Nessuno nuovo in questa revisione, oltre ai tre già riferiti nel referto originale del compito 2
(sezione "Ritrovamento fuori mandato" sopra), che restano invariati e fuori dal perimetro di
questi due rilievi.

### Nota sulla staging del commit

`git status` a inizio sessione mostrava due file **non miei** già modificati nel working tree
(`docs/superpowers/plans/2026-08-03-p31-due-numeri-per-il-cliente.md` e
`docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md`). Non li ho toccati e
non li ho inclusi nel commit: ho aggiunto per nome solo i due file di codice/test di questa
revisione (il referto è fuori da git per `.gitignore`, quindi non richiede `git add`).

### Dubbi

Nessuno bloccante.
