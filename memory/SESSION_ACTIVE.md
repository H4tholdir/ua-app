# Sessione attiva — ondata (b): le quattro risposte prima della spec dell'album (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-album-foto-handoff.md`** (⚠️ il ledger
`.superpowers/sdd/progress.md` è **fuori dal repo git**, non può esserlo). Poi il verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **settanta decisioni**, D67-D70 sono
di oggi, e il §9 nuovo.

**Ramo `ondata-b-schermate`** — niente su `origin`. ✅ Otto task chiusi. 🔴 **T8 va ancora emendato**
(D61: la cancellazione è ancora **morbida**, `[imgId]/route.ts:91-93` lo dichiara).

🔴 **D67 sposta lavoro FUORI dall'ondata:** alla domanda sul PDF Francesco non ha scelto un'opzione, ha
**riformulato** — foto e allegati (pdf, stl…) sono cose diverse, e va progettata anche la **condivisione**
(WhatsApp · portale del dentista · chat interna, **mai discussa prima**). L'album resta **solo foto**;
`application/pdf` **non si toglie** finché non c'è l'altra strada. **D68** ordine per categoria · **D69**
elimina sotto il menù ⋯ · **D70** categoria correggibile da entrambe le superfici, **con una sola
funzione di scrittura**.

🛑 **Il panel di tre ha falsificato TRE premesse su tre** (§9 del verbale): le foto **non passano** dal
portale (gradiente invertito, non disparità) · due dei quattro import «legacy» non lo sono, ma il ponte CSS
vive su **una sola pagina** · la tabella non è in `schema.sql` e `ordine` è **ambigua** (default 1, insert 0).

🔴 **Da chiedere a Francesco prima della spec:** l'**ordine dei gruppi** (D68) · **dove vive la categoria**
(`tipo` ha il vincolo ma è morta, `descrizione` è libera: D65+D68 ci poggiano entrambe) · il **TTL** delle
URL firmate, che **dipende da D67** (condividere per link è progettare un permesso, non accorciare una
scadenza).

➡️ **PROSSIMO: la spec di design dell'album**, che emenda DS v3 §5.33.
