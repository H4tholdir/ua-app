// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const started: string[] = []
// H1c: le source create vengono tracciate (non solo contate) — servono i test su
// scadenza/soppiantamento, che devono ispezionare `stop()` di una source PRECISA, non solo
// sapere che "una" source è partita.
const createdSources: FakeSource[] = []
const audioContexts: FakeAudioContext[] = []
// H1c: stato iniziale del prossimo AudioContext creato — settabile per test (default
// 'suspended', com'era prima). Letto dal campo di classe al momento della `new`.
let initialState: 'suspended' | 'running' | 'interrupted' = 'suspended'
class FakeSource {
  buffer: unknown = null
  stop = vi.fn()
  connect() { return this }
  start() { started.push('start') }
}
class FakeGain { gain = { value: 1 }; connect() { return this } }
// H1d — estende EventTarget: nel browser reale `AudioContext` DISPATCHA `statechange` da solo
// (evento nativo su una transizione di stato); qui va simulato per poter esercitare il listener
// di produzione (v. `sound.ts`, `riavviaAlRunning`). Il dispatch di `resume()` è messo in coda
// con `queueMicrotask` — non sincrono — perché così si comporta il device reale (misura
// `h1-diagnosi.md`: il resolve del resume e l'evento `statechange` sono due righe di log
// distinte, l'evento ~1ms dopo). Test che asseriscono SUBITO dopo `suona()` (nessun `await` di
// mezzo) restano quindi immuni al restart: il microtask non ha ancora girato.
class FakeAudioContext extends EventTarget {
  state: string = initialState
  destination = {}
  resume = vi.fn(async () => {
    const statePrima = this.state
    this.state = 'running'
    if (statePrima !== 'running') {
      queueMicrotask(() => this.dispatchEvent(new Event('statechange')))
    }
  })
  decodeAudioData = vi.fn(async () => ({ duration: 0.1 }))
  constructor() { super(); audioContexts.push(this) }
  createBufferSource() { const s = new FakeSource(); createdSources.push(s); return s }
  createGain() { return new FakeGain() }
}

/** H1c: `navigator.userActivation` non esiste in jsdom — i test dei rami 4a/4b la mockano
 *  esplicitamente qui; `undefined` la rimuove (i test legacy/4c restano puliti). */
function setUserActivation(isActive: boolean | undefined): void {
  const nav = navigator as unknown as { userActivation?: { isActive: boolean } }
  if (isActive === undefined) { delete nav.userActivation; return }
  nav.userActivation = { isActive }
}

beforeEach(() => {
  vi.resetModules()
  started.length = 0
  createdSources.length = 0
  audioContexts.length = 0
  initialState = 'suspended'
  localStorage.clear()
  setUserActivation(undefined)
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })))
})

afterEach(() => {
  vi.useRealTimers()
  setUserActivation(undefined)
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

// H1c (`.superpowers/sdd/h1c-fix-brief.md`, diagnosi device + panel 3 advisor) — «primo tocco
// muto»: il vecchio gate `!sbloccato` scartava sempre il primo tap perché il resume() del
// gesto risolve DOPO che quel tap ha già chiamato `suona()` (corsa misurata: ~11ms). Fix:
// enqueue sincrono della source quando il gesto è in corso, gate spostato dal flag `sbloccato`
// allo STATO del contesto + `navigator.userActivation.isActive`.
describe('sound v3 — H1c primo tocco muto (enqueue nel gesto)', () => {
  it('1. suspended + isActive=true: enqueue nel gesto — start() una volta, resume() chiamato', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0)) // prefetch completo, come nella finestra reale
    suona('tap')
    expect(started).toHaveLength(1)
    expect(audioContexts[0].resume).toHaveBeenCalled()
  })

  it('2. suspended + isActive=false (fuori gesto): mai start(), nessun throw', async () => {
    setUserActivation(false)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    expect(() => suona('arrivo')).not.toThrow()
    expect(started).toHaveLength(0)
  })

  it('3. running: start() chiamato, nessun resume ridondante', async () => {
    initialState = 'running'
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    suona('tap')
    expect(started).toHaveLength(1)
    expect(audioContexts[0].resume).not.toHaveBeenCalled()
  })

  it('4. suoniAttivi()===false: mai start(), qualunque stato/isActive', async () => {
    const { initSuoni, suona, impostaSuoni } = await import('@/design-system/v3/sound')
    impostaSuoni(false)
    setUserActivation(true)
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    suona('tap')
    expect(started).toHaveLength(0)
  })

  it('5. userActivation assente: fallback al gate sbloccato (legacy iOS/jsdom)', async () => {
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0)) // prefetch
    suona('tap') // sbloccato ancora false: niente start
    expect(started).toHaveLength(0)

    document.dispatchEvent(new Event('touchend'))
    await new Promise(r => setTimeout(r, 0)) // sblocca() risolve: sbloccato=true, ctx->'running' (mock)
    // isola il ramo 4c forzando di nuovo lo stato a non-running: sbloccato non degrada mai
    audioContexts[0].state = 'suspended'
    suona('tap')
    expect(started).toHaveLength(1)
  })

  it('6a. scadenza enqueue: stop() dopo 150ms se il running non arriva', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    // simula il device reale: il resume resta appeso oltre la finestra (cold HAL)
    audioContexts[0].resume = vi.fn(() => new Promise(() => {}))
    vi.useFakeTimers()
    suona('tap')
    expect(started).toHaveLength(1)
    const pending = createdSources[0]
    await vi.advanceTimersByTimeAsync(150) // SCADENZA_ENQUEUE_MS
    expect(pending.stop).toHaveBeenCalled()
  })

  it('6b. scadenza enqueue: il running arriva prima dei 150ms → NON è lo scarto per scadenza (H1d: la vecchia viene comunque stop()pata dal restart deterministico, ma una nuova source parte subito — v. gruppo H1d sotto)', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    vi.useFakeTimers()
    suona('tap') // il resume mock (default) risolve a 'running' e dispatcha statechange (microtask)
    const pending = createdSources[0]
    await vi.advanceTimersByTimeAsync(150) // SCADENZA_ENQUEUE_MS: qui girano anche i microtask del resume
    // H1d: la vecchia È stata stop()pata — ma dal restart-al-running (deterministico), non dallo
    // scarto-per-scadenza. Prova: è partita una SECONDA source (il vecchio comportamento H1c non
    // ne creava una seconda in questo scenario).
    expect(pending.stop).toHaveBeenCalled()
    expect(createdSources.length).toBeGreaterThan(1)
  })

  it('7. max 1 pending: la seconda suona() nella finestra ferma e sostituisce la prima', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    audioContexts[0].resume = vi.fn(() => new Promise(() => {})) // resta in finestra
    vi.useFakeTimers()
    suona('tap')
    const prima = createdSources[0]
    suona('fatta')
    expect(prima.stop).toHaveBeenCalled()
    expect(createdSources).toHaveLength(2)
    expect(started).toHaveLength(2)
  })

  it('8. interrupted + isActive=true: enqueue e resume ritentato (recupero post-telefonata)', async () => {
    initialState = 'interrupted'
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    suona('tap')
    expect(started).toHaveLength(1)
    expect(audioContexts[0].resume).toHaveBeenCalled()
  })

  it('9. sblocca() con sbloccato=true ma state=interrupted: ritenta il resume', async () => {
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    document.dispatchEvent(new Event('touchend'))
    await new Promise(r => setTimeout(r, 0)) // primo sblocco: resume#1, sbloccato=true
    expect(audioContexts[0].resume).toHaveBeenCalledTimes(1)

    audioContexts[0].state = 'interrupted' // simula l'interruzione (telefonata/cambio tab)
    setUserActivation(true) // il ritentativo passa da suona() ramo 4a, nel nuovo gesto
    suona('tap')
    expect(audioContexts[0].resume).toHaveBeenCalledTimes(2)
  })
})

// H1d (`.superpowers/sdd/h1d-suoni-webkit-brief.md`, riserva R1 del panel — `h1-diagnosi.md` —
// confermata dal device: su WebKit l'auto-resume su `start()` a contesto suspended NON è
// garantito, a differenza di Chromium) — «primo tap muto SOLO su iPad»: il ramo 4a di H1c
// confidava che Chromium facesse partire da sola la source accodata al passaggio a `running`;
// su WebKit quella source non parte MAI da sola. Fix: un listener `statechange` di PRODUZIONE
// (sempre attivo, non solo sotto `?diag=suoni`) che, al passaggio a `running` con una pending
// non scaduta, ferma (guardata) la source vecchia e ne crea+avvia una nuova. Su Chromium la
// vecchia stava per partire in quello stesso istante: stop+restart è indistinguibile (nessun
// buco, nessun doppio suono UDIBILE) — da cui l'equivalenza dei due path, dichiarata dai test
// sotto invece di duplicare la stessa asserzione per «engine».
describe('sound v3 — H1d partenza deterministica al running (fix WebKit)', () => {
  it('1. WebKit-path: suspended + isActive → enqueue; poi statechange→running entro scadenza → stop su vecchia + start su nuova, pending pulita', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    // Simula WebKit: il resume() risolve ma NON produce da solo alcuna transizione osservabile
    // qui (niente auto-dispatch) — il running arriverà solo quando il test lo simula a mano,
    // esattamente come sul device reale (la vecchia source resta muta finché non si riparte).
    audioContexts[0].resume = vi.fn(async () => { /* WebKit: nessun effetto immediato osservato */ })
    suona('tap')
    expect(started).toHaveLength(1) // solo la vecchia, accodata (H1c)
    const vecchia = createdSources[0]
    expect(vecchia.stop).not.toHaveBeenCalled()

    // Il running arriva (l'ipotesi WebKit: mai da sola sulla vecchia, ma il contesto TRANSITA).
    audioContexts[0].state = 'running'
    audioContexts[0].dispatchEvent(new Event('statechange'))

    expect(vecchia.stop).toHaveBeenCalled() // guardata: stop della vecchia (mai partita su WebKit)
    expect(createdSources).toHaveLength(2) // una nuova source creata
    expect(started).toHaveLength(2) // avviata

    // Pending pulita: un secondo statechange non deve rifare nulla.
    audioContexts[0].dispatchEvent(new Event('statechange'))
    expect(started).toHaveLength(2)
    expect(createdSources).toHaveLength(2)
  })

  it('2. Chromium-path equivalente (un solo test parametrico, equivalenza dichiarata): stesso stop+restart quando il running arriva dentro la promise di resume', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    // Comportamento di default del mock (Chromium-style): resume() risolve e dispatcha
    // `statechange` in un microtask — qui la vecchia "starebbe per partire da sola" nello
    // stesso istante: lo stop+restart è indistinguibile da un solo suono udibile.
    suona('tap')
    expect(started).toHaveLength(1)
    const vecchia = createdSources[0]
    await new Promise(r => setTimeout(r, 0)) // flush del microtask: consegna lo statechange
    expect(vecchia.stop).toHaveBeenCalled() // IDENTICO al path WebKit sopra
    expect(createdSources).toHaveLength(2)
    expect(started).toHaveLength(2)
  })

  it('3. running arriva DOPO la scadenza (150ms): nessun restart, resta lo scarto attuale', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    audioContexts[0].resume = vi.fn(() => new Promise(() => {})) // resta appeso oltre la scadenza
    vi.useFakeTimers()
    suona('tap')
    const vecchia = createdSources[0]
    await vi.advanceTimersByTimeAsync(150) // scadenza: scarto come oggi (invariato)
    expect(vecchia.stop).toHaveBeenCalledTimes(1) // dallo SCARTO per scadenza, non da un restart
    expect(started).toHaveLength(1) // nessuna nuova source creata dalla scadenza

    // Ora arriva (tardi) il running: la pending era già stata pulita dalla scadenza → no-op.
    audioContexts[0].state = 'running'
    audioContexts[0].dispatchEvent(new Event('statechange'))
    expect(started).toHaveLength(1) // ancora nessuna nuova source
    expect(vecchia.stop).toHaveBeenCalledTimes(1) // nessuna chiamata stop ulteriore sulla vecchia
  })

  it('4. soppiantamento durante l\'attesa: al running riparte SOLO l\'ultima', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    audioContexts[0].resume = vi.fn(() => new Promise(() => {})) // entrambe restano in coda
    suona('tap')
    const prima = createdSources[0]
    suona('fatta') // soppianta la prima (comportamento H1c invariato: scartaPending la ferma già)
    expect(prima.stop).toHaveBeenCalledTimes(1)
    const seconda = createdSources[1]
    expect(started).toHaveLength(2) // prima + seconda, come in H1c

    audioContexts[0].state = 'running'
    audioContexts[0].dispatchEvent(new Event('statechange'))

    expect(started).toHaveLength(3) // SOLO la terza (restart della seconda, l'ultima pending) parte
    expect(seconda.stop).toHaveBeenCalledTimes(1) // la seconda (ultima pending) viene fermata e sostituita
    expect(prima.stop).toHaveBeenCalledTimes(1) // la prima non riceve stop aggiuntivi dal restart
  })

  it('5. i test H1c esistenti restano verdi (v. sopra) — qui solo un canary di non-regressione: running SUBITO (già running al gesto) resta 1 solo start, nessun restart spurio', async () => {
    initialState = 'running'
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    suona('tap')
    expect(started).toHaveLength(1)
    // Un eventuale statechange (nessuna transizione reale, ma testiamo la difensiva) non deve
    // creare una seconda source: non c'è alcuna pending quando si parte già `running`.
    audioContexts[0].dispatchEvent(new Event('statechange'))
    expect(started).toHaveLength(1)
  })
})

describe('sound v3 — H1d listener statechange di PRODUZIONE (sempre attivo, non solo sotto ?diag=suoni)', () => {
  it('a. attivo anche SENZA ?diag=suoni: il running ripartisce la pending', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    // Nessun ?diag=suoni in URL in questo test: il listener di produzione deve funzionare
    // comunque (a differenza di quello diagnostico H1b, gated su suonoDiagAttivo()).
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    audioContexts[0].resume = vi.fn(async () => {})
    suona('tap')
    const vecchia = createdSources[0]
    audioContexts[0].state = 'running'
    audioContexts[0].dispatchEvent(new Event('statechange'))
    expect(vecchia.stop).toHaveBeenCalled()
    expect(started).toHaveLength(2)
  })

  it('b. try/catch difensivo: AudioContext senza addEventListener non rompe initSuoni()/suona() (stesso pattern del listener diagnostico H1b)', async () => {
    class FakeSourceMinimale { buffer: unknown = null; stop = vi.fn(); connect() { return this }; start() { started.push('start') } }
    class FakeGainMinimale { gain = { value: 1 }; connect() { return this } }
    class FakeAudioContextMinimale {
      state: string = 'suspended'
      destination = {}
      resume = vi.fn(async () => { this.state = 'running' })
      decodeAudioData = vi.fn(async () => ({ duration: 0.1 }))
      createBufferSource() { return new FakeSourceMinimale() }
      createGain() { return new FakeGainMinimale() }
      // NESSUN addEventListener: ambiente non-EventTarget (rischio che il try/catch deve assorbire).
    }
    vi.stubGlobal('AudioContext', FakeAudioContextMinimale)
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    expect(() => initSuoni()).not.toThrow()
    await new Promise(r => setTimeout(r, 0))
    expect(() => suona('tap')).not.toThrow()
  })

  it('c. non duplica: initSuoni() ripetuto (idempotente) non moltiplica i restart al running', async () => {
    setUserActivation(true)
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    initSuoni() // idempotente (initFatto) — non deve aggiungere un secondo listener di restart
    initSuoni()
    await new Promise(r => setTimeout(r, 0))
    audioContexts[0].resume = vi.fn(async () => {})
    suona('tap')
    const vecchia = createdSources[0]
    audioContexts[0].state = 'running'
    audioContexts[0].dispatchEvent(new Event('statechange'))
    expect(vecchia.stop).toHaveBeenCalledTimes(1) // non fermata più volte da listener duplicati
    expect(started).toHaveLength(2) // un solo restart, non N restart per N ipotetici listener
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
