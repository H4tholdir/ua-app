// La precedenza «riga di dente → default di caso» (spec §3.2, pattern exocad /
// 3Shape). Vive QUI e solo qui: wizard, scheda del lavoro e Dichiarazione di
// Conformità devono leggere lo stesso default con la stessa regola. Due
// letture divergenti dello stesso fatto sono il difetto che questa modifica
// introdurrebbe — è la classe già pagata una volta con `numero_cassetta`.
//
// Un colore è una COPPIA (scala, codice), non una stringa (W10): «A3» da solo
// non identifica nulla in un mondo con due scale VITA. Mezza coppia non è
// mezzo colore: è nessun colore.

export const SCALE_COLORE = ['vita_classical', 'vita_3d_master', 'fuori_scala'] as const
export type ScalaColore = (typeof SCALE_COLORE)[number]

export type DefaultCaso = { colore_scala: string | null; colore_codice: string | null }
export type RigaDente = { fdi: number; scala: string | null; codice: string | null }
export type ColoreRisolto = { scala: ScalaColore; codice: string; da: 'dente' | 'caso' } | null

function isScala(v: string | null): v is ScalaColore {
  return v !== null && (SCALE_COLORE as readonly string[]).includes(v)
}

function coppia(
  scala: string | null,
  codice: string | null,
  da: 'dente' | 'caso'
): ColoreRisolto {
  if (!isScala(scala) || !codice) return null
  return { scala, codice, da }
}

/**
 * Il colore effettivo di un dente. La riga vince se porta una coppia completa;
 * altrimenti si ricade sul default del lavoro; se non c'è nemmeno quello, `null`
 * — mai una stringa vuota, che a valle si confonderebbe con «bianco».
 */
export function risolviColore(riga: RigaDente | undefined, caso: DefaultCaso): ColoreRisolto {
  return coppia(riga?.scala ?? null, riga?.codice ?? null, 'dente')
      ?? coppia(caso.colore_scala, caso.colore_codice, 'caso')
}
