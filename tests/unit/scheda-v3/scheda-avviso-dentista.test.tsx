// tests/unit/scheda-v3/scheda-avviso-dentista.test.tsx
//
// Task 6 dell'ondata «l'avviso al dentista» — IL MONTAGGIO. `AvvisoDentista`
// esiste dal Task 5 con 56 prove verdi e, fino a questo compito, **non era
// agganciato a nessuna schermata: nessuno poteva aprirlo**. Qui si prova il
// CABLAGGIO — che la riga compaia quando deve, che si apra, e che le otto
// proprietà arrivino coi valori giusti.
//
// 🔑 Il comportamento del foglio è già provato in `tests/unit/AvvisoDentista.test.tsx`
//    e non si riprova: queste prove guardano il confine fra la scheda e lui.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, fireEvent, within } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => '/lavori/lav',
}))

import { SchedaLavoroV3 } from '../../../src/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio } from '../../../src/types/domain'
import type { AvvisoRiga } from '../../../src/lib/avvisi/queries'

/** Il numero di casa dello studio: un FISSO. È il campo `telefono`. */
const FISSO_STUDIO = '081 2345678'
/** Il cellulare su cui WhatsApp arriva davvero. È `cellulare_whatsapp`. */
const CELLULARE_STUDIO = '333 1112222'

const AVVISO_APERTO: AvvisoRiga = {
  id: 'avv-1',
  lavoro_id: 'lav',
  cliente_id: 'cli-1',
  dichiarazione_id: 'ddc-2',
  stato: 'da_comunicare',
  campi_corretti: ['descrizione'],
  testo_inviato: null,
  comunicato_at: null,
  comunicato_da: null,
  visto_dal_dentista_at: null,
  created_at: '2026-08-09T10:00:00.000Z',
}

function makeLavoro(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav',
    numero_lavoro: '2026-0147',
    stato: 'consegnato',
    tipo_dispositivo: 'protesi_fissa',
    data_consegna_prevista: '2026-08-20',
    ora_consegna: '16:00',
    descrizione: 'Corona 21',
    paziente_nome_snapshot: 'ROSSI MARIO',
    colore_scala: null,
    colore_codice: null,
    tinta_famiglia: null,
    tinta_codice: null,
    updated_at: '2026-08-09T10:00:00.123456+00:00',
    cliente: {
      id: 'cli-1',
      studio_nome: 'Studio Bianchi',
      nome: 'Ada',
      cognome: 'Bianchi',
      telefono: FISSO_STUDIO,
      cellulare_whatsapp: CELLULARE_STUDIO,
      portale_token: 'gettone-portale-abc',
    },
    paziente: null,
    tecnico: null,
    fasi: [],
    immagini: [],
    lavorazioni: [],
    appuntamenti: [],
    materiali: [],
    ddc: null,
    laboratorio: { nome: 'Laboratorio Formicola', telefono: null },
    ...over,
  } as unknown as LavoroDettaglio
}

/** Apre il foglio dalla riga sulla scheda. */
function apriIlFoglio() {
  fireEvent.click(screen.getByRole('button', { name: /Avvisa il dentista/ }))
}

describe('La riga «Avvisa il dentista» sulla scheda (Task 6)', () => {
  it('senza un avviso aperto la riga NON esiste', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} ruolo="titolare" />)
    expect(screen.queryByText('Avvisa il dentista')).not.toBeInTheDocument()
  })

  it('con un avviso `da_comunicare` la riga c’è, e dice qual è il fatto', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ avvisoDaComunicare: AVVISO_APERTO })} ruolo="titolare" />)
    expect(screen.getByText('Avvisa il dentista')).toBeInTheDocument()
    expect(
      screen.getByText(/La dichiarazione è stata rifatta: Studio Bianchi ha in mano quella vecchia/)
    ).toBeInTheDocument()
  })

  it('🛑 LA CONDIZIONE È UNA SOLA: la riga NON è legata allo stato «consegnato»', () => {
    // Il gemello `DevoIntervenire` è condizionato a `stato === 'consegnato'`
    // (`SchedaLavoroV3.tsx:595`), e quella condizione è SUA. Copiarla qui potrebbe
    // solo NASCONDERE un promemoria che esiste — e il senso di tutta l'ondata è
    // che quel promemoria non si spenga da solo.
    // 🔑 La prova è doppia di proposito: che la riga ci sia, E che «Devo
    //    intervenire» NON ci sia sullo stesso lavoro. Senza la seconda metà, una
    //    guardia copiata per sbaglio resterebbe invisibile.
    render(
      <SchedaLavoroV3
        lavoro={makeLavoro({ stato: 'pronto', avvisoDaComunicare: AVVISO_APERTO } as Partial<LavoroDettaglio>)}
        ruolo="titolare"
      />
    )
    expect(screen.getByText('Avvisa il dentista')).toBeInTheDocument()
    expect(screen.queryByText('Devo intervenire')).not.toBeInTheDocument()
  })

  it('premendo la riga si apre il foglio, sulla domanda sola', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ avvisoDaComunicare: AVVISO_APERTO })} ruolo="titolare" />)
    apriIlFoglio()
    expect(screen.getByText('Come avvisi il dentista?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Glielo mando su WhatsApp/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /L’ho avvisato io, a voce/ })).toBeInTheDocument()
  })

  it('⚖️ D350 — il paziente nel foglio è LO STESSO valore che la scheda mostra dietro, per esteso', () => {
    // La terza deroga al paziente pseudonimizzato vive in UNA riga sola, ed è la
    // riga di `pazienteMostrato` in `SchedaLavoroV3.tsx`. Qui si prova che non
    // esiste una SECONDA derivazione: la carta e il foglio dicono lo stesso nome.
    render(<SchedaLavoroV3 lavoro={makeLavoro({ avvisoDaComunicare: AVVISO_APERTO })} ruolo="titolare" />)
    expect(screen.getByText('ROSSI MARIO')).toBeInTheDocument() // la riga «Paziente» della carta
    apriIlFoglio()
    // 🛑 SI GUARDA DENTRO IL FOGLIO, e non si CONTANO le occorrenze a schermo.
    //    Contarle («devono essere due») legherebbe questa prova a quante volte la
    //    CARTA nomina il paziente — un numero che non ha niente a che fare con
    //    D350: il giorno in cui la scheda lo mostrasse anche in testata, questa
    //    prova diventerebbe rossa parlando di tutt'altro.
    // 🔑 `role="dialog"` è la marca sui DUE rami dello `Sheet`, quello animato e
    //    `SheetRidotto` (v. `AvvisoDentista.tsx:333`): l'àncora regge anche a
    //    movimento ridotto.
    const foglio = screen.getByRole('dialog')
    expect(within(foglio).getByText('ROSSI MARIO')).toBeInTheDocument()
  })

  it('🔴 il collegamento WhatsApp porta il CELLULARE dello studio, mai il fisso', () => {
    // `AvvisoDentista.tsx:268-269` documenta la proprietà `telefonoStudio` come
    // «`clienti.telefono`»: è il campo SBAGLIATO, e la regola di casa è scritta
    // in `src/types/domain.ts:174-176` — «chi manda WhatsApp legge SEMPRE
    // `cellulare_whatsapp`, mai `telefono`, altrimenti il messaggio riparte su un
    // fisso». Questa prova è ciò che tiene il cablaggio dalla parte giusta.
    render(<SchedaLavoroV3 lavoro={makeLavoro({ avvisoDaComunicare: AVVISO_APERTO })} ruolo="titolare" />)
    apriIlFoglio()
    fireEvent.click(screen.getByRole('button', { name: /Glielo mando su WhatsApp/ }))

    const collegamento = screen.getByRole('link', { name: /WhatsApp/ })
    const href = collegamento.getAttribute('href') ?? ''
    expect(href).toContain('wa.me/393331112222')
    expect(href).not.toContain('390812345678')
  })

  it('le altre proprietà arrivano dai campi veri: numero del lavoro, gettone del portale, nome del laboratorio', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ avvisoDaComunicare: AVVISO_APERTO })} ruolo="titolare" />)
    apriIlFoglio()
    fireEvent.click(screen.getByRole('button', { name: /Glielo mando su WhatsApp/ }))

    // Il messaggio proposto è composto da `buildAvvisoMessage` con i tre dati che
    // la scheda le passa: se uno arrivasse vuoto, il testo lo direbbe qui.
    const campo = screen.getByLabelText('Il messaggio che manderai') as HTMLTextAreaElement
    expect(campo.value).toContain('2026-0147')
    expect(campo.value).toContain('gettone-portale-abc')
    expect(campo.value).toContain('Laboratorio Formicola')
    // 🛑 GDPR — e la deroga di D350 NON si estende di un millimetro a WhatsApp.
    expect(campo.value).not.toContain('ROSSI MARIO')
  })
})

describe('⚖️ D342 — chi VEDE la riga, e il cancello sta nel componente server', () => {
  // 🔴 QUESTE SENTINELLE SONO STATE DECLASSATE DALLA REVISIONE DEL TASK 6, E LA
  //    NOTA VA LETTA PRIMA DI FIDARSENE. Provano che il cancello **esiste** e che
  //    la pagina non tiene una copia dell'elenco. **Non provano che guardi dal
  //    verso giusto:** scambiando i due rami del ternario in `page.tsx` la parola
  //    `puoVedereAvviso` resta dov'è e queste tre restano verdi, mentre a vedere
  //    il promemoria sarebbero rimasti solo i due ruoli che D342 esclude.
  //    ➡️ La decisione è ora una FUNZIONE PURA (`src/lib/avvisi/ruoli.ts`), provata
  //    contro i cinque ruoli veri in `tests/unit/avvisi-ruoli.test.ts`. Il verso
  //    del ternario di `page.tsx` resta scoperto: lo prova il giro sul banco del
  //    **Task 10**, ed è dichiarato lì e nel commento della riga stessa.
  //
  // 🛑 Perché una sentinella sul SORGENTE e non una prova di rendering: la pagina
  //    è un componente server asincrono che apre una sessione e un client di
  //    servizio: renderlo qui vorrebbe dire fingere mezzo mondo, e la prova
  //    finirebbe per provare la finzione. Idioma di casa per una verifica
  //    statica: `tests/unit/firma-messaggi-nome-laboratorio.test.ts` e
  //    `tests/unit/ddc-lettori-gruppo-a.test.ts`.
  const PAGINA = join(process.cwd(), 'src/app/(app)/lavori/[id]/page.tsx')
  const sorgente = readFileSync(PAGINA, 'utf8')

  it('la pagina legge il cancello DA DOVE VIVE — dal modulo foglia, non dalla rotta', () => {
    expect(sorgente).toMatch(
      /import\s*\{[^}]*puoVedereAvviso[^}]*\}\s*from\s*'@\/lib\/avvisi\/ruoli'/
    )
    // 🛑 E NON dal `route.ts`: un import di VALORE da un file di rotta trascina
    //    nel grafo della pagina l'intero gestore (`next/server`, csrf, lab-guard,
    //    il client di servizio), e `route.ts` è un file speciale di Next — un
    //    effetto a livello di modulo ci girerebbe al render della pagina.
    expect(sorgente).not.toMatch(/^\s*import\s*\{[^}]*\}\s*from\s*'@\/app\/api\//m)
    // Due copie di un elenco di permessi divergono — è già successo in questa
    // casa con `admin_sistema`. Qui i tre nomi non si scrivono affatto.
    expect(sorgente).not.toMatch(/'titolare'/)
    expect(sorgente).not.toMatch(/'front_desk'/)
    expect(sorgente).not.toMatch(/'admin_rete'/)
    expect(sorgente).not.toMatch(/'admin_sistema'/)
  })

  it('e il cancello è USATO per decidere, non solo importato', () => {
    // L'importazione da sola sarebbe una prova vacua: `tsc` toglierebbe la riga e
    // nessuno se ne accorgerebbe. Si chiede che il nome compaia una SECONDA volta,
    // fuori dalla riga di importazione, e che sia CHIAMATO.
    const fuoriDallImport = sorgente
      .split('\n')
      .filter((r) => r.includes('puoVedereAvviso(') && !r.trimStart().startsWith('import'))
    expect(fuoriDallImport.length).toBeGreaterThan(0)
    expect(fuoriDallImport.join('\n')).toMatch(/puoVedereAvviso\(context\.ruolo\)/)
  })

  it('la lettura degli avvisi è chiamata solo dietro quel cancello (fail-closed)', () => {
    // Un ruolo assente o sconosciuto non è un caso a parte: `includes()` risponde
    // `false` dentro il predicato e non si legge niente. È la regola di casa
    // (fail-closed) ottenuta senza un secondo ramo che qualcuno potrebbe sbagliare.
    const dove = sorgente.indexOf('avvisiDaComunicare(svc')
    expect(dove).toBeGreaterThan(-1)
    // Il cancello sta SUBITO PRIMA della chiamata (è il ramo di un ternario), e
    // non basta che la variabile esista da qualche parte nel file: si guarda la
    // finestra che precede la chiamata. Il numero è largo quanto serve a
    // contenere il ternario anche mandato a capo dal formattatore.
    // ⚠️ Ripetuto dal riquadro in cima: questa asserzione NON vede il ternario
    //    capovolto. È una sentinella di presenza, non di verso.
    const prima = sorgente.slice(Math.max(0, dove - 200), dove)
    expect(prima).toContain('mostraIlPromemoria')
  })
})
