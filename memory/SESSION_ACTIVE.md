# Sessione attiva — 🌙 la notte di lavoro autonomo (D168), in corso

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-02-tarda-notte-p17-in-produzione-handoff.md`.**
🗒️ **Memoria breve della notte:** `scripts/tmp/NOTTE-D168-STATO.md` (tabellone + diario) ·
**domande per Francesco:** `scripts/tmp/NOTTE-D168-DOMANDE.md` (tutte in un posto solo).

✅ **P15 FATTA** — ramo `p15-reti-di-prova-che-puntano-nel-vuoto`, **non pubblicato** (D169).
Tre dei cinque progetti Playwright puntavano a **quattro file mai scritti**: un progetto che non trova
niente Playwright **lo esegue vuoto e ne esce VERDE**. Rimossi; nasce
`scripts/guardia-progetti-playwright.mjs` (pre-commit, `--staged`) con **due bracci** — progetto senza
prove · prova senza progetto — e **cinque prove che si accende**. `provato:` prima e dopo, «Total: **30**
tests in 5 files»: nessuna prova vera persa. 🔑 **Ritrovamento:** `auth.setup.ts` fa il login e salva una
sessione che **nessuno legge** (`storageState` compariva una volta sola, nel progetto morto).
📌 **D170 + D170-bis** scritte nel verbale (⚠️ decisione **mia**, non di Francesco: è su ramo, si ribalta).
I quattro controlli scoperti sono ora **P15-a…P15-d** in roadmap.
🛑 **Non risolto, e non è codice:** Playwright non gira in nessuna macchina automatica → **domanda D-Q1**.

📌 FASE 7 su P15: `tsc` **0** · `vitest` **4439 | 19** (379 file, 28,30 s) · `next build` **0**.
▶️ **Prossimo:** **P9** (i PDF stampano la data nel fuso della macchina, e in produzione gira a UTC).
📎 **170** decisioni in **59** tornate; la prossima è **D171**. 🛌 `caffeinate` PID 41560 — spegnerlo alle 07:00.
