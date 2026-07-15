// tests/unit/PecSetupWidget.sdi.test.tsx
// Campo «Indirizzo PEC SdI (opzionale)» (D-6):
// - pre-popolato dal valore corrente (GET /api/impostazioni) al mount;
// - PATCH SOLO se il valore è cambiato rispetto alla baseline (dirty-check):
//   revisita + blur senza modifiche NON deve cancellare l'indirizzo salvato;
// - errore di salvataggio non silenzioso (feedback visibile).
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PecSetupWidget } from '../../src/components/features/pec/PecSetupWidget'

const PLACEHOLDER = 'sdi01@pec.fatturapa.it'

function fetchMock() {
  return fetch as unknown as ReturnType<typeof vi.fn>
}

function patchCalls() {
  return fetchMock().mock.calls.filter(
    ([url, init]) => url === '/api/impostazioni/pec' && (init as RequestInit | undefined)?.method === 'PATCH'
  )
}

function stubFetch({ saved, patchOk = true }: { saved: string | null; patchOk?: boolean }) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/impostazioni' && (!init?.method || init.method === 'GET')) {
      return {
        ok: true,
        json: async () => ({ laboratorio: { pec_sdi_address: saved } }),
      }
    }
    if (url === '/api/impostazioni/pec' && init?.method === 'PATCH') {
      return {
        ok: patchOk,
        json: async () => (patchOk ? { success: true } : { error: 'pec_sdi_address non valido' }),
      }
    }
    return { ok: true, json: async () => ({}) }
  }))
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('PecSetupWidget — campo Indirizzo PEC SdI (D-6)', () => {
  it('pre-popola il campo con il valore già salvato', async () => {
    stubFetch({ saved: 'sdi43@pec.fatturapa.it' })
    render(<PecSetupWidget />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue('sdi43@pec.fatturapa.it')
    })
  })

  it('revisita con valore esistente + blur senza modifiche → NESSUNA PATCH (non cancella il salvato)', async () => {
    stubFetch({ saved: 'sdi43@pec.fatturapa.it' })
    render(<PecSetupWidget />)
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    await waitFor(() => expect(input).toHaveValue('sdi43@pec.fatturapa.it'))
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(patchCalls()).toHaveLength(0)
  })

  it('valore assente + blur senza digitare nulla → NESSUNA PATCH', async () => {
    stubFetch({ saved: null })
    render(<PecSetupWidget />)
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    await waitFor(() => expect(input).toHaveValue(''))
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(patchCalls()).toHaveLength(0)
  })

  it('modifica reale + blur → PATCH col nuovo valore, e un secondo blur identico non ri-invia', async () => {
    stubFetch({ saved: null })
    render(<PecSetupWidget />)
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    await waitFor(() => expect(input).toHaveValue(''))
    fireEvent.change(input, { target: { value: 'sdi77@pec.fatturapa.it' } })
    fireEvent.blur(input)
    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    const [, init] = patchCalls()[0]
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ pec_sdi_address: 'sdi77@pec.fatturapa.it' })
    // baseline aggiornata al successo → blur ripetuto senza modifiche = nessuna nuova PATCH
    fireEvent.blur(input)
    expect(patchCalls()).toHaveLength(1)
  })

  it('PATCH in errore → feedback visibile (non silenzioso)', async () => {
    stubFetch({ saved: null, patchOk: false })
    render(<PecSetupWidget />)
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    await waitFor(() => expect(input).toHaveValue(''))
    fireEvent.change(input, { target: { value: 'sdi99@pec.fatturapa.it' } })
    fireEvent.blur(input)
    await waitFor(() => {
      expect(screen.getByText(/pec_sdi_address non valido/i)).toBeInTheDocument()
    })
  })
})
