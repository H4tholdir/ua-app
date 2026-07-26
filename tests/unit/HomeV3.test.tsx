import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeV3 } from '@/components/features/home/HomeV3'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// QA device #2 (verbale 2026-07-24 «Ri-collaudo device #2», fix-list punto G1) — CAUSA
// TROVATA: `initSuoni()` viveva SOLO nell'effect di mount di `PareteClient.tsx` (v.
// FIX-D1/T15.1), ma su questa superficie `PareteClient` monta DIFFERITO dentro
// `StanzaParete` (`StanzePager.tsx`) — nella forma di apertura più comune (`homePref`
// diverso da 'parete') la stanza Pile è quella iniziale, quindi `PareteClient` non monta
// finché non arriva un idle callback (o mai, se l'utente resta sulle pile). Un tap veloce
// su un elemento della home PRIMA di quell'idle (Pila, TastoTondo, TastoPiù — tutti import
// diretti di `@/design-system/v3/sound` via i componenti `ds/`) trovava il motore audio mai
// inizializzato: nessun listener `pointerdown` registrato, `sbloccato` mai impostato,
// `suona()` usciva subito. `initSuoni()` deve partire al mount della HOME stessa, non
// aspettare il pannello differito.
const { initSuoniSpy } = vi.hoisted(() => ({ initSuoniSpy: vi.fn() }))
vi.mock('@/design-system/v3/sound', async (importOriginal) => {
  const reale = await importOriginal<typeof import('@/design-system/v3/sound')>()
  return { ...reale, initSuoni: initSuoniSpy }
})

// Task 16b (D3 §3.4) — il vecchio s9 «Tutto a posto» è morto (v. src/lib/dashboard/striscia.ts):
// fixture generica per i test che non presidiano il CONTENUTO della striscia, aggiornata a un
// segnale quieto REALE e tuttora raggiungibile (s8, il racconto del DdC del giorno).
const SEGNALE = { attenzione: false, forte: null, testo: 'Oggi ho preparato 2 DdC ✓', azione: null }
const lavoro = (numero: string): PileHome['liste']['rossa'][number] => ({
  id: `l${numero}`, numero, dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  cassetta: null,
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: true, consegna: { data: '2026-07-09', ora: '16:00:00' }, rientro: null,
  fasi: [], tecnico: null,
})
const PILE: PileHome = {
  liste: { rossa: [lavoro('147')], ambra: [], viola: [], blu: [] },
  sub: { rossa: 'n.147 alle 16', ambra: 'Niente sul banco', viola: 'Nessuna prova in giro', blu: 'Nessun nuovo arrivo' },
  striscia: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null, arrivoVecchio: null, fermo: null, consegneOggiTotali: 1, prossimaOra: '16:00' },
}

// `homePref="pile"` (Task 14): questi test presidiano la stanza Pile, cioè il layout
// storico della home, che con quella preferenza resta invariato. Le altre due forme (pager a
// due stanze e sola Parete) hanno i propri test in tests/unit/stanze-pager.test.tsx.
describe('HomeV3 — la home di legge (§7.1 + rev. 3.1)', () => {
  it('saluto, eyebrow, ☰, 4 pile in ordine di legge, TastoPiù', () => {
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} parete={[]} homePref="pile" />)
    expect(screen.getByRole('heading', { name: /Buon pomeriggio.*Francesco/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tutto il resto' })).toBeInTheDocument()
    const labels = ['DA CONSEGNARE OGGI', 'SUL BANCO', 'DA RIFARE / IN PROVA', 'APPENA ARRIVATI']
    const testi = labels.map((l) => screen.getByText(l))
    expect(testi).toHaveLength(4)
    // ordine nel DOM: rossa, ambra, viola, blu
    expect(testi[0].compareDocumentPosition(testi[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: /nuovo lavoro/i })).toBeInTheDocument()
  })

  it('tap sulla pila → /lavori?pila=…', async () => {
    const user = userEvent.setup()
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} parete={[]} homePref="pile" />)
    await user.click(screen.getByText('DA RIFARE / IN PROVA'))
    expect(push).toHaveBeenCalledWith('/lavori?pila=viola')
  })

  it('banco libero: con tutte le pile a 0 lo stack lascia il posto al blocco sereno (mockup stati-vuoti)', () => {
    const vuote: PileHome = { ...PILE, liste: { rossa: [], ambra: [], viola: [], blu: [] } }
    render(<HomeV3 nome="Francesco" eyebrow="Martedì 15 luglio" saluto="Buongiorno" pile={vuote} segnale={SEGNALE} parete={[]} homePref="pile" />)
    expect(screen.getByText('Il banco è libero')).toBeInTheDocument()
    expect(screen.queryByText('DA CONSEGNARE OGGI')).not.toBeInTheDocument()
  })

  // Task 13 (D7) — chi ha preferenza 'pile' non ha alcun pager: la linguetta «Le cassette» è
  // l'unico invito rimasto, e porta DIRETTAMENTE a `/cassette` (non a una stanza Parete che
  // qui non esiste). Registra il proprio accesso da sé (v. `LinguettaCassette.tsx`): nessun
  // setter di stanza attiva lo fa al posto suo in questa forma.
  it("preferenza 'pile': la linguetta «Le cassette» compare e porta a /cassette registrando l'accesso", async () => {
    localStorage.clear()
    const user = userEvent.setup()
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} parete={[]} homePref="pile" />)
    const linguetta = screen.getByRole('button', { name: /le cassette/i })
    await user.click(linguetta)
    expect(push).toHaveBeenCalledWith('/cassette')
    expect(JSON.parse(localStorage.getItem('ua_linguetta_v4') ?? '0')).toBe(1)
  })
})

// QA device #2 (verbale 2026-07-24 «Ri-collaudo device #2», fix-list punto G1) — v. commento
// sul mock in testa al file per la causa. `homePref="pile"` qui apposta: è la forma dove
// `PareteClient` NON monta affatto (niente pager, niente stanza Parete) — se il test passa
// solo con questa preferenza, il motore audio non può più dipendere dal pannello differito.
describe('HomeV3 — motore audio al mount (QA device #2, G1)', () => {
  beforeEach(() => { initSuoniSpy.mockClear() })

  it('chiama initSuoni() al mount della home — anche quando PareteClient non monta mai (homePref "pile")', () => {
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} parete={[]} homePref="pile" />)
    expect(initSuoniSpy).toHaveBeenCalledTimes(1)
  })
})

// Task 16b, punto 5 — silenzio (D3 §3.4): quando `segnale.silenzio` è true la home NON
// renderizza lo slot della striscia (né lo status, né il div `.striscia-slot` col suo
// marginTop) — il saluto respira, le pile risalgono.
describe('HomeV3 — silenzio (punto 5): nessuna striscia quando segnale.silenzio è true', () => {
  it('slot assente dal DOM — niente role=status, il resto della home resta intatto', () => {
    const silenzio: SegnaleStriscia = { attenzione: false, forte: null, testo: '', azione: null, silenzio: true }
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={silenzio} parete={[]} homePref="pile" />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(document.querySelector('.striscia-slot')).toBeNull()
    expect(screen.getByText('DA CONSEGNARE OGGI')).toBeInTheDocument()
  })
})

// Task 16b, punto 6 — dedup client-side del racconto (riserva UX 5c): stesso `eventoId` non si
// ridipinge una seconda volta. L'hook vive al callsite (HomeV3), non dentro StrisciaStato — v.
// task-16b-report.md per il perché (un ritorno `null` interno lascerebbe lo slot vuoto orfano
// col proprio marginTop fisso, che qui NON collassa da solo).
describe('HomeV3 — dedup racconto (punto 6)', () => {
  const RACCONTO: SegnaleStriscia = {
    attenzione: false,
    forte: null,
    testo: 'UÀ ha liberato C12',
    azione: { etichetta: 'Guarda ›', href: '/dashboard?stanza=parete' },
    eventoId: 'lib-c1-2026-07-24T10:00:00.000Z',
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('primo render: la striscia compare e l\'eventoId viene scritto in localStorage', () => {
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={RACCONTO} parete={[]} homePref="pile" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    const visti = JSON.parse(localStorage.getItem('ua_racconti_visti') ?? '[]')
    expect(visti).toContain('lib-c1-2026-07-24T10:00:00.000Z')
  })

  it('eventoId già visto (localStorage): la striscia NON compare — né lo slot', () => {
    localStorage.setItem('ua_racconti_visti', JSON.stringify(['lib-c1-2026-07-24T10:00:00.000Z']))
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={RACCONTO} parete={[]} homePref="pile" />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(document.querySelector('.striscia-slot')).toBeNull()
  })
})
