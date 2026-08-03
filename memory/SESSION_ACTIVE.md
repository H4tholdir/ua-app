# Sessione attiva — D197: PIPELINE-3 Fase 0 attiva, sul ramo, l'unione la decide Francesco

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-04-pipeline3-fase0-handoff.md` — la **§0 per prima**.

🏗️ **D197:** adottato PIPELINE-3 per fasi, reversibile. Fase 0 (hardening) ATTIVA sul ramo
**`pipeline3-fase-0`** — `main` = `0d97f8af` intonso, **l'unione la decide Francesco**.

✅ **Nati stanotte:** `npm run verify:fast`/`verify:full`/`guardie` · promemoria verifica allo
Stop (ricorda, non blocca) · policy diramazioni a 4 esiti con code in `docs/ops/` · template in
`docs/templates/` · normativo `docs/processes/PIPELINE-3.md` (in divergenza vale §0C).
🔧 La skill `/chiudi` ora usa `verify:full` (il one-liner storico saltava il service worker).

📌 **Misurato (primo `verify:full`): 1 min 10 s totali** — `tsc` 0 · `vitest` **4542 | 19**
(394 file) · `next build` 0, 81 rotte · **sei guardie verdi** · marcatore scritto.

🛑 **Della Fase 0 resta il pezzo grosso, NON iniziato:** Supabase locale + prove RLS a due
utenti, **5-10 giorni misurati** → scheda **E1** di `docs/ops/EMERGENTI.md`, a betting.
🔎 R-E2: E2 (`npm test` vs commento vitest, default in Q1) · E3 (test RLS statico, file mai nato).

➡️ **ORDINE:** ① Francesco decide l'unione ② prodotto: scatti di D193, P38, P39 (invariato)
③ dal prossimo item: modalità Fase 1 (pipelining).
❓ Restano **D-Q2** e la Q1 di `docs/ops/DECISIONI-PENDENTI.md`.
📎 **197 decisioni in 72 tornate**; la prossima è **D198**.
