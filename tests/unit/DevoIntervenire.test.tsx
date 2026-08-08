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
