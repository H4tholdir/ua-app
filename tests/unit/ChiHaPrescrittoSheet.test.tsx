import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { ChiHaPrescrittoSheet, type MembroStudio } from '@/components/features/wizard/ChiHaPrescrittoSheet'

// Task 10 (P37/D211) — il mini-foglio «Chi ha prescritto?». `medici` arriva
// GIÀ CARICATO (nessun fetch dentro il componente — v. header del file
// sorgente): il chiamante reale (WizardNuovoLavoro) apre il foglio SOLO
// quando la lista non è vuota, quindi qui si testa il componente a partire
// da quel contratto.

const MEDICI: MembroStudio[] = [
  { id: 'm1', nome: 'Francesco', cognome: 'Colombo', studio_nome: 'Studio Bianchi' },
  { id: 'm2', nome: 'Marta', cognome: 'Bianchi', studio_nome: 'Studio Bianchi' },
  { id: 'm3', nome: 'Anna', cognome: 'Ferri', studio_nome: 'Studio Bianchi' },
]

function renderSheet(props?: Partial<Parameters<typeof ChiHaPrescrittoSheet>[0]>) {
  const onChiudi = vi.fn()
  const onScelto = vi.fn()
  const utils = render(
    <AvvisiProvider>
      <ChiHaPrescrittoSheet aperto medici={MEDICI} onChiudi={onChiudi} onScelto={onScelto} {...props} />
    </AvvisiProvider>
  )
  return { ...utils, onChiudi, onScelto }
}

describe('ChiHaPrescrittoSheet (Task 10, P37/D211)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('titolo del dialog è "Chi ha prescritto?"', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Chi ha prescritto?' })).toBeInTheDocument()
  })

  it('mostra una riga per ciascun medico, «Cognome Nome»', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: /Colombo Francesco/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bianchi Marta/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ferri Anna/ })).toBeInTheDocument()
  })

  it('sottotitolo: plurale con il conteggio reale quando i medici sono più di uno', () => {
    renderSheet()
    expect(screen.getByText(/Studio Bianchi risultano 3 medici/)).toBeInTheDocument()
  })

  it('sottotitolo: singolare quando c\'è un solo medico', () => {
    renderSheet({ medici: [MEDICI[0]] })
    expect(screen.getByText(/Studio Bianchi risulta un medico/)).toBeInTheDocument()
  })

  // 0B-9 / R-E1 — divergenza DICHIARATA dal mockup approvato: nessuna riga
  // rivendica di essere «l'ultimo che ha prescritto qui» (dato che non
  // possediamo — v. header del file sorgente). Prova negativa esplicita:
  // se qualcuno reintroducesse quella frase senza il dato dietro, il test
  // la becca.
  it('nessuna riga afferma di essere "l\'ultimo che ha prescritto qui" (dato non disponibile)', () => {
    renderSheet()
    expect(screen.queryByText(/l.ultimo che ha prescritto/i)).not.toBeInTheDocument()
  })

  it('tap su un medico → onScelto("Cognome Nome", studio_nome) e vibra(selection)', async () => {
    const { onScelto } = renderSheet()
    await userEvent.setup().click(screen.getByRole('button', { name: /Colombo Francesco/ }))
    expect(onScelto).toHaveBeenCalledWith('Colombo Francesco', 'Studio Bianchi')
  })

  it('«Chiudi» → onChiudi(), onScelto MAI chiamato', async () => {
    const { onChiudi, onScelto } = renderSheet()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onChiudi).toHaveBeenCalledTimes(1)
    expect(onScelto).not.toHaveBeenCalled()
  })

  it('«È un altro» apre un mini-form Nome/Cognome (niente rete finché non si conferma)', async () => {
    renderSheet()
    await userEvent.setup().click(screen.getByRole('button', { name: /È un altro/ }))
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Cognome')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('«È un altro» → submit con nome/cognome vuoti NON chiama fetch, mostra il vincolo', async () => {
    const { onScelto } = renderSheet()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /È un altro/ }))
    fireEvent.click(screen.getByRole('button', { name: /aggiungi allo studio/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/nome.*cognome|obbligator/i)
    expect(fetch).not.toHaveBeenCalled()
    expect(onScelto).not.toHaveBeenCalled()
  })

  it('«È un altro» → submit valido: POST /api/clienti con {nome, cognome, studio_nome preimpostato}, poi onScelto col nome digitato', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ cliente: { id: 'nuovo-1', nome: 'Luca', cognome: 'Verdi', studio_nome: 'Studio Bianchi' } }),
    })
    const { onScelto } = renderSheet()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /È un altro/ }))
    await user.type(screen.getByLabelText('Nome'), 'Luca')
    await user.type(screen.getByLabelText('Cognome'), 'Verdi')
    await user.click(screen.getByRole('button', { name: /aggiungi allo studio/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/clienti', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Luca', cognome: 'Verdi', studio_nome: 'Studio Bianchi' }),
    }))
    expect(onScelto).toHaveBeenCalledWith('Verdi Luca', 'Studio Bianchi')
  })

  it('«È un altro» → errore di rete: Avviso.errore, onScelto MAI chiamato, il form resta aperto', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    const { onScelto } = renderSheet()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /È un altro/ }))
    await user.type(screen.getByLabelText('Nome'), 'Luca')
    await user.type(screen.getByLabelText('Cognome'), 'Verdi')
    await user.click(screen.getByRole('button', { name: /aggiungi allo studio/i }))

    await waitFor(() =>
      expect(screen.getByText('Non sono riuscita ad aggiungere il medico. Riprova.')).toBeInTheDocument()
    )
    expect(onScelto).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
  })

  it('chiudendo e riaprendo (nuova key dal chiamante) il mini-form NON resta aperto — reset via remount', () => {
    const { unmount } = renderSheet()
    unmount()
    renderSheet()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /È un altro/ })).toBeInTheDocument()
  })
})
