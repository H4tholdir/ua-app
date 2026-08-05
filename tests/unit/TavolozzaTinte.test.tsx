import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TavolozzaTinte } from '@/components/features/lavori/TavolozzaTinte'
import type { TintaManufatto } from '@/lib/domain/tinta'

const TINTE: TintaManufatto[] = [
  { famiglia: 'sport', codice: 'trasparente', nome: 'Trasparente', ordine: 1, hex: null },
  { famiglia: 'sport', codice: 'bianco', nome: 'Bianco', ordine: 2, hex: '#FFFFFF' },
  { famiglia: 'sport', codice: 'rosso', nome: 'Rosso', ordine: 7, hex: '#D90012' },
]

describe('TavolozzaTinte — la griglia di pastiglie (D119)', () => {
  it('mostra tutte le tinte, nell ordine in cui arrivano dal catalogo', () => {
    render(<TavolozzaTinte tinte={TINTE} scelta={null} onScegli={() => {}} />)
    const nomi = screen.getAllByRole('button').map((b) => b.textContent)
    // «Nessuna tinta» è la prima voce (D113): è la via per toglierla.
    expect(nomi).toEqual(['Nessuna tinta', 'Trasparente', 'Bianco', 'Rosso'])
  })

  it('scegliere una tinta consegna la RIGA INTERA, non solo il codice', () => {
    const onScegli = vi.fn()
    render(<TavolozzaTinte tinte={TINTE} scelta={null} onScegli={onScegli} />)
    fireEvent.click(screen.getByRole('button', { name: 'Rosso' }))
    // 🔑 Serve l'oggetto intero, non la coppia: chi salva deve poter aggiornare
    //    la riga della scheda col NOME NUOVO senza tornare al server. Con la
    //    sola coppia si vedrebbe il nome vecchio accanto al codice nuovo.
    expect(onScegli).toHaveBeenCalledWith({
      famiglia: 'sport',
      codice: 'rosso',
      nome: 'Rosso',
      ordine: 7,
      hex: '#D90012',
    })
  })

  it('«Nessuna tinta» è un gesto esplicito, e vale null', () => {
    const onScegli = vi.fn()
    render(<TavolozzaTinte tinte={TINTE} scelta={null} onScegli={onScegli} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nessuna tinta' }))
    expect(onScegli).toHaveBeenCalledWith(null)
  })

  it('una tinta senza pallino non rende il pallino (D114) — ma il nome c è sempre', () => {
    render(<TavolozzaTinte tinte={TINTE} scelta={null} onScegli={() => {}} />)
    const trasparente = screen.getByRole('button', { name: 'Trasparente' })
    const rosso = screen.getByRole('button', { name: 'Rosso' })
    expect(trasparente.querySelector('[data-pallino]')).toBeNull()
    expect(rosso.querySelector('[data-pallino]')).not.toBeNull()
  })

  it('la tinta scelta si riconosce SENZA guardare il colore', () => {
    // 🛑 Il colore non è mai l'unica fonte di stato (DS v3 + accessibilità):
    //    la selezione deve leggersi da un attributo, non solo dal bordo rosso.
    render(
      <TavolozzaTinte tinte={TINTE} scelta={{ famiglia: 'sport', codice: 'rosso' }} onScegli={() => {}} />
    )
    expect(screen.getByRole('button', { name: 'Rosso' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Bianco' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('senza tinta scelta, «Nessuna tinta» è la voce attiva', () => {
    render(<TavolozzaTinte tinte={TINTE} scelta={null} onScegli={() => {}} />)
    expect(screen.getByRole('button', { name: 'Nessuna tinta' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('un catalogo vuoto non rende una griglia con la sola via di uscita', () => {
    // Se il catalogo non ha risposto (v. `caricaTinteScheda`), una tavolozza
    // con dentro solo «Nessuna tinta» inviterebbe a cancellare la tinta invece
    // di dire che non c'è niente da scegliere.
    const { container } = render(<TavolozzaTinte tinte={[]} scelta={null} onScegli={() => {}} />)
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })
})
