// D42 Task 8 — il campo «Tinta» nella tab Clinica della pagina di modifica.
// La tavolozza è la STESSA del foglietto della scheda (T7): un componente solo,
// importato da due posti — il prezzo dichiarato di D247, pagato una volta.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabClinica } from '@/components/features/lavori/form/TabClinica'
import type { TintaManufatto } from '@/lib/domain/tinta'
import type { Lavoro } from '@/types/domain'

const TINTE_SPORT: TintaManufatto[] = [
  { famiglia: 'sport', codice: 'trasparente', nome: 'Trasparente', ordine: 1, hex: null },
  { famiglia: 'sport', codice: 'rosso', nome: 'Rosso', ordine: 7, hex: '#D90012' },
]

function dati(over: Partial<Lavoro> = {}): Partial<Lavoro> {
  return { tipo_dispositivo: 'bite_splint', tinta_famiglia: null, tinta_codice: null, ...over }
}

describe('TabClinica — il campo della tinta (D42 T8)', () => {
  it('su un lavoro che ammette una tinta la tavolozza c è', () => {
    render(<TabClinica data={dati()} onChange={() => {}} tinte={TINTE_SPORT} />)
    expect(screen.getByRole('button', { name: 'Rosso' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nessuna tinta' })).toBeInTheDocument()
  })

  it('su una corona la tavolozza NON c è — e non è una tavolozza vuota', () => {
    // `famigliaDiMacro('protesi_fissa')` è nullo: quel lavoro una tinta non la
    // prevede, e mostrargliela vuota sarebbe offrire un gesto senza esito.
    render(<TabClinica data={dati({ tipo_dispositivo: 'protesi_fissa' })} onChange={() => {}} tinte={[]} />)
    expect(screen.queryByRole('button', { name: 'Nessuna tinta' })).not.toBeInTheDocument()
    expect(screen.queryByText(/tinta/i)).not.toBeInTheDocument()
  })

  it('scegliere una tinta scrive la COPPIA nello stato del form', () => {
    const onChange = vi.fn()
    render(<TabClinica data={dati()} onChange={onChange} tinte={TINTE_SPORT} />)
    fireEvent.click(screen.getByRole('button', { name: 'Rosso' }))
    expect(onChange).toHaveBeenCalledWith({ tinta_famiglia: 'sport', tinta_codice: 'rosso' })
  })

  it('«Nessuna tinta» la toglie, e la toglie per intero', () => {
    const onChange = vi.fn()
    render(
      <TabClinica
        data={dati({ tinta_famiglia: 'sport', tinta_codice: 'rosso' })}
        onChange={onChange}
        tinte={TINTE_SPORT}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Nessuna tinta' }))
    // 🛑 Le due chiavi INSIEME: il vincolo `lavori_tinta_coppia_ck` pretende
    //    «entrambe o nessuna», e mandarne una sola azzererebbe una tinta valida
    //    senza dichiararlo (è il rilievo aperto della revisione di ramo).
    expect(onChange).toHaveBeenCalledWith({ tinta_famiglia: null, tinta_codice: null })
  })

  it('la tinta già scelta si vede scelta, senza guardare il colore', () => {
    render(
      <TabClinica
        data={dati({ tinta_famiglia: 'sport', tinta_codice: 'rosso' })}
        onChange={() => {}}
        tinte={TINTE_SPORT}
      />
    )
    expect(screen.getByRole('button', { name: 'Rosso' })).toHaveAttribute('aria-pressed', 'true')
  })
})
