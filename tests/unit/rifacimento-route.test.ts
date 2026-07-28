import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

const { mockFrom, mockRpc, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))

import { POST } from '@/app/api/lavori/[id]/rifacimento/route'

/**
 * Mock di `.rpc()` che riproduce la pigrizia di `PostgrestFilterBuilder`
 * (`dispatched` diventa `true` SOLO dentro `then()`) — stesso pattern di
 * `tests/unit/parco.test.ts` / `tests/unit/annulla-consegna-route.test.ts`.
 * Instrada per NOME di funzione perché questa route chiama DUE RPC diverse
 * nello stesso POST (`crea_rifacimento_atomico` e, solo dopo il suo esito ok,
 * `cassetta_trasferisci_rifacimento`).
 *
 * Una RPC chiamata ma non prevista dalla `sequenze` del test viene comunque
 * REGISTRATA in `chiamate` PRIMA di "fallire" dentro `then()`: un test che
 * vuole provare «questa RPC non viene mai chiamata» ispeziona `chiamate`,
 * non si fida del fail-soft della route (lezione Task 7/8).
 */
function mockRpcLazy(sequenze: Record<string, Array<{ data: unknown; error: unknown }>>) {
  const indici: Record<string, number> = {}
  const chiamate: Array<{ fn: string; args: unknown; dispatched: boolean }> = []
  const rpc = (fn: string, args: unknown) => {
    const chiamata = { fn, args, dispatched: false }
    chiamate.push(chiamata)
    const seq = sequenze[fn]
    return {
      then(resolve: (v: { data: unknown; error: unknown }) => void) {
        chiamata.dispatched = true
        if (!seq) throw new Error(`RPC inattesa nel test: ${fn}`)
        const i = indici[fn] ?? 0
        indici[fn] = i + 1
        resolve(seq[i] ?? seq[seq.length - 1])
      },
    }
  }
  return { rpc, chiamate }
}

const LAB_ID = 'lab-1'
const LAVORO_VECCHIO_ID = 'lavoro-1'
const LAVORO_NUOVO_ID = 'lavoro-2'
const NUMERO_LAVORO = 'LAV-2026-002'
const RIFACIMENTO_OK = { data: { lavoro_nuovo_id: LAVORO_NUOVO_ID, numero_lavoro: NUMERO_LAVORO }, error: null }

const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const params = Promise.resolve({ id: LAVORO_VECCHIO_ID })

function req(body: unknown, headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  // La route dichiara `req: NextRequest` (import da 'next/server') — un
  // `Request` DOM piatto non ha `cookies`/`nextUrl`/`page`/`ua`. Stesso `as
  // never` di `tests/unit/annulla-consegna-route.test.ts`, l'altra route con
  // firma `NextRequest`.
  return new Request(`http://localhost/api/lavori/${LAVORO_VECCHIO_ID}/rifacimento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as never
}

const BODY_VALIDO = { motivo: 'colore_sbagliato' }

/** Mock di `svc.from('lavori')` per il pre-check di esistenza/stato (guard iniziale della route). */
function mockLavoroTrovato(stato: string | null = 'pronto') {
  const chain = createChain({ data: stato === null ? null : { id: LAVORO_VECCHIO_ID, stato }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') return chain
    throw new Error(`Unexpected table: ${table}`)
  })
  return chain
}

describe('POST /api/lavori/[id]/rifacimento', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  // ─── Regressione: guardie esistenti della route (invariate, nessun test
  // precedente esisteva in tests/unit/ — vedi report) ───

  it('cross-origin (isSameOrigin false) → 403, nessuna query né RPC', async () => {
    const res = await POST(req(BODY_VALIDO, { origin: 'http://evil.com', host: 'localhost' }), { params })
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('context null (non autenticato) → 401', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await POST(req(BODY_VALIDO), { params })
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await POST(req(BODY_VALIDO), { params })
    expect(res.status).toBe(403)
  })

  it('laboratorio in blacklist (assertLabOperativo) → 403, nessuna query né RPC', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Test' } })
    const res = await POST(req(BODY_VALIDO), { params })
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('lavoro non trovato (assente o di un altro lab) → 404, nessuna RPC', async () => {
    mockLavoroTrovato(null)
    const { rpc, chiamate } = mockRpcLazy({ crea_rifacimento_atomico: [RIFACIMENTO_OK] })
    mockRpc.mockImplementation(rpc)
    const res = await POST(req(BODY_VALIDO), { params })
    expect(res.status).toBe(404)
    expect(chiamate).toHaveLength(0)
  })

  it('lavoro annullato → 409, nessuna RPC', async () => {
    mockLavoroTrovato('annullato')
    const { rpc, chiamate } = mockRpcLazy({ crea_rifacimento_atomico: [RIFACIMENTO_OK] })
    mockRpc.mockImplementation(rpc)
    const res = await POST(req(BODY_VALIDO), { params })
    expect(res.status).toBe(409)
    expect(chiamate).toHaveLength(0)
  })

  it('motivo non valido → 400, nessuna RPC', async () => {
    mockLavoroTrovato('pronto')
    const { rpc, chiamate } = mockRpcLazy({ crea_rifacimento_atomico: [RIFACIMENTO_OK] })
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ motivo: 'non_esiste' }), { params })
    expect(res.status).toBe(400)
    expect(chiamate).toHaveLength(0)
  })

  it('errore RPC crea_rifacimento_atomico → 500, e cassetta_trasferisci_rifacimento NON viene mai chiamata', async () => {
    mockLavoroTrovato('pronto')
    const { rpc, chiamate } = mockRpcLazy({
      crea_rifacimento_atomico: [{ data: null, error: { message: 'boom interno' } }],
    })
    mockRpc.mockImplementation(rpc)
    const res = await POST(req(BODY_VALIDO), { params })
    expect(res.status).toBe(500)
    expect(chiamate.some((c) => c.fn === 'cassetta_trasferisci_rifacimento')).toBe(false)
  })

  // ─── Task 9 (D-10): trasferimento cassetta al rifacimento — dopo l'esito
  // ok di crea_rifacimento_atomico (RPC MDR, invariata — caso (d) del brief) ───

  describe('Task 9 — trasferimento cassetta dopo esito ok (response INVARIATA — trasferimento silenzioso)', () => {
    it("(a) il vecchio aveva una cassetta → chiama rpc('cassetta_trasferisci_rifacimento', {p_lab, p_lavoro_vecchio, p_lavoro_nuovo}); esito 'trasferita' → response invariata, nessun log", async () => {
      mockLavoroTrovato('pronto')
      const { rpc, chiamate } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [{ data: { esito: 'trasferita', nome: 'C9' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(BODY_VALIDO), { params })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ lavoro_nuovo_id: LAVORO_NUOVO_ID, numero_lavoro: NUMERO_LAVORO })
      const chiamataTrasf = chiamate.find((c) => c.fn === 'cassetta_trasferisci_rifacimento')
      expect(chiamataTrasf).toBeDefined()
      expect(chiamataTrasf?.dispatched).toBe(true)
      expect(chiamataTrasf?.args).toEqual({
        p_lab: LAB_ID, p_lavoro_vecchio: LAVORO_VECCHIO_ID, p_lavoro_nuovo: LAVORO_NUOVO_ID,
      })
      expect(consoleErrorSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("(b) il vecchio senza cassetta → esito 'niente_da_trasferire': RPC comunque chiamata, response invariata, nessun errore", async () => {
      mockLavoroTrovato('pronto')
      const { rpc, chiamate } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [{ data: { esito: 'niente_da_trasferire' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(BODY_VALIDO), { params })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ lavoro_nuovo_id: LAVORO_NUOVO_ID, numero_lavoro: NUMERO_LAVORO })
      // RED-ness di questo caso: la RPC deve essere stata chiamata (non solo che
      // non ci sia errore, che sarebbe vero anche senza l'helper).
      expect(chiamate.some((c) => c.fn === 'cassetta_trasferisci_rifacimento' && c.dispatched)).toBe(true)
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it("(c) rpc('crea_rifacimento_atomico') va a buon fine ma il trasferimento cassetta lancia un'eccezione di rete vera (non un oggetto errore) → fail-soft: la route ritorna comunque {lavoro_nuovo_id, numero_lavoro}, loggato", async () => {
      mockLavoroTrovato('pronto')
      mockRpc.mockImplementation((fn: string) => {
        if (fn === 'crea_rifacimento_atomico') return Promise.resolve(RIFACIMENTO_OK)
        if (fn === 'cassetta_trasferisci_rifacimento') throw new Error('rete giù')
        throw new Error(`RPC inattesa: ${fn}`)
      })
      const res = await POST(req(BODY_VALIDO), { params })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ lavoro_nuovo_id: LAVORO_NUOVO_ID, numero_lavoro: NUMERO_LAVORO })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('(d) la RPC fiscale crea_rifacimento_atomico è invariata: il suo shape di chiamata e la sua gestione errori restano quelle di sempre', async () => {
      mockLavoroTrovato('pronto')
      const { rpc, chiamate } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [{ data: { esito: 'niente_da_trasferire' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      await POST(req({ motivo: 'misura_errata', rilevato_in: 'prova_1', costo_interno: 12.5, note: 'nota' }), { params })
      const chiamataCrea = chiamate.find((c) => c.fn === 'crea_rifacimento_atomico')
      expect(chiamataCrea?.args).toEqual({
        p_lavoro_originale_id: LAVORO_VECCHIO_ID,
        p_motivo: 'misura_errata',
        p_rilevato_in: 'prova_1',
        p_costo_interno: 12.5,
        p_note: 'nota',
      })
    })

    // ─── Correzioni 21/07: 4 esiti, non 4 — occupata e lavoro_non_valido
    // vanno LOGGATI DISTINTAMENTE, e mai come successo silenzioso ───

    it("occupata → response invariata, ma console.WARN distinto (anomalo-ma-spiegabile: il pre-check anti-sfratto ha protetto un'assegnazione esistente — non un difetto)", async () => {
      mockLavoroTrovato('pronto')
      const { rpc } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [{ data: { esito: 'occupata', nome: 'C7' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(BODY_VALIDO), { params })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ lavoro_nuovo_id: LAVORO_NUOVO_ID, numero_lavoro: NUMERO_LAVORO })
      expect(consoleWarnSpy).toHaveBeenCalled()
      // Distinto da lavoro_non_valido: qui NON è un difetto, quindi mai error.
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('lavoro_non_valido → response invariata, ma console.ERROR distinto (su un lavoro appena creato dal rifacimento è un difetto altrove)', async () => {
      mockLavoroTrovato('pronto')
      const { rpc } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [{ data: { esito: 'lavoro_non_valido' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(BODY_VALIDO), { params })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ lavoro_nuovo_id: LAVORO_NUOVO_ID, numero_lavoro: NUMERO_LAVORO })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it("occupata e lavoro_non_valido sono loggati con livelli DIVERSI (non lo stesso messaggio riciclato)", async () => {
      mockLavoroTrovato('pronto')
      const { rpc: rpcOccupata } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [{ data: { esito: 'occupata', nome: 'C7' }, error: null }],
      })
      mockRpc.mockImplementation(rpcOccupata)
      await POST(req(BODY_VALIDO), { params })
      const warnCount1 = consoleWarnSpy.mock.calls.length
      const errorCount1 = consoleErrorSpy.mock.calls.length
      expect(warnCount1).toBeGreaterThan(0)
      expect(errorCount1).toBe(0)

      vi.clearAllMocks()
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockGetFreshLabContext.mockResolvedValue(CONTEXT)
      mockLavoroTrovato('pronto')
      const { rpc: rpcInvalido } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [{ data: { esito: 'lavoro_non_valido' }, error: null }],
      })
      mockRpc.mockImplementation(rpcInvalido)
      await POST(req(BODY_VALIDO), { params })
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it("l'oggetto errore Postgrest (data:null, error:{...}) sul trasferimento NON viene lanciato da postgrest-js: deve essere controllato esplicitamente → fail-soft, loggato, response invariata", async () => {
      mockLavoroTrovato('pronto')
      const { rpc } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [{ data: null, error: { message: 'connection reset', code: '08006' } }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(BODY_VALIDO), { params })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ lavoro_nuovo_id: LAVORO_NUOVO_ID, numero_lavoro: NUMERO_LAVORO })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('esito ignoto dalla RPC di trasferimento → loggato, MAI un successo silenzioso (direzione di guasto peggiore)', async () => {
      mockLavoroTrovato('pronto')
      const { rpc } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [{ data: { esito: 'esito_futuro_non_mappato' }, error: null }],
      })
      mockRpc.mockImplementation(rpc)
      const res = await POST(req(BODY_VALIDO), { params })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ lavoro_nuovo_id: LAVORO_NUOVO_ID, numero_lavoro: NUMERO_LAVORO })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('retry sul 40P01 (contratto migration — Task 4/5/8/9): primo tentativo deadlock, secondo trasferita → response invariata, RPC dispatched 2 volte', async () => {
      vi.useFakeTimers()
      mockLavoroTrovato('pronto')
      const { rpc, chiamate } = mockRpcLazy({
        crea_rifacimento_atomico: [RIFACIMENTO_OK],
        cassetta_trasferisci_rifacimento: [
          { data: null, error: { code: '40P01', message: 'deadlock detected' } },
          { data: { esito: 'trasferita', nome: 'C9' }, error: null },
        ],
      })
      mockRpc.mockImplementation(rpc)
      const promessa = POST(req(BODY_VALIDO), { params })
      await vi.advanceTimersByTimeAsync(1000)
      const res = await promessa
      vi.useRealTimers()

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ lavoro_nuovo_id: LAVORO_NUOVO_ID, numero_lavoro: NUMERO_LAVORO })
      const chiamateTrasf = chiamate.filter((c) => c.fn === 'cassetta_trasferisci_rifacimento')
      expect(chiamateTrasf).toHaveLength(2)
      expect(chiamateTrasf[0].dispatched).toBe(true)
      expect(chiamateTrasf[1].dispatched).toBe(true)
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })
  })

  // ─── G1 (revisione pre-merge 28/07/2026): denti e colore del rifacimento ───
  //
  // 🛑 CHE COSA QUESTO BLOCCO **NON** COPRE, e perché.
  // La correzione di G1 vive INTERAMENTE dentro PL/pgSQL
  // (`20260728103000_rifacimento_clona_denti_colore.sql`): la clonazione delle
  // righe di `lavori_denti`, la copia del default di caso
  // `colore_scala`/`colore_codice`, la conservazione di `provenienza` e il fatto
  // che `denti_coinvolti` NON venga azzerato sui lavori senza righe. Niente di
  // tutto questo attraversa il processo Node: la route manda cinque parametri e
  // riceve due campi, identici a prima e dopo la correzione. Nessun test unitario
  // in questo file può quindi vedere un dente o un colore, e uno che fingesse di
  // vederli sarebbe una decorazione.
  // Quelle proprietà sono provate sul database vero, in transazione ANNULLATA:
  // output nel rapporto dell'esecutore G1 (5 righe clonate, 0 differenze,
  // `provenienza='eseguito'` conservata su 2 righe, colore di caso presente,
  // contro-prova sul lavoro legacy senza righe).
  // 🛑 E NON si scrive un test sul TESTO della migration: è esattamente il
  //    difetto G3 della stessa revisione (`readFileSync(...).toContain(...)`,
  //    che passava anche togliendo la riga vera).
  //
  // ✅ CHE COSA QUESTO BLOCCO COPRE — l'unica cosa che vive davvero qui:
  // l'INVARIANTE ARCHITETTURALE su cui la correzione poggia. Il rifacimento è
  // già COMMITTATO quando la RPC ritorna. Se un domani qualcuno "chiudesse" G1
  // dalla route — un secondo giro di rete che scrive i denti dopo l'esito ok —
  // la clonazione smetterebbe di essere atomica: un errore di rete lascerebbe il
  // lavoro nuovo senza denti e senza modo di accorgersene, cioè di nuovo il
  // difetto latente di G1, su un dato che finisce nella Dichiarazione di
  // Conformità. Questa è la guardia contro quella "correzione".
  describe('G1 — la clonazione di denti e colore è atomica DENTRO la RPC, mai un secondo giro dalla route', () => {
    const METODI_DI_SCRITTURA = ['insert', 'update', 'upsert', 'delete'] as const

    /**
     * Mock PERMISSIVO, deliberatamente diverso da `createChain` / `mockRpcLazy`
     * usati nel resto del file: accetta QUALSIASI tabella, QUALSIASI metodo di
     * chain (letture **e** scritture) e QUALSIASI nome di RPC, senza mai
     * lanciare.
     *
     * ⚠️ È qui che sta il punto (R-P4). Con i mock rigidi del resto del file un
     * secondo giro dalla route fa esplodere l'HARNESS — `Unexpected table:
     * lavori_denti`, oppure `chain.update is not a function` — e quel rosso
     * proverebbe soltanto che il mock è stretto, non che esista una guardia.
     * Misurato: con l'abbozzo inerte inserito nella route, i mock rigidi
     * facevano fallire **13 test su 21**, quasi tutti per il crash dell'harness
     * e non per un'asserzione. Con questi mock la route è libera di fare quello
     * che vuole, e a fallire è l'ASSERZIONE — l'unica cosa che vogliamo
     * misurare.
     */
    function dbPermissivo(statoLavoro: string) {
      const tocchi: Array<{ tabella: string; metodo: string }> = []
      const risultato = { data: { id: LAVORO_VECCHIO_ID, stato: statoLavoro }, error: null }
      const from = (tabella: string) => {
        const c: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'neq', 'in', 'is', 'or', 'order', 'limit', 'not', 'overrideTypes',
          ...METODI_DI_SCRITTURA]) {
          c[m] = (...args: unknown[]) => {
            void args
            tocchi.push({ tabella, metodo: m })
            return c
          }
        }
        for (const m of ['single', 'maybeSingle']) {
          c[m] = async () => {
            tocchi.push({ tabella, metodo: m })
            return risultato
          }
        }
        c.then = (resolve: (v: unknown) => void) => resolve(risultato)
        return c
      }
      return { from, tocchi }
    }

    /** Stessa filosofia sul lato RPC: qualunque nome risponde ok, nulla lancia. */
    function rpcPermissivo() {
      const chiamate: string[] = []
      const rpc = (fn: string, args: unknown) => {
        void args
        chiamate.push(fn)
        const risposta =
          fn === 'crea_rifacimento_atomico'
            ? RIFACIMENTO_OK
            : { data: { esito: 'niente_da_trasferire' }, error: null }
        return {
          then(resolve: (v: { data: unknown; error: unknown }) => void) {
            resolve(risposta)
          },
        }
      }
      return { rpc, chiamate }
    }

    it('dopo un rifacimento riuscito la route NON scrive: nessuna tabella oltre `lavori`, e su `lavori` nessun metodo di scrittura', async () => {
      const { from, tocchi } = dbPermissivo('pronto')
      mockFrom.mockImplementation(from)
      const { rpc } = rpcPermissivo()
      mockRpc.mockImplementation(rpc)

      const res = await POST(req(BODY_VALIDO), { params })
      expect(res.status).toBe(200)

      // Positiva PRIMA delle negative: se la route non toccasse nulla, le due
      // asserzioni qui sotto passerebbero su liste vuote e il test sarebbe una
      // decorazione (lezione M5 della stessa revisione — un test che può
      // passare eseguendo zero controlli non è un test).
      expect(tocchi.some((t) => t.tabella === 'lavori' && t.metodo === 'single')).toBe(true)

      // `lavori_denti` è in REVOKE ALL, service_role compreso: dalla route non
      // sarebbe nemmeno scrivibile. Se quel nome comparisse qui, il difetto
      // sarebbe già in produzione sotto forma di errore di permessi silenzioso.
      expect(tocchi.filter((t) => t.tabella !== 'lavori')).toEqual([])
      expect(
        tocchi.filter((t) => (METODI_DI_SCRITTURA as readonly string[]).includes(t.metodo))
      ).toEqual([])
    })

    it('la route chiama DUE RPC e due sole, in ordine — la clonazione non è una terza chiamata', async () => {
      const { from } = dbPermissivo('pronto')
      mockFrom.mockImplementation(from)
      const { rpc, chiamate } = rpcPermissivo()
      mockRpc.mockImplementation(rpc)

      const res = await POST(req(BODY_VALIDO), { params })
      expect(res.status).toBe(200)

      // Uguaglianza esatta, non `not.toContain`: fallisce sia se compare una
      // RPC in più sia se ne sparisce una.
      expect(chiamate).toEqual(['crea_rifacimento_atomico', 'cassetta_trasferisci_rifacimento'])
    })

    it("il motivo 'colore_sbagliato' — il caso che G1 rompeva — arriva alla RPC senza che la route aggiunga o tolga parametri", async () => {
      const { from } = dbPermissivo('consegnato')
      mockFrom.mockImplementation(from)
      const argomenti: unknown[] = []
      mockRpc.mockImplementation((fn: string, args: unknown) => {
        if (fn === 'crea_rifacimento_atomico') argomenti.push(args)
        return {
          then(resolve: (v: { data: unknown; error: unknown }) => void) {
            resolve(fn === 'crea_rifacimento_atomico' ? RIFACIMENTO_OK : { data: { esito: 'niente_da_trasferire' }, error: null })
          },
        }
      })

      const res = await POST(req({ motivo: 'colore_sbagliato', rilevato_in: 'post_consegna' }), { params })
      expect(res.status).toBe(200)

      // `toEqual` sull'oggetto intero: fallisce sia se un parametro sparisce sia
      // se ne compare uno nuovo (`p_denti`, `p_colore`…) — cioè se qualcuno
      // provasse a spostare la correzione dal database alla route passando dai
      // parametri invece che da un secondo giro.
      expect(argomenti).toEqual([
        {
          p_lavoro_originale_id: LAVORO_VECCHIO_ID,
          p_motivo: 'colore_sbagliato',
          p_rilevato_in: 'post_consegna',
          p_costo_interno: null,
          p_note: null,
        },
      ])
    })
  })
})
