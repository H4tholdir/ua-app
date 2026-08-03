import { describe, it, expect } from 'vitest'
import { buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'

describe('P31 — chi manda WhatsApp legge il CELLULARE, non il telefono dello studio', () => {
  // Il caso vero in banca dati: fisso nello studio, cellulare separato.
  const cliente = { telefono: '0976 71439', cellulare_whatsapp: '333 1234567' }

  it('il link si costruisce col cellulare, non col fisso', () => {
    const url = buildWhatsappUrl('ciao', cliente.cellulare_whatsapp)
    expect(url).toContain('wa.me/393331234567')
    expect(url).not.toContain('097671439')
  })

  it('senza cellulare il link resta SENZA destinatario, e non ripiega sul fisso', () => {
    const url = buildWhatsappUrl('ciao', undefined)
    expect(url).toBe('https://wa.me/?text=ciao')
    expect(url).not.toContain('097671439')
  })
})
