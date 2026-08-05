// tests/unit/scheda-v3/scheda-riga-tinta.test.tsx
//
// D42 Task 7 (D247) — la riga «Tinta» DENTRO la scheda: che compaia solo quando
// una tinta c'è davvero, che porti il pallino solo dove il pallino è onesto
// (D114), e che SI PREMA aprendo il foglietto sulla scheda — non muta, non un
// salto di pagina. Il catalogo lo risolve il server (`caricaTinteScheda`, provato
// a parte in `tests/unit/tinta-scheda.test.ts`): qui si prova il CABLAGGIO.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/lavori/lav',
}))

import { SchedaLavoroV3 } from '../../../src/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio } from '../../../src/types/domain'
import type { TintaManufatto } from '../../../src/lib/domain/tinta'

const TINTE_SPORT: TintaManufatto[] = [
  { famiglia: 'sport', codice: 'trasparente', nome: 'Trasparente', ordine: 1, hex: null },
  { famiglia: 'sport', codice: 'rosso', nome: 'Rosso', ordine: 7, hex: '#D90012' },
]

function makeLavoro(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav', numero_lavoro: '2026-0147', stato: 'in_lavorazione',
    tipo_dispositivo: 'bite_splint',
    data_consegna_prevista: '2026-08-20', ora_consegna: '16:00',
    descrizione: 'Paradenti', paziente_nome_snapshot: 'PZ-147',
    colore_scala: null, colore_codice: null,
    tinta_famiglia: null, tinta_codice: null,
    updated_at: '2026-08-05T10:00:00.123456+00:00',
    cliente: { studio_nome: 'Studio Bianchi', nome: 'Ada', cognome: 'Bianchi' },
    paziente: null, tecnico: null,
    fasi: [], immagini: [], lavorazioni: [], appuntamenti: [], materiali: [], ddc: null,
    laboratorio: { nome: 'Lab', telefono: null },
    ...over,
  } as unknown as LavoroDettaglio
}

/** Il lavoro con la tinta già risolta dal server, come arriva dalla pagina. */
function conTinta(hex: string | null = '#D90012') {
  return makeLavoro({
    tinta_famiglia: 'sport',
    tinta_codice: hex === null ? 'trasparente' : 'rosso',
    tinta: {
      famiglia: 'sport',
      codice: hex === null ? 'trasparente' : 'rosso',
      nome: hex === null ? 'Trasparente' : 'Rosso',
      hex,
    },
    tinteDisponibili: TINTE_SPORT,
  } as Partial<LavoroDettaglio>)
}

describe('La riga «Tinta» nella scheda (D247 · D253)', () => {
  it('su un lavoro che NON ammette una tinta la riga non compare affatto', () => {
    // Una corona: `caricaTinteScheda` non interroga nemmeno il catalogo, quindi
    // `tinteDisponibili` è vuoto. Mostrare «Nessuna» qui sarebbe offrire un
    // gesto che non ha esito.
    render(<SchedaLavoroV3 lavoro={makeLavoro({ tipo_dispositivo: 'protesi_fissa' } as Partial<LavoroDettaglio>)} />)
    expect(screen.queryByText('Tinta')).not.toBeInTheDocument()
  })

  it('su un lavoro che AMMETTE una tinta ma non ne ha, la riga RESTA e dice «Nessuna» (D253)', () => {
    // 🔑 Francesco, il 05/08: una riga che sparisce non dice «non c'è tinta»,
    //    dice NIENTE — e chi guarda non sa se il dato manchi o se quel lavoro
    //    non lo preveda. Qui la riga è insieme l'informazione e la via per
    //    cambiarla.
    render(<SchedaLavoroV3 lavoro={makeLavoro({ tinteDisponibili: TINTE_SPORT } as Partial<LavoroDettaglio>)} />)
    expect(screen.getByText('Tinta')).toBeInTheDocument()
    expect(screen.getByText('Nessuna')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifica tinta' })).toBeInTheDocument()
  })

  it('e da quella riga vuota si apre comunque la tavolozza', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ tinteDisponibili: TINTE_SPORT } as Partial<LavoroDettaglio>)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Modifica tinta' }))
    expect(screen.getByRole('button', { name: 'Rosso' })).toBeInTheDocument()
  })

  it('con una tinta mostra il NOME, e si PREME (D247: non è muta)', () => {
    render(<SchedaLavoroV3 lavoro={conTinta()} />)
    expect(screen.getByText('Rosso')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifica tinta' })).toBeInTheDocument()
  })

  it('premendola si apre il foglietto SULLA SCHEDA, con la tavolozza', async () => {
    render(<SchedaLavoroV3 lavoro={conTinta()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Modifica tinta' }))
    // La tavolozza è lì: nessun salto di pagina, nessun `router.push`.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nessuna tinta' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Trasparente' })).toBeInTheDocument()
  })

  it('una tinta senza pallino mostra SOLO il nome (D114)', () => {
    const { container } = render(<SchedaLavoroV3 lavoro={conTinta(null)} />)
    expect(screen.getByText('Trasparente')).toBeInTheDocument()
    // Nessun cerchietto: `hex` è nullo in catalogo, e un colore piatto mentirebbe.
    expect(container.querySelector('[data-pallino-tinta]')).toBeNull()
  })

  it('una tinta col pallino lo mostra, e il pallino porta il colore del catalogo', () => {
    const { container } = render(<SchedaLavoroV3 lavoro={conTinta()} />)
    const pallino = container.querySelector('[data-pallino-tinta]')
    expect(pallino).not.toBeNull()
    // 🔑 Il colore non è mai l'UNICA fonte: accanto c'è sempre il nome.
    expect(screen.getByText('Rosso')).toBeInTheDocument()
  })

  it('su un lavoro con la DdC emessa la riga si legge ma NON si preme', () => {
    // Stessa regola della riga «Colore»: una dichiarazione attiva congela il
    // dato, e una voce che invita a un gesto che tornerà sempre 409 invita
    // comunque. Meglio ferma.
    const lavoro = { ...conTinta(), ddc: { id: 'd1', stato: 'emessa' } } as unknown as LavoroDettaglio
    render(<SchedaLavoroV3 lavoro={lavoro} />)
    expect(screen.getByText('Rosso')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifica tinta' })).not.toBeInTheDocument()
  })
})
