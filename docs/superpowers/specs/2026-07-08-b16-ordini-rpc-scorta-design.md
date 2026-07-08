# B16 — Query `/ordini` con subquery non supportata: refactor con RPC dedicata

**Data:** 08/07/2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B16 ("Query `/ordini` con subquery non supportata")
**Stato:** Design approvato da Francesco, in attesa di piano implementativo

## Contesto

`src/app/(app)/ordini/page.tsx:104-125` esegue due query per caricare gli articoli sotto scorta minima:

1. Righe 104-111: `.lt('scorta_attuale', svc.from('magazzino').select('scorta_minima'))` — filtro colonna-contro-colonna, **non supportato da PostgREST/Supabase-js** (PostgREST confronta solo colonna-vs-valore, non colonna-vs-colonna sulla stessa riga). La query viene eseguita comunque, il risultato (`articoliData`) viene scartato esplicitamente (`void articoliData`).
2. Righe 114-125: query di fallback che carica fino a 500 articoli attivi del laboratorio e applica il filtro `scorta_attuale <= scorta_minima` lato JS.

Effetto: una round-trip di rete sprecata a ogni caricamento pagina, e un limite artificiale di 500 articoli oltre il quale il filtro JS-side non vede più tutti gli articoli sotto scorta.

**Scope volutamente limitato a `/ordini`.** Lo stesso pattern "carica tutto e filtra in JS" esiste anche in `magazzino/page.tsx` e `dashboard/queries.ts`, ma lì non c'è la query rotta/sprecata — è una duplicazione di logica, non il bug di B16. Non toccata in questo spec.

**Nota collaterale risolta durante il brainstorming:** è emersa un'incoerenza di soglia — alcuni punti del codebase usavano `scorta_attuale < scorta_minima`, altri `<=`. Decisione presa con Francesco: la soglia corretta è **`<=`** (raggiungere la scorta minima è già motivo di alert). Allineamento già applicato e verificato (712 test passanti, `tsc --noEmit` pulito) in `ordini/page.tsx`, `magazzino/page.tsx`, `MagazzinoSearchList.tsx` — commit separato da questo piano.

## Design

### 1. Migration — nuova funzione RPC

**Scoperta rilevante durante la verifica pre-piano:** esiste già una view `magazzino_sotto_scorta` (`supabase/schema.sql:2455-2482`, commentata "Articoli con scorta attuale <= scorta minima" — corrobora la soglia scelta). **Non è riusabile da `/ordini`:** filtra internamente `WHERE laboratorio_id = public.current_lab_id()`, e `current_lab_id()` legge `auth.uid()` (`schema.sql:17-32`) — sempre `NULL` sotto `getServiceClient()` (nessun JWT utente), quindi zero righe. Inoltre la view non espone `laboratorio_id` in output, quindi non è nemmeno filtrabile manualmente lato client. Confermato "nessun consumer applicativo la usa oggi" dalla migration B19 (`20260704170000_security_hardening_views_invoker.sql`). **Non tocco/non rimuovo questa view** (drift preesistente, fuori scope — un futuro consumer con sessione utente reale potrebbe ancora usarla).

```sql
CREATE OR REPLACE FUNCTION public.articoli_sotto_scorta_minima(p_lab_id uuid)
RETURNS SETOF magazzino
LANGUAGE sql
SET search_path TO 'public'
AS $$
  SELECT *
  FROM magazzino
  WHERE laboratorio_id = p_lab_id
    AND attivo = true
    AND scorta_attuale <= scorta_minima
  ORDER BY nome ASC;
$$;

REVOKE ALL ON FUNCTION public.articoli_sotto_scorta_minima(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.articoli_sotto_scorta_minima(uuid) TO service_role;
```

Note tecniche rispetto alla prima bozza:
- **`RETURNS SETOF magazzino`** invece di `RETURNS TABLE (...)` con tipi dichiarati a mano: i tipi seguono automaticamente la tabella reale (verificati in `schema.sql:633-668` — `scorta_attuale`/`scorta_minima` sono `NUMERIC(12,4) NOT NULL`, non nullable, a differenza di quanto ipotizzato in una prima bozza di questo documento). Evita il rischio di mismatch "structure of query does not match function result type" se lo schema cambia. `ordini/page.tsx` continua a castare il risultato al suo subset `ArticoloSottoScorta` — le colonne extra sono innocue.
- **Nessun `SECURITY DEFINER`**: la funzione è chiamata solo da `service_role` (già bypassa RLS di suo), quindi `SECURITY INVOKER` (default) basta e non riaggiunge superficie DEFINER — B19 ha appena speso 5 commit per *ridurla*. Restano comunque `REVOKE ALL ... FROM PUBLIC, anon, authenticated` + `GRANT ... TO service_role`, stessa convenzione di `CLAUDE.md` §9 e delle funzioni hardenate in B19.
- Filtro solo `attivo = true` (niente `deleted_at IS NULL`): allineato al comportamento attuale di `/ordini` e `magazzino/page.tsx` (nessuno dei due filtra `deleted_at` oggi) — nessuna modifica di comportamento non richiesta.
- Dopo l'apply, eseguire `get_advisors` (MCP Supabase) per confermare che non si reintroduce nessun finding chiuso da B19.

**Nota di rischio:** la migration si applica al progetto Supabase remoto condiviso (linkato, nessuno stack locale) — è additiva e reversibile (`DROP FUNCTION`), ma resta un'azione su stato condiviso: da confermare esplicitamente con Francesco subito prima di eseguire `supabase db push`/`apply_migration`, non solo nel piano scritto.

### 2. `ordini/page.tsx` — sostituzione righe 104-125

Le due query esistenti (quella rotta scartata + il fallback a 500 righe con filtro JS) diventano un'unica chiamata RPC:

```typescript
const { data: articoliSottoScortaData } = await svc
  .rpc('articoli_sotto_scorta_minima', { p_lab_id: labId })

articoliSottoScorta = (articoliSottoScortaData ?? []) as ArticoloSottoScorta[]
```

Rimossi: il blocco `.lt(...)` rotto, la query di fallback `tuttiArticoli`, il commento esplicativo `// La query sopra non funziona...`, e il filtro JS `.filter((a) => a.scorta_attuale <= a.scorta_minima)`.

Risultato: una sola query invece di due, filtro sempre corretto indipendentemente dal numero di articoli nel magazzino (nessun limite artificiale di 500).

### 3. Verifica — nessun test unitario nuovo

Ricognizione del codebase: **nessun file `page.tsx` sotto `src/app/(app)/` ha test unitari dedicati** (verificato per `ordini`, `magazzino`, e le altre pagine data-loading). Le funzioni che *hanno* test unitari in questo repo sono funzioni di business logic pure (es. `generate-ddc.ts`, `traccia-materiali.ts`), non i Server Component che orchestrano il caricamento dati per una pagina. Introdurre un test unitario per questo singolo file romperebbe la convenzione del repo senza reale valore aggiunto (il file non ha logica da isolare oltre alla query stessa).

Piano di verifica realistico:
1. **FASE 6b (gate migration):** `npx supabase gen types typescript ...` → `npx tsc --noEmit` — la chiamata `.rpc('articoli_sotto_scorta_minima', ...)` deve tipizzare correttamente sulla nuova funzione generata.
2. `npx vitest run` — nessuna regressione sulla suite esistente (712 test).
3. `npx next build` — build production pulita.
4. **QA browser (FASE 9):** navigazione a `/ordini` con dati reali/seed del laboratorio di test, verifica visiva della sezione "articoli sotto scorta" su 390/768/1280px, light+dark. **Vincolo noto:** `scripts/seed-e2e.ts` non contiene oggi fixture `magazzino` con articoli sotto soglia — se non sono già presenti dati idonei nel laboratorio di test, va aggiunta una fixture minima (1-2 articoli con `scorta_attuale <= scorta_minima`) per rendere la verifica visiva possibile.

### 4. Rollback

La migration è puramente additiva (nuova funzione, nessuna modifica a tabelle/colonne esistenti). Rollback = `DROP FUNCTION public.articoli_sotto_scorta_minima(uuid);` — zero rischio sui dati esistenti.

## File toccati

- Nuova migration (nome secondo convenzione `supabase/migrations/`, da definire nel piano)
- `src/types/database.types.ts` (rigenerato)
- `src/app/(app)/ordini/page.tsx` (righe 104-125 sostituite)
- Eventuale fixture `scripts/seed-e2e.ts` (solo se necessaria per QA browser, vedi §3.4)
