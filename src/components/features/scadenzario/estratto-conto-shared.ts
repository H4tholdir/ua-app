// src/components/features/scadenzario/estratto-conto-shared.ts

interface RigaUrgenza {
  pagata: boolean
  giorni_ritardo: number
}

export const DS = {
  bg:      'var(--bg, #DDD8D3)',
  sfc:     'var(--sfc, #E4DFD9)',
  elv:     'var(--elv, #EDEDEA)',
  prs:     'var(--prs, #D4CFC9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #4A3D33)',
  t3:      'var(--t3, #6B5C51)',
  red:     'var(--primary, #D90012)',
  // `gold` è l'INK ambra per TESTO/VALORI (badge, urgenza, KPI) — teoricamente
  // "gold" ma in realtà mappa su --c-amber-ink, non --c-amber: #F59E0B come
  // colore testo è 1.52:1 su tinta chiara (WCAG fail); --c-amber-ink è
  // theme-aware (scuro #92400E in light, ambra piena #F59E0B in dark) e resta
  // WCAG AA in entrambi i temi. La tinta/bordo ambra (background, color-mix)
  // continua a usare --c-amber direttamente — NON questo alias.
  gold:    'var(--c-amber-ink, #92400E)',
  green:   'var(--success, #16A34A)',
  shB: 'var(--sh-b)',
  shI: 'var(--sh-i)',
} as const

export const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export function formatData(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Per timestamp veri (es. `proposta_at`, timestamptz) — a differenza di
// `formatData` (date-only, ancorata a mezzanotte locale) qui serve anche
// l'ora. `timeZone: 'Europe/Rome'` fissa il fuso sia lato server (SSR, UTC)
// che lato client, altrimenti l'ora renderizzata differirebbe fra i due
// passaggi e romperebbe l'hydration di questo componente 'use client'.
export function formatDataOra(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  })
}

export function urgencyColor(f: RigaUrgenza): string {
  if (f.pagata) return DS.green
  if (f.giorni_ritardo > 60) return DS.red
  if (f.giorni_ritardo >= 30) return DS.gold
  return DS.t2
}

export function urgencyEmoji(f: RigaUrgenza): string {
  if (f.pagata) return '✅'
  if (f.giorni_ritardo > 60) return '⏰'
  if (f.giorni_ritardo >= 30) return '⏳'
  return '🧾'
}

export function urgencyLabel(f: RigaUrgenza): string {
  if (f.pagata) return 'Pagata'
  if (f.giorni_ritardo > 60) return 'Urgente'
  if (f.giorni_ritardo >= 30) return 'In ritardo'
  return 'In sospeso'
}

// `urgencyColor` restituisce un token DS (`var(--…)`), non un hex grezzo:
// concatenarci un suffisso alpha (`…22`/`…44`) produce CSS invalido — il
// browser scarta la dichiarazione e lo sfondo/bordo non renderizza (verificato:
// getComputedStyle → rgba(0,0,0,0)). `color-mix` applica la trasparenza su un
// `var()` senza hardcodare hex. 22hex≈13%, 44hex≈27% dell'alpha originale.
export function urgencyPillBg(f: RigaUrgenza): string {
  return `color-mix(in srgb, ${urgencyColor(f)} 13%, transparent)`
}

export function urgencyPillBorder(f: RigaUrgenza): string {
  return `1px solid color-mix(in srgb, ${urgencyColor(f)} 27%, transparent)`
}

const STATO_SDI_LABEL: Record<string, string> = {
  draft:          'Bozza',
  generata:       'XML Pronto',
  smtp_inviata:   'Inviata',
  pec_consegnata: 'Consegnata',
  ricevuta_sdi:   'Ricevuta SDI',
  accettata:      'Accettata',
  rifiutata:      'Rifiutata',
  scaduta:        'Scaduta',
}

export function labelStatoSDI(stato: string): string {
  return STATO_SDI_LABEL[stato] ?? stato
}

export function labelOrigine(origine: 'fattura' | 'lavoro_diretto'): string {
  return origine === 'fattura' ? 'Fattura' : 'Lavoro diretto'
}
