# Task 4 — FASE 7, memoria, chiusura

- [ ] **Step 1: FASE 7 per intero, output incollato**

```bash
npx tsc --noEmit && npx vitest run && npx next build
```

Atteso: `tsc` **0** · prove **4382 | 19** (le 4380 di partenza **+2**) · build uscita **0**.
🛑 **I tre comandi sono tre:** `tsc` non valida la firma degli handler di rotta, solo `next build` la vede.

- [ ] **Step 2: la guardia dei documenti**

```bash
node scripts/guardia-coerenza-documenti.mjs
```

- [ ] **Step 3: BP-1 — memoria e roadmap**

`memory/MEMORY.md` + `memory/SESSION_ACTIVE.md` + `docs/roadmap/ROADMAP-UFFICIALE.md`: la voce **P7** passa a ✅ **solo se** T1-T5 sono tutte verdi e il referto è in git. 🛑 **La guardia controlla che una voce ✅ non citi una spec che non si dichiara eseguita:** aggiornare anche l'intestazione della spec da «NON ESEGUITA» a «eseguita».

- [ ] **Step 4: merge e pubblicazione**

🛑 **La pubblicazione si CHIEDE a Francesco.** Merge su `main`, poi `git push` **solo se autorizzato**, poi CI verde, poi verifica su `uachelab.com`.

---

## Auto-revisione del piano

**Copertura della spec:** ① cancello → Task 1 Step 2 · ② traccia → Task 1 Step 2 · ③ colonna → Task 1 Step 2 + Task 2 · §4 parametro obbligatorio → Task 2 Step 2-5 · T1 → Task 3 Step 1 · T2 → Step 2 · T3a/T3b → Task 2 Step 1 (unità) + Task 3 Step 3 (vivo) · T4 → Task 3 Step 4 · T5 FASE 6b → Task 1 Step 7 · T6 FASE 7 → Task 4 Step 1. **Nessuna sezione della spec resta senza task.**

**Segnaposto:** nessun «TBD», nessun «gestire gli errori», ogni passo che tocca codice porta il codice.

**Coerenza dei nomi:** `emesso_da` (colonna, parametro, commento) · `_audit_data_processing_agreements` (automatismo) · `dpa_laboratorio` (regola) — un solo nome per cosa, in tutti i task.

**Ciò che questo piano NON copre, con destinazione:** la guardia «una firma non si riscrive» → **P19-b** · il «chi» per le altre dieci tabelle → **P25** · `dichiarazioni_conformita.generated_by` → **P26**.
