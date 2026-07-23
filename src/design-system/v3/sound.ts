// DS v3 §9 — player dei 5 suoni firmati. Web Audio, unlock al primo touchend/click
// (policy iOS Safari: il gesto valido è il sollevamento del dito).
// I suoni NON veicolano mai informazione esclusiva (c'è sempre il visivo — L3).

export type NomeSuono = 'tap' | 'fatta' | 'ua' | 'errore' | 'arrivo' | 'stacco' | 'riaggancio'
const FILES: Record<NomeSuono, string> = {
  tap: '/sounds/tap.wav', fatta: '/sounds/fatta.wav', ua: '/sounds/ua.wav',
  errore: '/sounds/errore.wav', arrivo: '/sounds/arrivo.wav',
  stacco: '/sounds/stacco.wav', riaggancio: '/sounds/riaggancio.wav',
}
const KEY = 'ua_sounds_v3'

let ctx: AudioContext | null = null
let sbloccato = false
let initFatto = false
const buffers = new Map<NomeSuono, AudioBuffer>()

export function suoniAttivi(): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true } // default ATTIVI (§9.2)
}
export function impostaSuoni(on: boolean): void {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* privato/quota: ignora */ }
}

async function sblocca(): Promise<void> {
  if (sbloccato) return
  try {
    ctx = ctx ?? new AudioContext()
    if (ctx.state === 'suspended') await ctx.resume()
    sbloccato = true
    void precarica()
  } catch { /* dispositivo senza audio: resta muto */ }
}

async function precarica(): Promise<void> {
  if (!ctx) return
  await Promise.all((Object.keys(FILES) as NomeSuono[]).map(async nome => {
    try {
      const res = await fetch(FILES[nome])
      if (!res.ok) return
      const dati = await res.arrayBuffer()
      buffers.set(nome, await ctx!.decodeAudioData(dati))
    } catch { /* singolo file mancante: quel suono resta muto */ }
  }))
}

/** Registra l'unlock una tantum. Chiamare una volta nel root client dell'app v3. */
export function initSuoni(): void {
  if (typeof window === 'undefined' || initFatto) return
  initFatto = true
  const handler = () => { void sblocca() }
  document.addEventListener('touchend', handler, { once: true, passive: true })
  document.addEventListener('click', handler, { once: true, passive: true })
}

/** Fire-and-forget: mai throw, mai await necessario. Max 1 suono per gesto (§9.2);
 *  DEROGA ratificata 23/07 (spec redesign §2.6): stacco+riaggancio sono due momenti
 *  dello STESSO gesto continuo di trascinamento — l'unica coppia ammessa.
 *  `gain` < 1 = variante attenuata (ri-aggancio dopo annullo). */
export function suona(nome: NomeSuono, opts?: { gain?: number }): void {
  try {
    if (!suoniAttivi() || !sbloccato || !ctx) return
    const buf = buffers.get(nome)
    if (!buf) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.value = opts?.gain ?? 1
    src.connect(g)
    g.connect(ctx.destination)
    src.start()
  } catch { /* mai rompere l'app per un suono */ }
}
