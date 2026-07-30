# Sessione attiva — ondata (b): l'album è deciso fino allo schema (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-album-foto-handoff.md`** (⚠️ il ledger
`.superpowers/sdd/progress.md` è **fuori dal repo git**, non può esserlo). Poi il verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **settantacinque decisioni**, D67-D75 sono
di oggi, più il §9 nuovo.

**Ramo `ondata-b-schermate`** — niente su `origin`. ✅ Otto task chiusi. 🔴 **T8 va ancora emendato**
(D61: la cancellazione è ancora **morbida**, `[imgId]/route.ts:91-93` lo dichiara).

🔴 **D67 sposta lavoro FUORI:** foto e allegati (pdf, stl…) sono cose diverse, e va progettata anche la
**condivisione** (WhatsApp · portale del dentista · chat interna, **mai discussa**). L'album resta **solo
foto**; `application/pdf` **non si toglie** finché non c'è l'altra strada. **D68+D71** ordine per categoria,
gruppi cronologici (`impronta→pre_lavoro→colore→post_prova→rx→altro`, **in TypeScript**: l'alfabetico SQL
metterebbe `altro` davanti). **D69** elimina sotto il menù ⋯. **D70** categoria correggibile da entrambe le
superfici, **con UNA sola funzione di scrittura**. **D72** elenco **chiuso**, sei voci ratificate da
Francesco **per la prima volta**. **D73** `tipo` **si elimina**, nasce `categoria` `NOT NULL` **senza
default** (il rosso di `tsc` è il risultato atteso) — migration in **file separato** da D63, backfill
**totale** (mai filtrare `deleted_at`), `CHECK` **dopo** il backfill.

🛑 **Due panel, cinque premesse mie falsificate.** Il primo: le foto **non passano** dal portale · il ponte
CSS v2.3→v3 vive su **una pagina sola** (`ds-v3.css:236` · `modifica/page.tsx:94`) → **i componenti nuovi
leggono SOLO `v3/tokens.ts`** · `ordine` è ambigua (default 1, insert 0). Il secondo, in **disaccordo fra i
due advisor**: a rompere il pareggio è stata **W23**, parole di Francesco del 27/07.

**D74** foglio della categoria chiuso senza scegliere → la foto nasce **`altro`**, elenco fermo a sei
(costo dichiarato: l'album **non distingue** «ho scelto Altro» da «non ho risposto»; contenuto perché
`altro` è **l'ultimo** gruppo di D71). **D75** la **durata dei collegamenti** alle foto si decide nel lavoro
sulla **condivisione** (D67): nell'ondata (b) è un **vuoto dichiarato e datato**, con il vincolo che album e
visore **non peggiorino l'esposizione in modo evitabile**. 🛑 La mitigazione da ~15 righe è stata
**presentata e scartata**, non dimenticata.

✅ **SPEC SCRITTA, 🟡 DA RATIFICARE:**
`docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md` — emenda DS v3 §5.33 (+ il worktree
di `:535`), gate FASE 3 con le cinque risposte, otto prove, cinque «non verificato» dichiarati.

➡️ **PROSSIMO: i QUATTRO mockup di §12** — visore · menù ⋯ dentro il visore · foglio della categoria allo
scatto · album coi sei gruppi. 🛑 **§0B NON è soddisfatto** dal confronto delle tre direzioni (mostrava la
sola carta), e i mockup vanno **dentro la schermata vera** (D58), 390/768/1280 × chiaro/scuro. Poi la
ratifica, poi il piano. **Aperta e da non decidere di nascosto:** la **marca dell'overlay** del visore
(`storia-overlay.ts:67` è un'unione chiusa a due).
