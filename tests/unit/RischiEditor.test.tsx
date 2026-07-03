import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RischiEditor } from '../../src/components/features/qualita/RischiEditor'

const RISCHIO_BASE = {
  id: 'RF01',
  rischio: 'Frattura del dispositivo in uso',
  causa: 'Spessore insufficiente',
  probabilita: 2,
  gravita: 2,
  rpn: 4,
  misura: 'Controllo spessore minimo secondo normativa',
}

function renderEditor(rischi = [RISCHIO_BASE]) {
  render(
    <RischiEditor
      rischioId="rischio-1"
      tipoDispositivoLabel="Protesi Fissa"
      versioneIniziale={1}
      dataRevisioneIniziale="2026-05-19"
      rischiIniziali={rischi}
      rischiResiduiIniziali="I rischi residui sono accettabili"
      misureControlloIniziali="Controllo qualità visivo"
    />
  )
}

describe('RischiEditor', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('mostra i dati iniziali del rischio, incluso RPN calcolato', () => {
    renderEditor()

    expect(screen.getByLabelText('Rischio 1 — Descrizione rischio')).toHaveValue('Frattura del dispositivo in uso')
    expect(screen.getByLabelText('Rischio 1 — Causa')).toHaveValue('Spessore insufficiente')
    expect(screen.getByText('RPN 4')).toBeInTheDocument()
  })

  it('cambiare probabilita o gravita aggiorna RPN mostrato live', () => {
    renderEditor()

    fireEvent.change(screen.getByLabelText('Rischio 1 — Probabilità'), { target: { value: '3' } })

    expect(screen.getByText('RPN 6')).toBeInTheDocument()
  })

  it('bottone "+ Aggiungi rischio" aggiunge una nuova riga vuota', () => {
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: '+ Aggiungi rischio' }))

    expect(screen.getByLabelText('Rischio 2 — Descrizione rischio')).toHaveValue('')
  })

  it('rimuovere rischio rimasto blocca submit con messaggio', async () => {
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi rischio 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('almeno un rischio')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit con campo rischio vuoto mostra errore e non chiama PATCH', async () => {
    renderEditor()

    fireEvent.change(screen.getByLabelText('Rischio 1 — Descrizione rischio'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('rischio')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit valido chiama PATCH e ricarica pagina', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rischio: { id: 'rischio-1', tipo_dispositivo: 'protesi_fissa', versione: 2, data_ultima_revisione: '2026-07-03' } }),
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    renderEditor()
    fireEvent.change(screen.getByLabelText('Rischi residui (sintesi)'), { target: { value: 'Aggiornato: rischi accettabili' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/qualita/rischi/rischio-1')
    expect(options.method).toBe('PATCH')
    const body = JSON.parse(options.body as string)
    expect(body.rischi_json).toHaveLength(1)
    expect(body.rischi_json[0].rischio).toBe('Frattura del dispositivo in uso')
    expect(body.rischi_residui).toBe('Aggiornato: rischi accettabili')
    expect(body.misure_controllo).toBe('Controllo qualità visivo')
  })

  it('errore server mostra messaggio e mantiene dati', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Rischio #1: campo "rischio" obbligatorio' }),
    })

    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('obbligatorio')
    expect(screen.getByLabelText('Rischio 1 — Descrizione rischio')).toHaveValue('Frattura del dispositivo in uso')
  })
})
