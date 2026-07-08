# B16 — Refactor Query `/ordini` con RPC Dedicata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare la query rotta/sprecata in `src/app/(app)/ordini/page.tsx` (colonna-contro-colonna non supportata da PostgREST) e il fallback JS-side limitato a 500 articoli, sostituendo entrambi con un'unica chiamata a una RPC Postgres dedicata che filtra `scorta_attuale <= scorta_minima` server-side.

**Architecture:** Una funzione SQL `articoli_sotto_scorta_minima(p_lab_id uuid) RETURNS SETOF magazzino`, chiamata esclusivamente da `getServiceClient()` (service-role), con permessi ristretti (`REVOKE ALL FROM PUBLIC, anon, authenticated` + `GRANT ... TO service_role`). Nessuna dipendenza da RLS/`current_lab_id()` — il filtro per laboratorio è un parametro esplicito, coerente con come questo repo accede sempre ai dati lato server (service client + filtro manuale).

**Tech Stack:** Supabase Postgres (migration SQL), Supabase CLI (`supabase db push`, `supabase gen types`), Next.js Server Component (`ordini/page.tsx`), TypeScript, Vitest.

## Global Constraints

- Migration → rigenerare `src/types/database.types.ts` con `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`, poi verificare/rimuovere qualunque messaggio CLI residuo in fondo al file, poi `npx tsc --noEmit` (FASE 6b, obbligatorio dopo ogni migration — `CLAUDE.md` root e `ua-app/CLAUDE.md`).
- Nessun test unitario nuovo per `page.tsx` — nessun file `page.tsx` sotto `src/app/(app)/` ha test dedicati in questo repo (vedi spec §3). Verifica tramite `tsc --noEmit` + `npx vitest run` (suite esistente, 712 test) + `npx next build`.
- La migration si applica al progetto Supabase remoto condiviso (`iagibumwjstnveqpjbwq`, linkato via CLI, nessuno stack locale) — azione su stato condiviso, hard-to-reverse solo nel senso di "visibile subito in produzione anche se il DROP è banale": **va confermata esplicitamente con Francesco immediatamente prima di eseguire `supabase db push`**, non basta il piano scritto.
- Dopo l'apply, eseguire `get_advisors` (MCP Supabase, tipo `security`) per confermare zero regressioni rispetto al lavoro di hardening di B19.
- Commit atomici, un commit per task.
- Formato commit: `feat(ordini): ...` / `chore(db): ...` — vedi convenzione in `CLAUDE.md` §5.

---

### Task 1: Migration — funzione RPC `articoli_sotto_scorta_minima`

**Files:**
- Create: `supabase/migrations/20260708120000_articoli_sotto_scorta_minima_rpc.sql`

**Interfaces:**
- Produce: funzione Postgres `public.articoli_sotto_scorta_minima(p_lab_id uuid) RETURNS SETOF magazzino`, eseguibile solo da `service_role`. Colonne di ritorno = tutte quelle di `magazzino` (`id`, `laboratorio_id`, `fornitore_id`, `codice_articolo`, `nome`, `produttore`, `codice_articolo_fornitore`, `categoria`, `sotto_categoria`, `um_acquisto`, `um_scarico`, `quantita_per_confezione`, `costo_confezione`, `costo_unitario`, `prezzo_unitario`, `aliquota_iva`, `scorta_attuale`, `scorta_minima`, `conf_da_ordinare`, `dispositivo_medico`, ..., `attivo`, `deleted_at`, `created_at`, `updated_at` — schema completo in `supabase/schema.sql:633-668`). Il Task 3 userà solo il subset `id, nome, scorta_attuale, scorta_minima, um_scarico, fornitore_id`.

- [ ] **Step 1: Scrivi la migration**

```sql
-- supabase/migrations/20260708120000_articoli_sotto_scorta_minima_rpc.sql
-- B16: sostituisce la query colonna-contro-colonna non supportata da
-- PostgREST in ordini/page.tsx (scorta_attuale confrontato con
-- scorta_minima della stessa riga) e il fallback JS-side limitato a
-- 500 articoli. Filtra server-side, nessun limite di riga.
--
-- Nota: esiste già una view magazzino_sotto_scorta (schema.sql:2455)
-- ma non è utilizzabile da qui — filtra internamente su
-- current_lab_id()/auth.uid(), sempre NULL sotto getServiceClient()
-- (service-role, nessun JWT utente). Questa funzione è l'equivalente
-- parametrizzato e callable da service-role; non sostituisce la view
-- (usata potenzialmente da un futuro consumer con sessione utente).
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

- [ ] **Step 2: Conferma con Francesco prima di applicare**

Questo è un push su un progetto Supabase remoto condiviso. Mostra la migration e chiedi conferma esplicita prima di eseguire il comando dello Step 3, anche se additiva e reversibile.

- [ ] **Step 3: Applica la migration al progetto remoto**

Run: `supabase db push`
Expected output: elenco `20260708120000_articoli_sotto_scorta_minima_rpc.sql` applicata con successo, nessun errore SQL.

- [ ] **Step 4: Verifica assenza regressioni di sicurezza**

Usa il tool MCP Supabase `get_advisors` con `type: "security"` sul progetto `iagibumwjstnveqpjbwq`.
Expected: nessun nuovo finding relativo a `articoli_sotto_scorta_minima` (né `security_definer_view`, né `function_search_path_mutable` — la funzione ha `SET search_path TO 'public'` esplicito e non è `SECURITY DEFINER`).

- [ ] **Step 5: Rigenera i tipi TypeScript**

Run: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`

Poi apri `src/types/database.types.ts` e controlla le ultime righe: se il CLI ha appeso un messaggio di log/warning in fondo al file (fuori dal blocco TypeScript valido), rimuovilo manualmente. Verifica che la sezione `Functions` contenga ora:

```typescript
articoli_sotto_scorta_minima: {
  Args: { p_lab_id: string }
  Returns: {
    // colonne di magazzino
  }[]
}
```

- [ ] **Step 6: Verifica TypeScript**

Run: `npx tsc --noEmit`
Expected: nessun errore (nessun call site usa ancora la funzione — questo step verifica solo che i tipi rigenerati non rompano nulla di esistente).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260708120000_articoli_sotto_scorta_minima_rpc.sql src/types/database.types.ts
git commit -m "$(cat <<'EOF'
feat(db): aggiungi RPC articoli_sotto_scorta_minima per /ordini

Sostituisce la query colonna-contro-colonna non supportata da
PostgREST (B16). Filtra scorta_attuale <= scorta_minima lato server,
callable solo da service_role.
EOF
)"
```

---

### Task 2: Refactor `ordini/page.tsx` — sostituzione query

**Files:**
- Modify: `src/app/(app)/ordini/page.tsx:104-125`

**Interfaces:**
- Consuma: `svc.rpc('articoli_sotto_scorta_minima', { p_lab_id: string })` prodotta dal Task 1, tipizzata in `database.types.ts` dopo la rigenerazione.
- Il tipo `ArticoloSottoScorta` (già definito a `ordini/page.tsx:31-38`) resta invariato — il risultato della RPC (superset di colonne `magazzino`) viene castato a questo subset, esattamente come faceva prima il fallback JS-side.

- [ ] **Step 1: Sostituisci il blocco righe 104-125**

Codice attuale da rimuovere (in `src/app/(app)/ordini/page.tsx`):

```typescript
    // Carica articoli sotto scorta minima
    const { data: articoliData } = await svc
      .from('magazzino')
      .select('id, nome, scorta_attuale, scorta_minima, um_scarico, fornitore_id')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .lt('scorta_attuale', svc.from('magazzino').select('scorta_minima'))
      .order('nome', { ascending: true })
      .limit(100)

    // La query sopra non funziona con lt su colonne della stessa tabella — usiamo filter lato JS
    const { data: tuttiArticoli } = await svc
      .from('magazzino')
      .select('id, nome, scorta_attuale, scorta_minima, um_scarico, fornitore_id')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('nome', { ascending: true })
      .limit(500)

    void articoliData // sopprimi warning
    articoliSottoScorta = ((tuttiArticoli ?? []) as ArticoloSottoScorta[]).filter(
      (a) => a.scorta_attuale <= a.scorta_minima
    )
```

Sostituiscilo con:

```typescript
    // Carica articoli sotto scorta minima (RPC server-side, B16)
    const { data: articoliSottoScortaData } = await svc
      .rpc('articoli_sotto_scorta_minima', { p_lab_id: labId })

    articoliSottoScorta = (articoliSottoScortaData ?? []) as ArticoloSottoScorta[]
```

- [ ] **Step 2: Verifica TypeScript**

Run: `npx tsc --noEmit`
Expected: nessun errore. Se la chiamata `.rpc(...)` non tipizza (`p_lab_id` o nome funzione non riconosciuti), il Task 1 Step 5 non ha rigenerato correttamente i tipi — tornare lì prima di proseguire.

- [ ] **Step 3: Esegui la suite di test**

Run: `npx vitest run`
Expected: `712 passed` (nessuna regressione — nessun test esistente copre direttamente questo file, vedi Global Constraints).

- [ ] **Step 4: Build di produzione**

Run: `npx next build`
Expected: build completata senza errori.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/ordini/page.tsx"
git commit -m "$(cat <<'EOF'
fix(ordini): sostituisci query colonna-contro-colonna con RPC (B16)

Elimina la query .lt() non supportata da PostgREST (eseguita e
scartata ad ogni caricamento) e il fallback JS-side limitato a 500
articoli. Usa articoli_sotto_scorta_minima(p_lab_id), che filtra
server-side senza limite artificiale.
EOF
)"
```

---

### Task 3: QA browser — verifica visiva con dati reali

**Files:**
- Nessuna modifica di codice in questo task (solo verifica). Se il laboratorio di test non ha articoli sotto scorta minima, aggiungere una fixture minima in `scripts/seed-e2e.ts` prima di procedere (vedi Step 1).

- [ ] **Step 1: Verifica presenza di dati idonei nel laboratorio di test**

Controlla se il laboratorio E2E (`E2E_LAB_ID = '00000000-0000-0000-0000-000000000001'` in `scripts/seed-e2e.ts`) ha già almeno un articolo `magazzino` con `scorta_attuale <= scorta_minima` e `attivo = true`. Se non presente, aggiungi in `scripts/seed-e2e.ts` (dopo il blocco "3. Crea lavorazione nel listino test", prima del blocco "4. Crea utenti E2E"):

```typescript
    // 3b. Crea articolo magazzino sotto scorta minima (per QA /ordini, B16)
    console.log('📦  Creando articolo magazzino sotto scorta minima...')
    const E2E_MAGAZZINO_ID = '00000000-0000-0000-0000-000000000020'
    const { error: magazzinoErr } = await svc
      .from('magazzino')
      .upsert(
        {
          id: E2E_MAGAZZINO_ID,
          laboratorio_id: E2E_LAB_ID,
          codice_articolo: 'TEST-MAG-001',
          nome: 'Gesso tipo IV test',
          scorta_attuale: 2,
          scorta_minima: 5,
          um_acquisto: 'Kg',
          um_scarico: 'g',
          attivo: true,
        },
        { onConflict: 'id' }
      )

    if (magazzinoErr) {
      console.error('❌  Errore creazione articolo magazzino:', magazzinoErr.message)
      process.exit(1)
    }
    console.log(`✅  Articolo magazzino creato/aggiornato → ${E2E_MAGAZZINO_ID}`)
```

Aggiungi anche la costante `E2E_MAGAZZINO_ID` all'elenco stampato in fondo allo script (accanto a `E2E_LAB_ID`/`E2E_CLIENT_ID`/`E2E_LAV_ID`).

- [ ] **Step 2: Esegui il seed**

Run: `npx tsx scripts/seed-e2e.ts`
Expected: `✅ Articolo magazzino creato/aggiornato` nell'output (idempotente, ripetibile).

- [ ] **Step 3: Avvia il dev server e naviga a `/ordini`**

Avvia `npm run dev`, autentica come utente E2E titolare (`e2e-titolare@ua-test.local`, vedi credenziali in `scripts/seed-e2e.ts`), naviga a `/ordini`.
Expected: la sezione articoli sotto scorta mostra "Gesso tipo IV test" (2/5), nessun errore console/network sulla chiamata RPC.

- [ ] **Step 4: Verifica 3 viewport + entrambi i temi**

Resize a 390px (mobile), 768px (tablet), 1280px (desktop); verifica sia in light che dark mode. Screenshot per conferma.

- [ ] **Step 5: Commit (solo se la fixture è stata aggiunta)**

```bash
git add scripts/seed-e2e.ts
git commit -m "$(cat <<'EOF'
test(e2e): aggiungi fixture magazzino sotto scorta per QA /ordini (B16)
EOF
)"
```

---

### Task 4: Chiusura — memoria e backlog (BP-1)

**Files:**
- Modify: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (riga tabella B16 + sezione dettaglio)
- Modify: `memory/MEMORY.md` (nuovo paragrafo "Aggiornamento" in cima al log storico)

- [ ] **Step 1: Aggiorna la tabella backlog**

In `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`, riga `| B16 | ... | ⏳ | | |` → `| B16 | Query /ordini con subquery non supportata | ✅ | 08/07/2026 | Risolto con RPC articoli_sotto_scorta_minima — vedi dettaglio sotto |`.

- [ ] **Step 2: Aggiorna la sezione dettaglio B16**

Nella sezione `### B16. Query /ordini con subquery non supportata`, aggiungi in cima (stesso stile di B17/B20): `**✅ RISOLTO (08/07/2026).**` seguito da 2-3 frasi: sostituita la query rotta+fallback con RPC dedicata `articoli_sotto_scorta_minima`, filtro server-side senza limite di riga, soglia allineata a `<=` in tutto il codebase (fix collaterale, commit separato). Riferimento allo spec: `docs/superpowers/specs/2026-07-08-b16-ordini-rpc-scorta-design.md`.

- [ ] **Step 3: Aggiungi voce in `memory/MEMORY.md`**

Apri `memory/MEMORY.md` e inserisci un nuovo paragrafo `**Aggiornamento precedente:** 8 luglio 2026 — ...` subito prima dell'attuale primo paragrafo (stesso stile narrativo denso delle voci esistenti, es. riga 30). Contenuto: B16 risolto — sostituita in `ordini/page.tsx` la query `.lt()` colonna-contro-colonna non supportata da PostgREST (eseguita e scartata ad ogni load) e il fallback JS-side limitato a 500 articoli, con nuova RPC `articoli_sotto_scorta_minima(p_lab_id)` (`SETOF magazzino`, no `SECURITY DEFINER`, `REVOKE`/`GRANT` solo `service_role`) applicata al progetto live con conferma esplicita di Francesco. Menzionare la scoperta collaterale: esiste già una view `magazzino_sotto_scorta` (da B19) mai utilizzabile da questo pattern di accesso (dipende da `current_lab_id()`/`auth.uid()`, sempre NULL sotto `service_role`) — non toccata, drift preesistente noto. Menzionare il fix collaterale sulla soglia `<=` allineata in `ordini/page.tsx`/`magazzino/page.tsx`/`MagazzinoSearchList.tsx`. Riportare i numeri di verifica reali (test totali dopo `npx vitest run` del Task 2, esito `get_advisors`).

- [ ] **Step 4: Commit**

```bash
git add docs/roadmap/BACKLOG-TECNICO-2026-07-02.md memory/MEMORY.md
git commit -m "docs(backlog): B16 risolto — RPC articoli_sotto_scorta_minima"
```
