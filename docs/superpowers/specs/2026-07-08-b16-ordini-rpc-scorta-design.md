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

```sql
CREATE OR REPLACE FUNCTION public.articoli_sotto_scorta_minima(p_lab_id uuid)
RETURNS TABLE (
  id uuid, nome text, scorta_attuale numeric,
  scorta_minima numeric, um_scarico text, fornitore_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome, scorta_attuale, scorta_minima, um_scarico, fornitore_id
  FROM magazzino
  WHERE laboratorio_id = p_lab_id
    AND attivo = true
    AND scorta_attuale <= scorta_minima
  ORDER BY nome ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.articoli_sotto_scorta_minima(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.articoli_sotto_scorta_minima(uuid) TO service_role;
```

Segue il pattern già in uso nel repo per funzioni SECURITY DEFINER (convenzione in `CLAUDE.md` §9: revoke esplicito da `PUBLIC`/`anon`/`authenticated`, grant solo a `service_role`), coerente con `crea_rifacimento_atomico()`.

Il filtro `laboratorio_id = p_lab_id` è dentro la funzione — nessuna dipendenza da RLS (il chiamante è sempre `getServiceClient()`, che bypassa RLS by design in questo repo).

`scorta_minima` è nullable in almeno una definizione di tipo esistente (`database.types.ts:5316`): `scorta_attuale <= NULL` restituisce `NULL` in SQL → riga esclusa dal risultato. Comportamento corretto e intenzionale: un articolo senza soglia minima configurata non deve generare falsi alert.

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
