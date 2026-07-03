import { describe, it, expect } from 'vitest'
import { isRuoloInvitabileDaTitolare, RUOLI_INVITABILI_DA_TITOLARE } from '@/lib/invito/ruoli'

describe('isRuoloInvitabileDaTitolare', () => {
  it('accetta "tecnico"', () => {
    expect(isRuoloInvitabileDaTitolare('tecnico')).toBe(true)
  })

  it('accetta "front_desk"', () => {
    expect(isRuoloInvitabileDaTitolare('front_desk')).toBe(true)
  })

  it('accetta "titolare" (co-titolare)', () => {
    expect(isRuoloInvitabileDaTitolare('titolare')).toBe(true)
  })

  it('rifiuta "admin_rete" (riservato ad admin_sistema)', () => {
    expect(isRuoloInvitabileDaTitolare('admin_rete')).toBe(false)
  })

  it('rifiuta "admin_sistema"', () => {
    expect(isRuoloInvitabileDaTitolare('admin_sistema')).toBe(false)
  })

  it('rifiuta valori non stringa', () => {
    expect(isRuoloInvitabileDaTitolare(null)).toBe(false)
    expect(isRuoloInvitabileDaTitolare(undefined)).toBe(false)
    expect(isRuoloInvitabileDaTitolare(42)).toBe(false)
  })

  it('espone esattamente i 3 ruoli invitabili, in ordine', () => {
    expect(RUOLI_INVITABILI_DA_TITOLARE).toEqual(['tecnico', 'front_desk', 'titolare'])
  })
})
