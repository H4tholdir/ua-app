# Sessione attiva — ondata (b): l'album è disegnato e scelto, manca la ratifica (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md`** (⚠️ il
ledger `.superpowers/sdd/progress.md` è **fuori dal repo git**, non può esserlo). Poi il verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **settantanove decisioni**, D67-D79 sono
di oggi, più il §9 nuovo (i panel).

**Ramo `ondata-b-schermate`** — niente su `origin`. ✅ Otto task chiusi. 🔴 **T8 va ancora emendato**
(D61: la cancellazione è **morbida**, `[imgId]/route.ts:91-93` lo dichiara) — e **atterra prima o insieme**
alla parte visibile, o «Elimina foto» promette il falso.

✅ **§0B SODDISFATTO.** Mockup `docs/design/mockups/2026-07-30-album-visore-categoria.html` (390/768/1280 ×
chiaro/scuro, **dentro la scheda vera**). Scelte: **A1** album con etichette sopra i blocchi · **V1** visore
coi controlli visibili · **M2** menù a **tendina** (🛑 contro la raccomandazione: componente che in casa
**non esiste**, voce distruttiva **in fondo**, e la tendina **entra in `storia-overlay.ts`** come uno strato)
· **C1** sei pastiglie.

🔴 **D67 ha aperto un'ondata nuova** (allegati + **condivisione**): è la **settima riga della roadmap**, e
la destinazione di **D75** (durata dei collegamenti) e **R20**. L'album resta **solo foto**.
**D73** `tipo` si elimina, nasce `categoria` `NOT NULL` **senza default** (il rosso di `tsc` è atteso).

📏 **Trovato disegnando:** «Guida colore» **andava a capo** a 390 (pastiglia utile 148,5 px) — rientra a
15 px. L'etichetta più lunga **si misura, non si stima** (D39). E il visore va provato **sulla radiografia**:
su foto scura le sfumature dei controlli spariscono.

➡️ **PROSSIMO: la ratifica della spec, poi il piano.** 🟡 Restano due cose per il piano: la **marca
dell'overlay** per visore **e** tendina (`storia-overlay.ts:67` è un'unione chiusa a due) e le **icone vere**
al posto delle emoji segnaposto.
