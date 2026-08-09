import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { DevoIntervenire } from '@/components/features/lavori/scheda-v3/DevoIntervenire'
// 🔑 IL VOCABOLARIO SI PRENDE, NON SI RICOPIA: la prova sul tipo di dispositivo
//    chiede che il carico sia uno degli slug veri, e se un giorno l'elenco
//    cambia è questa la riga che lo segue.
import { LABEL_MACRO, MACRO_SLUGS } from '@/lib/domain/tipi-lavoro'

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
    // 🔄 QUI C'ERA «Continua», E LA PROVA ERA VERDE SU UN CORPO CHE LA ROTTA
    //    RIFIUTA. Questo motivo passa dal bivio (D304) e la rotta pretende
    //    `scelta_intervento` (`eventi-qualita/route.ts:259-262`): finché il
    //    `fetch` è finto, un contratto rotto col server non si vede da qui.
    scegliNelBivio('si_sistema')

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
    // 🔄 Era «Continua»: su questo motivo il bivio è dovuto (v. il riquadro sopra).
    scegliNelBivio('si_sistema')

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
    // 🔄 Era «Continua»: su questo motivo il bivio è dovuto (v. il riquadro sopra).
    scegliNelBivio('si_sistema')
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

    // 🔄 IL TITOLO COMINCIAVA CON «Ma», e la parola aveva un antecedente:
    //    «Registrato» stava sopra. Col Passo 5 del Task 9 l'ordine si inverte e
    //    questo riquadro è il PRIMO della schermata — un «Ma» in cima non si
    //    regge su niente. Il testo cambia perché è cambiato ciò che ha davanti.
    await waitFor(() => expect(screen.getAllByText('Il lavoro non è tornato indietro').length).toBeGreaterThan(0))
    expect(screen.getByText('Riportalo tu fra quelli pronti.')).toBeTruthy()
  })

  it('🛑 «non applicabile» NON si mostra come un guasto: non lo è', async () => {
    fingiFetch({ ...RISPOSTA_OK, esito_azione: { stato: 'non_applicabile', motivo: 'non_consegnato' } })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /No, è sempre rimasto qui/i }))

    await waitFor(() => expect(screen.getAllByText('Il lavoro non era da riportare indietro').length).toBeGreaterThan(0))
    expect(screen.queryByText('Il lavoro non è tornato indietro')).toBeNull()
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
    // 🔄 Era «Continua»: su questo motivo il bivio è dovuto (v. il riquadro sopra).
    scegliNelBivio('si_sistema')
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
    // 🔄 Era «Continua»: su questo motivo il bivio è dovuto (v. il riquadro sopra).
    scegliNelBivio('si_sistema')
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

  // 🔑 QUESTA PROVA NASCE DALL'ENUMERAZIONE DELLE FORME, non da un'intuizione:
  //    mettendo in fila le forme d'input delle sei voci è saltato fuori che il
  //    ramo dei TESTI di `perche()` non era sorvegliato da niente. Il carico
  //    era comunque al sicuro (`componi()` rifiuta un testo vuoto una seconda
  //    volta), ma la SPIEGAZIONE a schermo no — e la promessa è che si dica
  //    prima, invece di scoprirlo con un 422 a PDF già reso.
  it('🛑 nemmeno la descrizione si può svuotare, e il tasto lo dice prima', () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    apriRiga('Descrizione')
    fireEvent.change(screen.getByLabelText('Come deve dire il documento'), { target: { value: '   ' } })

    const usa = screen.getByRole('button', { name: /Usa questo/i })
    expect(usa.hasAttribute('disabled') || usa.getAttribute('aria-disabled') === 'true').toBe(true)
    expect(screen.getByText(/non si può svuotare/i)).toBeTruthy()
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

  // ══════════════════════════════════════════════════════════════════════════
  //  ⚖️ D323 — IL FOGLIO RACCOGLIE IL GETTONE CHE IL SERVER GIÀ GLI MANDA
  //
  //  La rotta restituisce `updated_at` sul SUCCESSO e sul 409, col commento che
  //  dice perché: «senza, una seconda correzione di fila troverebbe sempre un
  //  conflitto». Fino a D323 il foglio leggeva solo `numero` e
  //  `numero_superato`, e li buttava tutti e due — il modello in casa è
  //  `ModificaColoreSheet`, che il gettone lo tiene in stato e lo fa avanzare.
  //
  //  🛑 E IL GETTONE NON SI RICONVERTE MAI: `timestamptz` ha i microsecondi,
  //     `Date` di JS no. Un solo `new Date(...).toISOString()` tronca `.123456`
  //     a `.123` e il confronto non torna più uguale: 409 permanente.
  // ══════════════════════════════════════════════════════════════════════════

  it('🔴 dopo una riemissione riuscita il gettone AVANZA: la seconda correzione parte da quello nuovo', async () => {
    const spia = fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()
    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    expect(corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[0]).atteso_updated_at).toBe(GETTONE)

    // Si porta a termine il giro e si chiude il foglio, come farebbe una persona.
    fireEvent.click(screen.getByRole('button', { name: 'Registra' }))
    await waitFor(() => expect(screen.getAllByText(/Registrato/).length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'Ho capito' }))

    // Secondo intervento sullo stesso lavoro, senza ricaricare la pagina.
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 37')
    arrivaAlToccoFinale()
    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(2))

    // 🔑 LA RIGA CHE VALE: col gettone di partenza questa seconda correzione
    //    prenderebbe un 409 garantito, perché la prima ha scritto su `lavori`.
    expect(corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[1]).atteso_updated_at)
      .toBe(RIEMISSIONE_OK.updated_at)
    // …e viaggia INTATTO, microsecondi compresi.
    expect(corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[1]).atteso_updated_at)
      .toMatch(/\.\d{6}/)
  })

  it('🔴 sul 409 il foglio raccoglie il gettone fresco, e il tentativo dopo parte da quello', async () => {
    const FRESCO = '2026-08-08T12:34:56.654321+00:00'
    const spia = fingiFetchInstradato({
      riemetti: { ok: false, stato: 409, corpo: { error: 'Qualcun altro ha toccato questo lavoro mentre stavi correggendo.', updated_at: FRESCO } },
    })
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()
    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))

    fireEvent.click(screen.getByRole('button', { name: /Ricarica e riprendi/i }))
    apriPassoCorrezione()
    fireEvent.click(screen.getByRole('button', { name: /^Continua/i }))
    fireEvent.click(screen.getByRole('button', { name: /Correggi e rifai la dichiarazione/i }))

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(2))
    expect(corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[1]).atteso_updated_at).toBe(FRESCO)
  })

  // ══════════════════════════════════════════════════════════════════════════
  //  🔴 «RICARICA E RIPRENDI» MENTEVA: cancellava le correzioni appena digitate
  //     (`ricomincia()` faceva `setCorrezioni({})`). Non riprendeva: azzerava.
  //     Il costo vero di ogni conflitto era **un giro intero da ridigitare**.
  // ══════════════════════════════════════════════════════════════════════════
  it('🔴 «Ricarica e riprendi» TIENE le correzioni digitate: riprende davvero', async () => {
    const spia = fingiFetchInstradato({
      riemetti: { ok: false, stato: 409, corpo: { error: 'Qualcun altro ha toccato questo lavoro mentre stavi correggendo.' } },
    })
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()
    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))

    fireEvent.click(screen.getByRole('button', { name: /Ricarica e riprendi/i }))
    // Ricarica davvero: la pagina si rinfresca, e con lei i valori mostrati.
    expect(refreshMock).toHaveBeenCalled()

    apriPassoCorrezione()
    // 🔑 La correzione è ancora lì, con la sua pastiglia: non si ridigita niente.
    expect(screen.getByText('Corona in zirconia su 36')).toBeTruthy()
    expect(screen.getByText('Da rifare')).toBeTruthy()
  })

  it('🛑 e il tasto torna premibile: il conflitto non resta appiccicato al foglio', async () => {
    const spia = fingiFetchInstradato({
      riemetti: { ok: false, stato: 409, corpo: { error: 'Qualcun altro ha toccato questo lavoro mentre stavi correggendo.' } },
    })
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()
    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))

    fireEvent.click(screen.getByRole('button', { name: /Ricarica e riprendi/i }))
    apriPassoCorrezione()
    fireEvent.click(screen.getByRole('button', { name: /^Continua/i }))
    const tasto = screen.getByRole('button', { name: /Correggi e rifai la dichiarazione/i })
    expect(tasto.hasAttribute('disabled') || tasto.getAttribute('aria-disabled') === 'true').toBe(false)
  })

  // 🛑 L'ALTRA USCITA NON DEVE TENERE NIENTE: chiudere il foglio (o rispondere
  //    «ho premuto per sbaglio») è una rinuncia dichiarata, e portarsi dietro le
  //    correzioni di un intervento abbandonato dentro il successivo sarebbe la
  //    stessa famiglia di difetto al contrario.
  it('🛑 chiudere il foglio invece BUTTA le correzioni: è una rinuncia, non una ripresa', async () => {
    fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    fireEvent.click(screen.getByRole('button', { name: /^Continua/i }))
    // Dal passo delle quattro caselle si torna indietro chiudendo: `onChiudi`.
    fireEvent.keyDown(document, { key: 'Escape' })

    apriPassoCorrezione()
    expect(screen.queryByText('Da rifare')).toBeNull()
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

  // ════════════════════════════════════════════════════════════════════════
  //  TASK D-ter ① — I CARICHI CHE PARTONO DAVVERO
  //
  //  🔴 LE CINQUE PROVE QUI SOTTO NASCONO DA UN BUCO MISURATO, non da uno
  //  scrupolo. La revisione indipendente del Task D ha rotto il codice di
  //  produzione in cinque punti che avrebbero dovuto accendere qualcosa —
  //  `paziente_id` mandato come nome, `elementi` come stringhe, l'oggetto
  //  delle caratteristiche mandato fuso, il tipo mandato come etichetta,
  //  `stato_dispositivo` ricablato — e **tutte e cinque le volte 45 prove su
  //  45 sono restate verdi**.
  //  🔑 Il codice era ed è giusto: era la RETE ad avere i buchi. Delle sei voci
  //  correggibili, solo tre avevano un'asserzione sul CARICO CHE PARTE
  //  (`descrizione`, `richiedente_nome`, `denti_coinvolti`). Queste chiudono le
  //  altre tre, più il corpo dell'evento del percorso nuovo.
  //  🛑 «La funzione è stata chiamata» non è una di queste asserzioni: si
  //  guarda che cosa c'era DENTRO il corpo.
  // ════════════════════════════════════════════════════════════════════════

  // ⚖️ D320 — da questo foglio si cambia QUALE PERSONA. Il contratto vuole
  //    l'identificativo; il nome è solo ciò che si legge.
  it('🔴 il paziente viaggia come UUID, mai come il nome che si legge a schermo (D320)', async () => {
    const spia = fingiFetchInstradato({
      pazienti: { pazienti: [{ id: ALTRO_PAZIENTE_ID, codice_paziente: 'PZ-0117', alias: 'Maria Rossi', ultimoLavoro: null }] },
    })
    montaComponente()
    apriPassoCorrezione()
    apriRiga('Paziente')
    fireEvent.change(screen.getByLabelText('Cerca per cognome o codice'), { target: { value: 'ros' } })
    await waitFor(() => expect(screen.getByRole('button', { name: /Maria Rossi/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Maria Rossi/ }))
    fireEvent.click(screen.getByRole('button', { name: /Usa questo/i }))
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    const correzioni = corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[0]).correzioni as Record<string, unknown>
    expect(correzioni.paziente_id).toBe(ALTRO_PAZIENTE_ID)
    // 🛑 È un UUID, e la forma si controlla: la rotta lo cerca in anagrafica
    //    (`…/riemetti:341-346`), un nome non troverebbe nessuno.
    expect(String(correzioni.paziente_id)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(correzioni.paziente_id).not.toBe('Maria Rossi')
  })

  // 🔴 F2 — `tipo_dispositivo` entra nell'atto unico come TESTO LIBERO
  //    (`correzioni.ts:75-79`): l'unico argine è la CHECK di banca dati, che
  //    scatta DOPO che il PDF è stato reso e caricato — file orfano e
  //    progressivo bruciato. La schermata lo chiude in pratica offrendo solo
  //    gli slug, e questa prova è ciò che tiene ferma quella promessa.
  it('🔴 il tipo di dispositivo viaggia come SLUG del vocabolario, mai come l\'etichetta (F2)', async () => {
    const spia = fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    apriRiga('Tipo di dispositivo')
    fireEvent.click(screen.getByRole('button', { name: 'Protesi mobile' }))
    fireEvent.click(screen.getByRole('button', { name: /Usa questo/i }))
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    const correzioni = corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[0]).correzioni as Record<string, unknown>
    expect(correzioni.tipo_dispositivo).toBe('protesi_mobile')
    expect(MACRO_SLUGS).toContain(correzioni.tipo_dispositivo)
    // L'etichetta è un'altra cosa, e su questa riga è proprio la forma sbagliata.
    expect(correzioni.tipo_dispositivo).not.toBe(LABEL_MACRO.protesi_mobile)
  })

  // 🔴 LA TRAPPOLA DEL TASK D, e la sua unica prova. Il resoconto del Task D
  //    dedica trecento parole a spiegare che `elementi` è `number[]` e che un
  //    campo di testo lì avrebbe preso 422 A OGNI INVIO — e poi chiude il
  //    ritrovamento con ZERO asserzioni. La cosa dichiarata più a voce alta era
  //    quella rimasta senza guardiano.
  // 🔑 L'asserzione è una `toEqual` sull'OGGETTO INTERO, non una spunta su
  //    `elementi`: così cade sia chi manda le stringhe, sia chi manda l'oggetto
  //    fuso al posto delle sole sotto-chiavi cambiate.
  it('🔴 delle caratteristiche prescritte parte SOLO la sotto-chiave cambiata, e «elementi» sono NUMERI', async () => {
    const spia = fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    apriRiga('Caratteristiche prescritte')
    fireEvent.click(screen.getByRole('button', { name: /^Dente 27/ }))
    fireEvent.click(screen.getByRole('button', { name: /Usa questo/i }))
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    const correzioni = corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[0]).correzioni as Record<string, unknown>
    // 🛑 Niente `colore`: la penna scrive una `jsonb_set` alla volta, e mandare
    //    l'oggetto fuso riscriverebbe una sotto-chiave che nessuno ha toccato.
    expect(correzioni.prescrizione_caratteristiche).toEqual({ elementi: [26, 27] })
  })

  // 🔑 «Solo le sotto-chiavi cambiate» ha DUE direzioni, e la revisione ne ha
  //    sondata una sola: qui si guarda l'altra.
  it('🔴 e cambiando il solo colore, «elementi» NON viaggia affatto', async () => {
    const spia = fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    apriRiga('Caratteristiche prescritte')
    fireEvent.change(screen.getByLabelText('Colore'), { target: { value: 'B2' } })
    fireEvent.click(screen.getByRole('button', { name: /Usa questo/i }))
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    const correzioni = corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[0]).correzioni as Record<string, unknown>
    expect(correzioni.prescrizione_caratteristiche).toEqual({ colore: 'B2' })
  })

  // 🔴 IL DIFETTO DEL TASK A, CHE PUÒ RINASCERE SULLA STRADA NUOVA. La prova di
  //    lessico del Task A copre il solo percorso corto — questo percorso allora
  //    non esisteva. Il corpo dell'evento del tocco finale non era sorvegliato
  //    da nessuna asserzione: solo dal suo CONTEGGIO. Ricablare
  //    `mai_uscito_dal_lab` qui è l'app che AFFERMA al posto della persona che
  //    il manufatto non è mai uscito — e quel motivo annulla la dichiarazione
  //    (D293 · Art. 21(2) MDR).
  // 🔑 `motivo` si asserisce insieme, e non è pleonasmo: senza, un domani
  //    qualcuno potrebbe far passare questo tocco dal percorso corto e la prova
  //    resterebbe verde mentre la bugia torna.
  it('🔴 sul percorso NUOVO lo stato del manufatto è quello DICHIARATO, mai cablato a «mai uscito» (Task A)', async () => {
    const spia = fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    fireEvent.click(screen.getByRole('button', { name: /^Continua/i }))
    // La persona risponde: il manufatto era già applicato.
    fireEvent.click(screen.getByRole('button', { name: 'Già applicato' }))
    fireEvent.click(screen.getByRole('button', { name: /Correggi e rifai la dichiarazione/i }))

    await waitFor(() => expect(chiamateA(spia, '/eventi-qualita').length).toBe(1))
    const corpo = corpoDi(chiamateA(spia, '/eventi-qualita')[0])
    expect(corpo.motivo).toBe('errore_dato_dichiarazione')
    expect(corpo.stato_dispositivo).toBe('applicato')
    expect(corpo.stato_dispositivo).not.toBe('mai_uscito_dal_lab')
    // Sul percorso lungo il potenziale di danno si CHIEDE e si manda.
    expect(corpo.potenziale_di_danno).toBe('da_valutare')
  })

  // ════════════════════════════════════════════════════════════════════════
  //  TASK D-ter ③ — DOPO IL CONFLITTO NON SI RESTA IN UN VICOLO CIECO
  // ════════════════════════════════════════════════════════════════════════

  // 🔴 Il fatto: il 409 spegne il tasto — ed è giusto — ma dal passo delle
  //    quattro caselle non c'era NESSUNA via di ritorno. L'unica uscita era
  //    chiudere il foglio, che azzerava l'evento: **un evento orfano in più a
  //    ogni ritentativo**, proprio sul percorso di fallimento più frequente.
  it('🔴 dopo un 409 c\'è una via d\'uscita, e la schermata dice che la registrazione non si perde', async () => {
    const messaggio = 'Qualcun altro ha toccato questo lavoro mentre stavi correggendo: ricarica e rifai la correzione sui valori aggiornati.'
    fingiFetchInstradato({ riemetti: { ok: false, stato: 409, corpo: { error: messaggio } } })
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()

    await waitFor(() => expect(screen.getAllByText(messaggio).length).toBeGreaterThan(0))
    // 🛑 La causa resta quella della ROTTA, mostrata com'è scritta: la schermata
    //    non ne inventa una propria, perché i 409 di quella rotta sono sei e si
    //    distinguono solo a parole.
    expect(screen.getByRole('button', { name: /Ricarica e riprendi/i })).toBeTruthy()
    expect(screen.getByText(/resta registrato: riprendendo da qui non se ne registra una seconda/i)).toBeTruthy()
  })

  it('🔴 e riprendendo dopo il 409 la registrazione si RIUSA: mai un evento orfano per tentativo', async () => {
    const spia = fingiFetchInstradato({
      riemetti: { ok: false, stato: 409, corpo: { error: 'Qualcun altro ha toccato questo lavoro.' } },
    })
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))
    expect(chiamateA(spia, '/eventi-qualita').length).toBe(1)

    // La via d'uscita chiude il foglio e rinfresca la pagina: è così che
    // arrivano i valori nuovi e il gettone nuovo.
    fireEvent.click(screen.getByRole('button', { name: /Ricarica e riprendi/i }))
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Che cosa c\'è di sbagliato?')).toBeNull()

    // Si ricomincia da capo, sui valori aggiornati.
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(2))
    // 🔑 L'ASSERZIONE CHE CONTA: le registrazioni restano UNA. Prima di questa
    //    correzione erano due, e la seconda non l'avrebbe vista nessuno.
    expect(chiamateA(spia, '/eventi-qualita').length).toBe(1)
    expect(corpoDi(chiamateA(spia, '/dichiarazione/riemetti')[1]).evento_id).toBe(RISPOSTA_OK.evento.id)
  })

  // 🛑 E L'EVENTO NON SI RIUSA PER SEMPRE: quando la carta è stata rifatta,
  //    quell'evento ha finito il suo lavoro. Un intervento successivo è un
  //    fatto NUOVO e vuole la sua riga nel registro di qualità.
  it('🛑 dopo una riemissione riuscita, un secondo intervento registra un evento NUOVO', async () => {
    const spia = fingiFetchInstradato()
    montaComponente()
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 36')
    arrivaAlToccoFinale()
    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(1))

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
    apriPassoCorrezione()
    correggiDescrizione('Corona in zirconia su 46')
    arrivaAlToccoFinale()

    await waitFor(() => expect(chiamateA(spia, '/dichiarazione/riemetti').length).toBe(2))
    expect(chiamateA(spia, '/eventi-qualita').length).toBe(2)
  })
})

// ══════════════════════════════════════════════════════════════════════════
//  TASK 9 — IL BIVIO DEI DUE DIFETTI, E LA SCHERMATA FINALE
//
//  Il fatto che le ha generate, misurato prima di scriverle: sul foglio
//  `grep -c "scelta_intervento" DevoIntervenire.tsx` dava **0**, mentre la
//  rotta la PRETENDE sui due difetti (`eventi-qualita/route.ts:259-262`).
//  ➡️ Due motivi su nove rispondevano 422 e la persona vedeva un errore.
//
//  🛑 E LE PROVE DI QUESTO STESSO FILE ERANO VERDI SU QUEL CORPO: cinque
//  premevano «Continua» su «Difetto di lavorazione» senza nessuna scelta e
//  passavano, perché il `fetch` è finto e non ha la guardia della rotta. Una
//  prova che finge il server non può vedere un contratto rotto col server.
//
//  📋 FORME D'INGRESSO CENSITE (R-P4) — quelle del CORPO che il foglio compone:
//   ① motivo del bivio + scelta valida → la chiave c'è, col valore scelto
//   ② motivo del bivio + NESSUNA scelta → il corpo non parte affatto (tasto
//      spento): è il modo in cui «chiave assente su un motivo che la pretende»
//      non può nascere da questa schermata
//   ③ motivo FUORI dal bivio → la chiave è **assente**, mai `null` (`null`
//      esplicito prende 422 dalla rotta, `:264-268`)
//   ④ `errore_registrazione`, percorso corto → chiave assente
//   ⑤ `errore_dato_dichiarazione`, l'atto unico → chiave assente
//   ⑥ una scelta fuori vocabolario → **non coperta, e perché**: le uniche due
//      voci a schermo vengono da `SCELTA_UI`, che è un `Record<Scelta, …>` —
//      una terza voce non compila. Il vocabolario lo sorveglia `tsc`, non una
//      prova di interfaccia.
//
//  📋 E quelle della RISPOSTA che la schermata finale deve rendere: `esito_azione`
//  assente · `applicato` × due azioni · `applicato` senza `lavoro_nuovo` ·
//  `non_applicabile` × due azioni · `fallito` × due azioni · `fallito` senza
//  `messaggio`. La combinazione `azione: null` **con** `esito_azione` non è
//  coperta: la rotta non la produce (`route.ts:455-462` popola il campo solo
//  quando un'azione c'è).
// ══════════════════════════════════════════════════════════════════════════

/** Il bivio: si sceglie, e poi il tasto DICE che cosa fa (mai «Continua»). */
function scegliNelBivio(quale: 'si_sistema' | 'si_rifa') {
  fireEvent.click(
    screen.getByRole('button', {
      name: quale === 'si_sistema' ? 'Si sistema questo manufatto' : /Se ne fa uno nuovo/,
    })
  )
  fireEvent.click(
    screen.getByRole('button', {
      name: quale === 'si_sistema' ? 'Registra e riportalo fra i pronti' : 'Registra e fai il lavoro nuovo',
    })
  )
}

/** La posizione di un testo nel corpo del documento: serve a provare un ORDINE. */
function posizioneDi(frammento: string): number {
  return (document.body.textContent ?? '').indexOf(frammento)
}

describe('DevoIntervenire — il bivio dei due difetti (D304)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  // ① la chiave c'è, col valore scelto — è il difetto che chiude questo task.
  it('🔴 «difetto di lavorazione» + «si sistema» manda `scelta_intervento`, che oggi non partiva affatto', async () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))
    scegliNelBivio('si_sistema')

    await waitFor(() => expect(spia).toHaveBeenCalled())
    const corpo = JSON.parse((spia.mock.calls[0][1] as { body: string }).body) as Record<string, unknown>
    expect(corpo.motivo).toBe('difetto_lavorazione')
    expect(corpo.scelta_intervento).toBe('si_sistema')
  })

  it('e «difetto del materiale» + «se ne fa uno nuovo» manda l\'altra scelta', async () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto del materiale'))
    scegliNelBivio('si_rifa')

    await waitFor(() => expect(spia).toHaveBeenCalled())
    const corpo = JSON.parse((spia.mock.calls[0][1] as { body: string }).body) as Record<string, unknown>
    expect(corpo.motivo).toBe('difetto_materiale')
    expect(corpo.scelta_intervento).toBe('si_rifa')
  })

  // ② senza scelta non si parte: il 422 della rotta non deve MAI essere il modo
  //    in cui la persona scopre che mancava una risposta.
  it('🛑 senza scelta il tasto è spento, e dice che cosa manca — non si scopre con un 422', () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))

    const tasto = screen.getByRole('button', { name: /Continua/i })
    expect(tasto.hasAttribute('disabled') || tasto.getAttribute('aria-disabled') === 'true').toBe(true)
    fireEvent.click(tasto)
    expect(spia).not.toHaveBeenCalled()
  })

  // 🛑 Nessuna delle due è accesa all'apertura: la scelta è una RISPOSTA, e un
  //    default la darebbe al posto della persona — lo stesso difetto del Task A.
  it('🛑 all\'apertura NESSUNA delle due è scelta: l\'app non risponde al posto della persona', () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))

    const sistema = screen.getByRole('button', { name: 'Si sistema questo manufatto' })
    const rifa = screen.getByRole('button', { name: 'Se ne fa uno nuovo — nasce subito un lavoro nuovo' })
    expect(sistema.getAttribute('aria-pressed')).toBe('false')
    expect(rifa.getAttribute('aria-pressed')).toBe('false')

    // 🛑 E LA SECONDA METÀ È QUELLA CHE CONTA (R-P4): senza, questa prova
    //    passerebbe anche su due pastiglie disegnate e non collegate a niente —
    //    misurato, era una delle tre che si accendevano sull'abbozzo inerte.
    fireEvent.click(rifa)
    expect(rifa.getAttribute('aria-pressed')).toBe('true')
    expect(sistema.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(sistema)
    expect(sistema.getAttribute('aria-pressed')).toBe('true')
    expect(rifa.getAttribute('aria-pressed')).toBe('false')
  })

  // ⚖️ Passo 3 — il ramo che BRUCIA un progressivo di anno non può avere il
  //    tasto più debole: le etichette dicono che cosa succede, mai «Continua».
  it('🛑 il tasto finale DICE che cosa fa, e le due strade non hanno la stessa frase', () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))

    fireEvent.click(screen.getByRole('button', { name: 'Si sistema questo manufatto' }))
    expect(screen.getByRole('button', { name: 'Registra e riportalo fra i pronti' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Se ne fa uno nuovo/ }))
    expect(screen.getByRole('button', { name: 'Registra e fai il lavoro nuovo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Registra e riportalo fra i pronti' })).toBeNull()
  })

  // 🔑 IL PERCHÉ NON SI RISCRIVE: viene da `effettoDaMotivoEScelta`, la stessa
  //    funzione che la rotta usa per decidere. Se un giorno cambia il testo,
  //    cambia in un posto solo.
  it('🛑 la conseguenza mostrata è quella di `effettoDaMotivoEScelta`, non un testo ricopiato', async () => {
    const { effettoDaMotivoEScelta } = await import('@/lib/qualita/effetti')
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))

    const perRifa = effettoDaMotivoEScelta('difetto_lavorazione', 'si_rifa').perche
    const perSistema = effettoDaMotivoEScelta('difetto_lavorazione', 'si_sistema').perche

    fireEvent.click(screen.getByRole('button', { name: /Se ne fa uno nuovo/ }))
    expect(screen.getByText(perRifa)).toBeTruthy()
    // 🛑 L'ASSERZIONE CHE RENDE FORTE LA PROVA (R-P4): il testo deve CAMBIARE
    //    con la scelta. Senza questa riga passava anche stampandone uno fisso —
    //    misurato sull'abbozzo inerte.
    expect(screen.queryByText(perSistema)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Si sistema questo manufatto' }))
    expect(screen.getByText(perSistema)).toBeTruthy()
    expect(screen.queryByText(perRifa)).toBeNull()
  })

  // ③ e ④ — la chiave NON si manda dove non ha significato, e nemmeno `null`.
  it('🛑 sugli altri sette motivi la chiave è ASSENTE, mai `null`: `null` prende 422', async () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Prezzo o quantità sbagliati'))
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))

    await waitFor(() => expect(spia).toHaveBeenCalled())
    const corpo = JSON.parse((spia.mock.calls[0][1] as { body: string }).body) as Record<string, unknown>
    expect(Object.hasOwn(corpo, 'scelta_intervento')).toBe(false)
  })

  it('e nemmeno sul percorso corto, che non passa dalle quattro caselle', async () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Ho premuto «consegna» per sbaglio'))
    fireEvent.click(screen.getByRole('button', { name: /No, è sempre rimasto qui/i }))

    await waitFor(() => expect(spia).toHaveBeenCalled())
    const corpo = JSON.parse((spia.mock.calls[0][1] as { body: string }).body) as Record<string, unknown>
    expect(Object.hasOwn(corpo, 'scelta_intervento')).toBe(false)
  })

  // 🛑 Il bivio è dei DUE difetti e di nessun altro: `MOTIVI_CON_SCELTA` è la
  //    fonte, e la schermata non deve inventarsi un terzo motivo con la scelta.
  it('🛑 il bivio compare esattamente sui motivi di `MOTIVI_CON_SCELTA`, e su nessun altro', async () => {
    const { MOTIVI_CON_SCELTA } = await import('@/lib/qualita/effetti')
    const { MOTIVI_UI } = await import('@/lib/qualita/motivi-ui')
    const { MOTIVI } = await import('@/lib/domain/qualita-costanti')

    for (const m of MOTIVI) {
      // Questi due hanno un percorso proprio e non arrivano alle quattro caselle.
      if (m === 'errore_registrazione' || m === 'errore_dato_dichiarazione') continue
      fingiFetch()
      const vista = montaComponente()
      apriElencoMotivi()
      fireEvent.click(screen.getByText(MOTIVI_UI[m].etichetta))
      const cePerLui = screen.queryByRole('button', { name: 'Si sistema questo manufatto' }) !== null
      expect(cePerLui, m).toBe((MOTIVI_CON_SCELTA as readonly string[]).includes(m))
      vista.unmount()
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════
//  TASK 9, PASSO 4 — la combinazione vietata si IMPEDISCE, non si serve come
//  vicolo cieco. La guardia dell'API resta (`route.ts:278-280`): è lì che sta
//  il confine. Questa è la cortesia di dirlo prima del modulo compilato.
// ══════════════════════════════════════════════════════════════════════════

describe('DevoIntervenire — «mai uscito» non si può scegliere su «persona sbagliata» (Passo 4)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('🛑 la pastiglia «Mai uscito» è spenta, e la ragione si legge a schermo', () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('È andato alla persona sbagliata'))

    const mai = screen.getByRole('button', { name: 'Mai uscito' })
    expect(mai.hasAttribute('disabled') || mai.getAttribute('aria-disabled') === 'true').toBe(true)
    expect(screen.getByText(/non può essere andato alla persona sbagliata/)).toBeTruthy()
  })

  it('🛑 e premerla non cambia la risposta: il corpo parte con lo stato di prima', async () => {
    const spia = fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('È andato alla persona sbagliata'))
    fireEvent.click(screen.getByRole('button', { name: 'Mai uscito' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))

    await waitFor(() => expect(spia).toHaveBeenCalled())
    const corpo = JSON.parse((spia.mock.calls[0][1] as { body: string }).body) as Record<string, unknown>
    expect(corpo.stato_dispositivo).not.toBe('mai_uscito_dal_lab')
  })

  // 🛑 E su tutti gli altri motivi la pastiglia resta VIVA: una guardia che
  //    spegne più del dovuto toglie una risposta vera a chi ce l'ha.
  it('🛑 su un altro motivo «Mai uscito» resta scegliibile', () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))

    const mai = screen.getByRole('button', { name: 'Mai uscito' })
    expect(mai.hasAttribute('disabled') || mai.getAttribute('aria-disabled') === 'true').toBe(false)
    fireEvent.click(mai)
    expect(mai.getAttribute('aria-pressed')).toBe('true')
  })
})

// ══════════════════════════════════════════════════════════════════════════
//  TASK 9, PASSO 5 — la schermata finale dice PRIMA che cosa è successo al
//  LAVORO, e la conferma che l'evento è agli atti viene sotto.
// ══════════════════════════════════════════════════════════════════════════

/** Registra un difetto scegliendo `si_rifa`, con la risposta che si vuole. */
function giroBivio(risposta: unknown) {
  fingiFetch(risposta)
  montaComponente()
  apriElencoMotivi()
  fireEvent.click(screen.getByText('Difetto di lavorazione'))
  scegliNelBivio('si_rifa')
}

const RISPOSTA_RIFACIMENTO = {
  ...RISPOSTA_OK,
  effetto: { ...RISPOSTA_OK.effetto, azione: 'crea_rifacimento' },
  esito_azione: {
    stato: 'applicato',
    lavoro_nuovo: { id: '55555555-5555-5555-5555-555555555555', numero_lavoro: '2026-0042' },
  },
}

describe('DevoIntervenire — la schermata finale (Passo 5)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  // ⚖️ Passo 5 ① — l'inversione. Su 390px «Registrato» in cima spingeva
  //    l'unica cosa che conta sotto la piega.
  it('🛑 in cima c\'è che cosa è successo al LAVORO, e «Registrato» viene SOTTO', async () => {
    giroBivio(RISPOSTA_RIFACIMENTO)
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Registra' }))

    await waitFor(() => expect(screen.getByText('È nato il lavoro 2026-0042')).toBeTruthy())
    expect(posizioneDi('È nato il lavoro 2026-0042')).toBeLessThan(posizioneDi('Registrato e valutato'))
  })

  // ⚖️ Passo 5 ② — la via per APRIRLO, e si naviga con `useNavigaDaOverlay`.
  it('🛑 il lavoro nato si può APRIRE, e non con `router.push` (CLAUDE.md §9)', async () => {
    giroBivio(RISPOSTA_RIFACIMENTO)
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Registra' }))

    await waitFor(() => expect(screen.getByText('È nato il lavoro 2026-0042')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Apri il lavoro 2026-0042/i }))
    expect(navigaMock).toHaveBeenCalledWith('/lavori/55555555-5555-5555-5555-555555555555')
    expect(pushMock).not.toHaveBeenCalled()
  })

  // 🛑 Un collegamento MORTO è peggio della sua assenza: se la rotta non ha
  //    mandato il lavoro nuovo, non si disegna nessuna via per aprirlo.
  it('🛑 senza `lavoro_nuovo` non c\'è nessun collegamento da premere', async () => {
    giroBivio({
      ...RISPOSTA_OK,
      effetto: { ...RISPOSTA_OK.effetto, azione: 'crea_rifacimento' },
      esito_azione: { stato: 'applicato' },
    })
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Registra' }))

    await waitFor(() => expect(screen.getByText('È nato un lavoro nuovo')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /Apri il lavoro/i })).toBeNull()
  })

  // 🔴 IL GUASTO NON PUÒ RESTARE MUTO SULLA PROPOSTA. Fra la registrazione e la
  //    schermata finale c'è un passo intero — la valutazione — e in quel passo
  //    il riquadro «E sul lavoro» racconta l'azione al FUTURO («nasce subito un
  //    lavoro nuovo») anche quando NON è nata. È la §8.1 vista dall'altro lato:
  //    fallire senza dirlo. Il modello in casa è `RiquadroRiemissione`, che si
  //    mostra su TUTTI E DUE i passi per la stessa ragione (`:1168` e `:1232`).
  it('🔴 se il lavoro nuovo NON è nato, la proposta lo dice subito — non alla fine', async () => {
    giroBivio({
      ...RISPOSTA_OK,
      effetto: { ...RISPOSTA_OK.effetto, azione: 'crea_rifacimento' },
      esito_azione: { stato: 'fallito', messaggio: 'Crealo dalla scheda, oppure riprova.' },
    })
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    expect(screen.getByText('Il lavoro nuovo non è stato creato')).toBeTruthy()
    expect(screen.getByText('Crealo dalla scheda, oppure riprova.')).toBeTruthy()
  })

  // 🛑 Ma una RIUSCITA non si racconta due volte: sulla proposta il riquadro
  //    «E sul lavoro» dice già che cosa succede, e ripeterlo sarebbe rumore.
  it('🛑 una riuscita NON si ripete sulla proposta: lì parla già «E sul lavoro»', async () => {
    giroBivio(RISPOSTA_RIFACIMENTO)
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    expect(screen.queryByText('È nato il lavoro 2026-0042')).toBeNull()
    expect(screen.getByText('E sul lavoro')).toBeTruthy()
  })

  it('«non applicabile» compare anch\'esso sulla proposta: non è un successo', async () => {
    giroBivio({
      ...RISPOSTA_OK,
      effetto: { ...RISPOSTA_OK.effetto, azione: 'crea_rifacimento' },
      esito_azione: { stato: 'non_applicabile', motivo: 'non_consegnato' },
    })
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    expect(screen.getByText('Non c\'era niente da rifare su questo lavoro')).toBeTruthy()
  })

  // 🛑 Il ripiego quando la rotta non manda un messaggio: mai un riquadro muto.
  it('un guasto senza messaggio porta comunque la sua via d\'uscita', async () => {
    giroBivio({
      ...RISPOSTA_OK,
      effetto: { ...RISPOSTA_OK.effetto, azione: 'crea_rifacimento' },
      esito_azione: { stato: 'fallito' },
    })
    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    // 🔑 Il ripiego dice anche che la REGISTRAZIONE è salva: il messaggio della
    //    rotta lo porta già dentro (`route.ts:510-514`), e senza quello qui
    //    resterebbe solo la metà cattiva della notizia.
    expect(screen.getByText(/La registrazione è salva: crealo dalla scheda/)).toBeTruthy()
  })

  // 🛑 E senza `esito_azione` non si disegna niente: sette motivi su nove non
  //    portano nessuna azione, e un riquadro vuoto sarebbe una promessa.
  it('🛑 senza `esito_azione` non compare nessun riquadro d\'azione', async () => {
    fingiFetch()
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))
    scegliNelBivio('si_sistema')

    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Registra' }))
    await waitFor(() => expect(screen.getByText('Registrato e valutato')).toBeTruthy())
    expect(screen.queryByText(/Il lavoro è tornato fra i pronti/)).toBeNull()
    expect(screen.queryByText(/È nato il lavoro/)).toBeNull()
  })

  it('«si sistema»: il lavoro torna fra i pronti, e la dichiarazione resta valida', async () => {
    fingiFetch({
      ...RISPOSTA_OK,
      effetto: { ...RISPOSTA_OK.effetto, azione: 'torna_pronto' },
      esito_azione: { stato: 'applicato', dichiarazione_viva: true },
    })
    montaComponente()
    apriElencoMotivi()
    fireEvent.click(screen.getByText('Difetto di lavorazione'))
    scegliNelBivio('si_sistema')

    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Registra' }))
    await waitFor(() => expect(screen.getByText('Il lavoro è tornato fra i pronti')).toBeTruthy())
    expect(screen.getByText(/La dichiarazione resta valida/)).toBeTruthy()
    expect(posizioneDi('Il lavoro è tornato fra i pronti')).toBeLessThan(posizioneDi('Registrato e valutato'))
  })
})
