// tests/unit/AttivaAccessoRapido.test.tsx
// N14 deferral: ingresso manuale persistente «Attiva accesso rapido» in
// Impostazioni→Sicurezza — indipendente da skip 30gg e cap proposte.
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AttivaAccessoRapido } from '@/components/features/impostazioni/AttivaAccessoRapido'

const EMAIL = 'titolare@lab.it'

beforeEach(() => {
  localStorage.clear()
})

describe('AttivaAccessoRapido (Impostazioni → Sicurezza)', () => {
  it('mostra il bottone anche con skip 30gg e cap raggiunto (ingresso manuale sempre disponibile)', () => {
    localStorage.setItem('ua_passkey_skip_until', new Date(Date.now() + 86_400_000).toISOString())
    localStorage.setItem('ua_passkey_prompt_count', '99')
    render(<AttivaAccessoRapido email={EMAIL} />)
    expect(screen.getByRole('button', { name: /attiva accesso rapido/i })).toBeTruthy()
  })

  it('click → apre il modal di registrazione passkey', async () => {
    render(<AttivaAccessoRapido email={EMAIL} />)
    fireEvent.click(screen.getByRole('button', { name: /attiva accesso rapido/i }))
    expect(await screen.findByRole('dialog', { name: /accesso biometrico/i })).toBeTruthy()
  })

  it('passkey già attiva su questo dispositivo → stato indicato', () => {
    localStorage.setItem('ua_passkey_email', EMAIL)
    render(<AttivaAccessoRapido email={EMAIL} />)
    expect(screen.getByText(/attivo su questo dispositivo/i)).toBeTruthy()
  })
})
