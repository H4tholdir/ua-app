// D248 — il colore scartato dalla PATCH viene DICHIARATO, come già fa il POST.
//
// 🔑 IL DIFETTO, e perché è stato chiuso adesso. `risolviColoreCaso` produce
//    `scartato` dal 28/07/2026 con la ragione scritta nel suo cappello (rilievo
//    M2 della revisione pre-merge: «"si perde il colore, mai il lavoro"
//    giustifica il NON far fallire; NON giustifica il non dirlo»). Il POST lo
//    rimanda (`api/lavori/route.ts`) e il wizard lo trasforma in un avviso
//    (`crea-lavoro.ts` → `accessoriFalliti.push('colore')`). **La PATCH lo
//    riceveva e lo buttava via.** Il rilievo era pure già annotato in
//    `ModificaColoreSheet.tsx` e mai chiuso.
//
// ⚠️ ONESTÀ SULL'ESPOSIZIONE — corretta dalla revisione di ramo (05/08/2026),
//    perché la prima stesura nominava una protezione che NON esiste. Diceva:
//    «la pagina di modifica toglie il colore dal corpo (`useLavoroForm.ts:325`)».
//    **Falso:** `:325-326` lo tolgono e `:340-341` lo RIMETTONO ogni volta che
//    nessun dente porta colore. Quel client il colore lo manda.
// ✅ Che oggi lo scarto non sia raggiungibile resta VERO, per un motivo diverso
//    e misurato: quel campo è una TENDINA di 19 codici (`TabClinica.tsx:8-14`),
//    tutti presenti in `colori_dentali`, e il foglio della scheda verifica col
//    catalogo prima di mandare.
// 🔴 Diventa raggiungibile il giorno in cui si allargano le scale ammesse o quel
//    campo torna testo libero — e allora `colore_scartato` serve davvero.
// 🔑 Il senso della correzione non cambia: si toglie una garanzia dal client,
//    dove il cappello di `colore-caso.ts` dice da luglio che non può stare —
//    «i client saranno più d'uno» — e lo specchio dei 48 codici che vive nel
//    client È un secondo elenco che può divergere dal catalogo.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({ getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/route'

const CATALOGO = [{ scala: 'vita_classical', codice: 'A3' }]
let updatePayload: Record<string, unknown> | null
let catalogoRotto = false

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
  catalogoRotto = false
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
    }
    if (table === 'colori_dentali') {
      return {
        select: () => ({
          eq: (_c: string, codice: string) =>
            Promise.resolve(
              catalogoRotto
                ? { data: null, error: { message: 'ko' } }
                : { data: CATALOGO.filter((r) => r.codice === codice), error: null }
            ),
        }),
      }
    }
    // D308 — il cancello sui cinque campi stampati conta le dichiarazioni vive.
    // Su questo lavoro non ce n'è nessuna: il cancello resta un no-op e queste
    // prove continuano a misurare ciò che misuravano.
    if (table === 'dichiarazioni_conformita') {
      return { select: () => ({ eq: () => ({ eq: () => ({ neq: async () => ({ count: 0, error: null }) }) }) }) }
    }
    return {
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { incluso_in_fattura: false, tecnico_id: null, numero_lavoro: '2026/0001', tipo_dispositivo: 'protesi_fissa', tinta_famiglia: null, tinta_codice: null }, error: null }) }) }) }) }),
      update: (p: Record<string, unknown>) => {
        updatePayload = p
        return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'lav-1', numero_lavoro: '2026/0001', stato: 'pronto', updated_at: 'x' }, error: null }) }) }) }) }
      },
    }
  })
})

describe('PATCH /api/lavori/[id] — il colore perso si DICE (D248)', () => {
  it('① un codice fuori catalogo azzera la coppia E la risposta lo dichiara', async () => {
    const res = await patch({ colore_scala: 'vita_classical', colore_codice: 'A3,5' })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ colore_scala: null, colore_codice: null })
    // 🔑 Senza questa riga l'utente legge «Salvato» su un colore che non c'è.
    expect(await res.json()).toHaveProperty('colore_scartato', true)
  })

  it('② un catalogo irraggiungibile è comunque una perdita, e si dichiara', async () => {
    catalogoRotto = true
    const res = await patch({ colore_codice: 'A3' })
    expect(res.status).toBe(200)
    expect(await res.json()).toHaveProperty('colore_scartato', true)
  })

  // ⚠️ GUARDIA NEGATIVA come la ④, e per la stessa ragione dichiarata: contro il
  //    codice di PRIMA era verde per costruzione, perché il campo non esisteva.
  //    (Misura R-P4: 2 asserzioni su 4 si accendevano; le verdi sono ③ e ④.)
  it('③ un colore riconosciuto si salva e non allarma nessuno', async () => {
    const res = await patch({ colore_codice: 'A3' })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ colore_scala: 'vita_classical', colore_codice: 'A3' })
    expect(await res.json()).not.toHaveProperty('colore_scartato')
  })

  // ⚠️ GUARDIA NEGATIVA, dichiarata (R-P4): contro il codice di PRIMA restava
  //    verde per costruzione — il campo non c'era affatto, quindi «non deve
  //    esserci» era vero per ragioni sbagliate. Vale contro il domani: un
  //    avviso che compare quando non serve si impara a ignorare, e allora
  //    smette di avvisare.
  it('④ una PATCH che non nomina il colore non parla di colore', async () => {
    const res = await patch({ descrizione: 'Corona 14' })
    expect(res.status).toBe(200)
    expect(await res.json()).not.toHaveProperty('colore_scartato')
  })
})
