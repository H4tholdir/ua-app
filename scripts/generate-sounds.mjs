// Genera i 5 suoni firmati DS v3 (§9.1) come WAV PCM16 mono 48kHz.
// MASTER PROVVISORI sintetici — sostituibili 1:1 da un sound designer.
// Uso: node scripts/generate-sounds.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SR = 48000
const dir = join(process.cwd(), 'public/sounds')
mkdirSync(dir, { recursive: true })

function wav(samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 32767, 44 + i * 2)
  return buf
}

/** nota con attacco/decadimento esponenziale e armonica calda */
function nota(freq, ms, { gain = 0.5, attackMs = 4, warm = 0.25 } = {}) {
  const n = Math.round((ms / 1000) * SR)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const att = Math.min(1, (i / SR) * 1000 / attackMs)
    const dec = Math.exp(-t * (5 / (ms / 1000)))
    out[i] = gain * att * dec * (Math.sin(2 * Math.PI * freq * t) + warm * Math.sin(2 * Math.PI * freq * 0.5 * t))
  }
  return out
}
function mixa(...tracks) {
  const n = Math.max(...tracks.map(t => t.offset + t.s.length))
  const out = new Float32Array(n)
  for (const { s, offset } of tracks) for (let i = 0; i < s.length; i++) out[offset + i] += s[i]
  return out
}
const off = ms => Math.round((ms / 1000) * SR)

// tap: tick di legno quasi impercettibile (30ms, 1800Hz smorzatissimo)
writeFileSync(join(dir, 'tap.wav'), wav(nota(1800, 30, { gain: 0.18, attackMs: 1, warm: 0.1 })))
// fatta: click morbido caldo (110ms, doppia parziale)
writeFileSync(join(dir, 'fatta.wav'), wav(mixa(
  { s: nota(1180, 110, { gain: 0.3, attackMs: 2 }), offset: 0 },
  { s: nota(590, 110, { gain: 0.2, attackMs: 2 }), offset: 0 },
)))
// ua: LA FIRMA — due note ascendenti (terza maggiore A4→C#5), calde, ~520ms
writeFileSync(join(dir, 'ua.wav'), wav(mixa(
  { s: nota(440.0, 260, { gain: 0.4, attackMs: 8, warm: 0.35 }), offset: 0 },
  { s: nota(554.37, 300, { gain: 0.45, attackMs: 8, warm: 0.35 }), offset: off(200) },
)))
// errore: tonfo smorzato grave (170ms, 130Hz)
writeFileSync(join(dir, 'errore.wav'), wav(nota(130, 170, { gain: 0.5, attackMs: 2, warm: 0.5 })))
// arrivo: nota singola calda (E5, 210ms)
writeFileSync(join(dir, 'arrivo.wav'), wav(nota(659.25, 210, { gain: 0.35, attackMs: 6, warm: 0.3 })))

console.log('✅ 5 suoni DS v3 generati in public/sounds/')
