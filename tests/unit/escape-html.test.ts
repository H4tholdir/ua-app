import { describe, expect, it } from 'vitest'
import { escapeHtml } from '@/lib/utils/escape-html'

describe('escapeHtml', () => {
  it('escapa i tag script per prevenire injection HTML', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })

  it('escapa la e commerciale', () => {
    expect(escapeHtml('Rete A & B')).toBe('Rete A &amp; B')
  })

  it('escapa le virgolette doppie e singole', () => {
    expect(escapeHtml(`Lab "Sorriso" e L'Odontotecnico`)).toBe(
      'Lab &quot;Sorriso&quot; e L&#39;Odontotecnico'
    )
  })

  it('lascia invariata una stringa senza caratteri speciali', () => {
    expect(escapeHtml('Laboratorio Rossi Srl')).toBe('Laboratorio Rossi Srl')
  })
})
