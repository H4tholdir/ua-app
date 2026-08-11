import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * D286 — «ogni orario dell'app è quello italiano di Roma» — propagata alla
 * scadenza della prova gratuita (`laboratori.trial_ends_at`, colonna
 * `timestamptz`) scritta dal pannello admin.
 *
 * 🛑 IL DIFETTO, e la sua forma esatta: `<input type="date">` restituisce
 * `2026-08-20`, e `new Date('2026-08-20')` vale **mezzanotte UTC** — le 02:00
 * di Roma. Non è mezzanotte italiana, che è l'istante che l'amministratore
 * intende quando scrive «estendi fino al 20».
 *
 * ⚠️ NOTA — questo punto NON è come `lavori-liberi`: una data-sola in ISO 8601
 * è UTC **per specifica ECMAScript**, non per il fuso del processo. Il difetto
 * si vede quindi anche su una macchina `Europe/Rome`. Il fuso si forza a UTC lo
 * stesso — perché la CORREZIONE, quella sì, deve valere ovunque, e perché
 * `.toLocaleDateString` senza `timeZone` (il giro di ritorno qui sotto) è
 * invece pienamente dipendente dal processo.
 *
 * ⚠️ E si RIMETTE com'era in `afterAll`: `tests/unit/striscia-trial.test.ts:51`
 * dipende dal fatto che la macchina di prova sia `Europe/Rome`.
 */

const FUSO_ORIGINALE = process.env.TZ

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}))

// Stesso impianto dei file di prova che già mockano `next/navigation` qui.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

import LabActions from '@/app/admin/labs/[id]/lab-actions'

beforeAll(() => {
  process.env.TZ = 'UTC'
})
afterAll(() => {
  if (FUSO_ORIGINALE === undefined) delete process.env.TZ
  else process.env.TZ = FUSO_ORIGINALE
})

const LAB_DATA = {
  nome: 'Lab Test', ragione_sociale: null, partita_iva: null, codice_fiscale: null,
  indirizzo: null, cap: null, citta: null, provincia: null, telefono: null,
  email: null, pec: null, codice_itca: null, srn_eudamed: null, numero_rea: null,
  numero_albo: null, prrc_nome: null, prrc_qualifica: null, anno_prima_marcatura: null,
  regime_fiscale: 'RF01', codice_iva_default: 'N4', soglia_bollo: 77.47,
  importo_bollo: 2, bollo_default_attivo: false, piano: 'lab',
  trial_ends_at: null as string | null,
}

function montaConTrial(trialEndsAt: string | null) {
  return render(
    <LabActions
      labId="lab-1"
      currentStato="trial"
      trialEndsAt={trialEndsAt}
      stripeCustomerId={null}
      utenti={[]}
      invites={[]}
      log={[]}
      labData={{ ...LAB_DATA, trial_ends_at: trialEndsAt }}
    />
  )
}

/** Il corpo JSON dell'ULTIMA PATCH partita verso l'API admin. */
function corpoInviato(): Record<string, unknown> {
  const chiamate = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
  const ultima = chiamate[chiamate.length - 1]
  return JSON.parse((ultima[1] as RequestInit).body as string)
}

/** Il campo del modulo grande vive in una sezione richiudibile, chiusa di default. */
function apriPianoEStato() {
  fireEvent.click(screen.getByRole('button', { name: /Piano e Stato/i }))
}

/** Scrive una data nel campo «Estendi trial» e preme Salva. */
async function estendiTrialA(data: string): Promise<Record<string, unknown>> {
  fireEvent.change(screen.getByLabelText('Data fine trial'), { target: { value: data } })
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }))
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  return corpoInviato()
}

describe('Pannello admin — la fine della prova gratuita è mezzanotte di ROMA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch
  })

  it('il fuso del processo è UTC, e la sonda del difetto si legge in chiaro', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC')
    // Ciò che il pannello faceva PRIMA: mezzanotte UTC, cioè le 02:00 di Roma.
    expect(new Date('2026-08-20').toISOString()).toBe('2026-08-20T00:00:00.000Z')
  })

  it('🛑 IL DIFETTO CHE CHIUDE: «fino al 20 agosto» si salva come mezzanotte italiana', async () => {
    montaConTrial(null)
    const corpo = await estendiTrialA('2026-08-20')
    expect(corpo.trial_ends_at).toBe('2026-08-19T22:00:00.000Z')
  })

  it('ORA SOLARE (gennaio, +1): «fino al 15 gennaio» è le 23:00 UTC del 14', async () => {
    // 🔑 La prova che l'offset è RISOLTO per la data, non cablato: con un
    // «−2 ore» fisso questa riga diventerebbe rossa e quella d'agosto no.
    montaConTrial(null)
    const corpo = await estendiTrialA('2026-01-15')
    expect(corpo.trial_ends_at).toBe('2026-01-14T23:00:00.000Z')
  })

  it('🔑 IL GIRO DI RITORNO: riaprendo la pagina il campo mostra ancora il 20, non il 19', async () => {
    // Senza questo, la correzione sopra ne creerebbe una peggiore: il valore
    // salvato è le 22:00 UTC del 19, e chi lo legge con l'orologio del processo
    // (UTC in produzione) vedrebbe «19/08» su un trial fissato al 20.
    montaConTrial('2026-08-19T22:00:00+00:00')
    expect(screen.getByLabelText('Data fine trial')).toHaveValue('2026-08-20')
    apriPianoEStato()
    expect(screen.getByLabelText('Trial ends at')).toHaveValue('2026-08-20')
  })

  it('i valori STORICI (mezzanotte UTC, scritti prima della correzione) restano leggibili come lo stesso giorno', async () => {
    montaConTrial('2026-08-20T00:00:00+00:00')
    expect(screen.getByLabelText('Data fine trial')).toHaveValue('2026-08-20')
  })

  it('anche il modulo grande «Salva tutte le modifiche» scrive mezzanotte di Roma, non UTC', async () => {
    // Il mandato nominava solo l'azione rapida: questa è la SECONDA via di
    // scrittura della STESSA colonna, nello stesso file. Se restasse com'era,
    // due percorsi scriverebbero due convenzioni diverse in `trial_ends_at`.
    montaConTrial(null)
    apriPianoEStato()
    fireEvent.change(screen.getByLabelText('Trial ends at'), { target: { value: '2026-08-20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva tutte le modifiche' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(corpoInviato().trial_ends_at).toBe('2026-08-19T22:00:00.000Z')
  })

  it('campo vuoto nel modulo grande → null, non una data inventata', async () => {
    montaConTrial(null)
    fireEvent.click(screen.getByRole('button', { name: 'Salva tutte le modifiche' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(corpoInviato().trial_ends_at).toBeNull()
  })
})
