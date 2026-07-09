import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import { gradiente, pillVoce, materia } from '@/design-system/v3/tokens'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { PillVoce } from '@/components/ds/PillVoce'

// Mock minimo del Web Speech API — cattura l'ultima istanza costruita così i
// test possono pilotare gli eventi (onresult/onerror/onend) a mano.
type Evento = { results: ArrayLike<ArrayLike<{ transcript: string }>> }

const istanzeCostruite: MockSpeechRecognition[] = []

class MockSpeechRecognition {
  lang = ''
  start = vi.fn()
  stop = vi.fn()
  onresult: ((evento: Evento) => void) | null = null
  onerror: (() => void) | null = null
  onend: (() => void) | null = null
  constructor() {
    istanzeCostruite.push(this)
  }
}

// Getter di comodo — sempre l'ultima istanza costruita (niente alias di `this`).
function ultimaIstanza(): MockSpeechRecognition | null {
  return istanzeCostruite[istanzeCostruite.length - 1] ?? null
}

function installaApi(nomeGlobale: 'SpeechRecognition' | 'webkitSpeechRecognition' = 'SpeechRecognition') {
  istanzeCostruite.length = 0
  ;(window as unknown as Record<string, unknown>)[nomeGlobale] = MockSpeechRecognition
}

describe('PillVoce — input vocale, progressive enhancement (§5.15)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  })
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  })

  it('senza Web Speech API nel jsdom → non renderizza nulla', () => {
    const { container } = render(<PillVoce onTesto={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  describe('con Web Speech API mockata (window.SpeechRecognition)', () => {
    beforeEach(() => installaApi('SpeechRecognition'))

    it('renderizza la pill con etichetta di default', () => {
      render(<PillVoce onTesto={() => {}} />)
      expect(screen.getByRole('button', { name: /dimmelo a voce/i })).toBeInTheDocument()
    })

    it('etichetta personalizzata via prop', () => {
      render(<PillVoce onTesto={() => {}} etichetta="Parla pure" />)
      expect(screen.getByRole('button', { name: /parla pure/i })).toBeInTheDocument()
    })

    it('tap avvia start() con lang="it-IT" + suona("tap") + vibra("light")', () => {
      render(<PillVoce onTesto={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      expect(ultimaIstanza()?.start).toHaveBeenCalledTimes(1)
      expect(ultimaIstanza()?.lang).toBe('it-IT')
      expect(suonaMock).toHaveBeenCalledWith('tap')
      expect(vibraMock).toHaveBeenCalledWith('light')
    })

    it('in ascolto: l\'etichetta cambia in «Ti ascolto…» e aria-pressed diventa true', () => {
      render(<PillVoce onTesto={() => {}} />)
      const bottone = screen.getByRole('button', { name: /dimmelo a voce/i })
      expect(bottone).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(bottone)
      const inAscolto = screen.getByRole('button', { name: /ti ascolto/i })
      expect(inAscolto).toBeInTheDocument()
      expect(inAscolto).toHaveAttribute('aria-pressed', 'true')
    })

    it('onresult chiama onTesto col transcript riconosciuto e torna quieta', () => {
      const onTesto = vi.fn()
      render(<PillVoce onTesto={onTesto} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      act(() => {
        ultimaIstanza()?.onresult?.({ results: [[{ transcript: 'corona ceramica' }]] })
      })
      expect(onTesto).toHaveBeenCalledWith('corona ceramica')
      expect(screen.getByRole('button', { name: /dimmelo a voce/i })).toBeInTheDocument()
    })

    it('rerender con un onTesto diverso (passo successivo del wizard) → il risultato va al callback aggiornato, non a quello del primo tap', () => {
      const onTestoPasso1 = vi.fn()
      const onTestoPasso2 = vi.fn()
      const { rerender } = render(<PillVoce onTesto={onTestoPasso1} />)
      // Riconoscimento avviato e concluso al passo 1: l'istanza resta in cache.
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      act(() => {
        ultimaIstanza()?.onresult?.({ results: [[{ transcript: 'primo passo' }]] })
      })
      expect(onTestoPasso1).toHaveBeenCalledWith('primo passo')

      // Il wizard avanza: stessa pill, nuovo `onTesto` per il passo 2.
      rerender(<PillVoce onTesto={onTestoPasso2} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      act(() => {
        ultimaIstanza()?.onresult?.({ results: [[{ transcript: 'secondo passo' }]] })
      })
      expect(onTestoPasso2).toHaveBeenCalledWith('secondo passo')
      expect(onTestoPasso1).toHaveBeenCalledTimes(1)
    })

    it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
      const { container } = render(<PillVoce onTesto={() => {}} />)
      const regola = container.querySelector('style')?.textContent ?? ''
      expect(regola).toContain('outline: 2px solid var(--blue)')
      expect(regola).toContain('outline-offset: 2px')
    })

    it('«la pill di carta» (§5.15 rev 2): data-parte su pill/testo/cerchioMic, come il porting TastoPiu', () => {
      const { container } = render(<PillVoce onTesto={() => {}} />)
      const pill = container.querySelector('[data-parte="pill"]') as HTMLElement | null
      const testo = container.querySelector('[data-parte="testo"]') as HTMLElement | null
      const cerchioMic = container.querySelector('[data-parte="cerchio-mic"]') as HTMLElement | null
      expect(pill).not.toBeNull()
      expect(testo).not.toBeNull()
      expect(cerchioMic).not.toBeNull()
      expect(testo?.textContent).toBe('Dimmelo a voce')
    })

    it('materia dal mockup .pvA via classi scoped: faccia + cerchioMic (gradiente TastoPrimario) + pressed + dark', () => {
      const { container } = render(<PillVoce onTesto={() => {}} />)
      const regole = container.querySelector('style')?.textContent ?? ''
      // light
      expect(regole).toContain(`background: ${pillVoce.faccia}`)
      expect(regole).toContain(`box-shadow: ${pillVoce.facciaOmbra}`)
      expect(regole).toContain(`background: ${gradiente.tastoPrimario}`)
      expect(regole).toContain(`box-shadow: ${pillVoce.cerchioMicOmbra}`)
      // pressed
      expect(regole).toContain(`box-shadow: ${pillVoce.facciaOmbraPressed}`)
      expect(regole).toContain(`box-shadow: ${pillVoce.cerchioMicOmbraPressed}`)
      // dark — regole scoped [data-theme="dark"] [data-ds="v3"], valori .notte .pvA
      expect(regole).toContain('[data-theme="dark"] [data-ds="v3"] .ds-pill-voce')
      expect(regole).toContain(`background: ${pillVoce.facciaNotte}`)
      expect(regole).toContain(`box-shadow: ${pillVoce.facciaOmbraNotte}`)
      expect(regole).toContain(`box-shadow: ${pillVoce.facciaOmbraPressedNotte}`)
      expect(regole).toContain(`background: ${pillVoce.cerchioMicNotte}`)
      expect(regole).toContain(`box-shadow: ${pillVoce.cerchioMicOmbraNotte}`)
    })

    it('la rev 1 bocciata non esiste più: materia.cerchioMicPillVoce è sparito da tokens.ts', () => {
      expect('cerchioMicPillVoce' in materia).toBe(false)
    })

    it('pressed: pointerdown attiva la classe --premuto (ombre), pointerup la spegne', async () => {
      render(<PillVoce onTesto={() => {}} />)
      const bottone = screen.getByRole('button', { name: /dimmelo a voce/i })
      fireEvent.pointerDown(bottone, { pointerType: 'mouse', button: 0, isPrimary: true })
      await waitFor(() => expect(bottone.classList.contains('ds-pill-voce--premuto')).toBe(true))
      fireEvent.pointerUp(bottone, { pointerType: 'mouse', button: 0, isPrimary: true })
      await waitFor(() => expect(bottone.classList.contains('ds-pill-voce--premuto')).toBe(false))
    })

    it('anti-glitch (§5.15 rev 2): il pressed muove SOLO translateY — MAI scale sul contenuto', async () => {
      render(<PillVoce onTesto={() => {}} />)
      const bottone = screen.getByRole('button', { name: /dimmelo a voce/i })
      fireEvent.pointerDown(bottone, { pointerType: 'mouse', button: 0, isPrimary: true })
      await waitFor(() => expect(bottone.classList.contains('ds-pill-voce--premuto')).toBe(true))
      expect(bottone.style.transform ?? '').not.toContain('scale')
      fireEvent.pointerUp(bottone, { pointerType: 'mouse', button: 0, isPrimary: true })
    })

    it('in ascolto: il cerchio del mic porta la classe del respiro (opacity-only, §8.4)', () => {
      const { container } = render(<PillVoce onTesto={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      const cerchioMic = container.querySelector('[data-parte="cerchio-mic"]') as HTMLElement | null
      expect(cerchioMic?.classList.contains('ds-pill-voce-mic--ascolto')).toBe(true)
      const regola = container.querySelector('style')?.textContent ?? ''
      expect(regola).toContain('@media (prefers-reduced-motion: no-preference)')
      expect(regola).toContain('ds-pill-voce-pulsa 1.6s ease-in-out infinite')
      expect(regola).toContain('0%, 100% { opacity: 1; }')
      expect(regola).toContain('50% { opacity: 0.35; }')
    })

    it('unmount mentre in ascolto → stop() sull\'istanza e handler staccati (il mic non resta acceso)', () => {
      const { unmount } = render(<PillVoce onTesto={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      const istanza = ultimaIstanza()
      expect(istanza?.stop).not.toHaveBeenCalled()
      unmount()
      expect(istanza?.stop).toHaveBeenCalledTimes(1)
      // Handler staccati: eventi tardivi non hanno più nessuno da chiamare.
      expect(istanza?.onresult).toBeNull()
      expect(istanza?.onerror).toBeNull()
      expect(istanza?.onend).toBeNull()
    })

    it('un result che arriva dopo l\'unmount non lancia, non avvisa e non chiama onTesto', () => {
      const onTesto = vi.fn()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { unmount } = render(<PillVoce onTesto={onTesto} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      const istanza = ultimaIstanza()
      unmount()
      expect(() => {
        act(() => {
          // Evento in volo dal motore di riconoscimento, arrivato tardi: gli
          // handler sono stati staccati dal cleanup, quindi è un no-op.
          istanza?.onresult?.({ results: [[{ transcript: 'troppo tardi' }]] })
          istanza?.onend?.()
        })
      }).not.toThrow()
      expect(onTesto).not.toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })

    it('tap mentre in ascolto chiama stop() e torna quieta senza chiamare onTesto', () => {
      const onTesto = vi.fn()
      render(<PillVoce onTesto={onTesto} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      fireEvent.click(screen.getByRole('button', { name: /ti ascolto/i }))
      expect(ultimaIstanza()?.stop).toHaveBeenCalledTimes(1)
      expect(onTesto).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /dimmelo a voce/i })).toBeInTheDocument()
    })

    it('onerror torna quieta silenziosamente (nessun Avviso, nessun crash, nessun onTesto)', () => {
      const onTesto = vi.fn()
      render(<PillVoce onTesto={onTesto} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      expect(() => {
        act(() => {
          ultimaIstanza()?.onerror?.()
        })
      }).not.toThrow()
      expect(onTesto).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /dimmelo a voce/i })).toBeInTheDocument()
    })

    it('onend torna quieta', () => {
      render(<PillVoce onTesto={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      act(() => {
        ultimaIstanza()?.onend?.()
      })
      expect(screen.getByRole('button', { name: /dimmelo a voce/i })).toBeInTheDocument()
    })

    it('tutti i testi statici (default + in ascolto) passano trovaParoleVietate', () => {
      const { container } = render(<PillVoce onTesto={() => {}} />)
      expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
    })
  })

  describe('fallback su webkitSpeechRecognition (Safari)', () => {
    beforeEach(() => installaApi('webkitSpeechRecognition'))

    it('renderizza comunque la pill usando il prefisso webkit', () => {
      render(<PillVoce onTesto={() => {}} />)
      expect(screen.getByRole('button', { name: /dimmelo a voce/i })).toBeInTheDocument()
    })

    it('tap avvia start() sull\'istanza webkit', () => {
      render(<PillVoce onTesto={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
      expect(ultimaIstanza()?.start).toHaveBeenCalledTimes(1)
    })
  })
})
