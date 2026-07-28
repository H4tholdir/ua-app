# Sessione attiva — ONDATA (b): PIANO VALIDATO E RISCRITTO, si parte dalla CONSEGNA ZERO (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-ondata-b-consegna-zero-handoff.md`.**
Poi il piano: **`docs/roadmap/2026-07-29-ondata-b-piano-v2.md`**, e si legge **§0 per prima**.

**Il panel c'è stato** (7 revisori, ~70 file): **29 rilievi · 6 BLOCCANTI · 15 affermazioni del piano v1
verificate FALSE**. Verbale: `…-29-ondata-b-panel-validazione.md`.
🔑 **La lezione: il piano non è stato fermato dai buchi che dichiarava, ma DOVE SI SENTIVA SICURO** — la
sonda P1, il censimento dei token, la citazione-àncora del §4 e il drift `bite_splint` erano **tutti e
quattro difettosi**. *Un buco dichiarato si chiude; una certezza sbagliata no.*

🛑 **SI COMINCIA DALLA CONSEGNA ZERO (Z1-Z3), che va in produzione DA SOLA e PRIMA del ramo:** gestione del
`23505` · `btrim` + `'' → NULL` in scrittura · generatore reso case-insensitive e senza `deleted_at`.
Motivo: **non esiste uno staging** (verificato), quindi l'indice varrebbe subito per la produzione, che non
saprebbe gestirlo. Il modello è in casa, in **9 route**; `api/pazienti` è l'unica senza.

✅ **Panel normativo chiuso, 4 domande su 4.** **D34** (ratificata): il codice di un paziente archiviato
**non si riusa mai** — è un identificativo di legge e finisce su 4 documenti conservati. **D34-bis:**
`lower(btrim(...))`, che è la normalizzazione **già presente** su quella colonna. Foto: **soft-delete**,
stessi ruoli che caricano, finestra **fino alla consegna** — che è **anche il confine di legge**.
🔧 **Corretta una base normativa sbagliata in 3 documenti** (per i su misura: **Art. 10(5) + All. XIII p.4**,
non Art. 10(8)) e un errore vero (impiantabili: **15 anni**, non 10).

🔴 **Restano: 3 sonde** (P2 da rieseguire · P3 · P6-**forma**) · **2 gate di mockup** (denti, colore) ·
**2 decisioni di prodotto** (quando nasce la cassetta creata dal wizard · la stringa della briciola).
**Nessuna blocca la consegna zero.**

**31 commit locali non pubblicati, 11 di oggi. Zero righe di logica applicativa. Albero pulito.**
Baseline riverificata: **294 · 0 · 916 · 48**.
