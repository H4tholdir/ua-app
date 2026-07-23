// Task 13 (D7, spec redesign §3.2) — la linguetta «Le cassette»: invito silenzioso allo
// swipe che appare al mount della home, resta ~5s e si ritira (uscendo dall'albero, non solo
// dalla vista), pensato per chi non ha ancora scoperto la stanza Parete. Si spegne per sempre
// dopo 3 accessi riusciti (riserva UX 3b) — persistenza per-device in localStorage, pattern
// `ua_sounds_v3` (nessuna migration).
//
// Timer reali → `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime(...))`: senza,
// il test dovrebbe attendere 5 secondi reali per verificare il ritiro.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { LinguettaCassette, registraAccessoParete } from '@/components/features/home/LinguettaCassette'

describe('LinguettaCassette (D7, mockup C2 ratificato)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  // L'uscita anima con `molla.smooth` (spring), pilotata da Motion via requestAnimationFrame —
  // non dai timer di JS, che i fake timers non toccano (stesso pattern collaudato di
  // `tests/unit/ds-v3/componenti/avviso-caricamento-vuoto.test.tsx`): `advanceTimersByTime`
  // fa scattare il SETTIMEOUT dei 5s (che porta `inVista` a false), poi si torna a timer
  // reali perché lo smontaggio vero avviene dopo che la spring finisce.
  it('appare al mount, si ritira dopo ~5s (aria-hidden e fuori dall’albero)', async () => {
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i })).toBeTruthy()
    act(() => vi.advanceTimersByTime(5000))
    vi.useRealTimers()
    await waitFor(() => expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull())
  })

  it('hit-area ≥44px anche se il disegno è ~26px (riserva UX 3a): il button porta la classe con l’estensione', () => {
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i }).className).toContain('ds-linguetta')
  })

  it('apprendimento (riserva UX 3b): dopo 3 accessi registrati non compare più', () => {
    registraAccessoParete()
    registraAccessoParete()
    registraAccessoParete()
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
  })

  it('il tap chiama onVai e registra l’accesso', () => {
    const onVai = vi.fn()
    render(<LinguettaCassette onVai={onVai} visibile />)
    fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    expect(onVai).toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('ua_linguetta_v3') ?? '0')).toBe(1)
  })

  it('visibile=false (stanza parete attiva): mai renderizzata', () => {
    render(<LinguettaCassette onVai={() => {}} visibile={false} />)
    expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
  })
})
