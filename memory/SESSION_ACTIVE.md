# Handoff — Norme armonizzate su DdC (MDR §7) completato, deployato, QA'd (05/07/2026)

**COMPLETATO END-TO-END:** `dichiarazioni_conformita.norme_json` ora popolato e renderizzato (sezione §6-bis della DdC). Migration `rischi_tipo_dispositivo.norme_json` applicata al DB live, editor/API/generatore/template aggiornati. Merge fast-forward su `main` (`760b295`), pushato, CI verde, deploy Vercel confermato. **QA manuale in browser reale completata**: editor verificato dal vivo, flusso di consegna reale eseguito (lavoro di test su lab E2E, mai il lab Filippo), PDF generato scaricato e ispezionato — §6-bis conferma renderizzata correttamente. Dati di test rimossi, baseline a 0 residui. Dettaglio completo: `memory/MEMORY.md` §0.

**Nota minore:** `.claude/launch.json` locale (non tracciato in git) ha perso la voce `mockups-static` durante il setup della QA — da ricreare al bisogno per il prossimo mockup HTML da approvare (workflow CLAUDE.md §0B).

**Prossima priorità da decidere con Francesco:** il backlog tecnico ha ancora blocker aperti, il più critico è **B1** (tracciabilità MDR materiali/lotti strutturalmente rotta — sezione "Materiali/Lotti" sempre vuota sulla DdC, richiede una decisione di design su quale sistema tra `lavori_materiali` orfana e `scarichi_magazzino` diventa la fonte di verità). Altri blocker aperti: B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B11 (colore bandito su card lavoro), B12 (login WCAG), B13 (zero test su consegna/Stripe), B14 (compenso_base ambiguo), B15 (Abbonamento contraddittorio), B16 (query ordini non supportata), B17 (fasi mai visibili in PDF). Dettaglio completo: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`.

---

Backlog: 🔴 9/18 Blocker risolti (B2-B4 ✅, B7-B10 ✅, B18 ✅, B19 ✅) — B1 ancora APERTO nonostante il conteggio precedente lo includesse per errore. 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
