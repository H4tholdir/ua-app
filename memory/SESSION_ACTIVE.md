# Handoff — Quick-fix bundle B12+B15+B11 mergiato e deployato (05/07/2026)

**3 blocker a basso effort chiusi, mergiati su `main` (commit `3da42c1`) e deployati.** B12 login WCAG (`8725dc2`), B15 banner Abbonamento/rischio doppio addebito Stripe (`a86d3f7`), B11 colore bandito `#1B2D6B` su 4 componenti + decimo caso rgba scoperto in review (`52e4a5d`+`1ee45c9`). Review finale whole-branch: "Ready to merge: Yes", zero Critical/Important. CI verde, deploy Vercel confermato, `uachelab.com` risponde. Worktree e branch rimossi. Dettaglio completo: `memory/MEMORY.md` §0.

**Prossima priorità da decidere con Francesco** tra i blocker rimanenti: B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B14 (compenso_base ambiguo), B16 (query ordini non supportata), B17 (fasi mai visibili in PDF).

**QA browser manuale ESEGUITA** (dev server + `preview_*`, lab E2E isolato, dati di test rimossi a fine sessione): B12 contrasto reale 7.90:1/4.84:1 (era 2.2:1/1.5:1 FAIL); B15 riprodotto sia lo scenario del bug (nessun banner con lab attivo+trial storico) sia il caso legittimo (banner mostrato per lab realmente in trial); B11 confermato blu `rgb(59,130,246)` su progress bar `LavoroCard` e badge "Segnalato Ministero" (incluso il decimo caso rgba). Toast realtime "Richiesta" e odontogramma non riprodotti dal vivo (rispettivamente: timing sottoscrizione WebSocket, nessun paziente E2E) — non bloccante, stesso valore CSS già confermato altrove. Dettaglio: `memory/MEMORY.md` §0.

---

Backlog: 🔴 14/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅ [B8 4/5], B11-B12 ✅, B13 ✅, B15 ✅, B18 ✅, B19 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
