// tests/unit/scheda-v3/modifica-colore-sheet.test.tsx
//
// T7 (ondata B ③) — il foglio «Colore» e il GESTO D212 (typo vs divergenza).
// Testi del mockup `2026-08-04-ondata-b3-schermate-vere.html` (scene
// `sheet-colore`, `gesto-d212`) e `2026-08-04-ondata-b-B-typo-divergenza.html`
// (scena 2, il ramo del motivo).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModificaColoreSheet } from '../../../src/components/features/lavori/scheda-v3/ModificaColoreSheet'

/** Un gettone con i MICROSECONDI: se qualcuno lo facesse passare da `Date` si
 *  troncherebbe a `.123`, e il 409 diventerebbe permanente. */
const GETTONE = '2026-08-04T10:00:00.123456+00:00'
const GETTONE_NUOVO = '2026-08-04T11:22:33.654321+00:00'

type Risposta = { ok: boolean; status?: number; body?: unknown }

/** Instrada le risposte per URL: le tre rotte in gioco hanno corpi diversi. */
function montaFetch(rotte: { patch?: Risposta; typo?: Risposta; divergenza?: Risposta }) {
  // La firma porta anche `init`: `patch()` qui sotto legge `c[1].method` per
  // separare la PATCH del colore dalle due rotte della prescrizione, che
  // vivono sotto lo stesso prefisso di URL.
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    void init
    const scelta = url.includes('/prescrizione/typo')
      ? (rotte.typo ?? { ok: true, body: { updated_at: GETTONE_NUOVO } })
      : url.includes('/prescrizione/divergenza')
        ? (rotte.divergenza ?? { ok: true, body: { divergenze: 1 } })
        : (rotte.patch ?? { ok: true, body: { lavoro: { updated_at: GETTONE_NUOVO } } })
    return {
      ok: scelta.ok,
      status: scelta.status ?? (scelta.ok ? 200 : 500),
      json: async () => scelta.body ?? {},
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function chiamate(fetchMock: ReturnType<typeof montaFetch>, frammento: string) {
  return fetchMock.mock.calls.filter((c) => String(c[0]).includes(frammento))
}

/** Le sole PATCH sul lavoro (il colore vivo). ⚠️ NON si filtra per URL: le tre
 *  rotte in gioco cominciano tutte con `/api/lavori/lav` — un filtro per
 *  frammento conterebbe anche typo e divergenza. */
function patch(fetchMock: ReturnType<typeof montaFetch>) {
  return fetchMock.mock.calls.filter((c) => (c[1] as { method?: string } | undefined)?.method === 'PATCH')
}

function corpoDi(chiamata: unknown[]) {
  return JSON.parse((chiamata[1] as { body: string }).body)
}

function monta(over: Partial<Parameters<typeof ModificaColoreSheet>[0]> = {}) {
  const onSalvato = vi.fn()
  const onChiudi = vi.fn()
  const onErrore = vi.fn()
  render(
    <ModificaColoreSheet
      aperto
      onChiudi={onChiudi}
      lavoroId="lav"
      titolo="Colore"
      valoreIniziale="A3"
      trascritto="A3"
      dentista="Studio Bianchi"
      updatedAt={GETTONE}
      onSalvato={onSalvato}
      onErrore={onErrore}
      {...over}
    />
  )
  return { onSalvato, onChiudi, onErrore }
}

function scrivi(valore: string) {
  fireEvent.change(screen.getByLabelText('Colore', { selector: 'input' }), { target: { value: valore } })
}

beforeEach(() => {
  vi.restoreAllMocks()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Foglio «Colore» — il salvataggio semplice (nessuna trascrizione da difendere)', () => {
  it('senza colore nello snapshot il Salva NON apre il gesto D212: scrive e basta', async () => {
    const fetchMock = montaFetch({})
    const { onSalvato, onChiudi } = monta({ trascritto: undefined })
    scrivi('B2')
    fireEvent.click(screen.getByRole('button', { name: /^salva$/i }))

    await waitFor(() => expect(patch(fetchMock).length).toBe(1))
    expect(screen.queryByText(/Era scritto così sulla prescrizione\?/)).not.toBeInTheDocument()
    expect(corpoDi(patch(fetchMock)[0])).toEqual({
      colore_scala: 'vita_classical',
      colore_codice: 'B2',
    })
    await waitFor(() =>
      expect(onSalvato).toHaveBeenCalledWith({
        colore: { scala: 'vita_classical', codice: 'B2' },
        updatedAt: GETTONE_NUOVO,
      })
    )
    expect(onChiudi).toHaveBeenCalled()
  })

  it('senza trascrizione il sottotitolo dichiara la scelta del laboratorio', () => {
    montaFetch({})
    monta({ trascritto: undefined })
    expect(screen.getByText(/scelto dal laboratorio/)).toBeInTheDocument()
  })

  it('col trascritto il sottotitolo dice da dove viene, col nome vero del dentista', () => {
    montaFetch({})
    monta()
    expect(screen.getByText(/trascritto dalla prescrizione di Studio Bianchi/)).toBeInTheDocument()
  })

  it('un valore che coincide col trascritto a meno di spazi e maiuscole NON apre il gesto', async () => {
    const fetchMock = montaFetch({})
    monta({ trascritto: 'a3 ' })
    scrivi('A3')
    fireEvent.click(screen.getByRole('button', { name: /^salva$/i }))
    await waitFor(() => expect(patch(fetchMock).length).toBe(1))
    expect(screen.queryByText(/Era scritto così sulla prescrizione\?/)).not.toBeInTheDocument()
  })

  it('il campo vuoto non salva niente e lo dice', async () => {
    const fetchMock = montaFetch({})
    const { onErrore } = monta({ trascritto: undefined })
    scrivi('   ')
    fireEvent.click(screen.getByRole('button', { name: /^salva$/i }))
    await waitFor(() => expect(onErrore).toHaveBeenCalled())
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('Il gesto D212 — la domanda a due vie', () => {
  function apriGesto(over: Partial<Parameters<typeof ModificaColoreSheet>[0]> = {}) {
    const r = monta(over)
    scrivi('A3.5')
    fireEvent.click(screen.getByRole('button', { name: /^salva$/i }))
    return r
  }

  it('un valore diverso dal trascritto apre il foglio coi testi del mockup', () => {
    montaFetch({})
    apriGesto()
    expect(screen.getByText('Era scritto così sulla prescrizione?')).toBeInTheDocument()
    expect(screen.getByText(/Dimmi che cosa sta succedendo, così la Dichiarazione dice la verità/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sul foglio c'è scritto A3\.5/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /No: lo stiamo cambiando noi/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lascia stare, non cambio niente' })).toBeInTheDocument()
  })

  it('il valore di prima resta LEGGIBILE nel prima→dopo, con le sue etichette', () => {
    montaFetch({})
    apriGesto()
    expect(screen.getByText('trascritto')).toBeInTheDocument()
    expect(screen.getByText('nuovo')).toBeInTheDocument()
    // «A3» barrato accanto ad «A3.5»: il precedente non si oscura mai.
    const precedente = screen.getByText('A3')
    expect(precedente).toBeInTheDocument()
    expect(precedente.style.textDecoration).toContain('line-through')
  })

  it('nessuna via è preselezionata: aprire la domanda non scrive niente', () => {
    const fetchMock = montaFetch({})
    apriGesto()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('«Lascia stare, non cambio niente» chiude senza nessuna chiamata', () => {
    const fetchMock = montaFetch({})
    const { onChiudi } = apriGesto()
    fireEvent.click(screen.getByRole('button', { name: 'Lascia stare, non cambio niente' }))
    expect(onChiudi).toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('la via typo corregge la trascrizione col GETTONE OPACO e poi allinea il colore vivo', async () => {
    const fetchMock = montaFetch({})
    const { onSalvato } = apriGesto()
    fireEvent.click(screen.getByRole('button', { name: /Sul foglio c'è scritto A3\.5/ }))

    await waitFor(() => expect(chiamate(fetchMock, '/prescrizione/typo').length).toBe(1))
    expect(corpoDi(chiamate(fetchMock, '/prescrizione/typo')[0])).toEqual({
      campo: 'colore',
      valore: 'A3.5',
      // 🛑 La stringa arriva INTATTA, microsecondi compresi.
      atteso_updated_at: GETTONE,
    })
    await waitFor(() => expect(patch(fetchMock).length).toBe(1))
    expect(corpoDi(patch(fetchMock)[0])).toEqual({
      colore_scala: 'vita_classical',
      colore_codice: 'A3.5',
    })
    await waitFor(() =>
      expect(onSalvato).toHaveBeenCalledWith({
        trascritto: 'A3.5',
        colore: { scala: 'vita_classical', codice: 'A3.5' },
        updatedAt: GETTONE_NUOVO,
      })
    )
  })

  it('typo in conflitto (409): niente PATCH, e la seconda pressione riparte col gettone NUOVO', async () => {
    const fetchMock = montaFetch({
      typo: { ok: false, status: 409, body: { errore: 'x', esito: 'conflitto', updated_at: GETTONE_NUOVO } },
    })
    const { onErrore, onSalvato } = apriGesto()
    fireEvent.click(screen.getByRole('button', { name: /Sul foglio c'è scritto A3\.5/ }))

    await waitFor(() => expect(onErrore).toHaveBeenCalled())
    expect(patch(fetchMock).length).toBe(0)
    expect(onSalvato).not.toHaveBeenCalled()

    // Seconda pressione: il gettone è quello che il 409 ha restituito.
    fireEvent.click(screen.getByRole('button', { name: /Sul foglio c'è scritto A3\.5/ }))
    await waitFor(() => expect(chiamate(fetchMock, '/prescrizione/typo').length).toBe(2))
    expect(corpoDi(chiamate(fetchMock, '/prescrizione/typo')[1]).atteso_updated_at).toBe(GETTONE_NUOVO)
  })

  it('typo riuscito ma colore vivo fuori catalogo: la trascrizione resta salvata e lo si DICE', async () => {
    const fetchMock = montaFetch({})
    const { onSalvato, onErrore } = monta()
    scrivi('A3,5') // la virgola del mockup: NON è un codice del catalogo
    fireEvent.click(screen.getByRole('button', { name: /^salva$/i }))
    fireEvent.click(screen.getByRole('button', { name: /Sul foglio c'è scritto A3,5/ }))

    await waitFor(() => expect(chiamate(fetchMock, '/prescrizione/typo').length).toBe(1))
    // La trascrizione parte COM'È DIGITATA (D210)…
    expect(corpoDi(chiamate(fetchMock, '/prescrizione/typo')[0]).valore).toBe('A3,5')
    // …ma la PATCH no: azzererebbe il colore in silenzio.
    expect(patch(fetchMock).length).toBe(0)
    await waitFor(() => expect(onSalvato).toHaveBeenCalledWith({ trascritto: 'A3,5', updatedAt: GETTONE_NUOVO }))
    expect(onErrore).toHaveBeenCalledWith(expect.stringContaining('non è un codice del catalogo'))
  })
})

describe('Il gesto D212 — il ramo della divergenza', () => {
  function apriMotivo() {
    const r = monta()
    scrivi('A3.5')
    fireEvent.click(screen.getByRole('button', { name: /^salva$/i }))
    fireEvent.click(screen.getByRole('button', { name: /No: lo stiamo cambiando noi/ }))
    return r
  }

  it('la seconda via porta al foglio del motivo, coi testi del mockup B', () => {
    montaFetch({})
    apriMotivo()
    expect(screen.getByText('Perché cambia?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Me l'ha chiesto il dentista" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Esigenza tecnica' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Materiale non disponibile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Altro' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nota \(se serve\)/, { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Torna indietro' })).toBeInTheDocument()
  })

  it('nessun motivo è preselezionato e «Registra il cambio» resta spento finché non se ne sceglie uno', () => {
    montaFetch({})
    apriMotivo()
    for (const nome of ["Me l'ha chiesto il dentista", 'Esigenza tecnica', 'Materiale non disponibile', 'Altro']) {
      expect(screen.getByRole('button', { name: nome })).toHaveAttribute('aria-pressed', 'false')
    }
    expect(screen.getByRole('button', { name: 'Registra il cambio' })).toBeDisabled()
  })

  it('«Torna indietro» riporta alla domanda a due vie senza scrivere niente', () => {
    const fetchMock = montaFetch({})
    apriMotivo()
    fireEvent.click(screen.getByRole('button', { name: 'Torna indietro' }))
    expect(screen.getByText('Era scritto così sulla prescrizione?')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('registra la divergenza (campo, motivo, nota) e POI aggiorna il colore vivo — in quest’ordine', async () => {
    const fetchMock = montaFetch({})
    const { onSalvato } = apriMotivo()
    fireEvent.click(screen.getByRole('button', { name: 'Esigenza tecnica' }))
    fireEvent.change(screen.getByLabelText(/Nota \(se serve\)/, { selector: 'input' }), {
      target: { value: 'spessore insufficiente' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registra il cambio' }))

    await waitFor(() => expect(chiamate(fetchMock, '/prescrizione/divergenza').length).toBe(1))
    expect(corpoDi(chiamate(fetchMock, '/prescrizione/divergenza')[0])).toEqual({
      campo: 'colore',
      motivo: 'esigenza_tecnica',
      nota: 'spessore insufficiente',
    })
    await waitFor(() => expect(patch(fetchMock).length).toBe(1))
    // Il registro PRIMA del colore vivo: al contrario, un colore cambiato
    // senza traccia del perché è il verso peggiore del fallimento.
    expect(String(fetchMock.mock.calls[0][0])).toContain('/prescrizione/divergenza')
    await waitFor(() =>
      expect(onSalvato).toHaveBeenCalledWith({
        divergenza: true,
        colore: { scala: 'vita_classical', codice: 'A3.5' },
        updatedAt: GETTONE_NUOVO,
      })
    )
  })

  it('senza nota il corpo non porta la chiave: vuoto e assente non si confondono', async () => {
    const fetchMock = montaFetch({})
    apriMotivo()
    fireEvent.click(screen.getByRole('button', { name: 'Altro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registra il cambio' }))
    await waitFor(() => expect(chiamate(fetchMock, '/prescrizione/divergenza').length).toBe(1))
    expect(corpoDi(chiamate(fetchMock, '/prescrizione/divergenza')[0])).toEqual({
      campo: 'colore',
      motivo: 'altro',
    })
  })

  it('la divergenza NON manda mai il gettone: quella rotta lo rifiuta come chiave ignota', async () => {
    const fetchMock = montaFetch({})
    apriMotivo()
    fireEvent.click(screen.getByRole('button', { name: 'Altro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registra il cambio' }))
    await waitFor(() => expect(chiamate(fetchMock, '/prescrizione/divergenza').length).toBe(1))
    expect(corpoDi(chiamate(fetchMock, '/prescrizione/divergenza')[0])).not.toHaveProperty('atteso_updated_at')
  })

  it('divergenza registrata ma colore vivo non scritto: si applica ciò che è AVVENUTO e si dice il resto', async () => {
    const fetchMock = montaFetch({ patch: { ok: false, status: 500 } })
    const { onSalvato, onErrore } = apriMotivo()
    fireEvent.click(screen.getByRole('button', { name: 'Altro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registra il cambio' }))
    await waitFor(() => expect(onSalvato).toHaveBeenCalledWith({ divergenza: true }))
    expect(onErrore).toHaveBeenCalledWith(expect.stringContaining('Il cambio è registrato'))
    expect(patch(fetchMock).length).toBe(1)
  })

  it('la divergenza fallita non tocca il colore vivo e riporta il messaggio della rotta (chiave `errore`)', async () => {
    const fetchMock = montaFetch({
      divergenza: { ok: false, status: 409, body: { errore: 'La trascrizione è congelata', esito: 'congelata' } },
    })
    const { onErrore, onSalvato } = apriMotivo()
    fireEvent.click(screen.getByRole('button', { name: 'Altro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registra il cambio' }))
    await waitFor(() => expect(onErrore).toHaveBeenCalledWith('La trascrizione è congelata'))
    expect(patch(fetchMock).length).toBe(0)
    expect(onSalvato).not.toHaveBeenCalled()
  })
})
