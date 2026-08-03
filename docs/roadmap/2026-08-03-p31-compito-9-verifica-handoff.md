# Handoff — P31, Compito 9: «i cancelli, prima dell'unione»

## §0 — Che cosa NON è stato fatto (prima di tutto il resto)

- **Il ramo non è pubblicato.** `p31-due-numeri-per-il-cliente` resta locale: nessun `git push`,
  nessuna unione a `main`. L'autorizzazione a mergiare è di Francesco, non di questo compito.
- **Il vuoto della spec §9 resta aperto.** Che cosa mostri WhatsApp per un numero senza prefisso
  (o malformato) non è verificabile da riga di comando — serve un telefono vero, non disponibile
  in questa sessione. Non l'ho dichiarato chiuso.
- **Quattro ritrovamenti fuori mandato sono stati riferiti, non corretti** (R-E2): l'emoji del
  template WhatsApp che arriva come `U+FFFD`, un mismatch di idratazione su `?consegna=1`, la
  scheda cliente in sola lettura che non mostra mai `cellulare_whatsapp`, e un overflow orizzontale
  nella griglia tile del Passo 1 del wizard. Dettaglio e prove: v. il referto completo, sotto.

## Punto di ripresa

Referto completo, con tutti gli output reali (FASE 7, guardie coi numeri, tabella del gate L2 a 12
sezioni, sequenza del collaudo dal vivo coi tempi): `.superpowers/sdd/p31-compito-9-report.md`.

Stato aggiornato di P31 (voce di roadmap, marcata ✅ FATTA): `docs/roadmap/ROADMAP-UFFICIALE.md`.

## In breve

Nove compiti su nove eseguiti e verificati. FASE 7 pulita (`tsc` 0 · `vitest` 4540|19 · `next
build` 0). Cinque guardie verdi guardando il numero, non solo il colore (P32) — inclusa una verifica
empirica che la guardia di coerenza documenti reagisce davvero a un riferimento rotto (l'ho vista
diventare rossa quando ho puntato questo stesso punto di ripresa a un file non ancora scritto, poi
tornare verde una volta scritto). Le tre superfici (wizard a 5 campi, pannello di modifica —**primi
scatti mai fatti su questa veste, D186 copriva solo wizard e foglio**—, foglio della consegna)
fotografate a 390·768·1280 × chiaro·scuro, bersagli tappabili misurati (tutti i campi NUOVI ≥44px).
Gate estetico L2 percorso: 2 difetti trovati, entrambi pre-esistenti e non introdotti da P31,
deferiti con motivo scritto (uno è già P16/D134). Collaudo dal vivo (D103) completo: cliente senza
cellulare → richiesta → salvataggio → WhatsApp con prefisso 39 → verificato in anagrafica e su
database → consegna annullata in 13 secondi.

Riferimenti: `docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md` (spec) ·
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (verbale D181-D187) ·
`docs/design/screenshots/2026-08-03-p31/` (20 scatti + misure) · `memory/MEMORY.md` ·
`memory/SESSION_ACTIVE.md`.

➡️ **Prossimo passo:** quando Francesco autorizza l'unione — P31 → P30-a → P30-b → il React di
P30 (D180, invariato).
