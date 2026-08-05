// D42 Task 8 — la tinta sulla pagina di modifica: come VIAGGIA e come si DICE.
//
// 🔴 Nasce dal ritrovamento P8-① (v. il piano): `useLavoroForm.save()` costruisce
//    il corpo come `{ ...data }`, e `data` porta già `tinta_famiglia`/`tinta_codice`
//    dal lavoro caricato. Il corpo nomina quindi SEMPRE la tinta, e questo rende
//    IRRAGGIUNGIBILE il ramo D117 della rotta — quello che al cambio di tipo
//    toglie la tinta *e lo dichiara*. Chi cambiasse il tipo si vedrebbe dire «non
//    sono riuscita a registrare la tinta che hai chiesto» invece di «ti ho tolto
//    la tinta»: un invito a riprovare per sempre, su un gesto mai fatto.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LavoroFormClient } from '../../src/components/features/lavori/LavoroFormClient'
import { LAVORO_FIXTURE } from './helpers/pdf-fixtures'
import type { LavoroDettaglio } from '../../src/types/domain'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

/** Un lavoro che AMMETTE una tinta (bite/splint) e ne ha già una: è la
 *  condizione che rende le prove discriminanti — con la tinta a `null` la
 *  chiave partirebbe comunque e non si vedrebbe la differenza. */
function lavoroConTinta(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    ...LAVORO_FIXTURE,
    tipo_dispositivo: 'bite_splint',
    tinta_famiglia: 'sport',
    tinta_codice: 'rosso',
    ...over,
  } as LavoroDettaglio
}

function corpoDellaPatch() {
  const chiamata = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
    ([url, init]) =>
      url === `/api/lavori/${LAVORO_FIXTURE.id}` && (init as RequestInit)?.method === 'PATCH'
  )
  return chiamata ? JSON.parse((chiamata[1] as RequestInit).body as string) : null
}

async function sporcaESalva() {
  const descrizione = await screen.findByDisplayValue(LAVORO_FIXTURE.descrizione)
  fireEvent.change(descrizione, { target: { value: 'Descrizione cambiata' } })
  fireEvent.click(await screen.findByRole('button', { name: /Salva modifiche/i }))
  await waitFor(() => expect(corpoDellaPatch()).not.toBeNull())
}

describe('La tinta nel corpo della PATCH del form (P8-①)', () => {
  const fetchVero = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ lavoro: { id: LAVORO_FIXTURE.id } }),
    })
  })
  afterEach(() => {
    global.fetch = fetchVero
    vi.restoreAllMocks()
  })

  it('salvando SENZA toccare la tinta, le due chiavi NON partono', async () => {
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    await sporcaESalva()
    const body = corpoDellaPatch()
    // `hasOwnProperty` e non `toEqual`: la chiave non deve comparire **affatto**,
    // perché è la sua PRESENZA a dirottare la rotta sul ramo sbagliato.
    expect(Object.prototype.hasOwnProperty.call(body, 'tinta_famiglia')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(body, 'tinta_codice')).toBe(false)
  })

  it('e la descrizione invece parte: il salvataggio funziona come prima', async () => {
    // Guardia contro la cura peggiore del male — se togliendo la tinta si
    // rompesse il resto del salvataggio, la prova qui sopra sarebbe verde lo
    // stesso.
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    await sporcaESalva()
    expect(corpoDellaPatch().descrizione).toBe('Descrizione cambiata')
  })
})

describe('Quello che il server ha fatto, detto a chi salva (D251 · D248)', () => {
  const fetchVero = global.fetch
  afterEach(() => {
    global.fetch = fetchVero
    vi.restoreAllMocks()
  })

  it('«ti ho tolto la tinta» si legge a schermo, e NON come un errore', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        lavoro: { id: LAVORO_FIXTURE.id },
        tinta_rimossa: { famiglia: 'sport', codice: 'rosso' },
      }),
    })
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    await sporcaESalva()
    // 🔑 D117 esiste per poter DIRE questa cosa. Se nessuno la legge, il ramo
    //    che la produce è codice morto.
    await waitFor(() => expect(screen.getByText(/tolt[oa].*tinta/i)).toBeInTheDocument())
    // Il salvataggio è RIUSCITO: chiamarlo errore manderebbe l'utente a
    // riprovare un gesto che è andato a buon fine.
    expect(screen.queryByText(/Errore — riprova/i)).not.toBeInTheDocument()
  })

  it('«la tinta chiesta non è stata registrata» si legge, e QUESTO è un errore', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ lavoro: { id: LAVORO_FIXTURE.id }, tinta_scartata: true }),
    })
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    await sporcaESalva()
    await waitFor(() => expect(screen.getByText(/tinta.*non.*registrat/i)).toBeInTheDocument())
  })

  it('«il colore chiesto non è stato registrato» si legge — il campo che D248 ha fatto uscire', async () => {
    // 🔴 Il gemello del colore: `colore_scartato` esce dalla PATCH dal 05/08
    //    (D248) e fino a qui NON aveva un lettore. Un campo senza lettore è
    //    l'interruttore che c'è e non fa niente.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ lavoro: { id: LAVORO_FIXTURE.id }, colore_scartato: true }),
    })
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    await sporcaESalva()
    await waitFor(() => expect(screen.getByText(/colore.*non.*registrat/i)).toBeInTheDocument())
  })

  it('una risposta normale non fa comparire nessun avviso — la guardia negativa', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ lavoro: { id: LAVORO_FIXTURE.id } }),
    })
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    await sporcaESalva()
    expect(screen.queryByText(/non.*registrat/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/tolt[oa].*tinta/i)).not.toBeInTheDocument()
  })
})
