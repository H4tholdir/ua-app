// 🔴 TROVATO AL COLLAUDO A SCHERMO DEL 06/08/2026 — l'avviso copriva il campo
//    sotto, e nessuna prova poteva accorgersene perché tutte guardavano il TESTO.
//
// Il difetto, misurato sul banco `ua-prod-3020` a 390×844 (referto:
// `docs/design/screenshots/2026-08-06-tinte/README.md` §2): il riquadro
// dell'avviso occupava 620→700px, l'etichetta «Priorità» 633→651px. **Coperta
// per intero**, e la sua tendina per 67px su 73.
//
// 🔑 LE CAUSE SONO DUE, e una sola correzione che ne chiuda una lascia l'altra:
//   ① `position: absolute` → il riquadro non occupa spazio, quindi si stampa
//      SOPRA il modulo invece di farsi largo. Nasconde un campo che chi salva
//      può voler correggere proprio in quel momento.
//   ② fondo ambra al **10%** → ciò che sta sotto TRASPARE, e i due testi si
//      mescolano. È il motivo per cui a schermo si leggeva «Ho tolto la tinta»
//      con dentro le lettere di «PRIORITÀ».
//
// 🛑 E VALE PER TUTTI E DUE I RIQUADRI, non solo per quello nuovo. L'errore
//    (`saveError`) ha esattamente la stessa forma dal giorno in cui è nato:
//    correggerne uno solo lascerebbe due comportamenti diversi per lo stesso
//    problema — la classe di difetto che quest'ondata combatte. Il censimento
//    (`grep "position: 'absolute'"`) ne trova **due**, ed è l'intero perimetro:
//    `grep -rl "bottom: '72px'"` risponde con questo file soltanto.
//
// ⚠️ PERCHÉ LE ASSERZIONI GUARDANO LO STILE e non i pixel: in jsdom non c'è
//    impaginazione, quindi «si sovrappone» non è misurabile qui. Si tengono
//    ferme le due CAUSE, che sono misurabili e che sul banco sono state viste
//    produrre l'effetto. La prova a pixel è lo scatto del gate, non questa.
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LavoroFormClient } from '../../src/components/features/lavori/LavoroFormClient'
import { LAVORO_FIXTURE } from './helpers/pdf-fixtures'
import type { LavoroDettaglio } from '../../src/types/domain'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

function lavoroConTinta(): LavoroDettaglio {
  return {
    ...LAVORO_FIXTURE,
    tipo_dispositivo: 'bite_splint',
    tinta_famiglia: 'sport',
    tinta_codice: 'rosso',
  } as LavoroDettaglio
}

async function sporcaESalva() {
  const descrizione = await screen.findByDisplayValue(LAVORO_FIXTURE.descrizione)
  fireEvent.change(descrizione, { target: { value: 'Descrizione cambiata' } })
  fireEvent.click(await screen.findByRole('button', { name: /Salva modifiche/i }))
}

/** L'antenato appiccicato in fondo: è lì che i riquadri devono vivere. */
function barraDelleAzioni(dentro: HTMLElement): HTMLElement | null {
  let nodo: HTMLElement | null = dentro
  while (nodo) {
    if (nodo.style?.position === 'sticky') return nodo
    nodo = nodo.parentElement
  }
  return null
}

describe('I riquadri della barra non coprono il modulo (collaudo 06/08/2026)', () => {
  // Il caso ④ passa dal percorso che RILANCIA il motivo dopo averlo mostrato
  // (`useLavoroForm.ts:278-279`), e l'`onClick` del tasto non ha un `.catch()`:
  // la promessa respinta arriva fin qui. È il comportamento di oggi, non
  // qualcosa che questa prova introduce — si raccoglie e si CONTROLLA che sia
  // proprio il motivo atteso, invece di lasciarla sporcare la suite come
  // errore anonimo. Stesso trattamento, e stessa ragione, di
  // `lavoro-form-messaggio-errore.test.tsx:76-92`.
  const respinte: unknown[] = []
  const raccogli = (e: unknown) => { respinte.push(e) }
  beforeAll(() => { process.on('unhandledRejection', raccogli) })
  afterAll(() => {
    process.off('unhandledRejection', raccogli)
    for (const e of respinte) {
      expect(String((e as Error)?.message ?? e)).toMatch(/zone del colore/i)
    }
  })

  const fetchVero = global.fetch
  afterEach(() => {
    global.fetch = fetchVero
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        lavoro: { id: LAVORO_FIXTURE.id },
        tinta_rimossa: { famiglia: 'sport', codice: 'rosso' },
      }),
    })
  })

  it('① l’avviso occupa il suo spazio: non è tolto dal flusso', async () => {
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    await sporcaESalva()
    const avviso = await screen.findByRole('status')
    // 🔑 `absolute` è la causa ①: un elemento fuori dal flusso non fa largo a sé
    //    e si stampa su ciò che trova.
    expect(avviso.style.position).not.toBe('absolute')
  })

  it('② l’avviso ha un fondo PIENO: sotto non traspare niente', async () => {
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    await sporcaESalva()
    const avviso = await screen.findByRole('status')
    // Il velo ambra resta (è il tono «guarda, è successo qualcosa»), ma poggia
    // sul fondo pagina invece che sul vuoto: così il tono non cambia e il testo
    // sotto non si legge più attraverso.
    expect(avviso.style.background).toContain('var(--bg')
  })

  it('③ l’avviso resta DENTRO la barra appiccicata: si vede sempre', async () => {
    // Se lo si spostasse nel modulo per farlo stare nel flusso, scorrerebbe via
    // e chi salva dall'alto della pagina non lo vedrebbe mai. Le due esigenze —
    // «non copre» e «si vede» — si tengono insieme solo qui.
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    await sporcaESalva()
    const avviso = await screen.findByRole('status')
    const barra = barraDelleAzioni(avviso)
    expect(barra).not.toBeNull()
    // ⚠️ Si àncora al tasto DOCUMENTI, non a «Salva»: dopo un salvataggio
    //    riuscito `isDirty` torna falso e il tasto Salva **sparisce**. Ancorarsi
    //    a lui farebbe fallire questa prova per un motivo che non c'entra —
    //    e una prova che fallisce per il motivo sbagliato non prova niente.
    expect(barra!.contains(screen.getByRole('button', { name: /pacchetto documenti MDR/i }))).toBe(true)
  })

  it('④ e il riquadro dell’ERRORE ha la stessa cura: era lo stesso difetto', async () => {
    // ⚠️ Fuori dal difetto trovato al collaudo, dentro lo stesso perimetro: la
    //    forma è identica e la premessa è stata VERIFICATA, non supposta (è la
    //    lezione di D260). `grep` → due `position: absolute`, questi due.
    // Il repro è quello del collaudo del 28/07: una zona del ceramista
    // valorizzata SENZA nessun dente selezionato — il salvataggio si ferma
    // prima di partire e la frase compare. Serve la fixture coi denti VUOTI:
    // `LAVORO_FIXTURE` ne porta uno (`denti_coinvolti: ['14']`), e con quello
    // il salvataggio riesce e nessun errore nasce.
    render(
      <LavoroFormClient
        defaultTab="clinica"
        lavoro={{ ...lavoroConTinta(), denti: [], denti_coinvolti: [] } as LavoroDettaglio}
      />
    )
    fireEvent.change(screen.getByLabelText(/colore collo/i), { target: { value: 'A2' } })
    fireEvent.click(screen.getByLabelText(/salva modifiche/i))
    const errore = await screen.findByRole('alert')
    await waitFor(() => expect(errore.textContent).toBeTruthy())
    expect(errore.style.position).not.toBe('absolute')
    expect(errore.style.background).toContain('var(--bg')
  })

  it('⑤ il tasto Salva e il tasto documenti restano affiancati, non impilati', async () => {
    // GUARDIA NEGATIVA (R-P4), dichiarata: era verde anche PRIMA — la barra era
    // già una riga. Vale contro la cura peggiore del male: impilare i riquadri
    // non deve impilare anche i due tasti, che a 390px starebbero uno sotto
    // l'altro mangiandosi il modulo.
    render(<LavoroFormClient lavoro={lavoroConTinta()} />)
    // Il tasto Salva esiste solo a modulo sporco (`isDirty`), quindi va sporcato
    // prima di poterlo cercare: senza questo la prova fallisce per il motivo
    // sbagliato, e una prova che fallisce per il motivo sbagliato non prova nulla.
    const descrizione = await screen.findByDisplayValue(LAVORO_FIXTURE.descrizione)
    fireEvent.change(descrizione, { target: { value: 'Descrizione cambiata' } })
    const salva = await screen.findByRole('button', { name: /Salva modifiche/i })
    const documenti = screen.getByRole('button', { name: /pacchetto documenti MDR/i })
    expect(salva.parentElement).toBe(documenti.parentElement)
    expect(salva.parentElement!.style.display).toBe('flex')
    expect(salva.parentElement!.style.flexDirection).not.toBe('column')
  })
})
