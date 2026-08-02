// ═══════════════════════════════════════════════════════════════════════════
// P11 — IL MESSAGGIO DEL DATABASE SMETTE DI USCIRE DA `generaProgressivo`
//
// IL DIFETTO. `progressivi.ts:31` interpolava `error.message` dentro il proprio
// `Error`. Su un guasto vero quel testo è la risposta di PostgREST: contiene
// **l'INSERT per intero**, il nome di `public.progressivi_anno` e la firma della
// funzione. Se il chiamante non cattura — e cinque chiamanti su sei non
// catturavano — quel testo risale fino alla risposta HTTP.
//
// 🔑 CORRETTO ALLA FONTE, non mettendo un `try` in ognuno dei sei chiamanti:
//    sei `try` sono sei occasioni di dimenticarne uno, e il settimo chiamante
//    nascerebbe scoperto. Stessa ragione di D171 (le funzioni condivise per il
//    fuso) e di D170-bis (la guardia invece della sola riparazione).
//
// ⚠️ LA PROVA CHE CONTA NON È «lancia un errore» — quello lo faceva già. Sono
//    DUE: che il testo del database **non sia** nel messaggio, e che il dettaglio
//    **non sia andato perso**. Un errore reso muto è un altro modo di sbagliare:
//    chi ripara resta senza niente in mano.
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generaProgressivo } from '@/lib/db/progressivi'

// Il testo che PostgREST restituisce davvero su un guasto: è questo che non deve
// uscire. Contiene la query, il nome della tabella e quello della funzione.
const TESTO_DEL_DATABASE =
  'insert or update on table "progressivi_anno" violates foreign key constraint ' +
  '"progressivi_anno_laboratorio_id_fkey" — PL/pgSQL function public.genera_progressivo(uuid,text,integer) line 12'

function clientFinto(risposta: { data: unknown; error: unknown }) {
  return { rpc: async () => risposta } as never
}

let spiaLog: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  spiaLog = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  spiaLog.mockRestore()
})

describe('P11 — quando il database si guasta, il suo testo non esce', () => {
  it('il messaggio dell\'errore NON contiene la query, la tabella né la funzione', async () => {
    const cl = clientFinto({ data: null, error: { message: TESTO_DEL_DATABASE } })
    await expect(generaProgressivo(cl, 'lab-1', 'ddc', 2026)).rejects.toThrow()

    let messaggio = ''
    try {
      await generaProgressivo(cl, 'lab-1', 'ddc', 2026)
    } catch (e) {
      messaggio = e instanceof Error ? e.message : String(e)
    }
    expect(messaggio).not.toContain('progressivi_anno')
    expect(messaggio).not.toContain('insert or update')
    expect(messaggio).not.toContain('genera_progressivo')
    expect(messaggio).not.toContain(TESTO_DEL_DATABASE)
  })

  it('ma dice QUALE documento non ha avuto il numero — il tipo non è un fatto interno', async () => {
    const cl = clientFinto({ data: null, error: { message: TESTO_DEL_DATABASE } })
    let messaggio = ''
    try {
      await generaProgressivo(cl, 'lab-1', 'ddc', 2026)
    } catch (e) {
      messaggio = e instanceof Error ? e.message : String(e)
    }
    // Serve a chi legge: senza, «non è stato possibile assegnare il numero» non
    // dice nemmeno a quale documento.
    expect(messaggio).toContain('ddc')
  })

  it('il dettaglio NON è perso: finisce nel log del server', async () => {
    const cl = clientFinto({ data: null, error: { message: TESTO_DEL_DATABASE } })
    try {
      await generaProgressivo(cl, 'lab-1', 'fattura', 2026)
    } catch {
      /* atteso */
    }
    expect(spiaLog).toHaveBeenCalled()
    // ⚠️ Gli argomenti si serializzano, NON si convertono con String(): l'errore
    // viene passato come oggetto (che è il modo giusto — la console di Node lo
    // espande), e `String(oggetto)` darebbe «[object Object]». Una verifica così
    // sarebbe rossa su un codice giusto: la prima stesura lo era.
    const scritto = spiaLog.mock.calls
      .map((c: unknown[]) => c.map((a: unknown) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
      .join(' ')
    expect(scritto).toContain('progressivi_anno')
  })

  it('e resta agganciato all\'errore come `cause`, per chi lo raccoglie più in alto', async () => {
    const cl = clientFinto({ data: null, error: { message: TESTO_DEL_DATABASE } })
    let causa: unknown = undefined
    try {
      await generaProgressivo(cl, 'lab-1', 'buono', 2026)
    } catch (e) {
      causa = (e as Error).cause
    }
    expect(causa).toBeDefined()
    expect(JSON.stringify(causa)).toContain('progressivi_anno')
  })
})

describe('P11 — il secondo guasto, quello del valore assurdo', () => {
  it('un valore non numerico non fa uscire niente di interno', async () => {
    const cl = clientFinto({ data: 'pippo', error: null })
    let messaggio = ''
    try {
      await generaProgressivo(cl, 'lab-1', 'sdi_invio', 2026)
    } catch (e) {
      messaggio = e instanceof Error ? e.message : String(e)
    }
    // Qui il valore VIENE dal database ma non è un suo messaggio: è il dato che
    // ci ha restituito. Dirlo è utile e non svela niente della sua struttura.
    expect(messaggio).toContain('sdi_invio')
    expect(messaggio).not.toContain('progressivi_anno')
  })

  it('zero e i negativi restano rifiutati — un progressivo comincia da 1', async () => {
    await expect(generaProgressivo(clientFinto({ data: 0, error: null }), 'l', 'ddc', 2026)).rejects.toThrow()
    await expect(generaProgressivo(clientFinto({ data: -3, error: null }), 'l', 'ddc', 2026)).rejects.toThrow()
  })

  it('un numero buono passa, e torna così com\'è', async () => {
    await expect(generaProgressivo(clientFinto({ data: 42, error: null }), 'l', 'ddc', 2026)).resolves.toBe(42)
  })
})
