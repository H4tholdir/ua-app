// Nome dello studio sulla cassetta — variante 6 «la combinata» (ratifica Francesco 26/07/2026;
// mockup `docs/design/mockups/2026-07-26-nomi-lunghi-cassetta.html` §6, verbale
// `docs/design/decisions/2026-07-26-nomi-lunghi-variante6.md`).
//
// La regola, in ordine (la misura vera la fa `Cassetta.tsx` nel DOM, qui vivono solo i CANDIDATI):
//   1. il nome ci sta in 2 righe            → non si fa niente
//   2. non ci sta                           → si scende di un gradino di corpo: 10 → 9,5 → 9px,
//                                             MAI sotto 9px (limite di leggibilità del mockup).
//                                             È la mossa che non toglie informazione: prima questa.
//   3. a 9px ancora non ci sta              → si tolgono le parole di CATEGORIA in testa al nome
//                                             e la scala del corpo riparte da 10px
//   4. nemmeno così                         → resta la sfumatura di oggi (`is-troncato`)
//
// ⚠️ Tutto qui dentro è PRESENTAZIONE: il nome a database non si tocca MAI, e il nome completo
// resta accessibile (aria-label del bottone + title sul testo, v. `Cassetta.tsx`).

/**
 * Le parole di CATEGORIA: dicono che COSA è il luogo, non CHI è.
 * Si tolgono SOLO da una sequenza in TESTA al nome, mai in mezzo, mai in fondo, e solo quando
 * i due gradini di corpo non sono bastati.
 *
 * Forma: tutte minuscole e senza accenti, cioè già normalizzate come `normalizzaParola` qui
 * sotto normalizza i token del nome (il confronto è quindi insensibile a maiuscole, accenti e
 * punteggiatura attaccata).
 *
 * ESCLUSIONI DICHIARATE (non sono sviste — v. verbale §«cosa NON è una parola di categoria»):
 *  · preposizioni e congiunzioni (`di`, `del`, `della`, `dei`, `e`…): «DI SANTI CATERINA» è un
 *    nome vero del campione, e il «DI» ne fa parte. Il mockup ratificato lo conserva anche
 *    nell'esito accorciato («STUDI MEDICI DI SANTI GIUSEPPE» → «DI SANTI GIUSEPPE»).
 *  · titoli (`dott`, `dottor`, `dr`, `prof`…): non dicono il tipo di luogo, dicono la persona —
 *    toglierli cambierebbe il senso, non la lunghezza della categoria.
 *  · forme societarie (`srl`, `sas`, `snc`, `spa`): stanno in FONDO, e questa funzione taglia
 *    solo dalla testa; la guardia sulle lettere (sotto) impedisce comunque che restino da sole.
 *
 * COSTO DICHIARATO (dal mockup stesso, §3 «cosa costa»): più la lista è lunga, più aumenta il
 * rischio che due studi distinti solo dalle parole tolte diventino identici sulla parete
 * («STUDIO DENTISTICO ROSSI» e «CENTRO ODONTOIATRICO ROSSI» → entrambi «ROSSI»). Per questo la
 * lista è volutamente corta e limitata a ciò che compare davvero in testa a un nome di studio
 * dentistico italiano — allungarla è una decisione da pesare, non un automatismo.
 */
export const PAROLE_CATEGORIA_STUDIO: readonly string[] = [
  // — che tipo di luogo è —
  'studio', 'studi',
  'centro', 'centri',
  'ambulatorio', 'ambulatori',
  'poliambulatorio', 'poliambulatori',
  'clinica', 'cliniche',
  'policlinico', 'policlinici',
  'istituto', 'istituti',
  // — di che cosa si occupa —
  'dentistico', 'dentistica', 'dentistici', 'dentistiche',
  'dentale', 'dentali',
  'odontoiatrico', 'odontoiatrica', 'odontoiatrici', 'odontoiatriche',
  'odontoiatria',
  'odontostomatologico', 'odontostomatologica', 'odontostomatologici', 'odontostomatologiche',
  'medico', 'medica', 'medici', 'mediche',
  'sanitario', 'sanitaria', 'sanitari', 'sanitarie',
  'specialistico', 'specialistica', 'specialistici', 'specialistiche',
  'polispecialistico', 'polispecialistica', 'polispecialistici', 'polispecialistiche',
  // — come è esercitato —
  'associato', 'associata', 'associati', 'associate',
]

const INSIEME_CATEGORIA = new Set(PAROLE_CATEGORIA_STUDIO)

/**
 * Le forme societarie, per la guardia sulla prima parola del residuo (v. `accorciaNomeStudio`).
 *
 * ⚠️ Questa lista è un ANIMALE DIVERSO da `PAROLE_CATEGORIA_STUDIO`, e la differenza è la sua
 * difesa (panel advisor 26/07, parere di architettura): le parole di categoria sono un
 * **vocabolario d'uso** — descrivono come la gente sceglie di chiamarsi, cambiano con la moda,
 * non finiscono mai, e ogni aggiunta è un rischio (v. il caso `dental`). Le forme societarie
 * invece sono **chiuse dal Codice Civile**, non dall'uso: sono nove sigle, non cambiano da
 * decenni, e nessuna di esse è mai un cognome. Si scrive una volta e non si tocca più.
 *
 * CRITERIO DI AMMISSIONE (senza, fra sei mesi qualcuno la allunga a intuito): entra solo una
 * forma societaria prevista dall'ordinamento italiano, e solo se non è omografa di un cognome o
 * dell'inizio di un nome di studio reale.
 *
 * Due esclusioni dichiarate:
 * - `ss` (società semplice) è FUORI: `SS. ANNUNZIATA` è un nome di studio italiano del tutto
 *   plausibile, e un `S.S.` isolato è già fermato dalla soglia delle 4 lettere sul residuo.
 * - `spa` è DENTRO sapendo che esistono le «dental spa». Se un giorno arrivasse un cliente così,
 *   l'unico effetto è che il suo nome non verrebbe accorciato: direzione di fallimento sicura.
 *
 * I valori sono già normalizzati (minuscoli, senza punti): `normalizzaParola` porta «S.R.L.»,
 * «SRL» e «(s.r.l.)» tutte e tre a `srl`.
 */
export const FORME_SOCIETARIE: ReadonlySet<string> = new Set([
  'srl', 'srls', 'sas', 'snc', 'spa', 'sapa', 'stp',
  'unipersonale', 'uninominale',
])

/**
 * Quante lettere deve avere ALMENO quello che resta perché l'accorciamento sia lecito.
 *
 * Quattro. Sotto le quattro lettere, in questo campo, non resta un nome: restano le sigle della
 * forma societaria («SRL», «SAS», «SNC», «S.R.L.» → 3 lettere) o delle iniziali. I cognomi e i
 * nomi di santo che compaiono da soli su una targa ne hanno praticamente sempre di più (ROSSI,
 * NERI, MARIA, SANTI). Quando la guardia scatta non si perde nulla: si rinuncia ad accorciare e
 * si resta al punto 4 della regola (nome intero con la sfumatura di oggi) — cioè al
 * comportamento già in produzione.
 *
 * Si contano solo le LETTERE, non i caratteri: «S.R.L.» sono 6 caratteri ma 3 lettere.
 */
export const MIN_LETTERE_NOME_ACCORCIATO = 4

/** Stessa normalizzazione già in uso nel repo (`src/lib/domain/tipi-lavoro.ts`): via i segni
 *  diacritici, tutto minuscolo. In più, qui, via tutto ciò che non è una lettera — così
 *  «STUDIO,» / «(studio)» / «Studio» sono la stessa parola. */
function normalizzaParola(parola: string): string {
  return parola
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

function contaLettere(testo: string): number {
  return (testo.normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zA-Z]/g) ?? []).length
}

/**
 * Toglie la sequenza INIZIALE di parole di categoria.
 * Torna `null` quando non c'è niente da togliere o quando toglierlo non sarebbe lecito
 * (nome svuotato, residuo troppo corto per identificare qualcuno): `null` significa
 * «questo nome non ha una versione accorciata», non «errore».
 *
 * Il residuo conserva la spaziatura originale del nome (si taglia sull'indice del primo token
 * che resta, non si ricompone unendo con spazi singoli).
 */
export function accorciaNomeStudio(nome: string): string | null {
  const testo = nome.trim()
  if (!testo) return null

  const token = [...testo.matchAll(/\S+/g)]
  let i = 0
  while (i < token.length && INSIEME_CATEGORIA.has(normalizzaParola(token[i][0]))) i++

  if (i === 0) return null // nessuna parola di categoria in testa: non si tocca
  if (i >= token.length) return null // toglierle tutte svuoterebbe il nome

  const residuo = testo.slice(token[i].index).trim()

  // Guardia sulla PRIMA PAROLA del residuo (panel advisor 26/07, via A ratificata da Francesco —
  // verbale `docs/design/decisions/2026-07-26-parole-categoria-panel.md`).
  //
  // Il difetto che chiude: la guardia sotto conta le lettere di TUTTO il residuo, quindi
  // «SRL UNIPERSONALE» (16 lettere) passava e la cassetta avrebbe scritto la sigla della società
  // al posto del nome dello studio. Trovato su 6 nomi reali dalla ricerca sui 1.604 nomi.
  //
  // ⚠️ Chiede DUE cose soltanto, e mai una soglia di lunghezza: il documento di ricerca propone
  // in un punto «4 lettere sulla prima parola», e preso alla lettera ucciderebbe due esiti già
  // ratificati — `DI SANTI GIUSEPPE` («DI» = 2 lettere) e `SAN RAFFAELE` («SAN» = 3). In italiano
  // «San», «Santa», «Di», «Del», «De» sono fra le teste di nome più comuni che esistano.
  //
  // Direzione di fallimento SICURA: questa guardia può solo trasformare «accorciato» in
  // «non accorciato», mai produrre un'etichetta che oggi non esista già. È la ragione per cui il
  // panel ha scelto la via A e non la via B («salto la sigla e riprendo»): la B introdurrebbe il
  // concetto «salto un pezzo e vado avanti», che indebolisce la regola «solo dalla testa, solo di
  // seguito» — l'unica cosa che oggi salva `Studio Dentistico Del Corso`. La B resta aggiungibile
  // sopra questa in qualunque momento; il contrario no.
  const primaParola = residuo.split(/\s+/)[0] ?? ''
  // (a) niente lettere = punteggiatura, e commerciale, cifra, parentesi: non è l'inizio di un nome
  if (contaLettere(primaParola) === 0) return null
  // (b) forma societaria: `normalizzaParola` toglie già i punti, quindi «S.R.L.» → «srl» e la
  //     lista non ha bisogno di inseguire le varianti puntate.
  if (FORME_SOCIETARIE.has(normalizzaParola(primaParola))) return null

  if (contaLettere(residuo) < MIN_LETTERE_NOME_ACCORCIATO) return null
  return residuo
}

/**
 * I gradini di corpo del clinico. Il valore in px è la DOCUMENTAZIONE di ciò che il foglio
 * dichiara (`.ds-cassetta-dent` e i suoi `.is-corpo-*` in `src/app/ds-v3.css`): a rendere è
 * sempre e solo il CSS — qui non si scrive mai un font-size inline. La coerenza fra i due è
 * presidiata da una guardia in `tests/unit/ds-v3/cassetta-nomi-lunghi.test.tsx`.
 * Sotto i 9px non si scende: il mockup lo dichiara come limite di leggibilità.
 */
export const CORPI_CLINICO = [
  { px: 10, classe: null },
  { px: 9.5, classe: 'is-corpo-95' },
  { px: 9, classe: 'is-corpo-9' },
] as const satisfies readonly { px: number; classe: string | null }[]

export type GradinoNome = {
  /** il testo da rendere a questo gradino (nome intero o accorciato) */
  testo: string
  /** corpo atteso in px — documentazione, il valore vero lo dà il CSS via `classeCorpo` */
  corpoPx: number
  /** classe del gradino, `null` sul corpo pieno (regola base) */
  classeCorpo: string | null
}

/**
 * La scala dei tentativi, nell'ordine ratificato: PRIMA tutti i corpi sul nome INTERO (scendere
 * di corpo non toglie informazione), POI gli stessi corpi sul nome accorciato. Chi consuma la
 * scala (`Cassetta.tsx`) si ferma al primo gradino che entra in 2 righe; se finisce la scala
 * senza trovarlo, resta sull'ultimo e accende la sfumatura di oggi.
 */
export function costruisciScalaNome(nome: string): GradinoNome[] {
  const accorciato = accorciaNomeStudio(nome)
  const varianti = accorciato ? [nome, accorciato] : [nome]
  return varianti.flatMap((testo) =>
    CORPI_CLINICO.map((c) => ({ testo, corpoPx: c.px, classeCorpo: c.classe as string | null }))
  )
}
