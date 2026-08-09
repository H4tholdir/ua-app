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
  // 🔑 IL CANCELLO DI D342 NON È PIÙ PROVATO DA QUI, ED È UN MIGLIORAMENTO.
  //    Fino alla seconda revisione del Task 6 queste sentinelle erano l'unica cosa
  //    che guardava il cancello, e guardavano la cosa sbagliata: provavano che
  //    ESISTESSE, non che guardasse dal verso giusto. `provato:` capovolgendo il
  //    ternario di `page.tsx` restavano tutte verdi, mentre a vedere il promemoria
  //    sarebbero rimasti solo i due ruoli che D342 esclude.
  //    ➡️ Ora la decisione vive dentro `avvisoPerLaScheda` (`@/lib/avvisi/queries`),
  //    provata contro i cinque ruoli veri in `tests/unit/avvisi-queries.test.ts` —
  //    dove una mutazione DIVENTA rossa. Queste tre restano come **guardie di
  //    forma**: che la pagina non si ricostruisca un cancello per conto suo, e che
  //    non torni a importare da una rotta.
  //
  // 🛑 Perché una sentinella sul SORGENTE e non una prova di rendering: la pagina
  //    è un componente server asincrono che apre una sessione e un client di
  //    servizio: renderlo qui vorrebbe dire fingere mezzo mondo, e la prova
  //    finirebbe per provare la finzione. Idioma di casa per una verifica
  //    statica: `tests/unit/firma-messaggi-nome-laboratorio.test.ts` e
  //    `tests/unit/ddc-lettori-gruppo-a.test.ts`.
  const PAGINA = join(process.cwd(), 'src/app/(app)/lavori/[id]/page.tsx')
  const sorgente = readFileSync(PAGINA, 'utf8')

  it('la pagina non tiene nessuna copia dell’elenco dei ruoli, e non importa da una rotta', () => {
    // 🛑 Un import di VALORE da un file di rotta trascina nel grafo della pagina
    //    l'intero gestore (`next/server`, csrf, lab-guard, il client di servizio),
    //    e `route.ts` è un file speciale di Next — un effetto a livello di modulo
    //    ci girerebbe al render della pagina.
    expect(sorgente).not.toMatch(/^\s*import\s*\{[^}]*\}\s*from\s*'@\/app\/api\//m)
    // Due copie di un elenco di permessi divergono — è già successo in questa
    // casa con `admin_sistema`. Qui i nomi non si scrivono affatto.
    expect(sorgente).not.toMatch(/'titolare'/)
    expect(sorgente).not.toMatch(/'front_desk'/)
    expect(sorgente).not.toMatch(/'admin_rete'/)
    expect(sorgente).not.toMatch(/'admin_sistema'/)
  })

  it('🛑 la pagina NON chiama la lettura grezza: passa dalla funzione che pretende il ruolo', () => {
    // 🔑 È QUESTA la guardia che vale, ed è l'unico modo in cui il cancello può
    //    tornare aggirabile: `avvisiDaComunicare` non ha nessun parametro `ruolo`,
    //    quindi chiamarla da qui vorrebbe dire rifare il cancello a mano — cioè
    //    ricreare esattamente il ternario che è stato tolto.
    expect(sorgente).not.toMatch(/avvisiDaComunicare\s*\(/)
    expect(sorgente).toMatch(
      /import\s*\{[^}]*avvisoPerLaScheda[^}]*\}\s*from\s*'@\/lib\/avvisi\/queries'/
    )
  })

  it('e il ruolo VERO le arriva: `context.ruolo`, non una costante né un valore inventato', () => {
    // Senza questa riga la pagina potrebbe passare `ruolo: 'titolare'` fisso e
    // tutte le altre prove resterebbero verdi. La chiave è obbligatoria nel tipo,
    // quindi non si può dimenticare — ma si può riempire male.
    const dove = sorgente.indexOf('avvisoPerLaScheda(')
    expect(dove).toBeGreaterThan(-1)
    const chiamata = sorgente.slice(dove, dove + 300)
    expect(chiamata).toMatch(/ruolo:\s*context\.ruolo/)
  })
})
