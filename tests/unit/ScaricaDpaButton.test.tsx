import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScaricaDpaButton } from '../../src/components/features/clienti/ScaricaDpaButton'

function rispostaOk(nomeFile = 'DPA-2026-0007.pdf') {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-disposition': `attachment; filename="${nomeFile}"` }),
    blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
  } as unknown as Response
}
function rispostaErrore(status: number, corpo: unknown) {
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => corpo,
  } as unknown as Response
}

describe('ScaricaDpaButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    // jsdom non implementa createObjectURL
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:finto'),
      revokeObjectURL: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  // ── prevenzione ───────────────────────────────────────────────────────────
  it('con i dati completi il tasto è premibile', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    expect(screen.getByRole('button', { name: /Scarica DPA PDF/i })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('se mancano i dati del CLIENTE il tasto è inerte e dice dove rimediare', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza="cliente" />)
    expect(screen.getByRole('button', { name: /Scarica DPA PDF/i })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/studio/i)
  })

  // 🛑 D165 — il caso del CLIENTE non ha nessun tasto, e il testo manda al
  //    «Modifica» che è già in cima alla scheda. Il disegno approvato ne
  //    prevedeva uno («Aggiungi il dato») che in produzione sarebbe stato MORTO:
  //    il pannello di modifica del dentista non ha indirizzo (P30). Questa prova
  //    esiste perché il tasto non torni per distrazione, disegno alla mano.
  it('D165 — se mancano i dati del CLIENTE NON c\'è nessun tasto, e il testo manda al «Modifica»', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza="cliente" />)
    const avviso = screen.getByRole('alert')
    expect(avviso).toHaveTextContent(/Modifica/)
    // Nessun elemento premibile DENTRO l'avviso: né link né tasto d'azione.
    expect(avviso.querySelector('a')).toBeNull()
    expect(avviso.querySelector('button')).toBeNull()
  })

  it('se mancano i dati del LABORATORIO l\'azione porta alle impostazioni', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza="laboratorio" />)
    expect(screen.getByRole('link', { name: /Completa i dati/i })).toHaveAttribute('href', '/impostazioni')
  })

  // 🛑 `disabled` toglierebbe il tasto dalla navigazione da tastiera: vietato.
  it('il tasto inerte NON usa l\'attributo disabled', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza="cliente" />)
    expect(screen.getByRole('button', { name: /Scarica DPA PDF/i })).not.toBeDisabled()
  })

  it('premere un tasto inerte non chiama la rotta', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza="cliente" />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(fetch).not.toHaveBeenCalled()
  })

  // ── il nome del file ──────────────────────────────────────────────────────
  it('IL NOME DEL FILE viene dal Content-Disposition, non inventato', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaOk('DPA-2026-0042.pdf'))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    const ancora = click.mock.instances[0] as HTMLAnchorElement
    expect(ancora.download).toBe('DPA-2026-0042.pdf')
    click.mockRestore()
  })

  it('se il Content-Disposition manca usa un nome di ripiego, non uno inventato dal browser', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true, status: 200, headers: new Headers({}),
      blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    } as unknown as Response)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('contratto-dpa.pdf')
    click.mockRestore()
  })

  // ── gli esiti ─────────────────────────────────────────────────────────────
  it('sul 500 mostra il guasto CON un riprova', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(500, { error: 'DPA: archivio non raggiungibile' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/non è stato possibile/i)
    expect(screen.getByRole('button', { name: /Riprova/i })).toBeInTheDocument()
  })

  // 🛑 Un «Riprova» che non può funzionare insegna a ignorare i tasti.
  it('sul 401 NON offre un riprova', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(401, { error: 'Non autorizzato' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/sessione/i)
    expect(screen.queryByRole('button', { name: /Riprova/i })).toBeNull()
  })

  it('sul 403 NON offre un riprova', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(403, { error: 'Non autorizzato — solo titolari' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Riprova/i })).toBeNull()
  })

  // 🔑 I due 422 si distinguono dal CODICE, mai dal testo italiano.
  it('il 422 del laboratorio manda alle impostazioni', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(422, { error: 'x', codice: 'LAB_DATI_FISCALI' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('link', { name: /Completa i dati/i })).toHaveAttribute('href', '/impostazioni')
  })

  it('il 422 del cliente NON manda alle impostazioni', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(422, { error: 'x', codice: 'CLIENTE_DATI_FISCALI' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/studio/i)
    expect(screen.queryByRole('link', { name: /Completa i dati/i })).toBeNull()
  })

  // A4: il corpo può NON essere JSON (pagina d'errore della piattaforma, 502 del bordo).
  it('se il corpo non è JSON non si rompe', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false, status: 502, headers: new Headers({ 'content-type': 'text/html' }),
      json: async () => { throw new SyntaxError('Unexpected token <') },
    } as unknown as Response)
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/non è stato possibile/i)
  })

  it('se la rete cade non si rompe', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/connessione|non è stato possibile/i)
  })

  it('mentre prepara il tasto è inerte e lo dice', async () => {
    let sblocca: (r: Response) => void = () => {}
    vi.mocked(fetch).mockReturnValue(new Promise<Response>((res) => { sblocca = res }))
    // 🔄 CORRETTO il 02/08/2026 dall'esecutore del Task 3 — il piano non aveva
    //    né questa spia né l'attesa in fondo, e la prova SI CHIUDEVA con lo
    //    scarico ancora in volo. Che cosa succedeva davvero: `sblocca(...)`
    //    riprende la funzione DOPO che il test è finito, quindi dopo che
    //    `afterEach` ha già tolto i finti globali — la ripresa cercava
    //    `URL.createObjectURL` disarmato e premeva un'ancora vera su
    //    `blob:finto`, DENTRO un altro test. Un guasto così non si presenta
    //    dove nasce: si presenta a caso, nel test che sta passando in quel
    //    momento. È la forma esatta del flake già pagato in questo progetto
    //    (diagnosi citata in `tests/setup.ts`).
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByText(/Preparo il documento/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Preparo il documento/i })).toHaveAttribute('aria-disabled', 'true')
    sblocca(rispostaOk())
    // 🛑 Si ASPETTA che il giro si chiuda mentre i finti sono ancora al loro
    //    posto: il tasto torna a dire «Scarica DPA PDF» solo nel `finally`.
    await waitFor(() => expect(screen.getByRole('button', { name: /Scarica DPA PDF/i })).toBeInTheDocument())
    click.mockRestore()
  })

  it('due pressioni rapide chiamano la rotta UNA volta sola', async () => {
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(() => {}))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    const tasto = screen.getByRole('button', { name: /Scarica DPA PDF/i })
    fireEvent.click(tasto)
    fireEvent.click(tasto)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  })
})
