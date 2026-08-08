import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════
//  ⚖️ D323 — LA PATCH NON SCRIVE PIÙ `updated_at`, E QUESTA PROVA LO TIENE FERMO
//
//  🔑 PERCHÉ È UNA SENTINELLA E NON UN CAPRICCIO. Da D323 il gettone di
//     concorrenza di `lavori` lo muove il trigger `trg_lavori_updated_at`
//     (funzione `lavori_set_updated_at`), che lo sposta SOLO se cambia davvero
//     qualcosa che non sia il contatore `post_consegna_correzioni`, e
//     altrimenti lo PINZA al valore vecchio.
//
//  🛑 IL PREDICATO DEL TRIGGER TIENE `updated_at` DENTRO IL CONFRONTO di
//     proposito: un chiamante che lo assegna sta CHIEDENDO di far avanzare il
//     gettone, ed è così che `lavoro_prescrizione_correggi_typo` e
//     `lavoro_denti_sostituisci_atomica` lo fanno avanzare quando il
//     cambiamento vero vive in un'ALTRA tabella (`lavori_prescrizioni`,
//     `lavori_denti`). ➡️ Conseguenza: finché questa rotta mette `updated_at`
//     nel carico, OGNI salvataggio — anche uno che non cambia niente — continua
//     a bruciare il gettone, e D323 vale per metà.
//
//  📌 Le due modifiche sono quindi ACCOPPIATE: il trigger e questa riga. La
//     prova ① è ciò che impedisce a un domani di riaprire il difetto rimettendo
//     una riga che «serve a forzare l'aggiornamento del timestamp».
//
//  🔴 E LA ② È IL PREZZO DI TOGLIERLA, misurato e non temuto: `payload.updated_at`
//     era anche l'unica chiave SEMPRE presente. Senza, un corpo che non porta
//     nessun campo dell'allowlist produce `.update({})`, e PostgREST non
//     aggiorna niente:
//       `provato:` supabase-js `.update({}).eq(…).select(…).single()` →
//       `{"code":"PGRST116","details":"The result contains 0 rows"}`, HTTP 406
//     cioè un **500** al posto del 200 di oggi. Ed è raggiungibile: un corpo di
//     sole chiavi fuori allowlist (che la rotta scarta in silenzio), un corpo
//     con la sola `colore_scala` (che viene tolta senza `colore_codice`), o un
//     corpo di soli campi prezzo su un lavoro già in fattura.
// ═══════════════════════════════════════════════════════════════════════════

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/route'

const RIGA = {
  id: 'lav-1', numero_lavoro: '2026/0001', stato: 'ricevuto',
  updated_at: '2026-08-08T10:54:08.314024+00:00',
}

let updatePayload: Record<string, unknown> | null
let quantiUpdate = 0

beforeEach(() => {
  updatePayload = null
  quantiUpdate = 0
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({ eq: () => ({ is: () => ({ single: async () => ({
          data: { laboratorio_id: 'lab-1', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } },
          error: null,
        }) }) }) }),
      }
    }
    if (table === 'dichiarazioni_conformita') {
      return { select: () => ({ eq: () => ({ eq: () => ({ neq: async () => ({ count: 0, error: null }) }) }) }) }
    }
    // `lavori`: la lettura di controllo e, quando c'è, la scrittura.
    return {
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({
        data: {
          ...RIGA,
          incluso_in_fattura: false, tecnico_id: null,
          tipo_dispositivo: 'protesi_fissa', tinta_famiglia: null, tinta_codice: null,
          descrizione: 'Corona', richiedente_nome: null, cliente_id: null, paziente_id: null,
        },
        error: null,
      }) }) }) }) }),
      update: (p: Record<string, unknown>) => {
        quantiUpdate += 1
        updatePayload = p
        return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: RIGA, error: null }) }) }) }) }
      },
    }
  })
})

function patch(body: unknown) {
  return PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) }
  )
}

describe('PATCH /api/lavori/[id] — il gettone lo muove il database (D323)', () => {
  it('🔴 ① il carico dell\'UPDATE NON contiene `updated_at`: lo scrive il trigger, non l\'orologio di Node', async () => {
    const res = await patch({ descrizione: 'Corona in zirconia' })

    expect(res.status).toBe(200)
    expect(updatePayload).not.toBeNull()
    // 🛑 La riga che vale: `not.toHaveProperty` e non «diverso da adesso» — un
    //    valore qualunque riaprirebbe il difetto esattamente come quello di prima.
    expect(updatePayload).not.toHaveProperty('updated_at')
    expect(updatePayload).toHaveProperty('descrizione', 'Corona in zirconia')
  })

  it('🔴 ② un corpo senza nessun campo dell\'allowlist NON scrive e risponde 200, mai 500', async () => {
    // `classe_rischio` non è patchabile: la rotta la scarta in silenzio. Prima
    // di D323 restava comunque `updated_at` a tenere in piedi l'UPDATE.
    const res = await patch({ classe_rischio: 'classe_iii' })

    expect(res.status).toBe(200)
    expect(quantiUpdate).toBe(0)
    // …e chi chiama riceve comunque la riga, con il gettone corrente: è ciò che
    // `ModificaRigaSheet` e `ModificaColoreSheet` leggono per restare in sincronia.
    expect((await res.json()).lavoro).toMatchObject({ id: 'lav-1', updated_at: RIGA.updated_at })
  })

  it('🛑 ②-bis e vale anche per una mezza coppia di colore, che la rotta svuota da sé', async () => {
    // `colore_scala` senza `colore_codice` viene tolta dal carico: il corpo è
    // pieno, il carico resta vuoto. È il secondo modo di arrivarci.
    const res = await patch({ colore_scala: 'vita_classical' })

    expect(res.status).toBe(200)
    expect(quantiUpdate).toBe(0)
  })
})
