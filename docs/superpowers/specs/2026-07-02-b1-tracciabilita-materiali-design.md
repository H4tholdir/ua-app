# B1 — Tracciabilità MDR Materiali/Lotti — Design

**Data:** 2 luglio 2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` → B1 (Blocker)
**Autori:** Francesco Formicola + Claude

---

## 1. Problema

Ogni Dichiarazione di Conformità (DdC) generata oggi ha la sezione "Materiali / Lotti" sempre vuota. Rischio concreto rispetto all'Allegato XIII MDR 2017/745 (tracciabilità/recall per lotto).

### Causa radice (verificata sul codice, non solo sullo schema)

Esistono **due tabelle parallele e scollegate** per il consumo materiali:

- **`lavori_materiali`** — tabella progettata correttamente per MDR (`lotto_id`, `numero_lotto_snapshot`, `nome_materiale_snapshot`, `produttore_snapshot`, RLS con `public.current_lab_id()` corretta, trigger `aggiorna_scorta_lotto` che decrementa sia `lotti_magazzino.quantita_residua` sia `magazzino.scorta_attuale`). È la tabella letta da **tutti** i punti di consumo: `DdcTemplate.tsx`, `generate-ifu.ts`, `generate-etichetta.ts`, `generate-ricevuta-consegna.ts`, XML fattura, pagine lavoro/consegna. **Nessun codice ci scrive mai un INSERT.**
- **`scarichi_magazzino`** — tabella aggiunta dopo (migration `20260520_bom_materiali_ordini.sql`) per l'auto-scarico BOM in `orchestrate.ts` Step 8 (fire-and-forget, dopo la consegna). Ha una colonna `lotto_numero` commentata "obbligatorio MDR Allegato XIII" ma **mai valorizzata**: l'insert scala solo lo stock aggregato dell'articolo (`decrementa_scorta` RPC), senza mai scegliere un lotto specifico.

**Aggravante temporale:** anche scrivendo in `lavori_materiali`, farlo nello Step 8 (dopo consegna) non risolverebbe nulla — lo Step 1 di `orchestraConsegna` carica `lavoro` (con `materiali:lavori_materiali(*)`) e lo Step 3 genera **subito dopo** la DdC da quell'oggetto, quindi *prima* che Step 8 esista. Il fix deve spostare la scrittura **prima** della generazione DdC, non lasciarla dov'è oggi.

**Gap secondario:** `lavori_materiali` non ha mai avuto una `CREATE TABLE` in `supabase/migrations/` — esiste solo nel dump `supabase/schema.sql` (probabilmente creata a mano via Supabase MCP/dashboard). Qualsiasi ambiente ricostruito da zero (fresh DB, seed E2E) non la troverebbe.

---

## 2. Decisioni architetturali (confermate con Francesco)

| Decisione | Scelta |
|---|---|
| Fonte di verità materiali/lotti | **`lavori_materiali`** (coerente con schema e con tutti i punti di lettura). `scarichi_magazzino` smette di essere il percorso di scrittura per l'auto-scarico BOM. |
| Criterio scelta lotto | **FEFO** (First-Expired-First-Out: scadenza più vicina prima), spareggio FIFO (data acquisto più vecchia) |
| Materiale/BOM senza lotto disponibile | **Blocco soft**: la consegna procede comunque, il lavoro viene flaggato "tracciabilità incompleta" da sanare a posteriori |
| Lavorazione senza BOM definita in `listino_materiali_auto` | **Stesso flag** del caso lotto-assente (default raccomandato, nessuna obiezione ricevuta) — altrimenti B1 risulterebbe "chiuso" su lavori la cui DdC resta comunque vuota |

---

## 3. Architettura della soluzione

### 3.1 Migrazione DB

Nuovo file `supabase/migrations/20260702_b1_tracciabilita_materiali.sql`:

1. `CREATE TABLE IF NOT EXISTS lavori_materiali (...)` — cattura la definizione esistente (già live in `supabase/schema.sql`) dentro le migration tracciate, RLS con `public.current_lab_id()`, trigger `aggiorna_scorta_lotto` incluso. Idempotente: non rompe la produzione dove la tabella esiste già.
2. Fix trigger `aggiorna_scorta_lotto`: aggiungere guardia `GREATEST(0, quantita_residua - NEW.quantita_usata)` sul decremento di `lotti_magazzino.quantita_residua` (oggi può andare negativo, a differenza di `decrementa_scorta` su `magazzino` che ha già la guardia).
3. Nuove colonne su `lavori`:
   - `tracciabilita_materiali_ok BOOLEAN NOT NULL DEFAULT true`
   - `materiali_incompleti_dettaglio JSONB NULL` — array di oggetti `{ magazzino_id, nome_materiale, motivo }`, `motivo` ∈ `'lotto_assente' | 'bom_mancante'`

Dopo la migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` + `npx tsc --noEmit` (FASE 6b obbligatoria).

### 3.2 Nuovo Step 2.5 in `orchestrate.ts` — "Traccia materiali"

Posizionato **dopo lo Step 2 (precheck MDR)** e **prima dello Step 3 (genera DdC)**. Sostituisce integralmente il vecchio Step 8 (che va rimosso: niente più insert in `scarichi_magazzino` né chiamata a `decrementa_scorta` per questo flusso — la decrementazione ora arriva dal trigger su `lavori_materiali`).

Logica, per ogni `lavorazione` del lavoro con `listino_id`:

1. **Idempotenza**: se `lavoro.materiali` (già caricato allo Step 1) contiene già righe per il `magazzino_id` risultante dalla BOM di questa lavorazione, salta — evita doppio insert/doppio decremento su un retry di consegna (il lock di Step 0 copre la concorrenza, non i retry falliti-e-ripetuti dopo `rilasciaLock()`).
2. Carica BOM da `listino_materiali_auto` per `listino_id`. **Se non esiste alcuna riga BOM** → aggiungi `{ motivo: 'bom_mancante' }` a `materiali_incompleti_dettaglio`, continua con la lavorazione successiva.
3. Se la BOM esiste, per ogni riga BOM (un `magazzino_id` + quantità necessaria = `quantita_per_unita * quantita_lavorazione`):
   - Query `lotti_magazzino` per quel `magazzino_id`, `laboratorio_id`, `attivo = true`, `quantita_residua > 0`, ordinati `data_scadenza ASC NULLS LAST, data_acquisto ASC`.
   - Consuma i lotti in ordine finché la quantità richiesta è coperta o i lotti finiscono (split su più lotti se necessario) — un INSERT in `lavori_materiali` per ogni lotto usato, con `numero_lotto_snapshot`/`nome_materiale_snapshot`/`produttore_snapshot` copiati dal lotto/articolo al momento dell'uso.
   - Se la quantità residua richiesta non è coperta (lotti insufficienti o assenti) → aggiungi `{ motivo: 'lotto_assente' }` per il residuo mancante a `materiali_incompleti_dettaglio`.
4. Errori DB imprevisti in un singolo step (es. errore di rete) → catturati, loggati, trattati come riga flaggata (`lotto_assente`) — **non bloccano mai la consegna**, coerente con "soft-block".

Al termine del loop su tutte le lavorazioni:

- `UPDATE lavori SET tracciabilita_materiali_ok = <nessun elemento flaggato>, materiali_incompleti_dettaglio = <array o null>`
- **Ricarica `lavoro.materiali`** (nuova query su `lavori_materiali` per `lavoro_id`) e riassegna all'oggetto `lavoro` in memoria, così lo Step 3 (`generateDdC(lavoro)`) vede davvero i materiali appena tracciati.

### 3.3 UI minima

Su `/lavori/[id]`: se `tracciabilita_materiali_ok === false`, banner di warning (riuso pattern/badge esistenti del Design System v2.3 — nessuna nuova pagina, nessun mockup richiesto per questa iterazione) con il conteggio degli item mancanti. Azione di remediation (es. "aggiungi lotto" da qui) è **fuori scope** per questo fix — item futuro nel backlog.

---

## 4. Testing

- **Unit — risoluzione FEFO**: singolo lotto sufficiente; split su più lotti; lotto parzialmente insufficiente (flag su residuo); nessun lotto (flag completo); nessuna BOM (flag `bom_mancante`).
- **Unit — idempotenza**: seconda chiamata dello Step 2.5 su un lavoro che ha già righe in `lavori_materiali` per un dato `magazzino_id` non duplica insert né decrementa due volte.
- **Integrazione — `orchestraConsegna`**: un lavoro con BOM e lotti disponibili produce una DdC il cui `materiali_json`/rendering include davvero nome materiale + numero lotto + produttore (verifica end-to-end della causa radice, non solo che la tabella abbia righe).
- **Regressione**: `npx tsc --noEmit`, `npx vitest run`, `npx next build` (FASE 7).

---

## 5. Fuori scope (item successivi, non bloccanti per la chiusura di B1)

- UI di remediation per sanare un lavoro flaggato (assegnare un lotto a posteriori).
- Strategia diversa da FEFO/FIFO (es. scelta manuale del tecnico).
- Deprecazione/rimozione fisica della tabella `scarichi_magazzino` (resta per storico, smette solo di ricevere nuove scritture da questo flusso).
