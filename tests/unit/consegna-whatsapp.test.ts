import { describe, it, expect } from 'vitest'
import { buildWhatsappMessage, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'

// ⚖️ D345 (09/08/2026) — la firma è il NOME DEL LABORATORIO, non «UÀ Lab».
const LAB = 'Laboratorio Odontotecnico di Prova'

describe('buildWhatsappMessage — GDPR compliance', () => {
  const base = {
    numeroLavoro: '2026/0094',
    portalToken: 'tok_abc123',
    nomeLaboratorio: LAB,
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
    const msg = buildWhatsappMessage({ numeroLavoro: '2026/0094', portalToken: '', nomeLaboratorio: LAB })
    expect(msg).toContain('2026/0094')
    expect(msg).not.toContain('/portale/')
    // 🔄 ⚖️ D345 — questa riga diceva `toContain('UÀ Lab')`: era l'UNICA prova, in
    //    tutta la casa, che guardasse come finisce un messaggio, e fissava la
    //    firma SBAGLIATA. Ora fissa quella giusta; il resto della regola
    //    (e il divieto della vecchia) sta in
    //    `tests/unit/firma-messaggi-nome-laboratorio.test.ts`.
    expect(msg).toContain(`— ${LAB}`)
    expect(msg).not.toContain('UÀ Lab')
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
