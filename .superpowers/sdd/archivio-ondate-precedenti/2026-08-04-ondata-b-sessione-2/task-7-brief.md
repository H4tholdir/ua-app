## Task 7 — Igiene dichiarata (spec §3 + §3-bis n.4)

**Files:**
- Modify: `supabase/schema.sql:878, :903, :919` (Allegato IV → XIII) — la `:1189` NON si tocca (già corretta)
- Modify: `supabase/schema.sql:1265-1266` (CHECK stato + `'annullata'`), `:1275` (commento vero: la UNIQUE è sul numero; il vincolo per-lavoro è `ddc_lavoro_attiva_unique`, parziale, in `20260710090000`), dopo `:1302` (fotografare l'indice parziale)
- Modify: `src/types/domain.ts:574` (union + `'annullata'`)
- Modify: `tests/unit/generate-ddc.test.ts:190-196` (commento conteggio: «6 in archivio al 04/08/2026 — 2 `generata` di era pre-v1, 4 `annullata` di cui 3 con ddc-v1»; citare `scripts/tmp/verifica-conteggio-ddc.ts`)
- La sezione DdC di `schema.sql` fotografa anche l'assenza della policy UPDATE (righe 1292-1294 sostituite da un commento che rimanda alla migration di chiusura)

- [ ] **Step 7.1** Applicare le correzioni (testuali, nessuna migration: schema.sql è la fotografia).
- [ ] **Step 7.2** `npx tsc --noEmit` + `npx vitest run tests/unit/generate-ddc.test.ts` → PASS.
- [ ] **Step 7.3** Commit: `git commit -m "docs(schema): fotografia DdC allineata (Allegato XIII, stato annullata, indice parziale) + union domain (ondata B ②)"`.

