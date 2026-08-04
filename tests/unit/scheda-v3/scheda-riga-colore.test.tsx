// tests/unit/scheda-v3/scheda-riga-colore.test.tsx
//
// T7 (ondata B ③) — la riga «Colore» DENTRO la scheda (D225②): che compaia (o
// non compaia) al momento giusto, che porti la pastiglia di provenienza solo
// dove la provenienza esiste, e che apra il foglio solo dove il tocco può
// atterrare. Gli stati sono provati uno per uno in
// `tests/unit/colore-riga-scheda.test.ts`: qui si prova il CABLAGGIO.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/lavori/lav',
}))

import { SchedaLavoroV3 } from '../../../src/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio, LavoroPrescrizione } from '../../../src/types/domain'

function presc(over: Partial<LavoroPrescrizione> = {}): LavoroPrescrizione {
  return {
    id: 'p1', laboratorio_id: 'lab', lavoro_id: 'lav',
    contenuto: {}, divergenze: [],
    fonte_tipo: null, fonte_immagine_id: null, fonte_riferimento: null,
    numero_prescrizione: null, confermata_da: null, confermata_at: null,
    created_at: '2026-08-04T10:00:00Z', updated_at: '2026-08-04T10:00:00Z',
    ...over,
  }
}

function makeLavoro(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav', numero_lavoro: '2026-0147', stato: 'in_lavorazione',
    data_consegna_prevista: '2026-08-20', ora_consegna: '16:00',
    descrizione: 'Corona zirconia', paziente_nome_snapshot: 'PZ-147',
    colore_scala: null, colore_codice: null,
    updated_at: '2026-08-04T10:00:00.123456+00:00',
    cliente: { studio_nome: 'Studio Bianchi', nome: 'Ada', cognome: 'Bianchi' },
    paziente: null, tecnico: null,
    fasi: [], immagini: [], lavorazioni: [], appuntamenti: [], materiali: [], ddc: null,
    laboratorio: { nome: 'Lab', telefono: null },
    ...over,
  } as unknown as LavoroDettaglio
}

/** La riga «Colore» come la vede lo screen reader: bottone «Modifica colore»
 *  quando è correggibile, altrimenti solo testo. */
function bottoneColore() {
  return screen.queryByRole('button', { name: 'Modifica colore' })
}

describe('La riga «Colore» nella scheda (D225②)', () => {
  it('(d) senza colore né trascrizione la riga NON compare affatto', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(screen.queryByText('Colore')).not.toBeInTheDocument()
    expect(bottoneColore()).not.toBeInTheDocument()
  })

  it('(a) trascritto: valore vivo e pastiglia verde «✓ dalla prescrizione»', () => {
    render(
      <SchedaLavoroV3
        lavoro={makeLavoro({
          colore_scala: 'vita_classical', colore_codice: 'A3',
          prescrizione: presc({ contenuto: { colore: 'A3' } }),
        })}
      />
    )
    expect(screen.getByText('Colore')).toBeInTheDocument()
    expect(screen.getByText('A3')).toBeInTheDocument()
    expect(screen.getByText('✓ dalla prescrizione')).toBeInTheDocument()
  })

  it('(b) «lo scegliamo noi»: segnale POSITIVO quieto, e MAI la pastiglia della prescrizione', () => {
    render(
      <SchedaLavoroV3 lavoro={makeLavoro({ colore_scala: 'vita_classical', colore_codice: 'B2' })} />
    )
    expect(screen.getByText('B2')).toBeInTheDocument()
    expect(screen.getByText('scelto dal laboratorio')).toBeInTheDocument()
    expect(screen.queryByText('✓ dalla prescrizione')).not.toBeInTheDocument()
  })

  it('(c) post-divergenza: prescritto E realizzato visibili insieme, senza pastiglia verde', () => {
    render(
      <SchedaLavoroV3
        lavoro={makeLavoro({
          colore_scala: 'vita_classical', colore_codice: 'A3.5',
          prescrizione: presc({
            contenuto: { colore: 'A3' },
            divergenze: [{ campo: 'colore', motivo: 'richiesta_dentista', nota: null, utente_id: 'u1', registrata_at: '2026-08-04T11:00:00Z' }],
          }),
        })}
      />
    )
    expect(screen.getByText('A3.5')).toBeInTheDocument()
    expect(screen.getByText('prescritto: A3')).toBeInTheDocument()
    expect(screen.queryByText('✓ dalla prescrizione')).not.toBeInTheDocument()
  })

  it('la riga è un controllo di modifica col suo nome accessibile (WCAG 2.5.3: contiene «colore»)', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ colore_scala: 'vita_classical', colore_codice: 'A3' })} />)
    expect(bottoneColore()).toBeInTheDocument()
  })

  it('il tap apre il foglio «Colore» col valore attuale già dentro', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ colore_scala: 'vita_classical', colore_codice: 'A3' })} />)
    fireEvent.click(bottoneColore() as HTMLElement)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Colore', { selector: 'input' })).toHaveValue('A3')
  })

  it('con una Dichiarazione di Conformità attiva la riga si vede ma NON si tocca (le rotte direbbero «congelata»)', () => {
    render(
      <SchedaLavoroV3
        lavoro={makeLavoro({
          colore_scala: 'vita_classical', colore_codice: 'A3',
          ddc: { id: 'd1', stato: 'emessa' } as unknown as LavoroDettaglio['ddc'],
        })}
      />
    )
    expect(screen.getByText('A3')).toBeInTheDocument()
    expect(bottoneColore()).not.toBeInTheDocument()
  })

  it('quando il colore lo porta una RIGA di dente la riga si vede ma NON si tocca (la PATCH scriverebbe solo il caso)', () => {
    render(
      <SchedaLavoroV3
        lavoro={makeLavoro({
          colore_scala: 'vita_classical', colore_codice: 'A3',
          denti: [{ fdi: 26, scala: 'vita_classical', codice: 'B2' }] as unknown as LavoroDettaglio['denti'],
        })}
      />
    )
    // Il colore mostrato è quello della RIGA, non il default di caso.
    expect(screen.getByText('B2')).toBeInTheDocument()
    expect(bottoneColore()).not.toBeInTheDocument()
  })

  it('la riga sta fra «Lavoro» e «Consegna», come la scena 9 del mockup', () => {
    render(
      <SchedaLavoroV3 lavoro={makeLavoro({ colore_scala: 'vita_classical', colore_codice: 'A3' })} />
    )
    const chiavi = screen.getAllByText(/^(Dentista|Paziente|Colore|Consegna|Tecnico)$/).map((n) => n.textContent)
    expect(chiavi.indexOf('Colore')).toBeGreaterThan(chiavi.indexOf('Paziente'))
    expect(chiavi.indexOf('Colore')).toBeLessThan(chiavi.indexOf('Consegna'))
  })
})
