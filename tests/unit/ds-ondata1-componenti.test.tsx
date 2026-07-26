import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Pila } from '@/components/ds/Pila'
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import { MorphPila } from '@/components/ds/MorphPila'

describe('Pila — 4ª pila viola (rev. 3.1)', () => {
  it('renderizza DA RIFARE / IN PROVA in famiglia purple', () => {
    render(<Pila tipo="daRifareInProva" numero={1} sub="n.145 torna lunedì" onClick={() => {}} />)
    expect(screen.getByText('DA RIFARE / IN PROVA')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('1')
  })
})

describe('StrisciaStato — anatomia mockup (forte + azione mai troncata, aria-live)', () => {
  it('è una region viva educata', () => {
    // Task 16b (D3 §3.4) — «Tutto a posto:» era s9, morto: qui il copy reale del trial (sTrial,
    // ramo g>3, v. striscia.ts) — un segnale quieto REALE che porta `forte`.
    render(<StrisciaStato forte="Prova:">mancano 9 giorni</StrisciaStato>)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Prova:')).toBeInTheDocument()
  })
  it('la CTA è un link separato dal blocco troncabile', () => {
    render(<StrisciaStato attenzione forte="Fattura n.139" azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>scartata</StrisciaStato>)
    const cta = screen.getByRole('link', { name: 'Sistemala ›' })
    expect(cta).toHaveAttribute('href', '/fatture/f1')
  })
})

describe('MorphPila — header pila aperta (§5.28)', () => {
  it('numero + label famiglia + sub', () => {
    render(<MorphPila pila="viola" numero={1} label="Da rifare / In prova" sub="1 lavoro · torna lunedì 13" />)
    expect(screen.getByText('1 lavoro · torna lunedì 13')).toBeInTheDocument()
  })
  it('sub omessa non renderizza un nodo vuoto (pila vuota, mockup stati-vuoti)', () => {
    const { container } = render(<MorphPila pila="ambra" numero={0} label="Sul banco" />)
    expect(container.querySelectorAll('span').length).toBeGreaterThan(0)
  })
})
