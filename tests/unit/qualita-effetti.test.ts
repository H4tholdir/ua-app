import { describe, it, expect } from 'vitest'
import { effettoDaMotivo, EFFETTI_PER_MOTIVO } from '@/lib/qualita/effetti'
import { MOTIVI } from '@/lib/domain/qualita-costanti'
import type { Motivo } from '@/lib/domain/qualita-costanti'

/**
 * L'ELENCO DEGLI EFFETTI DEI NOVE MOTIVI — D288, D290, D291, D292, D297, D298.
 *
 * 🔑 Questo è il PIANO OPERATIVO, e non è lo stesso di `classifica.ts`.
 * D288 lo dice per intero: «le due righe non erano in contraddizione, parlavano
 * di due piani diversi». `classifica()` risponde alla domanda della NORMA («è un
 * incidente? un reclamo? niente?»); questo modulo risponde alla domanda del
 * BANCO («che cosa succede adesso al lavoro e alla dichiarazione?»).
 *
 * 🛑 LA PROVA CHE CONTA PIÙ DI TUTTE È L'ULTIMA: l'elenco è completo per
 * costruzione, non perché qualcuno lo ha riletto. Un elenco scritto a mano
 * sembra completo e non lo è — in questo progetto è successo QUATTRO volte in
 * un giorno solo (handoff del 07/08, lezione 3). Qui la fonte è `MOTIVI`, che è
 * copiato alla lettera dal CHECK vivo in banca dati.
 */

describe('effettoDaMotivo — l\'elenco degli effetti (D288-D298)', () => {
  describe('la riga che l\'app esegue DA SOLA — l\'unica', () => {
    it('«ho sbagliato a premere consegna» ripristina tutto, e porta l\'azione automatica (D288)', () => {
      const e = effettoDaMotivo('errore_registrazione')
      expect(e.lavoro).toBe('ripristina_tutto')
      expect(e.documento).toBe('annulla')
      expect(e.azione).toBe('riapri_lavoro')
    })

    it('è l\'UNICO dei nove con un\'azione automatica — gli altri otto non fanno niente da soli', () => {
      const conAzione = MOTIVI.filter((m) => effettoDaMotivo(m).azione !== null)
      expect(conAzione).toEqual(['errore_registrazione'])
    })
  })

  describe('le righe decise, che però una scelta o un altro compito devono ancora eseguire', () => {
    it('«persona sbagliata»: il lavoro torna pronto e il documento RESTA VALIDO (D291)', () => {
      const e = effettoDaMotivo('destinatario_errato')
      expect(e.lavoro).toBe('torna_pronto')
      expect(e.documento).toBe('resta_valido')
      // 🛑 E NON è automatica: `riapri_lavoro_atomica` annulla SEMPRE la
      // dichiarazione (20260806210400:138-140), quindi non può servire questa
      // riga. La transizione «pronto col documento intatto» NON ESISTE ancora.
      expect(e.azione).toBeNull()
    })

    it('«difetto di lavorazione» e «difetto del materiale» chiedono una scelta, e il documento la segue (D290, D297, D298)', () => {
      for (const m of ['difetto_lavorazione', 'difetto_materiale'] as const) {
        const e = effettoDaMotivo(m)
        expect(e.lavoro, m).toBe('scelta_richiesta')
        expect(e.documento, m).toBe('segue_la_scelta')
        expect(e.azione, m).toBeNull()
      }
    })

    it('«dato sbagliato sul documento»: il lavoro resta consegnato, il documento si riemette (spec §6, D293①)', () => {
      const e = effettoDaMotivo('errore_dato_dichiarazione')
      expect(e.lavoro).toBe('resta_consegnato')
      expect(e.documento).toBe('riemetti')
    })

    it('«modifica chiesta dal medico»: lavoro NUOVO, non un rientro — e il documento resta valido', () => {
      const e = effettoDaMotivo('modifica_clinica_richiesta')
      expect(e.lavoro).toBe('lavoro_nuovo')
      expect(e.documento).toBe('resta_valido')
    })

    it('«prezzo o quantità»: non si tocca niente, né il lavoro né il documento', () => {
      const e = effettoDaMotivo('errore_prezzo_quantita')
      expect(e.lavoro).toBe('resta_consegnato')
      expect(e.documento).toBe('resta_valido')
    })
  })

  describe('le righe che dichiarano di NON sapere — e lo dicono invece di indovinare', () => {
    it('«reso senza difetto» dipende dal perché, su entrambi i piani (D292)', () => {
      const e = effettoDaMotivo('reso_senza_difetto')
      expect(e.lavoro).toBe('dipende_dal_perche')
      expect(e.documento).toBe('dipende_dal_perche')
      expect(e.azione).toBeNull()
    })

    it('«altro» non fa niente in automatico, e non indovina', () => {
      const e = effettoDaMotivo('altro')
      expect(e.lavoro).toBe('nessuno')
      expect(e.documento).toBe('nessuno')
      expect(e.azione).toBeNull()
    })
  })

  describe('l\'elenco non può perdere una riga in silenzio', () => {
    it('copre TUTTI e nove i motivi del vocabolario, e nessuno in più', () => {
      expect(Object.keys(EFFETTI_PER_MOTIVO).sort()).toEqual([...MOTIVI].sort())
    })

    it('ogni riga porta un perché in parole comuni e la decisione che la regge', () => {
      for (const m of MOTIVI) {
        const e = effettoDaMotivo(m)
        expect(e.perche.length, m).toBeGreaterThan(40)
        expect(e.decisione, m).toMatch(/D\d+|spec §/)
      }
    })

    it('un motivo fuori vocabolario non fa risalire il prototipo di Object', () => {
      // Stesso difetto già chiuso in `naturaDaMotivo` (qualita-costanti.ts): un
      // `Record` indicizzato senza guardia restituisce una FUNZIONE per
      // 'constructor', che poi viaggia come se fosse un effetto.
      // Forme censite: chiave del prototipo · stringa qualunque · assenza ·
      // tipo sbagliato. La firma vieta le ultime tre, ma la firma non gira a
      // runtime e questa funzione governa un'AZIONE, non solo un'etichetta.
      const veleni = ['constructor', '__proto__', 'toString', 'pippo', '', null, undefined, 7, {}]
      for (const veleno of veleni) {
        const e = effettoDaMotivo(veleno as Motivo)
        expect(e.azione, String(veleno)).toBeNull()
        expect(e.lavoro, String(veleno)).toBe('nessuno')
      }
    })
  })
})
