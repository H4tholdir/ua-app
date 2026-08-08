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
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: refreshMock }) }))

// 🛑 NAVIGARE DA DENTRO UN OVERLAY v3 SI FA SOLO CON `useNavigaDaOverlay`
//    (CLAUDE.md §9): si finge l'hook, non il router, perché in jsdom
//    `cediEntryAllaNavigazione()` ripiega comunque su `router.push` — cioè un
//    `router.push` nudo e l'hook sarebbero indistinguibili guardando il router.
//    Fingendo l'hook, chi lo togliesse lascerebbe questa spia a zero.
const navigaMock = vi.fn()
vi.mock('@/components/ds/useNavigaDaOverlay', () => ({ useNavigaDaOverlay: () => navigaMock }))

const LAVORO_ID = '11111111-1111-1111-1111-111111111111'
const PAZIENTE_ID = '33333333-3333-3333-3333-333333333333'
const ALTRO_PAZIENTE_ID = '99999999-9999-9999-9999-999999999999'

/** 🔑 IL GETTONE DI CONCORRENZA CON I MICROSECONDI: `timestamptz` li ha, `Date`
 *  di JS no. Il valore è scelto apposta con `.123456` — se qualcuno lo
 *  riparsasse (`new Date(...).toISOString()`) tornerebbe `.123Z` e il confronto
 *  in banca dati non tornerebbe MAI uguale: un 409 permanente. */
const GETTONE = '2026-08-08T10:20:30.123456+00:00'

/** Le sei voci stampate, così come `SchedaLavoroV3` le compone da UNA lettura. */
const VOCI = {
  updatedAt: GETTONE,
  clienteId: '22222222-2222-2222-2222-222222222222',
  richiedenteNome: 'Dott. Marco Ferri',
  prescrittoreMostrato: 'Dott. Marco Ferri',
  pazienteId: PAZIENTE_ID,
  pazienteMostrato: 'Mario Rossi',
  tipoDispositivo: 'protesi_fissa' as const,
  descrizione: 'Corona in zirconia su 26',
  denti: [
    {
      fdi: 26, ruolo: 'elemento', scala: 'vita_classical', codice: 'A3',
      codice_collo: null, codice_corpo: null, codice_incisale: null, provenienza: 'prescritto',
    },
  ],
  dentiMostrati: ['26'],
  prescrizione: { elementi: [26], colore: 'A3' },
}

function montaComponente(voci: Partial<typeof VOCI> = {}) {
  return render(
    <AvvisiProvider>
      <DevoIntervenire
        lavoroId={LAVORO_ID}
        descrizione="Corona zirconia n.147"
        documento={{ ...VOCI, ...voci }}
      />
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
    // Va alla domanda, non ai dettagli.
    expect(screen.getByRole('heading', { name: 'Il manufatto è uscito dal laboratorio?' })).toBeTruthy()
    expect(screen.queryByText('Dov\'era il manufatto?')).toBeNull()
  })

  // ─── TASK A — «LA BUGIA SMETTE DI ESSERE SILENZIOSA» ──────────────────────
  //
  // 🔴 IL DIFETTO CHE QUESTE QUATTRO PROVE CHIUDONO, misurato (P6 del piano
  // dell'atto unico, `docs/superpowers/plans/2026-08-08-…`): il foglio
  // AFFERMAVA al posto della persona che il manufatto non era mai uscito dal
  // laboratorio — `stato_dispositivo: sbaglio ? 'mai_uscito_dal_lab' : …`,
  // cablato. La domanda non veniva mai posta: veniva posta una CONFERMA.
  // 🔑 Perché conta: quel motivo riporta il lavoro fra i pronti **e annulla la
  // dichiarazione**. Su un manufatto uscito davvero è una dichiarazione falsa
  // (D293, Art. 21(2) MDR) — ed era la strada **più corta** per correggere un
  // refuso, cioè quella che le persone prendono. La bugia non la diceva la
  // persona: la diceva l'app.
  it('🛑 il percorso corto CHIEDE se il manufatto è uscito — non lo afferma al posto della persona', () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))

    expect(screen.getByRole('heading', { name: 'Il manufatto è uscito dal laboratorio?' })).toBeTruthy()
    // 🛑 La parola della conferma non c'è più: questa è una domanda, e le due
    //    cose chiedono gesti diversi a chi legge.
    expect(screen.queryByText('Confermi?')).toBeNull()
    // Il testo dice il costo per intero, e non lo attenua.
    expect(screen.getByText(/non superata: annullata/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No, è sempre rimasto qui' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sì, è uscito' })).toBeTruthy()
  })

  it('🛑 «Sì, è uscito» NON registra niente: riporta all\'elenco dei motivi', async () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: 'Sì, è uscito' }))

    await waitFor(() => expect(screen.getByText('Difetto di lavorazione')).toBeTruthy())
    // 🔑 «non registra niente» è un'affermazione, e qui è una prova.
    expect(spia).not.toHaveBeenCalled()
  })

  // ⚖️ D262 — un rifiuto INDICA LA STRADA invece di vietare. Senza questa riga
  // la persona resta davanti a un elenco che ha già rifiutato, e prende il
  // motivo più vicino: è il modo in cui una guardia produce un dato falso su un
  // altro campo.
  it('🛑 e l\'elenco porta in cima la strada da prendere, col nome esatto del motivo (D262)', async () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: 'Sì, è uscito' }))

    await waitFor(() => expect(screen.getByText(/Allora la consegna è avvenuta davvero/)).toBeTruthy())
    // Il nome del motivo si legge due volte — nell'avviso in cima e nella riga
    // dell'elenco — ed è la STESSA stringa, perché l'avviso la prende da
    // `MOTIVI_UI` invece di ricopiarla.
    expect(screen.getAllByText(/C'è un dato sbagliato sulla dichiarazione/).length).toBeGreaterThanOrEqual(2)
  })

  // 🔄 SI CHIAMAVA «manda "mai uscito" — mai uno stato scelto a mano», ed era il
  // nome giusto per il difetto: lo stato NON si sceglieva. Adesso si sceglie
  // rispondendo, e un nome che dicesse il contrario sarebbe una prova verde che
  // afferma la decisione rovesciata.
  it('🛑 e «No, è sempre rimasto qui» manda lo stato che la persona ha DICHIARATO', async () => {
    const spia = fingiFetch({ ...RISPOSTA_OK, esito_azione: { stato: 'applicato', dichiarazione_assente: false } })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /No, è sempre rimasto qui/i }))

    await waitFor(() => expect(spia).toHaveBeenCalled())
    const corpo = JSON.parse((spia.mock.calls[0][1] as { body: string }).body) as Record<string, unknown>
    expect(corpo.motivo).toBe('errore_registrazione')
    expect(corpo.stato_dispositivo).toBe('mai_uscito_dal_lab')
    // 🔑 `potenziale_di_danno` NON si manda: lo mette il database col suo
    // default prudente. Mandare «nessuno» sarebbe affermare che non c'era
    // pericolo — una risposta che nessuno ha dato.
    expect(corpo).not.toHaveProperty('potenziale_di_danno')
  })

  // 🛑 USCIRE DALLA DOMANDA SENZA RISPONDERE NON REGISTRA NIENTE. Esc, tocco
  // sullo scrim e gesto «indietro» del telefono finiscono tutti e tre sullo
  // STESSO callback del `DialogConferma` (`:87-92`, `useTapScrim`,
  // `entraOverlay('uaDialog', …)`): non sono distinguibili dal tasto «Sì, è
  // uscito» senza cambiare il contratto del componente di sistema — fuori
  // mandato. ➡️ Costo dichiarato: chi esce con Esc vede anche l'avviso in cima
  // all'elenco. Non si scrive niente, e la cosa che conta è provata qui.
  it('l\'uscita dalla domanda senza rispondere non registra niente', async () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Il manufatto è uscito dal laboratorio?' })).toBeNull())
    expect(spia).not.toHaveBeenCalled()
  })

  // ⚖️ D301 · D302 — le parole di casa: «manufatto», mai «pezzo»;
  // «dichiarazione», mai «carta».
  // 🛑 NESSUNA GUARDIA AUTOMATICA COPRE LE STRINGHE SCRITTE DENTRO QUESTO
  // COMPONENTE: `qualita-motivi-ui.test.ts:48` e `qualita-effetti.test.ts:175`
  // scorrono `MOTIVI` sui due file di TESTI (`motivi-ui.ts`, `effetti.ts`), non
  // sul JSX. Questa prova è la rete per le parole del percorso corto.
  it('🛑 nessuna parola del percorso corto dice «pezzo» o «carta» (D301, D302)', async () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    const domanda = (document.body.textContent ?? '').toLowerCase()
    expect(domanda).not.toMatch(/\bpezzo\b/)
    expect(domanda).not.toMatch(/\bcarta\b/)

    fireEvent.click(screen.getByRole('button', { name: 'Sì, è uscito' }))
    await waitFor(() => expect(screen.getByText(/Allora la consegna è avvenuta davvero/)).toBeTruthy())
    const elenco = (document.body.textContent ?? '').toLowerCase()
    expect(elenco).not.toMatch(/\bpezzo\b/)
    expect(elenco).not.toMatch(/\bcarta\b/)
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
    fingiFetch({ ...RISPOSTA_OK, esito_azione: { stato: 'fallito', messaggio: 'Riportalo tu fra quelli pronti.' } })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /No, è sempre rimasto qui/i }))

    await waitFor(() => expect(screen.getAllByText('Ma il lavoro non è tornato indietro').length).toBeGreaterThan(0))
    expect(screen.getByText('Riportalo tu fra quelli pronti.')).toBeTruthy()
  })

  it('🛑 «non applicabile» NON si mostra come un guasto: non lo è', async () => {
    fingiFetch({ ...RISPOSTA_OK, esito_azione: { stato: 'non_applicabile', motivo: 'non_consegnato' } })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /No, è sempre rimasto qui/i }))

    await waitFor(() => expect(screen.getAllByText('Il lavoro non era da riportare indietro').length).toBeGreaterThan(0))
    expect(screen.queryByText('Ma il lavoro non è tornato indietro')).toBeNull()
  })

  it('la riapertura riuscita si vede, col caveat quando non c\'era una dichiarazione', async () => {
    fingiFetch({ ...RISPOSTA_OK, esito_azione: { stato: 'applicato', dichiarazione_assente: true } })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /No, è sempre rimasto qui/i }))

    await waitFor(() => expect(screen.getAllByText('Il lavoro è tornato fra i pronti').length).toBeGreaterThan(0))
    expect(screen.getByText(/Non c'era nessuna dichiarazione da annullare/)).toBeTruthy()
  })

  // 🔴 LE TRE PROVE QUI SOTTO NASCONO DA UN CRITICO trovato dalla revisione del
  // Task 7: il riquadro diceva «La dichiarazione è stata annullata» **anche sul
  // ramo che la tiene viva**. Il ternario guardava `dichiarazione_assente`, che
  // su `torna_pronto` non arriva proprio (la rotta manda `dichiarazione_viva`),
  // quindi cadeva sempre nel ramo dell'annullamento.
  // 🛑 Perché è la prova più importante di questo file: è l'inversione esatta di
  // D293 e dell'Art. 21(2) MDR. L'intera ondata esiste per NON cancellare la
  // prova che un manufatto è uscito davvero, e la schermata diceva il contrario
  // a chi l'aveva appena salvata.
  it('🛑 «torna a pronto»: la schermata NON dice che la dichiarazione è stata annullata — perché non lo è', async () => {
    fingiFetch({
      ...RISPOSTA_OK,
      effetto: { ...RISPOSTA_OK.effetto, azione: 'torna_pronto' },
      esito_azione: { stato: 'applicato', dichiarazione_viva: true },
    })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /No, è sempre rimasto qui/i }))

    await waitFor(() => expect(screen.getAllByText('Il lavoro è tornato fra i pronti').length).toBeGreaterThan(0))
    expect(screen.getByText(/La dichiarazione resta valida/)).toBeTruthy()
    expect(screen.queryByText(/La dichiarazione è stata annullata/)).toBeNull()
  })

  it('«torna a pronto» senza una dichiarazione viva: lo dice, e dice che ne verrà emessa una nuova', async () => {
    fingiFetch({
      ...RISPOSTA_OK,
      effetto: { ...RISPOSTA_OK.effetto, azione: 'torna_pronto' },
      esito_azione: { stato: 'applicato', dichiarazione_viva: false },
    })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /No, è sempre rimasto qui/i }))

    await waitFor(() => expect(screen.getAllByText('Il lavoro è tornato fra i pronti').length).toBeGreaterThan(0))
    expect(screen.getByText(/ne verrà emessa una nuova/)).toBeTruthy()
    expect(screen.queryByText(/La dichiarazione è stata annullata/)).toBeNull()
  })

  it('«se ne fa uno nuovo»: la schermata NOMINA il lavoro nato, e non dice che questo è tornato indietro', async () => {
    fingiFetch({
      ...RISPOSTA_OK,
      effetto: { ...RISPOSTA_OK.effetto, azione: 'crea_rifacimento' },
      esito_azione: {
        stato: 'applicato',
        lavoro_nuovo: { id: '55555555-5555-5555-5555-555555555555', numero_lavoro: '2026-0042' },
      },
    })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /No, è sempre rimasto qui/i }))

    await waitFor(() => expect(screen.getAllByText('È nato il lavoro 2026-0042').length).toBeGreaterThan(0))
    expect(screen.getByText(/Questo resta consegnato con la sua dichiarazione/)).toBeTruthy()
    // 🔑 La riga che il piano chiama «falsa su un rifacimento»: il lavoro vecchio
    // NON è tornato indietro, e la schermata non deve dirlo.
    expect(screen.queryByText('Il lavoro è tornato fra i pronti')).toBeNull()
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

// ══════════════════════════════════════════════════════════════════════════
//  TASK D — IL PASSO DI CORREZIONE (⚖️ D322, variante A)
//
//  Mockup APPROVATO: docs/design/mockups/2026-08-08-passo-correzione.html
//  L'ordine è `motivo → correzione → dettagli → proposta/esito`: la correzione
//  viene PRIMA delle quattro caselle di legge.
// ══════════════════════════════════════════════════════════════════════════

const RIEMISSIONE_OK = {
  numero: 'DDC-2026-0043',
  url: 'https://esempio/ddc.pdf',
  numero_superato: 'DDC-2026-0042',
  dichiarazione_id: '77777777-7777-7777-7777-777777777777',
  sostituisce_id: '88888888-8888-8888-8888-888888888888',
  updated_at: '2026-08-08T11:00:00.987654+00:00',
}

type Risposta = { ok?: boolean; stato?: number; corpo?: unknown; illeggibile?: boolean }

/**
 * Un finto `fetch` che INSTRADA sull'URL, perché su questo percorso le
 * chiamate sono tre specie diverse (registrazione, riemissione, ricerca dei
 * pazienti) e una risposta sola per tutte proverebbe poco.
 */
function fingiFetchInstradato(opzioni: {
  evento?: Risposta
  riemetti?: Risposta
  pazienti?: unknown
} = {}) {
  const spia = vi.fn(async (url: string) => {
    const scegli = (r: Risposta | undefined, difetto: unknown): Response => {
      const ok = r?.ok ?? true
      return {
        ok,
        status: r?.stato ?? (ok ? 200 : 422),
        json: async () => {
          if (r?.illeggibile) throw new SyntaxError('corpo illeggibile')
          return r?.corpo ?? difetto
        },
      } as unknown as Response
    }
    if (url.includes('/dichiarazione/riemetti')) return scegli(opzioni.riemetti, RIEMISSIONE_OK)
    if (url.includes('/eventi-qualita')) return scegli(opzioni.evento, RISPOSTA_OK)
    if (url.includes('/api/pazienti')) {
      return { ok: true, status: 200, json: async () => opzioni.pazienti ?? { pazienti: [] } } as unknown as Response
    }
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response
  })
  vi.stubGlobal('fetch', spia)
  return spia
}

/** Riga → «Sì, devo intervenire» → «C'è un dato sbagliato sulla dichiarazione». */
function apriPassoCorrezione() {
  apriElencoMotivi()
  fireEvent.click(screen.getByText('C\'è un dato sbagliato sulla dichiarazione'))
}

/** Apre il sotto-passo di una riga dell'elenco. */
function apriRiga(etichetta: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(etichetta, 'i') }))
}

/** Corregge la descrizione in `nuovo` e torna all'elenco. */
function correggiDescrizione(nuovo: string) {
  apriRiga('Descrizione')
  fireEvent.change(screen.getByLabelText('Come deve dire il documento'), { target: { value: nuovo } })
  fireEvent.click(screen.getByRole('button', { name: /Usa questo/i }))
}

/** Dall'elenco al tocco finale: «Continua» → le quattro caselle → il tasto. */
function arrivaAlToccoFinale() {
  fireEvent.click(screen.getByRole('button', { name: /^Continua/i }))
  fireEvent.click(screen.getByRole('button', { name: /Correggi e rifai la dichiarazione/i }))
}

function corpoDi(chiamata: unknown[]): Record<string, unknown> {
  return JSON.parse((chiamata[1] as { body: string }).body) as Record<string, unknown>
}

function chiamateA(spia: { mock: { calls: unknown[][] } }, frammento: string): unknown[][] {
  return spia.mock.calls.filter((c) => String(c[0]).includes(frammento))
}

describe('DevoIntervenire — il passo di correzione (D322, variante A)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  // ⚖️ D322 — la correzione viene PRIMA delle quattro caselle.
  it('🛑 «C\'è un dato sbagliato» apre il passo di correzione, NON le quattro caselle', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()

    expect(screen.getByText('Che cosa c\'è di sbagliato?')).toBeTruthy()
    // Le quattro caselle esistono ancora, ma DOPO: qui non ci sono.
    expect(screen.queryByText('Dov\'era il manufatto?')).toBeNull()
    expect(screen.queryByText('Poteva far male a qualcuno?')).toBeNull()
  })

  // 🛑 Gli altri motivi NON passano di qui: il percorso vecchio resta intatto.
  it('🛑 gli altri motivi vanno alle quattro caselle come prima', () => {
    fingiFetchInstradato()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))

    expect(screen.getByText('Dov\'era il manufatto?')).toBeTruthy()
    expect(screen.queryByText('Che cosa c\'è di sbagliato?')).toBeNull()
  })

  // ⚖️ D322 — il NASTRO è l'elemento con cui il mockup approvato DICE che
  //    variante è: la correzione sta in mezzo, e dopo vengono ancora le quattro
  //    caselle. Senza, chi legge crede che il percorso finisca qui.
  it('🛑 il nastro dice DOVE si è, e che le quattro caselle devono ancora venire', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()

    for (const passo of ['Motivo', 'Le quattro caselle', 'Esito']) {
      expect(screen.getByText(passo), passo).toBeTruthy()
    }
    // Il passo corrente è marcato per chi non vede il colore.
    const qui = document.querySelector('[aria-current="step"]')
    expect(qui?.textContent).toBe('Che cosa c\'è di sbagliato')
  })

  // 🔑 IL PASSO MOSTRA VALORI, NON CONTROLLI — e sono SEI, contate
  //    sull'allowlist `CAMPI_CORREGGIBILI_DOCUMENTO`, non su una riga di prosa.
  it('🛑 le sei righe portano il VALORE che il documento stampa adesso', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()

    for (const riga of ['Chi ha prescritto', 'Paziente', 'Tipo di dispositivo', 'Descrizione', 'Denti', 'Caratteristiche prescritte']) {
      expect(screen.getByText(riga), riga).toBeTruthy()
    }
    expect(screen.getAllByText('Dott. Marco Ferri').length).toBeGreaterThan(0)
    expect(screen.getByText('Mario Rossi')).toBeTruthy()
    expect(screen.getByText('Protesi fissa')).toBeTruthy()
    expect(screen.getByText('Corona in zirconia su 26')).toBeTruthy()
    // Le caratteristiche si leggono con le parole del DOCUMENTO
    // (`caratteristichePrescritte`), non come un oggetto JSON.
    expect(screen.getByText('Elementi: dente 26 · Colore: A3')).toBeTruthy()
  })

  // ⚖️ Mockup — il tasto è spento COL PERCHÉ SCRITTO SOTTO: un tasto grigio e
  //    muto non è il disegno approvato.
  it('🛑 senza nessuna correzione il tasto è spento, e dice PERCHÉ', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()

    const continua = screen.getByRole('button', { name: /^Continua/i })
    expect(continua.hasAttribute('disabled') || continua.getAttribute('aria-disabled') === 'true').toBe(true)
    expect(screen.getByText(/senza una correzione, il documento nuovo sarebbe identico/i)).toBeTruthy()
  })

  it('corretta una riga, mostra vecchio → nuovo con la pastiglia «da rifare», e il tasto si accende', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')

    expect(screen.getByText('Corona in zirconia su 36')).toBeTruthy()
    expect(screen.getByText('Da rifare')).toBeTruthy()
    // Il conto sta in una frase con dentro un `<b>`: si guarda il testo intero
    // del paragrafo, non i suoi soli nodi diretti.
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && /Hai corretto 1 dato/.test(el.textContent ?? ''))
    ).toBeTruthy()
    const continua = screen.getByRole('button', { name: /^Continua/i })
    expect(continua.hasAttribute('disabled') || continua.getAttribute('aria-disabled') === 'true').toBe(false)
  })

  // 🔴 LA FORMA D'INPUT PIÙ INSIDIOSA: corretta e poi RIMESSA com'era.
  //    Non è una correzione — mandarla produrrebbe un documento identico a
  //    quello di oggi, che è esattamente ciò che il testo del tasto spento
  //    dichiara inutile.
  it('🛑 una riga rimessa al valore di prima NON è una correzione: il tasto torna spento', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    correggiDescrizione('Corona in zirconia su 26')

    expect(screen.queryByText('Da rifare')).toBeNull()
    const continua = screen.getByRole('button', { name: /^Continua/i })
    expect(continua.hasAttribute('disabled') || continua.getAttribute('aria-disabled') === 'true').toBe(true)
  })

  // ⚖️ D320 — da questo foglio si cambia QUALE PERSONA, mai come si chiama.
  it('🛑 la riga del paziente NON ha un campo di testo: si sceglie un\'altra persona (D320)', async () => {
    fingiFetchInstradato({ pazienti: { pazienti: [{ id: ALTRO_PAZIENTE_ID, codice_paziente: 'PZ-0117', alias: 'Maria Rossi', ultimoLavoro: null }] } })
    montaComponente()
    apriPassoCorrezione()
    apriRiga('Paziente')

    expect(screen.getByText('Quale paziente?')).toBeTruthy()
    // 🛑 UN SOLO campo scrivibile, ed è la RICERCA. Un `queryByLabelText('Nome
    //    del paziente')` sarebbe stato vero anche in una pagina vuota: qui si
    //    conta, così un campo «nome» aggiunto un domani accende la prova.
    const scrivibili = screen.getAllByRole('textbox')
    expect(scrivibili.length).toBe(1)
    expect(screen.getByLabelText('Cerca per cognome o codice')).toBe(scrivibili[0])
    expect(screen.getByText(/Per correggere come è scritto un nome/i)).toBeTruthy()
  })

  // 🔴 IL DIFETTO ③ DEL TASK B, GIÀ PAGATO: la chiave si chiama come la colonna
  //    denormalizzata (`["26"]`) e invita a mandare quella. Il contratto vuole
  //    il carico della PENNA: oggetti `{fdi, ruolo, …}`.
  it('🛑 i denti viaggiano come OGGETTI {fdi, ruolo}, mai come la lista di stringhe', async () => {
    const spia = fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    apriRiga('Denti')
    fireEvent.click(screen.getByRole('button', { name: /^Dente 27/ }))
    fireEvent.click(screen.getByRole('button', { name: /Usa questo/i }))
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    const corpo = corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[0])
    const denti = (corpo.correzioni as Record<string, unknown>).denti_coinvolti as Record<string, unknown>[]
    expect(Array.isArray(denti)).toBe(true)
    expect(typeof denti[0]).toBe('object')
    expect(denti.map((d) => d.fdi).sort()).toEqual([26, 27])
    // 🔑 E IL COLORE PER DENTE NON SI PERDE: la penna SOSTITUISCE l'elenco
    //    intero, quindi mandare `{fdi, ruolo}` e basta cancellerebbe la scala e
    //    il codice del dente che resta.
    const ventisei = denti.find((d) => d.fdi === 26)!
    expect(ventisei.scala).toBe('vita_classical')
    expect(ventisei.codice).toBe('A3')
  })

  // 🛑 «Una casella non si può SVUOTARE» — e a schermo va detto PRIMA, non
  //    scoperto con un 422 (`correzioni.ts:242-252`, voce 6 Allegato XIII).
  it('🛑 una caratteristica prescritta non si può svuotare, e lo dice prima', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    apriRiga('Caratteristiche prescritte')

    expect(screen.getByText(/Una casella non si può svuotare/i)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Colore'), { target: { value: '   ' } })
    const usa = screen.getByRole('button', { name: /Usa questo/i })
    expect(usa.hasAttribute('disabled') || usa.getAttribute('aria-disabled') === 'true').toBe(true)
  })

  it('🛑 e nemmeno i denti si possono azzerare: il tasto si spegne col suo perché', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    apriRiga('Denti')
    // Il 26 è l'unico elemento: toglierlo lascia la lista vuota, che la rotta
    // rifiuta con un 422 («la correzione di "denti_coinvolti" è vuota»).
    fireEvent.click(screen.getByRole('button', { name: /^Dente 26/ }))
    const usa = screen.getByRole('button', { name: /Usa questo/i })
    expect(usa.hasAttribute('disabled') || usa.getAttribute('aria-disabled') === 'true').toBe(true)
  })

  // ⚖️ D316 · D320 — il blocco «Da qui non si corregge» nomina DUE cose, e
  //    ognuna porta la sua destinazione.
  it('🛑 «Da qui non si corregge» nomina il laboratorio E il nome del paziente, con la strada', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()

    expect(screen.getByText(/Da qui non si corregge/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Impostazioni/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Anagrafica/i })).toBeTruthy()
    expect(screen.getByText(/così vale per tutti i suoi lavori/i)).toBeTruthy()
  })

  it('🛑 e quelle due vie navigano con `useNavigaDaOverlay`, mai con un push nudo', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    fireEvent.click(screen.getByRole('button', { name: /Anagrafica/i }))

    expect(navigaMock).toHaveBeenCalledWith(`/pazienti/${PAZIENTE_ID}`)
    expect(pushMock).not.toHaveBeenCalled()
  })

  // ⚖️ Passo 5 — NIENTE si salva prima del tocco finale.
  it('🛑 monta, corregge, SMONTA: nessuna scrittura sul server', () => {
    const spia = fingiFetchInstradato()
    const { unmount } = montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    unmount()

    expect(chiamateA(spia, '/eventi-qualita').length).toBe(0)
    expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(0)
  })

  // ⚖️ Passo 6 — DUE chiamate in fila, e il gettone viaggia INTATTO.
  it('🛑 il tocco finale sono DUE chiamate in fila, e il gettone NON si riparsa', async () => {
    const spia = fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    expect(chiamateA(spia, '/eventi-qualita').length).toBe(1)
    // L'ordine: prima nasce l'evento, poi si rifà la carta.
    expect(String(spia.mock.calls[0][0])).toContain('/eventi-qualita')

    const corpo = corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[0])
    expect(corpo.evento_id).toBe(RISPOSTA_OK.evento.id)
    expect(corpo.correzioni).toEqual({ descrizione: 'Corona in zirconia su 36' })
    // 🛑 IDENTICO, microsecondi compresi: un `new Date(...)` qui darebbe
    //    `2026-08-08T10:20:30.123Z` e un 409 che non si sana nemmeno ricaricando.
    expect(corpo.atteso_updated_at).toBe(GETTONE)
  })

  it('più voci corrette insieme viaggiano nella STESSA chiamata', async () => {
    const spia = fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    apriRiga('Chi ha prescritto')
    fireEvent.change(screen.getByLabelText('Come deve dire il documento'), { target: { value: 'Dott.ssa Anna Neri' } })
    fireEvent.click(screen.getByRole('button', { name: /Usa questo/i }))
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    const corpo = corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[0])
    expect(corpo.correzioni).toEqual({
      descrizione: 'Corona in zirconia su 36',
      richiedente_nome: 'Dott.ssa Anna Neri',
    })
  })

  // 🛑 L'EVENTO SI TIENE NELLO STATO E SI RIUSA: crearne uno nuovo a ogni
  //    tentativo lascerebbe eventi orfani, e toglierebbe senso alla porta
  //    d'idempotenza della rotta.
  it('🛑 se la riemissione fallisce, il ritentativo RIUSA l\'evento invece di crearne un altro', async () => {
    const spia = fingiFetchInstradato({
      riemetti: { ok: false, stato: 500, corpo: { error: 'Non sono riuscita a rifare la dichiarazione: riprova fra un momento.' } },
    })
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: /Correggi e rifai la dichiarazione/i }))

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(2))
    // 🔑 L'asserzione che conta è il CONTO delle registrazioni, non la presenza
    //    di `evento_id` nel corpo: un evento nuovo lo porterebbe lo stesso.
    expect(chiamateA(spia, '/eventi-qualita').length).toBe(1)
    const secondo = corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[1])
    expect(secondo.evento_id).toBe(RISPOSTA_OK.evento.id)
  })

  // ⚖️ Passo 7 — gli errori si LEGGONO: la rotta li scrive per chi sta al banco.
  it('🛑 il 409 si mostra com\'è scritto dalla rotta, non come «qualcosa è andato storto»', async () => {
    const messaggio = 'Qualcun altro ha toccato questo lavoro mentre stavi correggendo: ricarica e rifai la correzione sui valori aggiornati.'
    fingiFetchInstradato({ riemetti: { ok: false, stato: 409, corpo: { error: messaggio } } })
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()

    await waitFor(() => expect(screen.getAllByText(messaggio).length).toBeGreaterThan(0))
    // 🛑 E IL TASTO SI CHIUDE, col messaggio della rotta come motivo: la rotta
    //    rende e CARICA il PDF prima della transazione, quindi ogni tocco in più
    //    su un gettone stantìo brucia un altro progressivo e non può riuscire.
    const tasto = screen.getByRole('button', { name: /Correggi e rifai la dichiarazione/i })
    expect(tasto.hasAttribute('disabled') || tasto.getAttribute('aria-disabled') === 'true').toBe(true)
  })

  it('🛑 il 422 si mostra col PERCORSO dentro: chi sta al banco deve sapere QUALE casella', async () => {
    const messaggio = 'La correzione di «prescrizione_caratteristiche.colore» è vuota: un campo svuotato finirebbe sul documento come un\'informazione mancante.'
    fingiFetchInstradato({ riemetti: { ok: false, stato: 422, corpo: { error: messaggio } } })
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()

    await waitFor(() => expect(screen.getAllByText(messaggio).length).toBeGreaterThan(0))
  })

  it('un corpo illeggibile non lascia la persona senza niente: resta il messaggio di casa', async () => {
    fingiFetchInstradato({ riemetti: { ok: false, stato: 500, illeggibile: true } })
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()

    await waitFor(() => expect(screen.getAllByText(/Non sono riuscita a rifare la dichiarazione/i).length).toBeGreaterThan(0))
  })

  it('riuscita, la schermata NOMINA la dichiarazione nuova e dice che la vecchia resta in archivio', async () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()

    await waitFor(() => expect(screen.getAllByText(/DDC-2026-0043/).length).toBeGreaterThan(0))
    expect(screen.getByText(/DDC-2026-0042/)).toBeTruthy()
    expect(screen.getByText(/resta in archivio come superata/i)).toBeTruthy()
  })
})
