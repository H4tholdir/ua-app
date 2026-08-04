# Sessione attiva — chiusura 04/08 sera: sessione ② dell'ondata B in produzione

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-04-ondata-b-sessione-2-handoff.md` — la **§0 per prima**.

🔴 **La §0 in una frase:** il percorso nuovo in produzione è MORTO finché la ③ non lo accende
(nessun client manda la chiave `prescrizione`; MAI collaudato end-to-end, solo unit + RPC a banco) ·
FASE 8 formale sostituita dalle review per task + ramo (dichiarato) · `generated_by` DdC resta senza
scrittore · 2 citazioni stantie in CLAUDE.md (guard 93-107, allowlist 370-379).

✅ **Giornata:** sessione ② ESEGUITA e PUBBLICATA (D219: CI verde ×2 · CD verde · sito 200) —
3 migration (tabella `lavori_prescrizioni` · 6 RPC V8 · immutabilità DdC strutturale), server TDD,
igiene. Tornate 82-83: **D216-D222** (ratifiche · scene a2/C-1 confermate · studio rifacimento →
riga 12 roadmap).

📌 **Misurato in chiusura** (`verify:full`): tsc 0 · vitest **4568 | 19** (397 file | 3) · build ok ·
sei guardie verdi · rotte invariate (2 route modificate, 0 nuove).

➡️ **PROSSIMO: sessione ③ — wizard + scheda.** PRIMA cosa: piano ② → sezione «Note VINCOLANTI per
le sessioni ③ e ④» (10 note). Percorso 0B (mockup veri prima del codice). Rifacimento → prima la
riga 12 (D221). 📎 **222 decisioni in 83 tornate**; la prossima è **D223**.
