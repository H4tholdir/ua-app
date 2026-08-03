import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CampoTesto } from '@/components/ds/Campo'

describe('CampoTesto — aiuto e tastiera (P31, D184)', () => {
  it('senza aiuto non rende nessun testo in piu', () => {
    const { container } = render(<CampoTesto label="Nome" valore="" onCambia={() => {}} />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('con aiuto lo rende, e lo LEGA all-input per chi usa un lettore di schermo', () => {
    render(<CampoTesto label="Cellulare WhatsApp" valore="" onCambia={() => {}}
                       aiuto="Qui arrivano i messaggi di consegna. Dev'essere un cellulare, non il fisso." />)
    const input = screen.getByLabelText('Cellulare WhatsApp')
    const idAiuto = input.getAttribute('aria-describedby')
    expect(idAiuto).toBeTruthy()
    expect(document.getElementById(idAiuto!)?.textContent).toContain('cellulare')
  })

  it('senza inputMode resta come prima: nessun inputMode imposto', () => {
    render(<CampoTesto label="Nome" valore="" onCambia={() => {}} />)
    expect(screen.getByLabelText('Nome').getAttribute('inputmode')).toBeNull()
  })

  // Su una PWA da telefono: per un numero deve uscire il tastierino,
  // non la tastiera delle lettere.
  it('con inputMode tel chiede al telefono il tastierino', () => {
    render(<CampoTesto label="Telefono" valore="" onCambia={() => {}} inputMode="tel" />)
    expect(screen.getByLabelText('Telefono').getAttribute('inputmode')).toBe('tel')
  })
})
