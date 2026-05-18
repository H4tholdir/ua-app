import { describe, it, expect } from 'vitest'
import { detectProvider } from '@/lib/pec/providers'

describe('detectProvider', () => {
  it('rileva Aruba PEC', () => {
    const p = detectProvider('lab@pec.aruba.it')
    expect(p?.name).toBe('Aruba PEC')
    expect(p?.host).toBe('smtps.pec.aruba.it')
    expect(p?.port).toBe(465)
  })

  it('rileva Legalmail', () => {
    const p = detectProvider('lab@cert.legalmail.it')
    expect(p?.name).toBe('Legalmail')
    expect(p?.host).toBe('sendm.cert.legalmail.it')
  })

  it('ritorna null per provider sconosciuto', () => {
    expect(detectProvider('lab@peclocale.it')).toBeNull()
  })

  it('è case-insensitive', () => {
    expect(detectProvider('LAB@PEC.ARUBA.IT')).not.toBeNull()
  })

  it('ritorna null per email malformata', () => {
    expect(detectProvider('nonunemail')).toBeNull()
  })
})
