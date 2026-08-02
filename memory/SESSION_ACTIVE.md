# Sessione attiva — P7: Task 4 chiude l'ondata, ramo pronto per revisione/merge

🚪 **PUNTO DI RIPRESA:** `docs/superpowers/specs/2026-08-04-p7-registro-dpa-cancello-traccia-design.md`
(testa aggiornata: ESEGUITA IN PARTE). Nessun file di lavoro aperto: l'ondata P7, ramo
`p7-registro-dpa-cancello-traccia`, è chiusa così com'è — onesta su ciò che resta.

✅ **T3 CHIUSA nel Task 4 (D152):** emissione VERA del DPA via il percorso applicativo reale (stessa
rotta, stesso database, servito in locale sul ramo perché `origin/main` non ha ancora il codice del
Task 2 — `git show origin/main:…generate-dpa.ts` → **0** occorrenze di `emesso_da`). `DPA-2026-0003`,
`emesso_da` valorizzato con l'utente reale, riga permanente lasciata per scelta. Referto:
`docs/roadmap/2026-08-04-p7-referto-prove.md` §10.

🔴 **P27 e P28 aperte in roadmap**, entrambe riverificate sul catalogo vivo: **P27** — `schema.sql`
mostra 1 trigger di sorveglianza su 11 vivi. **P28** — `admin_delete_laboratorio()` cancella `clienti`
prima di `data_processing_agreements`: un laboratorio con un DPA vero non si può più cancellare (23503)
— FASE 2, accanto a P21 (**D153**). Distinta dalla voce del 28/07 (quella: sei tabelle mai toccate;
questa: ordine sbagliato fra due `DELETE` che esistono entrambe).

🛑 **P7 NON è ✅:** T1 · T2 · T5 · T3 verdi, **T4 non eseguibile** (bloccata da P28). Scritto allineato
sia nella voce di roadmap sia in testa alla spec (guardia verde).

✅ **FASE 7:** `tsc` 0 · `vitest` **4382 | 19** (375 file) · `next build` 0, 81 rotte. Guardia coerenza
documenti verde.

🛑 **Non mergiato, non pubblicato** — pubblicazione da chiedere a Francesco.

📎 **153** decisioni in **54** tornate (D152 · D153 già a verbale); la prossima è **D154**.
