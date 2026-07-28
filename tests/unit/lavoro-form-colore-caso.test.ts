import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLavoroForm } from '@/hooks/useLavoroForm'
import { idrataColoreScheda, scalaDelCodice } from '@/lib/domain/colore-dente'

// ═══════════════════════════════════════════════════════════════════════════
// Task 12-bis — il colore «di tutto il lavoro» ha di nuovo dove andare.
//
// 🔑 LA RAGIONE DI DOMINIO, parole di Francesco (28/07/2026), fonte primaria:
//   «si può succedere di voler inserire il colore ad esempio su di una protesi
//    totale senza indicare il dente.»
//
// Il Task 12 fermava il salvataggio con «Il colore si registra sul dente»
// quando non c'era nemmeno un elemento: era la scelta giusta fra le due
// possibili (meglio dirlo che perdere il dato in silenzio), ma NON è una via di
// correzione — e su una protesi totale è il caso NORMALE, non un limite.
//
// Da qui in avanti il colore ha due destinazioni, e una sola alla volta:
//   • ci sono ELEMENTI  → il colore si scrive sulle RIGHE (`lavori_denti`),
//                         e il default di caso NON si tocca;
//   • non ci sono       → il colore si scrive sul DEFAULT DI CASO
//                         (`lavori.colore_scala`/`colore_codice`).
//
// 🛑 È esattamente la regola con cui il colore si RILEGGE
// (`idrataColoreScheda`: la riga vince, il caso è il ripiego). Si scrive dove
// si legge: è ciò che impedisce le due verità e il dato fantasma.
//
// ⚠️ Il discriminante è «ci sono ELEMENTI», non «ci sono denti»: un lavoro con
// soli `denti_mancanti` ha delle righe, ma nessuna che possa portare un colore
// (il colore va sui soli elementi, e `lavori_denti_zone_ck` chiede la scala).
// ═══════════════════════════════════════════════════════════════════════════

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const GETTONE = '2026-07-28T09:00:00.123456+00:00'

/**
 * La fixture è un lavoro nato dal WIZARD: il colore sta nel default di caso
 * («A2»), le eventuali righe non ne portano nessuno (`crea-lavoro.ts:262-283`
 * manda solo fdi/ruolo/provenienza). `colore_dente` è quindi ciò che
 * `idrataColoreScheda` ha ricavato dal CASO, non da una riga.
 *
 * 🔴 `colore_scala` porta di proposito un valore che NON sta con nessuno dei
 * codici usati qui («vita_3d_master» con «A2»): se la coppia stantia di
 * `{ ...data }` scivolasse nella PATCH, il server filtrerebbe il catalogo per
 * quella scala, non troverebbe nulla e SCARTEREBBE un colore perfettamente
 * valido. Una fixture con `colore_scala: null` non se ne accorgerebbe.
 */
const LAVORO_SENZA_DENTI = {
  id: 'L1',
  updated_at: GETTONE,
  incluso_in_fattura: false,
  denti_coinvolti: [],
  denti_mancanti: [],
  denti_impianti: [],
  colore_scala: 'vita_3d_master',
  colore_codice: 'A2',
  colore_dente: 'A2',
  colore_collo: null,
  colore_corpo: null,
  colore_incisale: null,
  descrizione: 'Protesi totale superiore',
} as never

const LAVORO_CON_ELEMENTI = {
  ...(LAVORO_SENZA_DENTI as object),
  denti_coinvolti: ['11', '13'],
  descrizione: 'Corona',
} as never

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

describe('il colore di tutto il lavoro finisce sul default di caso (Task 12-bis)', () => {
  it('🔴 senza nemmeno un elemento il colore parte, e parte nella PATCH come `colore_codice`', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO_SENZA_DENTI))
    act(() => { result.current.update({ colore_dente: 'B1' }) })
    await act(async () => { await result.current.save('L1') })

    expect(result.current.saveError).toBeNull()
    const corpo = corpoDi(patchLavoro()[0])
    expect(corpo.colore_codice).toBe('B1')
  })

  it('🔴 la scala STANTIA di `{ ...data }` non parte MAI: la deduce il catalogo', async () => {
    // `lavoroIdratato` porta in `data` anche `lavori.colore_scala` così com'è
    // nel database. Spedirla insieme a un codice nuovo farebbe filtrare il
    // catalogo su una scala sbagliata: `trovate.length !== 1` → colore
    // scartato, su un valore che il catalogo conosce benissimo.
    const { result } = renderHook(() => useLavoroForm(LAVORO_SENZA_DENTI))
    act(() => { result.current.update({ colore_dente: 'B1' }) })
    await act(async () => { await result.current.save('L1') })

    expect(corpoDi(patchLavoro()[0])).not.toHaveProperty('colore_scala')
  })

  it('🛑 con degli elementi il caso NON si tocca: nessuna delle due chiavi parte', async () => {
    // Le righe vincono in lettura: riscrivere anche il caso lascerebbe due
    // verità, di cui una invisibile — e riemergerebbe il giorno in cui le
    // righe si svuotano.
    const { result } = renderHook(() => useLavoroForm(LAVORO_CON_ELEMENTI))
    act(() => { result.current.update({ colore_dente: 'B1' }) })
    await act(async () => { await result.current.save('L1') })

    const corpo = corpoDi(patchLavoro()[0])
    expect(corpo).not.toHaveProperty('colore_codice')
    expect(corpo).not.toHaveProperty('colore_scala')
    // …e il colore è andato dove doveva: sulle righe.
    expect(corpoDi(putDenti()[0]).denti[0]).toMatchObject({ codice: 'B1', scala: 'vita_classical' })
  })

  it('⚠️ un lavoro con SOLI denti mancanti ha delle righe, ma il colore va sul caso', async () => {
    // «Ha dei denti» non è il discriminante: una riga `mancante` non può
    // portare un colore. Il discriminante è «ha degli ELEMENTI».
    const { result } = renderHook(() => useLavoroForm({
      ...(LAVORO_SENZA_DENTI as object), denti_mancanti: [26],
    } as never))
    act(() => { result.current.update({ colore_dente: 'B1' }) })
    await act(async () => { await result.current.save('L1') })

    expect(corpoDi(patchLavoro()[0]).colore_codice).toBe('B1')
  })

  it('🔑 azzerare il colore su un lavoro senza denti lo cancella davvero', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO_SENZA_DENTI))
    act(() => { result.current.update({ colore_dente: null }) })
    await act(async () => { await result.current.save('L1') })

    const corpo = corpoDi(patchLavoro()[0])
    expect(corpo).toHaveProperty('colore_codice')
    expect(corpo.colore_codice).toBeNull()
  })

  it('un colore che il catalogo non conosce non blocca più il salvataggio senza denti', async () => {
    // Regola dura del Task 11: si perde il colore, non il lavoro. Con nessun
    // elemento la coppia non deve essere completa QUI — la degrada il server,
    // che è l'unico a vedere il catalogo vero.
    const { result } = renderHook(() => useLavoroForm(LAVORO_SENZA_DENTI))
    act(() => { result.current.update({ colore_dente: 'ZZ9', descrizione: 'Riparazione' }) })
    await act(async () => { await result.current.save('L1') })

    expect(result.current.saveError).toBeNull()
    expect(patchLavoro()).toHaveLength(1)
    expect(corpoDi(patchLavoro()[0]).descrizione).toBe('Riparazione')
  })

  it('🛑 le tre zone del ceramista senza un dente si dicono, non si perdono', async () => {
    // Il default di caso è una COPPIA (scala, codice) e basta: non ha zone da
    // offrire, e `lavori.colore_collo/corpo/incisale` sono sentinelle del Task
    // 10 senza più nessuno scrittore. Con nessun elemento le zone non hanno
    // NESSUNA destinazione: l'unica alternativa a dirlo sarebbe buttarle via in
    // silenzio.
    const { result } = renderHook(() => useLavoroForm(LAVORO_SENZA_DENTI))
    act(() => { result.current.update({ colore_collo: 'A3' }) })
    await act(async () => { await result.current.save('L1').catch(() => {}) })

    expect(result.current.saveError).toMatch(/dente/i)
    expect(putDenti()).toHaveLength(0)
    expect(patchLavoro()).toHaveLength(0)
  })

  it('🔴 un colore che non ha righe dove atterrare non fa più partire un PUT a vuoto', async () => {
    // `PUT /denti` è a SOSTITUZIONE INTEGRALE e riscrive ogni riga con
    // `provenienza: 'eseguito'`. Farlo partire per un colore che finisce sul
    // CASO cancellerebbe la traccia di ciò che il dentista aveva PRESCRITTO,
    // senza scrivere un solo colore in cambio.
    const { result } = renderHook(() => useLavoroForm({
      ...(LAVORO_SENZA_DENTI as object), denti_mancanti: [26],
    } as never))
    act(() => { result.current.update({ colore_dente: 'B1' }) })
    await act(async () => { await result.current.save('L1') })

    expect(putDenti()).toHaveLength(0)
    expect(patchLavoro()).toHaveLength(1)
  })

  it('il primo elemento aggiunto riporta il colore sulle righe, e il PUT riparte', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO_SENZA_DENTI))
    act(() => { result.current.update({ denti_coinvolti: ['11'] }) })
    await act(async () => { await result.current.save('L1') })

    expect(corpoDi(putDenti()[0]).denti[0]).toMatchObject({ fdi: 11, codice: 'A2', scala: 'vita_classical' })
    expect(corpoDi(patchLavoro()[0])).not.toHaveProperty('colore_codice')
  })
})

describe('🔴 scrivi → rileggi → ritrova, sui due rami', () => {
  // L'invariante che tiene insieme scrittura e lettura: dopo il salvataggio, il
  // colore riletto dalle righe e dal caso EFFETTIVAMENTE scritti deve essere
  // quello che l'utente ha digitato. Le due destinazioni si provano con lo
  // stesso metro, e i dati vengono dai corpi OSSERVATI, non da una fixture
  // scritta a mano — che sarebbe una prova su se stessa.

  it('ramo RIGHE: il colore torna dalla riga, e il caso è rimasto quello di prima', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO_CON_ELEMENTI))
    act(() => { result.current.update({ colore_dente: 'B1' }) })
    await act(async () => { await result.current.save('L1') })

    const righe = corpoDi(putDenti()[0]).denti
    // Il caso non è stato toccato: resta la coppia della fixture.
    const patch = corpoDi(patchLavoro()[0])
    expect(patch).not.toHaveProperty('colore_codice')
    const caso = { colore_scala: 'vita_3d_master', colore_codice: 'A2' }

    expect(idrataColoreScheda(righe, caso).colore_dente).toBe('B1')
  })

  it('ramo CASO: senza righe il colore torna dal default di caso', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO_SENZA_DENTI))
    act(() => { result.current.update({ colore_dente: 'B1' }) })
    await act(async () => { await result.current.save('L1') })

    // La coppia che il server scriverà, ricavata dal codice OSSERVATO nella
    // PATCH: la scala la deduce il catalogo, non il client.
    const codice = corpoDi(patchLavoro()[0]).colore_codice as string
    const caso = { colore_scala: scalaDelCodice(codice), colore_codice: codice }

    expect(idrataColoreScheda([], caso).colore_dente).toBe('B1')
  })
})
