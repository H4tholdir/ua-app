# Design System & Motion
**Carica quando:** task tocca UI, componenti, animazioni, colori, font, viewport, dark mode, haptic, suoni.

## File chiave
- `src/design-system/motion.ts` — UNICA fonte di verità per tutti i token animazione
- `src/design-system/haptic.ts` — pattern vibrazione (8ms light → 50ms heavy → [30,20,60] success)
- `src/components/layout/BottomNavPill.tsx` — navigazione operativa, long-press 500ms, editMode
- `src/components/layout/AppHeader.tsx` — presente in quasi ogni pagina
- `DESIGN.md` — design tokens completi (colori, tipografia, spacing, border-radius)

## Invariante critica
**MAI `duration`, `ease`, `spring` come literal hardcoded.** Sempre `import { t } from "@/design-system/motion"`.
Viola: incoerenza visiva non rilevabile da TypeScript/ESLint.
Stessa regola per colori tematizzati: mai hex diretti nei componenti, sempre CSS variables `--bg`, `--sfc`, `--elv`, `--prs`.

## Regole operative
- Font: **DM Sans** per tutto il testo UI — MAI Inter
- Palette colori:
  - Background: `#DDD8D3` (stone-base) light, `#1A1916` (dark-base) dark
  - Action red: `#D90012` light / `#E8001A` dark — MAI `#E30613`
  - MAI gradiente viola-blu, MAI `#0F1E52`/`#1B2D6B` come background (cobalt SOLO nav pill active)
- Shadow: dual-layer warm-tinted — MAI cobalt/haptimorphic
- Multi-viewport **OBBLIGATORIO**: 390px (mobile) + 768px (tablet) + 1280px (desktop) — layout dedicato per ciascuno
- BottomNavPill: visibile su TUTTI i viewport, mai nascosta su desktop
- `useReducedMotion`: obbligatorio su ogni componente con animazione non-istantanea
- `prefers-reduced-motion` rispettato su tutte le animazioni
- Touch target: minimo 52px
- MAI tabella full-width su mobile → card + accordion
- MAI modal centrato su mobile per azioni → bottom sheet

## Issue nota (Codex — bassa priorità)
Literal `duration`/`transition` hardcoded esistono in `PazienteArchiviaButton.tsx`, `globals.css`, `admin.css` — violano l'invariante. Da allineare a `motion.ts`.
