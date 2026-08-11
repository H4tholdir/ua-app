// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  classificaErroreAttoUnico,
  PREFISSI_COLPA_DEL_CHIAMANTE,
} from '@/lib/dichiarazione/atto-unico-errori'

/**
 * Task C — 🔴 TREDICI CASI CONDIVIDONO `P0001`, E NON SI SMISTANO PER SQLSTATE.
 *
 * Nove nascono da un chiamante sbagliato e succedono PRIMA di qualsiasi
 * scrittura → è colpa di chi ha chiesto (400). Quattro succedono DOPO l'annullo
 * — annullo fallito, penna dei denti non-`ok`, penna della prescrizione
 * non-`ok`, chiavi non atterrate — e sono GUASTI INTERNI (500). Hanno lo stesso
 * codice: a separarli c'è solo il testo.
 *
 * 🔑 PERCHÉ IL VERSO DEL RIPIEGO È QUELLO CHE CONTA: tradurre un guasto in un
 * 400 dice all'odontotecnico CHE HA SBAGLIATO LUI, mentre l'app si è rotta.
 * Quindi si riconoscono i nove e tutto il resto è un guasto — mai il contrario.
 *
 * 📌 La forma dei campi non è dedotta: è misurata attraverso PostgREST
 * (`scripts/tmp/sonda-forma-errori-postgrest.ts`, output nel resoconto). Il nome
 * del vincolo sta in `message`; `details` porta i VALORI della chiave e `hint`
 * è nullo. Per questo si ramifica su `message`.
 */

// ── i tredici messaggi, letti DAL CONTRATTO VIVO e non ricopiati a mano ──────
//
// 🛑 Ricopiarli qui sarebbe una seconda scrittura della stessa verità: il
//    giorno in cui una `RAISE` cambia parola, la prova resterebbe verde su un
//    testo che il database non produce più. Si leggono dalla migration che
//    definisce la funzione oggi.
function migrationDelContratto(): string {
  const dir = join(process.cwd(), 'supabase', 'migrations')
  const candidate = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) =>
      readFileSync(join(dir, f), 'utf8').includes(
        'CREATE FUNCTION public.correggi_e_riemetti_atomica'
      )
    )
  if (candidate.length === 0) throw new Error('nessuna migration definisce correggi_e_riemetti_atomica')
  return readFileSync(join(dir, candidate[candidate.length - 1]), 'utf8')
}

function messaggiRaise(sql: string): string[] {
  const corpo = sql.slice(sql.indexOf('CREATE FUNCTION public.correggi_e_riemetti_atomica'))
  const trovati: string[] = []
  const re = /RAISE EXCEPTION\s+'((?:[^']|'')*)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(corpo)) !== null) trovati.push(m[1].replace(/''/g, "'"))
  return trovati
}

/** I quattro che succedono DOPO l'annullo: sono guasti, e restano 500. */
const QUATTRO_POST_ANNULLO = [
  'atto unico: annullo della dichiarazione',
  'atto unico: la penna dei denti ha risposto',
  'atto unico: la penna della prescrizione ha risposto',
  'atto unico: chiavi accettate ma NON atterrate su lavori',
]

describe('🛑 il censimento delle tredici RAISE — e il giorno in cui diventano quattordici', () => {
  const messaggi = messaggiRaise(migrationDelContratto())

  it('la funzione viva alza esattamente TREDICI eccezioni', () => {
    // ⚠️ Questa asserzione è il censimento R-P6 meccanizzato: una RAISE nuova
    // che nessuno classificasse diventerebbe un 500 IN SILENZIO. Qui il conto
    // non torna e la prova si accende.
    expect(messaggi).toHaveLength(13)
  })

  it('ognuna dei tredici è classificata, e nessuna cade nel ripiego per distrazione', () => {
    for (const m of messaggi) {
      const atteso = QUATTRO_POST_ANNULLO.some((p) => m.startsWith(p)) ? 'guasto' : 'richiesta'
      expect(classificaErroreAttoUnico({ code: 'P0001', message: m }).tipo, m).toBe(atteso)
    }
  })

  it('nove sono colpa del chiamante, quattro sono guasti — il conto è questo e non un altro', () => {
    const tipi = messaggi.map((m) => classificaErroreAttoUnico({ code: 'P0001', message: m }).tipo)
    expect(tipi.filter((t) => t === 'richiesta')).toHaveLength(9)
    expect(tipi.filter((t) => t === 'guasto')).toHaveLength(4)
  })
})

describe('P0001 — la separazione fra «hai sbagliato tu» e «mi sono rotta io»', () => {
  it('🛑 un P0001 sconosciuto è un GUASTO, non una richiesta sbagliata', () => {
    // Il ripiego va in questo verso e non nell'altro: una RAISE aggiunta domani
    // e non classificata deve dire «l'app si è rotta», mai «hai sbagliato tu».
    const c = classificaErroreAttoUnico({ code: 'P0001', message: 'atto unico: qualcosa di nuovo' })
    expect(c.tipo).toBe('guasto')
  })

  it('🔴 «chiavi accettate ma NON atterrate su lavori» è un GUASTO, benché cominci come i tre di colpa', () => {
    // È la trappola vera: quattro messaggi su tredici cominciano con «chiavi»,
    // e tre di quelli sono colpa del chiamante mentre il quarto succede DOPO
    // l'annullo. Un riconoscimento fatto sulla parola invece che sul prefisso
    // li scambierebbe.
    expect(classificaErroreAttoUnico({
      code: 'P0001',
      message: 'atto unico: chiavi accettate ma NON atterrate su lavori: {descrizione}',
    }).tipo).toBe('guasto')
  })

  it.each([
    'atto unico: chiavi che non sono voci correggibili del documento: {classe_rischio} (ammesse: {…})',
    'atto unico: chiavi che non sono colonne di dichiarazioni_conformita: {chiave_inventata}',
    'atto unico: chiavi che la dichiarazione nuova NON accetta dal chiamante: {numero_ddc,stato} — …',
  ])('…mentre «%s» è colpa del chiamante', (messaggio) => {
    expect(classificaErroreAttoUnico({ code: 'P0001', message: messaggio }).tipo).toBe('richiesta')
  })

  it('il messaggio del contratto viaggia con la classificazione: serve a dire COSA correggere', () => {
    const c = classificaErroreAttoUnico({
      code: 'P0001',
      message: 'atto unico: chiavi che non sono voci correggibili del documento: {classe_rischio}',
    })
    if (c.tipo !== 'richiesta') throw new Error('atteso richiesta')
    expect(c.messaggio).toContain('classe_rischio')
  })

  it('i nove prefissi sono nove: l\'elenco non si allarga per sbaglio', () => {
    expect(PREFISSI_COLPA_DEL_CHIAMANTE).toHaveLength(9)
  })
})

describe('23505 — ORA VALE TRE VINCOLI, e si ramifica sul NOME (C3)', () => {
  // 📌 Forma misurata via PostgREST, non dedotta:
  //   message → 'duplicate key value violates unique constraint "…"'
  //   details → 'Key (laboratorio_id, anno_ddc, progressivo_ddc)=(…) already exists.'
  const dupe = (vincolo: string, dettaglio = 'Key (x)=(1) already exists.') => ({
    code: '23505',
    message: `duplicate key value violates unique constraint "${vincolo}"`,
    details: dettaglio,
    hint: null,
  })

  it('lo stesso evento ha già annullato una dichiarazione → si riconosce per nome', () => {
    const c = classificaErroreAttoUnico(dupe('ddc_evento_annulla_unique'))
    if (c.tipo !== 'vincolo') throw new Error(`atteso vincolo, ricevuto ${c.tipo}`)
    expect(c.vincolo).toBe('evento_gia_consumato')
  })

  it('la dichiarazione vecchia è già stata superata da un\'altra', () => {
    const c = classificaErroreAttoUnico(dupe('ddc_sostituisce_unique'))
    if (c.tipo !== 'vincolo') throw new Error(`atteso vincolo, ricevuto ${c.tipo}`)
    expect(c.vincolo).toBe('gia_superata')
  })

  it('la coppia anno+progressivo è già stata bruciata', () => {
    const c = classificaErroreAttoUnico(
      dupe('dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key')
    )
    if (c.tipo !== 'vincolo') throw new Error(`atteso vincolo, ricevuto ${c.tipo}`)
    expect(c.vincolo).toBe('numero_gia_usato')
  })

  it('🛑 un 23505 su un vincolo che non è nessuno dei tre è un GUASTO, non un esito', () => {
    // Ramificare sul solo codice direbbe «riprova più tardi» a un difetto che
    // non c'entra niente. Il nome è l'unica cosa che distingue i tre.
    expect(classificaErroreAttoUnico(dupe('dichiarazioni_conformita_pkey')).tipo).toBe('guasto')
  })
})

describe('gli altri codici, e il ripiego', () => {
  it.each([
    ['23502 — una metà della coppia vale null', '23502'],
    ['22P02 — anno o progressivo non numerici', '22P02'],
    ['22003 — anno fuori dall\'intervallo di smallint', '22003'],
    ['22007 — un gettone non interpretabile come istante', '22007'],
    ['42501 — la chiamata non viene da service_role', '42501'],
  ])('%s → guasto', (_n, code) => {
    expect(classificaErroreAttoUnico({ code, message: 'qualunque cosa' }).tipo).toBe('guasto')
  })

  it('un errore senza codice non passa per una richiesta sbagliata', () => {
    expect(classificaErroreAttoUnico({ message: 'boh' }).tipo).toBe('guasto')
  })

  it('un errore assente è comunque un guasto: non si chiama questa funzione a vuoto', () => {
    expect(classificaErroreAttoUnico(null).tipo).toBe('guasto')
  })

  it('🛑 il testo del database NON esce mai come classificazione di vincolo', () => {
    // Un `violates unique constraint` in faccia a un\'operatrice non è un
    // messaggio d\'errore, è un vicolo cieco.
    const c = classificaErroreAttoUnico(dupeNota())
    expect(JSON.stringify(c)).not.toMatch(/duplicate key|violates/i)
  })

  function dupeNota() {
    return {
      code: '23505',
      message: 'duplicate key value violates unique constraint "ddc_evento_annulla_unique"',
      details: null,
      hint: null,
    }
  }
})
