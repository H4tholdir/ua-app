# Sessione attiva — ondata (a) del wizard: 7 task su 13 (27/07/2026, notte)

🛑 **Branch `ondata-a-denti-colore`**, repo principale. **Niente in produzione.**
Piano: `docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md`.

**CHIUSI:** T1 dominio FDI 52 codici + quadranti decidui · T2 precedenza colore · T3 `colori_dentali` (48) +
unique `(id,laboratorio_id)` · T4 `lavori_denti` (14 rifiuti su 14 provati) · T5 colonne di caso + snapshot +
`DROP COLUMN colore_dente` + purga tenant (48→49 DELETE, integrità misurata) · T6 FASE 6b ·
**T7 le due RPC atomiche**. Suite **3440 verdi** · tsc 0 · eslint pulito · DB pulito (294 lavori, 0 denti).

🔑 `node scripts/tmp/sql.mjs "<query>"` · `npx supabase db push --yes` (senza `--yes` si blocca).

🔴 **SETTE task, SETTE difetti veri nel piano.** I più gravi:
- **T7 (bloccante):** `array_agg` su zero righe dà **NULL**, non `{}`, e `denti_mancanti/impianti` sono
  **NOT NULL**. Il piano non girava **sul suo stesso esempio**. Chiuso con `COALESCE(..., '{}')`.
- **T5:** il piano faceva scrivere una funzione trigger che **esiste già** (`trigger_set_updated_at`, 34
  trigger su 34 tabelle). Era la 35ª copia. Rimossa.
- **T4:** le tre zone del ceramista accettavano **qualunque stringa** su un dato che alimenta la DdC.
- **T1:** i denti da latte sparivano dallo schermo, 0 su 20. Nessun gate lo vedeva.
- **T3:** il colore del wizard è **testo libero** e il catalogo è case-sensitive → prerequisito sul **T11**.
- **T2:** tre tendine della scheda clinica sarebbero diventate morte.

🟡 **Da chiudere nel T9 (già nel perimetro):** `lavoro_crea_atomico` **non** verifica `cliente_id`/
`paziente_id`/`tecnico_id`/`ciclo_id` contro `p_lab` (FK semplici, non composite) — riprodotto: lavoro creato
con un cliente di un altro laboratorio. La guardia vive in `FK_FIELDS_INSERT` **nella route**: il T9 deve
tenerla.
🟡 **Per il T8:** `gen types` emette `p_atteso_updated_at: string` (non nullable) → passare `null` da codice
tipato non compila; serve `DEFAULT NULL` o mandare sempre un valore. E `timestamptz` ha precisione al
**microsecondo**, `Date` di JS al millisecondo: far passare il gettone da un `Date` dà **409 permanente**.

**PROSSIMO: Task 8** — `PUT /api/lavori/[id]/denti` (422 col dente incriminato, 404 cross-tenant, 409).
