# Sessione attiva — D207: ondata B pronta per la spec, chiusura eseguita

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-04-spec-ondata-b-handoff.md` — la **§0 per prima**.

🔴 **La §0 in una frase:** D179 è alla QUARTA volta (prove a schermo mai in CI, a betting con E1) ·
il conteggio DdC fresco non è mai stato misurato (sessione ②) · Q1 in coda senza risposta.

✅ **D207:** il meccanismo «la prescrizione la cattura il wizard» è ratificato **con le condizioni
del panel** (`docs/roadmap/2026-08-04-panel-d204-referto.md` §2 = vincoli della spec).
Modello raccomandato: tabella `lavori_prescrizioni`. Stima: **4 sessioni**, questa spec è la ①.

📌 **Misurato in chiusura** (`npm run verify:full`, 1:54): `tsc` **0** · `vitest` **4542 | 19**
(394 file) · `next build` **0**, 81 rotte · **sei guardie verdi**. Albero pulito, tutto pubblicato.

➡️ **PRIMA COSA: la spec dell'ondata B (P38+P37)** — vincoli D207, decisioni D201-D207 + D101/D196/
W20/W22, **mockup a Francesco prima del codice** (0B: più varianti, chiaro+scuro, 3 viewport).
❓ Restano **D-Q2** e Q1. 📎 **207 decisioni in 77 tornate**; la prossima è **D208**.
