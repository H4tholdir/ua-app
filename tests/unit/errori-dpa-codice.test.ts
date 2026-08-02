import { describe, it, expect } from 'vitest'
import { ErroreDatiDpa } from '../../src/lib/pdf/errori-dpa'
import { RUOLI_EMISSIONE_DPA, puoEmettereDpa } from '../../src/lib/pdf/permessi-dpa'

describe('ErroreDatiDpa — il codice viaggia con l\'errore', () => {
  it('porta il codice accanto allo stato', () => {
    const e = new ErroreDatiDpa('DPA: cliente privo di Partita IVA e Codice Fiscale', 422, 'CLIENTE_DATI_FISCALI')
    expect(e.stato).toBe(422)
    expect(e.codice).toBe('CLIENTE_DATI_FISCALI')
  })

  it('resta un Error vero (instanceof regge oltre il transpile)', () => {
    const e = new ErroreDatiDpa('x', 404, 'CLIENTE_ASSENTE')
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(ErroreDatiDpa)
    expect(e.name).toBe('ErroreDatiDpa')
  })
})

describe('permessi-dpa — l\'elenco dei ruoli sta in UN posto solo', () => {
  it('ammette i tre ruoli della rotta, e nessun altro', () => {
    expect([...RUOLI_EMISSIONE_DPA].sort()).toEqual(['admin_rete', 'admin_sistema', 'titolare'])
  })

  // 🛑 Il vincolo si prova con un valore che DEVE essere rifiutato (R-P1).
  it.each(['tecnico', 'front_desk', 'admin', '', null, undefined])(
    'rifiuta %s', (ruolo) => {
      expect(puoEmettereDpa(ruolo as string | null | undefined)).toBe(false)
    },
  )

  it.each(['titolare', 'admin_rete', 'admin_sistema'])('ammette %s', (ruolo) => {
    expect(puoEmettereDpa(ruolo)).toBe(true)
  })
})
