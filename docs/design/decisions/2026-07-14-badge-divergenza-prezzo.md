# Decisione — Badge "verifica prezzo" (divergenza N4) (2026-07-14)

**Owner:** Francesco Formicola · **Contesto:** N4 (fonte di verità del prezzo lavoro), FASE 9b (gate estetico L2), branch `worktree-n4-prezzo`.
**Mockup:** `docs/design/mockups/2026-07-14-badge-divergenza-prezzo.html`.

## Decisione ratificata

**Variante B scelta** per il badge "verifica prezzo" mostrato in `LavoriInAttesaSection` sui lavori con flag `divergente` (calcolato server-side, confronto `lavori.prezzo_unitario` vs somma righe `lavori_lavorazioni`):

- **Testo:** nuovo token `--c-amber-ink` — `#92400E` (light, 5.01:1 su `--sfc`) / `#F59E0B` (dark, 6.07:1 su `--sfc`), entrambi WCAG AA-compliant.
- Sostituisce la Variante A (testo `var(--c-amber)` diretto, sotto soglia contrasto) scartata perché il colore semantico "puro" non è leggibile come testo piccolo su sfondo chiaro/panna.
- Sfondo/bordo badge derivati via `color-mix(in srgb, var(--c-amber) 12%/34%, transparent)` — invariati, restano sull'amber "pieno" (solo il testo cambia token).

## Estensione decisa nella stessa sessione

Francesco ha deciso di sistemare **anche** il testo urgency/KPI con lo stesso token `--c-amber-ink`, per coerenza — non solo il badge divergenza. Applicato in `LavoriInAttesaSection` e nel testo amber di `estratto-conto-shared.ts` (badge/urgency/KPI), commit `38c1a5e`.

## Non toccato in questa decisione

`urgencyPillBg`/`urgencyPillBorder` in `estratto-conto-shared.ts` (concatenazione alpha su stringa `var()`, CSS invalido) — bug pre-esistente scoperto di striscio durante questo lavoro, **non risolto qui**, tracciato come N8 in `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`.
