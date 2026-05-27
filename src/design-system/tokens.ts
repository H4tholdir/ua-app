// FONTE DI VERITÀ per i token del design system UÀ v2.3
// Approvato: 27/05/2026 — Francesco Formicola
// Spec completa: docs/superpowers/specs/2026-05-27-design-system-v2-3.md
// REGOLA ZERO: MAI definire colori/shadow inline — importa da qui.

// ─── COLORI LIGHT ────────────────────────────────────────────────────────────
export const colorLight = {
  bg:      '#DDD8D3',
  sfc:     '#E4DFD9',
  elv:     '#EDEDEA',
  prs:     '#D4CFC9',
  t1:      '#1C1916',   // 12.4:1 su bg → AAA
  t2:      '#4A3D33',   // 7.4:1 su bg → AAA (era #96918D: WCAG fail)
  t3:      '#6B5C51',   // 4.5:1 su bg → AA  (era #B8B3AE: WCAG fail)
  primary: '#D90012',
} as const

// ─── COLORI DARK ─────────────────────────────────────────────────────────────
export const colorDark = {
  bg:      '#1A1916',
  sfc:     '#232018',   // card bg — +1 stop sopra il bg
  prs:     '#141210',
  t1:      '#F0EDE8',
  t2:      '#8A8580',
  t3:      '#5A5652',
  primary: '#E8001A',
} as const

// ─── COLORI SEMANTICI (rainbow — stile admin) ─────────────────────────────────
export const colorSemantic = {
  blue:    '#3B82F6',   // info · trial · in-corso
  green:   '#22C55E',   // success · attivo · pronto · consegnato
  amber:   '#F59E0B',   // warning · sospeso
  orange:  '#F97316',   // caution
  red:     '#EF4444',   // danger · blacklist · scaduto
  purple:  '#8B5CF6',   // premium
  success: '#3DCB5C',   // toggle ON, connection dot (da admin)
} as const

// ─── SHADOWS LIGHT ───────────────────────────────────────────────────────────
// Derivate da hsl(30°): scura #B8B0A8, chiara #F0EDEA
// Regola: rgba(255,255,255) MAX .32 — niente specular gloss
export const shadowLight = {
  raised: [
    'rgba(255,255,255,.88) 0 1px 0 0 inset',
    'rgba(0,0,0,.04) 0 -1px 2px 0 inset',
    'rgba(255,255,255,.72) -5px -5px 11px',
    'rgba(148,128,118,.40) 9px 12px 22px -4px',
    'rgba(148,128,118,.22) 3px 5px 10px -2px',
  ].join(', '),

  raisedSm: [
    'rgba(255,255,255,.90) 0 1px 0 0 inset',
    'rgba(0,0,0,.05) 0 -2px 3px 0 inset',
    'rgba(255,255,255,.78) -5px -5px 11px',
    'rgba(148,128,118,.44) 9px 13px 22px -4px',
    'rgba(148,128,118,.26) 3px 5px 9px -1px',
  ].join(', '),

  inset: [
    'rgba(148,128,118,.32) 4px 4px 9px 0 inset',
    'rgba(255,255,255,.66) -3px -3px 7px 0 inset',
  ].join(', '),

  float: [
    'rgba(255,255,255,.72) -8px -8px 18px',
    'rgba(148,128,118,.55) 10px 12px 24px -4px',
  ].join(', '),
} as const

// ─── SHADOWS DARK ────────────────────────────────────────────────────────────
// Nessuna shadow raised — depth tramite differenza background
export const shadowDark = {
  raised:   'none',
  raisedSm: 'none',

  inset: [
    'rgba(4,3,2,.92) 4px 4px 9px 0 inset',
    'rgba(40,37,32,.50) -3px -3px 7px 0 inset',
  ].join(', '),

  float: [
    'rgba(0,0,0,.70) 0 12px 28px',
    'rgba(0,0,0,.40) 0 4px 8px',
  ].join(', '),
} as const

// ─── TIPOGRAFIA ──────────────────────────────────────────────────────────────
export const typography = {
  fontBody:    "'DM Sans', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",

  // Scale base 14px, ratio 1.2
  size: {
    caption:  '10px',
    body:     '14px',
    titleSm:  '17px',
    title:    '20px',
    page:     '24px',
    displaySm:'30px',
    display:  '38px',
    displayLg:'48px',
  },

  weight: {
    regular:    400,
    medium:     500,
    semibold:   600,
    bold:       700,
    displayKpi: 300,   // Playfair Display su numeri KPI
  },
} as const

// ─── BORDER RADIUS ───────────────────────────────────────────────────────────
export const radius = {
  sm:   '8px',
  md:   '12px',
  lg:   '14px',
  xl:   '18px',
  xxl:  '20px',
  pill: '100px',
  full: '100em',
  circle: '50%',
} as const

// ─── TASTO + TAGLIE ───────────────────────────────────────────────────────────
export const tastoSize = {
  hero:    { width: 80, height: 80 },
  large:   { width: 60, height: 60 },
  navLg:   { width: 48, height: 48 },
  navSm:   { width: 40, height: 40 },
} as const

// ─── CSS VARIABLES HELPERS ────────────────────────────────────────────────────
// Usa questi per accedere ai token in componenti React via CSS var()
export const cssVar = {
  bg:      'var(--bg)',
  sfc:     'var(--sfc)',
  prs:     'var(--prs)',
  t1:      'var(--t1)',
  t2:      'var(--t2)',
  t3:      'var(--t3)',
  primary: 'var(--primary)',
  shadow:  'var(--sh)',
  shadowSm:'var(--sh-sm)',
  inset:   'var(--sh-in)',
  float:   'var(--sh-float)',
} as const

// ─── TIPI DERIVATI ────────────────────────────────────────────────────────────
export type SemanticColor = keyof typeof colorSemantic
export type TypographySize = keyof typeof typography.size
