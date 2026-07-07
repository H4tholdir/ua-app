// DS v3 §2.3 — Dizionario obbligatorio: parole del software → parole del banco.
// Fonte di verità per copy UI. Il check pre-commit (scripts/check-ds-compliance.sh §v3)
// greppa le stesse parole nei file di src/components/ds/.

export const PAROLE_VIETATE: ReadonlyArray<{ vietata: RegExp; usa: string }> = [
  { vietata: /\bdashboard\b/i,            usa: 'Home (o niente: è "l\'app")' },
  { vietata: /\bform\b/i,                 usa: 'una domanda alla volta (il concetto sparisce)' },
  { vietata: /\brecord\b/i,               usa: 'lavoro / scheda' },
  { vietata: /\bsubmit\b/i,               usa: 'Fatto ✓' },
  { vietata: /\bsalva\b/i,                usa: 'Fatto ✓ (o salvataggio automatico silenzioso)' },
  { vietata: /\bfiltr\w+/i,               usa: 'Cerca (le pile sono i filtri)' },
  { vietata: /\bquery\b/i,                usa: '—' },
  { vietata: /\btask\b/i,                 usa: 'cose da fare' },
  { vietata: /\bto-?do\b/i,               usa: 'cose da fare' },
  { vietata: /\berrore\s*\d{3}\b/i,       usa: 'Non ci sono riuscita. Riprovo?' },
  { vietata: /\brichiesta\s+fallita/i,    usa: 'Non ci sono riuscita. Riprovo?' },
  { vietata: /\bloading\b/i,              usa: 'Un attimo…' },
  { vietata: /\bcaricamento\s+in\s+corso/i, usa: 'Un attimo…' },
  { vietata: /\bin_lavorazione\b/i,       usa: 'Sul banco / In forno / In rifinitura' },
  { vietata: /\belimina\s+definitivamente/i, usa: 'Butta via (con via di fuga)' },
  { vietata: /\bcampo\s+obbligatorio/i,   usa: '(la domanda stessa lo rende ovvio)' },
] as const

/** Ritorna le parole vietate trovate nel testo (minuscole), [] se pulito. */
export function trovaParoleVietate(testo: string): string[] {
  const trovate: string[] = []
  for (const { vietata } of PAROLE_VIETATE) {
    const m = testo.match(vietata)
    if (m) trovate.push(m[0].toLowerCase())
  }
  return trovate
}
