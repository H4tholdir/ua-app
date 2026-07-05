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

> **⚠️ Revisione post-implementazione (Task 5):** la tecnica descritta qui sotto sostituisce quella originariamente proposta (`.overrideTypes<T,{merge:false}>()` per-query su `getServiceClient()` non tipizzato). Verificato con `tsc` reale durante l'implementazione: `.overrideTypes()` chiamato dopo `.single()` su un client senza generic `<Database>` **non compila** — l'errore è strutturale (`IsValidResultOverride` in `@supabase/postgrest-js` vede ancora `Result` come array perché senza schema `.single()` non lo restringe a livello di tipo), non un problema di sintassi. Tecnica corretta, validata con probe dirette su tutti i pattern di query usati dagli 8 file (select completo, select parziale, join, assegnazione a prop tipizzata di un template): vedi sotto.

**Tecnica corretta — cast del client, non della query:**

Nuovo file `src/lib/pdf/typed-service-client.ts`:

```typescript
import 'server-only'
import { getServiceClient } from '@/lib/supabase/server-service'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// getServiceClient() non porta il generic <Database> (fix strutturale del
// client condiviso, usato da 147 file, esplicitamente fuori scope — vedi
// sotto). Questo cast locale rende tipizzate sullo schema reale le query
// nei generatori PDF, senza toccare il client condiviso: .select('*') e i
// join restituiscono i tipi veri delle colonne invece di un `any` implicito.
export function getTypedServiceClient(): SupabaseClient<Database> {
  return getServiceClient() as SupabaseClient<Database>
}
```

Ogni generatore sostituisce `getServiceClient()` con `getTypedServiceClient()`. Da quel momento, ogni query in quel file — `select('*')`, select parziale, join annidati — è tipizzata automaticamente sullo schema DB reale (`database.types.ts`), **senza bisogno di `.overrideTypes()` per ogni query**: `tsc` cattura anche typo sui nomi di colonna (verificato con una query deliberatamente scorretta durante il probe).

**Cast puntuale residuo, dove serve:** alcune colonne enum-like (es. `laboratori.piano`, `clienti.listino_numero`) sono tipizzate nello schema generato come `string`/`number` generico, mentre `domain.ts` le restringe a union letterali (`'freemium'|'solo'|'lab'|'studio'`, `1|2|3|4`) per un type-checking più stretto nel resto dell'app. Quando il risultato di una query deve soddisfare un'interfaccia di dominio (`Laboratorio`, `Cliente`) — perché passato a una funzione o a una prop di template tipizzata così — serve un singolo cast esplicito e commentato sul valore letto, non sulla query: `const lab = labRaw as Laboratorio`. Questo NON è un `as any`: è un'asserzione a un tipo applicativo specifico, verificata da `tsc` per la piena struttura (campi mancanti/di troppo continuano a essere segnalati), limitata al gap noto e documentato (enum widening), e non elimina il beneficio del client tipizzato sulla query stessa (typo sulle colonne restano intercettati, verificato).

| File | Query | Fix |
|---|---|---|
| `generate-ddc.ts` | `laboratori.single()` | `getTypedServiceClient()` + `const lab = labRaw as Laboratorio` |
| `generate-ddc.ts` | `lavoro.paziente as any` (riga 45) | **eliminato** — `LavoroDettaglio.paziente: Paziente\|null` include già `nome_cognome`/`codice_paziente`, cast era superfluo |
| `generate-ddc.ts` | `(lab as any).testo_rischi_default` (riga 63) | rimosso dopo aggiunta campo a `Laboratorio` in `domain.ts` (il campo esiste già nello schema reale, quindi anche senza questa aggiunta il client tipizzato lo avrebbe esposto — l'aggiunta a `domain.ts` resta corretta e utile per il cast puntuale `as Laboratorio`) |
| `generate-dpa.ts` | `laboratori.single()` / `clienti.single()` | `getTypedServiceClient()` + `as Laboratorio`/`as Cliente` |
| `generate-buono.ts` | `laboratori.single()` | idem |
| `generate-etichetta.ts` (2 funzioni) | `laboratori.single()` | idem |
| `generate-nomina-prrc.ts` | `laboratori.single()` | idem |
| `generate-ricevuta-consegna.ts` | `laboratori.single()` | idem |
| `generate-cedolino-tecnico.ts` | `laboratori`/`tecnici` (select parziali) | `getTypedServiceClient()` — select parziale su client tipizzato produce già il tipo ristretto corretto (`Pick<...>` implicito), nessun cast aggiuntivo necessario (nessun campo enum-like tra quelli selezionati) |

**Aggiunta a `domain.ts`:** campo mancante `testo_rischi_default: string | null;` nell'interfaccia `Laboratorio` (esiste nel DB, `database.types.ts:1930`, ma mai propagato al tipo applicativo).

**Esplicitamente FUORI scope (non toccare):** i cast `lavoro as unknown as LavoroDettaglio` già presenti in `generate-etichetta.ts`/`generate-ricevuta-consegna.ts`/`generate-ifu.ts`. Non sono `as any` (non fanno parte degli 11 di B4) e le stringhe `.select()` in quei file non includono il campo `laboratorio` richiesto da `LavoroDettaglio` — un cast diretto a `LavoroDettaglio` asserebbe una forma che la query non produce realmente. Restano invariati anche con `getTypedServiceClient()` (il client tipizzato rende `lavoro` più precisamente tipizzato prima del cast, ma il cast stesso — già una doppia asserzione via `unknown` — non viene toccato). Stesso discorso per il cast `RawRow` in `generate-cedolino-tecnico.ts`.

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
- `src/lib/pdf/typed-service-client.ts` (nuovo)
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
