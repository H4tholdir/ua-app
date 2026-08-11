// D260 — LA CHIAVE SECONDARIA ORFANA NON È UNA RICHIESTA: né per il colore di
// caso, né per la tinta del manufatto. Una regola sola, e i due casi stanno in
// questo file FIANCO A FIANCO perché è esattamente il punto della decisione.
//
// 🔑 IL RILIEVO CHE CHIUDE, e la premessa che ha ribaltato. Il rilievo di ramo
//    del 05/08/2026 (`route.ts:553`) diceva: il blocco della tinta entra su «una
//    qualsiasi delle due chiavi», quindi un corpo col solo `tinta_famiglia`
//    AZZERA una tinta valida senza dichiararlo. Vero. Il rinvio al T8 poggiava
//    però su «la forma è identica al gemello del colore», e l'handoff del
//    06/08 aveva messo quella frase in dubbio: «per il colore mezza coppia è il
//    caso NORMALE e VOLUTO».
// ✅ RIVERIFICATO IL 06/08/2026, e il dubbio era rivolto alla METÀ SBAGLIATA.
//    Le mezze coppie sono DUE e si comportano al contrario:
//      · codice SENZA la chiave secondaria → normale e voluto in ENTRAMBI. La
//        scala si deduce dal catalogo (`colore-caso.ts:89-98`), la famiglia dal
//        tipo del lavoro (`tinta.ts:94-97`). L'handoff aveva controllato questo
//        lato per il colore e non per la tinta, e da lì aveva concluso male.
//      · chiave secondaria SENZA il codice → azzeramento muto in ENTRAMBI
//        (`colore-caso.ts:82-83` e `tinta.ts:67-69` sono la stessa guardia).
//    Quindi la premessa REGGE, ma per il verso opposto a quello scritto: una
//    regola sola, non due.
//
// 🛑 PERCHÉ LA CORREZIONE NON PUÒ ESSERE «SI RESTRINGE L'INGRESSO E BASTA».
//    Le due colonne sono in allowlist. Se si stringe la condizione e si lascia
//    la chiave orfana nel payload, quella arriva all'UPDATE e viola
//    `lavori_tinta_coppia_ck` / `lavori_colore_caso_coppia_ck` → 500, e con lui
//    si perde OGNI altra correzione dello stesso salvataggio. Sarebbe
//    esattamente il danno che «si perde il colore, mai il lavoro» esiste per
//    impedire: peggio del difetto di partenza. L'invariante è doppio — la
//    chiave orfana non arriva mai all'UPDATE, E la coppia salvata non si azzera
//    se nessuno l'ha chiesto.
//
// ⚠️ ONESTÀ SULL'ESPOSIZIONE, dichiarata perché non sembri più di quel che è:
//    oggi NESSUNA superficie può produrre la mezza coppia orfana. Il form manda
//    o niente, o il solo codice, o la coppia intera (`useLavoroForm.ts:343-349`
//    e `:360-376`); il foglietto del colore verifica il catalogo prima di
//    partire (`ModificaColoreSheet.tsx:208-218`). È indurimento del confine —
//    «i client saranno più d'uno» — non una falla viva.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({ getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/route'

const CATALOGO_COLORI = [{ scala: 'vita_classical', codice: 'A3' }]
const CATALOGO_TINTE = [
  { famiglia: 'sport', codice: 'rosso' },
  { famiglia: 'resina_ortodontica', codice: 'rosa' },
]

let updatePayload: Record<string, unknown> | null
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
    if (table === 'colori_dentali') {
      return {
        select: () => ({
          eq: (_c: string, codice: string) =>
            Promise.resolve({ data: CATALOGO_COLORI.filter((r) => r.codice === codice), error: null }),
        }),
      }
    }
    if (table === 'tinte_manufatto') {
      return {
        select: () => ({
          eq: (_c: string, famiglia: string) =>
            Promise.resolve({ data: CATALOGO_TINTE.filter((r) => r.famiglia === famiglia), error: null }),
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
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: riga, error: null }) }) }) }) }),
      update: (p: Record<string, unknown>) => {
        updatePayload = p
        return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'lav-1', numero_lavoro: '2026/0001', stato: 'pronto', updated_at: 'x' }, error: null }) }) }) }) }
      },
    }
  })
})

describe('PATCH /api/lavori/[id] — la chiave secondaria orfana non è una richiesta (D260)', () => {
  // ═══ IL DIFETTO, nei suoi due esemplari ═════════════════════════════════
  // Tre asserzioni ciascuno, e sono tre apposta: «il salvataggio riesce» da
  // solo passerebbe anche col difetto addosso, e «non si dichiara niente»
  // pure — è proprio l'azzeramento MUTO il difetto.

  it('① una `tinta_famiglia` senza codice non tocca la tinta salvata, e non fa 500', async () => {
    const res = await patch({ tinta_famiglia: 'sport', descrizione: 'Bite notturno' })
    expect(res.status).toBe(200)
    // 🔑 Le due chiavi NON entrano: ciò che non entra nell'UPDATE non cambia in
    //    banca dati. È l'unica forma che salva la coppia E il CHECK insieme.
    expect(updatePayload).not.toHaveProperty('tinta_famiglia')
    expect(updatePayload).not.toHaveProperty('tinta_codice')
    // Il resto del salvataggio non è ostaggio della chiave orfana.
    expect(updatePayload).toHaveProperty('descrizione', 'Bite notturno')
  })

  it('② e il gemello si comporta identico: una `colore_scala` senza codice non entra', async () => {
    const res = await patch({ colore_scala: 'vita_classical', descrizione: 'Corona 14' })
    expect(res.status).toBe(200)
    expect(updatePayload).not.toHaveProperty('colore_scala')
    expect(updatePayload).not.toHaveProperty('colore_codice')
    expect(updatePayload).toHaveProperty('descrizione', 'Corona 14')
  })

  it('③ una chiave orfana non è una perdita: non si suona nessun allarme', async () => {
    // Senza codice non c'era richiesta — è il contratto scritto nei cappelli di
    // `tinta.ts:12-16` e `colore-caso.ts:13-18`. Un avviso qui sarebbe falso.
    const res = await patch({ tinta_famiglia: 'sport', colore_scala: 'vita_classical' })
    const corpo = await res.json()
    expect(corpo).not.toHaveProperty('tinta_scartata')
    expect(corpo).not.toHaveProperty('colore_scartato')
    expect(corpo).not.toHaveProperty('tinta_rimossa')
  })

  // ═══ LE GUARDIE CONTRO UNA CORREZIONE TROPPO LARGA ══════════════════════
  // ⚠️ R-P4 — queste TRE erano VERDI anche contro il codice di prima, ed è
  //    dichiarato: non misurano il lavoro di oggi, tengono fermo ciò che non
  //    deve muoversi. Sono la metà che impedisce di «chiudere il rilievo»
  //    rompendo il caso normale — che è il modo più facile di sbagliare qui,
  //    visto che il caso normale È una mezza coppia.

  it('④ il codice SENZA famiglia resta il caso normale: la famiglia la deduce il tipo', async () => {
    const res = await patch({ tinta_codice: 'rosso' })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ tinta_famiglia: 'sport', tinta_codice: 'rosso' })
  })

  it('⑤ il codice SENZA scala resta il caso normale: la scala la deduce il catalogo', async () => {
    const res = await patch({ colore_codice: 'A3' })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ colore_scala: 'vita_classical', colore_codice: 'A3' })
  })

  // 🛑 LA PROVA CHE TIENE APERTO IL RAMO D117, ed è la ragione per cui la
  //    chiave orfana si toglie PRIMA della catena invece che in un ramo suo.
  //    Se la si togliesse con un `else if`, questo caso non arriverebbe mai a
  //    D117: l'utente cambierebbe tipo e la tinta sparirebbe in silenzio —
  //    lo stesso difetto, spostato di due righe.
  it('⑥ una famiglia orfana INSIEME al cambio di tipo: D117 resta raggiungibile', async () => {
    const res = await patch({ tinta_famiglia: 'sport', tipo_dispositivo: 'protesi_fissa' })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ tinta_famiglia: null, tinta_codice: null })
    expect(await res.json()).toHaveProperty('tinta_rimossa', { famiglia: 'sport', codice: 'rosso' })
  })

  it('⑦ cancellare di proposito continua a funzionare: `tinta_codice: null` azzera', async () => {
    const res = await patch({ tinta_codice: null })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ tinta_famiglia: null, tinta_codice: null })
    expect(await res.json()).not.toHaveProperty('tinta_scartata')
  })
})
