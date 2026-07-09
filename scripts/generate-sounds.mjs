// Genera i 5 suoni firmati DS v3 (§9.1) come WAV PCM16 mono 48kHz.
// v2 — carattere analogico (feedback Francesco dal catalogo live, 09/07/2026):
// "troppo digitali, troppo taglienti, invasivi" → sostituiti i toni sinusoidali puri
// con impasti di rumore filtrato + thump gravi + note calde a partiali deboli,
// ogni suono pensato come metafora di un'azione fisica (tasto, scatto, feltro).
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

/** PRNG deterministico (mulberry32) — stesso seed → stesso rumore, sempre. */
function prng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1 // [-1, 1)
  }
}

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

/** rumore filtrato: burst di rumore bianco passato a passa-basso + inviluppo — la "grana" del tocco */
function rumoreFiltrato(ms, { cutoffHz = 1800, gain = 0.15, attackMs = 2, decayDiv = 4, seed = 1 } = {}) {
  const n = off(ms)
  const rnd = prng(seed)
  const raw = new Float32Array(n)
  for (let i = 0; i < n; i++) raw[i] = rnd()
  const filtered = lowpass(raw, cutoffHz, 4)
  const env = inviluppo(n, ms, attackMs, decayDiv)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = filtered[i] * env[i] * gain
  return out
}

/** thump: colpo grave smorzato, con drop di intonazione opzionale (il "peso" fisico dell'azione) */
function thump(freq, ms, { gain = 0.3, attackMs = 3, decayDiv = 5, pitchDropHz = 0 } = {}) {
  const n = off(ms)
  const env = inviluppo(n, ms, attackMs, decayDiv)
  const out = new Float32Array(n)
  let phase = 0
  const durS = ms / 1000
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const instFreq = freq - pitchDropHz * Math.min(1, t / durS)
    phase += (2 * Math.PI * instFreq) / SR
    out[i] = gain * env[i] * Math.sin(phase)
  }
  return out
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
// tap (~28ms): il tasto fisico premuto — un "thock" smorzato, quasi impercettibile.
// Burst di rumore legnoso (passa-basso 1.8kHz, 8ms) + thump grave (185Hz) che decade
// rapidissimo. Nessuna componente sopra i ~1.8kHz: feltrato, non digitale.
writeFileSync(join(dir, 'tap.wav'), wav(rifinisci(mixa(
  { s: rumoreFiltrato(8, { cutoffHz: 1800, gain: 0.13, attackMs: 2, decayDiv: 3, seed: 11 }), offset: 0 },
  { s: thump(185, 28, { gain: 0.20, attackMs: 3, decayDiv: 4 }), offset: 0 },
), { lowpassHz: 1900, maxPeak: 0.32 })))

// fatta (~105ms): uno scatto morbido che si richiude — thock d'attacco (rumore + thump breve)
// seguito da un corpo caldo medio-basso (~265Hz) che decade con calma. Meccanico, soddisfacente.
writeFileSync(join(dir, 'fatta.wav'), wav(rifinisci(mixa(
  { s: rumoreFiltrato(7, { cutoffHz: 1600, gain: 0.10, attackMs: 2, decayDiv: 3, seed: 21 }), offset: 0 },
  { s: thump(190, 14, { gain: 0.14, attackMs: 2, decayDiv: 4 }), offset: 0 },
  { s: notaCalda(265, 105, { gain: 0.26, attackMs: 6, h2: 0.20, h3: 0.08, decayDiv: 4 }), offset: 0 },
), { lowpassHz: 2000, maxPeak: 0.34 })))

// ua (~500ms): LA FIRMA — due note ascendenti (terza maggiore, E4→G#4 ≈330→415Hz), ma
// rotonde e calde: fondamentale + 2a/3a armonica deboli (timbro triangolare, non sinusoide
// pura), attacchi morbidi 10ms, leggera sovrapposizione, coda che si spegne ben prima
// della fine del file (silenzio finale = "respiro").
writeFileSync(join(dir, 'ua.wav'), wav(rifinisci(mixa(
  { s: notaCalda(330.0, 250, { gain: 0.24, attackMs: 10, h2: 0.15, h3: 0.06, decayDiv: 5 }), offset: 0 },
  { s: notaCalda(415.3, 270, { gain: 0.26, attackMs: 10, h2: 0.15, h3: 0.06, decayDiv: 5 }), offset: off(190) },
  respiro(500),
), { lowpassHz: 1800, maxPeak: 0.36 })))

// errore (~170ms): un tonfo ovattato grave — colpo unico ~120Hz con carattere di feltro
// (tocco di rumore filtrato) e un piccolo drop di intonazione durante il decadimento.
// Grave e inequivocabile, mai tagliente o allarmante.
writeFileSync(join(dir, 'errore.wav'), wav(rifinisci(mixa(
  { s: thump(122, 170, { gain: 0.34, attackMs: 3, decayDiv: 5, pitchDropHz: 8 }), offset: 0 },
  { s: rumoreFiltrato(170, { cutoffHz: 900, gain: 0.05, attackMs: 3, decayDiv: 5, seed: 31 }), offset: 0 },
), { lowpassHz: 1400, maxPeak: 0.38 })))

// arrivo (~210ms): una singola nota calda medio-bassa (~315Hz), attacco morbidissimo 10ms,
// carattere di martelletto feltrato (armoniche deboli, decadimento caldo e rapido).
writeFileSync(join(dir, 'arrivo.wav'), wav(rifinisci(mixa(
  { s: notaCalda(315, 210, { gain: 0.28, attackMs: 10, h2: 0.12, h3: 0.05, decayDiv: 4 }), offset: 0 },
), { lowpassHz: 1800, maxPeak: 0.34 })))

console.log('✅ 5 suoni DS v3 (v2 analogico) generati in public/sounds/')
