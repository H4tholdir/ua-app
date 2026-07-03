# Handoff — B8 (4/5) mergiato + hotfix z-index listino, prossima: 5/5 rete/[id] (03/07/2026)

**B8 (4/5) — /rete/nuova** mergiato fast-forward su `main` (commit `e84257f`, pushato su `origin/main`, deploy Vercel automatico). Bottom sheet `RetiNuovaSheet.tsx` sostituisce il link rotto `/rete/nuova`; guard server-side 409 su `POST /api/rete` (1 rete per lab admin). 317/317 test, tsc/build puliti.

**Bug z-index trovato in QA (submit sheet non cliccabile via touch a 390/768px, collisione con bottom-nav) — risolto in entrambi i punti dove è stato trovato:** `RetiNuovaSheet.tsx` corretto sullo stesso branch di B8 (4/5) prima del merge; `ListinoNuovoSheet.tsx` (B8 2/5, già in produzione) corretto separatamente su branch `fix-listino-zindex`. Entrambi allineati al pattern già corretto di `MagazzinoAddSheet.tsx` (`zIndex: 200/201`). Dettaglio: `memory/MEMORY.md` §0.

**Prossimo step:** **B8 (5/5) — `/rete/[id]`** — ultima route del backlog B8. Link "Gestisci rete →" in `/rete` porta ancora a 404. Servono anche 4 API mancanti (GET singola rete, POST/DELETE membro, PATCH nome) — tabelle `reti`/`reti_membri` già esistenti a DB.

---

Backlog: 🔴 4/16 Blocker (B1 ✅, B2 ✅, B7 ✅, B8 4/5 ✅ — resta solo rete/[id]). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
