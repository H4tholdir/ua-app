# Sessione attiva — P7 IN PRODUZIONE, chiusa in parte e dichiarata tale

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/ROADMAP-UFFICIALE.md`, sezione ordinatrice — **la FASE 1 è
iniziata e P7 è la sua prima voce lavorata**. Spec: `docs/superpowers/specs/2026-08-04-p7-registro-dpa-cancello-traccia-design.md`
(testa: **ESEGUITA IN PARTE**). Referto delle prove: `docs/roadmap/2026-08-04-p7-referto-prove.md`.

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

🚀 **UNITO E PUBBLICATO (D154):** `main` = **`5b2a7481`**, avanzamento pulito (fast-forward), 15 file.
🔑 **Pubblicare era più sicuro che aspettare:** la metà rischiosa (regola a sola lettura + traccia) era
**già viva in produzione** dalle **15:22 di oggi**; il merge ha consegnato **solo TypeScript e documenti**.
Lo scarto era il danno vero — il codice pubblicato chiamava `generateDpa` con **due** argomenti, quindi
ogni emissione da `uachelab.com` scriveva `emesso_da` **NULL**: le stesse righe mute che **P26** documenta
sulla DdC.

⚠️ **CORREZIONE DI FRANCESCO, e vale oltre P7:** la revisione finale aveva scritto «*gira in produzione
**dal 04/08**, senza incidenti*», e chi riferiva l'ha ripetuto. `provato:` `date` → **2 agosto 17:50**;
il commit della migration → **02/08 15:22**. Sono **due ore e mezza**, non giorni — e in un intervallo in
cui **nessun laboratorio vero ha usato l'app**: non è robustezza, è assenza di occasioni di rompersi.
🔑 **In questo progetto la serie dei documenti corre AVANTI all'orologio: una data di documento usata per
misurare quanto tempo è passato sbaglia sempre nella direzione che rassicura.** Scritto nel referto §Nota.

📎 **154** decisioni in **54** tornate; la prossima è **D155**.
