// Conferma-cassetta (decisions 20/07): chips delle cassette usate di recente e
// ORA libere. Pura e client-safe — la query vive in cassette.ts (server-only).
const MAX_CHIPS = 6
const STATI_CHIUSI = new Set(['consegnato', 'annullato'])

export function derivaCassetteSuggerite(
  rows: Array<{ numero_cassetta: string | null; stato: string }>
): string[] {
  const occupate = new Set(
    rows
      .filter((r) => r.numero_cassetta && !STATI_CHIUSI.has(r.stato))
      .map((r) => r.numero_cassetta as string)
  )
  const suggerite: string[] = []
  for (const r of rows) {
    if (!r.numero_cassetta || !STATI_CHIUSI.has(r.stato)) continue
    if (occupate.has(r.numero_cassetta) || suggerite.includes(r.numero_cassetta)) continue
    suggerite.push(r.numero_cassetta)
    if (suggerite.length === MAX_CHIPS) break
  }
  return suggerite
}
