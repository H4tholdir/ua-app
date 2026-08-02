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

✅ **P23 FATTA** — ramo `p23-il-salvataggio-che-si-ferma-a-mille`. **Tre pezzi:** lo scarico dei file
**scorre le pagine** · elencati e scaricati devono **combaciare** · e 🔑 **`salvataggio-database.sh` ora
GUARDA l'esito** — non ha `set -e`, quindi un archivio fallito veniva **inghiottito** e stampava «✅
salvataggio completo»: senza il terzo pezzo i primi due erano **inerti**. **7 prove** che lanciano lo
script vero come processo; `provato:` rimettendo il difetto **5 su 7** si accendono. **D172 · D172-bis.**
🛑 **Salvato con `--no-verify`**, con tutte le altre guardie fatte girare e incollate: la guardia del
salvataggio confronta col file **sotto mano** invece che col **pubblicato** → falso rosso su un ramo
(**P23-bis**). ⚠️ **ALL'UNIONE, PRIMA COSA:** `bash scripts/installa-salvataggio-programmato.sh`.

✅ **P18 FATTA** — ramo `p18-il-collegamento-che-diverge`. Una riga: l'indirizzo del link al dentista
viene da `NEXT_PUBLIC_APP_URL`, **come già negli altri sette punti**. 🔑 **Non era solo idratazione:** uno
di quei sette fa **lo stesso link** (`whatsapp-template.ts:22`), quindi WhatsApp e bottone potevano dare
**due indirizzi diversi**; e preso dalla finestra il dentista riceveva un indirizzo che dal suo studio non
esiste. **5 prove** che si fingono un tablet sulla rete del banco; `provato:` prima erano **5 su 5 rosse**.
**D173.** 🛑 **Vuoto: NON guardata nel browser.**

📌 FASE 7 su P18: `tsc` **0** · `vitest` **4466 passate | 19 saltate** (382 file) · `next build` **0**.
▶️ **Prossimo:** **P30** — mockup della pagina di modifica del dentista, 🛑 **fino alla SOGLIA**: nessuna
riga di React, la firma di Francesco sta in mezzo.
📎 **173** decisioni in **62** tornate; la prossima è **D174**. 🛌 `caffeinate` PID 41560 — spegnerlo alle 07:00.
