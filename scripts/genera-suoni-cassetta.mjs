// Genera 2 coppie candidate di stacco/riaggancio (gate d'ascolto §6.4 della spec).
// Coppia A «metallo asciutto»: stacco = chirp discendente 2200→900Hz 60ms;
//   riaggancio = colpo 180Hz + partial 1400Hz, decadimento esponenziale 110ms.
// Coppia B «morbida»: stacco = noise burst filtrato 50ms; riaggancio = colpo 240Hz 90ms.
import { writeFileSync, mkdirSync } from 'node:fs'
const SR = 44100
function wav(samples) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  samples.forEach((s, i) => buf.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, 44 + i * 2))
  return buf
}
const dur = (ms) => Math.floor(SR * ms / 1000)
const env = (i, n, k = 6) => Math.exp(-k * i / n)
const chirp = (ms, f0, f1) => Array.from({ length: dur(ms) }, (_, i) => {
  const t = i / SR, f = f0 + (f1 - f0) * (i / dur(ms))
  return Math.sin(2 * Math.PI * f * t) * env(i, dur(ms), 4) * 0.6
})
const colpo = (ms, f, partial) => Array.from({ length: dur(ms) }, (_, i) => {
  const t = i / SR
  return (Math.sin(2 * Math.PI * f * t) * 0.7 + (partial ? Math.sin(2 * Math.PI * partial * t) * 0.25 : 0)) * env(i, dur(ms), 7)
})
const noise = (ms) => Array.from({ length: dur(ms) }, (_, i) => (Math.random() * 2 - 1) * env(i, dur(ms), 8) * 0.4)
mkdirSync('public/sounds/candidati', { recursive: true })
writeFileSync('public/sounds/candidati/coppiaA-stacco.wav', wav(chirp(60, 2200, 900)))
writeFileSync('public/sounds/candidati/coppiaA-riaggancio.wav', wav(colpo(110, 180, 1400)))
writeFileSync('public/sounds/candidati/coppiaB-stacco.wav', wav(noise(50)))
writeFileSync('public/sounds/candidati/coppiaB-riaggancio.wav', wav(colpo(90, 240, null)))
console.log('4 candidati in public/sounds/candidati/')
