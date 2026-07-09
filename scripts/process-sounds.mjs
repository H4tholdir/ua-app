// Adotta i 4 riferimenti reali scelti da Francesco per i suoni v3 (QA live
// round 2, 09/07/2026): campioni MP3 in `scripts/sounds-src/` (tap, finger →
// fatta, arpeggio → arrivo, error → errore) processati in WAV firmati DS v3.
// `ua.wav` NON è toccato da questo script (resta sintetizzato da
// `scripts/generate-sounds.mjs`: "per il resto tutto ok" — Francesco).
//
// Pipeline per ciascun file:
//   1. decodifica il MP3 sorgente in PCM float32 mono 48kHz (ffmpeg)
//   2. analisi soglia manuale sull'inviluppo (finestre 5ms, picco in dB
//      RELATIVO al picco globale del file — non un floor assoluto: i 4
//      riferimenti hanno livelli di registrazione molto diversi tra loro,
//      un floor assoluto avrebbe trattato la coda di riverbero naturale
//      dello schiocco di dita come "utile" solo perché quel file è più
//      silenzioso in assoluto):
//      trova il segmento continuo che contiene il picco globale — i piccoli
//      avvallamenti (<GAP_TOLERANCE_MS) restano parte dello stesso gesto
//      sonoro, ma un vuoto vero (livello sotto floor per ≥ soglia) taglia
//      fuori materiale estraneo PRIMA del segmento utile (es. il fruscio
//      pre-schiocco in finger.mp3, separato dallo schiocco vero da ~130ms di
//      silenzio reale, o la coda di riverbero di stanza dopo lo schiocco)
//   3. trim al segmento trovato (con un pre-roll minimo, mai a metà di un
//      attacco) + fade-out breve (10-30ms) in coda
//   4. resample 48kHz mono 16-bit PCM
//   5. normalizzazione di picco leggera per allinearsi alla disciplina di
//      loudness del set esistente (picchi ~-12/-14 dBFS — misurato su
//      tap/fatta/arrivo/errore/ua generati da generate-sounds.mjs)
//
// Deterministico: stesso input MP3 + stessi parametri → stessi byte in
// output (nessuna casualità, nessun timestamp embedded — verificato con
// doppia esecuzione + hash, vedi report).
//
// Uso: node scripts/process-sounds.mjs
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const FFMPEG = process.env.FFMPEG_BIN || '/opt/homebrew/bin/ffmpeg'
const SRC_DIR = join(process.cwd(), 'scripts/sounds-src')
const OUT_DIR = join(process.cwd(), 'public/sounds')
const TMP_DIR = join(process.cwd(), 'scripts/.tmp-process-sounds')
const SR = 48000

// --- parametri dell'analisi soglia (manuale, applicati identici a tutti e 4
// i file — relativi al picco di CIASCUN file, non un floor assoluto — solo
// il fade e il pre-roll variano lievemente in base alla durata del
// materiale, per restare fedeli a "SHORT as material allows without cutting
// audible tail"). ---
const FLOOR_SOTTO_PICCO_DB = 35 // sotto (picco_del_file - 35dB) = silenzio
const GAP_TOLERANCE_MS = 80 // avvallamenti più corti restano nello stesso gesto
const WINDOW_MS = 5
const TARGET_PEAK_DB = -13 // centro della disciplina di loudness esistente (-12/-14dB)

const RICETTE = [
  { src: 'tap.mp3', out: 'tap.wav', nome: 'tap', preRollMs: 3, fadeMs: 12 },
  { src: 'finger.mp3', out: 'fatta.wav', nome: 'fatta', preRollMs: 4, fadeMs: 20 },
  { src: 'arpeggio.mp3', out: 'arrivo.wav', nome: 'arrivo', preRollMs: 4, fadeMs: 30 },
  { src: 'error.mp3', out: 'errore.wav', nome: 'errore', preRollMs: 3, fadeMs: 15 },
]

function decodeMonoF32(path) {
  const raw = execFileSync(FFMPEG, [
    '-y', '-i', path,
    '-ac', '1', '-ar', String(SR),
    '-f', 'f32le', '-',
  ], { maxBuffer: 1024 * 1024 * 64, stdio: ['ignore', 'pipe', 'ignore'] })
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4)
}

function toDb(x) {
  return 20 * Math.log10(Math.max(Math.abs(x), 1e-9))
}

/** Trova [inizioMs, fineMs] del segmento utile: quello che contiene il picco
 * globale, tollerando avvallamenti < GAP_TOLERANCE_MS come parte dello
 * stesso gesto sonoro. Materiale estraneo separato da silenzio vero (es.
 * fruscio prima di un vero vuoto) resta fuori. */
function trovaSegmentoUtile(samples) {
  const winN = Math.round((WINDOW_MS / 1000) * SR)
  const nWin = Math.floor(samples.length / winN)
  const peakDb = new Float32Array(nWin)
  let peakGlobalIdx = 0
  let peakGlobalVal = 0
  for (let i = 0; i < nWin; i++) {
    let p = 0
    for (let j = i * winN; j < (i + 1) * winN; j++) p = Math.max(p, Math.abs(samples[j]))
    peakDb[i] = toDb(p)
    if (p > peakGlobalVal) { peakGlobalVal = p; peakGlobalIdx = i }
  }
  const floorDb = toDb(peakGlobalVal) - FLOOR_SOTTO_PICCO_DB
  const active = Array.from(peakDb, (d) => d > floorDb)
  // raggruppa in run, unendo run separati da un gap < GAP_TOLERANCE_MS
  const gapToleranceWin = GAP_TOLERANCE_MS / WINDOW_MS
  const runs = []
  let start = null
  for (let i = 0; i < active.length; i++) {
    if (active[i] && start === null) start = i
    else if (!active[i] && start !== null) { runs.push([start, i]); start = null }
  }
  if (start !== null) runs.push([start, active.length])
  const merged = []
  for (const [s, e] of runs) {
    if (merged.length && s - merged[merged.length - 1][1] < gapToleranceWin) {
      merged[merged.length - 1][1] = e
    } else {
      merged.push([s, e])
    }
  }
  const run = merged.find(([s, e]) => peakGlobalIdx >= s && peakGlobalIdx < e) ?? merged[0]
  return {
    inizioMs: run[0] * WINDOW_MS,
    fineMs: run[1] * WINDOW_MS,
    totaleMs: (samples.length / SR) * 1000,
  }
}

// astats scrive su stderr, non stdout: si legge esplicitamente via spawnSync
// (ffmpeg con `-f null -` esce con codice 0, execFileSync non cattura stderr
// in caso di successo).
function analizzaLoudness(path) {
  const res = spawnSync(FFMPEG, ['-i', path, '-af', 'astats=metadata=0', '-f', 'null', '-'], {
    encoding: 'utf8',
  })
  const testo = res.stderr ?? ''
  // astats stampa un blocco per canale e poi un blocco "Overall" — entrambi
  // con "Peak level dB"/"RMS level dB": l'ULTIMA occorrenza di ciascuno è
  // sempre quella del blocco Overall (mono → un solo blocco canale, poi
  // Overall in coda).
  const peakMatches = [...testo.matchAll(/Peak level dB:\s*(-?\d+\.?\d*)/g)]
  const rmsMatches = [...testo.matchAll(/RMS level dB:\s*(-?\d+\.?\d*)/g)]
  const peakMatch = peakMatches.at(-1)
  const rmsMatch = rmsMatches.at(-1)
  return {
    peakDb: peakMatch ? parseFloat(peakMatch[1]) : null,
    rmsDb: rmsMatch ? parseFloat(rmsMatch[1]) : null,
  }
}

mkdirSync(OUT_DIR, { recursive: true })
rmSync(TMP_DIR, { recursive: true, force: true })
mkdirSync(TMP_DIR, { recursive: true })

const risultati = []

for (const { src, out, nome, preRollMs, fadeMs } of RICETTE) {
  const srcPath = join(SRC_DIR, src)
  const outPath = join(OUT_DIR, out)
  const tmpPath = join(TMP_DIR, out)

  const samples = decodeMonoF32(srcPath)
  const { inizioMs, fineMs, totaleMs } = trovaSegmentoUtile(samples)
  const startS = Math.max(0, (inizioMs - preRollMs) / 1000)
  const endS = fineMs / 1000
  const durataGrezzaMs = (endS - startS) * 1000
  const fadeS = fadeMs / 1000

  // passo 1: trim + fade-out + resample + mono → WAV intermedio (non normalizzato)
  execFileSync(FFMPEG, [
    '-y', '-i', srcPath,
    '-af', `atrim=start=${startS.toFixed(4)}:end=${endS.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, (endS - startS - fadeS)).toFixed(4)}:d=${fadeS.toFixed(4)},aresample=${SR}`,
    '-ac', '1', '-c:a', 'pcm_s16le',
    tmpPath,
  ], { stdio: ['ignore', 'ignore', 'ignore'] })

  const preNorm = analizzaLoudness(tmpPath)
  const gainDb = TARGET_PEAK_DB - (preNorm.peakDb ?? TARGET_PEAK_DB)

  // passo 2: normalizzazione di picco → WAV finale
  execFileSync(FFMPEG, [
    '-y', '-i', tmpPath,
    '-af', `volume=${gainDb.toFixed(4)}dB`,
    '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le',
    outPath,
  ], { stdio: ['ignore', 'ignore', 'ignore'] })

  const finale = analizzaLoudness(outPath)
  const buf = readFileSync(outPath)
  const dataSize = buf.readUInt32LE(buf.indexOf('data') + 4)
  const byteRate = buf.readUInt32LE(28)
  const durataFinaleMs = (dataSize / byteRate) * 1000

  risultati.push({
    nome, src, out,
    segmentoOriginaleMs: `${inizioMs.toFixed(0)}–${fineMs.toFixed(0)} (di ${totaleMs.toFixed(0)})`,
    durataGrezzaMs: durataGrezzaMs.toFixed(0),
    durataFinaleMs: durataFinaleMs.toFixed(0),
    fadeMs,
    peakPrimaDb: preNorm.peakDb,
    peakDopoDb: finale.peakDb,
    rmsDopoDb: finale.rmsDb,
    gainDb: gainDb.toFixed(2),
  })
}

rmSync(TMP_DIR, { recursive: true, force: true })

console.log('\n✅ 4 suoni v3 processati dai riferimenti reali di Francesco in public/sounds/\n')
console.table(risultati.map(({ nome, out, segmentoOriginaleMs, durataFinaleMs, peakDopoDb, rmsDopoDb }) => ({
  suono: nome, file: out, 'segmento sorgente (ms)': segmentoOriginaleMs,
  'durata finale (ms)': durataFinaleMs, 'peak (dBFS)': peakDopoDb?.toFixed(1), 'RMS (dBFS)': rmsDopoDb?.toFixed(1),
})))
