import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
import { SchedaLavoroV3 } from '../../src/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio } from '../../src/types/domain'

function makeLavoro(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav', numero_lavoro: '2026-0147', stato: 'pronto',
    data_consegna_prevista: '2026-07-20', ora_consegna: '16:00',
    descrizione: 'Corona zirconia', paziente_nome_snapshot: null,
    cliente: { studio_nome: 'Studio Esposito', nome: 'Marco', cognome: 'Esposito' },
    paziente: null, tecnico: { nome: 'Ciro', cognome: 'B', sigla: 'CB' },
    fasi: [], immagini: [], lavorazioni: [], appuntamenti: [], materiali: [], ddc: null,
    laboratorio: { nome: 'Lab', telefono: null },
    ...over,
  } as unknown as LavoroDettaglio
}

describe('SchedaLavoroV3', () => {
  // NB (polish L1): il nome del TastoPrimario è ESATTAMENTE 'Consegna'; la riga
  // editabile della consegna ha nome 'Modifica consegna' (WCAG label-in-name).
  // Le query usano il nome esatto per non far collidere i due controlli.
  it('CONSEGNA abilitato su lavoro pronto → naviga a /consegna', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'pronto' })} />)
    const btn = screen.getByRole('button', { name: 'Consegna' })
    expect(btn).not.toBeDisabled()
  })
  it('CONSEGNA disabilitato su lavoro in_lavorazione con callout', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'in_lavorazione' })} />)
    expect(screen.getByRole('button', { name: 'Consegna' })).toBeDisabled()
    expect(screen.getByText(/completa il controllo finale/i)).toBeInTheDocument()
  })
  it('la riga Consegna ha nome accessibile "Modifica consegna" (WCAG 2.5.3 label-in-name)', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(screen.getByRole('button', { name: 'Modifica consegna' })).toBeInTheDocument()
  })
  it('CONSEGNA disabilitato su lavoro CONSEGNATO mostra "già consegnato", non "completa il controllo" (D6)', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'consegnato', data_consegna_effettiva: '2026-07-06T10:00:00Z' })} />)
    expect(screen.getByRole('button', { name: 'Consegna' })).toBeDisabled()
    expect(screen.getByText(/già consegnato il 6 lug/i)).toBeInTheDocument()
    expect(screen.queryByText(/completa il controllo finale/i)).not.toBeInTheDocument()
  })
  it('mostra numero e dati principali', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(screen.getByText(/2026-0147/)).toBeInTheDocument()
    expect(screen.getByText('Corona zirconia')).toBeInTheDocument()
  })
  it('note_interne è mostrata come nota del laboratorio, mai attribuita al dentista', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ note_interne: 'Attenzione: colore A2, non A3' })} />)
    // Il testo della nota è presente...
    expect(screen.getByText('Attenzione: colore A2, non A3')).toBeInTheDocument()
    // ...ma NON è attribuito al dentista/studio (niente citazione stile
    // NotaDentista '"..." — Studio Esposito'): il nome dello studio non
    // compare accanto al testo della nota.
    expect(screen.queryByText(/Attenzione: colore A2, non A3[\s\S]*Studio Esposito/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^".*"\s*—\s*Studio Esposito$/)).not.toBeInTheDocument()
    // Tap → apre l'editor della nota (ModificaRigaSheet campo="note", che
    // mostra il titolo "Note interne").
    const bottone = screen.getByRole('button', { name: /modifica nota del laboratorio/i })
    fireEvent.click(bottone)
    expect(screen.getByRole('heading', { name: 'Note interne' })).toBeInTheDocument()
  })
  it('mostra il callout tracciabilità materiali (MDR) quando incompleta', () => {
    render(
      <SchedaLavoroV3
        lavoro={makeLavoro({
          tracciabilita_materiali_ok: false,
          materiali_incompleti_dettaglio: [
            { magazzino_id: 'mag-1', nome_materiale: 'Zirconia HT', motivo: 'lotto_assente' },
          ],
        })}
      />
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/tracciabilità materiali incompleta/i)).toBeInTheDocument()
    expect(screen.getByText(/Zirconia HT/)).toBeInTheDocument()
    expect(screen.getByText(/nessun lotto disponibile in magazzino/i)).toBeInTheDocument()
  })
  it('non mostra il callout tracciabilità quando i materiali sono ok', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ tracciabilita_materiali_ok: true, materiali_incompleti_dettaglio: null })} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/tracciabilità materiali incompleta/i)).not.toBeInTheDocument()
  })
  it('dopo router.refresh() il nuovo tecnico dal prop fresco sostituisce quello locale (bug FK-refresh)', () => {
    const lavoroA = makeLavoro({ tecnico: { nome: 'Ciro', cognome: 'B', sigla: 'CB' } as unknown as LavoroDettaglio['tecnico'] })
    const { rerender } = render(<SchedaLavoroV3 lavoro={lavoroA} />)
    expect(screen.getByText('Ciro B')).toBeInTheDocument()
    // Simula ciò che accade dopo `router.refresh()`: il Server Component
    // rilegge il JOIN e passa un `lavoro` fresco con un tecnico diverso.
    const lavoroB = makeLavoro({ tecnico: { nome: 'Anna', cognome: 'V', sigla: 'AV' } as unknown as LavoroDettaglio['tecnico'] })
    rerender(<SchedaLavoroV3 lavoro={lavoroB} />)
    expect(screen.getByText('Anna V')).toBeInTheDocument()
    expect(screen.queryByText('Ciro B')).not.toBeInTheDocument()
  })
})
