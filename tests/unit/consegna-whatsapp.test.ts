import { describe, it, expect } from 'vitest'
import { buildWhatsappMessage, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'

describe('buildWhatsappMessage — GDPR compliance', () => {
  const base = {
    numeroLavoro: '2026/0094',
    portalToken: 'tok_abc123',
  }

  it('non contiene nome paziente', () => {
    const msg = buildWhatsappMessage({ ...base })
    expect(msg).not.toContain('Mario Rossi')
    expect(msg).not.toContain('Rossi')
  })

  it('non contiene tipo prestazione', () => {
    const msg = buildWhatsappMessage({ ...base })
    expect(msg).not.toContain('Protesi mobile totale')
    expect(msg).not.toContain('mobile totale')
  })

  it('contiene numero lavoro', () => {
    const msg = buildWhatsappMessage(base)
    expect(msg).toContain('2026/0094')
  })

  it('contiene link portale', () => {
    const msg = buildWhatsappMessage(base)
    expect(msg).toContain('tok_abc123')
  })

  it('genera URL WhatsApp valido senza telefono', () => {
    const msg = buildWhatsappMessage(base)
    const url = buildWhatsappUrl(msg)
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(url).toContain(encodeURIComponent(msg))
  })

  it('token vuoto produce messaggio senza link portale', () => {
    const msg = buildWhatsappMessage({ numeroLavoro: '2026/0094', portalToken: '' })
    expect(msg).toContain('2026/0094')
    expect(msg).not.toContain('/portale/')
    expect(msg).toContain('UÀ Lab')
  })
})

describe('buildWhatsappUrl', () => {
  const msg = 'Test message'

  it('senza telefono genera URL generico', () => {
    const url = buildWhatsappUrl(msg)
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })

  it('con telefono genera URL diretto', () => {
    const url = buildWhatsappUrl(msg, '+39 333 123 4567')
    expect(url).toMatch(/^https:\/\/wa\.me\/393331234567\?text=/)
  })

  it('rimuove caratteri non numerici dal telefono', () => {
    const url = buildWhatsappUrl(msg, '+39-333-123-4567')
    expect(url).toContain('393331234567')
    expect(url).not.toContain('+')
    expect(url).not.toContain('-')
  })
})
