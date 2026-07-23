// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const started: string[] = []
class FakeSource { buffer: unknown = null; connect() { return this } start() { started.push('start') } }
class FakeGain { gain = { value: 1 }; connect() { return this } }
class FakeAudioContext {
  state = 'suspended'
  destination = {}
  resume = vi.fn(async () => { this.state = 'running' })
  decodeAudioData = vi.fn(async () => ({ duration: 0.1 }))
  createBufferSource() { return new FakeSource() }
  createGain() { return new FakeGain() }
}

beforeEach(() => {
  vi.resetModules()
  started.length = 0
  localStorage.clear()
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })))
})

describe('sound v3 (spec §9.2)', () => {
  it('default ATTIVI; toggle spegne', async () => {
    const { suoniAttivi, impostaSuoni } = await import('@/design-system/v3/sound')
    expect(suoniAttivi()).toBe(true)
    impostaSuoni(false)
    expect(suoniAttivi()).toBe(false)
    expect(localStorage.getItem('ua_sounds_v3')).toBe('off')
  })
  it('non suona prima dell\'unlock (policy iOS), suona dopo il primo touchend', async () => {
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    suona('tap')
    await vi.waitFor(() => {}) // flush microtasks
    expect(started).toHaveLength(0)
    document.dispatchEvent(new Event('touchend'))
    await new Promise(r => setTimeout(r, 0))
    suona('tap')
    await vi.waitFor(() => expect(started.length).toBeGreaterThan(0))
  })
  it('spento: mai chiamate audio', async () => {
    const { initSuoni, suona, impostaSuoni } = await import('@/design-system/v3/sound')
    impostaSuoni(false)
    initSuoni()
    document.dispatchEvent(new Event('touchend'))
    await new Promise(r => setTimeout(r, 0))
    suona('ua')
    await new Promise(r => setTimeout(r, 0))
    expect(started).toHaveLength(0)
  })
  it('suona() non lancia mai (fetch rotto)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rete') }))
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    document.dispatchEvent(new Event('touchend'))
    await new Promise(r => setTimeout(r, 0))
    expect(() => suona('errore')).not.toThrow()
  })
})

// FIX-D1 (verbale QA 2026-07-24, «Ri-collaudo device #1», punto D1 — primo tocco muto):
// il prefetch dei 7 file e la creazione del contesto devono partire SUBITO a initSuoni(),
// senza attendere alcun gesto, e lo sblocco vero (resume dell'AudioContext) deve avvenire
// sul primo `pointerdown` — che nella sequenza reale di un tap arriva PRIMA di click/touchend
// — cosi il primo tap utile suona già, non solo i successivi.
describe('sound v3 — FIX-D1 primo tocco muto', () => {
  it('initSuoni() avvia SUBITO il fetch dei file, senza aspettare un gesto', async () => {
    const { initSuoni } = await import('@/design-system/v3/sound')
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    initSuoni()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // 7 file (tap, fatta, ua, errore, arrivo, stacco, riaggancio)
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(7)
  })

  it('pointerdown da solo sblocca l\'audio (prima ancora di touchend/click)', async () => {
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    // lascia il tempo al prefetch (fetch+decode) di completarsi, come accadrebbe nella
    // finestra reale fra apertura pagina e primo tap dell'utente
    await new Promise(r => setTimeout(r, 0))
    document.dispatchEvent(new Event('pointerdown'))
    // tempo reale fra dito-giù (pointerdown) e dito-su (click): basta un tick perché il
    // resume() asincrono si risolva, PRIMA che il tap chiami suona() nel proprio onClick
    await new Promise(r => setTimeout(r, 0))
    suona('tap')
    expect(started.length).toBeGreaterThan(0)
  })

  it('D1 end-to-end: il PRIMO tap (pointerdown → click) suona già, non è più muto', async () => {
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0)) // prefetch completo prima del primo tap
    // simula il gesto reale: pointerdown (dito giù) ...
    document.dispatchEvent(new Event('pointerdown'))
    await new Promise(r => setTimeout(r, 0)) // ... poi, dopo un istante, dito-su/click:
    // il bottone chiama suona() nel proprio onClick, PRIMA che il click raggiunga in bubbling
    // l'eventuale listener di fallback su document
    document.dispatchEvent(new Event('click'))
    suona('tap')
    expect(started.length).toBeGreaterThan(0)
  })

  it('senza alcun gesto resta muto (niente autoplay), pur con prefetch già pronto', async () => {
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0)) // prefetch pronto
    suona('tap') // nessun pointerdown/touchend/click ancora avvenuto
    expect(started).toHaveLength(0)
  })

  it('preferenza spenta rispettata anche dopo pointerdown', async () => {
    const { initSuoni, suona, impostaSuoni } = await import('@/design-system/v3/sound')
    impostaSuoni(false)
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    document.dispatchEvent(new Event('pointerdown'))
    await new Promise(r => setTimeout(r, 0))
    suona('ua')
    expect(started).toHaveLength(0)
  })

  it('initSuoni() è idempotente: chiamate ripetute non ri-scaricano i file', async () => {
    const { initSuoni } = await import('@/design-system/v3/sound')
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    initSuoni()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const chiamateDopoPrimoInit = fetchMock.mock.calls.length
    initSuoni()
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    expect(fetchMock.mock.calls.length).toBe(chiamateDopoPrimoInit)
  })
})

// sound.ts è collaudabile solo a runtime browser (AudioContext): qui la guardia è
// testuale, stesso pattern di parete-fluida.test.ts.
const src = readFileSync(join(process.cwd(), 'src/design-system/v3/sound.ts'), 'utf8')

describe('suoni cassetta (spec redesign §2.6, D5)', () => {
  it('stacco e riaggancio sono suoni firmati con file dedicato', () => {
    expect(src).toMatch(/stacco: '\/sounds\/stacco\.wav'/)
    expect(src).toMatch(/riaggancio: '\/sounds\/riaggancio\.wav'/)
  })
  it('suona accetta un gain opzionale (ri-aggancio attenuato su annullo)', () => {
    expect(src).toMatch(/opts\?: \{ gain\?: number \}/)
    expect(src).toMatch(/createGain/)
  })
})
