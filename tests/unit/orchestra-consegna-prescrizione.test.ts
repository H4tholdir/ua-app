// tests/unit/orchestra-consegna-prescrizione.test.ts
//
// LA RETE SULLA GIUNTURA — giro di correzione del 07/08/2026 (D295).
//
// 🔴 IL FATTO CHE HA GENERATO QUESTO FILE. La correzione che ha portato la voce
//    6 dell'Allegato XIII sulla dichiarazione ha ricollegato TRE anelli
//    (l'embed nel select · la normalizzazione dell'array · il travaso degli
//    avvisi) e non ha messo NESSUNA prova su quegli anelli. Misura del
//    revisore: tolti tutti e cinque i punti insieme, `npx vitest run` restava
//    verde su 5327 prove. Zero.
//
// 🔑 PERCHÉ NESSUNA PROVA MORDEVA, ed è la lezione da tenere. La prova «dal
//    lavoro alla carta» (`generate-ddc.test.ts:568-590`) parte da un oggetto
//    `lavoro` che porta GIÀ `prescrizione` attaccata a mano: prova la giuntura
//    generatore→modello, mai banca dati→generatore. E il finto client della
//    rotta scriveva `select: () => (…)`, cioè BUTTAVA VIA l'argomento —
//    nessuno guardava mai la stringa del `.select()`.
//
// 🛑 QUI `precheckMDR` NON È MOCKATO, ed è tutto il punto. Gli altri
//    `orchestra-consegna-*.test.ts` lo sostituiscono con `() => ({ok:true})`:
//    utile per provare la cassetta o la fattura, inutile per provare che il
//    dato arrivi fin lì. Questo file fa correre la catena vera: select →
//    normalizzaPrescrizione → precheckMDR → `avvisi` nel risultato.
//
// ── LE DUE FORME, e perché servono ENTRAMBE ───────────────────────────────
// · prescrizione CON caratteristiche → NESSUN avviso. È la prova della
//   NORMALIZZAZIONE: senza `normalizzaPrescrizione`, `lavoro.prescrizione`
//   resta l'array `[{…}]`, `.contenuto` è `undefined` e l'avviso scatterebbe
//   su un lavoro che le caratteristiche ce le ha — un falso allarme.
// · prescrizione SENZA caratteristiche → avviso presente. È la prova del
//   TRAVASO: l'avviso deve uscire dal precheck e finire nel risultato del POST.
// · la stringa del `.select()` → è l'unica prova possibile dell'EMBED: il
//   finto client non filtra davvero le colonne, quindi togliere l'embed dalla
//   query non cambierebbe il dato del finto. Si asserisce la richiesta.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, selectArgs } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  selectArgs: [] as string[],
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: mockRpc, from: mockFrom }),
}))
vi.mock('@/lib/notifications/trigger', () => ({ triggerPushByRole: vi.fn() }))
vi.mock('@/lib/consegna/traccia-materiali', () => ({
  tracciaMaterialiLavoro: async () => ({ tracciabilitaOk: true, dettaglio: [], materialiTracciati: [] }),
}))
vi.mock('@/lib/pdf/generate-ddc', () => ({ generateDdC: async () => ({ numero: 'DDC-1', url: 'u' }) }))
vi.mock('@/lib/pdf/generate-buono', () => ({ generateBuono: async () => ({ numero: 'BUO-1', url: 'u' }) }))

import { orchestraConsegna } from '@/lib/consegna/orchestrate'

/** Lavoro consegnabile senza bloccanti: il precheck VERO gira, quindi ogni
 *  campo che blocca dev'esserci davvero. `prescrizioneRaw` entra nella riga
 *  esattamente come lo restituirebbe PostgREST. */
function rigaLavoro(prescrizioneRaw: unknown) {
  return {
    id: 'lav-1',
    laboratorio_id: 'lab-1',
    stato: 'pronto',
    numero_lavoro: 'n.1',
    richiedente_nome: 'Dott. Rossi',
    paziente_nome_snapshot: 'Verdi Luigi',
    descrizione: 'Corona ceramica 26',
    tipo_dispositivo: 'protesi_fissa',
    classe_rischio: 'classe_iia',
    data_consegna_prevista: '2026-08-10',
    tipo_impronte: 'digitale',
    disinfettante_usato: 'clorexidina',
    cliente: { id: 'cli-1', cognome: 'Rossi', nome: 'Mario', cellulare_whatsapp: '3331234567', portale_token: 't' },
    paziente: null,
    lavorazioni: [],
    materiali: [],
    prescrizione: prescrizioneRaw,
  }
}

function montaBanco(prescrizioneRaw: unknown) {
  mockRpc.mockImplementation(async (fn: string) => {
    if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
    if (fn === 'cassetta_libera_atomica') return { data: { esito: 'ok', nome: null }, error: null }
    throw new Error(`rpc inattesa: ${fn}`)
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') {
      return {
        // 🔑 L'argomento si REGISTRA, non si butta: è l'unico modo di provare
        //    che la query chieda l'embed della prescrizione.
        select: (arg: string) => {
          selectArgs.push(arg)
          return { eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: rigaLavoro(prescrizioneRaw), error: null }) }) }) }) }
        },
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null, count: 1 }) }) }),
      }
    }
    throw new Error(`tabella inattesa: ${table}`)
  })
}

const AVVISO_VOCE_6 = 'La prescrizione è allegata ma non riporta caratteristiche'

describe('orchestraConsegna — la prescrizione dalla banca dati al risultato (D295)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectArgs.length = 0
  })

  it('il select dello Step 1 nomina esplicitamente l\'embed prescrizione:lavori_prescrizioni(*)', async () => {
    montaBanco([{ contenuto: { elementi: [26], colore: 'A3' } }])

    await orchestraConsegna('lav-1', 'lab-1')

    expect(selectArgs.length).toBeGreaterThan(0)
    expect(selectArgs.join('\n')).toContain('prescrizione:lavori_prescrizioni(*)')
  })

  it('riga come ARRAY con caratteristiche (forma reale PostgREST) → nessun avviso: la normalizzazione ha spacchettato', async () => {
    montaBanco([{ contenuto: { elementi: [26], colore: 'A3' } }])

    const result = await orchestraConsegna('lav-1', 'lab-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.avvisi ?? []).toEqual([])
    }
  })

  it('riga come ARRAY senza caratteristiche → l\'avviso della voce 6 arriva fino al risultato del POST', async () => {
    montaBanco([{ contenuto: {} }])

    const result = await orchestraConsegna('lav-1', 'lab-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.avvisi ?? []).some((a) => a.includes(AVVISO_VOCE_6))).toBe(true)
    }
  })

  it('nessuna prescrizione (array vuoto) → nessun avviso: il vuoto per diritto non si segnala', async () => {
    montaBanco([])

    const result = await orchestraConsegna('lav-1', 'lab-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.avvisi ?? []).toEqual([])
  })
})
