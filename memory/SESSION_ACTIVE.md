# Sessione attiva — ondata (a) del wizard: 8 su 13, si riprende in sessione nuova (27/07/2026, notte)

🛑 **PUNTO DI RIPRESA:** `docs/roadmap/2026-07-28-ondata-a-esecuzione-handoff.md` — leggilo per primo.
🛑 **Branch `ondata-a-denti-colore`**, repo principale. **Niente in produzione, mai mergiato.**

**CHIUSI — la parte «database e API» è FINITA:** T1 dominio FDI 52 codici · T2 precedenza colore ·
T3 `colori_dentali` (48) · T4 `lavori_denti` · T5 colonne di caso + `DROP COLUMN` + purga tenant ·
T6 FASE 6b · T7 le due RPC atomiche · T8 `PUT /api/lavori/[id]/denti`.
**3453 test verdi · tsc 0 · eslint 0 · `next build` ok · DB pulito (294 lavori, 0 denti).**

**RESTANO — la parte che tocca il codice vivo:** T9 POST atomico · T10 sentinelle · T11 wizard ·
T12 form del lavoro · T13 prove + FASE 7 + BP-1.
🛑 **T10, T11, T12 nello STESSO deploy:** appena i 7 campi escono dall'allowlist i due scrittori odierni
smettono di salvare **in silenzio** (`route.ts:259-264` scarta senza errore).

🔑 `node scripts/tmp/sql.mjs "<query>"` · `npx supabase db push --yes`.

🔴 **OTTO task, OTTO difetti nel piano — nessuno arrivato all'utente.** Cause e 3 regole proposte (da
**ratificare** con Francesco prima di incidere in CLAUDE.md):
`docs/processes/2026-07-27-lezioni-piano-ondata-a.md`.
La più importante: **il piano conteneva ~700 righe di codice mai eseguito**, e i difetti stanno uno per uno
nei file che non erano stati aperti.
