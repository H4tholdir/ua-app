// FONTE DI VERITÀ DS v3 «Una cosa alla volta» — spec 2026-07-07 §3-4.
// REGOLA ZERO: mai colori/shadow/raggi inline. Le pagine v3 stanno sotto [data-ds="v3"].

export const luce = {
  bg: '#F4F0E7', bgDeep: '#ECE6D9', card: '#FFFEFA',
  ink: '#1D1913', muted: '#6E6457', faint: '#A69B8C', line: '#EBE4D6',
  red: '#D90012', redDark: '#A5000E',
  amber: '#9A5C00', green: '#1B7F3B', blue: '#1D5FBF',
  redTint: '#FBEDEC', amberTint: '#F8F0E1', blueTint: '#EBF1FA', greenTint: '#EAF4EC',
} as const

export const notte = {
  bg: '#171411', sfc: '#211D18', elv: '#2B2620',
  ink: '#F2EEE7', muted: '#A69B8C', faint: '#6E6457', line: '#342E26',
  red: '#FF3B44', redDark: '#8F0910',
  amber: '#E8A13D', green: '#34C468', blue: '#5B9BFF',
} as const

export const tipografia = {
  famiglia: "'Plus Jakarta Sans', system-ui, sans-serif",
  // px — scala chiusa (§4.1). Lettura mai sotto body (17).
  size: { display: 52, question: 35, largeTitle: 31, title: 27, heading: 21, body: 17, callout: 15.5, label: 13, caption: 12.5 },
  weight: { regular: 400, semibold: 600, bold: 700, extrabold: 800 },
  tracking: { display: '-0.03em', titoli: '-0.02em', label: '0.16em', caption: '0.14em' },
} as const

// Griglia 8px (§4.2) — valori ammessi
export const spazio = { xs: 4, s: 8, sm: 12, m: 16, ml: 20, l: 24, xl: 32, xxl: 44 } as const

export const raggio = { card: 24, sheet: 28, tile: 22, riga: 18, tasto: 20, pill: 999 } as const

export const materia = {
  shCard: '0 1px 0 rgba(255,255,255,.9) inset, 0 2px 3px rgba(50,40,25,.05), 0 16px 30px -18px rgba(50,40,25,.35)',
  shPress: '0 4px 0 rgba(50,40,25,.12), 0 14px 24px -14px rgba(50,40,25,.3), inset 0 1px 0 rgba(255,255,255,.9)',
  granaOpacityLight: 0.05,
  granaOpacityDark: 0.06,
  corsaTastoPx: 5, // §5.1 — corsa fisica del tasto primario
} as const

export type TokenColoreLuce = keyof typeof luce
export function varV3(nome: string): string {
  // kebab-case della chiave: bgDeep → --bg-deep
  return `var(--${nome.replace(/[A-Z]/g, m => '-' + m.toLowerCase())})`
}
