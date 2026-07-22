import { render, screen, fireEvent, within, waitFor, act, configure } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Anti-flake sotto carico del pool vitest (diagnosi 20/07): quando i worker
// contendono i core, (a) i poll di findBy*/waitFor possono sforare il default
// di 1000ms, (b) un intero test può sforare i 5s di testTimeout. Margini più
// larghi non cambiano la semantica: solo QUANDO dichiarare il fallimento.
configure({ asyncUtilTimeout: 5000 })
vi.setConfig({ testTimeout: 15_000 })

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))
vi.mock('@/design-system/v3/motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system/v3/motion')>()
  return { ...actual, useReducedMotion: () => true }
})

import { FlussoConsegna } from '@/components/features/lavori/consegna-v3/FlussoConsegna'

const GET_URL = '/api/lavori/L1/precheck-consegna'
const POST_URL = '/api/lavori/L1/consegna'
const OK_200 = { ok: true, lavoro_id: 'L1', numero_lavoro: '147', ddc: { numero: 'DDC-2026-0001', url: 'x', signed_url: 'https://s/x' }, buono: { numero: 'BUO-2026-0001', url: 'y', signed_url: 'https://s/y' }, fattura: null, whatsapp_url: 'https://wa.me/393331234567?text=x', tempo_ms: 900 }

// fetch mockato PER URL (riserva test #d): mai per ordine di chiamata.
function mockFetch(mappa: Record<string, { status: number; json: unknown }>) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const match = Object.keys(mappa).find((k) => url.includes(k))
    if (!match) throw new Error(`fetch non mockata: ${url}`)
    const { status, json } = mappa[match]
    return { ok: status < 400, status, json: async () => json } as Response
  }) as unknown as typeof fetch
}

function montaAperto(extra: Partial<Parameters<typeof FlussoConsegna>[0]> = {}) {
  return render(
    <FlussoConsegna lavoroId="L1" numero="147" dentista="Dr. Esposito" descrizione="Corona zirconia"
      aperto onChiudi={vi.fn()} onFrameChiuso={vi.fn()} {...extra} />
  )
}

describe('FlussoConsegna — macchina a stati (§3.2)', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('verde: GET ok → DialogConferma con oggetto e primario sopra', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } } })
    montaAperto()
    expect(await screen.findByText(/Consegno\?/)).toBeInTheDocument()
    expect(screen.getByText(/Corona zirconia n\.147/)).toBeInTheDocument()
    const bottoni = screen.getAllByRole('button')
    expect(bottoni[0]).toHaveTextContent('Consegna')
  })

  it('verde con warnings: nota ambra aggregata nel dialog (D-6)', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: ['Zirconia sotto scorta (2 g su 5)', 'Tipo impronta non registrato all\'accettazione'] } } })
    montaAperto()
    expect(await screen.findByText(/2 avvisi — si può consegnare/)).toBeInTheDocument()
  })

  it('rosso: GET con bloccanti → sheet «Prima di consegnare» con RigaBloccante; tap → onRisolvi(route)', async () => {
    const onRisolvi = vi.fn()
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: false, warnings: [], bloccanti: [
      { elemento: 6, descrizione: 'Classe di rischio non specificata', campo: 'classe_rischio', route: 'dati' },
      { elemento: 7, descrizione: 'Data consegna prevista mancante', campo: 'data_consegna_prevista', route: 'dati' },
    ] } } })
    montaAperto({ onRisolvi })
    expect(await screen.findByText('Prima di consegnare')).toBeInTheDocument()
    expect(screen.getByText(/2 cose da sistemare/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /classe di rischio/i }))
    expect(onRisolvi).toHaveBeenCalledWith('dati')
  })

  it('POST 200 → frame Consegnato! con WhatsApp «pronto da inviare» e onConsegnato', async () => {
    const onConsegnato = vi.fn()
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } }, [POST_URL]: { status: 200, json: OK_200 } })
    montaAperto({ onConsegnato })
    fireEvent.click((await screen.findAllByRole('button'))[0]) // «Consegna»
    expect(await screen.findByText('Consegnato!')).toBeInTheDocument()
    expect(screen.getByText(/andata al Dr\. Esposito/)).toBeInTheDocument()
    expect(screen.getByText('Pronto da inviare')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', OK_200.whatsapp_url)
    expect(screen.getByText(/La fatturazione si decide con il dentista/)).toBeInTheDocument()
    expect(onConsegnato).toHaveBeenCalledTimes(1)
  })

  it('POST 200 → il frame suona la firma «ua» + vibra success, una volta sola (§9.1/§9.3)', async () => {
    // la history dei mock factory sopravvive fra i test: azzera PRIMA del mount
    const { suona: suonaMock } = await import('@/design-system/v3/sound')
    const { vibra: vibraMock } = await import('@/design-system/v3/haptic')
    vi.mocked(suonaMock).mockClear()
    vi.mocked(vibraMock).mockClear()
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } }, [POST_URL]: { status: 200, json: OK_200 } })
    montaAperto()
    fireEvent.click((await screen.findAllByRole('button'))[0]) // «Consegna»
    await screen.findByText('Consegnato!')
    const { suona } = await import('@/design-system/v3/sound')
    const { vibra } = await import('@/design-system/v3/haptic')
    // Anti-flake: «Consegnato!» compare nel DOM al commit del render, ma il
    // suono parte nel useEffect del frame — che React flusha DOPO, via
    // scheduler. Sotto carico la finestra si allarga: si ATTENDE l'effect
    // invece di leggere la history subito (era il fail «expected [] length 1»).
    await waitFor(() => expect(vi.mocked(suona).mock.calls.filter((c) => c[0] === 'ua')).toHaveLength(1))
    await waitFor(() => expect(vi.mocked(vibra).mock.calls.filter((c) => c[0] === 'success')).toHaveLength(1))
  })

  it('race: POST 422 precheck_fallito → riapre sheet con gli errori del server', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } },
      [POST_URL]: { status: 422, json: { ok: false, tipo: 'precheck_fallito', messaggio: 'Dati MDR incompleti', errori_precheck: [{ elemento: 3, descrizione: 'Nominativo prescrittore mancante', campo: 'cliente_id', route: 'dati' }] } } })
    montaAperto()
    fireEvent.click((await screen.findAllByRole('button'))[0])
    expect(await screen.findByText('Prima di consegnare')).toBeInTheDocument()
    expect(screen.getByText(/prescrittore/i)).toBeInTheDocument()
  })

  it('422 stato_non_consegnabile → solo messaggio + chiusura (onChiudi)', async () => {
    const onChiudi = vi.fn()
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } },
      [POST_URL]: { status: 422, json: { ok: false, tipo: 'stato_non_consegnabile', messaggio: 'Il lavoro non è pronto.' } } })
    montaAperto({ onChiudi })
    fireEvent.click((await screen.findAllByRole('button'))[0])
    expect(await screen.findByText(/non è pronto/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }))
    expect(onChiudi).toHaveBeenCalled()
  })

  it('422 errore_pdf (sovraccarico, incluso «già in corso») → copy generica + Riprova; retry → ramo idempotente 200 degradato → frame SENZA link documento', async () => {
    let primoPost = true
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(GET_URL)) return { ok: true, status: 200, json: async () => ({ consegnabile: true, bloccanti: [], warnings: [] }) } as Response
      if (url.includes(POST_URL)) {
        if (primoPost) { primoPost = false; return { ok: false, status: 422, json: async () => ({ ok: false, tipo: 'errore_pdf', messaggio: 'Consegna già in corso, attendi.' }) } as Response }
        return { ok: true, status: 200, json: async () => ({ ...OK_200, ddc: { numero: 'DDC-2026-000', url: '', signed_url: '' }, buono: { numero: 'BUO-2026-000', url: '', signed_url: '' } }) } as Response
      }
      throw new Error('fetch non mockata')
    }) as unknown as typeof fetch
    montaAperto()
    fireEvent.click((await screen.findAllByRole('button'))[0])
    // copy GENERICA: mai la stringa server nel ramo riprova
    expect(await screen.findByText(/Non è andata a buon fine|Qualcosa non è andato/)).toBeInTheDocument()
    expect(screen.queryByText(/già in corso/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /riprova/i }))
    expect(await screen.findByText('Consegnato!')).toBeInTheDocument()
  })

  it('GET fallisce → avviso con Riprova, mai il dialog', async () => {
    mockFetch({ [GET_URL]: { status: 500, json: { error: 'boom' } } })
    montaAperto()
    expect(await screen.findByRole('button', { name: /riprova/i })).toBeInTheDocument()
    expect(screen.queryByText(/Consegno\?/)).toBeNull()
  })

  it('chiusura frame → onFrameChiuso (refresh pile alla CHIUSURA, non al successo)', async () => {
    const onFrameChiuso = vi.fn()
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } }, [POST_URL]: { status: 200, json: OK_200 } })
    montaAperto({ onFrameChiuso })
    fireEvent.click((await screen.findAllByRole('button'))[0])
    await screen.findByText('Consegnato!')
    expect(onFrameChiuso).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }))
    expect(onFrameChiuso).toHaveBeenCalledTimes(1)
  })

  // Task 7 (spec §9.1 — L5): racconto della liberazione cassetta nel Consegnato!.
  it('POST 200 con cassettaLiberata → riga «UÀ ha liberato la cassetta C12» nella CardUAHaFatto', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } }, [POST_URL]: { status: 200, json: { ...OK_200, cassettaLiberata: 'C12' } } })
    montaAperto()
    fireEvent.click((await screen.findAllByRole('button'))[0])
    expect(await screen.findByText('Consegnato!')).toBeInTheDocument()
    expect(screen.getByText('UÀ ha liberato la cassetta C12')).toBeInTheDocument()
  })

  it('POST 200 senza cassettaLiberata (assente/null) → NIENTE riga di liberazione (L5: mai raccontare ciò che non è successo)', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } }, [POST_URL]: { status: 200, json: OK_200 } })
    montaAperto()
    fireEvent.click((await screen.findAllByRole('button'))[0])
    expect(await screen.findByText('Consegnato!')).toBeInTheDocument()
    expect(screen.queryByText(/UÀ ha liberato la cassetta/)).toBeNull()
  })
})

describe('FrameConsegnato — annullo (§3.4)', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.useRealTimers())

  const ANNULLA_URL = '/api/lavori/L1/annulla-consegna'

  // fetch stateful: annulla-consegna risponde in sequenza (500 → 200);
  // ordine dei match: precheck e annulla PRIMA di consegna (le url si contengono).
  function mockFetchConAnnullo(rispostAnnulla: Array<{ status: number; json: unknown }>) {
    let chiamateAnnulla = 0
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(GET_URL)) return { ok: true, status: 200, json: async () => ({ consegnabile: true, bloccanti: [], warnings: [] }) } as Response
      if (url.includes(ANNULLA_URL)) {
        const r = rispostAnnulla[Math.min(chiamateAnnulla, rispostAnnulla.length - 1)]
        chiamateAnnulla++
        return { ok: r.status < 400, status: r.status, json: async () => r.json } as Response
      }
      if (url.includes(POST_URL)) return { ok: true, status: 200, json: async () => OK_200 } as Response
      throw new Error(`fetch non mockata: ${url}`)
    }) as unknown as typeof fetch
  }

  async function arrivaAlFrame(extra: Partial<Parameters<typeof FlussoConsegna>[0]> = {}) {
    const utils = montaAperto(extra)
    fireEvent.click((await screen.findAllByRole('button'))[0]) // «Consegna»
    await screen.findByText('Consegnato!')
    return utils
  }

  it('annullo fallito (500) → nota nel dialog, dialog resta aperto, onFrameChiuso NON chiamato; retry 200 → onFrameChiuso', async () => {
    const onFrameChiuso = vi.fn()
    mockFetchConAnnullo([{ status: 500, json: { error: 'boom interno' } }, { status: 200, json: { ok: true } }])
    await arrivaAlFrame({ onFrameChiuso })

    fireEvent.click(screen.getByRole('button', { name: 'Annulla la consegna' })) // LinkQuieto
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /annulla la consegna/i }))

    // nota generica D-6: MAI la stringa server
    const nota = await screen.findByText(/la consegna resta valida/)
    expect(nota).toBeInTheDocument()
    // fix review finale (finding IMPORTANTE): feedback dinamico di errore →
    // deve avere semantica live, non un <p> muto per lo screen reader
    expect(nota).toHaveAttribute('role', 'alert')
    expect(screen.queryByText(/boom interno/)).toBeNull()
    expect(onFrameChiuso).not.toHaveBeenCalled()
    expect(screen.getByText('Consegnato!')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // secondo tentativo → 200 → il frame chiude
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /annulla la consegna/i }))
    await waitFor(() => expect(onFrameChiuso).toHaveBeenCalledTimes(1))
  })

  it('annullo ok → onFrameChiuso chiamato e nota mai comparsa', async () => {
    const onFrameChiuso = vi.fn()
    mockFetchConAnnullo([{ status: 200, json: { ok: true } }])
    await arrivaAlFrame({ onFrameChiuso })

    fireEvent.click(screen.getByRole('button', { name: 'Annulla la consegna' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /annulla la consegna/i }))

    await waitFor(() => expect(onFrameChiuso).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/la consegna resta valida/)).toBeNull()
  })

  it('countdown a 0 → link annullo sparisce e dialog di annullo chiuso', async () => {
    mockFetchConAnnullo([{ status: 200, json: { ok: true } }])

    // Tutto il flusso vive DENTRO i fake timers (Date compresa): l'interval
    // del countdown e Date.now() devono avanzare insieme. Niente findBy*
    // (waitFor coi fake timers è fragile): il fetch mock risolve in microtask,
    // che advanceTimersByTimeAsync(0) dentro act() svuota.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-07-16T12:00:00Z'))
    const { unmount } = montaAperto()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) }) // GET precheck
    fireEvent.click(screen.getAllByRole('button')[0]) // «Consegna»
    await act(async () => { await vi.advanceTimersByTimeAsync(0) }) // POST consegna
    expect(screen.getByText('Consegnato!')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Annulla la consegna' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1500) })
    expect(screen.queryByRole('button', { name: 'Annulla la consegna' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    unmount()
  })
})
