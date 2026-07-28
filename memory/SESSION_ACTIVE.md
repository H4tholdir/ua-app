# Sessione attiva — ONDATA (b): PIANO SCRITTO, 33 decisioni, ZERO codice (28/07/2026, chiusura)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-esecuzione-handoff.md`.**
Documento operativo: **`docs/roadmap/2026-07-28-ondata-b-piano.md`** — e si legge **§9 «cosa manca»
PRIMA** di tutto: il piano dichiara di **non essere eseguibile**.

🛑 **LA PRIMA COSA DA FARE, richiesta esplicita di Francesco:** *«facciamo controllare da advisor
specializzati il piano da eseguire e tutti i passaggi successivi»*. **Il piano non si esegue prima di un
panel** (è anche la Regola Advisor). Composizione suggerita e mandato scritto: handoff §1.

**Trentatré decisioni in sei tornate** (verbale `2026-07-28-wizard-ondata-b-decisioni.md`):
D1-D8 apertura · D9-D16 mockup · D17-D20 ratifica della spec · D21-D25 varianti · **D26 le tre ondate** ·
**D27-D32 le minori** (registrate al doppio controllo di fine sessione: erano rimaste solo in chat) ·
**D33 «il numero si dà subito»**, la regola nata da quel ripasso: ogni scelta prende numero e riga **nello
stesso turno**, e una **guardia** (`scripts/guardia-coerenza-documenti.mjs`, ~0,03 s nel pre-commit) verifica
conteggi, riferimenti pendenti, voci fantasma e punto di ripresa. Testo: **`CLAUDE.md` §0A-bis**.
🌊 **Tre ondate:** **(b) il wizard** · **(c) le foto per bene** (editor + le stesse azioni sulla scheda) ·
**(d) le cassette per bene** (parete in «modo scelta» + tavolozza più ricca).

✅ **Provato, non rifare:** **P1** l'indice unico **rifiuta davvero** (messaggio incollato) **e** due
laboratori diversi possono usare lo stesso codice (controllo positivo) · **P2** 0 duplicati su 916 pazienti.
🔴 **Difetto trovato scrivendo il piano (P4):** una bozza `v:1` **non viene mai rimossa** —
`persistenza.ts:69-73` cancella solo alla scadenza, non sul mismatch di versione.
🔴 **R12:** un'immagine del lavoro **non si può cancellare** (`immagini/[imgId]` ha solo `PATCH`).
🚫 **R11 ritirato:** il «difetto» del colore delle cassette non esisteva.

🛑 **Manca al piano:** 10 file **non letti** (fra cui **4 test che si romperanno**) · **4 sonde** (P3, P5,
P6, e P2 da rieseguire) · censimento dei **token orfani** · **3 domande aperte** (`DELETE` soft o hard →
**panel normativo** · tetto foto da misurare su device · la chiave `localStorage` cambia nome o no).

🔑 **Zero righe di codice. Diciotto commit locali non pubblicati, dieci di questa sessione.** Baseline riverificata dopo ogni
sonda: **294 lavori · 0 denti · 916 pazienti · 48 colori**.
