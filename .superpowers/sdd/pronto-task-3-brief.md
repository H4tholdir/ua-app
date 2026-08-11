## Task 3 — Il vocabolario del rifacimento e l'idempotenza

**File:** Crea `supabase/migrations/<timestamp>_rifacimento_motivi_e_idempotenza.sql`

**Interfacce:**
- Produce: `lavori_rifacimenti.motivo` accetta 9 valori · `UNIQUE (laboratorio_id, evento_id)`.

- [ ] **Passo 1 — la migration**

```sql
-- Ondata «si deve sempre poter intervenire» — §4.1 e §4.2 della spec (D306 · D307).
--
-- ① IL VOCABOLARIO. I due motivi del percorso qualità non hanno un corrispondente
--    fra i sette storici (provato: lavori_rifacimenti_motivo_check). Scriverci
--    'altro' perderebbe l'unica informazione che conta.
--    ⚠️ Da qui nascono TRE allowlist sullo stesso campo, e va detto invece di
--    lasciarlo scoprire: il database ne accetta 9, la rotta HTTP del rifacimento
--    resta a 7 (deliberato — quei due non si scelgono a mano), e la RPC non valida
--    p_motivo affatto (20260805201640:113,157). L'unico guardiano dei due valori
--    nuovi è la derivazione dentro la rotta degli eventi di qualità.
ALTER TABLE public.lavori_rifacimenti
  DROP CONSTRAINT IF EXISTS lavori_rifacimenti_motivo_check;
ALTER TABLE public.lavori_rifacimenti
  ADD CONSTRAINT lavori_rifacimenti_motivo_check
  CHECK (motivo IN (
    'colore_sbagliato','misura_errata','fusione_difettosa',
    'rottura_produzione','non_confortevole','errore_prescrizione','altro',
    'difetto_lavorazione','difetto_materiale'
  ));

-- ② L'IDEMPOTENZA (D307). Da oggi il rifacimento NON nasce più da un tasto premuto
--    a mano: lo crea l'app dentro un altro flusso. Senza questo vincolo, un doppio
--    tocco o un ritentativo dopo un timeout crea DUE lavori e brucia due
--    progressivi (crea_rifacimento_atomico incrementa progressivi_anno,
--    20260805201640:65-69), e il guard del client è solo in memoria
--    (DevoIntervenire.tsx:147). Col vincolo, il secondo tentativo è un 23505
--    riconoscibile: la rotta lo traduce e restituisce il lavoro già creato.
--    provato: l'indice esistente lavori_rifacimenti_evento_idx NON è unique.
--    ⚠️ Parziale, perché evento_id è nullable: i rifacimenti creati a mano non
--    hanno un evento, e un UNIQUE pieno su NULL non li disturberebbe comunque —
--    ma il parziale dichiara l'intenzione invece di appoggiarsi a un dettaglio
--    della semantica dei NULL.
CREATE UNIQUE INDEX IF NOT EXISTS rifacimento_evento_unique
  ON public.lavori_rifacimenti (laboratorio_id, evento_id)
  WHERE evento_id IS NOT NULL;
```

- [ ] **Passo 2 — applica**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```

- [ ] **Passo 3 — provalo con i valori che DEVONO essere rifiutati**

`/tmp/prova-t3.sql`, in transazione annullata: ① un `motivo` fuori dai nove → **23514**;
② due righe con lo **stesso** `(laboratorio_id, evento_id)` → **23505** sulla seconda;
③ due righe con `evento_id = NULL` → **passano entrambe** (l'indice è parziale).
Incolla i tre messaggi nel resoconto. **Se ③ fallisce, fermati e riferisci**: vorrebbe dire che
l'indice sta bloccando i rifacimenti creati a mano.

- [ ] **Passo 4 — FASE 6b + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
git add -A && git commit -m "feat(rifacimento): due motivi nuovi e l'idempotenza per evento (D306 · D307)"
```

---

