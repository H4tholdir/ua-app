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
  it('CONSEGNA abilitato su lavoro pronto → naviga a /consegna', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'pronto' })} />)
    const btn = screen.getByRole('button', { name: /consegna/i })
    expect(btn).not.toBeDisabled()
  })
  it('CONSEGNA disabilitato su lavoro in_lavorazione con callout', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'in_lavorazione' })} />)
    expect(screen.getByRole('button', { name: /consegna/i })).toBeDisabled()
    expect(screen.getByText(/completa il controllo finale/i)).toBeInTheDocument()
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
})
