# Sessione attiva — la §0 dell'handoff precedente è chiusa, e gli accenti sono IN PRODUZIONE

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-03-accenti-documenti-handoff.md`** — leggilo per intero.

🔴 **La sua §0 va per prima: NESSUNO ha guardato una Dichiarazione di Conformità uscita dalla PRODUZIONE**
dopo il rilascio degli accenti. Il documento è stato guardato con gli occhi — una pagina, tutte le sezioni
popolate — ma **reso in locale**, non emesso da uachelab.com. Nessun motivo di sospettare un problema (deploy
verde, stesso codice), ma la catena completa dopo *questa* modifica non è stata percorsa. Giro reversibile di
dieci minuti: ricetta in `docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md` §6.

🚀 **Stato:** `main` = **`ad2b0324`**, allineato con origin, albero pulito, CI verde, deploy `success`,
uachelab.com risponde. **Niente a metà.**
📌 **Riferimento misurato su `main`:** `tsc` **0** · `vitest` **370 | 3** file e **4275 | 19** prove ·
`next build` ok.

✅ **Chiuso in questa sessione:** le **due impronte della DdC** provate in produzione (consegna + annullo) ·
il **primo braccio della guardia overlay**, che ha richiesto di **riparare la guardia** (si rompeva in due
punti, nessuno dei quali era un difetto dell'app) · **gli accenti nei due documenti generati**, il **§2** che
mancava dalla numerazione, e il DEFAULT della frase in banca dati (migration applicata).

🔑 **Le sei lezioni stanno in §2 dell'handoff.** La prima: *una prova che sembra solida va rotta apposta, non
riletta* — tre difetti su otto stavano dentro le prove, e l'ultimo è stato trovato dieci minuti dopo averlo
scritto.

📎 Verbale: **centosette** decisioni in trentatré tornate (**D103**-**D107** di oggi). La prossima è **D108**.
🟠 **Aperto e pesante:** il **luogo di fabbricazione non è mai stampato** benché obbligatorio · il foglio
**afferma «Sostanze/tessuti: No»** senza che il dato sia mai stato raccolto · la **nomina PRRC si riscrive la
data** a ogni scaricamento. Elenco completo: handoff §3.
⚠️ L'orologio della macchina è passato al **1° agosto**; i documenti seguono il **3 agosto**.
