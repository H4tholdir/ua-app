// Aiuti condivisi per le guardie CSS testuali (jsdom non fa layout: il foglio di stile si
// verifica come TESTO, v. il commento in testa a `tests/unit/home-style-parsabile.test.ts`).
//
// Vive fuori da `tests/unit/` di proposito: `vitest.config.ts` globba solo
// `tests/unit/**/*.test.ts(x)` e `tests/integration/**/*.test.ts`, quindi questo modulo non
// viene mai scambiato per una suite senza test dentro.

/**
 * Rimuove i commenti CSS con la semantica REALE del parser: `/*` apre, il PRIMO chiuditore
 * successivo chiude, i commenti NON si annidano.
 *
 * A che serve, e perché non basta un `toMatch` sul sorgente grezzo: un `*` seguito da `/`
 * scritto per sbaglio dentro la prosa di un commento lo chiude in anticipo, il testo residuo
 * viene letto come selettore fino alla prima graffa e INGHIOTTE la regola che segue. Nel
 * sorgente si continua a vedere tutto — quindi ogni guardia testuale passa serena mentre il
 * browser ha buttato via la regola. Cercare la regola in ciò che RESTA dopo questa funzione è
 * l'unico modo di accorgersene (difetto 1a del 26/07, `home-style-parsabile.test.ts`).
 *
 * (In questo commento i chiuditori sono scritti a pezzi apposta: scriverli per intero qui
 * dentro chiuderebbe questo stesso commento — è letteralmente il difetto che la funzione serve
 * a scoprire.)
 */
export function senzaCommenti(css: string): string {
  let fuori = ''
  let i = 0
  while (i < css.length) {
    const apre = css.indexOf('/*', i)
    if (apre === -1) { fuori += css.slice(i); break }
    fuori += css.slice(i, apre)
    const chiude = css.indexOf('*/', apre + 2)
    if (chiude === -1) break // commento mai chiuso: da lì in poi il parser ignora tutto
    i = chiude + 2
  }
  return fuori
}

/** Spazi/a-capo ridotti a uno solo, bordi tagliati. */
function normalizza(testo: string): string {
  return testo.replace(/\s+/g, ' ').trim()
}

/**
 * Le dichiarazioni della PRIMA regola il cui selettore è esattamente `selettore`, una per
 * voce e già normalizzate (`width: 34px`), oppure `null` se quella regola non esiste.
 *
 * Perché non un `toMatch` sul testo grezzo (review finale whole-branch): un `toMatch` con
 * l'elenco delle dichiarazioni in fila pinna l'ORDINE e gli spazi singoli, quindi si rompe a
 * ogni riformattazione del foglio di stile senza che nulla sia peggiorato — e nell'altro verso
 * prova solo che quel testo ESISTE da qualche parte, che è precisamente il fallimento per cui
 * `home-style-parsabile.test.ts` è stato scritto (una regola inghiottita da un commento rotto
 * è ancora tutta lì da leggere). Qui la regola va TROVATA come regola, dopo la rimozione dei
 * commenti, e ogni dichiarazione si controlla per conto suo.
 *
 * NB: le regole dentro un `@media` sono raggiungibili da qui come tutte le altre (il prelude
 * `@media (…) {` non finisce nel selettore). Per distinguere «dentro quel media» da «fuori»
 * si passa prima da `contenutoMedia`.
 */
export function dichiarazioniDi(css: string, selettore: string): string[] | null {
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(senzaCommenti(css))) !== null) {
    if (normalizza(m[1]) !== selettore) continue
    return m[2].split(';').map(normalizza).filter((d) => d.length > 0)
  }
  return null
}

/**
 * Il contenuto (concatenato) di tutti i blocchi `@media` il cui prelude soddisfa `condizione`.
 * Serve per asserire che una regola vive DENTRO una certa soglia — o, altrettanto spesso, che
 * FUORI da quella soglia non c'è: una rete di sicurezza che esiste solo sotto i 768px è una
 * cosa diversa da una che vale sempre, e il nome del test deve poterlo dire con precisione.
 * La scansione è a graffe bilanciate, non a regex: dentro un `@media` ci sono altre regole.
 */
export function contenutoMedia(css: string, condizione: RegExp): string {
  const pulito = senzaCommenti(css)
  let raccolto = ''
  const re = /@media([^{]*)\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(pulito)) !== null) {
    let profondita = 1
    let i = m.index + m[0].length
    const inizio = i
    while (i < pulito.length && profondita > 0) {
      if (pulito[i] === '{') profondita++
      else if (pulito[i] === '}') profondita--
      i++
    }
    if (condizione.test(m[1])) raccolto += pulito.slice(inizio, i - 1) + '\n'
  }
  return raccolto
}
