# Contabilità Clienti — Design (sotto-progetto 1 di 3)

**Data:** 2 luglio 2026
**Origine:** indagine sul blocker B2 (`docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`, riga 112) — Dashboard e Scadenzario davano numeri opposti sui crediti clienti.

## Contesto e causa di B2

Indagine sul codice reale + verifica sul DB live (`iagibumwjstnveqpjbwq`) ha confermato:

- `lavori_partitario` (tabella creata in `002_fase2_schema.sql:266-287`) non ha mai avuto un writer applicativo. **0 righe anche in produzione** (verificato con query diretta).
- Tre punti del codice calcolano il "credito/insoluto" leggendo questa tabella sempre vuota (`residuo = prezzo - SUM(pagamenti) = prezzo pieno` sempre):
  - `supabase/migrations/008_dashboard_extended_kpi.sql:39-61` (KPI cache Dashboard Titolare)
  - `src/lib/dashboard/queries.ts:231-273` (`getPagamentiScadutiTop`, usata anche da `admin/labs/[id]/live/page.tsx:78`)
  - `src/lib/dashboard/queries.ts:612-654` (widget insoluti Front Desk)
- Lo Scadenzario (`src/app/api/scadenzario/route.ts:33-56`) legge invece correttamente `fatture.pagata` (marcato manualmente, nessuna riconciliazione bancaria).
- Esiste già nello schema una VIEW `partitario_clienti` (`ANALISI/23_ua_database_schema.md:2742-2766`, `supabase/schema.sql:2540-2543`) con logica simile allo Scadenzario, ma **mai interrogata da nessun codice applicativo**.

## Riscoperta del problema come feature di business

Durante la discussione, il problema si è rivelato più ampio di un semplice bug: nel modello di business reale, non tutti i lavori completati diventano automaticamente una fattura 1:1 — è il dottore/cliente a decidere, lavoro per lavoro, se va fatturato oppure no. I lavori non fatturati devono comunque entrare in una contabilità che tracci se e come sono stati saldati (per intero o parzialmente, con quale metodo).

Questo ha portato a scomporre il lavoro in **3 sotto-progetti indipendenti**:

1. **Contabilità clienti / ledger pagamenti** (questo documento) — risolve B2 alla radice
2. **Preventivo** — nuovo documento/stato prima della produzione (fuori scope qui)
3. **Riepilogo multicanale** — genera un documento per cliente, lo invia per stampa/email/portale/WhatsApp, raccoglie la scelta fatturare sì/no del dottore (fuori scope qui — questo documento costruisce solo l'infrastruttura dati/UI su cui si appoggerà)

## Decisioni architetturali

### 1. Ledger pagamenti polimorfico (non due sistemi paralleli)

La fatturazione in UÀ è già **batch**: una fattura può coprire più lavori insieme (`src/app/api/fatture/batch/route.ts`). Un ledger sempre-per-lavoro romperebbe questo modello; un ledger separato per fatture e uno per lavori diretti duplicherebbe la logica di pagamento parziale in due posti.

Soluzione: un'unica tabella `pagamenti` con riferimento polimorfico — ogni pagamento è agganciato **o** a una fattura **o** a un lavoro diretto, mai a entrambi. `fatture.pagata` diventa un campo derivato (ricalcolato via trigger), non più impostato manualmente.

### 2. Decisione fatturazione come feature completa, non placeholder

Non esiste oggi alcun flag "fatturare sì/no" per lavoro. Per questo sotto-progetto si introduce `lavori.decisione_fatturazione` (`in_attesa` / `fatturare` / `non_fatturare`) con un controllo manuale in UI (titolare/front-desk) — trattato come funzionalità reale e completa, non uno stub. Il sotto-progetto 3 la estenderà con raccolta automatica multicanale, scrivendo sullo stesso campo.

### 3. Correzioni: soft-delete + modifica-come-sostituzione (mai cancellazione fisica)

Coerente con il pattern già usato nel progetto per altre entità (clienti, listino, magazzino: soft-delete). Un pagamento non viene mai rimosso fisicamente:
- **Cancellare** → `stato: annullato` (con `motivo_annullamento`, chi, quando) — sparisce dai saldi correnti, resta consultabile nello storico
- **Modificare** → annulla il vecchio pagamento e ne crea uno nuovo con `sostituisce_pagamento_id` che punta al precedente. Solo l'ultimo della catena è "attivo" e conta nel saldo. Il nuovo pagamento creato dalla sostituzione segue la stessa validazione di un pagamento nuovo (può anch'esso generare un'eccedenza se l'importo corretto supera il dovuto).

### 4. Credito cliente (eccedenze e rimborsi)

Se un pagamento supera il dovuto, l'eccedenza diventa credito disponibile del cliente, utilizzabile in due modi: applicato a un dovuto futuro, oppure rimborsato fisicamente (con la propria registrazione tracciata, stessa logica di audit).

### 5. Numeri distinti, mai fusi (per non ricreare l'ambiguità di B2)

- **Credito confermato**: fatture emesse non saldate + lavori `non_fatturare` non saldati sul ledger diretto
- **Credito potenziale**: lavori `in_attesa` di decisione (prezzo pieno, provvisorio — per scelta esplicita del titolare, questi contano già come dovuto stimato)
- **Totale dovuto complessivo**: confermato + potenziale, mostrato come numero di sintesi accanto alla scomposizione
- **Credito disponibile**: saldo a favore del cliente

Il "credito potenziale" **non** entra nello Scadenzario (non è ancora un dovuto su cui sollecitare un pagamento), ma entra nel calcolo del "totale dovuto complessivo".

## Modello dati

### `lavori` (nuova colonna)
```sql
decisione_fatturazione TEXT NOT NULL DEFAULT 'in_attesa'
  CHECK (decisione_fatturazione IN ('in_attesa', 'fatturare', 'non_fatturare'))
```
Immutabile una volta che `incluso_in_fattura = true` (coerente col vincolo esistente in `lavori/[id]/route.ts:113`).

### `pagamenti` (nuova tabella)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
laboratorio_id UUID NOT NULL REFERENCES laboratori(id)
fattura_id UUID REFERENCES fatture(id)
lavoro_id UUID REFERENCES lavori(id)
importo NUMERIC(10,2) NOT NULL CHECK (importo > 0)
metodo TEXT NOT NULL CHECK (metodo IN ('contanti','bonifico','pos','assegno','altro'))
metodo_nota TEXT
data_pagamento DATE NOT NULL
stato TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo','annullato'))
motivo_annullamento TEXT
sostituisce_pagamento_id UUID REFERENCES pagamenti(id)
registrato_da UUID NOT NULL REFERENCES auth.users(id)
annullato_da UUID REFERENCES auth.users(id)
annullato_at TIMESTAMPTZ
created_at TIMESTAMPTZ NOT NULL DEFAULT now()

CHECK (
  (fattura_id IS NOT NULL AND lavoro_id IS NULL) OR
  (fattura_id IS NULL AND lavoro_id IS NOT NULL)
)
```
RLS scoped su `public.current_lab_id()`, ruoli `titolare` + `front_desk` per insert/update.

### `credito_clienti_movimenti` (nuova tabella)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
laboratorio_id UUID NOT NULL REFERENCES laboratori(id)
cliente_id UUID NOT NULL REFERENCES clienti(id)
tipo TEXT NOT NULL CHECK (tipo IN ('eccedenza','applicazione','rimborso'))
importo NUMERIC(10,2) NOT NULL CHECK (importo > 0)
pagamento_id UUID REFERENCES pagamenti(id)
metodo TEXT CHECK (metodo IN ('contanti','bonifico','pos','assegno','altro'))
metodo_nota TEXT
note TEXT
registrato_da UUID NOT NULL REFERENCES auth.users(id)
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```
Saldo cliente = `SUM(eccedenza) - SUM(applicazione) - SUM(rimborso)`, sempre ≥ 0 (verificato in applicazione, non a livello DB).

### `fatture` (colonne esistenti, semantica cambiata)
- `pagata` — resta, ma diventa derivata: trigger su `pagamenti` la ricalcola (`SUM(pagamenti attivi collegati) >= importo`)
- `importo_pagato` (nuova colonna) — somma pagamenti attivi collegati, per mostrare i parziali

### Migration: `lavori_partitario`
Drop della tabella (0 righe, nessun writer, RLS orfana).

### Migration: backfill storico
Per ogni fattura con `pagata = true` esistente prima di questa feature, crea un pagamento retroattivo (`metodo: 'altro'`, `metodo_nota: 'migrazione storica pre-contabilità-clienti'`, importo pieno) — così il ledger diventa fonte di verità anche per il pregresso, non solo da questo punto in poi.

## Flusso operativo / API

- `PATCH /api/lavori/[id]/decisione-fatturazione` — `{ decisione }`, solo su `pronto`/`consegnato`, bloccato se `incluso_in_fattura = true`
- `POST /api/pagamenti` — `{ fattura_id | lavoro_id, importo, metodo, metodo_nota?, data_pagamento }`. Eccedenza → genera automaticamente movimento `eccedenza`
- `PATCH /api/pagamenti/[id]` — modifica-come-sostituzione. Fallisce con 409 se il pagamento non è più `attivo` (controllo di concorrenza ottimistica)
- `DELETE /api/pagamenti/[id]` — soft-delete, richiede `motivo_annullamento`
- `POST /api/clienti/[id]/credito/applica` — usa credito disponibile su un dovuto specifico
- `POST /api/clienti/[id]/credito/rimborsa` — registra un rimborso

Tutti gli endpoint: ruoli `titolare`/`front_desk`, allowlist esplicita, RLS `current_lab_id()`.

## Fix di B2 — query unificata

Nuova funzione/query "credito cliente" (confermato / potenziale / disponibile / totale), che sostituisce la lettura di `lavori_partitario` in:
1. `008_dashboard_extended_kpi.sql:39-61`
2. `queries.ts:231-273` (`getPagamentiScadutiTop`, propaga il fix anche a `admin/labs/[id]/live`)
3. `queries.ts:612-654` (widget Front Desk)

**Scadenzario ampliato**: `scadenzario/route.ts` include ora anche i lavori `non_fatturare` non saldati, in un'unica lista ordinabile per urgenza, ciascuna riga taggata con l'origine ("Fattura" / "Lavoro diretto"). Il "credito potenziale" non entra in questa lista.

## UI — "Contabilità cliente" (evoluzione di `EstrattoContoView`)

`EstrattoContoView.tsx` (1075 righe, oggi raggiunta da `/scadenzario/[cliente_id]`) evolve nella vista completa, invece di creare una pagina parallela — evita di frammentare la navigazione tra "dove guardo per un cliente".

I sotto-componenti già presenti nel file (`FatturaCard`, `KpiBar`, `TabellaFatture`, `ClienteInfoCard`) vengono estratti in file separati (il file è già sovradimensionato — miglioria mirata mentre lo si tocca comunque, non un refactor a sé).

**Struttura pagina:**
- KPI bar: Totale dovuto complessivo, Credito confermato, Credito potenziale, Credito disponibile
- Lista unificata dovuti (fatture + lavori diretti, badge di origine, stato saldo, azioni registra/modifica/annulla pagamento)
- Sezione lavori in attesa di decisione (sola lettura + toggle manuale fatturare/non_fatturare)
- Sezione credito disponibile (se > 0): azioni applica / rimborsa

3 viewport obbligatori (390/768/1280px), light/dark, animazioni da `src/design-system/motion.ts`.

## Edge case

- **Race condition su modifica pagamento**: controllo di concorrenza ottimistica, 409 se il pagamento non è più `attivo`
- **Storno importo fattura già pagata**: il trigger di ricalcolo genera automaticamente un'eccedenza per la differenza, mai un residuo negativo silenzioso
- **Lavoro annullato con pagamenti già registrati**: pagamenti storicizzati, importo incassato confluisce in credito cliente
- **Rifacimento** (`crea_rifacimento_atomico`, da B1): il lavoro sostitutivo ha una propria `decisione_fatturazione` indipendente, nessuna logica speciale
- **Cliente archiviato con saldo pendente**: la pagina Contabilità resta raggiungibile in lettura finché il saldo non è a zero

## Piano di test (TDD, prima del codice)

**Unit:** calcolo saldo (parziale/saldato/eccedenza/annullato), catena di sostituzione, query credito cliente su fixture con tutte le combinazioni di stato.

**DB/migration:** vincolo CHECK polimorfico, trigger ricalcolo `fatture.pagata`/`importo_pagato`, RLS cross-tenant.

**API/integration:** eccedenza→credito automatico, blocco decisione su stati non validi, ruoli non autorizzati (`tecnico`) respinti.

**Regressione:** Dashboard, Scadenzario, widget Front Desk e `admin/labs/[id]/live` devono mostrare lo stesso numero coerente sullo stesso cliente di test — il sintomo originale di B2.

## Fuori scope (rimandato ai sotto-progetti 2 e 3)

- Preventivo (documento/stato pre-produzione)
- Generazione riepilogo cliente stampabile/email/WhatsApp/portale
- Raccolta automatica della scelta fatturare sì/no dal dottore (per ora resta manuale, titolare/front-desk)
