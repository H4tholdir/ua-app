import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/lavori/lav',
}))

import { SchedaLavoroV3 } from '@/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio } from '@/types/domain'

// Factory inline — `./helpers/lavoro-factory` non esiste in questo repo.
// Stesso shape minimo di `makeLavoro` in tests/unit/SchedaLavoroV3.test.tsx.
function lavoroBase(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
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

describe('SchedaLavoroV3 — nota del dentista', () => {
  it('mostra NotaDentista quando note_dentista è presente, attribuita al dentista', () => {
    const lavoro = lavoroBase({
      note_dentista: 'colore A2, impronta in busta',
      cliente: { nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' } as unknown as LavoroDettaglio['cliente'],
    })
    render(<SchedaLavoroV3 lavoro={lavoro} ruolo="titolare" />)
    // La citazione NotaDentista è un unico nodo di testo "<citazione>" — <dottore>
    // (§5.23 NotaDentista): la riga "Dentista" della CardInfo mostra "Studio
    // Rossi" da sola, quindi la regex combinata isola il nodo della citazione.
    expect(screen.getByText(/colore A2.*Studio Rossi/)).toBeInTheDocument()
  })

  it('NON mostra NotaDentista quando note_dentista è null', () => {
    const lavoro = lavoroBase({ note_dentista: null })
    render(<SchedaLavoroV3 lavoro={lavoro} ruolo="titolare" />)
    expect(screen.queryByText(/colore A2/)).not.toBeInTheDocument()
  })
})
