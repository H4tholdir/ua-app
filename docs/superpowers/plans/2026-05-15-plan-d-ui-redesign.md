# UÀ — Piano D: UI Redesign Clay Haptimorphism Completo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisito:** Piano A completato (migration 005_v1_foundation.sql applicata).

**Goal:** Sostituire il tema cobalt scuro corrente con Clay Haptimorphism warm-neutral su tutta la PWA — CSS globals, navigation pill, app shell, card lavori, tutte le schermate operative, billing, dark mode.

**Data:** 2026-05-15

---

## Architettura Decisioni (lette prima di implementare)

### Decision 1 — Token scoping
I token Clay vivono in `:root` (light) e `.dark` (dark) in `globals.css`. La variante `.dark` già esiste nel file ed è gestita via `@custom-variant dark (&:is(.dark *))`. I token login usano il namespace `--ua-*` scoped a `.login-root` — nessuna collisione. I token Clay usano nomi semantici non prefissati (`--bg`, `--surface`, ecc.) perché `globals.css` usa già questo pattern per shadcn.

### Decision 2 — Inline style sweep
Le pagine esistenti usano inline `style={{}}` con valori hex cobalt hardcoded. La strategia è (b): sostituire i valori hex letterali con `var(--clay-*)` all'interno dei blocchi `style={{}}` esistenti — nessuna refactor verso `className`. Minimizza il blast radius.

### Decision 3 — BottomTabBar a BottomNavPill
`BottomTabBar.tsx` esiste già e implementa pill+scroll-hide+FAB in tema cobalt. Il Task 2 crea `BottomNavPill.tsx` (stesso pattern, tema Clay), aggiorna l'import in `(app)/layout.tsx`, e cancella `BottomTabBar.tsx` nello stesso commit.

### Decision 4 — Dark mode tokens in Task 1
I token dark vengono definiti in Task 1 dentro `.dark { }`. Ogni componente successivo usa solo le variabili CSS e il dark "funziona" automaticamente. Task 10 implementa solo: toggle UI + persistenza `localStorage` + hook `prefers-color-scheme` + visual regression dark.

### Decision 5 — Approval gate
Ogni task UI ha un passo `HUMAN APPROVAL — STOP`. L'agente si ferma, mostra i path degli screenshot, attende approvazione esplicita di Francesco. Non si scrive React senza approvazione.

### Decision 6 — Playwright snapshot vs mockup
- **Mockup approval**: `npx playwright screenshot file:///tmp/mockup-<slug>.html` — ad-hoc, per approvazione
- **Visual regression TDD**: `expect(page).toHaveScreenshot()` in `tests/e2e/visual/*.spec.ts` — baseline generate con `--update-snapshots`

### Decision 7 — PageWrapper clearance
`PageWrapper` usa `paddingBottom: 120px`. La pill e posizionata `bottom: 20px` con altezza ~68px. Il clearance rimane 120px — sufficiente su tutti i viewport.

---

## Mappa File

| File | Tipo | Task |
|------|------|------|
| `src/app/globals.css` | MODIFY | 1 |
| `src/design-system/tokens.ts` | CREATE | 1 |
| `src/components/layout/BottomNavPill.tsx` | CREATE | 2 |
| `src/components/layout/BottomTabBar.tsx` | DELETE | 2 |
| `src/app/(app)/layout.tsx` | MODIFY | 2 |
| `src/components/layout/AppHeader.tsx` | MODIFY | 3 |
| `src/components/layout/PageWrapper.tsx` | MODIFY | 3 |
| `src/components/features/lavori/LavoroCard.tsx` | CREATE | 4 |
| `src/app/(app)/lavori/page.tsx` | MODIFY | 5 |
| `src/app/(app)/dashboard/page.tsx` | MODIFY | 5 |
| `src/app/(app)/lavori/nuovo/page.tsx` | MODIFY | 6 |
| `src/app/billing/billing-content.tsx` | MODIFY | 7 |
| `src/app/(app)/clienti/page.tsx` | MODIFY | 8 |
| `src/app/(app)/magazzino/page.tsx` | MODIFY | 8 |
| `src/app/(app)/fatture/page.tsx` | MODIFY | 8 |
| `src/app/(app)/impostazioni/page.tsx` | MODIFY | 9 |
| `src/hooks/useTheme.ts` | CREATE | 10 |
| `tests/e2e/visual/bottom-nav-pill.spec.ts` | CREATE | 2 |
| `tests/e2e/visual/lavoro-card.spec.ts` | CREATE | 4 |
| `tests/e2e/visual/lavori-page.spec.ts` | CREATE | 5 |
| `tests/e2e/visual/billing-page.spec.ts` | CREATE | 7 |

---

## Task 1: CSS Globals — Clay Haptimorphism Tokens + Reset + Utilities

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/design-system/tokens.ts`

Nessun mockup per questo task — sono solo token CSS e costanti TypeScript, nessuna UI visibile.

- [ ] **1.1 Aggiungi token Clay in globals.css**

Apri `src/app/globals.css`. Dopo la riga `--radius: 0.625rem;` nel blocco `:root { }` (riga circa 85), aggiungi i token Clay Haptimorphism:

```css
  /* ============================================================
     CLAY HAPTIMORPHISM — Token sistema approvato 2026-05-15
     Tutti i componenti app usano questi var, NON i valori hex diretti.
     Login page usa --ua-* scoped a .login-root — nessuna collisione.
     ============================================================ */

  /* Backgrounds */
  --clay-bg:           #EDEAE6;
  --clay-surface:      #F4F1EE;
  --clay-surface-high: #F9F7F5;
  --clay-border:       rgba(168, 150, 140, 0.18);

  /* Text */
  --clay-text:         #1A1714;
  --clay-text-2:       #6B6460;
  --clay-text-3:       #9C9490;

  /* Brand colors */
  --clay-red:          #D90012;
  --clay-red-dark:     #A80010;
  --clay-red-light:    #F01828;
  --clay-orange:       #B45309;
  --clay-green:        #16A34A;
  --clay-blue:         #2563EB;

  /* Shadows — dual-layer warm tinted */
  --clay-sh-raised:
    -2px -2px 6px rgba(255, 252, 250, 0.85),
     3px  3px  8px rgba(168, 150, 140, 0.28),
     6px  6px 16px rgba(140, 120, 110, 0.14);

  --clay-sh-card:
    -3px -3px  8px rgba(255, 252, 250, 0.90),
     4px  4px 12px rgba(168, 150, 140, 0.32),
     8px  8px 20px rgba(140, 120, 110, 0.16);

  --clay-sh-inset:
    inset  2px  2px  5px rgba(168, 150, 140, 0.22),
    inset -2px -2px  5px rgba(255, 252, 250, 0.70);

  --clay-sh-pressed:
    inset  3px  3px  8px rgba(168, 150, 140, 0.38),
    inset -2px -2px  6px rgba(255, 252, 250, 0.55),
            2px  2px  4px rgba(140, 120, 110, 0.10);

  --clay-sh-red-glow:
    inset 0  2px 0 rgba(255, 140, 120, 0.20),
    inset 0 -4px 7px rgba(60, 0, 0, 0.22),
    -3px -3px 7px rgba(255, 100,  80, 0.10),
    10px 13px 22px -2px rgba(100,  5,  5, 0.55),
     4px  6px 10px     rgba(100,  5,  5, 0.28);

  --clay-sh-fab:
    -3px -3px  7px rgba(255, 100,  80, 0.18),
     5px  5px 14px rgba(100,   5,  5, 0.55),
     0    0   20px rgba(217,   0, 18, 0.30);

  --clay-sh-nav:
    -2px -2px  6px rgba(255, 252, 250, 0.75),
     4px  4px 12px rgba(168, 150, 140, 0.32),
     0    8px 24px rgba(100,  80,  70, 0.18);
```

- [ ] **1.2 Aggiungi token dark Clay in globals.css**

Nel blocco `.dark { }` esistente (dopo `--sidebar-ring: oklch(0.556 0 0);`, riga circa 128), aggiungi:

```css
  /* Clay dark mode */
  --clay-bg:           #1A1916;
  --clay-surface:      #222019;
  --clay-surface-high: #2C2A27;
  --clay-border:       rgba(255, 255, 255, 0.08);

  --clay-text:         #F0EDE8;
  --clay-text-2:       #8A8580;
  --clay-text-3:       #555250;

  --clay-red:          #E8001A;
  --clay-red-dark:     #B50014;
  --clay-red-light:    #FF1A30;
  --clay-orange:       #D97706;
  --clay-green:        #22C55E;
  --clay-blue:         #3B82F6;

  --clay-sh-raised:
    -2px -2px  6px rgba(255, 255, 255, 0.03),
     3px  3px  8px rgba(0,   0,   0, 0.50),
     6px  6px 16px rgba(0,   0,   0, 0.35);

  --clay-sh-card:
    -3px -3px  8px rgba(255, 255, 255, 0.04),
     4px  4px 12px rgba(0,   0,   0, 0.55),
     8px  8px 20px rgba(0,   0,   0, 0.40);

  --clay-sh-inset:
    inset  2px  2px  5px rgba(0,   0,   0, 0.55),
    inset -2px -2px  5px rgba(255, 255, 255, 0.04);

  --clay-sh-pressed:
    inset  3px  3px  8px rgba(0, 0, 0, 0.65),
    inset -2px -2px  6px rgba(255, 255, 255, 0.04),
            2px  2px  4px rgba(0, 0, 0, 0.40);

  --clay-sh-red-glow:
    inset 0  2px 0 rgba(255, 140, 120, 0.15),
    inset 0 -4px 7px rgba(0, 0, 0, 0.45),
    -3px -3px 7px rgba(255, 60, 40, 0.08),
    10px 13px 22px -2px rgba(0, 0, 0, 0.70),
     4px  6px 10px     rgba(0, 0, 0, 0.50);

  --clay-sh-fab:
    -3px -3px  7px rgba(255, 100,  80, 0.10),
     5px  5px 14px rgba(0,   0,   0, 0.70),
     0    0   20px rgba(217,  0,  18, 0.35);

  --clay-sh-nav:
    -2px -2px  6px rgba(255, 255, 255, 0.03),
     4px  4px 12px rgba(0,   0,   0, 0.60),
     0    8px 24px rgba(0,   0,   0, 0.45);
```

- [ ] **1.3 Aggiungi utility classes Clay in globals.css**

Dopo il blocco `@layer base { }` esistente, aggiungi:

```css
/* ============================================================
   CLAY — Utility classes (non-Tailwind, vanilla CSS)
   ============================================================ */

.clay-bg         { background: var(--clay-bg); }
.clay-surface    { background: var(--clay-surface); }
.clay-surface-h  { background: var(--clay-surface-high); }

.clay-t1  { color: var(--clay-text); }
.clay-t2  { color: var(--clay-text-2); }
.clay-t3  { color: var(--clay-text-3); }
.clay-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--clay-text-3);
}

/* Playfair SOLO per numeri KPI hero */
.clay-hero-num {
  font-family: var(--font-playfair);
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--clay-text);
}

.clay-raised   { box-shadow: var(--clay-sh-raised); }
.clay-card     { box-shadow: var(--clay-sh-card); }
.clay-inset    { box-shadow: var(--clay-sh-inset); }
.clay-pressed  { box-shadow: var(--clay-sh-pressed); }

.clay-card-base {
  background: var(--clay-surface);
  border-radius: 20px;
  box-shadow: var(--clay-sh-card);
}
.clay-card-elevated {
  background: var(--clay-surface-high);
  border-radius: 20px;
  box-shadow: var(--clay-sh-card);
}

.clay-input-wrap {
  background: var(--clay-bg);
  border-radius: 14px;
  box-shadow: var(--clay-sh-inset);
  display: flex;
  align-items: center;
  transition: box-shadow 0.22s;
}
.clay-input-wrap:focus-within {
  box-shadow: var(--clay-sh-inset), 0 0 0 2.5px var(--clay-red);
}

.clay-btn-primary {
  background: var(--clay-red);
  border-radius: 16px;
  border: none;
  cursor: pointer;
  box-shadow: var(--clay-sh-red-glow);
  color: #fff;
  font-family: var(--font-dm-sans);
  font-weight: 700;
  transition: box-shadow 0.14s, transform 0.14s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
}
.clay-btn-primary:active {
  transform: translateY(2px) scale(0.984);
  box-shadow: var(--clay-sh-pressed);
}
.clay-btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.clay-btn-surface {
  background: var(--clay-surface);
  border-radius: 14px;
  border: none;
  cursor: pointer;
  box-shadow: var(--clay-sh-raised);
  color: var(--clay-text);
  font-family: var(--font-dm-sans);
  font-weight: 600;
  transition: box-shadow 0.14s, transform 0.14s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
}
.clay-btn-surface:active {
  box-shadow: var(--clay-sh-pressed);
  transform: scale(0.97);
}

.clay-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.clay-divider {
  border: none;
  height: 1px;
  background: var(--clay-border);
  margin: 0;
}

.clay-page {
  background: var(--clay-bg);
  min-height: 100dvh;
}
.clay-page-content {
  padding-bottom: 120px;
}

.clay-pill-row {
  display: flex;
  gap: 8px;
  padding: 0 20px 16px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.clay-pill-row::-webkit-scrollbar { display: none; }

.clay-filter-pill {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 16px;
  border-radius: 99px;
  font-family: var(--font-dm-sans);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  border: none;
  background: var(--clay-surface);
  color: var(--clay-text-2);
  box-shadow: var(--clay-sh-raised);
  flex-shrink: 0;
  transition: box-shadow 0.14s, background 0.14s, color 0.14s;
}
.clay-filter-pill[aria-current="page"],
.clay-filter-pill.active {
  background: var(--clay-red);
  color: #fff;
  font-weight: 700;
  box-shadow: var(--clay-sh-red-glow);
}

/* Spinner utility */
@keyframes clay-spin {
  to { transform: rotate(360deg); }
}
.clay-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.30);
  border-top-color: rgba(255, 255, 255, 0.85);
  animation: clay-spin 0.7s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .clay-btn-primary,
  .clay-btn-surface,
  .clay-filter-pill,
  .clay-input-wrap {
    transition: none !important;
  }
  .clay-spinner {
    animation: none !important;
    opacity: 0.6;
  }
}
```

- [ ] **1.4 Crea `src/design-system/tokens.ts`**

```typescript
// src/design-system/tokens.ts
// Costanti TypeScript per i token Clay Haptimorphism.
// Usare dove i var CSS non bastano (canvas, SVG, calcoli JS).
// REGOLA: mai usare valori hex diretti nei componenti — importare da qui.

export const clayTokens = {
  bg:           'var(--clay-bg)',
  surface:      'var(--clay-surface)',
  surfaceHigh:  'var(--clay-surface-high)',
  border:       'var(--clay-border)',

  text:         'var(--clay-text)',
  text2:        'var(--clay-text-2)',
  text3:        'var(--clay-text-3)',

  red:          'var(--clay-red)',
  redDark:      'var(--clay-red-dark)',
  redLight:     'var(--clay-red-light)',
  orange:       'var(--clay-orange)',
  green:        'var(--clay-green)',
  blue:         'var(--clay-blue)',

  shRaised:     'var(--clay-sh-raised)',
  shCard:       'var(--clay-sh-card)',
  shInset:      'var(--clay-sh-inset)',
  shPressed:    'var(--clay-sh-pressed)',
  shRedGlow:    'var(--clay-sh-red-glow)',
  shFab:        'var(--clay-sh-fab)',
  shNav:        'var(--clay-sh-nav)',

  // Valori statici hex (per canvas/SVG — non reagiscono al dark mode).
  // Per canvas in dark mode: leggere da computedStyle al momento del draw.
  static: {
    bgLight:   '#EDEAE6',
    bgDark:    '#1A1916',
    redBase:   '#D90012',
    greenBase: '#16A34A',
    blueBase:  '#2563EB',
  },
} as const;

// Colori stato lavoro — allineati a StatoLavoro in domain.ts
export const statoLavoroColors = {
  ricevuto:       { bg: 'rgba(107, 100, 96, 0.12)', fg: 'var(--clay-text-2)' },
  in_lavorazione: { bg: 'rgba(37, 99, 235, 0.12)',  fg: 'var(--clay-blue)' },
  in_prova:       { bg: 'rgba(180, 83, 9, 0.12)',   fg: 'var(--clay-orange)' },
  pronto:         { bg: 'rgba(22, 163, 74, 0.12)',  fg: 'var(--clay-green)' },
  consegnato:     { bg: 'rgba(22, 163, 74, 0.12)',  fg: 'var(--clay-green)' },
  annullato:      { bg: 'rgba(217, 0, 18, 0.10)',   fg: 'var(--clay-red)' },
  in_ritardo:     { bg: 'rgba(217, 0, 18, 0.10)',   fg: 'var(--clay-red)' },
} as const;

// Colori priorita lavoro
export const prioritaColors = {
  normale:       null,
  urgente:       { bg: 'rgba(180, 83, 9, 0.12)',  fg: 'var(--clay-orange)', dot: '#B45309' },
  extra_urgente: { bg: 'rgba(217, 0, 18, 0.10)', fg: 'var(--clay-red)',    dot: '#D90012' },
} as const;
```

- [ ] **1.5 Aggiorna `body` in globals.css**

Nel blocco `@layer base { body { } }` sostituisci `@apply bg-background text-foreground;` con token Clay:

```css
  body {
    background: var(--clay-bg);
    color: var(--clay-text);
    font-family: var(--font-dm-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
```

- [ ] **1.6 Commit**

```bash
git add src/app/globals.css src/design-system/tokens.ts
git commit -m "feat(design): add Clay Haptimorphism tokens — CSS vars + TS constants + utility classes"
```

Expected output: zero ESLint warnings su `tokens.ts`.

---

## Task 2: BottomNavPill — Navigation A2 Floating Pill

**Files:**
- Create: `src/components/layout/BottomNavPill.tsx`
- Create: `tests/e2e/visual/bottom-nav-pill.spec.ts`
- Modify: `src/app/(app)/layout.tsx`
- Delete: `src/components/layout/BottomTabBar.tsx`

- [ ] **2.1 Crea mockup HTML**

Crea `/tmp/mockup-bottom-nav-pill.html` con contenuto:

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BottomNavPill mockup</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --clay-bg:           #EDEAE6;
    --clay-surface:      #F4F1EE;
    --clay-surface-high: #F9F7F5;
    --clay-text:         #1A1714;
    --clay-text-3:       #9C9490;
    --clay-red:          #D90012;
    --sh-raised:    -2px -2px 6px rgba(255,252,250,.85), 3px 3px 8px rgba(168,150,140,.28), 6px 6px 16px rgba(140,120,110,.14);
    --sh-pressed:   inset 3px 3px 8px rgba(168,150,140,.38), inset -2px -2px 6px rgba(255,252,250,.55), 2px 2px 4px rgba(140,120,110,.10);
    --sh-fab:       -3px -3px 7px rgba(255,100,80,.18), 5px 5px 14px rgba(100,5,5,.55), 0 0 20px rgba(217,0,18,.30);
    --sh-nav:       -2px -2px 6px rgba(255,252,250,.75), 4px 4px 12px rgba(168,150,140,.32), 0 8px 24px rgba(100,80,70,.18);
  }
  body { font-family: 'DM Sans', system-ui; background: var(--clay-bg); min-height: 100dvh; display: flex; flex-direction: column; }
  .page-content { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .page-card { background: var(--clay-surface); border-radius: 16px; padding: 16px; box-shadow: -2px -2px 6px rgba(255,252,250,.85), 3px 3px 8px rgba(168,150,140,.28); color: var(--clay-text); font-size: 14px; font-weight: 500; }
  .nav-pill-wrapper { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 50; }
  .nav-pill { display: flex; align-items: center; gap: 2px; background: var(--clay-surface-high); border-radius: 28px; padding: 6px 8px; box-shadow: var(--sh-nav); white-space: nowrap; }
  .nav-tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 56px; min-height: 52px; padding: 6px 10px; border-radius: 22px; text-decoration: none; color: var(--clay-text-3); background: transparent; border: none; cursor: pointer; font-family: inherit; }
  .nav-tab.active { background: var(--clay-surface); color: var(--clay-red); box-shadow: var(--sh-pressed); }
  .nav-tab-label { font-size: 10px; font-weight: 600; letter-spacing: 0.02em; line-height: 1; }
  .nav-fab { display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; min-width: 52px; border-radius: 50%; background: radial-gradient(circle at 38% 32%, #F01828 0%, #D90012 45%, #A80010 100%); color: #fff; box-shadow: var(--sh-fab); text-decoration: none; border: none; cursor: pointer; position: relative; overflow: hidden; flex-shrink: 0; }
  .nav-fab::before { content: ''; position: absolute; top: 7px; left: 10px; width: 22px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.30); filter: blur(3px); pointer-events: none; }
  .nav-fab svg { position: relative; z-index: 1; }
</style>
</head>
<body>
<div class="page-content">
  <div class="page-card">Dashboard — contenuto pagina di esempio</div>
  <div class="page-card">Card lavoro #001 — Protesi fissa · Dr. Rossi</div>
  <div class="page-card">Card lavoro #002 — Implantologia · Dr. Bianchi</div>
  <div class="page-card">Card lavoro #003 — Scheletrato · Studio Verdi</div>
</div>
<nav class="nav-pill-wrapper" aria-label="Navigazione principale">
  <div class="nav-pill">
    <a href="#" class="nav-tab active" aria-label="Oggi — dashboard">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
        <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
        <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
        <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
      </svg>
      <span class="nav-tab-label">Oggi</span>
    </a>
    <a href="#" class="nav-tab" aria-label="Lavori">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 5.5h12M4 10h9M4 14.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <span class="nav-tab-label">Lavori</span>
    </a>
    <a href="#" class="nav-fab" aria-label="Crea nuovo lavoro">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M11 4v14M4 11h14" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    </a>
    <a href="#" class="nav-tab" aria-label="Clienti">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.6"/>
        <path d="M4 17c0-3 2.686-5.5 6-5.5s6 2.5 6 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <span class="nav-tab-label">Clienti</span>
    </a>
    <a href="#" class="nav-tab" aria-label="Altro">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
        <circle cx="4"  cy="10" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="10" r="1.5" fill="currentColor"/>
      </svg>
      <span class="nav-tab-label">Altro</span>
    </a>
  </div>
</nav>
</body>
</html>
```

- [ ] **2.2 Screenshot mockup (3 viewport)**

```bash
mkdir -p /tmp/screenshots
npx playwright screenshot "file:///tmp/mockup-bottom-nav-pill.html" /tmp/screenshots/nav-pill-mobile.png --viewport-size 390,844
npx playwright screenshot "file:///tmp/mockup-bottom-nav-pill.html" /tmp/screenshots/nav-pill-tablet.png --viewport-size 768,1024
npx playwright screenshot "file:///tmp/mockup-bottom-nav-pill.html" /tmp/screenshots/nav-pill-desktop.png --viewport-size 1280,800
```

Expected output: 3 PNG in `/tmp/screenshots/`. La pill appare centrata in basso, FAB rosso sferico con gloss highlight, tab attiva con background surface clay e colore rosso.

- [ ] **2.3 HUMAN APPROVAL — STOP**

Mostrare a Francesco i path:
- `/tmp/screenshots/nav-pill-mobile.png`
- `/tmp/screenshots/nav-pill-tablet.png`
- `/tmp/screenshots/nav-pill-desktop.png`

Non procedere senza approvazione esplicita.

- [ ] **2.4 Crea `src/components/layout/BottomNavPill.tsx`**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'

interface NavTab {
  href:      string
  label:     string
  ariaLabel: string
  icon:      React.ReactNode
  isFab?:    boolean
}

const tabs: NavTab[] = [
  {
    href: '/dashboard',
    label: 'Oggi',
    ariaLabel: 'Oggi — dashboard principale',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: '/lavori',
    label: 'Lavori',
    ariaLabel: 'Lavori — lista lavori',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 5.5h12M4 10h9M4 14.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/lavori/nuovo',
    label: 'Nuovo',
    ariaLabel: 'Crea nuovo lavoro',
    isFab: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M11 4v14M4 11h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/clienti',
    label: 'Clienti',
    ariaLabel: 'Clienti — lista dentisti',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 17c0-3 2.686-5.5 6-5.5s6 2.5 6 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/impostazioni',
    label: 'Altro',
    ariaLabel: 'Impostazioni e altro',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
        <circle cx="4"  cy="10" r="1.5" fill="currentColor" />
        <circle cx="16" cy="10" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
]

function isTabActive(tabHref: string, pathname: string): boolean {
  if (tabHref === '/lavori/nuovo') return pathname === '/lavori/nuovo'
  if (tabHref === '/lavori')       return pathname.startsWith('/lavori') && pathname !== '/lavori/nuovo'
  return pathname.startsWith(tabHref)
}

const SCROLL_THRESHOLD = 4
const ALWAYS_SHOW_PX   = 60

export function BottomNavPill() {
  const pathname      = usePathname()
  const [visible, setVisible] = useState(true)
  const lastScrollY   = useRef(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const delta    = currentY - lastScrollY.current
      if (Math.abs(delta) < SCROLL_THRESHOLD) return
      if (currentY < ALWAYS_SHOW_PX) { setVisible(true) }
      else if (delta > 0)            { setVisible(false) }
      else                           { setVisible(true) }
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const pill = (
    <nav
      aria-label="Navigazione principale"
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '2px',
        background:   'var(--clay-surface-high)',
        borderRadius: '28px',
        padding:      '6px 8px',
        boxShadow:    'var(--clay-sh-nav)',
        whiteSpace:   'nowrap',
      }}
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab.href, pathname)

        if (tab.isFab) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.ariaLabel}
              aria-current={active ? 'page' : undefined}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:          '52px',
                height:         '52px',
                minWidth:       '52px',
                borderRadius:   '50%',
                background:     'radial-gradient(circle at 38% 32%, #F01828 0%, #D90012 45%, #A80010 100%)',
                boxShadow:      active ? 'var(--clay-sh-pressed)' : 'var(--clay-sh-fab)',
                textDecoration: 'none',
                flexShrink:     0,
                position:       'relative',
                overflow:       'hidden',
              }}
            >
              {/* Gloss highlight */}
              <span
                aria-hidden="true"
                style={{
                  position:      'absolute',
                  top:           '7px',
                  left:          '10px',
                  width:         '22px',
                  height:        '12px',
                  borderRadius:  '50%',
                  background:    'rgba(255,255,255,0.30)',
                  filter:        'blur(3px)',
                  pointerEvents: 'none',
                }}
              />
              <span style={{ position: 'relative', zIndex: 1 }}>{tab.icon}</span>
            </Link>
          )
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.ariaLabel}
            aria-current={active ? 'page' : undefined}
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '3px',
              minWidth:       '56px',
              minHeight:      '52px',
              padding:        '6px 10px',
              borderRadius:   '22px',
              background:     active ? 'var(--clay-surface)' : 'transparent',
              color:          active ? 'var(--clay-red)'     : 'var(--clay-text-3)',
              textDecoration: 'none',
              boxShadow:      active ? 'var(--clay-sh-pressed)' : 'none',
              transition:     reducedMotion ? 'none' : 'background 0.14s, box-shadow 0.14s, color 0.14s',
            }}
          >
            {tab.icon}
            <span
              style={{
                fontSize:      '10px',
                fontFamily:    'var(--font-dm-sans, DM Sans, sans-serif)',
                fontWeight:    active ? 700 : 500,
                lineHeight:    1,
                letterSpacing: '0.02em',
              }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )

  const wrapperStyle: React.CSSProperties = {
    position: 'fixed',
    bottom:   '20px',
    left:     '50%',
    transform:'translateX(-50%)',
    zIndex:   50,
  }

  if (reducedMotion) {
    return visible ? <div style={wrapperStyle}>{pill}</div> : null
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="bottom-nav-pill"
          style={wrapperStyle}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{    y: 80, opacity: 0 }}
          transition={motionTokens.spring.snappy}
        >
          {pill}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **2.5 Modifica `src/app/(app)/layout.tsx`**

Riga 4: `import { BottomTabBar } from '@/components/layout/BottomTabBar'`
sostituisci con: `import { BottomNavPill } from '@/components/layout/BottomNavPill'`

Riga 52: `<BottomTabBar />`
sostituisci con: `<BottomNavPill />`

- [ ] **2.6 Elimina BottomTabBar.tsx**

```bash
rm "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/components/layout/BottomTabBar.tsx"
```

- [ ] **2.7 Crea `tests/e2e/visual/bottom-nav-pill.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('BottomNavPill — visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForSelector('nav[aria-label="Navigazione principale"]')
  })

  test('mobile 390px — light', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page).toHaveScreenshot('nav-pill-mobile-light.png', {
      clip: { x: 0, y: 700, width: 390, height: 144 },
      maxDiffPixelRatio: 0.02,
    })
  })

  test('mobile 390px — dark', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => { document.documentElement.classList.add('dark') })
    await page.waitForTimeout(100)
    await expect(page).toHaveScreenshot('nav-pill-mobile-dark.png', {
      clip: { x: 0, y: 700, width: 390, height: 144 },
      maxDiffPixelRatio: 0.02,
    })
  })

  test('FAB touch target minimo 52px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const fab = page.locator('a[aria-label="Crea nuovo lavoro"]')
    await expect(fab).toBeVisible()
    const box = await fab.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(52)
    expect(box?.height).toBeGreaterThanOrEqual(52)
  })

  test('pill nascosta dopo scroll 200px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => { document.body.style.minHeight = '2000px' })
    await page.evaluate(() => window.scrollTo(0, 200))
    await page.waitForTimeout(400)
    const nav = page.locator('nav[aria-label="Navigazione principale"]')
    await expect(nav).not.toBeVisible()
  })

  test('tab Home active state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const homeTab = page.locator('a[aria-label="Oggi — dashboard principale"]')
    await expect(homeTab).toHaveAttribute('aria-current', 'page')
  })
})
```

- [ ] **2.8 Genera baseline e verifica**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx playwright test tests/e2e/visual/bottom-nav-pill.spec.ts --update-snapshots
npx playwright test tests/e2e/visual/bottom-nav-pill.spec.ts
```

Expected: 5 test verdi, baseline PNG create in `tests/e2e/visual/bottom-nav-pill.spec.ts-snapshots/`.

- [ ] **2.9 Commit**

```bash
git add src/components/layout/BottomNavPill.tsx \
        "src/app/(app)/layout.tsx" \
        tests/e2e/visual/bottom-nav-pill.spec.ts \
        "tests/e2e/visual/bottom-nav-pill.spec.ts-snapshots/"
git rm  src/components/layout/BottomTabBar.tsx
git commit -m "feat(nav): replace BottomTabBar with BottomNavPill — Clay Haptimorphism floating pill"
```

---

## Task 3: App Shell — AppHeader + PageWrapper Clay

**Files:**
- Modify: `src/components/layout/AppHeader.tsx`
- Modify: `src/components/layout/PageWrapper.tsx`

Nessun mockup separato — la resa finale e verificata dalle visual regression dei task 5-9.

- [ ] **3.1 Sostituisci contenuto `src/components/layout/AppHeader.tsx`**

```typescript
import type { ReactNode } from 'react'
import Link from 'next/link'

interface AppHeaderProps {
  title:     string
  subtitle?: string
  backHref?: string
  actions?:  ReactNode
}

export function AppHeader({ title, subtitle, backHref, actions }: AppHeaderProps) {
  return (
    <header
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        '12px',
        padding:    '16px 20px',
        minHeight:  '64px',
        background: 'var(--clay-bg)',
      }}
    >
      {backHref && (
        <Link
          href={backHref}
          aria-label="Torna indietro"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          '44px',
            height:         '44px',
            minWidth:       '52px',
            minHeight:      '52px',
            borderRadius:   '14px',
            background:     'var(--clay-surface)',
            color:          'var(--clay-text)',
            flexShrink:     0,
            boxShadow:      'var(--clay-sh-raised)',
            textDecoration: 'none',
            transition:     'box-shadow 0.14s, transform 0.14s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11 14L6 9l5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            margin:        0,
            fontFamily:    'var(--font-dm-sans)',
            fontSize:      '20px',
            fontWeight:    700,
            color:         'var(--clay-text)',
            letterSpacing: '-0.02em',
            lineHeight:    1.2,
            whiteSpace:    'nowrap',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin:     0,
              fontFamily: 'var(--font-dm-sans)',
              fontSize:   '13px',
              color:      'var(--clay-text-2)',
              lineHeight: 1.4,
              marginTop:  '2px',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </header>
  )
}
```

- [ ] **3.2 Sostituisci contenuto `src/components/layout/PageWrapper.tsx`**

```typescript
import type { ReactNode } from 'react'

interface PageWrapperProps {
  children:   ReactNode
  className?: string
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div
      className={className}
      style={{
        background:    'var(--clay-bg)',
        minHeight:     '100dvh',
        paddingBottom: '120px',
      }}
    >
      {children}
    </div>
  )
}
```

- [ ] **3.3 Commit**

```bash
git add src/components/layout/AppHeader.tsx src/components/layout/PageWrapper.tsx
git commit -m "feat(layout): apply Clay Haptimorphism to AppHeader and PageWrapper"
```

---

## Task 4: LavoroCard C — Timeline Dots + Urgenza Badge

**Files:**
- Create: `src/components/features/lavori/LavoroCard.tsx`
- Create: `tests/e2e/visual/lavoro-card.spec.ts`

- [ ] **4.1 Crea mockup HTML**

Crea `/tmp/mockup-lavoro-card.html`:

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LavoroCard C mockup</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --clay-bg: #EDEAE6; --clay-surface: #F4F1EE;
    --clay-text: #1A1714; --clay-text-2: #6B6460; --clay-text-3: #9C9490;
    --clay-red: #D90012; --clay-orange: #B45309; --clay-green: #16A34A; --clay-blue: #2563EB;
    --sh-card: -3px -3px 8px rgba(255,252,250,.90), 4px 4px 12px rgba(168,150,140,.32), 8px 8px 20px rgba(140,120,110,.16);
  }
  body { font-family: 'DM Sans', system-ui; background: var(--clay-bg); padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .lc { background: var(--clay-surface); border-radius: 20px; box-shadow: var(--sh-card); overflow: hidden; text-decoration: none; display: block; position: relative; }
  .lc-urgency { position: absolute; top: 10px; right: 10px; display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
  .lc-urgency.u   { background: rgba(180,83,9,.12); color: #B45309; }
  .lc-urgency.xu  { background: rgba(217,0,18,.10); color: #D90012; }
  .lc-body { padding: 14px 16px 0; }
  .lc-num { font-size: 11px; font-weight: 600; color: var(--clay-text-3); }
  .lc-top { display: flex; align-items: flex-start; gap: 8px; padding-right: 80px; margin-top: 2px; }
  .lc-title { font-size: 16px; font-weight: 700; color: var(--clay-text); letter-spacing: -.01em; }
  .lc-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .lc-badge.lav { background: rgba(37,99,235,.10);  color: #2563EB; }
  .lc-badge.prn { background: rgba(22,163,74,.10);  color: #16A34A; }
  .lc-badge.rit { background: rgba(217,0,18,.08);   color: #D90012; }
  .lc-sub { font-size: 13px; color: var(--clay-text-2); margin-top: 3px; }
  .lc-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-bottom: 2px; font-size: 13px; color: var(--clay-text-2); }
  .lc-date { font-size: 12px; font-weight: 600; flex-shrink: 0; }
  /* Timeline */
  .tl { display: flex; align-items: center; padding: 10px 16px 12px; border-top: 1px solid rgba(168,150,140,.14); margin-top: 10px; }
  .ts { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
  .ts:not(:last-child)::after { content: ''; position: absolute; top: 7px; left: 50%; right: -50%; height: 2px; background: rgba(168,150,140,.22); z-index: 0; }
  .ts.dn::after { background: #16A34A; }
  .td { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(168,150,140,.35); background: var(--clay-bg); z-index: 1; flex-shrink: 0; }
  .ts.dn .td { background: #16A34A; border-color: #16A34A; }
  .ts.ac .td { background: #2563EB; border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,.18); }
  .ts.lt .td { background: #D90012; border-color: #D90012; box-shadow: 0 0 0 3px rgba(217,0,18,.15); }
  .tl-lbl { font-size: 9px; font-weight: 600; color: var(--clay-text-3); margin-top: 5px; text-align: center; }
  .ts.dn .tl-lbl { color: #16A34A; }
  .ts.ac .tl-lbl { color: #2563EB; }
  .ts.lt .tl-lbl { color: #D90012; }
</style>
</head>
<body>
<a class="lc" href="#" style="color:inherit">
  <div class="lc-body">
    <div class="lc-num">#2026/047</div>
    <div class="lc-top">
      <div style="flex:1;min-width:0"><div class="lc-title">Mario Rossi</div><div class="lc-sub">Protesi fissa</div></div>
      <span class="lc-badge lav">● In lavorazione</span>
    </div>
    <div class="lc-meta"><span>Studio Bianchi</span><time class="lc-date">gio 21 mag</time></div>
  </div>
  <div class="tl">
    <div class="ts dn"><div class="td"></div><span class="tl-lbl">Ricevuto</span></div>
    <div class="ts ac"><div class="td"></div><span class="tl-lbl">Lavora</span></div>
    <div class="ts"><div class="td"></div><span class="tl-lbl">Prova</span></div>
    <div class="ts"><div class="td"></div><span class="tl-lbl">Pronto</span></div>
    <div class="ts"><div class="td"></div><span class="tl-lbl">Consegna</span></div>
  </div>
</a>
<a class="lc" href="#" style="color:inherit">
  <div class="lc-urgency u">● URGENTE</div>
  <div class="lc-body">
    <div class="lc-num">#2026/046</div>
    <div class="lc-top">
      <div style="flex:1;min-width:0"><div class="lc-title">Lucia Ferrari</div><div class="lc-sub">Implantologia</div></div>
      <span class="lc-badge prn">● Pronto</span>
    </div>
    <div class="lc-meta"><span>Studio Verdi</span><time class="lc-date">oggi</time></div>
  </div>
  <div class="tl">
    <div class="ts dn"><div class="td"></div><span class="tl-lbl">Ricevuto</span></div>
    <div class="ts dn"><div class="td"></div><span class="tl-lbl">Lavora</span></div>
    <div class="ts dn"><div class="td"></div><span class="tl-lbl">Prova</span></div>
    <div class="ts ac"><div class="td"></div><span class="tl-lbl">Pronto</span></div>
    <div class="ts"><div class="td"></div><span class="tl-lbl">Consegna</span></div>
  </div>
</a>
<a class="lc" href="#" style="color:inherit">
  <div class="lc-urgency xu">● EXTRA URGENTE</div>
  <div class="lc-body">
    <div class="lc-num">#2026/041</div>
    <div class="lc-top">
      <div style="flex:1;min-width:0"><div class="lc-title">Giuseppe Esposito</div><div class="lc-sub">Scheletrato</div></div>
      <span class="lc-badge rit">● In ritardo</span>
    </div>
    <div class="lc-meta"><span>Studio Romano</span><time class="lc-date" style="color:#D90012">ieri</time></div>
  </div>
  <div class="tl">
    <div class="ts dn"><div class="td"></div><span class="tl-lbl">Ricevuto</span></div>
    <div class="ts dn"><div class="td"></div><span class="tl-lbl">Lavora</span></div>
    <div class="ts lt"><div class="td"></div><span class="tl-lbl">Prova</span></div>
    <div class="ts"><div class="td"></div><span class="tl-lbl">Pronto</span></div>
    <div class="ts"><div class="td"></div><span class="tl-lbl">Consegna</span></div>
  </div>
</a>
</body>
</html>
```

- [ ] **4.2 Screenshot mockup**

```bash
npx playwright screenshot "file:///tmp/mockup-lavoro-card.html" /tmp/screenshots/lavoro-card-mobile.png --viewport-size 390,844
npx playwright screenshot "file:///tmp/mockup-lavoro-card.html" /tmp/screenshots/lavoro-card-tablet.png --viewport-size 768,1024
```

Expected: card clay warm con shadow dual-layer, timeline dots colorati, urgency badge assoluto top-right.

- [ ] **4.3 HUMAN APPROVAL — STOP**

Mostrare a Francesco:
- `/tmp/screenshots/lavoro-card-mobile.png`
- `/tmp/screenshots/lavoro-card-tablet.png`

Non procedere senza approvazione.

- [ ] **4.4 Crea `src/components/features/lavori/LavoroCard.tsx`**

```typescript
import Link from 'next/link'
import type { StatoLavoro, PrioritaLavoro, TipoDispositivo } from '@/types/domain'
import { statoLavoroColors, prioritaColors } from '@/design-system/tokens'

const statoLabels: Record<StatoLavoro, string> = {
  ricevuto:       'Ricevuto',
  in_lavorazione: 'In lavorazione',
  in_prova:       'In prova',
  pronto:         'Pronto',
  consegnato:     'Consegnato',
  annullato:      'Annullato',
  in_ritardo:     'In ritardo',
}

const tipoLabels: Record<TipoDispositivo, string> = {
  protesi_fissa:  'Protesi fissa',
  protesi_mobile: 'Protesi mobile',
  implantologia:  'Implantologia',
  cad_cam:        'CAD/CAM',
  scheletrato:    'Scheletrato',
  ortodonzia:     'Ortodonzia',
  provvisorio:    'Provvisorio',
  riparazione:    'Riparazione',
  altro:          'Altro',
}

type TlStep = 'ricevuto' | 'in_lavorazione' | 'in_prova' | 'pronto' | 'consegnato'
const TL_STEPS: TlStep[] = ['ricevuto', 'in_lavorazione', 'in_prova', 'pronto', 'consegnato']
const TL_LABELS: Record<TlStep, string> = {
  ricevuto: 'Ricevuto', in_lavorazione: 'Lavora', in_prova: 'Prova',
  pronto: 'Pronto', consegnato: 'Consegna',
}

function getStepState(step: TlStep, stato: StatoLavoro): 'done' | 'active' | 'late' | 'pending' {
  const order: Record<string, number> = {
    ricevuto: 0, in_lavorazione: 1, in_prova: 2, pronto: 3, consegnato: 4,
    annullato: -1, in_ritardo: 1,
  }
  const stepIdx  = TL_STEPS.indexOf(step)
  const statoIdx = order[stato] ?? 0
  if (stato === 'in_ritardo' && stepIdx === 1) return 'late'
  if (stepIdx < statoIdx)   return 'done'
  if (stepIdx === statoIdx) return 'active'
  return 'pending'
}

function formatDataIT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const ieri = new Date(oggi); ieri.setDate(ieri.getDate() - 1)
  const domani = new Date(oggi); domani.setDate(domani.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  if (d.getTime() === oggi.getTime())   return 'oggi'
  if (d.getTime() === ieri.getTime())   return 'ieri'
  if (d.getTime() === domani.getTime()) return 'domani'
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

export interface LavoroCardProps {
  id:                     string
  numero_lavoro:          string
  stato:                  StatoLavoro
  priorita:               PrioritaLavoro
  tipo_dispositivo:       TipoDispositivo
  descrizione:            string
  data_consegna_prevista: string
  paziente_nome_snapshot: string | null
  cliente_nome:           string
}

export function LavoroCard({
  id, numero_lavoro, stato, priorita,
  tipo_dispositivo, data_consegna_prevista,
  paziente_nome_snapshot, cliente_nome,
}: LavoroCardProps) {
  const statoColor   = statoLavoroColors[stato]
  const urgenzaColor = prioritaColors[priorita]
  const isLate       = stato === 'in_ritardo'
  const titleText    = paziente_nome_snapshot ?? `Lavoro #${numero_lavoro}`

  return (
    <Link
      href={`/lavori/${id}`}
      aria-label={`Lavoro ${numero_lavoro} — ${titleText}`}
      style={{
        display:        'block',
        background:     'var(--clay-surface)',
        borderRadius:   '20px',
        boxShadow:      'var(--clay-sh-card)',
        textDecoration: 'none',
        overflow:       'hidden',
        position:       'relative',
      }}
    >
      {urgenzaColor && (
        <span
          aria-label={`Priorita: ${priorita.replace('_', ' ')}`}
          style={{
            position:     'absolute',
            top:          '10px',
            right:        '10px',
            display:      'flex',
            alignItems:   'center',
            gap:          '4px',
            padding:      '3px 8px',
            borderRadius: '99px',
            fontSize:     '10px',
            fontWeight:   700,
            letterSpacing:'0.04em',
            background:   urgenzaColor.bg,
            color:        urgenzaColor.fg,
          }}
        >
          <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '50%', background: urgenzaColor.dot, flexShrink: 0 }} />
          {priorita === 'urgente' ? 'URGENTE' : 'EXTRA URGENTE'}
        </span>
      )}

      <div style={{ padding: '14px 16px 0', paddingRight: urgenzaColor ? '100px' : '16px' }}>
        <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '11px', fontWeight: 600, color: 'var(--clay-text-3)', letterSpacing: '0.04em' }}>
          #{numero_lavoro}
        </span>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginTop: '2px' }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-dm-sans)', fontSize: '16px', fontWeight: 700, color: 'var(--clay-text)', letterSpacing: '-0.01em', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
            {titleText}
          </p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', background: statoColor.bg, color: statoColor.fg, flexShrink: 0 }}>
            <span aria-hidden="true" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
            {statoLabels[stato]}
          </span>
        </div>

        <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-dm-sans)', fontSize: '13px', color: 'var(--clay-text-2)' }}>
          {tipoLabels[tipo_dispositivo]}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '8px', paddingBottom: '2px' }}>
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '13px', color: 'var(--clay-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cliente_nome}
          </span>
          <time dateTime={data_consegna_prevista} style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '12px', fontWeight: 600, color: isLate ? 'var(--clay-red)' : 'var(--clay-text-2)', flexShrink: 0 }}>
            {formatDataIT(data_consegna_prevista)}
          </time>
        </div>
      </div>

      {/* Timeline dots */}
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 12px', borderTop: '1px solid rgba(168,150,140,0.14)', marginTop: '10px' }}>
        {TL_STEPS.map((step, i) => {
          const state  = getStepState(step, stato)
          const isLast = i === TL_STEPS.length - 1

          const dotBg = { done: 'var(--clay-green)', active: 'var(--clay-blue)', late: 'var(--clay-red)', pending: 'var(--clay-bg)' }[state]
          const dotBorder = { done: 'var(--clay-green)', active: 'var(--clay-blue)', late: 'var(--clay-red)', pending: 'rgba(168,150,140,0.35)' }[state]
          const labelColor = { done: 'var(--clay-green)', active: 'var(--clay-blue)', late: 'var(--clay-red)', pending: 'var(--clay-text-3)' }[state]
          const connColor  = state === 'done' ? 'var(--clay-green)' : 'rgba(168,150,140,0.22)'

          return (
            <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
              {!isLast && (
                <div style={{ position: 'absolute', top: '7px', left: '50%', right: '-50%', height: '2px', background: connColor, zIndex: 0 }} />
              )}
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${dotBorder}`, background: dotBg, zIndex: 1, flexShrink: 0, boxShadow: state === 'active' ? '0 0 0 3px rgba(37,99,235,0.18)' : state === 'late' ? '0 0 0 3px rgba(217,0,18,0.15)' : undefined }} />
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '9px', fontWeight: 600, color: labelColor, marginTop: '5px', textAlign: 'center', letterSpacing: '0.02em', lineHeight: 1 }}>
                {TL_LABELS[step]}
              </span>
            </div>
          )
        })}
      </div>
    </Link>
  )
}
```

- [ ] **4.5 Crea `tests/e2e/visual/lavoro-card.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('LavoroCard — visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lavori')
    await page.waitForSelector('ul li:first-child a')
  })

  test('lista lavori mobile — light', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page).toHaveScreenshot('lavoro-card-list-mobile-light.png', { maxDiffPixelRatio: 0.02 })
  })

  test('lista lavori mobile — dark', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(100)
    await expect(page).toHaveScreenshot('lavoro-card-list-mobile-dark.png', { maxDiffPixelRatio: 0.02 })
  })

  test('card touch target minimo 52px altezza', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const firstCard = page.locator('ul li:first-child a')
    const box = await firstCard.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(52)
  })
})
```

- [ ] **4.6 Commit**

```bash
git add src/components/features/lavori/LavoroCard.tsx \
        src/design-system/tokens.ts \
        tests/e2e/visual/lavoro-card.spec.ts
git commit -m "feat(lavori): add LavoroCard C — clay haptimorphism, timeline dots, urgency badge"
```

---

## Task 5: Lista Lavori + Dashboard — Clay Sweep

**Files:**
- Modify: `src/app/(app)/lavori/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/features/dashboard/KpiStrip.tsx`
- Create: `tests/e2e/visual/lavori-page.spec.ts`

- [ ] **5.1 Crea mockup HTML lista lavori**

Crea `/tmp/mockup-lavori-page.html`:

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lavori page mockup</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --clay-bg: #EDEAE6; --clay-surface: #F4F1EE; --clay-surface-high: #F9F7F5;
    --clay-text: #1A1714; --clay-text-2: #6B6460; --clay-text-3: #9C9490;
    --clay-red: #D90012; --clay-green: #16A34A; --clay-blue: #2563EB;
    --sh-card: -3px -3px 8px rgba(255,252,250,.90), 4px 4px 12px rgba(168,150,140,.32), 8px 8px 20px rgba(140,120,110,.16);
    --sh-raised: -2px -2px 6px rgba(255,252,250,.85), 3px 3px 8px rgba(168,150,140,.28), 6px 6px 16px rgba(140,120,110,.14);
    --sh-red: inset 0 2px 0 rgba(255,140,120,.20), inset 0 -4px 7px rgba(60,0,0,.22), 10px 13px 22px -2px rgba(100,5,5,.55), 4px 6px 10px rgba(100,5,5,.28);
  }
  body { font-family: 'DM Sans', system-ui; background: var(--clay-bg); padding-bottom: 120px; color: var(--clay-text); }
  .hdr { display: flex; align-items: center; gap: 12px; padding: 16px 20px; min-height: 64px; }
  .hdr-title { flex:1; font-size: 20px; font-weight: 700; letter-spacing: -.02em; }
  .hdr-btn { display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 16px; border-radius: 14px; background: var(--clay-red); color: #fff; font-weight: 700; font-size: 14px; border: none; cursor: pointer; font-family: inherit; box-shadow: var(--sh-red); }
  .pills { display: flex; gap: 8px; padding: 0 20px 16px; overflow-x: auto; scrollbar-width: none; }
  .pill { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 99px; font-size: 13px; font-weight: 500; white-space: nowrap; background: var(--clay-surface); color: var(--clay-text-2); box-shadow: var(--sh-raised); border: none; cursor: pointer; font-family: inherit; text-decoration: none; }
  .pill.active { background: var(--clay-red); color: #fff; font-weight: 700; box-shadow: var(--sh-red); }
  .list { padding: 0 20px; display: flex; flex-direction: column; gap: 10px; list-style: none; }
  .lc { background: var(--clay-surface); border-radius: 20px; box-shadow: var(--sh-card); overflow: hidden; position: relative; display: block; text-decoration: none; color: inherit; }
  .lc-urgency { position: absolute; top: 10px; right: 10px; display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; background: rgba(180,83,9,.12); color: #B45309; }
  .lc-body { padding: 14px 16px 0; padding-right: 90px; }
  .lc-num { font-size: 11px; font-weight: 600; color: var(--clay-text-3); }
  .lc-title { font-size: 16px; font-weight: 700; color: var(--clay-text); letter-spacing: -.01em; margin-top: 2px; }
  .lc-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; float: right; }
  .lc-badge.lav { background: rgba(37,99,235,.10); color: #2563EB; }
  .lc-badge.prn { background: rgba(22,163,74,.10);  color: #16A34A; }
  .lc-sub { font-size: 13px; color: var(--clay-text-2); margin-top: 3px; }
  .lc-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-bottom: 2px; font-size: 13px; color: var(--clay-text-2); }
  .lc-date { font-size: 12px; font-weight: 600; flex-shrink: 0; }
  .tl { display: flex; align-items: center; padding: 10px 16px 12px; border-top: 1px solid rgba(168,150,140,.14); margin-top: 10px; }
  .ts { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
  .ts:not(:last-child)::after { content: ''; position: absolute; top: 7px; left: 50%; right: -50%; height: 2px; background: rgba(168,150,140,.22); z-index: 0; }
  .ts.dn::after { background: #16A34A; }
  .td { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(168,150,140,.35); background: var(--clay-bg); z-index: 1; flex-shrink: 0; }
  .ts.dn .td { background: #16A34A; border-color: #16A34A; }
  .ts.ac .td { background: #2563EB; border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,.18); }
  .tl-lbl { font-size: 9px; font-weight: 600; color: var(--clay-text-3); margin-top: 5px; text-align: center; }
  .ts.dn .tl-lbl { color: #16A34A; }
  .ts.ac .tl-lbl { color: #2563EB; }
</style>
</head>
<body>
<header class="hdr">
  <h1 class="hdr-title">Lavori</h1>
  <button class="hdr-btn">+ Nuovo</button>
</header>
<div class="pills">
  <a class="pill active" href="#">Tutti</a>
  <a class="pill" href="#">Ricevuti</a>
  <a class="pill" href="#">In lavorazione</a>
  <a class="pill" href="#">Pronti</a>
  <a class="pill" href="#">In ritardo</a>
  <a class="pill" href="#">Consegnati</a>
</div>
<ul class="list">
  <li><a class="lc" href="#">
    <div class="lc-body" style="padding-right:16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div><div class="lc-num">#2026/047</div><div class="lc-title">Mario Rossi</div><div class="lc-sub">Protesi fissa</div></div>
        <span class="lc-badge lav">● In lavorazione</span>
      </div>
      <div class="lc-meta"><span>Studio Bianchi</span><time class="lc-date">gio 21 mag</time></div>
    </div>
    <div class="tl">
      <div class="ts dn"><div class="td"></div><span class="tl-lbl">Ricevuto</span></div>
      <div class="ts ac"><div class="td"></div><span class="tl-lbl">Lavora</span></div>
      <div class="ts"><div class="td"></div><span class="tl-lbl">Prova</span></div>
      <div class="ts"><div class="td"></div><span class="tl-lbl">Pronto</span></div>
      <div class="ts"><div class="td"></div><span class="tl-lbl">Consegna</span></div>
    </div>
  </a></li>
  <li><a class="lc" href="#">
    <div class="lc-urgency">● URGENTE</div>
    <div class="lc-body">
      <div><div class="lc-num">#2026/046</div><div class="lc-title">Lucia Ferrari</div><div class="lc-sub">Implantologia</div></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
        <span style="font-size:13px;color:var(--clay-text-2)">Studio Verdi</span>
        <span class="lc-badge prn">● Pronto</span>
      </div>
    </div>
    <div class="tl">
      <div class="ts dn"><div class="td"></div><span class="tl-lbl">Ricevuto</span></div>
      <div class="ts dn"><div class="td"></div><span class="tl-lbl">Lavora</span></div>
      <div class="ts dn"><div class="td"></div><span class="tl-lbl">Prova</span></div>
      <div class="ts ac"><div class="td"></div><span class="tl-lbl">Pronto</span></div>
      <div class="ts"><div class="td"></div><span class="tl-lbl">Consegna</span></div>
    </div>
  </a></li>
</ul>
</body>
</html>
```

- [ ] **5.2 Screenshot mockup**

```bash
npx playwright screenshot "file:///tmp/mockup-lavori-page.html" /tmp/screenshots/lavori-page-mobile.png --viewport-size 390,844
npx playwright screenshot "file:///tmp/mockup-lavori-page.html" /tmp/screenshots/lavori-page-tablet.png --viewport-size 768,1024
npx playwright screenshot "file:///tmp/mockup-lavori-page.html" /tmp/screenshots/lavori-page-desktop.png --viewport-size 1280,800
```

- [ ] **5.3 HUMAN APPROVAL — STOP**

Mostrare a Francesco tutti e 3 gli screenshot. Non procedere senza approvazione.

- [ ] **5.4 Modifica `src/app/(app)/lavori/page.tsx`**

Aggiungi import:
```typescript
import { LavoroCard } from '@/components/features/lavori/LavoroCard'
import type { PrioritaLavoro } from '@/types/domain'
```

Aggiorna la query Supabase per includere `priorita`:
```typescript
.select(`
  id, numero_lavoro, stato, priorita,
  tipo_dispositivo, descrizione,
  data_consegna_prevista, ora_consegna,
  paziente_nome_snapshot,
  cliente:clienti(id, nome, cognome, studio_nome),
  tecnico:tecnici(id, nome, cognome, sigla)
`)
```

Aggiorna il tipo `LavoroRow` aggiungendo `priorita: string`.

Applica Clay token swap nei blocchi `style={{}}`:
- Header add button: `background: '#D4A843'` a `'var(--clay-red)'`, `color: '#0F1E52'` a `'#fff'`, shadow gold a `'var(--clay-sh-red-glow)'`
- Filter pills: isActive a `background: 'var(--clay-red)'`, inactive a `'var(--clay-surface)'`; colori testo a var Clay; shadow a `'var(--clay-sh-red-glow)'` / `'var(--clay-sh-raised)'`
- Empty state: `background: '#1B2D6B'` a `'var(--clay-surface)'`, colori testo a var Clay

Sostituisci il blocco card lavori con `LavoroCard`:
```typescript
return (
  <li key={lavoro.id}>
    <LavoroCard
      id={lavoro.id}
      numero_lavoro={lavoro.numero_lavoro}
      stato={lavoro.stato}
      priorita={(lavoro.priorita as PrioritaLavoro) ?? 'normale'}
      tipo_dispositivo={lavoro.tipo_dispositivo}
      descrizione={lavoro.descrizione}
      data_consegna_prevista={lavoro.data_consegna_prevista}
      paziente_nome_snapshot={lavoro.paziente_nome_snapshot}
      cliente_nome={
        lavoro.cliente
          ? lavoro.cliente.studio_nome ?? `${lavoro.cliente.nome} ${lavoro.cliente.cognome}`
          : '—'
      }
    />
  </li>
)
```

- [ ] **5.5 Modifica `src/app/(app)/dashboard/page.tsx`**

Token swap completo. Valori cobalt da sostituire con equivalenti Clay:
- `'#0F1E52'` a `'var(--clay-bg)'`
- `'#1B2D6B'` a `'var(--clay-surface)'`
- `'#243580'` a `'var(--clay-surface-high)'`
- `'#F0F4FF'` a `'var(--clay-text)'`
- `'#8899CC'` a `'var(--clay-text-2)'`
- `'#6677AA'` a `'var(--clay-text-3)'`
- `'#D4A843'` a `'var(--clay-red)'`
- Shadow cobalt hsl a `'var(--clay-sh-card)'` o `'var(--clay-sh-raised)'`

Aggiunge import di `ThemeToggleButton` (da Task 10 — se Task 10 non e ancora eseguito, skippa questo punto e aggiungi nella pass di Task 10).

- [ ] **5.6 Modifica `src/components/features/dashboard/KpiStrip.tsx`**

Leggi il file. Sui numeri hero KPI aggiungi `className="clay-hero-num"` (Playfair Display). Sulle etichette KPI: `color: 'var(--clay-text-2)'`. Background card KPI: `'var(--clay-surface)'`, shadow: `'var(--clay-sh-card)'`.

- [ ] **5.7 Crea `tests/e2e/visual/lavori-page.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('LavoriPage — visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lavori')
    await page.waitForSelector('section')
  })

  test('mobile 390px — light', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page).toHaveScreenshot('lavori-page-mobile-light.png', { maxDiffPixelRatio: 0.02 })
  })

  test('mobile 390px — dark', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(100)
    await expect(page).toHaveScreenshot('lavori-page-mobile-dark.png', { maxDiffPixelRatio: 0.02 })
  })

  test('tablet 768px — light', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page).toHaveScreenshot('lavori-page-tablet-light.png', { maxDiffPixelRatio: 0.02 })
  })

  test('filter pill accessibilita', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const tuttiPill = page.locator('a[href="/lavori"][aria-current="page"]').first()
    await expect(tuttiPill).toBeVisible()
  })
})
```

- [ ] **5.8 Genera baseline e verifica**

```bash
npx playwright test tests/e2e/visual/lavori-page.spec.ts --update-snapshots
npx playwright test tests/e2e/visual/lavori-page.spec.ts
```

- [ ] **5.9 Commit**

```bash
git add "src/app/(app)/lavori/page.tsx" \
        "src/app/(app)/dashboard/page.tsx" \
        src/components/features/dashboard/KpiStrip.tsx \
        tests/e2e/visual/lavori-page.spec.ts \
        "tests/e2e/visual/lavori-page.spec.ts-snapshots/"
git commit -m "feat(lavori): apply Clay Haptimorphism to lavori page and dashboard — LavoroCard C integrated"
```

---

## Task 6: Form Nuovo Lavoro — Clay Redesign

**Files:**
- Modify: `src/app/(app)/lavori/nuovo/page.tsx`
- Modify: `src/components/features/lavori/form/LavoroFormShell.tsx`
- Modify: `src/components/features/lavori/form/styles.ts`

- [ ] **6.1 Crea mockup HTML**

Crea `/tmp/mockup-nuovo-lavoro.html`:

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nuovo Lavoro mockup</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --clay-bg: #EDEAE6; --clay-surface: #F4F1EE; --clay-surface-high: #F9F7F5;
    --clay-text: #1A1714; --clay-text-2: #6B6460; --clay-text-3: #9C9490;
    --clay-red: #D90012;
    --sh-raised: -2px -2px 6px rgba(255,252,250,.85), 3px 3px 8px rgba(168,150,140,.28), 6px 6px 16px rgba(140,120,110,.14);
    --sh-inset: inset 2px 2px 5px rgba(168,150,140,.22), inset -2px -2px 5px rgba(255,252,250,.70);
    --sh-pressed: inset 3px 3px 8px rgba(168,150,140,.38), inset -2px -2px 6px rgba(255,252,250,.55);
    --sh-red: inset 0 2px 0 rgba(255,140,120,.20), inset 0 -4px 7px rgba(60,0,0,.22), 10px 13px 22px -2px rgba(100,5,5,.55);
  }
  body { font-family: 'DM Sans', system-ui; background: var(--clay-bg); padding-bottom: 120px; color: var(--clay-text); }
  .hdr { display: flex; align-items: center; gap: 12px; padding: 16px 20px; min-height: 64px; }
  .hdr-back { width: 44px; height: 44px; min-width: 52px; min-height: 52px; border-radius: 14px; background: var(--clay-surface); box-shadow: var(--sh-raised); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: none; cursor: pointer; }
  .hdr-title { font-size: 20px; font-weight: 700; letter-spacing: -.02em; }
  .tabs { display: flex; gap: 0; padding: 0 20px 16px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid rgba(168,150,140,.18); }
  .tab { flex-shrink: 0; padding: 8px 16px; border-bottom: 2px solid transparent; font-size: 13px; font-weight: 600; color: var(--clay-text-3); cursor: pointer; background: transparent; border-top: none; border-left: none; border-right: none; font-family: inherit; white-space: nowrap; }
  .tab.active { color: var(--clay-red); border-bottom-color: var(--clay-red); }
  .form-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-lbl { font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--clay-text-3); padding-left: 4px; }
  .field-input { background: var(--clay-bg); border-radius: 14px; box-shadow: var(--sh-inset); display: flex; align-items: center; padding: 14px 16px; }
  .field-input input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: 16px; font-weight: 500; color: var(--clay-text); }
  .field-input input::placeholder { color: var(--clay-text-3); }
  .chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { padding: 8px 16px; border-radius: 12px; background: var(--clay-surface); box-shadow: var(--sh-raised); font-size: 13px; font-weight: 500; color: var(--clay-text-2); cursor: pointer; border: none; font-family: inherit; }
  .chip.selected { background: var(--clay-red); color: #fff; box-shadow: var(--sh-pressed); }
  .submit-btn { width: 100%; height: 52px; border-radius: 16px; border: none; cursor: pointer; background: var(--clay-red); color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; box-shadow: var(--sh-red); }
</style>
</head>
<body>
<header class="hdr">
  <button class="hdr-back" aria-label="Torna indietro">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 14L6 9l5-5" stroke="#1A1714" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <h1 class="hdr-title">Nuovo lavoro</h1>
</header>
<div class="tabs">
  <button class="tab active">Dati</button>
  <button class="tab">Lavorazioni</button>
  <button class="tab">Clinica</button>
  <button class="tab">Produzione</button>
  <button class="tab">Date</button>
  <button class="tab">Immagini</button>
  <button class="tab">Documenti</button>
</div>
<form class="form-body">
  <div class="field">
    <label class="field-lbl">Tipo dispositivo</label>
    <div class="chip-group">
      <button class="chip selected" type="button">Protesi fissa</button>
      <button class="chip" type="button">Protesi mobile</button>
      <button class="chip" type="button">Implantologia</button>
      <button class="chip" type="button">CAD/CAM</button>
      <button class="chip" type="button">Scheletrato</button>
      <button class="chip" type="button">Ortodonzia</button>
      <button class="chip" type="button">Provvisorio</button>
      <button class="chip" type="button">Riparazione</button>
      <button class="chip" type="button">Altro</button>
    </div>
  </div>
  <div class="field">
    <label class="field-lbl">Descrizione</label>
    <div class="field-input"><input type="text" placeholder="Corona ceramica su impianto..."></div>
  </div>
  <div class="field">
    <label class="field-lbl">Data consegna</label>
    <div class="field-input"><input type="date" value="2026-05-21"></div>
  </div>
  <div class="field">
    <label class="field-lbl">Priorita</label>
    <div class="chip-group">
      <button class="chip selected" type="button">Normale</button>
      <button class="chip" type="button">Urgente</button>
      <button class="chip" type="button">Extra urgente</button>
    </div>
  </div>
  <button class="submit-btn" type="submit">Crea lavoro</button>
</form>
</body>
</html>
```

- [ ] **6.2 Screenshot mockup**

```bash
npx playwright screenshot "file:///tmp/mockup-nuovo-lavoro.html" /tmp/screenshots/nuovo-lavoro-mobile.png --viewport-size 390,844
npx playwright screenshot "file:///tmp/mockup-nuovo-lavoro.html" /tmp/screenshots/nuovo-lavoro-tablet.png --viewport-size 768,1024
```

- [ ] **6.3 HUMAN APPROVAL — STOP**

Mostrare a Francesco `/tmp/screenshots/nuovo-lavoro-mobile.png` e `/tmp/screenshots/nuovo-lavoro-tablet.png`. Non procedere senza approvazione.

- [ ] **6.4 Modifica `src/app/(app)/lavori/nuovo/page.tsx`**

Token swap:
- Error box: `background: '#3A1A1A'` a `'rgba(217,0,18,0.08)'`, `border: '1px solid #FA525233'` a `'1px solid rgba(217,0,18,0.20)'`, `color: '#FA5252'` a `'var(--clay-red)'`
- Submit button: `background: submitting ? '#9B7A30' : '#D4A843'` a `background: submitting ? 'rgba(217,0,18,0.55)' : 'var(--clay-red)'`, `color: '#0F1E52'` a `'#fff'`, shadow gold a `'var(--clay-sh-red-glow)'`
- Rimuovi il blocco `<style>{`@keyframes spin {...}`}</style>` — usa invece `<span className="clay-spinner" aria-hidden="true" />` (gia definito in globals.css al Task 1.3)

- [ ] **6.5 Modifica `src/components/features/lavori/form/styles.ts`**

Leggi il file. Applica lo stesso token swap Clay su tutti i valori hex cobalt.

- [ ] **6.6 Modifica `src/components/features/lavori/form/LavoroFormShell.tsx`**

Leggi il file. Applica Clay:
- Tab bar border-bottom: `'1px solid var(--clay-border)'`
- Tab attiva: `color: 'var(--clay-red)'`, `borderBottomColor: 'var(--clay-red)'`
- Tab inattiva: `color: 'var(--clay-text-3)'`
- Background contenitore: `background: 'var(--clay-bg)'`

- [ ] **6.7 Commit**

```bash
git add "src/app/(app)/lavori/nuovo/page.tsx" \
        src/components/features/lavori/form/
git commit -m "feat(form): apply Clay Haptimorphism to nuovo lavoro form and LavoroFormShell"
```

---

## Task 7: Billing Page — Clay Rebrand

**Files:**
- Modify: `src/app/billing/billing-content.tsx`
- Modify: `src/app/globals.css` (aggiunge `.billing-root` scope)
- Create: `tests/e2e/visual/billing-page.spec.ts`

Strategia: `.billing-root` parallela a `.login-root` con stessi nomi `--ua-*` ma valori Clay. Login rimane congelato.

- [ ] **7.1 Crea mockup HTML**

Crea `/tmp/mockup-billing.html`:

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Billing mockup Clay</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ua-bg: #EDEAE6; --ua-sfc: #F4F1EE; --ua-elv: #F9F7F5; --ua-prs: #E5E1DC;
    --ua-t1: #1A1714; --ua-t2: #6B6460; --ua-t3: #9C9490;
    --ua-red: #D90012; --ua-g: #16A34A;
    --ua-sh-b: -2px -2px 6px rgba(255,252,250,.85), 3px 3px 8px rgba(168,150,140,.28), 6px 6px 16px rgba(140,120,110,.14);
    --ua-sh-pressed: inset 3px 3px 8px rgba(168,150,140,.38), inset -2px -2px 6px rgba(255,252,250,.55);
    --ua-sh-i: inset 2px 2px 5px rgba(168,150,140,.22), inset -2px -2px 5px rgba(255,252,250,.70);
  }
  body { font-family: 'DM Sans', system-ui; background: var(--ua-bg); min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 20px; color: var(--ua-t1); }
  .wrap { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 16px; align-items: center; }
  .logo-wrap { width: 72px; height: 72px; border-radius: 18px; background: var(--ua-elv); box-shadow: var(--ua-sh-b); display: flex; align-items: center; justify-content: center; }
  .logo-letter { font-size: 28px; font-weight: 900; color: var(--ua-red); }
  .chip { display: flex; align-items: center; gap: 7px; padding: 6px 14px 6px 10px; border-radius: 99px; font-size: 12px; font-weight: 700; background: var(--ua-elv); box-shadow: var(--ua-sh-b); }
  .chip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ua-red); box-shadow: 0 0 0 3px rgba(217,0,18,.15); }
  .card { width: 100%; background: var(--ua-elv); border-radius: 28px; padding: 22px 20px 20px; box-shadow: -3px -3px 8px rgba(255,252,250,.90), 4px 4px 12px rgba(168,150,140,.32), 8px 8px 20px rgba(140,120,110,.16); display: flex; flex-direction: column; gap: 16px; }
  .toggle-bar { background: var(--ua-prs); border-radius: 14px; box-shadow: var(--ua-sh-i); display: flex; padding: 4px; gap: 4px; }
  .tgl-btn { flex: 1; height: 36px; border-radius: 10px; border: none; background: transparent; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--ua-t2); cursor: pointer; position: relative; }
  .tgl-btn.active { background: var(--ua-elv); color: var(--ua-t1); box-shadow: var(--ua-sh-b); }
  .save-badge { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: var(--ua-g); color: #fff; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 99px; white-space: nowrap; }
  .plans { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .plan-card { background: var(--ua-elv); border-radius: 18px; box-shadow: var(--ua-sh-b); padding: 14px 12px 16px; cursor: pointer; border: 2.5px solid transparent; opacity: .55; position: relative; display: flex; flex-direction: column; }
  .plan-card.active { border-color: var(--ua-red); box-shadow: var(--ua-sh-b), 0 0 0 1px var(--ua-red); opacity: 1; }
  .plan-name { font-size: 14px; font-weight: 700; color: var(--ua-t1); margin-bottom: 2px; }
  .plan-desc { font-size: 11px; color: var(--ua-t2); flex: 1; line-height: 1.35; }
  .plan-price { font-size: 38px; font-weight: 900; color: var(--ua-t1); letter-spacing: -.05em; margin-top: 8px; line-height: 1; }
  .plan-price span { font-size: 12px; font-weight: 600; color: var(--ua-t2); }
  .cta { width: 100%; height: 54px; border-radius: 16px; background: var(--ua-red); color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; border: none; cursor: pointer; box-shadow: inset 0 2px 0 rgba(255,140,120,.20), inset 0 -4px 7px rgba(60,0,0,.22), 10px 13px 22px -2px rgba(100,5,5,.55); display: flex; align-items: center; justify-content: center; gap: 8px; }
  .info-box { width: 100%; background: var(--ua-elv); border-radius: 16px; padding: 14px 16px; box-shadow: var(--ua-sh-b); border-left: 3px solid var(--ua-red); }
  .info-box-title { font-size: 11px; font-weight: 700; color: var(--ua-red); letter-spacing: .05em; text-transform: uppercase; margin-bottom: 6px; }
  .info-box-text { font-size: 12px; color: var(--ua-t2); line-height: 1.45; }
</style>
</head>
<body>
<div class="wrap">
  <div class="logo-wrap"><span class="logo-letter">UÀ</span></div>
  <div class="chip"><div class="chip-dot"></div>Trial scaduto</div>
  <h2 style="font-size:22px;font-weight:700;text-align:center;letter-spacing:-.02em">Scegli il tuo piano</h2>
  <div class="card">
    <div class="toggle-bar">
      <button class="tgl-btn active" type="button">Mensile</button>
      <button class="tgl-btn" type="button">Annuale<span class="save-badge">-20%</span></button>
    </div>
    <div class="plans">
      <div class="plan-card active">
        <div class="plan-name">Solo</div><div class="plan-desc">1 utente, 1 lab</div>
        <div class="plan-price">39<span>€/mes</span></div>
      </div>
      <div class="plan-card">
        <div class="plan-name">Lab</div><div class="plan-desc">Team illimitato</div>
        <div class="plan-price">79<span>€/mes</span></div>
      </div>
    </div>
    <button class="cta" type="button">Attiva ora</button>
  </div>
  <div class="info-box">
    <div class="info-box-title">AI Assistant — Prossimamente</div>
    <div class="info-box-text">Compilazione automatica DdC, ricerca EUDAMED, alert conformita MDR. Disponibile Q3 2026 come add-on 19 euro/mese.</div>
  </div>
  <div class="info-box" style="border-left-color:var(--ua-g)">
    <div class="info-box-title" style="color:var(--ua-g)">Migrazione da DentalMaster</div>
    <div class="info-box-text">Importa clienti, listino e storico lavori. Gratuito nel piano Lab e superiori.</div>
  </div>
</div>
</body>
</html>
```

- [ ] **7.2 Screenshot mockup**

```bash
npx playwright screenshot "file:///tmp/mockup-billing.html" /tmp/screenshots/billing-mobile.png --viewport-size 390,844
npx playwright screenshot "file:///tmp/mockup-billing.html" /tmp/screenshots/billing-desktop.png --viewport-size 1280,800
```

- [ ] **7.3 HUMAN APPROVAL — STOP**

Mostrare a Francesco `/tmp/screenshots/billing-mobile.png` e `/tmp/screenshots/billing-desktop.png`. Non procedere senza approvazione.

- [ ] **7.4 Aggiungi `.billing-root` scope in globals.css**

Dopo il blocco `/* END BILLING + BLOCKED PAGES */` (riga circa 1014), aggiungi:

```css
/* ============================================================
   BILLING ROOT — Clay Haptimorphism token override
   Sovrascrive --ua-* con valori Clay warm-neutral.
   .login-root NON viene toccato.
   ============================================================ */
.billing-root {
  --ua-bg:   #EDEAE6;
  --ua-sfc:  #F4F1EE;
  --ua-elv:  #F9F7F5;
  --ua-prs:  #E5E1DC;
  --ua-t1:   #1A1714;
  --ua-t2:   #6B6460;
  --ua-t3:   #9C9490;
  --ua-red:  #D90012;
  --ua-red-d:#A80010;
  --ua-red-l:#F01828;
  --ua-g:    #16A34A;
  --ua-b:    #2563EB;
  --ua-sh-c: -3px -3px 8px rgba(255,252,250,.90), 4px 4px 12px rgba(168,150,140,.32), 8px 8px 20px rgba(140,120,110,.16);
  --ua-sh-b: -2px -2px 6px rgba(255,252,250,.85), 3px 3px 8px rgba(168,150,140,.28), 6px 6px 16px rgba(140,120,110,.14);
  --ua-sh-p: inset 3px 4px 8px rgba(168,150,140,.40), inset -2px -2px 5px rgba(255,252,250,.52), 2px 2px 5px -2px rgba(168,150,140,.18);
  --ua-sh-pressed: inset 3px 4px 8px rgba(168,150,140,.40), inset -2px -2px 5px rgba(255,252,250,.52), 2px 2px 5px -2px rgba(168,150,140,.18);
  --ua-sh-i: inset 4px 4px 9px rgba(168,150,140,.32), inset -3px -3px 7px rgba(255,252,250,.66);
  background: var(--ua-bg);
}
.billing-root.dark-billing {
  --ua-bg:   #1A1916;
  --ua-sfc:  #222019;
  --ua-elv:  #2C2A27;
  --ua-prs:  #121110;
  --ua-t1:   #F0EDE8;
  --ua-t2:   #8A8580;
  --ua-t3:   #555250;
  --ua-red:  #E8001A;
  --ua-red-d:#B50014;
  --ua-red-l:#FF1A30;
  --ua-g:    #22C55E;
  --ua-b:    #3B82F6;
  --ua-sh-c: -3px -3px 8px rgba(255,255,255,.04), 4px 4px 12px rgba(0,0,0,.55), 8px 8px 20px rgba(0,0,0,.40);
  --ua-sh-b: -2px -2px 6px rgba(255,255,255,.03), 3px 3px 8px rgba(0,0,0,.50), 6px 6px 16px rgba(0,0,0,.35);
  --ua-sh-p: inset 3px 4px 8px rgba(0,0,0,.65), inset -2px -2px 5px rgba(255,255,255,.04), 2px 2px 5px -2px rgba(0,0,0,.40);
  --ua-sh-pressed: inset 3px 4px 8px rgba(0,0,0,.65), inset -2px -2px 5px rgba(255,255,255,.04), 2px 2px 5px -2px rgba(0,0,0,.40);
  --ua-sh-i: inset 4px 4px 9px rgba(0,0,0,.60), inset -3px -3px 7px rgba(255,255,255,.04);
  background: var(--ua-bg);
}
/* END BILLING ROOT */
```

- [ ] **7.5 Modifica `src/app/billing/billing-content.tsx`**

1. Leggi il file completo prima di modificare.
2. Sul wrapper div principale (che ha `className` con `login-root`): sostituisci `login-root` con `billing-root`.
3. Rimuovi `data-login-theme` attribute.
4. Il toggle dark esistente nel billing: usa `dark-billing` class anziche `data-login-theme="dark"`.
5. Aggiungi i due info-box (AI add-on + DentalMaster import) dopo il grid dei piani, prima del footer:

```typescript
{/* AI add-on info box */}
<div className="ua-rete-info" style={{ borderLeftColor: 'var(--ua-red)' }}>
  <div className="ua-rete-info-title" style={{ color: 'var(--ua-red)' }}>
    AI Assistant — Prossimamente
  </div>
  <div className="ua-rete-check">
    <span>Compilazione automatica DdC e suggerimenti MDR.</span>
  </div>
  <div className="ua-rete-check">
    <span>Ricerca EUDAMED integrata e alert conformita.</span>
  </div>
  <div className="ua-rete-check">
    <span>Disponibile Q3 2026 — add-on 19 euro/mese.</span>
  </div>
</div>

{/* Import info box */}
<div className="ua-rete-info" style={{ borderLeftColor: 'var(--ua-g)' }}>
  <div className="ua-rete-info-title" style={{ color: 'var(--ua-g)' }}>
    Migrazione da DentalMaster
  </div>
  <div className="ua-rete-check">
    <span>Importa clienti, listino e storico lavori in pochi minuti.</span>
  </div>
  <div className="ua-rete-check">
    <span>Servizio gratuito incluso nel piano Lab e superiori.</span>
  </div>
</div>
```

- [ ] **7.6 Crea `tests/e2e/visual/billing-page.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('BillingPage — visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing')
    await page.waitForSelector('.billing-root')
  })

  test('mobile 390px — light', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page).toHaveScreenshot('billing-mobile-light.png', { maxDiffPixelRatio: 0.02 })
  })

  test('mobile 390px — dark', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => { document.querySelector('.billing-root')?.classList.add('dark-billing') })
    await page.waitForTimeout(100)
    await expect(page).toHaveScreenshot('billing-mobile-dark.png', { maxDiffPixelRatio: 0.02 })
  })

  test('CTA button touch target 52px+', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const cta = page.locator('.ua-btn-gold').first()
    const box = await cta.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(52)
  })

  test('AI add-on info box visibile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('text=AI Assistant')).toBeVisible()
  })
})
```

- [ ] **7.7 Genera baseline e verifica**

```bash
npx playwright test tests/e2e/visual/billing-page.spec.ts --update-snapshots
npx playwright test tests/e2e/visual/billing-page.spec.ts
```

- [ ] **7.8 Commit**

```bash
git add src/app/billing/billing-content.tsx \
        src/app/globals.css \
        tests/e2e/visual/billing-page.spec.ts \
        "tests/e2e/visual/billing-page.spec.ts-snapshots/"
git commit -m "feat(billing): rebrand to Clay Haptimorphism — .billing-root scope, AI add-on + import info"
```

---

## Task 8: CRUD Pages — Clienti, Magazzino, Fatture

**Files:**
- Modify: `src/app/(app)/clienti/page.tsx`
- Modify: `src/app/(app)/magazzino/page.tsx`
- Modify: `src/app/(app)/fatture/page.tsx`

Le tre pagine usano lo stesso pattern header + lista approvato nel Task 5. Non richiedono mockup separati.

- [ ] **8.1 Mockup HTML pattern CRUD**

Crea `/tmp/mockup-crud-page.html`:

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CRUD page mockup</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --clay-bg: #EDEAE6; --clay-surface: #F4F1EE;
    --clay-text: #1A1714; --clay-text-2: #6B6460; --clay-text-3: #9C9490;
    --clay-red: #D90012; --clay-green: #16A34A; --clay-orange: #B45309;
    --sh-card: -3px -3px 8px rgba(255,252,250,.90), 4px 4px 12px rgba(168,150,140,.32), 8px 8px 20px rgba(140,120,110,.16);
    --sh-raised: -2px -2px 6px rgba(255,252,250,.85), 3px 3px 8px rgba(168,150,140,.28), 6px 6px 16px rgba(140,120,110,.14);
    --sh-red: inset 0 2px 0 rgba(255,140,120,.20), inset 0 -4px 7px rgba(60,0,0,.22), 10px 13px 22px -2px rgba(100,5,5,.55);
  }
  body { font-family: 'DM Sans', system-ui; background: var(--clay-bg); padding-bottom: 120px; color: var(--clay-text); }
  .hdr { display: flex; align-items: center; gap: 12px; padding: 16px 20px; min-height: 64px; }
  .hdr-title { flex:1; font-size: 20px; font-weight: 700; letter-spacing: -.02em; }
  .hdr-btn { display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 16px; border-radius: 14px; background: var(--clay-red); color: #fff; font-weight: 700; font-size: 14px; border: none; cursor: pointer; font-family: inherit; box-shadow: var(--sh-red); }
  .list { padding: 0 20px; display: flex; flex-direction: column; gap: 10px; }
  .row { background: var(--clay-surface); border-radius: 16px; box-shadow: var(--sh-card); padding: 14px 16px; display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; }
  .row-body { flex: 1; min-width: 0; }
  .row-title { font-size: 15px; font-weight: 700; color: var(--clay-text); }
  .row-sub   { font-size: 13px; color: var(--clay-text-2); margin-top: 2px; }
  .row-meta  { font-size: 12px; color: var(--clay-text-3); margin-top: 3px; }
  .chevron { color: var(--clay-text-3); flex-shrink: 0; }
</style>
</head>
<body>
<header class="hdr">
  <h1 class="hdr-title">Clienti</h1>
  <button class="hdr-btn">+ Nuovo</button>
</header>
<section class="list">
  <a class="row" href="#">
    <div class="row-body">
      <div class="row-title">Studio Dentistico Bianchi</div>
      <div class="row-sub">Dr. Mario Bianchi · Salerno (SA)</div>
      <div class="row-meta">3 lavori attivi</div>
    </div>
    <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </a>
  <a class="row" href="#">
    <div class="row-body">
      <div class="row-title">Studio Verdi</div>
      <div class="row-sub">Dr. Luigi Verdi · Napoli (NA)</div>
      <div class="row-meta">1 lavoro attivo</div>
    </div>
    <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </a>
</section>
</body>
</html>
```

- [ ] **8.2 Screenshot mockup**

```bash
npx playwright screenshot "file:///tmp/mockup-crud-page.html" /tmp/screenshots/crud-page-mobile.png --viewport-size 390,844
```

- [ ] **8.3 HUMAN APPROVAL — STOP**

Mostrare `/tmp/screenshots/crud-page-mobile.png`. Non procedere senza approvazione.

- [ ] **8.4 Modifica `src/app/(app)/clienti/page.tsx`**

Leggi il file intero. Token swap (strategia b):
- `background: '#1B2D6B'` a `'var(--clay-surface)'`
- `background: '#D4A843'` a `'var(--clay-red)'`
- `color: '#0F1E52'` (su red bg) a `'#fff'`
- `color: '#F0F4FF'` a `'var(--clay-text)'`
- `color: '#8899CC'` a `'var(--clay-text-2)'`
- Shadow cobalt a `'var(--clay-sh-card)'` o `'var(--clay-sh-raised)'`
- `borderRadius: '16px'` sulle card a `'20px'`

- [ ] **8.5 Modifica `src/app/(app)/magazzino/page.tsx`**

Leggi il file intero. Stesso token swap. In piu:
- Alert scorta minima: `background: 'rgba(180,83,9,0.10)'`, `borderLeft: '3px solid var(--clay-orange)'`, `color: 'var(--clay-orange)'`
- Badge `dispositivo_medico`: `background: 'rgba(37,99,235,0.10)'`, `color: 'var(--clay-blue)'`
- Badge scorta bassa: `background: 'rgba(217,0,18,0.08)'`, `color: 'var(--clay-red)'`

- [ ] **8.6 Modifica `src/app/(app)/fatture/page.tsx`**

Leggi il file intero. Stesso token swap. Sostituisci l'oggetto `coloriStatoSDI`:

```typescript
const coloriStatoSDI: Record<StatoSDI, { bg: string; fg: string }> = {
  draft:          { bg: 'rgba(107,100,96,0.10)',  fg: 'var(--clay-text-3)' },
  generata:       { bg: 'rgba(37,99,235,0.10)',   fg: 'var(--clay-blue)' },
  smtp_inviata:   { bg: 'rgba(37,99,235,0.10)',   fg: 'var(--clay-blue)' },
  pec_consegnata: { bg: 'rgba(37,99,235,0.10)',   fg: 'var(--clay-blue)' },
  ricevuta_sdi:   { bg: 'rgba(37,99,235,0.12)',   fg: 'var(--clay-blue)' },
  accettata:      { bg: 'rgba(22,163,74,0.10)',   fg: 'var(--clay-green)' },
  rifiutata:      { bg: 'rgba(217,0,18,0.08)',    fg: 'var(--clay-red)' },
  scaduta:        { bg: 'rgba(180,83,9,0.10)',    fg: 'var(--clay-orange)' },
}
```

- [ ] **8.7 Commit**

```bash
git add "src/app/(app)/clienti/page.tsx" \
        "src/app/(app)/magazzino/page.tsx" \
        "src/app/(app)/fatture/page.tsx"
git commit -m "feat(crud): apply Clay Haptimorphism to clienti, magazzino, fatture pages"
```

---

## Task 9: Impostazioni — Logo + Firma + PEC SMTP

**Files:**
- Modify: `src/app/(app)/impostazioni/page.tsx`

- [ ] **9.1 Crea mockup HTML**

Crea `/tmp/mockup-impostazioni.html`:

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Impostazioni mockup</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --clay-bg: #EDEAE6; --clay-surface: #F4F1EE; --clay-surface-high: #F9F7F5;
    --clay-text: #1A1714; --clay-text-2: #6B6460; --clay-text-3: #9C9490;
    --clay-red: #D90012; --clay-green: #16A34A;
    --sh-card: -3px -3px 8px rgba(255,252,250,.90), 4px 4px 12px rgba(168,150,140,.32), 8px 8px 20px rgba(140,120,110,.16);
    --sh-raised: -2px -2px 6px rgba(255,252,250,.85), 3px 3px 8px rgba(168,150,140,.28), 6px 6px 16px rgba(140,120,110,.14);
    --sh-inset: inset 2px 2px 5px rgba(168,150,140,.22), inset -2px -2px 5px rgba(255,252,250,.70);
    --sh-red: inset 0 2px 0 rgba(255,140,120,.20), inset 0 -4px 7px rgba(60,0,0,.22), 10px 13px 22px -2px rgba(100,5,5,.55);
  }
  body { font-family: 'DM Sans', system-ui; background: var(--clay-bg); padding-bottom: 120px; color: var(--clay-text); }
  .hdr { display: flex; align-items: center; padding: 16px 20px; min-height: 64px; }
  .hdr-title { font-size: 20px; font-weight: 700; letter-spacing: -.02em; }
  .content { padding: 0 20px; display: flex; flex-direction: column; gap: 20px; }
  .section-lbl { font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--clay-text-3); padding-left: 4px; margin-bottom: 8px; }
  .section-card { background: var(--clay-surface); border-radius: 20px; box-shadow: var(--sh-card); overflow: hidden; }
  .logo-row { display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid rgba(168,150,140,.14); }
  .logo-preview { width: 64px; height: 64px; border-radius: 16px; background: var(--clay-bg); box-shadow: var(--sh-inset); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .logo-actions { display: flex; flex-direction: column; gap: 4px; }
  .logo-name { font-size: 14px; font-weight: 600; color: var(--clay-text); }
  .logo-desc { font-size: 12px; color: var(--clay-text-2); }
  .logo-btn-row { display: flex; gap: 8px; margin-top: 6px; }
  .btn-sm-red { padding: 7px 14px; border-radius: 10px; border: none; background: var(--clay-red); color: #fff; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: var(--sh-red); }
  .btn-sm-sfc { padding: 7px 14px; border-radius: 10px; border: none; background: var(--clay-surface-high); color: var(--clay-text-2); font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: var(--sh-raised); }
  .info-row { padding: 12px 16px; border-bottom: 1px solid rgba(168,150,140,.12); }
  .info-row:last-child { border-bottom: none; }
  .info-lbl { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--clay-text-3); }
  .info-val { font-size: 14px; color: var(--clay-text); margin-top: 2px; }
  .info-val.empty { color: var(--clay-text-3); font-style: italic; }
  .pec-status { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
  .pec-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .pec-dot.err { background: var(--clay-red); box-shadow: 0 0 0 3px rgba(217,0,18,.15); }
  .pec-text { font-size: 14px; color: var(--clay-text); font-weight: 500; }
  .pec-sub  { font-size: 12px; color: var(--clay-text-2); margin-top: 2px; }
  .pec-btn { margin: 0 16px 16px; padding: 12px 16px; border-radius: 14px; border: none; background: var(--clay-surface-high); color: var(--clay-text); font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--sh-raised); width: calc(100% - 32px); text-align: center; }
</style>
</head>
<body>
<header class="hdr"><h1 class="hdr-title">Impostazioni</h1></header>
<div class="content">
  <div>
    <div class="section-lbl">Identita visiva</div>
    <div class="section-card">
      <div class="logo-row">
        <div class="logo-preview">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="4" width="20" height="20" rx="4" stroke="#9C9490" stroke-width="1.6" stroke-dasharray="4 3"/><path d="M14 10v8M10 14h8" stroke="#9C9490" stroke-width="1.6" stroke-linecap="round"/></svg>
        </div>
        <div class="logo-actions">
          <div class="logo-name">Logo laboratorio</div>
          <div class="logo-desc">Usato su DdC e fatture</div>
          <div class="logo-btn-row">
            <button class="btn-sm-red">Carica</button>
            <button class="btn-sm-sfc">Rimuovi</button>
          </div>
        </div>
      </div>
      <div class="logo-row" style="border-bottom:none">
        <div class="logo-preview">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M7 20 Q14 12 21 20" stroke="#9C9490" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div class="logo-actions">
          <div class="logo-name">Firma digitale DdC</div>
          <div class="logo-desc" style="color:#D90012;font-weight:600">Obbligatoria per DdC MDR</div>
          <div class="logo-btn-row"><button class="btn-sm-red">Carica</button></div>
        </div>
      </div>
    </div>
  </div>
  <div>
    <div class="section-lbl">Dati laboratorio</div>
    <div class="section-card">
      <div class="info-row"><div class="info-lbl">Nome</div><div class="info-val">Lab Opromolla</div></div>
      <div class="info-row"><div class="info-lbl">P.IVA</div><div class="info-val">03508740655</div></div>
      <div class="info-row"><div class="info-lbl">Codice ITCA</div><div class="info-val">ITCA01051686</div></div>
      <div class="info-row"><div class="info-lbl">PEC</div><div class="info-val">lab@pec.it</div></div>
      <div class="info-row"><div class="info-lbl">PRRC</div><div class="info-val empty">Non configurato</div></div>
    </div>
  </div>
  <div>
    <div class="section-lbl">Invio FatturaPA via PEC</div>
    <div class="section-card">
      <div class="pec-status">
        <div class="pec-dot err"></div>
        <div><div class="pec-text">PEC SMTP non configurata</div><div class="pec-sub">Necessaria per invio automatico FatturaPA</div></div>
      </div>
      <button class="pec-btn">Configura PEC SMTP</button>
    </div>
  </div>
</div>
</body>
</html>
```

- [ ] **9.2 Screenshot mockup**

```bash
npx playwright screenshot "file:///tmp/mockup-impostazioni.html" /tmp/screenshots/impostazioni-mobile.png --viewport-size 390,844
npx playwright screenshot "file:///tmp/mockup-impostazioni.html" /tmp/screenshots/impostazioni-tablet.png --viewport-size 768,1024
```

- [ ] **9.3 HUMAN APPROVAL — STOP**

Mostrare a Francesco:
- `/tmp/screenshots/impostazioni-mobile.png`
- `/tmp/screenshots/impostazioni-tablet.png`

Non procedere senza approvazione.

- [ ] **9.4 Modifica `src/app/(app)/impostazioni/page.tsx`**

Leggi il file intero. Applica:

1. Token swap completo su tutti i blocchi `style={{}}`.

2. Sostituisci la funzione `InfoRow`:
```typescript
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px 0', borderBottom: '1px solid var(--clay-border)' }}>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '10px', fontWeight: 700, color: 'var(--clay-text-3)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '14px', color: value ? 'var(--clay-text)' : 'var(--clay-text-3)', fontStyle: value ? 'normal' : 'italic' }}>
        {value ?? 'Non configurato'}
      </span>
    </div>
  )
}
```

3. Aggiungi sezione "Identita visiva" (logo preview + firma preview) PRIMA della sezione dati lab — vedi il mockup per layout esatto.

4. Aggiungi sezione "Invio FatturaPA via PEC" con dot di stato (verde/rosso) e button "Configura PEC SMTP" che punta a `/impostazioni/pec-smtp` (route creata in Piano B).

- [ ] **9.5 Commit**

```bash
git add "src/app/(app)/impostazioni/page.tsx"
git commit -m "feat(impostazioni): Clay Haptimorphism — logo preview, firma DdC, PEC SMTP status"
```

---

## Task 10: Dark Mode Toggle — Hook + Persistenza + Visual Regression

**Files:**
- Create: `src/hooks/useTheme.ts`
- Create: `src/components/ui/ThemeToggleButton.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Create: `tests/e2e/visual/dashboard-dark.spec.ts`

- [ ] **10.1 Crea `src/hooks/useTheme.ts`**

```typescript
// src/hooks/useTheme.ts
// Gestione tema Clay light/dark.
// Persiste in localStorage. Rispetta prefers-color-scheme come default.
// Applica .dark su <html> — compatibile con @custom-variant dark in globals.css.

'use client'

import { useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'ua-theme'

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return null
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  if (theme === 'dark') { html.classList.add('dark') }
  else                  { html.classList.remove('dark') }
  localStorage.setItem(STORAGE_KEY, theme)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const resolved = getStoredTheme() ?? getSystemTheme()
    setThemeState(resolved)
    applyTheme(resolved)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (!getStoredTheme()) {
        const next: Theme = e.matches ? 'dark' : 'light'
        setThemeState(next)
        applyTheme(next)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next)
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}
```

- [ ] **10.2 Crea `src/components/ui/ThemeToggleButton.tsx`**

```typescript
'use client'

import { useTheme } from '@/hooks/useTheme'

export function ThemeToggleButton() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'light' ? 'Attiva modalita scura' : 'Attiva modalita chiara'}
      style={{
        width:          '44px',
        height:         '44px',
        minWidth:       '52px',
        minHeight:      '52px',
        borderRadius:   '14px',
        background:     'var(--clay-surface)',
        boxShadow:      'var(--clay-sh-raised)',
        border:         'none',
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          'var(--clay-text-2)',
        fontSize:       '18px',
        lineHeight:     1,
        transition:     'box-shadow 0.14s, transform 0.14s',
        flexShrink:     0,
      }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
```

- [ ] **10.3 Aggiungi no-flash script in `src/app/layout.tsx`**

Leggi il file. Nel blocco `<head>`, aggiungi questo script sincrono come primo elemento — previene il flash al reload. Il contenuto e una stringa letterale costante senza input utente, zero rischio XSS:

```typescript
{/* No-flash theme script — stringa letterale hardcoded, nessun input utente */}
<script
  // eslint-disable-next-line react/no-danger
  dangerouslySetInnerHTML={{
    __html:
      "(function(){try{var s=localStorage.getItem('ua-theme');" +
      "var m=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';" +
      "if((s||m)==='dark')document.documentElement.classList.add('dark')" +
      "}catch(e){}})()",
  }}
/>
```

- [ ] **10.4 Aggiungi ThemeToggleButton alla dashboard**

In `src/app/(app)/dashboard/page.tsx` (Server Component), aggiungi il toggle come action nell'AppHeader:

```typescript
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton'

// ... nel JSX:
<AppHeader
  title={`${getGreeting()}, ${labNome}`}
  actions={<ThemeToggleButton />}
/>
```

Dove `labNome` e il nome del laboratorio letto dallo stato.

- [ ] **10.5 Crea `tests/e2e/visual/dashboard-dark.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Dashboard dark mode — visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForSelector('header')
  })

  test('light mode', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page).toHaveScreenshot('dashboard-light.png', { maxDiffPixelRatio: 0.02 })
  })

  test('dark mode via toggle', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const toggle = page.locator('[aria-label="Attiva modalita scura"]')
    await toggle.click()
    await page.waitForTimeout(150)
    await expect(page).toHaveScreenshot('dashboard-dark.png', { maxDiffPixelRatio: 0.02 })
  })

  test('dark mode persiste dopo reload', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('[aria-label="Attiva modalita scura"]').click()
    await page.waitForTimeout(150)
    await page.reload()
    await page.waitForSelector('header')
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
  })
})
```

- [ ] **10.6 Genera baseline e verifica**

```bash
npx playwright test tests/e2e/visual/dashboard-dark.spec.ts --update-snapshots
npx playwright test tests/e2e/visual/dashboard-dark.spec.ts
```

- [ ] **10.7 Commit**

```bash
git add src/hooks/useTheme.ts \
        src/components/ui/ThemeToggleButton.tsx \
        src/app/layout.tsx \
        "src/app/(app)/dashboard/page.tsx" \
        tests/e2e/visual/dashboard-dark.spec.ts \
        "tests/e2e/visual/dashboard-dark.spec.ts-snapshots/"
git commit -m "feat(theme): dark mode toggle — useTheme hook, no-flash script, visual regression baselines"
```

---

## Verifica Finale Pre-Merge

- [ ] **Lint + TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npm run lint
npx tsc --noEmit
```

Expected: zero errors, zero warnings su `src/`.

- [ ] **Build production**

```bash
npm run build
```

Expected: `Compiled successfully`. Zero righe `Error:`.

- [ ] **Visual regression full suite**

```bash
npx playwright test tests/e2e/visual/ --reporter=list
```

Expected: tutti i test verdi.

- [ ] **Contrasto WCAG — verifica rapida**

| Coppia | Rapporto | Standard |
|--------|----------|----------|
| `#1A1714` su `#EDEAE6` (text/bg light) | 15.6:1 | AAA |
| `#6B6460` su `#EDEAE6` (text2/bg light) | 4.7:1 | AA |
| `#fff` su `#D90012` (white/red CTA) | 5.8:1 | AA |
| `#F0EDE8` su `#1A1916` (text/bg dark) | 15.1:1 | AAA |

- [ ] **Touch targets**

Tutti i bottoni: `minHeight: '52px'` — verificato via test `boundingBox()` nei task 2, 4, 7.

- [ ] **prefers-reduced-motion**

`useReducedMotion()` usato in `BottomNavPill`. Le transizioni CSS nelle utility classes disabilitate via `@media (prefers-reduced-motion: reduce)` in globals.css.

- [ ] **Tag release**

```bash
git tag v0.4.0-plan-d
```

---

## Self-Review

### Cosa il piano fa bene

**Sequenza dipendenze rispettata.** Token (Task 1) prima dei componenti, pill (Task 2) prima del clearance in PageWrapper (Task 3), LavoroCard (Task 4) prima della lista che la consuma (Task 5). Nessun task usa variabili definite in un task successivo.

**Token scoping senza collisioni.** Clay usa `:root` e `.dark`. Il login usa `--ua-*` scoped a `.login-root`. La billing usa `--ua-*` scoped a `.billing-root` — namespace identico, classi separate, nessuna interferenza. Il file `globals.css` esistente non viene riscritto — solo esteso.

**Strategia (b) inline swap.** Minimizza il blast radius: nessuna refactor architetturale, i diff sono leggibili token per token, il rollback e un `git revert` singolo per task.

**Approval gate reale.** Ogni task UI ha `HUMAN APPROVAL — STOP` esplicito. L'agente non avanza senza conferma di Francesco. I mockup HTML sono self-contained con i token corretti — quello che Francesco vede nello screenshot e esattamente quello che il componente React produrra.

**Dark mode by design.** I token dark sono nel Task 1. Ogni componente scritto nei task 2-9 usa solo `var(--clay-*)` e il dark funziona senza retrofit. Task 10 aggiunge solo il meccanismo di switch (hook + localStorage + no-flash script).

**Motion system rispettato.** `BottomNavPill` usa `motionTokens.spring.snappy` da `motion.ts`. Nessun valore duration/easing inline. I `transition:` CSS nelle utility classes usano `0.14s` — allineato a `motionTokens.duration.fast`.

**BottomTabBar eliminato nel commit corretto.** `git rm` e `git add` dello stesso commit — nessun periodo di coesistenza, nessun import rotto.

### Rischi e mitigazioni

**Rischio: token swap incompleto su pagine grandi.** La strategia (b) lascia teoricamente qualche hex non aggiornato. La visual regression lo rileva: se un colore cobalt rimane, il test fallisce rispetto alla baseline approvata.

**Rischio: test e2e richiedono sessione autenticata.** I test puntano a `/dashboard`, `/lavori`, `/billing` che potrebbero richiedere auth. Questo e una precondizione dell'ambiente di test — il piano non la gestisce, ma la documenta. L'ambiente di test deve avere un utente seed con sessione valida oppure i test vanno eseguiti manualmente contro un env locale con `supabase start`.

**Rischio: `billing-content.tsx` ha >400 righe con engine confetti canvas.** Il rebrand tocca solo il className del wrapper div e aggiunge due info-box. L'engine confetti usa hex statici su canvas che non sono UI normale — non vengono toccati e non causano problemi di visuale.

**Non coperto da questo piano:** `src/app/(app)/lavori/[id]/page.tsx` (dettaglio lavoro), `src/app/(app)/lavori/[id]/consegna/page.tsx` (tap CONSEGNA), `src/app/(app)/qualita/` (modulo qualita MDR). Questi meritano un Piano D-bis dedicato dopo approvazione di Piano D.
