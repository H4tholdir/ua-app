// src/lib/portale/minimizza-phi.ts
// PHI minimizzata: "ROSSI MARIO" → "R. MARIO"
export function minimizzaPhi(nomeSnapshot: string | null): string | null {
  if (!nomeSnapshot) return null
  const parti = nomeSnapshot.trim().split(/\s+/)
  if (parti.length < 2) return parti[0]?.[0] ? `${parti[0][0]}.` : null
  const cognomeAbbreviato = `${parti[0][0]}.`
  const resto = parti.slice(1).join(' ')
  return `${cognomeAbbreviato} ${resto}`
}
