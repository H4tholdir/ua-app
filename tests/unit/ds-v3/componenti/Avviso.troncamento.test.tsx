import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { AvvisiProvider, useAvvisi } from '@/components/ds/Avviso'

// D234 (gate L2, 05/08/2026) — il difetto l'ha visto Francesco su uno scatto:
// del 409 «fonte in uso» si leggeva «…di questo lavoro — no…», e la metà che
// spiega PERCHÉ non si può eliminare era invisibile. `Avviso` tagliava OGNI
// testo a due righe con `-webkit-line-clamp`.
//
// La regola decisa: il taglio resta sui SUCCESSI (spariscono da soli dopo 4s,
// e la loro frase è corta) e cade sugli ERRORI (restano finché non li chiudi,
// e il contratto scritto in testa al componente promette «cosa non è riuscito
// + cosa fare»). Un errore troncato non è un errore: è un lampeggio.
//
// ⚠️ Il test guarda lo STILE, non il testo: jsdom non impagina, quindi «quante
//    righe si vedono» non è misurabile qui — misurabile è la proprietà che le
//    taglia. La prova visiva sta nello scatto `errore-fonte-in-uso-390-chiaro`.

const LUNGO =
  'Questa immagine è la fonte della prescrizione di questo lavoro — non si può eliminare finché resta collegata.'

function Scintilla({ tipo, testo }: { tipo: 'errore' | 'ok'; testo: string }) {
  const { errore, avvisa } = useAvvisi()
  return (
    <button onClick={() => (tipo === 'errore' ? errore(testo) : avvisa(testo))}>accendi</button>
  )
}

function accendi(tipo: 'errore' | 'ok', testo = LUNGO) {
  render(
    <AvvisiProvider>
      <Scintilla tipo={tipo} testo={testo} />
    </AvvisiProvider>
  )
  act(() => {
    screen.getByRole('button', { name: 'accendi' }).click()
  })
  return screen.getByText(testo)
}

afterEach(cleanup)

describe('Avviso — il troncamento (D234)', () => {
  it("un ERRORE non è tagliato: nessun clamp sul paragrafo", () => {
    const p = accendi('errore')
    expect(p.style.webkitLineClamp).toBe('')
    expect(p.style.overflow).not.toBe('hidden')
  })

  it('un SUCCESSO resta tagliato a due righe: è effimero e breve', () => {
    const p = accendi('ok')
    expect(p.style.webkitLineClamp).toBe('2')
    expect(p.style.overflow).toBe('hidden')
  })

  it("l'errore porta con sé la via d'uscita: senza «Chiudi» resterebbe per sempre", () => {
    accendi('errore')
    expect(screen.getByRole('button', { name: 'Chiudi' })).toBeInTheDocument()
  })
})
