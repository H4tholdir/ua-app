# Task 1 — Report

Il wizard manda la trascrizione e lo stato dello sgancio (client, no UI)
Ondata B, sessione ③. Ramo: `ondata-b-sessione-3`.

## Cosa è stato implementato

1. **`src/components/features/wizard/WizardNuovoLavoro.tsx`**
   - Nuovo tipo esportato `ColoreOrigine = 'prescrizione' | 'lab'` — UNA SOLA CASA,
     riusato sia da `StatoWizard.coloreOrigine` sia dall'input di `creaLavoroDaWizard`.
   - `StatoWizard.coloreOrigine?: ColoreOrigine` (opzionale).
   - `STATO_INIZIALE.coloreOrigine = 'prescrizione'` (valore esplicito, comportamento
     identico ad "assente" per `undefined !== 'lab'`).
   - I DUE punti di enumerazione manuale delle chiavi (fatto 3 del censimento) aggiornati:
     l'effect di `salvaStato` (persistenza abbandono 24h) e `riprendi` (ripristino da
     localStorage) ora portano `coloreOrigine`.
   - `continuaPaziente` (dentro `CorpoWizard`) passa `coloreOrigine: stato.coloreOrigine`
     a `creaLavoroDaWizard` — è il punto reale che "manda" il dato, non solo la capacità
     di riceverlo.

2. **`src/lib/wizard/persistenza.ts`**
   - `StatoSalvato.coloreOrigine?: StatoWizard['coloreOrigine']` (opzionale, DRY via
     indicizzazione del tipo sorgente — stesso pattern già in uso per `passo`/`cliente`).
   - `v` NON cambiato (campo additivo, salvataggi `v: 1` esistenti restano validi).

3. **`src/lib/wizard/crea-lavoro.ts`**
   - `creaLavoroDaWizard`: nuovo parametro opzionale `coloreOrigine?: ColoreOrigine`.
   - Nel body del POST `/api/lavori`, la chiave `prescrizione` si aggiunge SOLO quando
     `coloreOrigine !== 'lab' && colore.trim() !== ''`, con contenuto `{ colore }` dove
     `colore` è la variabile GREZZA (come digitata, non `coloreCodice` normalizzato) —
     fedeltà D210, verificata leggendo `src/lib/prescrizione/componi-snapshot.ts` (il
     server non fa mai trim/uppercase su `prescrizione.colore`).
   - `numero_prescrizione` NON introdotto: il wizard non ha oggi una casella per questo,
     e la chiave resta fuori dal payload (nessuna invenzione).
   - `colore_codice` (dato di caso) invariato: continua a viaggiare quando `coloreCodice`
     non è vuoto, IN ENTRAMBI gli esiti dello sgancio (verificato coi test).

## Verifica della gate server (R-P2, prima di scrivere il body)

Letto `src/app/api/lavori/route.ts:211-245` e `src/lib/prescrizione/componi-snapshot.ts`
per intero PRIMA di scrivere il payload:
- il gate accetta `prescrizione.colore` come qualunque stringa (solo `typeof === 'string'`,
  nessun trim/regex/length cap) → un valore con spazi (`' a3 '`) NON produce 422;
- il server stesso preserva il colore byte a byte, incluso "solo spazi" (differenza
  deliberata dal gate client: qui "solo spazi" è trattato come vuoto PRIMA di mandare la
  chiave — il server non vede mai questo caso specifico da questo client, la sua
  tolleranza più ampia serve ad altri chiamanti).
- Nessun difetto di piano trovato: il gate D216 è coerente con quanto il brief chiedeva.

## Le forme d'input enumerate (R-P4)

| # | Forma | Copertura |
|---|-------|-----------|
| 1 | `coloreOrigine` assente + colore compilato | ✅ caso: prescrizione trascritta grezza (`' a3 '`), `colore_codice` normalizzato (`'A3'`) |
| 2 | `coloreOrigine: 'prescrizione'` esplicito + colore compilato | ✅ caso: stesso esito dell'assente |
| 3 | `coloreOrigine: 'lab'` + colore compilato | ✅ caso: NESSUNA `prescrizione`, `colore_codice` viaggia comunque |
| 4 | colore vuoto (`''`) | ✅ caso: nessuna `prescrizione`, nessun `colore_codice` (M-T5-4) |
| 5 | colore solo spazi (`'   '`) | ✅ caso: vuoto dopo trim, stesso esito del 4 |
| 6 | colore fuori catalogo (`'zz9'`) | ✅ caso: trascritto comunque grezzo, `colore_codice` normalizzato parte lo stesso (il client non giudica il catalogo) |

File: `tests/unit/crea-lavoro-prescrizione.test.ts` (nuovo, 6 test — copre il glob
`tests/unit/crea-lavoro*` richiesto dal brief).

## TDD Evidence

### RED

Comando:
```
npx vitest run tests/unit/crea-lavoro-prescrizione.test.ts
```
Output (con l'abbozzo inerte — parametro `coloreOrigine` accettato dalla firma ma MAI
letto nel body):
```
 ❯ tests/unit/crea-lavoro-prescrizione.test.ts (6 tests | 3 failed) 7ms
     × coloreOrigine ASSENTE + colore compilato → ...
     × coloreOrigine:'prescrizione' esplicito + colore compilato → ...
     × colore FUORI CATALOGO → trascritto comunque ...
 Test Files  1 failed (1)
      Tests  3 failed | 3 passed (6)
```

### Conteggio R-P4 (a livello di singola asserzione, non di test)

vitest ferma un test al primo `expect` che fallisce, quindi il conteggio per-test (3/6)
sottostima quante asserzioni erano davvero "accese". Ho rieseguito la stessa suite con
`expect.soft` (temporaneo, file scartato dopo la misura) per vedere OGNI asserzione senza
interrompere al primo rosso:
```
AssertionError: expected undefined to deeply equal { colore: ' a3 ' }
AssertionError: expected undefined to deeply equal { colore: 'A2' }
AssertionError: expected undefined to deeply equal { colore: 'zz9' }
 Tests  3 failed | 3 passed (6)
```
Su 12 asserzioni totali (2 per test × 6 test) sono comparsi SOLO 3 `AssertionError` — le
tre `expect(corpo.prescrizione).toEqual(...)` dei casi 1/2/6. Tutte le altre 9 (i due
`not.toHaveProperty` dei casi 3/4/5, più il controllo `colore_codice` nei casi 1/2/6, mai
toccato dall'abbozzo inerte) erano già vere prima di scrivere una riga di logica —
prevedibile: l'abbozzo non aggiunge mai `prescrizione`, quindi ogni asserzione che si
aspetta la sua ASSENZA era già soddisfatta, e `colore_codice` non cambia comportamento in
questo task.

**Conteggio: 3 su 12** (corretto dal controllore su rilievo del revisore: la convenzione R-P4 conta le asserzioni che si ACCENDONO di rosso sull'abbozzo inerte — erano 3; le altre 9 erano già verdi) asserzioni accese all'abbozzo inerte — solo le tre che verificano
la PRESENZA/contenuto di `prescrizione` erano davvero rosse.

### GREEN

Comando:
```
npx vitest run tests/unit/crea-lavoro-prescrizione.test.ts
```
Output:
```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

## Verifica dei sei `toEqual` esistenti (fatto 15)

Censiti tutti i `toEqual` "per intero" (payload o esito, non singole proprietà) in
`tests/unit/crea-lavoro.test.ts` e `tests/unit/crea-lavoro-denti.test.ts`:

| Riga | Cosa confronta | Colpito dal payload nuovo? |
|------|-----------------|------------------------------|
| crea-lavoro.test.ts:90 | `esito` (paziente nuovo, colore vuoto) | No — `esito` non contiene `prescrizione` (è un campo del BODY in uscita, non della risposta) |
| crea-lavoro.test.ts:105-110 | body POST `/api/pazienti` (colore vuoto) | No — endpoint diverso, e in questo test `colore: ''` |
| crea-lavoro.test.ts:116-123 | body POST `/api/lavori` (colore vuoto) | No — `colore: ''`, nessuna chiave nuova ad aggiungersi |
| crea-lavoro.test.ts:144-149 | body POST `/api/pazienti` (alias, colore vuoto) | No — endpoint diverso |
| crea-lavoro.test.ts:526 | `esito` (409 codice occupato) | No — bloccante prima del POST lavori, `esito` non cambia forma |
| crea-lavoro-denti.test.ts (vari `.denti`/`not.toHaveProperty`) | proprietà singole, non l'intero body | No — non sono full-object |

**Esito empirico**: `npx vitest run tests/unit/crea-lavoro.test.ts tests/unit/crea-lavoro-denti.test.ts`
→ **62/62 verdi, ZERO modifiche necessarie**. Nessuno dei sei è caduto: tutti i casi che
userebbero un body POST /api/lavori con colore non-vuoto verificano PROPRIETÀ SINGOLE
(`.colore_codice`, `.denti`, `not.toHaveProperty`), mai l'intero oggetto — quindi
l'aggiunta della chiave `prescrizione` (una chiave IN PIÙ) non li tocca. Non ho indebolito
nessun `toEqual` per farli passare: sono rimasti letterali, invariati.

## Guardia sulla trappola nota (fatto 3 — enumerazione manuale delle chiavi)

Aggiunto un test in `tests/unit/WizardNuovoLavoro.test.tsx`:
`"coloreOrigine sopravvive al giro Riprendi → un vero avanzamento → salvaStato (trappola nota, fatto 3)"`.

Seed di uno stato salvato con `coloreOrigine: 'lab'` → click «Riprendi» → click «Indietro»
(un avanzamento reale, nessuna UI nuova serve) → verifica che il valore sia ancora `'lab'`
nel localStorage riscritto.

**Verifica che il test morda davvero (non solo che sia verde)**: ho rimosso a turno
`coloreOrigine: statoSalvato.coloreOrigine` da `riprendi` e `coloreOrigine: stato.coloreOrigine`
dall'effect di `salvaStato`, rieseguendo il test isolato in entrambi i casi — **fallisce in
entrambi** (`expected "lab", received undefined`), poi ripristinato e riverificato verde.
Un singolo test copre entrambe le metà della trappola.

## Comandi di verifica finale

```
npx vitest run tests/unit/crea-lavoro.test.ts tests/unit/crea-lavoro-denti.test.ts \
  tests/unit/crea-lavoro-prescrizione.test.ts tests/unit/wizard-persistenza.test.ts \
  tests/unit/WizardNuovoLavoro.test.tsx tests/unit/PassoPaziente.test.tsx
→ 6 file, 117 test, tutti verdi

npx tsc --noEmit
→ 0 errori

npx vitest run   (suite intera)
→ 398 file passati, 3 skip preesistenti; 4575 test passati, 19 skip preesistenti
```

## File toccati

- `src/components/features/wizard/WizardNuovoLavoro.tsx`
- `src/lib/wizard/crea-lavoro.ts`
- `src/lib/wizard/persistenza.ts`
- `tests/unit/WizardNuovoLavoro.test.tsx` (1 test nuovo)
- `tests/unit/crea-lavoro-prescrizione.test.ts` (nuovo, 6 test)

## Self-review

- **Completezza rispetto al brief**: tipo nuovo, campo su `StatoWizard`/`STATO_INIZIALE`,
  i due punti di enumerazione manuale, `StatoSalvato`, firma e body di `creaLavoroDaWizard`
  — tutti i punti elencati nei "fatti verificati dal censimento" sono toccati.
- **YAGNI**: nessuna UI aggiunta (Task 2), nessun campo `numero_prescrizione` inventato,
  nessuna scala colore, nessun default diverso da quanto richiesto.
- **`v` di persistenza**: non toccato (verificato: campo opzionale, salvataggi vecchi restano validi).
- **Qualità test**: nessun `toEqual` indebolito; il test di persistenza è stato verificato
  a rovescio (rotto apposta due volte, in RED su entrambe le rotture).

## Dubbio riferito (fuori mandato, R-E2) — nessuna discrepanza col brief, ma un'osservazione

Ho letto per intero il gate server (`route.ts:211-245`, `componi-snapshot.ts`) prima di
scrivere il payload, come richiesto da R-P2: il contratto combacia esattamente con quanto
il brief descriveva, nessuna discrepanza da segnalare.

⚠️ **Osservazione per chi tocca questo canale dopo (Task 2, o chi aggiunge
`numero_prescrizione`):** client e server giudicano diversamente il colore "solo spazi".
Questo task lo tratta come VUOTO (gate client, trim-based — M-T5-4, per scelta del brief),
mentre `componi-snapshot.ts:11` lo preserva DELIBERATAMENTE come trascrizione legittima
("«solo spazi» invece si preserva: giudicarlo vuoto richiederebbe il trim"). Nessuna delle
due letture è sbagliata — sono scritte per contesti diversi — ma oggi NESSUN client esercita
mai il ramo server che preserva gli spazi, perché il gate di questo file non manda mai quella
chiave in quel caso. Chi cambia il gate client in futuro deve sapere che il server è già
pronto a un comportamento diverso.

Un punto NON un difetto ma degno di nota per chi farà il Task 2 (framing/UI): oggi
`STATO_INIZIALE.coloreOrigine` è `'prescrizione'` esplicito — la UI del Task 2 dovrà
scrivere `'lab'` quando l'operatore sgancia, usando `cambiaPaziente({ coloreOrigine: 'lab' })`
(il canale già esistente, `Partial<StatoWizard>`), nessun canale nuovo necessario.
