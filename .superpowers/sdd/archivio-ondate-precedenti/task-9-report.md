# Task 9 — Report: `EtichettaTemplate` — il codice paziente per primo

## Cosa è stato scritto

### File modificati

1. **`src/components/features/pdf/EtichettaTemplate.tsx`**
   - Rimossa `inizialeCognomePaziente` (righe originali 117-125).
   - Aggiunta `export function pazienteEtichetta(lavoro: LavoroDettaglio): string`, corpo
     ricopiato **verbatim** da `codiceGDPR` di `IFUTemplate.tsx:169-184` /
     `RicevutaConsegnaTemplate.tsx:186-199` (le due funzioni sono identiche fra loro — verificato
     per lettura diretta di entrambe, nessuna differenza da segnalare oltre ai commenti).
   - Aggiornato l'unico punto di consumo nel componente: `{inizialeCognomePaziente(lavoro)}` →
     `{pazienteEtichetta(lavoro)}` (riga con `styles.valueBold`, blocco "PAZIENTE").
   - Verificato con `grep -rn "inizialeCognomePaziente" src/ tests/`: nessuna occorrenza residua.

2. **`tests/unit/etichetta-paziente.test.ts`** (nuovo) — contenuto del brief, con **una
   deviazione minima e dichiarata**: i tre literal `paziente: { codice_paziente, nome, cognome }`
   passati alla helper `l()` sono stati annotati `as Paziente` (più l'import di `Paziente` da
   `@/types/domain`). Necessario perché `Paziente` ha ~12 campi obbligatori (`id`,
   `laboratorio_id`, `cliente_id`, `nome_cognome`, …) che i fixture parziali del brief non
   popolano: `tsc --noEmit` falliva con 3× `TS2740 ... is missing the following properties`
   (dettaglio sotto). La riga `const l = (p: Partial<LavoroDettaglio>) => p as LavoroDettaglio`
   del brief è rimasta **esattamente com'era** — l'unica modifica è sui tre literal interni.
   Nessuna asserzione, nessun valore atteso, nessuna struttura di test toccata.

Nessun altro file modificato. `git status --short` prima del commit mostrava solo questi due file
(oltre a cartelle `.claude/skills/*` non tracciate e un ledger in `docs/design/screenshots/`,
preesistenti e non miei).

## Fase RED — output reale

Comando: `npx vitest run tests/unit/etichetta-paziente.test.ts` (test scritto, funzione non
ancora esportata).

```
 ❯ tests/unit/etichetta-paziente.test.ts (4 tests | 4 failed)
   × il CODICE viene per primo, come negli altri due template
   × senza codice: iniziale del nome + cognome (anonimizzazione parziale)
   × senza codice e senza nome/cognome: si ricade sullo snapshot, abbreviato
   × niente di niente → la stessa sentinella degli altri due

TypeError: pazienteEtichetta is not a function
 ❯ tests/unit/etichetta-paziente.test.ts:9:12

 Test Files  1 failed (1)
      Tests  4 failed (4)
```

4 test su 4 falliti, causa confermata: `pazienteEtichetta` non esiste ancora come export.

## Fase GREEN — output reale

Dopo l'implementazione (Step 3), stesso comando:

```
 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  650ms
```

## Prove di mutazione — esito reale

**Mutazione 1** — rimosso il primo controllo (quello sul codice paziente):
```ts
// prima:
if (lavoro.paziente?.codice_paziente) return `PAZ-${lavoro.paziente.codice_paziente}`
if (lavoro.paziente) { ... }
// mutato in:
if (lavoro.paziente) { ... }   // il ramo del codice sparisce
```
Rieseguito `npx vitest run tests/unit/etichetta-paziente.test.ts`:
```
 ❯ tests/unit/etichetta-paziente.test.ts (4 tests | 1 failed)
   × il CODICE viene per primo, come negli altri due template

AssertionError: expected 'G. Bagheria' to be 'PAZ-PZ-0042'
Expected: "PAZ-PZ-0042"
Received: "G. Bagheria"

 Tests  1 failed | 3 passed (4)
```
**Diventa rosso**, esattamente e solo il test "il CODICE viene per primo". Ripristinato subito
dopo il controllo sul codice paziente.

**Mutazione 2** — sentinella finale sostituita con stringa vuota:
```ts
// prima:
return 'N.A. (GDPR)'
// mutato in:
return ''
```
Rieseguito lo stesso comando:
```
 ❯ tests/unit/etichetta-paziente.test.ts (4 tests | 1 failed)
   × niente di niente → la stessa sentinella degli altri due

AssertionError: expected '' to be 'N.A. (GDPR)'
- N.A. (GDPR)
+ (stringa vuota)

 Tests  1 failed | 3 passed (4)
```
**Diventa rosso**, esattamente e solo il test "niente di niente". Ripristinata subito dopo la
sentinella `'N.A. (GDPR)'`.

Nessun buco: entrambe le mutazioni sono state colte dal test dedicato, senza effetti collaterali
sugli altri tre test in nessuno dei due casi. Verificato di nuovo verde a suite intera dopo il
ripristino (vedi sotto).

## `tsc --noEmit`

Prima fase (con i literal del brief senza `as Paziente`):
```
tests/unit/etichetta-paziente.test.ts(11,7): error TS2740: Type '{ codice_paziente: string; nome: string; cognome: string; }' is missing the following properties from type 'Paziente': id, laboratorio_id, cliente_id, nome_cognome, and 9 more.
tests/unit/etichetta-paziente.test.ts(18,7): error TS2740: Type '{ codice_paziente: null; nome: string; cognome: string; }' is missing the following properties from type 'Paziente': id, laboratorio_id, cliente_id, nome_cognome, and 9 more.
tests/unit/etichetta-paziente.test.ts(25,7): error TS2740: Type '{ codice_paziente: null; nome: null; cognome: null; }' is missing the following properties from type 'Paziente': id, laboratorio_id, cliente_id, nome_cognome, and 9 more.
```
Dopo l'aggiunta di `as Paziente` sui tre literal (unica modifica rispetto al brief):
```
$ npx tsc --noEmit
(nessun output — zero errori)
```

## `eslint`

```
$ npx eslint src/components/features/pdf/EtichettaTemplate.tsx tests/unit/etichetta-paziente.test.ts
(nessun output — zero warning/errori)
```

## Suite intera

```
$ npx vitest run
 Test Files  337 passed | 3 skipped (340)
      Tests  3418 passed | 19 skipped (3437)
   Duration  56.11s
```

Riferimento del task: 3414 passati / 19 saltati + i 4 nuovi test di questo task = 3418. Combacia
esattamente — prova più forte del solo grep che nessun altro documento ha cambiato
comportamento.

## Verifica altri consumatori

`grep -rn "inizialeCognomePaziente" src/ tests/` → **nessuna occorrenza** dopo la modifica (era
usata solo internamente da `EtichettaTemplate.tsx`, un'unica chiamata). `IFUTemplate.tsx` e
`RicevutaConsegnaTemplate.tsx` non sono stati toccati e le loro `codiceGDPR` restano intatte
(confermato per lettura diretta, righe 169-184 e 186-199 rispettivamente — identiche a meno di
due righe di commento in più nella versione IFU).

## Autorevisione

- **Perimetro rispettato**: non toccati `IFUTemplate.tsx`, `RicevutaConsegnaTemplate.tsx`, il
  wizard, o le route pazienti. L'unico diff fuori da `EtichettaTemplate.tsx` è il nuovo file di
  test.
- **Deviazione dal brief, dichiarata**: la riga `const l = (p: Partial<LavoroDettaglio>) => p as
  LavoroDettaglio` del brief è rimasta invariata; i tre literal interni `paziente: {...}` sono
  stati annotati `as Paziente` per soddisfare `tsc --noEmit` (il brief stesso richiede zero
  errori come gate prima del commit — le due richieste erano in conflitto, ho risolto a favore
  del gate senza toccare asserzioni o dati di test). Non è una differenza fra IFU e Ricevuta (che
  restano identiche): è un aggiustamento di tipizzazione nel solo file di test nuovo.
  Segnalo comunque esplicitamente per trasparenza, come da istruzione di fermarmi su ogni
  discrepanza.
- **JSDoc**: il commento copiato dal brief cita `RicevutaConsegnaTemplate.tsx:186-193`; la
  funzione lì occupa in realtà 186-199. Riportato verbatim dal brief, non corretto di mia
  iniziativa — segnalato qui.
- **Copertura non estesa**: il ramo "snapshot con una sola parola" (`parts.length === 1` →
  ritorna lo snapshot invariato) non ha un test dedicato. Non l'ho aggiunto: il blocco di test è
  specificato dal brief e ampliarlo sarebbe fuori perimetro.
- **BP-1 (MEMORY.md / ROADMAP-UFFICIALE.md)**: non toccati, in base al vincolo esplicito del
  brief "non toccare nessun altro file" — l'aggiornamento memoria è demandato all'orchestratore
  dell'ondata.
- **Effetto reale sul documento**: confermato che ogni percorso di `pazienteEtichetta` produce
  uguale o meno dato personale rispetto a `inizialeCognomePaziente` (il codice pseudonimizzato
  quando c'è, altrimenti stesso comportamento di iniziale+cognome o snapshot abbreviato).
- Nessun altro dubbio aperto.
