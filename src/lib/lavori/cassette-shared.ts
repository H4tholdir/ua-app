// Chips «dal parco» del conferma-cassetta (Task 3, correzione 21/07 #1 /
// risoluzione R-C): cassette VIVE libere ordinate per uso recente (max 6),
// comprese quelle mai usate (`ultimoUso: null`), che vanno in coda. Verità
// dell'uso = max(cassette_lavori.assegnato_at) — MAI `cassette.updated_at`,
// bump-ato dal get-or-create e che mentirebbe sull'uso recente.
// Pura e client-safe — la query vive in cassette.ts (server-only).
const MAX_CHIPS = 6

export function derivaCassetteSuggerite(
  cassette: Array<{ id: string; nome: string; ultimoUso: string | null }>,
  occupate: Set<string>
): Array<{ id: string; nome: string }> {
  return cassette
    .filter((c) => !occupate.has(c.id)) // .filter() ritorna già un array nuovo: .sort() qui non muta l'input
    .sort(comparaCassette)
    .slice(0, MAX_CHIPS)
    .map(({ id, nome }) => ({ id, nome }))
}

// Ordinamento deterministico (spec §10): ultimoUso desc → null in coda →
// tie-break nome.localeCompare('it') → poi id.
function comparaCassette(
  a: { nome: string; id: string; ultimoUso: string | null },
  b: { nome: string; id: string; ultimoUso: string | null }
): number {
  if (a.ultimoUso !== b.ultimoUso) {
    if (a.ultimoUso === null) return 1
    if (b.ultimoUso === null) return -1
    return b.ultimoUso.localeCompare(a.ultimoUso)
  }
  return a.nome.localeCompare(b.nome, 'it') || a.id.localeCompare(b.id)
}
