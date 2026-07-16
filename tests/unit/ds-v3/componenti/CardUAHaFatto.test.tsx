import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CardUAHaFatto } from '@/components/ds/CardUAHaFatto'

describe('CardUAHaFatto — voce non-fatta (ondata 16/07)', () => {
  it('voce con fatto:false non mostra il check pieno (CheckTondo "Da fare", non "Fatta")', () => {
    render(
      <CardUAHaFatto
        voci={[
          { nome: 'Dichiarazione di Conformità', sub: 'Generata a ogni consegna ✓' },
          { nome: 'Messaggio WhatsApp', sub: 'Pronto da inviare', fatto: false },
        ]}
      />
    )
    // CheckTondo (RigaFase.tsx, §5.11): fatto → role="img" aria-label="Fatta"
    // (cerchio pieno verde + svg check); non fatto → role="img" aria-label="Da fare"
    // (cerchio dashed, nessun check pieno, nessun svg) — L5: mai ✓ su cose non fatte.
    expect(screen.getByLabelText('Fatta')).toBeInTheDocument()
    expect(screen.getByLabelText('Da fare')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
    // La voce fatta ha lo svg del check; quella non fatta no.
    expect(screen.getByLabelText('Fatta').querySelector('svg')).toBeInTheDocument()
    expect(screen.getByLabelText('Da fare').querySelector('svg')).not.toBeInTheDocument()
  })

  it('senza fatto esplicito, il default resta true (retrocompatibilità)', () => {
    render(<CardUAHaFatto voci={[{ nome: 'DdC firmato e archiviato' }]} />)
    expect(screen.getByLabelText('Fatta')).toBeInTheDocument()
    expect(screen.queryByLabelText('Da fare')).not.toBeInTheDocument()
  })
})
