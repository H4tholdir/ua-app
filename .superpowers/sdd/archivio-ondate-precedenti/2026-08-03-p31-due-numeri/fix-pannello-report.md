# Fix — il tasto «Salva modifiche» del pannello Pazienti resta sempre raggiungibile

Branch: `ondata-nome-cognome-paziente`
File toccati (solo questi due, come da vincolo): `src/components/features/pazienti/PazienteEditSheet.tsx`, `tests/unit/PazienteEditSheet.test.tsx`

## Il difetto

Il pannello «Modifica paziente» aveva:
- backdrop e foglio entrambi a `zIndex: 40` / `zIndex: 50` — la barra di navigazione (anch'essa a `zIndex: 50`) vinceva per ordine di disegno, coprendo il foglio su mobile.
- un unico contenitore `overflowY: 'auto', maxHeight: '85vh'` che avvolgeva TUTTO — intestazione, campi e tasto «Salva modifiche» — quindi il tasto scendeva insieme al contenuto quando le due caselle nuove (Cognome, Nome) allungavano il modulo. A 1280×800 il tasto finiva sotto il bordo dello schermo.

## La correzione

Portata la struttura di `ClienteEditSheet.tsx` (stessa famiglia di componente, stesso sistema grafico v2.3) in `PazienteEditSheet.tsx`:
- backdrop `zIndex: 80`, foglio `zIndex: 81` — sopra la barra di navigazione.
- foglio `maxHeight: '92dvh'`, `display:'flex'`, `flexDirection:'column'`.
- tre sezioni **fratelli** dentro il foglio, non più annidate:
  1. intestazione fissa (`flexShrink:0`): drag handle + titolo «Modifica paziente»;
  2. corpo scorrevole (`overflowY:'auto', flex:1`): i sei blocchi campo (otto input/select/textarea in totale: codice paziente, cognome, nome, sesso, data nascita, ASL, anamnesi, note) — **invariati** uno per uno, stessi `id`/`htmlFor`, stessi `value`/`onChange`, stesso placeholder;
  3. piede fisso (`flexShrink:0`): messaggio d'errore (`role="alert"`, stesso testo, stessa logica `errore &&`) + tasto «Salva modifiche» (stesso `onClick={handleSave}`, stesso `disabled={saving}`, stesso testo «Salvataggio...» / «Salva modifiche»).

Nessuna riga di `handleSave`, dello stato del form, del pre-riempimento (`cognomeEffettivo`) o del messaggio d'errore è stata toccata: solo la disposizione JSX e gli stili di layout (zIndex, maxHeight, display/flex, padding). Verificato via `git diff` più sotto: l'unica logica cambiata è puramente di stile/struttura.

**Scelta motivata (diversa dal modello):** in `ClienteEditSheet.tsx` il messaggio d'errore vive dentro il corpo scorrevole. Qui l'ho messo nel piede fisso, sopra il tasto — se finisse in fondo al corpo scorrevole, dopo un salvataggio fallito l'utente lo vedrebbe solo scorrendo, lo stesso tipo di difetto silenzioso che il fix ALTO 2 (già in questo file) esiste per evitare. Il test «🟠 ALTO 2» resta verde in entrambe le collocazioni; ho scelto quella che non nasconde l'errore.

## Verifica — comandi e output reali

### 1. Baseline, PRIMA di qualsiasi modifica

```
$ npx vitest run tests/unit/PazienteEditSheet.test.tsx

 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  15:21:03
   Duration  908ms (transform 45ms, setup 113ms, import 100ms, tests 249ms, environment 356ms)
```

### 2. Dopo la correzione della struttura (prima di aggiungere il test nuovo)

```
$ npx vitest run tests/unit/PazienteEditSheet.test.tsx

 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  15:24:01
   Duration  906ms (transform 45ms, setup 112ms, import 98ms, tests 252ms, environment 354ms)
```

I 4 test preesistenti restano verdi senza essere stati modificati: comportamento invariato.

### 3. Test nuovo aggiunto, eseguito sulla struttura corretta

```
$ npx vitest run tests/unit/PazienteEditSheet.test.tsx

 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  15:24:18
   Duration  924ms (transform 47ms, setup 112ms, import 101ms, tests 274ms, environment 349ms)
```

### 4. Prova RED — il test nuovo deve fallire sulla struttura vecchia

Metodo: invece di un revert completo, ho ricostruito puntualmente il difetto — spostato temporaneamente il blocco «messaggio d'errore + tasto Salva» DENTRO il contenitore `overflowY:'auto'` che avvolge i campi (esattamente la topologia di prima: il tasto discendente del corpo che scorre). Equivalente, per ciò che il test verifica (antenato con `overflow-y:auto` sì/no), a un revert totale del file.

```
$ npx vitest run tests/unit/PazienteEditSheet.test.tsx

 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 ❯ tests/unit/PazienteEditSheet.test.tsx (5 tests | 1 failed) 276ms
     × 🔴 il tasto «Salva modifiche» non è mai dentro un contenitore che scorre — resta raggiungibile senza scroll 22ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/PazienteEditSheet.test.tsx > PazienteEditSheet — correzione di nome e cognome (D9 parte paziente, G4) > 🔴 il tasto «Salva modifiche» non è mai dentro un contenitore che scorre — resta raggiungibile senza scroll
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/unit/PazienteEditSheet.test.tsx:89:34
     87|       ancestor = ancestor.parentElement
     88|     }
     89|     expect(hasScrollingAncestor).toBe(false)
       |                                  ^
     90|
     91|     // Il test non è vacuo: deve esistere DAVVERO un corpo scorrevole …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
   Start at  15:24:49
   Duration  933ms (transform 47ms, setup 117ms, import 101ms, tests 276ms, environment 352ms)
```

Confermato in rosso sulla causa corretta (`hasScrollingAncestor` vero). Subito dopo, ripristinata la versione corretta da una copia salvata prima della prova (`cp` di backup + `diff` per confermare l'identità byte-per-byte), poi rieseguito:

```
$ npx vitest run tests/unit/PazienteEditSheet.test.tsx

 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  15:24:59
   Duration  907ms (transform 46ms, setup 113ms, import 96ms, tests 269ms, environment 343ms)
```

### 5. Suite intera

```
$ npx vitest run

 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

Not implemented: navigation to another Document

 Test Files  337 passed | 3 skipped (340)
      Tests  3425 passed | 19 skipped (3444)
   Start at  15:25:03
   Duration  69.48s (transform 16.78s, setup 165.65s, import 71.39s, tests 201.31s, environment 507.92s)
```

3425 = 3424 di riferimento (indicati nel task) + 1 (il test nuovo). Nessuna regressione: nessun test preesistente è diventato rosso. La riga `Not implemented: navigation to another Document` è un warning noto di jsdom su `router.refresh()`/navigazione simulata in altri file di test, non correlato a questo fix (compariva già prima, non è nuovo).

### 6. TypeScript

```
$ npx tsc --noEmit
```
Nessun output — zero errori.

### 7. ESLint sulla cartella pazienti

```
$ npx eslint src/components/features/pazienti/
```
Nessun output — zero warning/errori.

### 8. Diff — solo i due file consentiti

```
$ git diff --stat -- src/components/features/pazienti/PazienteEditSheet.tsx tests/unit/PazienteEditSheet.test.tsx
 .../features/pazienti/PazienteEditSheet.tsx        | 289 +++++++++++----------
 tests/unit/PazienteEditSheet.test.tsx              |  40 +++
 2 files changed, 191 insertions(+), 138 deletions(-)

$ git status --short --branch | grep -v '^??'
## ondata-nome-cognome-paziente
 M src/components/features/pazienti/PazienteEditSheet.tsx
 M tests/unit/PazienteEditSheet.test.tsx
```

Nessun altro file toccato (in particolare non `ClienteEditSheet.tsx`, restato invariato — era il modello, non il bersaglio).

## Commit

`fix(pazienti): il tasto Salva del pannello resta sempre raggiungibile`

Hash: `0e7e9caa3e84fbab25c19f4ed22da961ba02555e`

Il pre-commit hook (lint-staged: eslint su `*.{ts,tsx}` + controllo DS compliance) è girato ed è passato senza modifiche aggiuntive: `✅ DS compliance OK (v2.3 legacy + v3)`.

## Dubbi / punti aperti per Francesco

1. **BP-1 (memoria) deliberatamente NON eseguito.** Il task ha vincolato la modifica a due soli file (`PazienteEditSheet.tsx` e il suo test); l'istruzione esplicita del task ha vinto sulla regola generale del repo che chiederebbe di aggiornare `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md` dopo un fix. L'hook di Stop probabilmente lo segnalerà: è consapevole, non un'omissione per dimenticanza.
2. **Le misure in pixel (1280×800 e 390×844) non sono state ri-misurate in un browser reale.** Il fix è verificato a livello di struttura DOM (test automatico: nessun antenato del tasto scorre, il corpo scorrevole esiste davvero e contiene i campi) più i tre controlli richiesti (test, `tsc`, `eslint`). jsdom non rende layout/pixel, e i cinque passi di verifica del task non chiedevano una misura pixel dal vivo — la segnalo per completezza, non l'ho inseguita per restare dentro il perimetro dei due file.
