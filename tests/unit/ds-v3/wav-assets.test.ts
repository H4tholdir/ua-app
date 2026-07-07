import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), 'public/sounds')
const ATTESI: Array<[string, number, number]> = [ // [nome, minMs, maxMs] (spec §9.1)
  ['tap.wav', 5, 40], ['fatta.wav', 40, 120], ['ua.wav', 400, 600],
  ['errore.wav', 80, 200], ['arrivo.wav', 80, 250],
]

function infoWav(path: string) {
  const b = readFileSync(path)
  expect(b.subarray(0, 4).toString()).toBe('RIFF')
  expect(b.subarray(8, 12).toString()).toBe('WAVE')
  const sampleRate = b.readUInt32LE(24)
  const byteRate = b.readUInt32LE(28)
  const dataSize = b.readUInt32LE(b.indexOf(Buffer.from('data')) + 4)
  return { sampleRate, durataMs: (dataSize / byteRate) * 1000 }
}

describe('asset audio v3 (spec §9.1)', () => {
  for (const [nome, minMs, maxMs] of ATTESI) {
    it(`${nome}: esiste, 48kHz, durata ${minMs}-${maxMs}ms`, () => {
      const p = join(DIR, nome)
      expect(existsSync(p), `manca ${nome} — esegui: node scripts/generate-sounds.mjs`).toBe(true)
      const { sampleRate, durataMs } = infoWav(p)
      expect(sampleRate).toBe(48000)
      expect(durataMs).toBeGreaterThanOrEqual(minMs)
      expect(durataMs).toBeLessThanOrEqual(maxMs)
    })
  }
})
