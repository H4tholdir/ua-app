import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════
// Task 12-bis — il colore «di tutto il lavoro» torna correggibile.
//
// 🔑 LA RAGIONE DI DOMINIO, parole di Francesco (28/07/2026), fonte primaria:
//   «si può succedere di voler inserire il colore ad esempio su di una protesi
//    totale senza indicare il dente.»
// Esiste un lavoro in cui il colore vale per l'INTERO dispositivo e i denti non
// si segnano uno per uno. Il default di caso non è un ripiego per un dato
// incompleto: è un dato legittimo, e come ogni campo del lavoro deve restare
// correggibile fino alla consegna (direttiva permanente, 27/07/2026).
//
// 🛑 PERCHÉ NON BASTA AGGIUNGERE DUE NOMI ALL'ALLOWLIST — i vincoli veri,
// riletti dal database il 28/07/2026:
//   node scripts/tmp/sql.mjs "select conname, pg_get_constraintdef(oid) from
//     pg_constraint where conrelid='lavori'::regclass and conname like '%colore%'"
//   → lavori_colore_caso_coppia_ck CHECK (((colore_scala IS NULL) = (colore_codice IS NULL)))
//   → lavori_colore_caso_fk        FOREIGN KEY (colore_scala, colore_codice)
//                                    REFERENCES colori_dentali(scala, codice)
//   → lavori_colore_scala_check    CHECK (colore_scala IS NULL OR colore_scala =
//                                    ANY (ARRAY['vita_classical','vita_3d_master','fuori_scala']))
// La coppia viaggia SEMPRE INTERA, e un codice fuori catalogo (o in minuscolo:
// il catalogo distingue le maiuscole) fa fallire l'UPDATE con una violazione di
// chiave esterna. Copiare il body nell'UPDATE sarebbe un 500 su un colore
// digitato di fretta al banco.
//
// 🛑 LA REGOLA DURA, la stessa del Task 11: **si perde il colore, non il
// lavoro.** Ogni caso qui sotto la misura.
//
// La normalizzazione è UNA SOLA (`src/lib/api/colore-caso.ts`), chiamata dal
// POST e da questa PATCH: due copie della stessa regola sono la classe di
// difetto R3 che quest'ondata combatte.
// ═══════════════════════════════════════════════════════════════════════════

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH, PATCHABLE_FIELDS } from '../../src/app/api/lavori/[id]/route'

// Il catalogo vero, ridotto ai codici che servono qui. Forma verificata sul
// database il 28/07/2026: 48 righe, nessun codice ripetuto fra scale diverse —
// è questo che rende deducibile la scala dal solo codice.
const CATALOGO: Array<{ scala: string; codice: string }> = [
  { scala: 'vita_classical', codice: 'A2' },
  { scala: 'vita_classical', codice: 'A3' },
  { scala: 'vita_classical', codice: 'B1' },
  { scala: 'fuori_scala', codice: 'BL' },
  { scala: 'vita_3d_master', codice: '2M2' },
]

let updatePayload: Record<string, unknown> | null
let spiaCatalogo = vi.fn()
let catalogoRotto = false

beforeEach(() => {
  updatePayload = null
  catalogoRotto = false
  spiaCatalogo = vi.fn()
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
    if (table === 'colori_dentali') {
      return {
        select: () => ({
          eq: (colonna: string, valore: string) => {
            spiaCatalogo(colonna, valore)
            return Promise.resolve(
              catalogoRotto
                ? { data: null, error: { message: 'catalogo giù' } }
                : { data: CATALOGO.filter((r) => r.codice === valore), error: null }
            )
          },
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
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({
        data: { incluso_in_fattura: false, tecnico_id: null, numero_lavoro: '2026/0001' },
        error: null,
      }) }) }) }) }),
      update: (p: Record<string, unknown>) => {
        updatePayload = p
        return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({
          data: { id: 'lav-1', numero_lavoro: '2026/0001', stato: 'ricevuto', updated_at: 'X' },
          error: null,
        }) }) }) }) }
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

const coloreScritto = () => ({
  colore_scala: updatePayload?.colore_scala,
  colore_codice: updatePayload?.colore_codice,
})

describe('PATCH /api/lavori/[id] — il default di caso è di nuovo correggibile', () => {
  it('le due colonne del default di caso SONO patchabili (e i sette del Task 10 no)', () => {
    // Additivo, non un ritorno indietro: `colore_scala`/`colore_codice` nascono
    // col Task 5, non sono MAI state in allowlist e hanno un solo scrittore.
    // I sette del Task 10 sono i campi per-dente legacy, con due penne in
    // conflitto: quelli restano fuori.
    expect(PATCHABLE_FIELDS).toContain('colore_scala')
    expect(PATCHABLE_FIELDS).toContain('colore_codice')
    for (const sentinella of ['denti_coinvolti', 'denti_mancanti', 'denti_impianti',
                              'colore_dente', 'colore_collo', 'colore_corpo', 'colore_incisale']) {
      expect(PATCHABLE_FIELDS).not.toContain(sentinella)
    }
  })

  it('«b1» minuscolo e senza scala → («vita_classical», «B1»): la scala la deduce il catalogo', async () => {
    const res = await patch({ colore_codice: 'b1' })

    expect(res.status).toBe(200)
    expect(coloreScritto()).toEqual({ colore_scala: 'vita_classical', colore_codice: 'B1' })
    expect(spiaCatalogo).toHaveBeenCalledWith('codice', 'B1')
  })

  it('un codice VITA 3D-Master non prende la scala sbagliata', async () => {
    // Dedurre «se non è T/BL/OM allora è vita_classical» manderebbe la coppia
    // ('vita_classical','2M2'), che in `colori_dentali` non esiste: violazione
    // di `lavori_colore_caso_fk` → 500 e lavoro non salvato.
    await patch({ colore_codice: '2m2' })

    expect(coloreScritto()).toEqual({ colore_scala: 'vita_3d_master', colore_codice: '2M2' })
  })

  it('i tre codici fuori scala arrivano al caso come gli altri', async () => {
    await patch({ colore_codice: ' bl ' })

    expect(coloreScritto()).toEqual({ colore_scala: 'fuori_scala', colore_codice: 'BL' })
  })

  it('🛑 un codice che il catalogo non conosce NON fa fallire il salvataggio: 200, colore perso', async () => {
    // La prova che conta. Senza la normalizzazione l'UPDATE porterebbe «ZZ9»
    // al database e `lavori_colore_caso_fk` risponderebbe con un errore →
    // 500, e con lui si perderebbe OGNI altra correzione dello stesso
    // salvataggio (descrizione, date, prezzo…).
    const res = await patch({ colore_codice: 'ZZ9', descrizione: 'Corona zirconia' })

    expect(res.status).toBe(200)
    expect(coloreScritto()).toEqual({ colore_scala: null, colore_codice: null })
    expect(updatePayload).toHaveProperty('descrizione', 'Corona zirconia')
  })

  it('🛑 mezza coppia non è mezzo colore: una scala orfana non entra mai nel payload', async () => {
    // `lavori_colore_caso_coppia_ck` vieta la mezza coppia. Se `colore_scala`
    // passasse per l'allowlist da sola, l'UPDATE violerebbe il CHECK → 500.
    //
    // 🔄 ASSERZIONE CORRETTA CON D260 (06/08/2026), e il titolo di questa prova
    //    diceva GIÀ la cosa giusta: «non entra mai nel payload». L'asserzione
    //    però verificava che la coppia ci entrasse AZZERATA — che protegge dal
    //    500 ma cancella un colore salvato che nessuno aveva chiesto di
    //    cancellare. Ora la prova dice quello che il suo nome prometteva, ed è
    //    più forte: chiede l'ASSENZA delle chiavi, non un valore.
    //    Il caso gemello sulla tinta, e il perché una regola sola basti per
    //    tutti e due, stanno in `tests/unit/lavori-patch-mezza-coppia.test.ts`.
    //    🔄 E LA `descrizione` È ENTRATA CON D323 (08/08/2026), non per
    //    comodità: da quando la rotta non aggiunge più `updated_at` al carico,
    //    un corpo della sola `colore_scala` lascia il carico VUOTO e la rotta
    //    non scrive affatto — con `updatePayload` a `null` questa prova non
    //    misurerebbe più l'allowlist, misurerebbe l'assenza di una scrittura.
    //    Accanto a un campo vero, l'UPDATE avviene e l'asserzione torna a
    //    discriminare esattamente ciò per cui esiste.
    const res = await patch({ colore_scala: 'vita_classical', descrizione: 'Corona' })

    expect(res.status).toBe(200)
    expect(updatePayload).toHaveProperty('descrizione', 'Corona')
    expect(updatePayload).not.toHaveProperty('colore_scala')
    expect(updatePayload).not.toHaveProperty('colore_codice')
  })

  it('una scala che non esiste non arriva al CHECK: si scarta il colore, non il lavoro', async () => {
    // `lavori_colore_scala_check` ammette solo le tre scale note.
    const res = await patch({ colore_scala: 'pippo', colore_codice: 'A3' })

    expect(res.status).toBe(200)
    expect(coloreScritto()).toEqual({ colore_scala: null, colore_codice: null })
  })

  it('scala e codice che non stanno insieme nel catalogo → nessun colore', async () => {
    const res = await patch({ colore_scala: 'vita_3d_master', colore_codice: 'A3' })

    expect(res.status).toBe(200)
    expect(coloreScritto()).toEqual({ colore_scala: null, colore_codice: null })
  })

  it('un codice che non è nemmeno una stringa non fa 500', async () => {
    const res = await patch({ colore_codice: 3 })

    expect(res.status).toBe(200)
    expect(coloreScritto()).toEqual({ colore_scala: null, colore_codice: null })
  })

  it('anche un catalogo irraggiungibile scarta il colore invece di far fallire il lavoro', async () => {
    catalogoRotto = true
    const res = await patch({ colore_codice: 'A3', descrizione: 'Corona' })

    expect(res.status).toBe(200)
    expect(coloreScritto()).toEqual({ colore_scala: null, colore_codice: null })
    expect(updatePayload).toHaveProperty('descrizione', 'Corona')
  })

  it('🔑 azzerare il colore funziona: `colore_codice: null` cancella la coppia', async () => {
    // Senza questo, «ogni campo del lavoro si corregge» varrebbe solo per
    // scrivere, non per cancellare — e il colore di un lavoro sbagliato
    // resterebbe addosso per sempre.
    const res = await patch({ colore_codice: null })

    expect(res.status).toBe(200)
    expect(coloreScritto()).toEqual({ colore_scala: null, colore_codice: null })
    expect(updatePayload).toHaveProperty('colore_scala')
    expect(updatePayload).toHaveProperty('colore_codice')
  })

  it('🛑 chi non nomina il colore non lo tocca: nessuna delle due chiavi entra nel payload', async () => {
    // È la metà che impedisce le DUE VERITÀ. Quando il colore vive sulle righe
    // di `lavori_denti`, la scheda non manda queste chiavi e il caso deve
    // restare esattamente com'era: la precedenza riga→caso mostrerebbe
    // comunque la riga, e un caso riscritto a caso sarebbe un dato fantasma.
    const res = await patch({ descrizione: 'Solo la descrizione' })

    expect(res.status).toBe(200)
    expect(updatePayload).not.toHaveProperty('colore_scala')
    expect(updatePayload).not.toHaveProperty('colore_codice')
    expect(spiaCatalogo).not.toHaveBeenCalled()   // nemmeno un viaggio al catalogo
  })
})
