import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { DevoIntervenire } from '@/components/features/lavori/scheda-v3/DevoIntervenire'

/**
 * «Devo intervenire» (Task 6) — le prove che sorvegliano le DECISIONI, non i pixel.
 *
 * 🔑 Ogni prova qui sotto nasce da una decisione ratificata, e il suo nome la
 * cita: se un giorno il componente cambia forma, queste devono restare vere o
 * la decisione è stata persa per strada.
 */

const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: refreshMock }) }))

function montaComponente() {
  return render(
    <AvvisiProvider>
      <DevoIntervenire lavoroId="11111111-1111-1111-1111-111111111111" descrizione="Corona zirconia n.147" />
    </AvvisiProvider>
  )
}

const RISPOSTA_OK = {
  evento: { id: '44444444-4444-4444-4444-444444444444' },
  proposta: { esito: 'reclamo', perche: 'Ce l\'ha segnalato l\'odontoiatra. Il dispositivo era stato applicato.', ramoIso: '8.3.3', termineOre: null },
  effetto: { lavoro: 'scelta_richiesta', documento: 'segue_la_scelta', azione: null, perche: 'Il manufatto è compromesso, e prima di procedere serve una scelta.' },
}

function fingiFetch(risposta: unknown = RISPOSTA_OK, ok = true) {
  const spia = vi.fn().mockResolvedValue({ ok, json: async () => risposta })
  vi.stubGlobal('fetch', spia)
  return spia
}

/** Apre il foglio dei motivi: riga → dialogo d'ingresso → «Sì». */
function apriElencoMotivi() {
  fireEvent.click(screen.getByRole('button', { name: /Devo intervenire/i }))
  fireEvent.click(screen.getByRole('button', { name: /Sì, devo intervenire/i }))
}

describe('DevoIntervenire', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('la riga è sempre lì, e dice DOVE si va — non cosa è vietato (D269)', () => {
    montaComponente()
    const riga = screen.getByRole('button', { name: /Devo intervenire/i })
    expect(riga).toBeTruthy()
    expect(riga.textContent).toContain('da qui si registra')
  })

  // ⚖️ D288 — la domanda d'ingresso, parole di Francesco.
  it('🛑 la domanda d\'ingresso offre L\'USCITA insieme alla domanda, e l\'uscita non salva niente', async () => {
    const spia = fingiFetch()
    montaComponente()
    fireEvent.click(screen.getByRole('button', { name: /Devo intervenire/i }))
    expect(screen.getByText('Vuoi intervenire su questo lavoro?')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /No, ho premuto per sbaglio/i }))
    await waitFor(() => expect(screen.queryByText('Vuoi intervenire su questo lavoro?')).toBeNull())
    // 🔑 «non salva niente» è un'affermazione, e qui è una prova.
    expect(spia).not.toHaveBeenCalled()
  })

  // ⚖️ D300 — variante B: i nove motivi in CINQUE famiglie.
  it('l\'elenco mostra i nove motivi sotto le cinque famiglie', () => {
    montaComponente()
    apriElencoMotivi()
    for (const f of ['Il manufatto', 'La dichiarazione', 'La persona, o la richiesta', 'La fattura', 'Un errore nostro qui dentro']) {
      expect(screen.getByText(f), f).toBeTruthy()
    }
    expect(screen.getByText('Difetto di lavorazione')).toBeTruthy()
    expect(screen.getByText('Ho premuto «consegna» per sbaglio')).toBeTruthy()
  })

  // 🔑 I DUE «PER SBAGLIO» SONO DIVERSI, e questa prova esiste perché
  // confonderli a schermo sarebbe costato: uno esce senza salvare, l'altro
  // ripristina tutto.
  it('🛑 i due «per sbaglio» hanno nomi diversi e non si somigliano', () => {
    montaComponente()
    fireEvent.click(screen.getByRole('button', { name: /Devo intervenire/i }))
    const uscita = screen.getByRole('button', { name: /No, ho premuto per sbaglio/i }).textContent ?? ''
    fireEvent.click(screen.getByRole('button', { name: /Sì, devo intervenire/i }))
    const motivo = screen.getByText('Ho premuto «consegna» per sbaglio').textContent ?? ''
    expect(uscita).not.toBe(motivo)
    // Il motivo NOMINA il tasto che è stato premuto per sbaglio; l'uscita no.
    expect(motivo).toContain('consegna')
    expect(uscita).not.toContain('consegna')
  })

  // ⚖️ D269 + la guardia della rotta — il percorso corto NON chiede le caselle.
  it('🛑 «ho premuto consegna per sbaglio» NON apre le quattro caselle', () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    // Va alla conferma, non ai dettagli.
    expect(screen.getByRole('heading', { name: 'Il lavoro torna fra i pronti' })).toBeTruthy()
    expect(screen.queryByText('Dov\'era il manufatto?')).toBeNull()
  })

  it('🛑 e quando registra, manda «mai uscito» — mai uno stato scelto a mano', async () => {
    const spia = fingiFetch({ ...RISPOSTA_OK, riapertura: { stato: 'applicato', dichiarazione_assente: false } })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /Sì, riportalo indietro/i }))

    await waitFor(() => expect(spia).toHaveBeenCalled())
    const corpo = JSON.parse((spia.mock.calls[0][1] as { body: string }).body) as Record<string, unknown>
    expect(corpo.motivo).toBe('errore_registrazione')
    expect(corpo.stato_dispositivo).toBe('mai_uscito_dal_lab')
    // 🔑 `potenziale_di_danno` NON si manda: lo mette il database col suo
    // default prudente. Mandare «nessuno» sarebbe affermare che non c'era
    // pericolo — una risposta che nessuno ha dato.
    expect(corpo).not.toHaveProperty('potenziale_di_danno')
  })

  // ⚖️ spec §5 — «da valutare» è acceso, e «no» non è la via più rapida.
  it('🛑 le quattro caselle si aprono per gli altri motivi, e «Da valutare» è già acceso', () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))
    expect(screen.getByText('Dov\'era il manufatto?')).toBeTruthy()
    expect(screen.getByText('Poteva far male a qualcuno?')).toBeTruthy()
    const daValutare = screen.getByRole('button', { name: 'Da valutare' })
    expect(daValutare.getAttribute('aria-pressed')).toBe('true')
  })

  it('registrando un difetto manda i quattro fatti, e il potenziale di danno c\'è', async () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))
    fireEvent.click(screen.getByRole('button', { name: 'Già applicato' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))

    await waitFor(() => expect(spia).toHaveBeenCalled())
    const corpo = JSON.parse((spia.mock.calls[0][1] as { body: string }).body) as Record<string, unknown>
    expect(corpo.motivo).toBe('difetto_lavorazione')
    expect(corpo.stato_dispositivo).toBe('applicato')
    expect(corpo.potenziale_di_danno).toBe('da_valutare')
    expect(typeof corpo.conosciuto_il).toBe('string')
  })

  // ⚖️ D267/D288 — la proposta col suo perché, e i DUE PIANI separati.
  it('🛑 la proposta mostra il PERCHÉ della norma e, separato, che cosa succede al lavoro', async () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))

    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    expect(screen.getByText(/Ce l'ha segnalato l'odontoiatra/)).toBeTruthy()
    // 🔑 L'altro piano, e non si mescola col primo.
    expect(screen.getByText('E sul lavoro')).toBeTruthy()
    expect(screen.getByText(/Il manufatto è compromesso/)).toBeTruthy()
  })

  it('e si può CAMBIARE: la persona decide, l\'app propone', async () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Non è così — cambia/i }))
    expect(screen.getByRole('button', { name: 'Incidente grave' })).toBeTruthy()
  })

  // 🛑 R10 — gli esiti negativi vanno DISEGNATI, o sono indistinguibili da un
  // successo. Questa prova è il motivo per cui la rotta ne distingue tre.
  it('🛑 se la riapertura FALLISCE, la schermata lo DICE', async () => {
    fingiFetch({ ...RISPOSTA_OK, riapertura: { stato: 'fallito', messaggio: 'Riportalo tu fra quelli pronti.' } })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /Sì, riportalo indietro/i }))

    await waitFor(() => expect(screen.getAllByText('Ma il lavoro non è tornato indietro').length).toBeGreaterThan(0))
    expect(screen.getByText('Riportalo tu fra quelli pronti.')).toBeTruthy()
  })

  it('🛑 «non applicabile» NON si mostra come un guasto: non lo è', async () => {
    fingiFetch({ ...RISPOSTA_OK, riapertura: { stato: 'non_applicabile', motivo: 'non_consegnato' } })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /Sì, riportalo indietro/i }))

    await waitFor(() => expect(screen.getAllByText('Il lavoro non era da riportare indietro').length).toBeGreaterThan(0))
    expect(screen.queryByText('Ma il lavoro non è tornato indietro')).toBeNull()
  })

  it('la riapertura riuscita si vede, col caveat quando non c\'era una dichiarazione', async () => {
    fingiFetch({ ...RISPOSTA_OK, riapertura: { stato: 'applicato', dichiarazione_assente: true } })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /Sì, riportalo indietro/i }))

    await waitFor(() => expect(screen.getAllByText('Il lavoro è tornato fra i pronti').length).toBeGreaterThan(0))
    expect(screen.getByText(/Non c'era nessuna dichiarazione da annullare/)).toBeTruthy()
  })

  // 🛑 Il vincolo di banca dati: «nessuna azione» senza il perché è rifiutato.
  it('confermando la proposta, la giustificazione è il PERCHÉ mostrato — non un testo inventato', async () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Registra' }))

    await waitFor(() => expect(spia).toHaveBeenCalledTimes(2))
    const [url, opzioni] = spia.mock.calls[1] as [string, { body: string }]
    expect(url).toContain('/valutazioni')
    const corpo = JSON.parse(opzioni.body) as Record<string, unknown>
    expect(corpo.esito).toBe('reclamo')
    expect(corpo.giustificazione).toBe(RISPOSTA_OK.proposta.perche)
  })

  // 🛑 QUESTA PROVA NASCE DA UN DIFETTO CHE LE PROVE UNITARIE NON POTEVANO
  // VEDERE, e va detto per intero perché è la lezione più utile del Task 6.
  // La prima stesura chiamava `router.refresh()` subito dopo aver registrato,
  // a foglio APERTO. Sullo schermo vero quel rinfresco fa rirendere il Server
  // Component: la scheda si ricostruisce, questo componente perde lo stato
  // locale e **la schermata finale non compare mai** — la registrazione è
  // salva, la valutazione depositata, e la persona non vede nessuna conferma.
  // `provato:` misurato il 07/08 sul banco vero (evento e valutazione in banca
  // dati, foglio sparito).
  // ⚠️ In jsdom `router.refresh` è una finzione che non rirende niente: le
  // quindici prove restavano verdi. **Una prova non può vedere un difetto che
  // vive nel montaggio del framework** — per quello esiste la FASE 9.
  // ➡️ Qui si sorveglia l'INVARIANTE che il difetto violava: **niente rinfresco
  // finché il foglio è aperto.** È quanto di più vicino si possa provare.
  it('🛑 NON rinfresca la pagina mentre il foglio è aperto — lo fa alla chiusura', async () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())

    // Il fatto è registrato, il foglio è aperto sulla proposta: NIENTE rinfresco.
    expect(refreshMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Registra' }))
    await waitFor(() => expect(screen.getAllByText(/Registrato/).length).toBeGreaterThan(0))
    // Ancora niente: la schermata finale dev'essere leggibile.
    expect(refreshMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Ho capito' }))
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
  })

  it('«altro» non si può registrare senza aver scritto due parole', () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Altro'))
    const continua = screen.getByRole('button', { name: /Continua/i })
    expect(continua.hasAttribute('disabled') || continua.getAttribute('aria-disabled') === 'true').toBe(true)
  })
})
