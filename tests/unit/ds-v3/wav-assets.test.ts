import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), 'public/sounds')
// [nome, minMs, maxMs] (spec §9.1) — tap/fatta/arrivo/errore: bounds attorno
// alla durata REALE misurata sui campioni scelti da Francesco (QA live round
// 2, 09/07/2026), processati da scripts/process-sounds.mjs da
// scripts/sounds-src/*.mp3 (tap≈208ms, fatta≈284ms, arrivo≈1314ms,
// errore≈263ms — vedi tabella nel report). ua: invariato, sintetizzato da
// scripts/generate-sounds.mjs.
const ATTESI: Array<[string, number, number]> = [
  ['tap.wav', 150, 270], ['fatta.wav', 220, 360], ['ua.wav', 400, 600],
  ['errore.wav', 180, 350], ['arrivo.wav', 1100, 1600],
]

function infoWav(path: string) {
  const b = readFileSync(path)
  expect(b.subarray(0, 4).toString()).toBe('RIFF')
  expect(b.subarray(8, 12).toString()).toBe('WAVE')
  const sampleRate = b.readUInt32LE(24)
  const numChannels = b.readUInt16LE(22)
  const bitsPerSample = b.readUInt16LE(34)
  const byteRate = b.readUInt32LE(28)
  const dataSize = b.readUInt32LE(b.indexOf(Buffer.from('data')) + 4)
  return { sampleRate, numChannels, bitsPerSample, durataMs: (dataSize / byteRate) * 1000 }
}

describe('asset audio v3 (spec §9.1)', () => {
  for (const [nome, minMs, maxMs] of ATTESI) {
    it(`${nome}: esiste, 48kHz mono 16-bit, durata ${minMs}-${maxMs}ms`, () => {
      const p = join(DIR, nome)
      expect(existsSync(p), `manca ${nome} — esegui: node scripts/generate-sounds.mjs / node scripts/process-sounds.mjs`).toBe(true)
      const { sampleRate, numChannels, bitsPerSample, durataMs } = infoWav(p)
      expect(sampleRate).toBe(48000)
      expect(numChannels).toBe(1)
      expect(bitsPerSample).toBe(16)
      expect(durataMs).toBeGreaterThanOrEqual(minMs)
      expect(durataMs).toBeLessThanOrEqual(maxMs)
    })
  }
})
