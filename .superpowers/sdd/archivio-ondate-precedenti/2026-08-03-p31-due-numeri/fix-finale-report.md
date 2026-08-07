# Fix finale — riserve della revisione finale (ondata-nome-cognome-paziente)

Data: 27/07/2026

## Cosa è cambiato

### 🔴 CRITICAL — `data_nascita`/`sesso` vuoti facevano fallire l'UPDATE in silenzio

`src/app/api/pazienti/[id]/route.ts` — nel ciclo che applica l'allowlist, aggiunto
`VUOTO_VALE_NULL = new Set(['data_nascita', 'sesso'])`: quando il body manda una
stringa vuota su questi due campi, il valore scritto in `updates` diventa `null`
invece di `''`. Le altre colonne di testo (`note`, `anamnesi`, `asl`) non sono
toccate dalla normalizzazione — restano `''` come prima.

### 🟠 ALTO 1 — il codice paziente normalizzato divergeva fra la regola del nome e la colonna scritta

- `src/app/api/pazienti/[id]/route.ts`: la normalizzazione di `codice_paziente`
  (stringa o `null`) è stata sollevata FUORI dal ramo `if ('nome' in body || 'cognome'
  in body)` in una costante `codiceDalBody`, calcolata una volta sola e usata sia per
  scrivere la colonna `codice_paziente` nel ciclo dell'allowlist, sia per alimentare
  `risolviNomePaziente`/`cognomeEffettivo` nel ramo del nome. Prima, un PATCH che
  toccava SOLO `codice_paziente` (senza nome/cognome) scriveva il valore grezzo
  perché il ramo di normalizzazione non veniva mai eseguito — è il buco che
  l'advisor ha segnalato e che il brief non nominava esplicitamente.
- `src/app/api/pazienti/route.ts` (POST): `insertData.codice_paziente` ora prende
  `codiceGrezzo` (già calcolato sopra per la regola del nome) invece di
  `body.codice_paziente ?? null`.

Verificato (non assunto): il wizard, unico altro chiamante di
`POST /api/pazienti`, non manda mai `data_nascita`/`sesso` nel body (i campi sono
del tutto assenti) — quindi la stessa vulnerabilità sulla stringa vuota non esiste
lì, e il fix CRITICAL non è stato esteso al POST.

### 🟠 ALTO 2 — il pannello nascondeva ogni errore

`src/components/features/pazienti/PazienteEditSheet.tsx` — aggiunto stato
`errore`, azzerato a inizio salvataggio e alla riapertura del pannello. Se la PATCH
fallisce, si legge `(await res.json()).error` (con ripiego a un testo generico se
la lettura del corpo fallisce) e si mostra in un banner (`role="alert"`) sopra il
pulsante di salvataggio, con le stesse variabili colore già in uso nel file
(`--sfc`, `--primary` per il bordo, `--t1` per il testo) — leggibile in entrambi i
temi, nessun colore scritto a mano nuovo.

### 🟢 MINORE — citazioni di riga in `EtichettaTemplate.tsx`

Il commento della funzione `pazienteEtichetta` citava
`IFUTemplate.tsx:169-185` e `RicevutaConsegnaTemplate.tsx:186-193`: entrambi i
riferimenti erano sbagliati. Sostituiti con un riferimento per nome
(«la funzione `codiceGDPR` di IFUTemplate.tsx e di RicevutaConsegnaTemplate.tsx»),
verificato che il nome sia corretto in entrambi i file (`grep -n "codiceGDPR"`).

## Test nuovi (scritti PRIMA della correzione, confermati rossi dall'output reale)

- `tests/unit/api-pazienti-patch.test.ts`:
  - CRITICAL: `data_nascita`/`sesso` vuoti → scritti `null`
  - le colonne di testo restano `''` (controllo di non-regressione sulla scelta di scope)
  - `data_nascita`/`sesso` valorizzati passano invariati
  - ALTO 1: codice non-stringa nel body → stesso valore (`null`) per la regola e per la colonna scritta
- `tests/unit/api-pazienti-post.test.ts`:
  - ALTO 1: stesso schema di test, lato POST
- `tests/unit/PazienteEditSheet.test.tsx`:
  - ALTO 2: PATCH fallita → il pannello resta aperto e mostra il messaggio della route

Output reale PRIMA della correzione (comando: `npx vitest run
tests/unit/api-pazienti-patch.test.ts tests/unit/api-pazienti-post.test.ts
tests/unit/PazienteEditSheet.test.tsx`):

```
Test Files  3 failed (3)
     Tests  4 failed | 36 passed (40)
```

Tutti e 4 i fallimenti erano per ASSERZIONE (`expected '' to be null`, `expected 42
to be null`, elemento atteso non trovato entro il timeout di `findByText`) — mai
per crash.

Dopo la correzione, stessi 5 file (incluso `etichetta-paziente.test.ts` e
`generate-etichetta.test.ts` per il MINORE):

```
Test Files  5 passed (5)
     Tests  45 passed (45)
```

## Prova che le reti nuove servano — mutazioni una alla volta, con `diff` a conferma del ripristino

### Mutazione 1 — tolta la normalizzazione della stringa vuota (`[id]/route.ts`)

Rimosso il controllo `VUOTO_VALE_NULL` dal ciclo dell'allowlist (tornato a
`updates[field] = v`).

```
FAIL tests/unit/api-pazienti-patch.test.ts > ... CRITICAL: 'data_nascita' e 'sesso' vuoti nel body diventano null, non ''
AssertionError: expected '' to be null
Tests  1 failed | 25 passed (26)
```

Fallimento **per asserzione** (non crash). Ripristinato da backup e confermato
`diff` vuoto (`IDENTICAL`) contro la versione corretta.

### Mutazione 2 — riportata la scrittura del codice al valore grezzo (entrambe le route)

`[id]/route.ts`: tolto il ramo dedicato a `codice_paziente` nel ciclo
dell'allowlist (tornato a scrivere `body.codice_paziente` grezzo per quel campo).
`route.ts` (POST): `insertData.codice_paziente` tornato a `body.codice_paziente ??
null`.

```
FAIL tests/unit/api-pazienti-patch.test.ts > ... ALTO 1: ... normalizza IDENTICO ...
AssertionError: expected 42 to be null
FAIL tests/unit/api-pazienti-post.test.ts > ... ALTO 1: ... normalizza IDENTICO ...
AssertionError: expected 42 to be null
Tests  2 failed | 34 passed (36)
```

Entrambi i fallimenti **per asserzione**. Ripristinati da backup, `diff` vuoto su
entrambi i file (`ID ROUTE IDENTICAL`, `POST ROUTE IDENTICAL`).

Nota tecnica sulla mutazione in `[id]/route.ts`: l'edit ha tolto l'intero ramo
`if (field === 'codice_paziente')` del ciclo, quindi quel campo è tornato al
comportamento grezzo di `updates[field] = v` PRIMA ancora della guardia
`VUOTO_VALE_NULL` — la mutazione 1 e la mutazione 2 si sono sovrapposte su quel
singolo campo in quell'edit. Non cambia l'esito: il test CRITICAL non manda
`codice_paziente` nel body quindi è rimasto verde, ed è stato il test ALTO 1 (che
manda `codice_paziente: 42`) a discriminare correttamente la mutazione richiesta.

### Mutazione 3 — rimesso il `catch` vuoto (`PazienteEditSheet.tsx`)

Tornato a `if (!res.ok) throw new Error(...)` seguito da un `catch { /* non-critical
*/ }` senza stato d'errore.

```
FAIL tests/unit/PazienteEditSheet.test.tsx > ... ALTO 2: ... mostra il messaggio della route
TestingLibraryElementError (findByText non trova il testo entro il timeout)
Tests  1 failed | 3 passed (4)
```

Fallimento **per asserzione** (l'elemento atteso non appare — non un crash del
componente). Ripristinato da backup, `diff` vuoto (`IDENTICAL`).

Nessuna delle tre mutazioni è rimasta senza rete: tutte e tre sono diventate rosse,
tutte e tre per asserzione.

## Output reale della verifica finale

```
$ npx vitest run
Test Files  337 passed | 3 skipped (340)
     Tests  3424 passed | 19 skipped (3443)
```

(3418 di riferimento + 6 nuovi = 3424 — coerente.)

```
$ npx tsc --noEmit
(nessun output — zero errori)
```

```
$ npx eslint src/
(nessun output — zero warning/errori)
```

## Fuori scope, segnalato non risolto

- BP-1 (aggiornamento di `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md`)
  non eseguito: il brief vincola le modifiche ai soli file dell'allowlist indicata
  e questi due non ne fanno parte. Segnalato qui perché Francesco decida se
  aggiornarli in una sessione separata.
- Wizard e `nome-paziente-scrittura.ts` non toccati, come richiesto.

## Dubbi

Un punto da segnalare, non un difetto: con la normalizzazione ora unica, un PATCH
che manda `{codice_paziente: 42}` (numero, non stringa) scrive `null` nella
colonna — cioè CANCELLA il codice invece di rifiutare la richiesta con un errore.
È la conseguenza diretta e voluta dell'istruzione del brief («normalizzare una
volta sola e usare quel valore per entrambi gli scopi»), ed è coerente con un
comportamento già accettato altrove (il test esistente riga ~167,
«codice svuotato + nome», tratta lo svuotamento del codice come esito valido, non
come errore). Lo segnalo perché è l'unico punto in cui una richiesta malformata
ora silenziosamente perde un dato invece di scrivere un valore sporco — non l'ho
interpretato come motivo per aggiungere un 422 non richiesto dal brief, ma se
Francesco lo vuole è una modifica piccola e localizzata.

Il resto: nessun altro dubbio aperto. L'ordine di normalizzazione del codice in
`[id]/route.ts` (non esplicitato nel brief originale) è stato risolto sollevandolo
fuori dal ramo nome/cognome: vale ora per OGNI PATCH che tocca `codice_paziente`,
non solo per quelle che toccano anche nome/cognome — la mutazione 2 lo conferma in
entrambe le direzioni (route PATCH e route POST).
