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
  gold:    'var(--c-amber, #F59E0B)',
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

export function urgencyPillBg(f: RigaUrgenza): string {
  return `${urgencyColor(f)}22`
}

export function urgencyPillBorder(f: RigaUrgenza): string {
  return `1px solid ${urgencyColor(f)}44`
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
