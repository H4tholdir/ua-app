// Task 5 (D42) — la tinta del manufatto passa dalla PATCH: entra in allowlist,
// si normalizza sul catalogo, e al cambio di tipo si TOGLIE dichiarandolo (D117).
//
// 🛑 IL FINTO `existing` RISPECCHIA LA `select` VERA, e non è pedanteria: la
//    rotta legge `incluso_in_fattura, tecnico_id, numero_lavoro,
//    tipo_dispositivo, tinta_famiglia, tinta_codice`. Un finto che restituisse
//    di meno (com'è nelle prove sorelle, che chiedevano solo
//    `incluso_in_fattura`) farebbe passare col verde un ramo che in produzione
//    è morto — `macroDopo` sarebbe `undefined` e OGNI correzione di tinta
//    verrebbe scartata. Per questo c'è anche una prova che guarda le colonne
//    CHIESTE, non solo quelle risposte.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({ getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH, PATCHABLE_FIELDS } from '../../src/app/api/lavori/[id]/route'

const CATALOGO = [
  { famiglia: 'sport', codice: 'rosso' },
  { famiglia: 'sport', codice: 'nero' },
  { famiglia: 'resina_ortodontica', codice: 'rosa' },
]

let updatePayload: Record<string, unknown> | null
let colonneChieste: string | null
/** La riga in banca dati: un bite con la tinta sportiva rossa già addosso. */
let riga: Record<string, unknown>

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

beforeEach(() => {
  vi.clearAllMocks()
  updatePayload = null
  colonneChieste = null
  riga = {
    incluso_in_fattura: false,
    tecnico_id: null,
    numero_lavoro: '2026/0001',
    tipo_dispositivo: 'bite_splint',
    tinta_famiglia: 'sport',
    tinta_codice: 'rosso',
  }
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
    }
    if (table === 'tinte_manufatto') {
      return {
        select: () => ({
          eq: (_c: string, famiglia: string) =>
            Promise.resolve({ data: CATALOGO.filter((r) => r.famiglia === famiglia), error: null }),
        }),
      }
    }
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

describe('PATCH /api/lavori/[id] — la tinta del manufatto', () => {
  it('① `tinta_famiglia` e `tinta_codice` sono correggibili', () => {
    expect(PATCHABLE_FIELDS).toContain('tinta_famiglia')
    expect(PATCHABLE_FIELDS).toContain('tinta_codice')
  })

  // 🛑 LA PROVA CHE GUARDA LE COLONNE CHIESTE, non quelle risposte. Senza, un
  //    finto generoso terrebbe verde un ramo morto in produzione: è la stessa
  //    forma della spia del T4 (un osservatore che nessuno legge) e dell'UPDATE
  //    su zero righe del T2.
  it('② la riga si rilegge CON il tipo e la tinta: senza, il resto è teatro', async () => {
    await patch({ tinta_codice: 'rosso' })
    expect(colonneChieste).toContain('tipo_dispositivo')
    expect(colonneChieste).toContain('tinta_famiglia')
    expect(colonneChieste).toContain('tinta_codice')
  })

  it('③ una tinta valida arriva all’UPDATE normalizzata, con la famiglia dedotta dal tipo', async () => {
    const res = await patch({ tinta_codice: '  ROSSO ' })
    expect(res.status).toBe(200)
    expect(updatePayload).toHaveProperty('tinta_famiglia', 'sport')
    expect(updatePayload).toHaveProperty('tinta_codice', 'rosso')
  })

  it('④ una tinta che il catalogo non conosce si perde, e la risposta LO DICE', async () => {
    const res = await patch({ tinta_codice: 'rosa_fluo' })
    expect(res.status).toBe(200)
    expect(updatePayload).toHaveProperty('tinta_famiglia', null)
    expect(updatePayload).toHaveProperty('tinta_codice', null)
    // 🔑 «Si corregge dalla scheda» vale solo se chi deve correggere lo sa.
    expect(await res.json()).toHaveProperty('tinta_scartata', true)
  })

  // D117 — le tre asserzioni sono TRE e restano tre: una sola passerebbe anche
  // con un difetto (salvataggio riuscito · colonne azzerate · dichiarazione).
  it('⑤ D117 — se il tipo cambia e la tinta non gli compete più, si toglie E si dichiara', async () => {
    const res = await patch({ tipo_dispositivo: 'protesi_fissa' })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ tinta_famiglia: null, tinta_codice: null })
    expect(await res.json()).toHaveProperty('tinta_rimossa', { famiglia: 'sport', codice: 'rosso' })
  })

  // ⚠️ R-P4 — QUESTA È UNA GUARDIA NEGATIVA e contro il codice di PRIMA restava
  //    verde per costruzione: chiede che le due chiavi NON ci siano, e prima del
  //    Task 5 non c'erano comunque. Non si riscrive per farla accendere —
  //    sarebbe fingere. Il suo valore è contro una regressione futura: il giorno
  //    in cui il ramo (b) diventasse troppo largo e togliesse una tinta ancora
  //    valida, si accende. (Misura: 7 asserzioni su 9 si accendevano; le due
  //    verdi sono questa e la ⑨.)
  it('⑥ ma se il tipo nuovo la ammette ancora, la tinta RESTA e non si tocca', async () => {
    const res = await patch({ tipo_dispositivo: 'bite_splint' })
    expect(res.status).toBe(200)
    expect(updatePayload).not.toHaveProperty('tinta_famiglia')
    expect(updatePayload).not.toHaveProperty('tinta_codice')
    expect(await res.json()).not.toHaveProperty('tinta_rimossa')
  })

  // 🆕 NON nel piano. È il percorso «l'utente cancella la tinta»: deve azzerare
  //    SENZA suonare l'allarme. Un avviso che compare quando non serve si
  //    impara a ignorare, e allora smette di avvisare.
  it('⑦ azzerare la tinta di proposito non è una perdita: nessun falso allarme', async () => {
    const res = await patch({ tinta_famiglia: null, tinta_codice: null })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ tinta_famiglia: null, tinta_codice: null })
    const corpo = await res.json()
    expect(corpo).not.toHaveProperty('tinta_scartata')
    expect(corpo).not.toHaveProperty('tinta_rimossa')
  })

  // 🆕 NON nel piano. Il controllo positivo sull'ALTRO lato, la lezione del T2:
  //    un difetto che rifiutasse tutta la resina sarebbe passato inosservato.
  it('⑧ e vale identico sull’altra famiglia: resina su un lavoro di ortodonzia', async () => {
    riga.tipo_dispositivo = 'ortodonzia'
    riga.tinta_famiglia = null
    riga.tinta_codice = null
    const res = await patch({ tinta_codice: 'ROSA' })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ tinta_famiglia: 'resina_ortodontica', tinta_codice: 'rosa' })
  })

  // 🆕 NON nel piano. Il tipo arriva dal BODY, e il blocco lo usa: è lecito solo
  //    perché `MACRO_SLUGS` lo valida PRIMA e perché finisce nella STESSA
  //    scrittura. Questa prova tiene fermo il primo dei due: un tipo inventato
  //    non deve mai arrivare al blocco della tinta.
  //    ⚠️ R-P4 — era verde anche PRIMA del Task 5, perché la validazione B2
  //    esisteva già: non misura il lavoro di oggi. Dichiarata, non spacciata
  //    per prova nuova.
  //    🛑 E NON DICE QUELLO CHE SEMBRA DIRE: la prima stesura di questa nota
  //    sosteneva che tenesse fermo l'ORDINE fra validazione e blocco della
  //    tinta. `provato:` NON è così — spostando il blocco prima della
  //    validazione, tutte e nove restano verdi, perché `famigliaDiMacro`
  //    risponde `null` a ogni nome che non conosce e un tipo inventato viene
  //    scartato comunque. Quello che questa prova tiene fermo è più modesto e
  //    vale lo stesso: **un tipo inventato non scrive niente** (422, payload
  //    intatto). L'ordine, e fin dove arriva la sua garanzia, è spiegato nel
  //    commento accanto al blocco in `route.ts`.
  it('⑨ un tipo inventato nel body viene fermato prima, e niente viene scritto', async () => {
    const res = await patch({ tipo_dispositivo: 'pippo', tinta_codice: 'rosso' })
    expect(res.status).toBe(422)
    expect(updatePayload).toBeNull()
  })
})
