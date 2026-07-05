# Handoff — Norme armonizzate su DdC (MDR §7) completato, deployato, QA'd (05/07/2026)

**COMPLETATO END-TO-END:** `dichiarazioni_conformita.norme_json` ora popolato e renderizzato (sezione §6-bis della DdC). Migration `rischi_tipo_dispositivo.norme_json` applicata al DB live, editor/API/generatore/template aggiornati. Merge fast-forward su `main` (`760b295`), pushato, CI verde, deploy Vercel confermato. **QA manuale in browser reale completata**: editor verificato dal vivo, flusso di consegna reale eseguito (lavoro di test su lab E2E, mai il lab Filippo), PDF generato scaricato e ispezionato — §6-bis conferma renderizzata correttamente. Dati di test rimossi, baseline a 0 residui. Dettaglio completo: `memory/MEMORY.md` §0.

**Nota minore:** `.claude/launch.json` locale (non tracciato in git) ha perso la voce `mockups-static` durante il setup della QA — da ricreare al bisogno per il prossimo mockup HTML da approvare (workflow CLAUDE.md §0B).

**Correzione (05/07/2026, sessione successiva):** la riga precedente di questo file affermava erroneamente che **B1** (tracciabilità MDR materiali/lotti) fosse "ancora APERTO nonostante il conteggio precedente lo includesse per errore" — falso. Verifica diretta di `git log`/`git branch --contains 31cc47c` (merge su `main`, `main` identico a `origin/main`) e lettura del codice reale (`lavori_materiali` + `traccia-materiali.ts` + `DdcTemplate.tsx` §5) confermano che **B1 è stato davvero risolto e deployato il 02/07/2026** (commit `31cc47c`). L'errore era nato dalla sezione narrativa di `BACKLOG-TECNICO-2026-07-02.md` (§B1), rimasta non aggiornata dopo la chiusura — solo la riga della tabella di stato era stata corretta. Entrambi i file sono stati corretti in questa sessione. **B1 non richiede più alcuna decisione di design.**

**Prossima priorità da decidere con Francesco:** il backlog tecnico ha ancora blocker aperti: B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B11 (colore bandito su card lavoro), B12 (login WCAG), B13 (zero test su consegna/Stripe), B14 (compenso_base ambiguo), B15 (Abbonamento contraddittorio), B16 (query ordini non supportata), B17 (fasi mai visibili in PDF). Dettaglio completo: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`.

---

Backlog: 🔴 10/18 Blocker risolti (B1 ✅ — riconfermato 05/07, B2-B4 ✅, B7-B10 ✅, B18 ✅, B19 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
