import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LePile } from '@/components/features/pile/LePile'

const CONTEGGI = { rossa: 2, ambra: 4, viola: 1, blu: 2 }

describe('LePile — vista «Le pile» di /lavori senza param (§4.1, P1)', () => {
  it('4 raggruppamenti-link con href /lavori?pila=… e il conteggio corretto', () => {
    render(<LePile conteggi={CONTEGGI} />)
    const attese: Array<[string, string]> = [
      ['Da consegnare oggi', 'rossa'],
      ['Sul banco', 'ambra'],
      ['Da rifare / In prova', 'viola'],
      ['Appena arrivati', 'blu'],
    ]
    for (const [label, pila] of attese) {
      const link = screen.getByRole('link', { name: new RegExp(label) })
      expect(link).toHaveAttribute('href', `/lavori?pila=${pila}`)
    }
    expect(screen.getByText('2', { selector: 'a[href="/lavori?pila=rossa"] span:last-child' })).toBeInTheDocument()
    expect(screen.getByText('4', { selector: 'a[href="/lavori?pila=ambra"] span:last-child' })).toBeInTheDocument()
  })

  it('il raggruppamento aperto porta il ring di selezione (inset 2.5px --red), gli altri no', () => {
    render(<LePile conteggi={CONTEGGI} pilaAperta="viola" />)
    const violaLink = screen.getByRole('link', { name: /Da rifare/ })
    expect(violaLink.style.boxShadow).toContain('inset 0 0 0 2.5px var(--red)')
    const rossaLink = screen.getByRole('link', { name: /Da consegnare oggi/ })
    expect(rossaLink.style.boxShadow).not.toContain('inset')
  })

  it('children (le card del raggruppamento aperto) compaiono sotto l\'elenco', () => {
    render(<LePile conteggi={CONTEGGI} pilaAperta="rossa"><p>card di prova</p></LePile>)
    expect(screen.getByText('card di prova')).toBeInTheDocument()
  })

  it('senza pilaAperta né children: solo titolo, hint e i 4 raggruppamenti', () => {
    render(<LePile conteggi={CONTEGGI} />)
    expect(screen.getByText('Le pile')).toBeInTheDocument()
    expect(screen.getByText('Tocca un raggruppamento per aprirlo')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })
})
