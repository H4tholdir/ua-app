// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// H1b — canale diagnostico TEMPORANEO del motore suoni (`?diag=suoni`, wave H1, verbale QA
// 2026-07-24 punto D1 «primo tocco muto»). Da rimuovere con l'intero strumento a fix chiuso.
// Pattern di test: stesso schema di `diagnostica-viewport.test.ts` (P-STATUSBAR) — funzione
// pura di decisione testata senza mock, canale con `vi.resetModules()` per isolare lo stato
// modulo-scope (`attivoCache`/storico) fra un test e l'altro, come già fa `sound.test.ts`.

describe('decidiDiagSuoni — attivazione overlay (gate ?diag=suoni)', () => {
  it('?diag=suoni attiva', async () => {
    const { decidiDiagSuoni } = await import('@/design-system/v3/sound-diag')
    expect(decidiDiagSuoni('?diag=suoni')).toBe(true)
  })

  it('?diag=suoni vince anche con altri param presenti', async () => {
    const { decidiDiagSuoni } = await import('@/design-system/v3/sound-diag')
    expect(decidiDiagSuoni('?next=%2Fcassette&diag=suoni')).toBe(true)
  })

  it('senza query param → spento (default per tutti gli utenti)', async () => {
    const { decidiDiagSuoni } = await import('@/design-system/v3/sound-diag')
    expect(decidiDiagSuoni('')).toBe(false)
  })

  it('altri valori di diag (es. viewport, boh) NON attivano il canale suoni', async () => {
    const { decidiDiagSuoni } = await import('@/design-system/v3/sound-diag')
    expect(decidiDiagSuoni('?diag=viewport')).toBe(false)
    expect(decidiDiagSuoni('?diag=boh')).toBe(false)
  })
})

describe('canale diagnostico suoni — emetti/registra (URL attiva il canale, non la subscribe)', () => {
  beforeEach(() => {
    vi.resetModules()
    window.history.replaceState(null, '', '/?diag=suoni')
  })

  it('emette eventi con timestamp e tipo, nell\'ordine di emissione', async () => {
    const { suonoDiagEmetti, suonoDiagRegistra } = await import('@/design-system/v3/sound-diag')
    const ricevuti: string[] = []
    suonoDiagRegistra((storico) => {
      ricevuti.length = 0
      ricevuti.push(...storico.map((e) => e.tipo))
    })
    suonoDiagEmetti('init', () => ({ esito: 'ok' }))
    suonoDiagEmetti('statechange', () => ({ state: 'running' }))
    suonoDiagEmetti('suona', () => ({ nome: 'tap', esito: 'giocato' }))
    expect(ricevuti).toEqual(['init', 'statechange', 'suona'])
  })

  it('ogni evento ha un timestamp performance.now() valido', async () => {
    const { suonoDiagEmetti, suonoDiagRegistra } = await import('@/design-system/v3/sound-diag')
    let ultimo: number[] = []
    suonoDiagRegistra((storico) => { ultimo = storico.map((e) => e.t) })
    suonoDiagEmetti('init', () => ({}))
    expect(ultimo).toHaveLength(1)
    expect(ultimo[0]).toBeGreaterThanOrEqual(0)
  })

  it('un subscriber tardivo riceve SUBITO lo storico già accumulato (init emesso prima del mount overlay)', async () => {
    const { suonoDiagEmetti, suonoDiagRegistra } = await import('@/design-system/v3/sound-diag')
    // simula initSuoni() che emette PRIMA che l'overlay monti (mount chain: {children} → overlay)
    suonoDiagEmetti('init', () => ({ esito: 'ok' }))
    let ricevutoAlPrimoGiro: string[] = []
    suonoDiagRegistra((storico) => { ricevutoAlPrimoGiro = storico.map((e) => e.tipo) })
    expect(ricevutoAlPrimoGiro).toEqual(['init'])
  })

  it('dettagli è una funzione lazy: costruita solo perché il canale è attivo (?diag=suoni)', async () => {
    const { suonoDiagEmetti, suonoDiagRegistra } = await import('@/design-system/v3/sound-diag')
    const costruttore = vi.fn(() => ({ nome: 'tap' }))
    suonoDiagRegistra(() => {})
    suonoDiagEmetti('suona', costruttore)
    expect(costruttore).toHaveBeenCalledTimes(1)
  })

  it('spegnimento: dopo la deregistrazione, il subscriber non riceve più notifiche', async () => {
    const { suonoDiagEmetti, suonoDiagRegistra } = await import('@/design-system/v3/sound-diag')
    let chiamate = 0
    const cancella = suonoDiagRegistra(() => { chiamate += 1 })
    expect(chiamate).toBe(1) // chiamata immediata alla registrazione, con lo storico corrente (vuoto)
    suonoDiagEmetti('init', () => ({}))
    expect(chiamate).toBe(2)
    cancella()
    suonoDiagEmetti('statechange', () => ({}))
    expect(chiamate).toBe(2) // spento: nessuna nuova notifica dopo la cancellazione
  })
})

describe('canale diagnostico suoni — senza ?diag=suoni, emetti() è un no-op (zero lavoro)', () => {
  beforeEach(() => {
    vi.resetModules()
    window.history.replaceState(null, '', '/')
  })

  it('emetti() non costruisce mai i dettagli (funzione lazy non invocata) e non arricchisce lo storico', async () => {
    const { suonoDiagEmetti, suonoDiagRegistra } = await import('@/design-system/v3/sound-diag')
    const costruttore = vi.fn(() => ({ nome: 'tap' }))
    let ultimoStorico: unknown[] = []
    suonoDiagRegistra((storico) => { ultimoStorico = storico })
    suonoDiagEmetti('suona', costruttore)
    expect(costruttore).not.toHaveBeenCalled()
    expect(ultimoStorico).toEqual([])
  })
})

// Integrazione con sound.ts — la riga più rischiosa dell'instrumentazione H1b è l'unica che
// tocca il vero AudioContext (`c.addEventListener('statechange', ...)` in `initSuoni`, attiva
// SOLO sotto ?diag=suoni). `sound.test.ts` non la esercita mai (nessun test lì apre l'overlay),
// quindi va coperta qui: deve non lanciare MAI, e deve davvero emettere `statechange`.
describe('integrazione sound.ts — initSuoni() sotto ?diag=suoni non deve mai alterare/rompere il motore', () => {
  beforeEach(() => {
    vi.resetModules()
    window.history.replaceState(null, '', '/?diag=suoni')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })))
  })

  it('con un AudioContext reale (EventTarget), initSuoni() non lancia e lo statechange arriva sull\'overlay', async () => {
    class FakeSource { buffer: unknown = null; connect() { return this }; start() {} }
    class FakeGain { gain = { value: 1 }; connect() { return this } }
    class FakeAudioContextEventTarget extends EventTarget {
      state = 'suspended'
      sampleRate = 44100
      baseLatency = 0.01
      destination = {}
      decodeAudioData = vi.fn(async () => ({ duration: 0.1 }))
      createBufferSource() { return new FakeSource() }
      createGain() { return new FakeGain() }
      resume = vi.fn(async () => {
        this.state = 'running'
        this.dispatchEvent(new Event('statechange')) // additivo, come farebbe un browser vero
      })
    }
    vi.stubGlobal('AudioContext', FakeAudioContextEventTarget)

    const { initSuoni } = await import('@/design-system/v3/sound')
    const { suonoDiagRegistra } = await import('@/design-system/v3/sound-diag')
    const tipiRicevuti: string[] = []
    suonoDiagRegistra((storico) => {
      tipiRicevuti.length = 0
      tipiRicevuti.push(...storico.map((e) => e.tipo))
    })

    expect(() => initSuoni()).not.toThrow()
    expect(tipiRicevuti).toContain('init')

    // sblocca() chiama resume() sul primo pointerdown → la fake dispatcha statechange
    expect(() => document.dispatchEvent(new Event('pointerdown'))).not.toThrow()
    await vi.waitFor(() => expect(tipiRicevuti).toContain('statechange'))
  })

  it('con un AudioContext SENZA addEventListener (ambiente non standard), initSuoni() non lancia comunque (try/catch difensivo)', async () => {
    // Fake minimale come quello di sound.test.ts: nessun EventTarget/addEventListener.
    // Riproduce esattamente il rischio segnalato in review — il try/catch attorno a
    // `c.addEventListener('statechange', ...)` deve assorbirlo senza toccare il motore.
    class FakeSource { buffer: unknown = null; connect() { return this }; start() {} }
    class FakeGain { gain = { value: 1 }; connect() { return this } }
    class FakeAudioContextMinimale {
      state = 'suspended'
      destination = {}
      resume = vi.fn(async () => { this.state = 'running' })
      decodeAudioData = vi.fn(async () => ({ duration: 0.1 }))
      createBufferSource() { return new FakeSource() }
      createGain() { return new FakeGain() }
    }
    vi.stubGlobal('AudioContext', FakeAudioContextMinimale)

    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    expect(() => initSuoni()).not.toThrow()
    await new Promise((r) => setTimeout(r, 0))
    expect(() => document.dispatchEvent(new Event('pointerdown'))).not.toThrow()
    await new Promise((r) => setTimeout(r, 0))
    expect(() => suona('tap')).not.toThrow() // il motore resta pienamente funzionante
  })
})
