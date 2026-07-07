# Decisione — Redesign totale: Design System v3 «Una cosa alla volta»
**Data:** 7 luglio 2026 · **Deciso da:** Francesco Formicola · **Stato:** APPROVATO

## Percorso decisionale
1. Francesco richiede la ricostruzione da zero di UI/UX/animazioni/font/colori/suoni ("effetto UÀ": app che si impara da sola, senza tutorial). Resta solo il brand (nome, logo, rosso #D90012).
2. Esplorate 3 direzioni con mockup (`docs/design/mockups/2026-07-07-redesign-concept-{A,B,C}*.html`):
   - **A «Una cosa alla volta»** (principio calcolatrice) — **scelta come spina dorsale**
   - **B «Le conversazioni»** (principio WhatsApp) — scartata per l'app; **sopravvive SOLO nel portale dentista** (chat col laboratorio)
   - **C «Il bancone»** (skeuomorfismo materico) — **abbandonata**: troppo caotica; l'analogico resta come **materia** (carta, grana, tasti fisici), mai scenografia (niente timbri storti/corsivi/quaderni/scontrini)
3. Iterazioni: fusione v1 → v2 → A+B → **A materica pura** (`2026-07-07-redesign-A-materico-full.html`, 7 schermate approvate) + tavola anatomica (`2026-07-07-ds-v3-showcase.html`).
4. Motion e suoni in **stile Apple** (ricerca HIG con valori numerici: molle iOS→Motion 12, 5 suoni firmati, iOS Safari senza vibrate API).

## Decisioni vincolanti
- Dark mode **alla pari** (elevazione = superficie più chiara, mai ombre)
- Suoni **attivi di default**, palette chiusa di 5, disattivabili
- **Tre viewport a pari dignità**: 390 primario · 768 split-view · 1280 tre pannelli
- Claude Design: sync **dopo** l'implementazione dei componenti (§14.7 spec)
- Home sacra: tre pile + tasto +, per sempre; scheda lavoro senza chat; wizard una-domanda-alla-volta

## Spec di riferimento (LEGGE)
`docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` — sostituisce DS v2.3 Warm Panna.

## Impatto
- B20 e gli altri blocker restano in backlog (pivot esplicito di Francesco)
- Piano di esecuzione in 7 sotto-progetti (spec §14); si parte dal n.1 "Fondamenta in codice"
