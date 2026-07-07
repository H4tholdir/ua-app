// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const started: string[] = []
class FakeSource { buffer: unknown = null; connect() { return this } start() { started.push('start') } }
class FakeAudioContext {
  state = 'suspended'
  destination = {}
  resume = vi.fn(async () => { this.state = 'running' })
  decodeAudioData = vi.fn(async () => ({ duration: 0.1 }))
  createBufferSource() { return new FakeSource() }
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
