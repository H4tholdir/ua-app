import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { normalizzaPrescrizione } from '@/lib/domain/prescrizione-mapper'
// Le 4 forme si IMPORTANO dalla casa unica (prescrizione-costanti.ts), non si
// ricopiano qui: una lista hardcoded nel test non è sorvegliata dalla spia di
// migrazione (`prescrizione-costanti-spia-migration.test.ts`) — una quinta
// forma aggiunta in banca dati passerebbe qui senza che il test la copra.
import { FONTE_TIPI } from '@/lib/domain/prescrizione-costanti'

// Task 6 (ondata B, sessione ③) — la lettura per la scheda (server).
//
// PERCHÉ QUESTO FILE. `GET /api/lavori/[id]` oggi non ha alcuna via di
// lettura dello snapshot della prescrizione: il select non lo embedda. Il
// Task 6 aggiunge `prescrizione:lavori_prescrizioni(*)` e la normalizzazione
// che questo modulo isola in una funzione pura, testabile senza montare la
// catena Supabase — la stessa ragione per cui `risolviColore`
// (src/lib/domain/colore-dente.ts) vive fuori dalla route che lo chiama.
//
// LA FORMA DELL'EMBED NON È SCONTATA. `lavori_prescrizioni` porta
// UNIQUE(lavoro_id) (20260804150306:48) — una riga per lavoro, sempre — ma la
// FK usata per l'embed è COMPOSITA (lavoro_id, laboratorio_id)
// (20260804150306:51-52), e lo UNIQUE non copre la coppia esatta: i tipi
// generati marcano la relazione `isOneToOne: false`
// (database.types.ts:3421-3426), quindi PostgREST restituisce l'embed come
// ARRAY (0 o 1 elementi), non un oggetto singolo. Il primo blocco di test
// prova ENTRAMBE le forme, non solo quella "comoda".

const RIGA_BASE = {
  id: 'presc-1',
  laboratorio_id: 'lab-1',
  lavoro_id: 'lavoro-1',
  contenuto: { elementi: [11, 12], colore: 'A3 come da foglio' },
  divergenze: [
    {
      campo: 'colore',
      motivo: 'richiesta_dentista',
      nota: 'colore corretto a voce',
      utente_id: 'utente-1',
      registrata_at: '2026-08-04T10:00:00Z',
    },
  ],
  fonte_tipo: 'foglio',
  fonte_immagine_id: null,
  fonte_riferimento: 'foglio cartaceo allegato',
  numero_prescrizione: 'P-2026-042',
  confermata_da: null,
  confermata_at: null,
  created_at: '2026-08-04T09:00:00Z',
  updated_at: '2026-08-04T09:00:00Z',
}

describe('normalizzaPrescrizione — riga presente', () => {
  it('oggetto singolo (embed one-to-one, se mai PostgREST lo restituisse così) → popolata e normalizzata', () => {
    const risultato = normalizzaPrescrizione(RIGA_BASE)
    expect(risultato).toEqual(RIGA_BASE)
  })

  it("array con un elemento (forma REALE data isOneToOne:false) → stesso risultato dell'oggetto singolo — l'unwrap non deve cambiare i valori", () => {
    const risultato = normalizzaPrescrizione([RIGA_BASE])
    expect(risultato).toEqual(RIGA_BASE)
  })

  it("array con un elemento diverso da quello dell'oggetto singolo → il valore usato è quello dell'array, non un placeholder", () => {
    const altro = { ...RIGA_BASE, id: 'presc-2', numero_prescrizione: 'P-2026-099' }
    const risultato = normalizzaPrescrizione([altro])
    expect(risultato?.id).toBe('presc-2')
    expect(risultato?.numero_prescrizione).toBe('P-2026-099')
  })

  it('array con PIÙ di un elemento (impossibile per UNIQUE(lavoro_id), ma il tipo non lo esclude) → si prende il primo, comportamento dichiarato', () => {
    const primo = { ...RIGA_BASE, id: 'presc-primo' }
    const secondo = { ...RIGA_BASE, id: 'presc-secondo' }
    const risultato = normalizzaPrescrizione([primo, secondo])
    expect(risultato?.id).toBe('presc-primo')
  })
})

describe('normalizzaPrescrizione — riga assente', () => {
  it('null (imbarazzo one-to-one ipotetico) → undefined', () => {
    expect(normalizzaPrescrizione(null)).toBeUndefined()
  })

  it('undefined (chiave non richiesta / assente dalla risposta) → undefined', () => {
    expect(normalizzaPrescrizione(undefined)).toBeUndefined()
  })

  it('array vuoto (forma REALE quando il lavoro non ha ancora una trascrizione) → undefined, MAI un oggetto vuoto', () => {
    expect(normalizzaPrescrizione([])).toBeUndefined()
  })
})

describe('normalizzaPrescrizione — divergenze tipizzate', () => {
  it('più divergenze passano intatte, con tutti e cinque i campi della RPC (migration 20260804211256)', () => {
    const conDue = {
      ...RIGA_BASE,
      divergenze: [
        {
          campo: 'elementi',
          motivo: 'esigenza_tecnica',
          nota: null,
          utente_id: 'utente-2',
          registrata_at: '2026-08-04T11:00:00Z',
        },
        {
          campo: 'tipo',
          motivo: 'materiale_non_disponibile',
          nota: 'materiale non in giacenza',
          utente_id: 'utente-3',
          registrata_at: '2026-08-04T12:00:00Z',
        },
      ],
    }
    const risultato = normalizzaPrescrizione(conDue)
    expect(risultato?.divergenze).toHaveLength(2)
    expect(risultato?.divergenze[0]).toEqual({
      campo: 'elementi',
      motivo: 'esigenza_tecnica',
      nota: null,
      utente_id: 'utente-2',
      registrata_at: '2026-08-04T11:00:00Z',
    })
    expect(risultato?.divergenze[1].motivo).toBe('materiale_non_disponibile')
  })

  it('nessuna divergenza mai registrata (default DB \'[]\') → array vuoto, non undefined', () => {
    const senza = { ...RIGA_BASE, divergenze: [] }
    const risultato = normalizzaPrescrizione(senza)
    expect(risultato?.divergenze).toEqual([])
  })
})

describe('normalizzaPrescrizione — fonte_tipo fuori unione (comportamento dichiarato)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('valore fuori dalle 4 forme di D202 (impossibile per il CHECK, ma il tipo generato è string|null, R27) → letto come null', () => {
    const fuoriUnione = { ...RIGA_BASE, fonte_tipo: 'whatsapp' }
    const risultato = normalizzaPrescrizione(fuoriUnione)
    expect(risultato?.fonte_tipo).toBeNull()
  })

  it('valore fuori unione → registra una spia (console.warn), non un cast cieco e silenzioso', () => {
    const fuoriUnione = { ...RIGA_BASE, fonte_tipo: 'whatsapp' }
    normalizzaPrescrizione(fuoriUnione)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('null è una FORMA LEGITTIMA (V7 — prescrizione a voce, in attesa di conferma scritta), non fuori unione: nessuna spia', () => {
    const senzaFonte = { ...RIGA_BASE, fonte_tipo: null }
    const risultato = normalizzaPrescrizione(senzaFonte)
    expect(risultato?.fonte_tipo).toBeNull()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('ognuna delle 4 forme del dizionario chiuso (FONTE_TIPI) passa intatta', () => {
    expect(FONTE_TIPI.length).toBe(4) // sentinella: se la casa unica cresce, questo test lo segnala
    for (const valore of FONTE_TIPI) {
      const riga = { ...RIGA_BASE, fonte_tipo: valore }
      expect(normalizzaPrescrizione(riga)?.fonte_tipo).toBe(valore)
    }
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe('normalizzaPrescrizione — forme d\'input inattese (censimento R-P4)', () => {
  it('numero al posto della riga → undefined, non un lancio d\'eccezione', () => {
    expect(normalizzaPrescrizione(42)).toBeUndefined()
  })

  it('stringa al posto della riga → undefined', () => {
    expect(normalizzaPrescrizione('non-un-oggetto')).toBeUndefined()
  })
})
