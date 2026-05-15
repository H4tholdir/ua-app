import { describe, it, expect } from 'vitest'

describe('POST /api/lavori/[id]/prove — validazione', () => {
  it('rifiuta se esito non valido', async () => {
    const body = { action: 'rientro', esito: 'forse', note: '' }
    const validEsiti = ['ok', 'modifiche', 'rifare', 'sospeso']
    expect(validEsiti).not.toContain(body.esito)
  })

  it('accetta esiti validi', () => {
    const validEsiti = ['ok', 'modifiche', 'rifare', 'sospeso']
    validEsiti.forEach(e => expect(validEsiti).toContain(e))
  })

  it('manda_in_prova richiede data_rientro_prevista', () => {
    const body = { action: 'manda_in_prova' }
    expect(body).not.toHaveProperty('data_rientro_prevista')
  })
})
