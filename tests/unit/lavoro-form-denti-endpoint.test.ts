import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLavoroForm } from '@/hooks/useLavoroForm'
import { idrataColoreScheda } from '@/lib/domain/colore-dente'

// ═══════════════════════════════════════════════════════════════════════════
// Task 12 — la scheda del lavoro scrive denti e colore sul loro endpoint.
//
// Il Task 10 ha tolto sette nomi da PATCHABLE_FIELDS e
// `src/app/api/lavori/[id]/route.ts:320-324` SCARTA IN SILENZIO ogni chiave
// fuori allowlist. Finché il form spedisce `{ ...data }`, chi corregge un dente
// dalla scheda legge «Salvato» su un dato che il server ha buttato via.
//
// 🔴 E c'è la seconda metà, che non basta la scrittura a chiudere: le due RPC
// denormalizzano su `lavori` SOLO i tre `denti_*`
// (20260727120300_lavori_denti_rpc.sql:115-121 e :205-211 — gli `UPDATE lavori
// SET` non nominano nessuna colonna del colore). Le quattro `lavori.colore_*`
// non hanno più alcuno scrittore: se la scheda continuasse a idratarsi da lì,
// l'utente scriverebbe un colore, leggerebbe «Salvato» (vero: il dato è nelle
// righe) e ricaricando NON lo troverebbe più. Per questo il caso che conta è
// «scrivi → rileggi → ritrova», non «la scrittura è partita».
// ═══════════════════════════════════════════════════════════════════════════

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// ⚠️ `updated_at` con i MICROSECONDI: è la forma vera di un `timestamptz` letto
// da PostgREST. Un solo giro dentro `new Date(...)` troncherebbe `.123456` a
// `.123` e il confronto `IS DISTINCT FROM` dentro la RPC non tornerebbe MAI
// uguale — 409 permanente, che nemmeno ricaricando la pagina si sana.
const GETTONE = '2026-07-27T09:00:00.123456+00:00'

const LAVORO = {
  id: 'L1',
  updated_at: GETTONE,
  incluso_in_fattura: false,
  denti_coinvolti: ['11'],
  denti_mancanti: [26],
  denti_impianti: [],
  colore_dente: 'A3',
  colore_collo: null,
  colore_corpo: null,
  colore_incisale: null,
  descrizione: 'Corona',
} as never

const SENTINELLE = [
  'denti_coinvolti', 'denti_mancanti', 'denti_impianti',
  'colore_dente', 'colore_collo', 'colore_corpo', 'colore_incisale',
]

type Chiamata = [string, { method?: string; body?: string }]
const chiamate = () => fetchMock.mock.calls as unknown as Chiamata[]
const putDenti = () => chiamate().filter((c) => String(c[0]).endsWith('/denti'))
const patchLavoro = () => chiamate().filter((c) => c[1]?.method === 'PATCH')
const corpoDi = (c: Chiamata) => JSON.parse(c[1].body as string)

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation((url: string) =>
    Promise.resolve(
      String(url).endsWith('/denti')
        ? { ok: true, status: 200, json: async () => ({ denti: [], updated_at: 'NUOVO-DENTI' }) }
        : { ok: true, status: 200, json: async () => ({ lavoro: { updated_at: 'NUOVO-PATCH' } }) }
    )
  )
})

describe('il form del lavoro scrive i denti sul loro endpoint (sentinelle, Task 10)', () => {
  it('nessuno dei sette campi parte più nella PATCH', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ descrizione: 'Corona zirconia' }) })
    await act(async () => { await result.current.save('L1') })

    const corpo = corpoDi(patchLavoro()[0])
    for (const campo of SENTINELLE) expect(corpo).not.toHaveProperty(campo)
    expect(corpo.descrizione).toBe('Corona zirconia')   // il resto passa come prima
  })

  it('se denti e colore NON cambiano, il PUT non parte affatto', async () => {
    // Il PUT è a SOSTITUZIONE INTEGRALE e riscrive ogni riga con
    // `provenienza: 'eseguito'`. Spedirlo a ogni salvataggio vorrebbe dire che
    // correggere un refuso nella descrizione cancella la traccia di ciò che il
    // dentista aveva PRESCRITTO — e, su un lavoro con dati clinici imperfetti
    // (zone senza base, un FDI legacy fuori dominio), un 422 dal PUT
    // bloccherebbe il salvataggio di QUALUNQUE altro campo.
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ descrizione: 'Corona zirconia' }) })
    await act(async () => { await result.current.save('L1') })

    expect(putDenti()).toHaveLength(0)
    expect(patchLavoro()).toHaveLength(1)
  })

  it('i denti vanno in PUT /denti, con ruoli tradotti e updated_at per il conflitto', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ denti_coinvolti: ['11', '13'] }) })
    await act(async () => { await result.current.save('L1') })

    const put = putDenti()[0]
    expect(put[1].method).toBe('PUT')
    const corpo = corpoDi(put)
    expect(corpo.atteso_updated_at).toBe(GETTONE)   // verbatim, mai riparsato
    expect(corpo.denti).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fdi: 11, ruolo: 'elemento', codice: 'A3', scala: 'vita_classical',
                                  codice_collo: null, codice_corpo: null, codice_incisale: null,
                                  provenienza: 'eseguito' }),
        expect.objectContaining({ fdi: 13, ruolo: 'elemento' }),
        expect.objectContaining({ fdi: 26, ruolo: 'mancante', scala: null, codice: null }),
      ])
    )
    expect(corpo.denti).toHaveLength(3)
  })

  it('🔴 le tre zone del ceramista NON diventano tendine morte', async () => {
    // Le colonne escono da PATCHABLE_FIELDS col Task 10: se non viaggiassero
    // qui, l'utente sceglierebbe un valore e lo vedrebbe sparire in silenzio.
    // Direttiva permanente: ogni campo si corregge fino alla consegna.
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ colore_collo: 'A2', colore_corpo: 'A3', colore_incisale: 'B1' }) })
    await act(async () => { await result.current.save('L1') })

    expect(corpoDi(putDenti()[0]).denti[0]).toMatchObject({
      codice_collo: 'A2', codice_corpo: 'A3', codice_incisale: 'B1',
    })
  })

  it('le zone senza un colore di base partono lo stesso: le rifiuta il server, non il client', async () => {
    // `lavori_denti_zone_ck` vieta le zone senza (scala, codice), e la route
    // risponde 422 «le zone del colore richiedono scala e codice». Toglierle
    // qui per evitare l'errore sarebbe di nuovo la bugia del Task 10: l'utente
    // vedrebbe «Salvato» su un valore mai partito. Meglio un errore visibile.
    const { result } = renderHook(() => useLavoroForm({ ...(LAVORO as object), colore_dente: null } as never))
    act(() => { result.current.update({ colore_collo: 'A2' }) })
    await act(async () => { await result.current.save('L1') })

    expect(corpoDi(putDenti()[0]).denti[0]).toMatchObject({
      scala: null, codice: null, codice_collo: 'A2',
    })
  })

  it('i tre codici fuori scala restano ammessi: l app li offre da sempre', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ colore_dente: 'BL' } as never) })
    await act(async () => { await result.current.save('L1') })

    expect(corpoDi(putDenti()[0]).denti[0]).toMatchObject({ codice: 'BL', scala: 'fuori_scala' })
  })

  it('🔴 un codice VITA 3D-Master non viene spedito con la scala sbagliata', async () => {
    // Difetto trovato eseguendo il task: la casella «Colore» del wizard
    // (PassoPaziente.tsx:91-98) è TESTO LIBERO e `POST /api/lavori` risolve il
    // codice sull'INTERO catalogo di 48 voci, 3D-Master comprese. Dedurre la
    // scala con un «se non è T/BL/OM allora è vita_classical» manderebbe la
    // coppia ('vita_classical','2M2'), che non esiste in `colori_dentali`:
    // violazione di `lavori_denti_colore_fk` → 500, e ogni salvataggio della
    // scheda bloccato per sempre su quel lavoro.
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ colore_dente: '2M2' } as never) })
    await act(async () => { await result.current.save('L1') })

    expect(corpoDi(putDenti()[0]).denti[0]).toMatchObject({ codice: '2M2', scala: 'vita_3d_master' })
  })

  it('un codice che il catalogo non conosce si ferma qui, dichiarato — non parte mezzo', async () => {
    // Mezza coppia non è mezzo colore: spedire `codice` senza `scala`
    // violerebbe `lavori_denti_coppia_ck`. E spedire il dente SENZA il colore
    // sarebbe la perdita silenziosa. Si dice, e non si salva.
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ colore_dente: 'ZZ9' } as never) })
    await act(async () => { await result.current.save('L1').catch(() => {}) })

    expect(result.current.saveError).toMatch(/ZZ9/)
    expect(putDenti()).toHaveLength(0)
    expect(patchLavoro()).toHaveLength(0)
  })

  it('🔑 un colore senza nemmeno un dente non si ferma più: va sul default di caso (Task 12-bis)', async () => {
    // ⚠️ RISCRITTO DAL TASK 12-bis. Questo caso asseriva il FERMO del Task 12
    // («Il colore si registra sul dente: seleziona almeno un dente»): fra le
    // due possibili era la scelta giusta — meglio dirlo che perdere il dato in
    // silenzio — ma non era una via di CORREZIONE, e collideva con la direttiva
    // permanente «ogni campo del lavoro si corregge, fino alla consegna».
    // La ragione di dominio che l'ha rimosso, parole di Francesco (28/07/2026):
    //   «si può succedere di voler inserire il colore ad esempio su di una
    //    protesi totale senza indicare il dente.»
    // Il colore dell'intero dispositivo è un dato legittimo. Va in
    // `lavori.colore_codice` (la scala la deduce il server dal catalogo), e il
    // PUT non parte affatto: non ha nessuna riga da scrivere.
    const { result } = renderHook(() => useLavoroForm({
      ...(LAVORO as object), denti_coinvolti: [], denti_mancanti: [], colore_dente: null,
    } as never))
    act(() => { result.current.update({ colore_dente: 'A2' }) })
    await act(async () => { await result.current.save('L1') })

    expect(result.current.saveError).toBeNull()
    expect(putDenti()).toHaveLength(0)
    expect(corpoDi(patchLavoro()[0]).colore_codice).toBe('A2')
  })

  it('senza colore, un lavoro senza denti si salva normalmente', async () => {
    const { result } = renderHook(() => useLavoroForm({
      ...(LAVORO as object), denti_coinvolti: [], denti_mancanti: [], colore_dente: null,
    } as never))
    act(() => { result.current.update({ descrizione: 'Riparazione' }) })
    await act(async () => { await result.current.save('L1') })

    expect(result.current.saveError).toBeNull()
    expect(patchLavoro()).toHaveLength(1)
  })

  it('🔴 due salvataggi di fila: il secondo NON prende un 409 da solo', async () => {
    // Il difetto che questo test esiste per impedire: la RPC tocca updated_at,
    // quindi il valore in memoria invecchia a ogni salvataggio. Senza
    // riallineamento il secondo salvataggio manda un timestamp vecchio e si
    // becca un conflitto che non esiste — con un utente solo collegato.
    // ⚠️ Anche la PATCH scrive updated_at (route.ts:382 + trigger), quindi il
    // riallineamento serve DUE volte, non una.
    let corrente = GETTONE
    let passo = 0
    fetchMock.mockImplementation((url: string, opts: { body: string }) => {
      passo += 1
      if (String(url).endsWith('/denti')) {
        const inviato = JSON.parse(opts.body).atteso_updated_at
        if (inviato !== corrente) {
          return Promise.resolve({ ok: false, status: 409, json: async () => ({ updated_at: corrente }) })
        }
        corrente = `2026-07-27T09:00:0${passo}.777777+00:00`
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ denti: [], updated_at: corrente }) })
      }
      corrente = `2026-07-27T09:00:1${passo}.888888+00:00`
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ lavoro: { updated_at: corrente } }) })
    })

    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ denti_coinvolti: ['11', '13'] }) })
    await act(async () => { await result.current.save('L1') })
    act(() => { result.current.update({ denti_coinvolti: ['11', '13', '14'] }) })
    await act(async () => { await result.current.save('L1') })

    expect(result.current.saveError).toBeNull()
    expect(putDenti()).toHaveLength(2)
  })

  it('su 409 il salvataggio segnala l errore e NON prosegue con la PATCH', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).endsWith('/denti')
        ? Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'conflitto' }) })
        : Promise.resolve({ ok: true, status: 200, json: async () => ({ lavoro: {} }) })
    )
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ denti_coinvolti: ['11', '13'] }) })
    await act(async () => { await result.current.save('L1').catch(() => {}) })

    expect(result.current.saveError).toBeTruthy()
    expect(patchLavoro()).toHaveLength(0)
  })

  it('un 422 del server arriva all utente con le sue parole, e la PATCH non parte', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).endsWith('/denti')
        ? Promise.resolve({ ok: false, status: 422, json: async () => ({ error: 'le zone del colore richiedono scala e codice' }) })
        : Promise.resolve({ ok: true, status: 200, json: async () => ({ lavoro: {} }) })
    )
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ colore_collo: 'A2' }) })
    await act(async () => { await result.current.save('L1').catch(() => {}) })

    expect(result.current.saveError).toBe('le zone del colore richiedono scala e codice')
    expect(patchLavoro()).toHaveLength(0)
  })

  it('LIMITE DICHIARATO: un valore legacy non rappresentabile come dente non viene spedito', async () => {
    // `lavori.denti_coinvolti` è text[] e prima di quest ondata accettava
    // qualunque stringa — «2.6» è il difetto che l ondata (a) esiste per
    // chiudere. Non è rappresentabile in `lavori_denti.fdi` (smallint) e
    // nemmeno mostrabile nell odontogramma, quindi non può viaggiare. Non è
    // input dell utente: è residuo di dati vecchi. Riferito nel rapporto.
    const { result } = renderHook(() => useLavoroForm({ ...(LAVORO as object), denti_coinvolti: ['2.6', '11'] } as never))
    act(() => { result.current.update({ denti_coinvolti: ['2.6', '11', '13'] }) })
    await act(async () => { await result.current.save('L1') })

    expect(corpoDi(putDenti()[0]).denti.map((d: { fdi: number }) => d.fdi)).toEqual([11, 13, 26])
  })
})

describe('🔴 il ciclo completo: scrivi → rileggi → ritrova', () => {
  it('il colore scritto dalla scheda torna dalle RIGHE, con le colonne di lavori ferme', async () => {
    // ── 1. SCRIVI ────────────────────────────────────────────────────────────
    const { result } = renderHook(() => useLavoroForm({
      ...(LAVORO as object), colore_dente: null, denti_coinvolti: ['11', '13'],
    } as never))
    act(() => {
      result.current.update({
        colore_dente: 'B1', colore_collo: 'A2', colore_corpo: 'A3', colore_incisale: 'C1',
      })
    })
    await act(async () => { await result.current.save('L1') })

    // La PATCH non porta nessuno dei quattro: `lavori.colore_*` non riceve nulla.
    const patch = corpoDi(patchLavoro()[0])
    for (const campo of SENTINELLE) expect(patch).not.toHaveProperty(campo)

    // ── 2. IL DATABASE ───────────────────────────────────────────────────────
    // Le righe sono quelle che il PUT ha davvero spedito (non una fixture
    // scritta a mano: sarebbe una prova su se stessa). Le quattro colonne di
    // `lavori` restano al valore di prima — nessuna RPC le tocca.
    const righe = corpoDi(putDenti()[0]).denti as Array<Record<string, unknown>>
    const casoInvariato = { colore_scala: null, colore_codice: null }

    // ── 3. RILEGGI ───────────────────────────────────────────────────────────
    const riletto = idrataColoreScheda(
      righe as never,
      casoInvariato
    )

    // ── 4. RITROVA ───────────────────────────────────────────────────────────
    expect(riletto).toEqual({
      colore_dente: 'B1', colore_collo: 'A2', colore_corpo: 'A3', colore_incisale: 'C1',
    })
  })
})
