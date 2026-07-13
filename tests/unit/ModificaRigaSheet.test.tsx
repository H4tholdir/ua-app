// tests/unit/ModificaRigaSheet.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModificaRigaSheet } from '../../src/components/features/lavori/scheda-v3/ModificaRigaSheet'

// Ramo «dentista»: `ClienteComboBox` fa una query Supabase propria — pesante
// e fuori scope per uno unit test di ModificaRigaSheet (che deve verificare
// SOLO il PATCH al `onChange`, non il comportamento interno della combobox,
// già coperto dai suoi test dedicati). Stub minimo: un bottone che invoca
// `onChange('c1', 'Studio X')`, la stessa firma del vero componente.
vi.mock('../../src/components/features/clienti/ClienteComboBox', () => ({
  ClienteComboBox: ({ onChange }: { onChange: (id: string, label: string) => void }) => (
    <button onClick={() => onChange('c1', 'Studio X')}>scegli cliente</button>
  ),
}))

describe('ModificaRigaSheet — note', () => {
  it('salva note_interne via PATCH e chiama onSalvato', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const onSalvato = vi.fn()
    render(
      <ModificaRigaSheet
        aperto campo="note" lavoroId="lav" valoreIniziale="vecchia"
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={() => {}}
      />,
    )
    // selector: 'input' — il dialog stesso porta `aria-labelledby` verso il
    // titolo dello Sheet ("Note interne", §5.16), quindi /note/i da solo
    // matcherebbe sia il `<div role="dialog">` sia il campo: disambiguato
    // restringendo al vero elemento di form reso da `CampoTesto`.
    const input = screen.getByLabelText(/note/i, { selector: 'input' })
    fireEvent.change(input, { target: { value: 'nuova nota' } })
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/lavori/lav',
      expect.objectContaining({ method: 'PATCH' }),
    ))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ note_interne: 'nuova nota' })
    await waitFor(() => expect(onSalvato).toHaveBeenCalledWith({ note_interne: 'nuova nota' }))
  })

  it('su errore chiama onErrore, non onSalvato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))
    const onSalvato = vi.fn(); const onErrore = vi.fn()
    render(
      <ModificaRigaSheet aperto campo="note" lavoroId="lav" valoreIniziale=""
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={onErrore} />,
    )
    fireEvent.change(screen.getByLabelText(/note/i, { selector: 'input' }), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(onErrore).toHaveBeenCalled())
    expect(onSalvato).not.toHaveBeenCalled()
  })
})

describe('ModificaRigaSheet — consegna', () => {
  it('salva data_consegna_prevista e ora_consegna via PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const onSalvato = vi.fn()
    render(
      <ModificaRigaSheet
        aperto campo="consegna" lavoroId="lav"
        valoreIniziale={{ data_consegna_prevista: '2026-07-20', ora_consegna: '14:30' }}
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/lavori/lav',
      expect.objectContaining({ method: 'PATCH' }),
    ))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ data_consegna_prevista: '2026-07-20', ora_consegna: '14:30' })
    await waitFor(() => expect(onSalvato).toHaveBeenCalledWith({
      data_consegna_prevista: '2026-07-20', ora_consegna: '14:30',
    }))
  })
})

describe('ModificaRigaSheet — tecnico', () => {
  it('carica i tecnici via GET /api/tecnici e salva tecnico_id via PATCH al click sul TileScelta', async () => {
    // Un solo fetchMock che smista GET /api/tecnici (lista, on-open effect) e
    // PATCH /api/lavori/lav (salva) — stesso mock condiviso da `salva()` e
    // dall'effect, distinti per URL/metodo (nessuna libreria di mocking route-aware).
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === '/api/tecnici') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ tecnici: [{ id: 't1', nome: 'Ciro', cognome: 'B' }] }),
        })
      }
      if (url === '/api/lavori/lav' && options?.method === 'PATCH') {
        return Promise.resolve({ ok: true })
      }
      return Promise.reject(new Error(`fetch inatteso in test: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    const onSalvato = vi.fn()
    render(
      <ModificaRigaSheet
        aperto campo="tecnico" lavoroId="lav" valoreIniziale={null}
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={() => {}}
      />,
    )
    // Attende il round-trip GET /api/tecnici → render del TileScelta "Ciro B".
    const tile = await screen.findByRole('button', { name: /ciro b/i })
    fireEvent.click(tile)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/lavori/lav',
      expect.objectContaining({ method: 'PATCH' }),
    ))
    const patchCall = fetchMock.mock.calls.find(
      ([url, opts]) => url === '/api/lavori/lav' && (opts as RequestInit | undefined)?.method === 'PATCH',
    )
    const body = JSON.parse((patchCall![1] as RequestInit).body as string)
    expect(body).toEqual({ tecnico_id: 't1' })
    await waitFor(() => expect(onSalvato).toHaveBeenCalledWith({ tecnico_id: 't1' }))
  })
})

describe('ModificaRigaSheet — dentista', () => {
  it('salva cliente_id via PATCH quando ClienteComboBox chiama onChange', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const onSalvato = vi.fn()
    render(
      <ModificaRigaSheet
        aperto campo="dentista" lavoroId="lav" valoreIniziale={null}
        onChiudi={() => {}} onSalvato={onSalvato} onErrore={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /scegli cliente/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/lavori/lav',
      expect.objectContaining({ method: 'PATCH' }),
    ))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({ cliente_id: 'c1' })
    await waitFor(() => expect(onSalvato).toHaveBeenCalledWith({ cliente_id: 'c1' }))
  })
})
