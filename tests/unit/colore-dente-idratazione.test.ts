import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  SCALA_DI_CODICE,
  scalaDelCodice,
  idrataColoreScheda,
  risolviColore,
} from '@/lib/domain/colore-dente'

// ═══════════════════════════════════════════════════════════════════════════
// Task 12 — la strada del RITORNO.
//
// Due cose vivono qui e vanno provate insieme:
//   ① la mappa codice → scala, che il client usa perché `PUT /denti` (a
//     differenza di `POST /api/lavori`) NON deduce la scala dal catalogo —
//     asimmetria dichiarata a `denti/route.ts:157-160`, assegnata al T11-bis;
//   ② l'idratazione della scheda dalle righe di `lavori_denti`, con la
//     precedenza riga → caso già scritta dal Task 2.
// ═══════════════════════════════════════════════════════════════════════════

const MIGRATION = 'supabase/migrations/20260727120000_lavori_denti.sql'

/** Le coppie (scala, codice) davvero inserite in `colori_dentali`. */
function catalogoDallaMigration(): Array<[string, string]> {
  const sql = readFileSync(MIGRATION, 'utf-8')
  const tuple = [...sql.matchAll(/\('(vita_classical|vita_3d_master|fuori_scala)','([^']+)','[^']*',\d+\)/g)]
  return tuple.map((m) => [m[1], m[2]])
}

describe('la mappa codice → scala è il catalogo, non una convenzione scritta a mano', () => {
  it('la migration contiene le 48 coppie attese (16 + 29 + 3)', () => {
    const catalogo = catalogoDallaMigration()
    expect(catalogo).toHaveLength(48)
    expect(catalogo.filter(([s]) => s === 'vita_classical')).toHaveLength(16)
    expect(catalogo.filter(([s]) => s === 'vita_3d_master')).toHaveLength(29)
    expect(catalogo.filter(([s]) => s === 'fuori_scala')).toHaveLength(3)
  })

  it('ogni codice del catalogo è nella mappa, con la SUA scala', () => {
    for (const [scala, codice] of catalogoDallaMigration()) {
      expect(scalaDelCodice(codice), `codice ${codice}`).toBe(scala)
    }
  })

  it('la mappa non inventa codici che il catalogo non ha', () => {
    const catalogo = new Set(catalogoDallaMigration().map(([, c]) => c))
    for (const codice of SCALA_DI_CODICE.keys()) {
      expect(catalogo.has(codice), `codice ${codice} non è in ${MIGRATION}`).toBe(true)
    }
  })

  it('un codice sconosciuto dà null — mai una scala tirata a indovinare', () => {
    // È il difetto che questa mappa esiste per impedire: dedurre
    // «non è T/BL/OM → allora è vita_classical» manderebbe ('vita_classical',
    // '2M2') contro `lavori_denti_colore_fk`, cioè un 500 permanente.
    expect(scalaDelCodice('ZZ9')).toBeNull()
    expect(scalaDelCodice('')).toBeNull()
    expect(scalaDelCodice('a3')).toBeNull()   // il catalogo distingue le maiuscole
  })
})

describe('la scheda si idrata dalle righe, non dalle quattro colonne orfane', () => {
  const NESSUN_CASO = { colore_scala: null, colore_codice: null }

  it('senza righe e senza caso, le quattro caselle restano vuote', () => {
    expect(idrataColoreScheda([], NESSUN_CASO)).toEqual({
      colore_dente: null, colore_collo: null, colore_corpo: null, colore_incisale: null,
    })
    expect(idrataColoreScheda(null, NESSUN_CASO)).toEqual({
      colore_dente: null, colore_collo: null, colore_corpo: null, colore_incisale: null,
    })
  })

  it('la riga col colore vince, e porta con sé le tre zone del ceramista', () => {
    const righe = [
      { fdi: 13, ruolo: 'elemento', scala: null, codice: null,
        codice_collo: null, codice_corpo: null, codice_incisale: null },
      { fdi: 11, ruolo: 'elemento', scala: 'vita_classical', codice: 'B1',
        codice_collo: 'A2', codice_corpo: 'A3', codice_incisale: 'C1' },
    ]
    expect(idrataColoreScheda(righe, { colore_scala: 'vita_classical', colore_codice: 'A3' })).toEqual({
      colore_dente: 'B1', colore_collo: 'A2', colore_corpo: 'A3', colore_incisale: 'C1',
    })
  })

  it('senza colore sulle righe si ricade sul default di caso (i lavori nati dal wizard)', () => {
    // Il wizard scrive il colore SOLO nel default di caso
    // (`crea-lavoro.ts:236-249`): le righe nascono senza. Senza questa ricaduta
    // ogni lavoro creato dal wizard mostrerebbe la casella colore VUOTA.
    const righe = [{ fdi: 11, ruolo: 'elemento', scala: null, codice: null,
                     codice_collo: null, codice_corpo: null, codice_incisale: null }]
    expect(idrataColoreScheda(righe, { colore_scala: 'vita_3d_master', colore_codice: '2M2' })).toEqual({
      colore_dente: '2M2', colore_collo: null, colore_corpo: null, colore_incisale: null,
    })
  })

  it('è la stessa precedenza del Task 2 — una regola sola, non due letture', () => {
    const riga = { fdi: 11, scala: 'vita_classical', codice: 'B1' }
    const caso = { colore_scala: 'vita_3d_master', colore_codice: '2M2' }
    expect(risolviColore(riga, caso)?.codice).toBe('B1')
    expect(idrataColoreScheda([{ ...riga, codice_collo: null, codice_corpo: null, codice_incisale: null }], caso)
      .colore_dente).toBe('B1')
  })

  it('LIMITE DICHIARATO (ondata b): svuotare il colore non regge se il caso ne ha uno', () => {
    // Svuotando la tendina la riga perde la coppia, e la precedenza ricade sul
    // default di caso — che in questa ondata NON ha uno scrittore
    // (`lavori.colore_scala`/`colore_codice` non sono in PATCHABLE_FIELDS e le
    // due RPC non li aggiornano). Ricaricando, il colore riappare.
    // Comportamento FISSATO qui perché sia una scelta dichiarata e non una
    // sorpresa: la via di correzione del default di caso è ondata (b).
    const righeSvuotate = [{ fdi: 11, ruolo: 'elemento', scala: null, codice: null,
                             codice_collo: null, codice_corpo: null, codice_incisale: null }]
    expect(idrataColoreScheda(righeSvuotate, { colore_scala: 'vita_classical', colore_codice: 'A3' })
      .colore_dente).toBe('A3')
  })
})
