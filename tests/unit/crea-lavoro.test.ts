import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  creaLavoroDaWizard,
  isoDataLocale,
  stimaGiorni,
  descrizioneTipo,
  GIORNI_FALLBACK_LIBERO,
} from '@/lib/wizard/crea-lavoro'
import type { TipoScelto } from '@/components/features/wizard/WizardNuovoLavoro'

// Stesso pattern di mock fetch sequenziale di WizardNuovoLavoro.test.tsx (Task 9).
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const CLIENTE = { id: 'cli-1' }
const TIPO_CATALOGO: TipoScelto = { kind: 'catalogo', tipoId: 'corona_zirconia' }
const TIPO_LIBERO: TipoScelto = { kind: 'libero', testo: 'Placca su misura' }
const DATA_CONSEGNA = new Date(2026, 6, 16) // 16 luglio 2026 (giovedì)

function mockFetch() {
  return fetch as unknown as ReturnType<typeof vi.fn>
}

function jsonOk(status: number, body: unknown) {
  return { ok: true, status, json: async () => body }
}
function jsonFail(status = 500) {
  return { ok: false, status, json: async () => ({ error: 'boom' }) }
}

describe('isoDataLocale — YYYY-MM-DD locale (mai toISOString)', () => {
  it('compone da getFullYear/getMonth/getDate con pad', () => {
    expect(isoDataLocale(new Date(2026, 6, 16))).toBe('2026-07-16')
    expect(isoDataLocale(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('descrizioneTipo', () => {
  it('catalogo → labelTipo del tipo trovato', () => {
    expect(descrizioneTipo(TIPO_CATALOGO)).toBe('Corona zirconia')
  })
  it('libero → il testo libero verbatim', () => {
    expect(descrizioneTipo(TIPO_LIBERO)).toBe('Placca su misura')
  })
})

describe('stimaGiorni', () => {
  it('catalogo con voce in giorniPerTipo → la usa', () => {
    const risultato = stimaGiorni(TIPO_CATALOGO, { corona_zirconia: { giorni: 6, daStoria: true } })
    expect(risultato).toEqual({ giorni: 6, daStoria: true })
  })
  it('libero → SEMPRE il fallback (nessuna voce possibile in giorniPerTipo)', () => {
    const risultato = stimaGiorni(TIPO_LIBERO, { corona_zirconia: { giorni: 6, daStoria: true } })
    expect(risultato).toEqual({ giorni: GIORNI_FALLBACK_LIBERO, daStoria: false })
  })
  it('catalogo senza voce (difensivo) → fallback', () => {
    const risultato = stimaGiorni(TIPO_CATALOGO, {})
    expect(risultato).toEqual({ giorni: GIORNI_FALLBACK_LIBERO, daStoria: false })
  })
})

describe('creaLavoroDaWizard — sequenza fail-soft (spec §7)', () => {
  it('paziente NUOVO (nessun codice corrispondente): GET → POST pazienti → POST lavori, nessun accessorio → 3 fetch', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-1', nome_cognome: 'PZ-0001 ' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-1', numero_lavoro: '2026/0001', stato: 'ricevuto' } }))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0001',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito).toEqual({ lavoro: { id: 'lav-1', numero_lavoro: '2026/0001' }, accessoriFalliti: [] })
    expect(m).toHaveBeenCalledTimes(3)

    // 1. GET pazienti
    const [urlGet, optGet] = m.mock.calls[0]
    expect(String(urlGet)).toBe('/api/pazienti?cliente_id=cli-1')
    expect(optGet?.method ?? 'GET').not.toBe('POST')

    // 2. POST pazienti — mapping adattato al contratto reale (nome_cognome è
    // ignorato dalla route, sincronizzato via trigger DB SOLO se nome+cognome
    // sono ENTRAMBI non-null; 'PZ-0001' finisce in cognome, nome:'' soddisfa
    // il trigger senza inventare un nome).
    const [urlPost, optPost] = m.mock.calls[1]
    expect(urlPost).toBe('/api/pazienti')
    expect(optPost.method).toBe('POST')
    expect(JSON.parse(optPost.body)).toEqual({
      cliente_id: 'cli-1',
      codice_paziente: 'PZ-0001',
      nome: '',
      cognome: 'PZ-0001',
    })

    // 3. POST lavori
    const [urlLavori, optLavori] = m.mock.calls[2]
    expect(urlLavori).toBe('/api/lavori')
    expect(optLavori.method).toBe('POST')
    expect(JSON.parse(optLavori.body)).toEqual({
      cliente_id: 'cli-1',
      paziente_id: 'pz-1',
      tipo_dispositivo: 'protesi_fissa',
      descrizione: 'Corona zirconia',
      data_consegna_prevista: '2026-07-16',
      classe_rischio: 'classe_iia',
    })
  })

  it('alias compilato → cognome = alias (non pz)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-2' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-2', numero_lavoro: '2026/0002' } }))

    await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0002',
      alias: 'Mario R.',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    const bodyPost = JSON.parse(m.mock.calls[1][1].body)
    expect(bodyPost).toEqual({
      cliente_id: 'cli-1',
      codice_paziente: 'PZ-0002',
      nome: '',
      cognome: 'Mario R.',
    })
  })

  it('paziente ESISTENTE (stesso codice_paziente): riusa l\'id, NESSUN POST pazienti → 2 fetch', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(
      jsonOk(200, { pazienti: [{ id: 'pz-9', codice_paziente: 'PZ-0042' }, { id: 'pz-1', codice_paziente: 'PZ-0001' }] })
    )
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-9', numero_lavoro: '2026/0009' } }))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0042',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(m).toHaveBeenCalledTimes(2)
    expect(esito.lavoro).toEqual({ id: 'lav-9', numero_lavoro: '2026/0009' })
    const bodyLavori = JSON.parse(m.mock.calls[1][1].body)
    expect(bodyLavori.paziente_id).toBe('pz-9')
  })

  it('tipo libero → tipo_dispositivo:"altro", descrizione:testo, classe_rischio:"classe_i"', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-3' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-3', numero_lavoro: '2026/0003' } }))

    await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_LIBERO,
      pz: 'PZ-0003',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    const bodyLavori = JSON.parse(m.mock.calls[2][1].body)
    expect(bodyLavori.tipo_dispositivo).toBe('altro')
    expect(bodyLavori.descrizione).toBe('Placca su misura')
    expect(bodyLavori.classe_rischio).toBe('classe_i')
  })

  it('elemento/colore presenti → PATCH dopo il POST lavori (4 fetch), denti_coinvolti splittato e ripulito', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-4' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-4', numero_lavoro: '2026/0004' } }))
    m.mockResolvedValueOnce(jsonOk(200, { lavoro: { id: 'lav-4' } }))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0004',
      alias: '',
      elemento: '2.6, 2.7  3.1',
      colore: 'A2',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(m).toHaveBeenCalledTimes(4)
    expect(esito).toEqual({ lavoro: { id: 'lav-4', numero_lavoro: '2026/0004' }, accessoriFalliti: [] })

    const [urlPatch, optPatch] = m.mock.calls[3]
    expect(urlPatch).toBe('/api/lavori/lav-4')
    expect(optPatch.method).toBe('PATCH')
    expect(JSON.parse(optPatch.body)).toEqual({
      denti_coinvolti: ['2.6', '2.7', '3.1'],
      colore_dente: 'A2',
    })
  })

  it('foto presente → POST immagini FormData{file, descrizione:"impronta"} dopo POST lavori', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-5' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-5', numero_lavoro: '2026/0005' } }))
    m.mockResolvedValueOnce(jsonOk(201, { immagine: { id: 'img-1' } }))

    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0005',
      alias: '',
      elemento: '',
      colore: '',
      foto: file,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(m).toHaveBeenCalledTimes(4)
    expect(esito.accessoriFalliti).toEqual([])

    const [urlImg, optImg] = m.mock.calls[3]
    expect(urlImg).toBe('/api/lavori/lav-5/immagini')
    expect(optImg.method).toBe('POST')
    const fd = optImg.body as FormData
    expect(fd instanceof FormData).toBe(true)
    expect(fd.get('file')).toBe(file)
    expect(fd.get('descrizione')).toBe('impronta')
  })

  it('elemento/colore E foto presenti → PATCH poi POST immagini (5 fetch), entrambi riusciti', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-6' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-6', numero_lavoro: '2026/0006' } }))
    m.mockResolvedValueOnce(jsonOk(200, { lavoro: { id: 'lav-6' } }))
    m.mockResolvedValueOnce(jsonOk(201, { immagine: { id: 'img-2' } }))

    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0006',
      alias: '',
      elemento: '2.6',
      colore: 'A2',
      foto: file,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(m).toHaveBeenCalledTimes(5)
    expect(esito.accessoriFalliti).toEqual([])
    // Ordine: PATCH (indice 3) PRIMA di POST immagini (indice 4).
    expect(m.mock.calls[3][1].method).toBe('PATCH')
    expect(m.mock.calls[4][1].method).toBe('POST')
  })

  it('né elemento né colore né foto → nessuna chiamata oltre POST lavori (3 fetch)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-7' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-7', numero_lavoro: '2026/0007' } }))

    await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0007',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(m).toHaveBeenCalledTimes(3)
  })

  it('PATCH fallisce (dettagli) MA la foto prosegue comunque → accessoriFalliti:["dettagli"]', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-8' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-8', numero_lavoro: '2026/0008' } }))
    m.mockResolvedValueOnce(jsonFail(500))
    m.mockResolvedValueOnce(jsonOk(201, { immagine: { id: 'img-3' } }))

    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0008',
      alias: '',
      elemento: '2.6',
      colore: '',
      foto: file,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(m).toHaveBeenCalledTimes(5)
    expect(esito.lavoro).toEqual({ id: 'lav-8', numero_lavoro: '2026/0008' })
    expect(esito.accessoriFalliti).toEqual(['dettagli'])
  })

  it('POST immagini fallisce (foto) → accessoriFalliti:["foto"], lavoro comunque presente', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-10' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-10', numero_lavoro: '2026/0010' } }))
    m.mockResolvedValueOnce(jsonFail(500))

    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0010',
      alias: '',
      elemento: '',
      colore: '',
      foto: file,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.lavoro).toEqual({ id: 'lav-10', numero_lavoro: '2026/0010' })
    expect(esito.accessoriFalliti).toEqual(['foto'])
  })

  it('PATCH e foto ENTRAMBI falliscono → accessoriFalliti:["dettagli","foto"]', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-11' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-11', numero_lavoro: '2026/0011' } }))
    m.mockResolvedValueOnce(jsonFail(500))
    m.mockResolvedValueOnce(jsonFail(500))

    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0011',
      alias: '',
      elemento: '2.6',
      colore: '',
      foto: file,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.accessoriFalliti).toEqual(['dettagli', 'foto'])
  })

  it('fallimento GET pazienti (non-ok) → BLOCCANTE: lavoro:null, nessuna chiamata successiva (1 fetch)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonFail(500))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0012',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito).toEqual({ lavoro: null, accessoriFalliti: [] })
    expect(m).toHaveBeenCalledTimes(1)
  })

  it('fallimento GET pazienti (rete: fetch rifiuta) → BLOCCANTE', async () => {
    const m = mockFetch()
    m.mockRejectedValueOnce(new Error('network down'))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0013',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito).toEqual({ lavoro: null, accessoriFalliti: [] })
    expect(m).toHaveBeenCalledTimes(1)
  })

  it('fallimento POST pazienti (nuovo, non-ok) → BLOCCANTE: nessun POST lavori (2 fetch)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonFail(500))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0014',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito).toEqual({ lavoro: null, accessoriFalliti: [] })
    expect(m).toHaveBeenCalledTimes(2)
  })

  it('fallimento POST lavori (non-ok) → BLOCCANTE anche con elemento/foto presenti: nessuna PATCH/immagini (3 fetch)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-15' } }))
    m.mockResolvedValueOnce(jsonFail(500))

    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0015',
      alias: '',
      elemento: '2.6',
      colore: 'A2',
      foto: file,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito).toEqual({ lavoro: null, accessoriFalliti: [] })
    expect(m).toHaveBeenCalledTimes(3)
  })
})
