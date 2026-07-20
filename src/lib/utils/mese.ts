// Confini [from, to) di un mese "YYYY-MM" come date-only ISO. Estratta da
// generate-cedolino-tecnico per il riuso nel batch cedolini (Bundle E).
export function meseBoundaries(mese: string): { from: string; to: string } {
  const [year, month] = mese.split('-').map(Number)
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to = new Date(Date.UTC(year, month, 1))
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}
