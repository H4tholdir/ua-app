import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LavoroFormClient } from '../../src/components/features/lavori/LavoroFormClient'
import type { LavoroDettaglio } from '../../src/types/domain'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// ═══════════════════════════════════════════════════════════════════════════
// COLLAUDO 28/07/2026 — «Errore — riprova» al posto della frase.
//
// Trovato accendendo l'app: le tre frasi dell'ondata passano tutte da
// `setSaveError` (`useLavoroForm.ts:141,162,279`), ma chi le mostra
// (`LavoroFormClient.tsx`) le teneva dietro `saveError && !isDirty`.
//
// 🔑 Quella condizione non è «difficile da soddisfare»: è IRRAGGIUNGIBILE.
// `setIsDirty(false)` avviene SOLO dopo un salvataggio riuscito
// (`useLavoroForm.ts:365-366`), e `save()` azzera `saveError` in apertura
// (riga 250). Quindi «c'è un errore E il form è pulito» non capita mai, e il
// paragrafo `role="alert"` non veniva reso in NESSUN percorso: restava solo
// l'etichetta del tasto, «⚠ Errore — riprova», che non dice cosa fare.
//
// Il caso qui sotto è il repro esatto eseguito nel browser: nessun dente
// selezionato + una zona del ceramista valorizzata → il salvataggio si ferma
// PRIMA di partire (nessuna richiesta), ed è giusto così: quello che mancava
// era il MOTIVO davanti agli occhi di chi sta al banco.
// ═══════════════════════════════════════════════════════════════════════════

const FRASE_ZONE = /Le zone del colore si registrano sul dente/i

function makeLavoro(overrides: Record<string, unknown> = {}): LavoroDettaglio {
  return {
    id: 'lavoro-1',
    laboratorio_id: 'lab-1',
    numero_lavoro: '2026-0001',
    cliente_id: 'cliente-id',
    tipo_dispositivo: 'protesi_fissa',
    descrizione: 'Corona',
    stato: 'in_lavorazione',
    priorita: 'normale',
    updated_at: '2026-07-27T09:00:00.123456+00:00',
    incluso_in_fattura: false,
    colore_dente: null,
    colore_collo: null,
    colore_corpo: null,
    colore_incisale: null,
    colore_scala: null,
    colore_codice: null,
    denti_coinvolti: [],
    denti_mancanti: [],
    denti_impianti: [],
    denti: [],
    anamnesi_bruxismo: false,
    materiali_allegati: [],
    cliente: { id: 'cliente-id', nome: 'Mario', cognome: 'Rossi', studio_nome: null, telefono: null },
    paziente: null,
    tecnico: null,
    lavorazioni: [],
    appuntamenti: [],
    immagini: [],
    fasi: [],
    materiali: [],
    ddc: null,
    laboratorio: { nome: 'Lab Test', telefono: null },
    ...overrides,
  } as unknown as LavoroDettaglio
}

/** Il gesto del collaudo: una zona senza nessun dente, poi «Salva». */
async function tentaSalvataggioSenzaDenti() {
  render(<LavoroFormClient defaultTab="clinica" lavoro={makeLavoro()} />)
  fireEvent.change(screen.getByLabelText(/colore collo/i), { target: { value: 'A2' } })
  fireEvent.click(screen.getByLabelText(/salva modifiche/i))
}

describe('il motivo del salvataggio fallito arriva a chi sta al banco', () => {
  // `save()` rilancia il motivo dopo averlo mostrato (`useLavoroForm.ts:261`) e
  // l'`onClick` del tasto non ha un `.catch()` (`LavoroFormClient.tsx`): la
  // promessa respinta arriva qui. È il comportamento di oggi, non qualcosa che
  // questi test introducono — si raccoglie e si CONTROLLA che sia proprio il
  // motivo atteso, invece di lasciarla sporcare la suite come errore anonimo.
  // ⚠️ Riferito e non toccato (R-E2): l'`onClick` senza `.catch()` è
  // preesistente e produce lo stesso rumore nella console del browser.
  const respinte: unknown[] = []
  const raccogli = (e: unknown) => { respinte.push(e) }
  beforeAll(() => { process.on('unhandledRejection', raccogli) })
  afterAll(() => {
    process.off('unhandledRejection', raccogli)
    for (const e of respinte) {
      expect(String((e as Error)?.message ?? e)).toMatch(/Le zone del colore|zone del colore richiedono/i)
    }
  })

  // ⚠️ `respinte` NON si azzera fra un test e l'altro: le promesse respinte
  // arrivano quando il motore le rileva, anche dopo la fine del test che le ha
  // provocate. Svuotarla qui vorrebbe dire controllarne solo l'ultima manciata.
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('mostra la frase, non solo «Errore — riprova»', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await tentaSalvataggioSenzaDenti()

    // Il messaggio vero è a schermo, con il ruolo che lo fa annunciare.
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(FRASE_ZONE)
    })

    // 🔑 E il salvataggio NON è partito: si dice il motivo, non si scrive un
    // dato monco. Se questa asserzione cadesse, la correzione avrebbe aperto
    // una strada che il Task 12 aveva chiuso apposta.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('la frase RESTA mentre si corregge — sparisce solo col salvataggio dopo', async () => {
    // Chi legge «seleziona almeno un dente» deve poterlo fare CON la frase
    // ancora davanti: un messaggio che si dissolve al primo tocco toglie
    // l'istruzione proprio nel momento in cui serve.
    await tentaSalvataggioSenzaDenti()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(FRASE_ZONE))

    fireEvent.click(screen.getByLabelText(/^dente 11$/i))

    expect(screen.getByRole('alert')).toHaveTextContent(FRASE_ZONE)
  })

  it('controllo negativo: senza errore non c\'è nessun avviso', () => {
    // Senza questo, il primo test passerebbe anche con un avviso sempre acceso.
    render(<LavoroFormClient defaultTab="clinica" lavoro={makeLavoro()} />)

    expect(screen.queryByRole('alert')).toBeNull()
  })
})
