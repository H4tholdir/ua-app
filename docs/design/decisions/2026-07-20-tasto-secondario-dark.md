# Decisione — TastoSecondario visibile in dark dentro le card (§5.3)
**Data:** 20 luglio 2026 (notte) · **Ratifica:** Francesco («per il tema light mi fai C — Bordo pieno; per la variante dark invece, A — Faccia elevata»)
**Mockup:** `docs/design/mockups/2026-07-20-tasto-secondario-dark-su-card.html` + screenshot in `docs/design/mockups/screenshots/2026-07-20-tasto-secondario-dark-*.png`
**Origine:** QA ondata A mini-triage (`docs/design/screenshots/2026-07-20-ondata-a-mini-triage/QA-L2-REPORT.md`) — difetto PRE-ESISTENTE (da P4): in dark `--sh-press: none` e faccia `--card` su superficie `--card` ⇒ il «Conferma» della pila blu (e la card cedolini di Persone) mostrava solo testo galleggiante.

## Decisione

| Tema | Variante ratificata | Resa |
|---|---|---|
| Light | **C — Bordo pieno** | faccia `--elv` (≡ `--card` in light) + bordo 1.5 `--line` + `--sh-press` (invariata) |
| Dark | **A — Faccia elevata** | faccia `--elv` (§3.2 «elevazione = superficie più chiara») + hairline superiore `rgba(255,255,255,.06)`; NESSUN bordo pieno |

- Anatomia §5.3 invariata: H 58 · radius 18 · testo 17/700 `--ink` · corsa 2px.
- Disabled invariato: `--bg-deep`, senza bordo, testo `--faint`.
- Implementazione: il bordo vive nel CSS di componente (`.ds-tasto-secondario:not(:disabled)` + override `[data-theme="dark"]`) — mai inline, o l'override per tema non può vincere.
- Spec emendata (additivo): §5.3 nota 20/07/2026.
