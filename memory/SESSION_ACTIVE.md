# Sessione attiva — ondata (b): T8 chiuso, e l'album foto è progettato (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-album-foto-handoff.md`** — ⚠️ **e non il ledger:
`.superpowers/sdd/progress.md` è FUORI dal repo git**, quindi non può essere il punto di ripresa (stesso
difetto corretto oggi per il brief di T8). Poi il verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (**sessantasei** decisioni, D57-D66 sono
di oggi) + i due mockup in `docs/design/mockups/2026-07-29-*` e le catture reali in
`docs/design/screenshots/2026-07-29-foto-stato-attuale/`.

**Ramo `ondata-b-schermate`** — **niente su `origin`**. ✅ **Otto task chiusi** (T1·T4·T2·T3·T5·T7·T6·T8).

🔴 **T8 va EMENDATO, non rifatto:** D61 ratifica la cancellazione **fisica** (la foto è **materiale di
lavoro**: non entra in nessun documento conservato — 0 riscontri in 9 template su 10, e i 2 del decimo
sono la **firma** del lab). Cambia **una** riga di sostanza (`.update({deleted_at})` → `.delete()` + la
rimozione del file, **ordine: file prima, riga dopo**, conteggio esatto-uno anche sullo storage). 🛑 **Gli
otto filtri RESTANO** (li usano RLS, indice parziale e 4 migrazioni di hard-delete del lab). D63: serve
una **traccia** di chi cancella (Art. 28(3)(h)) — mai l'immagine.

🔑 **Il buco di processo trovato oggi, e vale più dei task:** soft-delete e finestra non erano scelte di
Francesco — le aveva chiuse un **panel** in una tabella «domande normative» dove **una sola** riga portava
«📌 da ratificare», e il piano le attribuiva a **D34**, che parla del **codice paziente**. Il brief di T8
ha ripetuto la citazione sbagliata. ➡️ Regola imposta al panel nuovo: **ogni riga etichettata** `FATTO
NORMATIVO` (con fonte) **o** `SCELTA DI PRODOTTO` (con opzioni).

🔴 **D62 — da fare, e non è codice:** il DPA consegnato ai dentisti promette **10 anni** di conservazione
(`DpaTemplate.tsx:149,169,197`) → va corretto (nessuna copia firmata, confermato), insieme alla citazione
sbagliata dell'**Art. 10(8)** e ai **15 anni** degli impiantabili.

➡️ **PROSSIMO: la spec di design dell'album, poi il piano.** Forma ratificata (D64-D66): **carta con foto
grande + visore a tutto schermo** al tocco · categoria **chiesta allo scatto** (D65) · **editor fuori**, ma
il visore nasce col posto per la sua barra (D66). ⚠️ Da portare nella spec: **l'ordine delle foto non
esiste** (`ordine: 0` fisso, nessuna query ordina) e il **TTL 1h** delle URL firmate contro i 5 min del
portale.
