# Sessione attiva — regole di metodo RATIFICATE; l'ondata (a) riprende dal T9 (28/07/2026)

🛑 **PUNTO DI RIPRESA:** `docs/roadmap/2026-07-28-ondata-a-esecuzione-handoff.md`.
🛑 **Branch `ondata-a-denti-colore`**, repo principale. **Niente in produzione, mai mergiato.**

⚖️ **CHIUSO IN QUESTA SESSIONE — le regole nate dall'ondata (a) sono permanenti** (`ua-app/CLAUDE.md`
§0C, blocco «REGOLE DI PIANO»): **R-P1** blocco senza marchio = NON provato (fail-closed) · **R-P2**
l'elenco dei file da aprire **non lo decide l'autore** · **R-P6** 🆕 censimento su ogni *identificatore*,
non solo colonne · **R-P4** abbozzo inerte + conteggio · **R-E1** un compito, un esecutore fresco ·
**R-E2** si riferisce, non si patcha. **Scartate:** la nota su `tsc` (già in CI) e «piano in sessione
fresca» (causa contraddetta dai dati). Verbale del panel: post-mortem §7.
⚠️ **Aperto per Francesco:** restringere la Regola Advisor ai soli irreversibili — proposta, non fatta.
⚠️ **Riferito, non toccato:** 4 guardie (`guardia-*.mjs`, `check-csrf.sh`) **non agganciate a nulla**.

**ONDATA (a) — 8 task su 13 chiusi**, parte database/API finita. **3453 test verdi · tsc 0 · eslint 0 ·
`next build` ok · DB pulito (294 lavori, 0 denti).**
**RESTANO:** T9 POST atomico · T10 sentinelle · T11 wizard · T12 form del lavoro · T13 prove + FASE 7 + BP-1.
🛑 **T10, T11, T12 nello STESSO deploy:** appena i 7 campi escono dall'allowlist i due scrittori odierni
smettono di salvare **in silenzio** (`route.ts:259-264` scarta senza errore).

🔑 `node scripts/tmp/sql.mjs "<query>"` · `npx supabase db push --yes`.
