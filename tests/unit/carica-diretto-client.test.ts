// T4 — `src/lib/storage/carica-diretto-client.ts`: i tre passi del caricamento
// diretto, dal lato del browser.
//
// 🔒 LA FORMA DELL'INDIRIZZO NON È INVENTATA: è misurata (sonda del 05/08/2026,
//    contro il magazzino vero).
//      PUT …/storage/v1/object/upload/sign/documenti/<percorso>?token=<gettone>
//        → 200 · il file risulta col peso e col tipo giusti
//      stesso gettone su un ALTRO percorso → 400 «InvalidSignature»
//      senza gettone → 400 «must have required property 'token'»
//    Qui si prova che il client costruisce QUELLA richiesta — l'unica cosa che
//    un test in jsdom può provare, e la sola che poteva sbagliare.
//
// Forme d'ingresso (R-P4): la firma rifiuta (413/429/415) · la firma risponde
// senza percorso · il magazzino rifiuta i byte · la rete cade durante l'invio ·
// la conferma rifiuta · la conferma risponde senza immagine · giro completo.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  caricaImmagineDiretta,
  ErroreCaricamento,
} from '@/lib/storage/carica-diretto-client'

const BASE = 'https://esempio.supabase.co'
const LAVORO = '7dba9a57-15bc-400e-a36f-28440980556f'
const PERCORSO = 'lab-1/lavori/7dba9a57-15bc-400e-a36f-28440980556f/31bfaf09-f331-4b73-ac36-2d368273f14c.jpg'

/** XHR finta: registra la richiesta e lascia pilotare l'esito. */
class FakeXHR {
  static ultima: FakeXHR | null = null
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  status = 0
  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: unknown = null
  constructor() { FakeXHR.ultima = this }
  open(method: string, url: string) { this.method = method; this.url = url }
  setRequestHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v }
  send(body: unknown) { this.body = body }
  /** L'esito lo decide la prova. */
  rispondi(status: number) { this.status = status; this.onload?.() }
  avanza(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent)
  }
}

function risposta(stato: number, corpo: unknown): Response {
  return {
    ok: stato >= 200 && stato < 300,
    status: stato,
    json: async () => corpo,
  } as unknown as Response
}

const fileFinto = () => {
  const f = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
  Object.defineProperty(f, 'size', { value: 12 * 1024 * 1024, configurable: true })
  return f
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  FakeXHR.ultima = null
  vi.stubGlobal('XMLHttpRequest', FakeXHR)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', BASE)
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

/** La coppia di risposte del caso buono: firma, poi conferma. */
function serverGentile(immagine: unknown = { id: 'img-1', storage_path: PERCORSO }) {
  fetchMock
    .mockResolvedValueOnce(risposta(200, { percorso: PERCORSO, gettone: 'gettone-x' }))
    .mockResolvedValueOnce(risposta(201, { immagine }))
}

describe('caricaImmagineDiretta — il giro completo', () => {
  it('chiede il permesso, manda i byte al magazzino, poi conferma', async () => {
    serverGentile()
    const promessa = caricaImmagineDiretta({
      lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta',
    })
    // Il primo passo è una fetch; i byte partono subito dopo.
    await vi.waitFor(() => expect(FakeXHR.ultima).not.toBeNull())
    FakeXHR.ultima!.rispondi(200)
    const immagine = await promessa

    expect(immagine).toEqual({ id: 'img-1', storage_path: PERCORSO })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/lavori/${LAVORO}/immagini/firma`)
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/lavori/${LAVORO}/immagini/conferma`)
  })

  it('alla firma dichiara tipo, categoria e peso del file', async () => {
    serverGentile()
    const p = caricaImmagineDiretta({ lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta' })
    await vi.waitFor(() => expect(FakeXHR.ultima).not.toBeNull())
    FakeXHR.ultima!.rispondi(200)
    await p

    const corpo = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(corpo).toEqual({ tipo: 'image/jpeg', categoria: 'impronta', byte: 12 * 1024 * 1024 })
  })

  it('🔒 i byte vanno all\'indirizzo firmato, in PUT, col gettone e senza upsert', async () => {
    serverGentile()
    const file = fileFinto()
    const p = caricaImmagineDiretta({ lavoroId: LAVORO, file, categoria: 'impronta' })
    await vi.waitFor(() => expect(FakeXHR.ultima).not.toBeNull())
    const xhr = FakeXHR.ultima!

    expect(xhr.method).toBe('PUT')
    expect(xhr.url).toBe(
      `${BASE}/storage/v1/object/upload/sign/documenti/${PERCORSO}?token=gettone-x`
    )
    expect(xhr.headers['content-type']).toBe('image/jpeg')
    expect(xhr.headers['x-upsert']).toBe('false')
    expect(xhr.body).toBe(file)

    xhr.rispondi(200)
    await p
  })

  it('🛑 alla conferma manda il percorso che ha ricevuto dal SERVER, non uno suo', async () => {
    serverGentile()
    const p = caricaImmagineDiretta({ lavoroId: LAVORO, file: fileFinto(), categoria: 'rx' })
    await vi.waitFor(() => expect(FakeXHR.ultima).not.toBeNull())
    FakeXHR.ultima!.rispondi(200)
    await p

    const corpo = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)
    expect(corpo).toEqual({ percorso: PERCORSO, categoria: 'rx', nome_file: 'impronta.jpg' })
  })

  it('l\'avanzamento arriva a chi lo chiede, e si ferma a 99', async () => {
    serverGentile()
    const passi: number[] = []
    const p = caricaImmagineDiretta({
      lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta',
      onProgress: (n) => passi.push(n),
    })
    await vi.waitFor(() => expect(FakeXHR.ultima).not.toBeNull())
    const xhr = FakeXHR.ultima!
    xhr.avanza(50, 200)
    xhr.avanza(200, 200)   // il 100% del TRASFERIMENTO…
    xhr.rispondi(200)
    await p

    // …non è il 100% dell'operazione: manca la conferma. Chi vede 100 e poi
    // aspetta ancora pensa che si sia bloccato.
    expect(passi).toEqual([25, 99])
  })
})

describe('caricaImmagineDiretta — quando qualcosa dice di no', () => {
  it('la firma rifiuta (413): si ferma SUBITO, nessun byte parte, e la frase è quella del server', async () => {
    fetchMock.mockResolvedValueOnce(
      risposta(413, { error: 'Questo file pesa 62,0 MB e il massimo è 50MB.' })
    )
    await expect(
      caricaImmagineDiretta({ lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta' })
    ).rejects.toThrow('Questo file pesa 62,0 MB e il massimo è 50MB.')

    expect(FakeXHR.ultima).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('la firma rifiuta senza JSON leggibile: frase di ripiego, non un errore di lettura', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false, status: 502, json: async () => { throw new SyntaxError('<html>') },
    } as unknown as Response)
    await expect(
      caricaImmagineDiretta({ lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta' })
    ).rejects.toThrow('Non è stato possibile avviare il caricamento.')
  })

  it('la firma risponde 200 ma senza percorso: non si carica alla cieca', async () => {
    fetchMock.mockResolvedValueOnce(risposta(200, { gettone: 'solo-il-gettone' }))
    await expect(
      caricaImmagineDiretta({ lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta' })
    ).rejects.toThrow('Risposta del server non valida.')
    expect(FakeXHR.ultima).toBeNull()
  })

  it('il magazzino rifiuta i byte: nessuna conferma parte', async () => {
    serverGentile()
    const p = caricaImmagineDiretta({ lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta' })
    await vi.waitFor(() => expect(FakeXHR.ultima).not.toBeNull())
    FakeXHR.ultima!.rispondi(400)

    await expect(p).rejects.toThrow('Il caricamento non è riuscito.')
    expect(fetchMock).toHaveBeenCalledTimes(1)   // solo la firma
  })

  it('la rete cade a metà invio: errore parlante, nessuna conferma', async () => {
    serverGentile()
    const p = caricaImmagineDiretta({ lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta' })
    await vi.waitFor(() => expect(FakeXHR.ultima).not.toBeNull())
    FakeXHR.ultima!.onerror?.()

    await expect(p).rejects.toThrow('Errore di rete durante il caricamento.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('la conferma rifiuta: lo dice, e dice anche che il file è già caricato', async () => {
    fetchMock
      .mockResolvedValueOnce(risposta(200, { percorso: PERCORSO, gettone: 'g' }))
      .mockResolvedValueOnce(risposta(500, {}))
    const p = caricaImmagineDiretta({ lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta' })
    await vi.waitFor(() => expect(FakeXHR.ultima).not.toBeNull())
    FakeXHR.ultima!.rispondi(200)

    await expect(p).rejects.toThrow('Il file è stato caricato ma non salvato. Riprova.')
  })

  it('l\'errore porta con sé lo stato HTTP, per chi vuole distinguere i casi', async () => {
    fetchMock.mockResolvedValueOnce(risposta(429, { error: 'Troppi caricamenti in poco tempo.' }))
    try {
      await caricaImmagineDiretta({ lavoroId: LAVORO, file: fileFinto(), categoria: 'impronta' })
      expect.unreachable('doveva fallire')
    } catch (e) {
      expect(e).toBeInstanceOf(ErroreCaricamento)
      expect((e as ErroreCaricamento).stato).toBe(429)
    }
  })
})
