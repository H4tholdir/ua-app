// Task 13 (D7, spec redesign §3.2) — la linguetta «Le cassette»: invito silenzioso allo
// swipe che appare al mount della home, resta ~5s e si ritira (uscendo dall'albero, non solo
// dalla vista), pensato per chi non ha ancora scoperto la stanza Parete. Si spegne per sempre
// dopo 3 accessi riusciti (riserva UX 3b) — persistenza per-device in localStorage, pattern
// `ua_sounds_v3` (nessuna migration).
//
// Timer reali → `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime(...))`: senza,
// il test dovrebbe attendere 5 secondi reali per verificare il ritiro.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { LinguettaCassette, registraAccessoParete } from '@/components/features/home/LinguettaCassette'

const srcCss = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')

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
    expect(JSON.parse(localStorage.getItem('ua_linguetta_v4') ?? '0')).toBe(1)
  })

  it('visibile=false (stanza parete attiva): mai renderizzata', () => {
    render(<LinguettaCassette onVai={() => {}} visibile={false} />)
    expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
  })

  // QA device (verbale 25/07, fix-list D4, parte meccanica) — CAUSA: il contatore
  // `ua_linguetta_v3` era saturo (≥3) sui device dei collaudi, quindi la linguetta non
  // compariva più a prescindere da quanto fosse davvero appresa la scoperta della parete su
  // QUESTO device. Bump della chiave a `ua_linguetta_v4`: un vecchio contatore rimasto sotto
  // la chiave morta non deve più avere alcun effetto — la linguetta torna a comparire.
  it('D4 (bump chiave) — un vecchio contatore saturo sotto la chiave morta ua_linguetta_v3 NON impedisce più la comparsa', () => {
    localStorage.setItem('ua_linguetta_v3', '3')
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i })).toBeTruthy()
  })

  it('D4 — la persistenza vive sotto la chiave ua_linguetta_v4 (non più v3)', () => {
    registraAccessoParete()
    expect(localStorage.getItem('ua_linguetta_v4')).toBe('1')
    expect(localStorage.getItem('ua_linguetta_v3')).toBeNull()
  })
})

// QA device (verbale 2026-07-24 «Ri-collaudo device #2», fix-list G3-grafica) — il
// contenuto della linguetta non era centrato nel suo corpo (card 26px). Causa: `text-align`
// centra l'asse INLINE, che per `.eti` (writing-mode: vertical-rl) è verticale, non
// orizzontale — l'asse di blocco (lo spessore della colonna, quello che andava centrato)
// non aveva alcuna regola, e il testo restava appoggiato al lato di partenza del blocco
// invece che in mezzo. Guardia testuale (stesso pattern di home-fluida.test.tsx: jsdom non
// fa layout, qui si presidia che la CSS dichiari il meccanismo corretto, non il pixel
// finale — quello è compito del QA device).
describe('LinguettaCassette — G3-grafica: `.eti` centrato sull\'asse di blocco (writing-mode: vertical-rl)', () => {
  it('`.eti` è un contenitore flex con align-items/justify-content: center — non più solo text-align (che non centra l\'asse di blocco in vertical-rl)', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta \.eti \{[^}]*writing-mode:\s*vertical-rl;\s*width:\s*26px;\s*display:\s*flex;\s*align-items:\s*center;\s*justify-content:\s*center;/
    )
  })

  it('grandezza invariata: width resta 26px (pari alla card), font-size/letter-spacing/text-transform invariati — solo la centratura cambia', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta \.eti \{[^}]*width:\s*26px;[^}]*font-size:\s*10px;\s*font-weight:\s*700;\s*letter-spacing:\s*\.13em;\s*color:\s*var\(--muted\);\s*text-transform:\s*uppercase;/
    )
  })

  it('`.fre` e `.mini-rete` restano invariati (bug scoped al solo `.eti`, che aveva l\'asse sbagliato per il testo verticale)', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta \.fre \{ position: relative; font-size: 13px; font-weight: 800; color: var\(--red\); width: 26px; text-align: center; \}/
    )
    expect(srcCss).toMatch(
      /\[data-ds="v3"\] \.ds-linguetta \.mini-rete \{\s*position: relative; width: 13px; height: 18px; margin: 6px 6\.5px; border-radius: 2px; opacity: \.45;/
    )
  })
})
