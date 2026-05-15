import { describe, it, expect } from 'vitest'
import { generatePecMessageId } from '@/lib/consegna/pec-idempotency'

describe('generatePecMessageId', () => {
  it('generates deterministic ID for same inputs', () => {
    const id1 = generatePecMessageId('lab-uuid-123', 'lavoro-uuid-456', 'fattura')
    const id2 = generatePecMessageId('lab-uuid-123', 'lavoro-uuid-456', 'fattura')
    expect(id1).toBe(id2)
  })

  it('generates different IDs for different inputs', () => {
    const id1 = generatePecMessageId('lab-uuid-123', 'lavoro-uuid-456', 'fattura')
    const id2 = generatePecMessageId('lab-uuid-123', 'lavoro-uuid-789', 'fattura')
    expect(id1).not.toBe(id2)
  })

  it('format is valid as email Message-ID', () => {
    const id = generatePecMessageId('lab-123', 'lav-456', 'fattura')
    expect(id).toMatch(/^<ua-[a-f0-9]+-[a-f0-9]+@ua\.app>$/)
  })

  it('tipo ddc generates different ID than fattura', () => {
    const id1 = generatePecMessageId('lab-123', 'lav-456', 'fattura')
    const id2 = generatePecMessageId('lab-123', 'lav-456', 'ddc')
    expect(id1).not.toBe(id2)
  })
})
