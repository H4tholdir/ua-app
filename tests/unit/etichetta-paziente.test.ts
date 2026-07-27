import { describe, it, expect } from 'vitest'
import { pazienteEtichetta } from '@/components/features/pdf/EtichettaTemplate'
import type { LavoroDettaglio, Paziente } from '@/types/domain'

const l = (p: Partial<LavoroDettaglio>) => p as LavoroDettaglio

describe('EtichettaTemplate — il paziente, allineato a IFU e Ricevuta (G1)', () => {
  it('il CODICE viene per primo, come negli altri due template', () => {
    expect(pazienteEtichetta(l({
      paziente_nome_snapshot: 'BAGHERIA GIUSEPPE',
      paziente: { codice_paziente: 'PZ-0042', nome: 'Giuseppe', cognome: 'Bagheria' } as Paziente,
    }))).toBe('PAZ-PZ-0042')
  })

  it('senza codice: iniziale del nome + cognome (anonimizzazione parziale)', () => {
    expect(pazienteEtichetta(l({
      paziente_nome_snapshot: null,
      paziente: { codice_paziente: null, nome: 'Giuseppe', cognome: 'Bagheria' } as Paziente,
    }))).toBe('G. Bagheria')
  })

  it('senza codice e senza nome/cognome: si ricade sullo snapshot, abbreviato', () => {
    expect(pazienteEtichetta(l({
      paziente_nome_snapshot: 'BAGHERIA GIUSEPPE',
      paziente: { codice_paziente: null, nome: null, cognome: null } as Paziente,
    }))).toBe('B. GIUSEPPE')
  })

  it('niente di niente → la stessa sentinella degli altri due', () => {
    expect(pazienteEtichetta(l({ paziente_nome_snapshot: null, paziente: null })))
      .toBe('N.A. (GDPR)')
  })
})
