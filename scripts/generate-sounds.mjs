// Genera SOLO `ua.wav` — la firma sonora DS v3 (§9.1), WAV PCM16 mono 48kHz.
// v2 — carattere analogico (feedback Francesco dal catalogo live, 09/07/2026):
// "troppo digitali, troppo taglienti, invasivi" → sostituiti i toni sinusoidali puri
// con impasti di rumore filtrato + thump gravi + note calde a partiali deboli,
// ogni suono pensato come metafora di un'azione fisica (tasto, scatto, feltro).
//
// QA live round 2 (09/07/2026): tap/fatta/arrivo/errore NON sono più
// sintetizzati qui — Francesco ha scelto 4 campioni MP3 reali (in
// `scripts/sounds-src/`), processati da `scripts/process-sounds.mjs` in
// `public/sounds/{tap,fatta,arrivo,errore}.wav`. Le ricette sintetiche di
// quei 4 suoni sono state RIMOSSE da questo file apposta: NON vanno
// resuscitate, ri-eseguire questo script non deve MAI sovrascrivere i WAV
// curati da process-sounds.mjs. Se serve rigenerare tap/fatta/arrivo/errore,
// usare `node scripts/process-sounds.mjs` (richiede gli MP3 sorgente in
// scripts/sounds-src/), non questo script.
//
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

const off = ms => Math.round((ms / 1000) * SR)

/** filtro passa-basso one-pole (RC), applicato in cascata per un rolloff più ripido */
function lowpass(samples, cutoffHz, passes = 3) {
  let s = samples
  const dt = 1 / SR
  const rc = 1 / (2 * Math.PI * cutoffHz)
  const alpha = dt / (rc + dt)
  for (let p = 0; p < passes; p++) {
    const out = new Float32Array(s.length)
    let y = 0
    for (let i = 0; i < s.length; i++) { y = y + alpha * (s[i] - y); out[i] = y }
    s = out
  }
  return s
}

/** inviluppo attacco lineare + decadimento esponenziale (mai attacco a 0ms — niente click digitali) */
function inviluppo(n, ms, attackMs, decayDiv = 5) {
  const env = new Float32Array(n)
  const attackN = Math.max(1, Math.round((attackMs / 1000) * SR))
  const tau = (ms / 1000) / decayDiv
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const att = Math.min(1, i / attackN)
    const dec = Math.exp(-t / tau)
    env[i] = att * dec
  }
  return env
}

/** nota calda: fondamentale + 2a/3a armonica deboli (timbro triangolare), mai un beep sinusoidale puro */
function notaCalda(freq, ms, { gain = 0.3, attackMs = 8, h2 = 0.15, h3 = 0.07, decayDiv = 5 } = {}) {
  const n = off(ms)
  const env = inviluppo(n, ms, attackMs, decayDiv)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const onda = Math.sin(2 * Math.PI * freq * t)
      + h2 * Math.sin(2 * Math.PI * freq * 2 * t)
      + h3 * Math.sin(2 * Math.PI * freq * 3 * t)
    out[i] = gain * env[i] * onda
  }
  return out
}

function mixa(...tracks) {
  const n = Math.max(...tracks.map(t => t.offset + t.s.length))
  const out = new Float32Array(n)
  for (const { s, offset } of tracks) for (let i = 0; i < s.length; i++) out[offset + i] += s[i]
  return out
}

/** allunga il buffer a targetMs (silenzio) senza aggiungere segnale — per lasciare respirare la coda */
function respiro(targetMs) {
  return { s: new Float32Array(1), offset: Math.max(0, off(targetMs) - 1) }
}

/** rifinitura finale: passa-basso di sicurezza (niente energia significativa sopra ~2.5kHz) + tetto di picco a -6dBFS */
function rifinisci(samples, { lowpassHz = 2200, maxPeak = 0.42 } = {}) {
  const s = lowpass(samples, lowpassHz, 2)
  let peak = 0
  for (let i = 0; i < s.length; i++) peak = Math.max(peak, Math.abs(s[i]))
  if (peak > maxPeak) { const k = maxPeak / peak; for (let i = 0; i < s.length; i++) s[i] *= k }
  return s
}

// ---------------------------------------------------------------------------
// ua (~500ms): LA FIRMA — due note ascendenti (terza maggiore, E4→G#4 ≈330→415Hz), ma
// rotonde e calde: fondamentale + 2a/3a armonica deboli (timbro triangolare, non sinusoide
// pura), attacchi morbidi 10ms, leggera sovrapposizione, coda che si spegne ben prima
// della fine del file (silenzio finale = "respiro").
writeFileSync(join(dir, 'ua.wav'), wav(rifinisci(mixa(
  { s: notaCalda(330.0, 250, { gain: 0.24, attackMs: 10, h2: 0.15, h3: 0.06, decayDiv: 5 }), offset: 0 },
  { s: notaCalda(415.3, 270, { gain: 0.26, attackMs: 10, h2: 0.15, h3: 0.06, decayDiv: 5 }), offset: off(190) },
  respiro(500),
), { lowpassHz: 1800, maxPeak: 0.36 })))

console.log('✅ ua.wav (firma DS v3) generato in public/sounds/ — tap/fatta/arrivo/errore restano quelli curati da process-sounds.mjs, non toccati')
