# Sessione attiva — 🌙 la notte di lavoro autonomo (D168), in corso

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-02-tarda-notte-p17-in-produzione-handoff.md`.**
🗒️ **Memoria breve della notte:** `scripts/tmp/NOTTE-D168-STATO.md` · **domande:** `NOTTE-D168-DOMANDE.md`.

✅ **P15 FATTA** — ramo `p15-reti-di-prova-che-puntano-nel-vuoto`, `73246a74`. Tre progetti Playwright
puntavano a quattro file mai scritti (un progetto che non trova niente **esce verde**). Rimossi + guardia
`guardia-progetti-playwright.mjs` (pre-commit, due bracci, **cinque prove che si accende**). Le prove
restano **30 in 5 file**: nessuna persa. **D170 · D170-bis.**

✅ **P9 FATTA** — ramo `p9-la-data-dei-documenti-nel-fuso-di-roma`. I documenti stampavano la data nel fuso
della **macchina**, e in produzione la macchina è a **UTC**. Tre funzioni condivise in `data-roma.ts`
(`dataItalianaBreve` · `dataOraItaliana` · `dataItalianaEstesa`) e **DODICI** punti portati lì — non undici:
uno mancava dall'elenco. **15 prove nuove**, tre sul documento vero. 🔑 **Il fatto della voce: quelle tre
prove alla prima stesura erano VERDI col difetto intatto**, perché questa macchina è `Europe/Rome`; ora il
gruppo **si finge la produzione** (`TZ=UTC`) **e verifica che la finta abbia morso**. **D171 · D171-bis.**
🛑 **Riferiti e non corretti (R-E2):** **P9-bis** (quattro documenti prendono la data da «adesso»:
ristamparli la cambia — **più grave del fuso**) · **P9-ter** (nomina PRRC stampa la data grezza).
❓ **D-Q3**: da quale campo prendono la data di emissione ricevuta, IFU e scheda di fabbricazione.

📌 FASE 7 su P9: `tsc` **0** · `vitest` **4454 passate | 19 saltate** (380 file) · `next build` **0**.
▶️ **Prossimo:** **P23** (il salvataggio dei file si ferma a 1000 per cartella e si dichiara riuscito).
📎 **171** decisioni in **60** tornate; la prossima è **D172**. 🛌 `caffeinate` PID 41560 — spegnerlo alle 07:00.
