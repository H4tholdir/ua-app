// tests/unit/lavori-patch-campi-stampati-d308.test.ts
//
// ⚖️ D308 — i cinque campi STAMPATI sulla dichiarazione non si correggono di
// nascosto finché quella dichiarazione è viva (`stato <> 'annullata'`).
//
// 🔴 Il difetto che queste prove chiudono (spec §1): tolto l'annullamento della
// dichiarazione da «torna a pronto» (D293), la finestra di correzione è rimasta
// APERTA sul lavoro e CHIUSA sul documento. `precheckMDR` misura il lavoro vivo
// e non guarda mai la dichiarazione; `generateDdC` trova quella viva e
// restituisce quella senza rigenerare nulla. Risultato: un manufatto poteva
// uscire con una dichiarazione che nomina un'ALTRA persona, con ogni controllo
// verde. Art. 21(2) MDR: la dichiarazione è messa a disposizione di «un
// determinato paziente» — l'identità è la cosa che non può divergere.
//
// 🛑 LE DUE PROVE CHE CONTANO DI PIÙ SONO ⑤ e ⑥, ed è per loro che questo file
// esiste nella forma che ha. Il piano proponeva un cancello che guarda le
// CHIAVI PRESENTI nel corpo (`CAMPI_STAMPATI.filter((c) => c in aggiornamenti)`).
// Quel cancello sarebbe TROPPO LARGO: la scheda del lavoro manda l'INTERA riga a
// ogni salvataggio (`src/hooks/useLavoroForm.ts:316`, `{ ...data }`), quindi i
// cinque nomi sono SEMPRE nel corpo — anche quando l'utente ha toccato solo le
// note. Con quel cancello, su un lavoro con dichiarazione viva NESSUN campo
// sarebbe più correggibile, e sarebbe una violazione della direttiva permanente
// del 27/07 («ogni campo del lavoro si corregge, fino alla consegna»), che il
// panel del 29/07 ha ristretto SOLO sulle voci stampate — non su tutto.
// ➡️ Il cancello guarda quindi il VALORE, non la chiave: si rifiuta ciò che
// CAMBIA. ⑤ (i cinque presenti e identici + una nota cambiata → 200) e ⑥ (lo
// stesso corpo con UNA voce davvero cambiata → 422) sono la coppia che
// distingue le due letture: un cancello a chiave-presente fallisce la ⑤.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({ getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH, CAMPI_STAMPATI } from '../../src/app/api/lavori/[id]/route'

type RigaDdc = { lavoro_id: string; laboratorio_id: string; stato: string }

let updatePayload: Record<string, unknown> | null
let colonneChieste: string | null
let riga: Record<string, unknown>
let righeDdc: RigaDdc[]
let filtriDdc: Record<string, unknown> | null
let chiamateDdc: number
let erroreDdc: { message: string } | null

function patch(body: unknown) {
  return PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
}

/** Il corpo che manda la scheda: l'INTERA riga, i cinque nomi compresi. */
function corpoScheda(sovrascritture: Record<string, unknown> = {}) {
  return {
    tipo_dispositivo: riga.tipo_dispositivo,
    descrizione: riga.descrizione,
    richiedente_nome: riga.richiedente_nome,
    cliente_id: riga.cliente_id,
    paziente_id: riga.paziente_id,
    ...sovrascritture,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  updatePayload = null
  colonneChieste = null
  chiamateDdc = 0
  erroreDdc = null
  // Il caso normale di questo file: UNA dichiarazione viva, di QUESTO
  // laboratorio, su QUESTO lavoro.
  righeDdc = [{ lavoro_id: 'lav-1', laboratorio_id: 'lab-1', stato: 'consegnata' }]
  filtriDdc = null
  riga = {
    incluso_in_fattura: false,
    tecnico_id: null,
    numero_lavoro: '2026/0001',
    tipo_dispositivo: 'protesi_fissa',
    tinta_famiglia: null,
    tinta_codice: null,
    descrizione: 'Corona 14',
    richiedente_nome: 'Dott. Rossi',
    cliente_id: 'cli-1',
    paziente_id: 'paz-1',
  }
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
    }
    if (table === 'dichiarazioni_conformita') {
      // 🔑 Il finto APPLICA i filtri invece di ignorarli: così «nessuna
      // dichiarazione viva» e «dichiarazione di un altro laboratorio» sono prove
      // vere e non un contatore messo a mano. La catena è indifferente
      // all'ordine (`then` sull'oggetto stesso), così non prova l'ordine delle
      // chiamate ma il loro EFFETTO.
      chiamateDdc += 1
      const filtri: Record<string, unknown> = {}
      filtriDdc = filtri
      const esito = () => {
        if (erroreDdc) return { data: null, count: null, error: erroreDdc }
        const n = righeDdc.filter(
          (r) =>
            r.lavoro_id === filtri.lavoro_id &&
            r.laboratorio_id === filtri.laboratorio_id &&
            r.stato !== filtri['neq:stato'],
        ).length
        return { data: null, count: n, error: null }
      }
      const catena: Record<string, unknown> = {
        eq: (col: string, val: unknown) => { filtri[col] = val; return catena },
        neq: (col: string, val: unknown) => { filtri[`neq:${col}`] = val; return catena },
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(esito()).then(ok, ko),
      }
      return { select: (cols: string, opzioni: unknown) => { filtri['select:cols'] = cols; filtri['select:opzioni'] = opzioni; return catena } }
    }
    if (table === 'clienti' || table === 'pazienti' || table === 'tecnici' || table === 'cicli_produzione') {
      return { select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { id: 'fk-ok' }, error: null }) }) }) }) }) }
    }
    // lavori: rilettura della riga + UPDATE
    return {
      select: (cols: string) => {
        colonneChieste = cols
        return { eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: riga, error: null }) }) }) }) }
      },
      update: (p: Record<string, unknown>) => {
        updatePayload = p
        return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'lav-1', numero_lavoro: '2026/0001', stato: 'pronto', updated_at: 'x' }, error: null }) }) }) }) }
      },
    }
  })
})

async function messaggio(res: Response): Promise<string> {
  const json = (await res.json()) as { error?: string }
  return json.error ?? ''
}

describe('PATCH /api/lavori/[id] — D308, i cinque campi stampati', () => {
  it('① i cinque nomi sono esattamente quelli dell’Allegato XIII che il documento stampa', () => {
    expect([...CAMPI_STAMPATI].sort()).toEqual(
      ['cliente_id', 'descrizione', 'paziente_id', 'richiedente_nome', 'tipo_dispositivo'].sort(),
    )
  })

  it('② con dichiarazione viva, cambiare `descrizione` → 422, e il messaggio NOMINA la strada', async () => {
    const res = await patch({ descrizione: 'Corona 24' })
    expect(res.status).toBe(422)
    const testo = await messaggio(res)
    expect(testo).toContain('Devo intervenire')
    expect(testo).toContain('dato sbagliato sulla dichiarazione')
    expect(updatePayload).toBeNull()
  })

  it('③ con dichiarazione viva, un campo FUORI dai cinque resta correggibile (direttiva 27/07)', async () => {
    const res = await patch({ note_interne: 'richiamare il dentista' })
    expect(res.status).toBe(200)
    expect(updatePayload).toHaveProperty('note_interne', 'richiamare il dentista')
  })

  it('④ SENZA dichiarazione viva (solo annullate), `descrizione` si corregge → 200', async () => {
    righeDdc = [
      { lavoro_id: 'lav-1', laboratorio_id: 'lab-1', stato: 'annullata' },
      { lavoro_id: 'lav-1', laboratorio_id: 'lab-1', stato: 'annullata' },
    ]
    const res = await patch({ descrizione: 'Corona 24' })
    expect(res.status).toBe(200)
    expect(updatePayload).toHaveProperty('descrizione', 'Corona 24')
  })

  it('⑤ 🛑 corpo INTERO della scheda coi cinque INVARIATI + una nota cambiata → 200', async () => {
    // La prova che distingue «guarda il valore» da «guarda la chiave»: con un
    // cancello a chiave-presente questa risposta sarebbe 422 e la scheda
    // diventerebbe di sola lettura su tutto.
    const res = await patch(corpoScheda({ note_interne: 'consegnare venerdì' }))
    expect(res.status).toBe(200)
    expect(updatePayload).toHaveProperty('note_interne', 'consegnare venerdì')
    expect(updatePayload).toHaveProperty('descrizione', 'Corona 14')
  })

  it('⑥ 🛑 lo STESSO corpo intero, ma con UNA voce davvero cambiata → 422', async () => {
    const res = await patch(corpoScheda({ paziente_id: 'paz-2', note_interne: 'consegnare venerdì' }))
    expect(res.status).toBe(422)
    expect(updatePayload).toBeNull()
  })

  it('⑦ i cinque, uno per uno, cambiati da soli → 422 ciascuno', async () => {
    const cambi: Array<[string, unknown]> = [
      ['paziente_id', 'paz-2'],
      ['cliente_id', 'cli-2'],
      ['richiedente_nome', 'Dott. Bianchi'],
      ['tipo_dispositivo', 'bite_splint'],
      ['descrizione', 'Corona 24'],
    ]
    for (const [campo, valore] of cambi) {
      updatePayload = null
      const res = await patch({ [campo]: valore })
      expect(res.status, `campo ${campo}`).toBe(422)
      expect(updatePayload, `campo ${campo}`).toBeNull()
    }
  })

  it('⑧ chiave ASSENTE: se nessuno dei cinque è nel corpo, la dichiarazione non si legge nemmeno', async () => {
    const res = await patch({ priorita: 'alta' })
    expect(res.status).toBe(200)
    expect(chiamateDdc).toBe(0)
  })

  it('⑨ `null` su un valore che c’era è un CAMBIO → 422', async () => {
    const res = await patch({ paziente_id: null })
    expect(res.status).toBe(422)
  })

  it('⑩ `null` su un valore già assente NON è un cambio → 200', async () => {
    riga.paziente_id = null
    const res = await patch({ paziente_id: null })
    expect(res.status).toBe(200)
    expect(updatePayload).toHaveProperty('paziente_id', null)
  })

  it('⑪ D242: `richiedente_nome: ""` contro un nome ASSENTE non è un cambio → 200', async () => {
    // `testoVivoDaCorpo` normalizza `''` a `null` PRIMA del cancello: le due
    // ortografie di «non c'è» non devono valere come una correzione.
    riga.richiedente_nome = null
    const res = await patch({ richiedente_nome: '   ' })
    expect(res.status).toBe(200)
    expect(updatePayload).toHaveProperty('richiedente_nome', null)
  })

  it('⑫ tipo SBAGLIATO su un campo stampato → si rifiuta lo stesso (fail-closed)', async () => {
    const res = await patch({ descrizione: 123 })
    expect(res.status).toBe(422)
    expect(updatePayload).toBeNull()
  })

  it('⑬ corpo non-JSON → 400, prima e indipendentemente dal cancello', async () => {
    const res = await PATCH(
      new Request('http://localhost/api/lavori/lav-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'non sono json',
      }),
      { params: Promise.resolve({ id: 'lav-1' }) },
    )
    expect(res.status).toBe(400)
    expect(chiamateDdc).toBe(0)
  })

  it('⑭ la dichiarazione viva di un ALTRO laboratorio non blocca nulla', async () => {
    righeDdc = [{ lavoro_id: 'lav-1', laboratorio_id: 'lab-2', stato: 'consegnata' }]
    const res = await patch({ descrizione: 'Corona 24' })
    expect(res.status).toBe(200)
    expect(filtriDdc).toMatchObject({ lavoro_id: 'lav-1', laboratorio_id: 'lab-1', 'neq:stato': 'annullata' })
  })

  it('⑮ la lettura è un CONTEGGIO senza righe: `head: true`, mai la dichiarazione intera', async () => {
    await patch({ descrizione: 'Corona 24' })
    expect(filtriDdc).toMatchObject({ 'select:opzioni': { count: 'exact', head: true } })
  })

  it('⑯ la riga si rilegge CON i cinque campi: senza, il confronto è teatro', async () => {
    await patch({ note_interne: 'x' })
    for (const campo of CAMPI_STAMPATI) {
      expect(colonneChieste, `colonna ${campo}`).toContain(campo)
    }
  })

  it('⑰ se il conteggio FALLISCE non si passa: 500, nessun UPDATE (fail-closed)', async () => {
    erroreDdc = { message: 'connessione persa' }
    const res = await patch({ descrizione: 'Corona 24' })
    expect(res.status).toBe(500)
    expect(updatePayload).toBeNull()
  })
})
