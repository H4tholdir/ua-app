import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { DialogConferma } from '@/components/ds/DialogConferma'

// La copertura "storica" di DialogConferma (§5.17 — conferma distruttiva
// centrata, reduced motion, aria-labelledby/describedby, dizionario del
// catalogo) vive in sheet-dialog.test.tsx insieme a Sheet: non duplicata qui.
// Questo file copre SOLO la variante additiva del rito consegna (ondata
// 16/07): occhiello, nota ambra, primarioSopra.
describe('DialogConferma — variante consegna (deroga §5.17, ondata 16/07)', () => {
  it('default: ordine invariato — sicura (secondario) PRIMA del distruttivo', () => {
    render(
      <DialogConferma
        aperto
        titolo="Butto?"
        testo="Il lavoro n.148"
        etichettaDistruttiva="Butta"
        etichettaSicura="Tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const bottoni = screen.getAllByRole('button')
    expect(bottoni[0]).toHaveTextContent('Tienilo')
    expect(bottoni[1]).toHaveTextContent('Butta')
  })

  it('primarioSopra: il primario viene PRIMA; occhiello e nota renderizzati', () => {
    render(
      <DialogConferma
        aperto
        primarioSopra
        centraTesto
        occhiello="Consegno?"
        nota="2 materiali sotto scorta"
        titolo="Corona n.147 → Dr. Esposito"
        testo="DdC e buono si generano al tocco."
        etichettaDistruttiva="Consegna"
        etichettaSicura="Non ancora"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const bottoni = screen.getAllByRole('button')
    expect(bottoni[0]).toHaveTextContent('Consegna')
    expect(bottoni[1]).toHaveTextContent('Non ancora')
    expect(screen.getByText('Consegno?')).toBeInTheDocument()
    const nota = screen.getByText('2 materiali sotto scorta')
    expect(nota.style.color).toBe('var(--amber)')
    expect(nota.closest('button, a')).toBeNull()
  })
})
