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

  // 🔴 QUESTO CASO HA SOSTITUITO UN TEST VERDE SU UN PERCORSO MORTO (Task 11).
  // Fino al Task 10 asseriva che, con elemento/colore compilati, il wizard
  // facesse una QUARTA chiamata — una PATCH con `denti_coinvolti`/`colore_dente`.
  // Era verde, e non voleva dire niente: `fetch` è finto e la chiamata non
  // arrivava mai a un server. Il Task 10 ha tolto quei sette nomi da
  // `PATCHABLE_FIELDS`, e `src/app/api/lavori/[id]/route.ts` scarta le chiavi
  // fuori allowlist SENZA errore. Dal vero, quindi, quella PATCH era diventata
  // un 200 su un corpo buttato: il test misurava l'INTENZIONE del client, mai
  // l'ACCETTAZIONE del server. Ora denti e colore viaggiano dentro il POST.
  it('elemento/colore presenti → NESSUNA PATCH: viaggiano nel corpo del POST (3 fetch)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-4' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-4', numero_lavoro: '2026/0004' } }))

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

    expect(m).toHaveBeenCalledTimes(3)
    expect(esito).toEqual({ lavoro: { id: 'lav-4', numero_lavoro: '2026/0004' }, accessoriFalliti: [] })
    expect(m.mock.calls.some((c) => c[1]?.method === 'PATCH')).toBe(false)

    const corpoLavori = JSON.parse(m.mock.calls[2][1].body)
    expect(corpoLavori.denti).toEqual([
      { fdi: 26, ruolo: 'elemento', provenienza: 'prescritto' },
      { fdi: 27, ruolo: 'elemento', provenienza: 'prescritto' },
      { fdi: 31, ruolo: 'elemento', provenienza: 'prescritto' },
    ])
    expect(corpoLavori.colore_codice).toBe('A2')
    expect(corpoLavori).not.toHaveProperty('denti_coinvolti')
    expect(corpoLavori).not.toHaveProperty('colore_dente')
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

  // Adeguato al Task 11 per la stessa ragione del caso qui sopra: i passi sono
  // 4, non 5. La foto è l'UNICO accessorio rimasto, e resta l'ultima chiamata.
  it('elemento/colore E foto presenti → 4 fetch, la foto ultima e nessuna PATCH in mezzo', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-6' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-6', numero_lavoro: '2026/0006' } }))
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

    expect(m).toHaveBeenCalledTimes(4)
    expect(esito.accessoriFalliti).toEqual([])
    expect(m.mock.calls.some((c) => c[1]?.method === 'PATCH')).toBe(false)
    expect(m.mock.calls[3][0]).toBe('/api/lavori/lav-6/immagini')
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

  // Adeguato al Task 11: il ramo «la PATCH dei dettagli è fallita» non esiste
  // più — non c'è più una PATCH da far fallire. Al suo posto l'unico modo in cui
  // un elemento può ancora andare perso: la casella conteneva qualcosa che non è
  // un dente. Il lavoro nasce lo stesso, la foto prosegue, e l'esito lo DICE.
  it('elemento illeggibile MA la foto prosegue comunque → accessoriFalliti:["elementi"]', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-8' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-8', numero_lavoro: '2026/0008' } }))
    m.mockResolvedValueOnce(jsonOk(201, { immagine: { id: 'img-3' } }))

    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0008',
      alias: '',
      elemento: 'incisivo',
      colore: '',
      foto: file,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(m).toHaveBeenCalledTimes(4)
    expect(esito.lavoro).toEqual({ id: 'lav-8', numero_lavoro: '2026/0008' })
    expect(esito.accessoriFalliti).toEqual(['elementi'])
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

  // Stessa ragione del caso qui sopra. L'ordine dell'elenco è quello in cui le
  // due cose accadono: gli elementi si perdono PRIMA di spedire, la foto dopo.
  it('elementi illeggibili E foto fallita → accessoriFalliti:["elementi","foto"]', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-11' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-11', numero_lavoro: '2026/0011' } }))
    m.mockResolvedValueOnce(jsonFail(500))

    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0011',
      alias: '',
      elemento: 'boh',
      colore: '',
      foto: file,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.accessoriFalliti).toEqual(['elementi', 'foto'])
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

  it('fallimento POST lavori (non-ok) → BLOCCANTE anche con elemento/colore/foto presenti: nessuna immagine (3 fetch)', async () => {
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

// ─────────────────────────────────────────────────────────────────────────
// Z1 — «codice occupato» e «guasto» smettono di essere la stessa cosa.
//
// Fino a qui `if (!resPost.ok) return ESITO_BLOCCANTE` (`crea-lavoro.ts:233`)
// appiattiva ogni fallimento su un esito solo, e il wizard non poteva dire
// altro che «Riprova» — che è un anello chiuso, perché `pz` non si ricalcola.
// Il motivo viaggia in un campo dell'esito, MAI nel testo: chi legge non fa
// confronti su una frase.
//
// 🔑 Il campo è FACOLTATIVO apposta: i sei `toEqual` già scritti qui sopra
// («fallimento GET/POST/POST lavori → BLOCCANTE») restano verdi e diventano
// per giunta una guardia in più — con `toEqual` una proprietà definita di
// troppo fa cadere l'asserzione, quindi un motivo che trapelasse sul percorso
// generico li farebbe scattare.
// ─────────────────────────────────────────────────────────────────────────
describe('creaLavoroDaWizard — Z1: il codice occupato risale come motivo', () => {
  function conflitto409() {
    return {
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Questo codice è già di un altro paziente. Scrivine un altro.',
        motivo: 'codice_gia_in_uso',
      }),
    }
  }

  it('POST pazienti risponde 409 «codice già in uso» → esito BLOCCANTE col motivo, nessun POST lavori (2 fetch)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(conflitto409())

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0918',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito).toEqual({ lavoro: null, accessoriFalliti: [], motivo: 'codice_gia_in_uso' })
    expect(m).toHaveBeenCalledTimes(2)
  })

  it('🛑 NEGATIVA: un 500 sul POST pazienti resta un guasto SENZA motivo (mai «il codice è occupato» su un singhiozzo)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonFail(500))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0919',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.lavoro).toBeNull()
    expect(esito.motivo).toBeUndefined()
  })

  it('🛑 NEGATIVA: un 409 con un motivo che non conosciamo NON diventa «codice occupato»', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'boh', motivo: 'altra_cosa' }) })

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0920',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.motivo).toBeUndefined()
  })

  it('🛑 409 con un corpo ILLEGGIBILE → esito bloccante senza motivo, e nessuna eccezione', async () => {
    // Leggere il corpo di una risposta fallita è superficie nuova: se il corpo
    // non è JSON, `.json()` solleva. L'esito deve degradare al blocco
    // generico — il wizard tornerà a dire «Riprova» — mai propagare l'errore.
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0')
      },
    })

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0921',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito).toEqual({ lavoro: null, accessoriFalliti: [] })
    expect(esito.motivo).toBeUndefined()
  })

  it('🛑 NEGATIVA: un 409 sul POST LAVORI non porta il motivo del paziente', async () => {
    // Il conflitto di codice esiste solo al passo del paziente. Se un giorno
    // `/api/lavori` rispondesse 409, l'esito non deve raccontare che il codice
    // paziente è occupato.
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-20' } }))
    m.mockResolvedValueOnce(conflitto409())

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0922',
      alias: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito).toEqual({ lavoro: null, accessoriFalliti: [] })
    expect(esito.motivo).toBeUndefined()
  })
})

// M2 (revisione pre-merge ondata a) — il colore digitato male non si perde più
// in silenzio. Il server lo scarta (regola dura: «si perde il colore, mai il
// lavoro») e lo DICE nella risposta con `colore_scartato`; qui quella parola
// diventa un accessorio fallito, cioè un Avviso in FrameFatto.
//
// Il canale è quello che c'era già: nessuna casella nuova, nessuna tendina.
describe('creaLavoroDaWizard — il colore scartato risale all\'utente (M2)', () => {
  it('POST risponde colore_scartato:true → accessoriFalliti:["colore"], e il lavoro C\'È', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-16' } }))
    m.mockResolvedValueOnce(
      jsonOk(201, { lavoro: { id: 'lav-16', numero_lavoro: '2026/0016' }, colore_scartato: true })
    )

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0016',
      alias: '',
      elemento: '',
      // La digitazione vera del banco: virgola invece del punto. «A3,5» non è in
      // catalogo (verificato sul database il 28/07/2026), «A3.5» sì.
      colore: 'A3,5',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.lavoro).toEqual({ id: 'lav-16', numero_lavoro: '2026/0016' })
    expect(esito.accessoriFalliti).toEqual(['colore'])
    // Il codice parte comunque: normalizzare e confrontare col catalogo è
    // mestiere del server, non del client (v. `risolviColoreCaso`).
    expect(JSON.parse(m.mock.calls[2][1].body).colore_codice).toBe('A3,5')
  })

  it('colore riconosciuto (colore_scartato:false) → nessun avviso', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-17' } }))
    m.mockResolvedValueOnce(
      jsonOk(201, { lavoro: { id: 'lav-17', numero_lavoro: '2026/0017' }, colore_scartato: false })
    )

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0017',
      alias: '',
      elemento: '',
      colore: 'A3.5',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.accessoriFalliti).toEqual([])
  })

  // 🛑 Un avviso che compare quando non serve si impara a ignorare, e allora non
  // avvisa più. Chi non riceve la parola non la inventa.
  it('risposta SENZA il campo → nessun avviso: mai un falso allarme', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-18' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-18', numero_lavoro: '2026/0018' } }))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0018',
      alias: '',
      elemento: '',
      colore: 'A2',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.accessoriFalliti).toEqual([])
  })

  // L'ordine è quello della schermata («Elemento», «Colore», foto), che è anche
  // quello in cui le tre cose si perdono.
  it('elementi + colore + foto tutti persi → ["elementi","colore","foto"]', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-19' } }))
    m.mockResolvedValueOnce(
      jsonOk(201, { lavoro: { id: 'lav-19', numero_lavoro: '2026/0019' }, colore_scartato: true })
    )
    m.mockResolvedValueOnce(jsonFail(500))

    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0019',
      alias: '',
      elemento: 'boh',
      colore: 'ZZ9',
      foto: file,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.lavoro).toEqual({ id: 'lav-19', numero_lavoro: '2026/0019' })
    expect(esito.accessoriFalliti).toEqual(['elementi', 'colore', 'foto'])
  })
})
