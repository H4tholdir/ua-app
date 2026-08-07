## Task 4 — Migration C: chiusura `ddc_laboratorio_update`

**Files:**
- Create: `supabase/migrations/<TS3>_ondata_b_ddc_chiusura_update.sql`

`provato:` S9 (prima=1, dopo=0) + censimento A.1 (zero `.update()` applicativi; l'annullo passa
da `annulla_consegna_atomica` SECURITY DEFINER, che non è toccato dalle policy).

- [ ] **Step 4.1** Scrivere la migration:

```sql
-- <TS3>_ondata_b_ddc_chiusura_update.sql — Ondata B, sessione ②, parte 3/3.
-- L'immutabilità della DdC era una CONVENZIONE (policy UPDATE tenant piena,
-- schema.sql:1292-1294): da oggi è struttura. Modello: il cancello DPA
-- (20260804120000:30-34). Censimento 04/08: NESSUN .update() applicativo su
-- dichiarazioni_conformita in src/ — l'unico UPDATE legittimo è dentro
-- annulla_consegna_atomica (SECURITY DEFINER: le policy non la toccano).
-- Rollback: CREATE POLICY inversa (spec §7) — il testo esatto è in schema.sql
-- alla versione precedente di questo commit.
DROP POLICY "ddc_laboratorio_update" ON dichiarazioni_conformita;
```

- [ ] **Step 4.2** Applicare: `npx supabase db push`. Expected: `Finished`.
- [ ] **Step 4.3** Verifica del rifiuto sul VIVO (il valore che DEVE essere rifiutato):
`node scripts/tmp/sql.mjs "SELECT policyname FROM pg_policies WHERE tablename='dichiarazioni_conformita' ORDER BY policyname"` → SOLO `ddc_laboratorio_insert` e `ddc_laboratorio_select`;
poi rieseguire la parte S9 della sonda SENZA il DROP (UPDATE come `authenticated` su una DdC del proprio lab) → **0 righe**.
E il giro d'annullo resta vivo: `node scripts/tmp/sql.mjs "SELECT prosecdef FROM pg_proc WHERE proname='annulla_consegna_atomica'"` → `true`.
- [ ] **Step 4.4** Commit: `git commit -m "feat(db): immutabilita DdC — chiusa la policy ddc_laboratorio_update (ondata B ②, V8)"`.

