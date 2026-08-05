/**
 * Una sola regola di «vuoto» per i testi che l'utente digita (D242).
 *
 * 🔑 Il fatto che l'ha generata: `richiedente_nome` aveva DUE ortografie per
 * «non c'è» — `null` e `''` — e i due documenti che escono dal laboratorio
 * (Dichiarazione di Conformità e buono di consegna) ripiegavano con `??`, che
 * conosce solo la prima. Un nome vuoto sopravviveva al ripiego e finiva su un
 * documento a valore legale, mentre il controllo di consegna diceva verde
 * perché LUI misurava il testo trimmato (`precheck.ts:22-25`).
 *
 * 🛑 Per questo non basta `||`: `'   '` è truthy e passerebbe intatto. La
 * misura è sul testo TRIMMATO, sempre, ovunque.
 *
 * Torna il testo ripulito se dice qualcosa, `null` se non dice niente — così
 * chi legge può usare `??` in pace, che è la forma naturale del ripiego.
 */
export function testoVivo(v: string | null | undefined): string | null {
  const t = v?.trim()
  return t ? t : null
}

/**
 * La stessa regola applicata a un valore che arriva dal CORPO DI UNA RICHIESTA,
 * cioè da fuori, dove il tipo non è garantito.
 *
 * 🛑 Ciò che NON fa, di proposito: non inventa un tipo. Un numero, un booleano
 * o un oggetto passano com'erano — se un client manda una sciocchezza incontra
 * il database esattamente come prima, e questa funzione non nasconde il
 * problema trasformandolo in `null`. Normalizza SOLO le stringhe, che sono il
 * caso vero: `''` e `'   '` diventano `null`, l'assente resta `null`.
 */
export function testoVivoDaCorpo(v: unknown): unknown {
  return typeof v === 'string' ? testoVivo(v) : (v ?? null)
}
