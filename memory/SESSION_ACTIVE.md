# Sessione attiva — la §0 dell'handoff del 3 agosto è CHIUSA: la DdC è stata guardata uscendo dalla produzione

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-03-ddc-produzione-referto.md`** — leggilo per intero; la sua **§6**
(il buono di consegna che non si rigenera) è la cosa nuova da decidere, la **§4** dice che cosa NON è provato.

✅ **Fatto il giro completo su uachelab.com** (consegna → lettura → annullo in **26 secondi**, lavoro tornato
`pronto`). Referto: **`docs/roadmap/2026-08-03-ddc-produzione-referto.md`**.
**Otto criteri su otto verdi** sul foglio emesso: titolo con `À`, PRRC con `à`, «è conforme», `§2` al suo posto
(paragrafi 1→8 senza buchi), metadati del file accentati. `testo_conformita_snapshot` porta `è`; sulla riga di
ieri porta ancora `e'`. 🔑 La rete è stata provata **rompendola**: sul foglio vecchio dà **8 rossi su 8**, e un
nono criterio è stato buttato perché passava anche lì.

🛑 **NON provato, dichiarato:** il **§6-bis** (norme armonizzate) non compare — `norme_json` è vuoto per questo
tipo di dispositivo. Serve un giro a parte con una riga di prova.

🔴 **RITROVAMENTO GROSSO, da decidere:** **il buono di consegna non si rigenera dopo un annullo.**
`BUO-2026-0001` è stato reso il 22/07 e allegato **tre volte** (22/07 · 31/07 · 01/08), stessa data stampata,
contatore fermo a 1. `generate-buono.ts:18-20` esce se `buono_pdf_url` c'è; `annulla_consegna_atomica` non lo
azzera. **E il dialogo promette che il buono viene annullato.** La tabella `buoni_consegna` esiste con lo stato
`'annullato'` previsto e ha **zero righe**.
🟠 Riferiti anche: la citazione **`Art. 2(1)(3)` non esiste** (va `Art. 2(3)`) · «dell Allegato I» senza
apostrofo, **nei dati**.

🚀 **Stato:** `main` allineato con origin, albero pulito. **Nessun codice toccato in questa sessione** — solo
documenti e script usa-e-getta in `scripts/tmp/` (ignorato da git).
📌 **Riferimento misurato a inizio sessione, su `main`:** `tsc` **0** · `vitest` **370 | 3** file e
**4275 | 19** prove · `next build` ok.
📎 Verbale: **centosette** decisioni in trentatré tornate. La prossima è **D108**.
⚠️ L'orologio della macchina dice **1° agosto**; i documenti seguono la serie del **3-4 agosto**. La
dichiarazione emessa porta stampato **01/08/2026**: sul documento finisce l'orologio della macchina.
