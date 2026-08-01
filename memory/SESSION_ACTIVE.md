# Sessione attiva — §0 chiusa in produzione, e si parte con D42 (le tinte del manufatto)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/ROADMAP-UFFICIALE.md`** — la testa dice lo stato, e la sezione
«📄 I DOCUMENTI CHE ESCONO DAL LABORATORIO» tiene le undici voci aperte sulla DdC.
Referto del giro in produzione: `docs/roadmap/2026-08-03-ddc-produzione-referto.md`.

✅ **CHIUSA la §0 dell'handoff del 3 agosto:** la DdC è stata emessa da uachelab.com, scaricata, misurata e
**guardata**, poi annullata in 26 secondi. **Otto criteri su otto verdi** (accenti, `§2`, metadati del file);
la rete è stata provata **rompendola** — sul foglio vecchio dà 8 rossi su 8. Salvato e pubblicato
(`d37405ef`, CI e deploy verdi). 🛑 **NON provato:** il **§6-bis**, perché `norme_json` è vuoto per quel tipo.

📎 **D108 — la prossima ondata è D42, LE TINTE DEL MANUFATTO**, e prima è stato appuntato tutto il resto:
le voci normative sulla DdC vivevano **solo in un handoff** (documento che viene superato) e sono state
trasferite nella roadmap, con ogni riferimento **riaperto e riverificato** (tre erano invecchiati).
Verbale: **centotto** decisioni in trentaquattro tornate. La prossima è **D109**.

🔴 **Le due voci nuove del giro:** il **buono di consegna non si rigenera dopo un annullo** (e il dialogo
promette il contrario; `buoni_consegna` esiste con lo stato `'annullato'` previsto e ha **zero righe**) · la
DdC cita **`Art. 2(1)(3)` MDR, che non esiste** (va `Art. 2(3)` — fonte secondaria, da riconfermare su
EUR-Lex in italiano prima di correggere).

🎨 **D42 — i vincoli che si porta dietro dal panel del 28/07, NON si riaprono:** niente esadecimale libero ·
niente scale nuove dentro `colori_dentali` (cinque chiavi esterne, e l'id fine dei 38 tipi non è persistito) ·
catalogo separato con voci che hanno un **NOME**. **GRANDE, con migration** → percorso BP-2 pieno.

🚀 **Stato:** `main` allineato con origin. Nessuna riga di codice toccata finora in questa sessione.
📌 **Riferimento misurato su `main`:** `tsc` **0** · `vitest` **370 | 3** file e **4275 | 19** prove ·
`next build` ok.
⚠️ L'orologio della macchina dice **1° agosto**; i documenti seguono la serie del **3 agosto**. La
dichiarazione emessa porta stampato **01/08/2026**: sul documento finisce l'orologio della macchina.
