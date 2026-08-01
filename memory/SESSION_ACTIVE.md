# Sessione attiva — la §0 chiusa per intero, e gli accenti FATTI sul ramo

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-08-03-accenti-documenti.md`** — il ramo
`accenti-documenti` è pronto e **NON mergiato**: 12 salvataggi, `vitest` **370 | 3** file e **4274 | 19**
prove · `tsc` 0 · `next build` ok. Spec: `docs/superpowers/specs/2026-08-03-accenti-documenti-design.md`.

✅ **Fatto prima:** la §0 dell'handoff, **per intero** — le due impronte della DdC provate in produzione
(consegna + annullo) e il primo braccio della guardia overlay, che ha richiesto di **riparare la guardia**.
Referto: `docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md`.

✅ **Fatto poi (gli accenti nei documenti, D104-D107):** dieci punti senza accento corretti nei due documenti generati; nasce
**`§2 — Data di emissione`** (il foglio saltava da §1 a §3); il DEFAULT della frase in banca dati allineato
con una **migration nuova, applicata**; la versione del modello **resta `ddc-v1`** (D105) e per la prima volta
ha un **registro** che dice cosa contiene.

🔑 **Sette difetti trovati eseguendo, TRE dei quali nel piano stesso** — nessuno arrivato al documento:
un test che leggeva il dato di un altro test · un'asserzione morta (spazio finale che non esiste) · il piano
che pretendeva forma mista su titoli resi MAIUSCOLI (**tre volte**) · un'asserzione sulla data che restava
verde anche svuotando la sezione · un commento che prometteva più di quanto la prova misurasse.

📎 Verbale: **centosette** decisioni in trentatré tornate. La prossima è **D108**.
🟠 Riferiti e non corretti: i **nove** della spec §5 (fra cui il luogo di fabbricazione mai stampato e il
«Sostanze/tessuti: No» affermato senza dato) · il §6-bis e il §7 **attaccati** quando ci sono norme
armonizzate (preesistente, invisibile ai test perché la fixture non le popola).
