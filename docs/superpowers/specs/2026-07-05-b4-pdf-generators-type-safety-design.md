# B4 — Eliminazione `as any` nei generatori PDF MDR

**Data:** 05/07/2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B4
**Stato:** Design approvato, in attesa di piano implementativo

## Problema

9 cast `as any` (boundary `createElement`→`renderToBuffer`) in 8 file di `src/lib/pdf/`, più 2 cast di accesso dati in `generate-ddc.ts` (11 totali). A maggio 2026 era già stato segnalato; nel frattempo qualcuno ha aggiunto solo `eslint-disable-next-line` sopra i cast esistenti — il linter tace ma zero type-safety reale è stata introdotta. File coinvolti: `generate-ddc.ts`, `generate-dpa.ts`, `generate-ifu.ts`, `generate-buono.ts`, `generate-etichetta.ts` (2 funzioni), `generate-nomina-prrc.ts`, `generate-ricevuta-consegna.ts`, `generate-cedolino-tecnico.ts`.

## Causa radice (analisi)

Due famiglie di cast, causate da due problemi distinti:

1. **Cast "renderer"** (9 occorrenze): `renderToBuffer` (da `@react-pdf/renderer`) accetta `ReactElement<DocumentProps>`, mentre `createElement(Template, props)` produce `FunctionComponentElement<PropsDelTemplate>`. Le props dei template **sono già tipizzate** (ogni componente ha una `*TemplateProps` interface) — il cast serve solo al confine con `renderToBuffer`, non per mascherare props non tipizzate.
2. **Cast di accesso dati** (2 occorrenze, solo `generate-ddc.ts`): causate da `getServiceClient()` (`src/lib/supabase/server-service.ts`) che crea il client Supabase **senza il generic `<Database>`** — ogni `.select('*')` attraverso quel client ritorna un tipo implicito `any`. Questo problema è condiviso da **147 file** in tutto il progetto (non solo i generatori PDF).

**Decisione esplicita di scope:** non tipizzare `getServiceClient()` con `<Database>` in questa sessione. Toccherebbe un god-node condiviso da 147 file, farebbe quasi certamente emergere nuovi errori `tsc` in file mai toccati da B4, richiederebbe il percorso "Grande" del workflow (fuori scope per una singola voce di backlog stimata 3-4h). Il fix radice resta backlog futuro separato.

## Design

### Parte 1 — Helper centralizzato per il cast "renderer"

Nuovo file `src/lib/pdf/render-document.ts`:

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

// react-pdf tipizza renderToBuffer su ReactElement<DocumentProps>, ma i nostri
// template accettano props applicative (lavoro/lab/...) e rendono un <Document>
// internamente — il cast è inevitabile al confine, isolato qui in un solo punto.
export function renderPdfDocument(element: ReactElement<unknown>): Promise<Buffer> {
  return renderToBuffer(element as unknown as ReactElement<DocumentProps>)
}
```

Ogni generatore sostituisce `renderToBuffer(createElement(X, props) as any)` con `renderPdfDocument(createElement(X, props))`. Le props restano validate da `createElement` contro l'interfaccia tipizzata del template — solo il boundary con `renderToBuffer` è coperto dal cast, ora isolato in un solo file invece che ripetuto 9 volte.

Anche `tests/unit/ddc-pdf-content.test.ts` (unico test PDF esistente) viene aggiornato per usare `renderPdfDocument` invece del suo `as any` locale, per coerenza — stesso principio, nessun cambio di comportamento.

**9 `as any` → 0.**

### Parte 2 — Fix data-access

Uso `.overrideTypes<T, { merge: false }>()` di `@supabase/postgrest-js` (verificato disponibile nella versione installata, `2.105.4`) al posto del deprecato `.returns<T>()` — stessa funzione (override del tipo a compile-time, zero effetto runtime — l'implementazione di entrambi i metodi è `return this`), ma non deprecato.

**Nota di onestà tecnica:** `.overrideTypes<T>()` è un'**asserzione**, non una verifica — sovrascrive il tipo inferito senza alcun controllo a runtime, stessa famiglia del cast che questo backlog item contesta, solo più stretto e verificato dal compilatore ad ogni accesso a campo (se `domain.ts` disallinea dallo schema DB reale, `tsc` non se ne accorge finché non si legge il campo mancante — è già successo una volta in questo design, vedi sotto). Non è l'equivalente di tipizzare `getServiceClient()` con lo schema DB reale (quello sarebbe verificato dal generatore di tipi Supabase). È comunque un miglioramento netto: elimina l'`any` non controllato, rende esplicito *quale* forma ci si aspetta, e si autocorregge nel tempo (campo letto ma mancante nel tipo → errore `tsc` → si aggiunge).

| File | Query | Fix |
|---|---|---|
| `generate-ddc.ts` | `laboratori.single()` | `.overrideTypes<Laboratorio, {merge:false}>()` |
| `generate-ddc.ts` | `lavoro.paziente as any` (righe 45) | **eliminato** — `LavoroDettaglio.paziente: Paziente\|null` include già `nome_cognome`/`codice_paziente`, cast era superfluo |
| `generate-ddc.ts` | `(lab as any).testo_rischi_default` (riga 63) | rimosso dopo aggiunta campo a `Laboratorio` in `domain.ts` |
| `generate-dpa.ts` | `laboratori.single()` / `clienti.single()` | `.overrideTypes<Laboratorio\|Cliente, {merge:false}>()` |
| `generate-buono.ts` | `laboratori.single()` | idem |
| `generate-etichetta.ts` (2 funzioni) | `laboratori.single()` | idem |
| `generate-nomina-prrc.ts` | `laboratori.single()` | idem |
| `generate-ricevuta-consegna.ts` | `laboratori.single()` | idem |
| `generate-cedolino-tecnico.ts` | `laboratori` (select parziale: `nome, ragione_sociale, indirizzo, cap, citta, provincia, codice_itca, prrc_nome`) | `.overrideTypes<Pick<Laboratorio,'nome'\|'ragione_sociale'\|'indirizzo'\|'cap'\|'citta'\|'provincia'\|'codice_itca'\|'prrc_nome'>, {merge:false}>()` |
| `generate-cedolino-tecnico.ts` | `tecnici` (select parziale: `nome, cognome`) | `.overrideTypes<Pick<Tecnico,'nome'\|'cognome'>, {merge:false}>()` |

**Aggiunta a `domain.ts`:** campo mancante `testo_rischi_default: string | null;` nell'interfaccia `Laboratorio` (esiste nel DB, `database.types.ts:1930`, ma mai propagato al tipo applicativo).

**Esplicitamente FUORI scope (non toccare):** i cast `lavoro as unknown as LavoroDettaglio` già presenti in `generate-etichetta.ts`/`generate-ricevuta-consegna.ts`. Non sono `as any` (non fanno parte degli 11 di B4) e le stringhe `.select()` in quei file non includono il campo `laboratorio` richiesto da `LavoroDettaglio` — sostituirli con `.overrideTypes<LavoroDettaglio>()` asserebbe una forma che la query non produce realmente. Stesso discorso per il cast `RawRow` in `generate-cedolino-tecnico.ts`.

**11 `as any` → 0.**

### Parte 3 — Validazione dati mancanti

Analisi dei campi già "mascherati" con `?? ''`/`?? null` in tutti i generatori: `tipo_dispositivo`, `descrizione`, `cliente.nome`/`cognome` sono già `NOT NULL` a livello di dominio (`domain.ts`) — nessun rischio reale, nessuna validazione necessaria. `generate-nomina-prrc.ts` già valida `prrc_nome` (`if (!lab.prrc_nome) throw ...`) — invariato.

**Unico gap reale trovato:** `generate-dpa.ts`. Sia il laboratorio sia il cliente possono avere `partita_iva` E `codice_fiscale` entrambi `null` — un contratto DPA senza alcun identificativo fiscale per una delle parti non ha valore legale, ma oggi verrebbe stampato con campi vuoti senza errore.

```typescript
function validateDpaData(lab: Laboratorio, cliente: Cliente): void {
  if (!lab.partita_iva && !lab.codice_fiscale) {
    throw new Error('DPA: laboratorio privo di Partita IVA e Codice Fiscale')
  }
  if (!cliente.partita_iva && !cliente.codice_fiscale) {
    throw new Error('DPA: cliente privo di Partita IVA e Codice Fiscale')
  }
}
```

Chiamata subito dopo il caricamento di `lab`/`cliente`, prima di costruire l'oggetto `dpa`.

**Esplicitamente FUORI scope (backlog separato, non B4):** `precheck-mdr.ts` verifica la P.IVA del *dentista* prescrivente ma non quella del *laboratorio stesso* — un DdC può quindi ancora generarsi con P.IVA del fabbricante vuota. Gap reale ma di `precheck-mdr.ts`, non dei generatori — non va confuso con la validazione aggiunta qui.

### Parte 4 — Test (TDD)

**Scoperta:** zero test esistono oggi per le funzioni generatrici (`generateDdC`, `generateDpa`, ecc.). L'unico test PDF esistente, `tests/unit/ddc-pdf-content.test.ts`, testa solo il componente `DdcTemplate` con fixture inline — bypassa completamente `generateDdC()` e Supabase.

1. **Fixture condivise:** nuovo file `tests/unit/helpers/pdf-fixtures.ts` con `LAB_FIXTURE`, `LAVORO_FIXTURE`, `CLIENTE_FIXTURE` (estratte da `ddc-pdf-content.test.ts`, che viene aggiornato per importarle invece di definirle inline — comportamento del test invariato).
2. **Test smoke per generatore** (7 file, esclusa `generate-ddc.ts` già coperta a livello template): stesso pattern di mock già in uso nei test delle route (`vi.mock('@/lib/supabase/server-service', ...)` + chain inline stile `tests/unit/helpers/supabase-chain-mock.ts`). Con dati completi, verifica che la funzione non lanci e produca un buffer/URL valido. TDD: prima RED (verifica che il test fallisca rompendo intenzionalmente un campo), poi GREEN.
3. **Test dedicato `validateDpaData`:** RED→GREEN sui 2 casi mancanti (lab senza fiscali, cliente senza fiscali) → throw; almeno un identificativo per parte → passa.
4. Aggiornamento di `ddc-pdf-content.test.ts` per usare le fixture condivise e `renderPdfDocument`.

## File toccati

- `src/lib/pdf/render-document.ts` (nuovo)
- `src/lib/pdf/generate-ddc.ts`, `generate-dpa.ts`, `generate-ifu.ts`, `generate-buono.ts`, `generate-etichetta.ts`, `generate-nomina-prrc.ts`, `generate-ricevuta-consegna.ts`, `generate-cedolino-tecnico.ts`
- `src/types/domain.ts` (campo `testo_rischi_default`)
- `tests/unit/helpers/pdf-fixtures.ts` (nuovo)
- `tests/unit/ddc-pdf-content.test.ts` (aggiornato)
- 7 nuovi file di test (uno per generatore, esclusa ddc)

## Fuori scope (backlog futuro separato)

- Tipizzare `getServiceClient()`/`getServerUserClient()`/`getBrowserClient()` con `<Database>` (root cause reale, 147 file, richiede percorso "Grande" dedicato)
- `precheck-mdr.ts`: aggiungere verifica P.IVA/Codice Fiscale del laboratorio stesso (oggi verifica solo quella del dentista)

## Effort

Stima originale backlog: 3-4h. Stima rivista con infrastruttura test da zero: **5-6h**.
