import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { normalizzaPrescrizione } from '@/lib/domain/prescrizione-mapper'
// Le forme si IMPORTANO dalla casa unica (prescrizione-costanti.ts), non si
// ricopiano qui: una lista hardcoded nel test non è sorvegliata dalla spia di
// migrazione (`prescrizione-costanti-spia-migration.test.ts`) — una quinta
// forma aggiunta in banca dati passerebbe qui senza che il test la copra.
import { CAMPI_TYPO, FONTE_TIPI, MOTIVI_DIVERGENZA } from '@/lib/domain/prescrizione-costanti'

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

// Fix da review del Task 6 (prima che T7 costruisca la UI che si fida di
// `Divergenza.campo`): `contenuto` e `divergenze` avevano cast ciechi da
// `Json`, mentre `fonte_tipo` aveva già la sua guardia. Questo blocco chiude
// il gap in modo SIMMETRICO a `fonte_tipo`, con una differenza dichiarata:
// `fonte_tipo` fuori unione ripiega su `null` (una forma già legittima, V7);
// `campo`/`motivo` di una divergenza NON hanno un ripiego legittimo — un
// valore fuori dizionario lì è un fatto realmente accaduto (una divergenza
// registrata) che si perderebbe scartandolo. Si tiene, marcato onestamente:
// `{ noto: false, valore: <testo grezzo> }` (vedi `ValoreDizionario` in
// `@/types/domain`).
describe('normalizzaPrescrizione — divergenze non conformi (comportamento dichiarato)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it("voce legacy con campo='pippo' (dati pre-migration 20260804211256, sonda S3 del Task 5: la RPC accettava campo qualunque) → NON scartata, marcata onestamente", () => {
    const conVoceLegacy = {
      ...RIGA_BASE,
      divergenze: [{ ...RIGA_BASE.divergenze[0], campo: 'pippo' }],
    }
    const risultato = normalizzaPrescrizione(conVoceLegacy)
    expect(risultato?.divergenze).toHaveLength(1)
    expect(risultato?.divergenze[0].campo).toEqual({ noto: false, valore: 'pippo' })
    // Il resto della voce (motivo, nota, utente_id, registrata_at) non è toccato dalla guardia sul campo.
    expect(risultato?.divergenze[0].motivo).toBe('richiesta_dentista')
  })

  it("motivo fuori dal dizionario chiuso (MOTIVI_DIVERGENZA) → stesso trattamento onesto, non scartato", () => {
    const conMotivoIgnoto = {
      ...RIGA_BASE,
      divergenze: [{ ...RIGA_BASE.divergenze[0], motivo: 'perche_si' }],
    }
    const risultato = normalizzaPrescrizione(conMotivoIgnoto)
    expect(risultato?.divergenze).toHaveLength(1)
    expect(risultato?.divergenze[0].motivo).toEqual({ noto: false, valore: 'perche_si' })
  })

  it('campo E motivo fuori dizionario nella stessa voce → entrambi marcati, la voce resta (due spie, non uno scarto)', () => {
    const conEntrambiIgnoti = {
      ...RIGA_BASE,
      divergenze: [{ ...RIGA_BASE.divergenze[0], campo: 'pippo', motivo: 'perche_si' }],
    }
    const risultato = normalizzaPrescrizione(conEntrambiIgnoti)
    expect(risultato?.divergenze).toHaveLength(1)
    expect(risultato?.divergenze[0].campo).toEqual({ noto: false, valore: 'pippo' })
    expect(risultato?.divergenze[0].motivo).toEqual({ noto: false, valore: 'perche_si' })
    expect(warnSpy).toHaveBeenCalledTimes(2)
  })

  it("campo=NULL (sonda S3: pre-migration la RPC accettava anche NULL) → marcato con il testo del valore grezzo, non un lancio d'eccezione", () => {
    const conCampoNull = {
      ...RIGA_BASE,
      divergenze: [{ ...RIGA_BASE.divergenze[0], campo: null }],
    }
    const risultato = normalizzaPrescrizione(conCampoNull)
    expect(risultato?.divergenze[0].campo).toEqual({ noto: false, valore: 'null' })
  })

  it('voce che non è un oggetto (es. una stringa nell\'array) → scartata con una spia — non rappresentabile, a differenza di campo/motivo che hanno un dizionario da cui deviare', () => {
    const conVoceRotta = {
      ...RIGA_BASE,
      divergenze: ['non-un-oggetto', RIGA_BASE.divergenze[0]],
    }
    const risultato = normalizzaPrescrizione(conVoceRotta)
    expect(risultato?.divergenze).toHaveLength(1)
    expect(risultato?.divergenze[0].campo).toBe('colore')
    expect(warnSpy).toHaveBeenCalled()
  })

  // Fix da un secondo giro di review: la prima stesura SCARTAVA la voce
  // senza utente_id valido. Sbagliato — la RPC che scrive le divergenze
  // (`lavoro_prescrizione_registra_divergenza`) non ha un CHECK su
  // `p_utente` (a differenza di `lavori_prescrizioni_conferma_ck`, che rende
  // una conferma anonima impossibile per costruzione): un utente_id mancante
  // è un'anomalia, ma `null` È il suo ripiego onesto — non serve un
  // dizionario per rappresentare «attore assente». Scartare qui avrebbe
  // riprodotto, su un campo diverso, ESATTAMENTE il difetto che questa
  // review doveva chiudere per campo/motivo.
  it("voce senza utente_id valido → NON scartata, letta con utente_id: null e una spia (nessun CHECK su p_utente nella RPC, ma null è un ripiego onesto — a differenza di campo/motivo non serve un dizionario)", () => {
    const conVoceSenzaUtente = {
      ...RIGA_BASE,
      divergenze: [{ ...RIGA_BASE.divergenze[0], utente_id: null }],
    }
    const risultato = normalizzaPrescrizione(conVoceSenzaUtente)
    expect(risultato?.divergenze).toHaveLength(1)
    expect(risultato?.divergenze[0].utente_id).toBeNull()
    expect(risultato?.divergenze[0].campo).toBe('colore') // il resto della voce non è toccato
    expect(warnSpy).toHaveBeenCalled()
  })

  it('registrata_at assente o non valido → SOLO in questo caso la voce si scarta (nessun chiamante lo può omettere: la sua assenza è corruzione strutturale, non un\'anomalia isolata)', () => {
    const conRegistrataAtRotto = {
      ...RIGA_BASE,
      divergenze: [{ ...RIGA_BASE.divergenze[0], registrata_at: undefined }, RIGA_BASE.divergenze[0]],
    }
    const risultato = normalizzaPrescrizione(conRegistrataAtRotto)
    expect(risultato?.divergenze).toHaveLength(1) // solo la seconda, valida, sopravvive
    expect(warnSpy).toHaveBeenCalled()
  })

  it('nota di tipo sbagliato (es. un numero) → letta come null con una spia, la voce resta', () => {
    const conNotaSbagliata = {
      ...RIGA_BASE,
      divergenze: [{ ...RIGA_BASE.divergenze[0], nota: 42 }],
    }
    const risultato = normalizzaPrescrizione(conNotaSbagliata)
    expect(risultato?.divergenze).toHaveLength(1)
    expect(risultato?.divergenze[0].nota).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
  })

  it('nota assente o null → null senza spia (è una forma già legittima, nessuna deviazione da un dizionario)', () => {
    const conNotaAssente = {
      ...RIGA_BASE,
      divergenze: [{ campo: 'colore', motivo: 'richiesta_dentista', utente_id: 'u1', registrata_at: '2026-08-04T10:00:00Z' }],
    }
    expect(normalizzaPrescrizione(conNotaAssente)?.divergenze[0].nota).toBeNull()
    expect(warnSpy).not.toHaveBeenCalled()

    const conNotaNull = { ...RIGA_BASE, divergenze: [{ ...RIGA_BASE.divergenze[0], nota: null }] }
    expect(normalizzaPrescrizione(conNotaNull)?.divergenze[0].nota).toBeNull()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('ognuna delle forme valide di CAMPI_TYPO e MOTIVI_DIVERGENZA passa intatta, senza spia (sentinella: dizionario cresciuto → questo test lo segnala)', () => {
    expect(CAMPI_TYPO.length).toBe(3)
    expect(MOTIVI_DIVERGENZA.length).toBe(4)
    for (const campo of CAMPI_TYPO) {
      const riga = { ...RIGA_BASE, divergenze: [{ ...RIGA_BASE.divergenze[0], campo }] }
      expect(normalizzaPrescrizione(riga)?.divergenze[0].campo).toBe(campo)
    }
    for (const motivo of MOTIVI_DIVERGENZA) {
      const riga = { ...RIGA_BASE, divergenze: [{ ...RIGA_BASE.divergenze[0], motivo }] }
      expect(normalizzaPrescrizione(riga)?.divergenze[0].motivo).toBe(motivo)
    }
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe('normalizzaPrescrizione — contenuto malformato (comportamento dichiarato)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it("contenuto non è un oggetto (es. una stringa) → letto come {} con una spia, non un lancio d'eccezione", () => {
    const conContenutoRotto = { ...RIGA_BASE, contenuto: 'non-un-oggetto' }
    const risultato = normalizzaPrescrizione(conContenutoRotto)
    expect(risultato?.contenuto).toEqual({})
    expect(warnSpy).toHaveBeenCalled()
  })

  it('contenuto è un array (typeof "object" ma non la forma giusta) → letto come {} con una spia', () => {
    const conContenutoArray = { ...RIGA_BASE, contenuto: [1, 2, 3] }
    const risultato = normalizzaPrescrizione(conContenutoArray)
    expect(risultato?.contenuto).toEqual({})
    expect(warnSpy).toHaveBeenCalled()
  })

  it('contenuto.elementi non è un array di numeri (es. stringhe) → SOLO quella chiave si scarta, il resto del contenuto passa', () => {
    const conElementiSbagliati = { ...RIGA_BASE, contenuto: { elementi: ['11', '12'], colore: 'A3' } }
    const risultato = normalizzaPrescrizione(conElementiSbagliati)
    expect(risultato?.contenuto).toEqual({ colore: 'A3' })
    expect(warnSpy).toHaveBeenCalled()
  })

  it('contenuto.colore non è una stringa (es. un numero) → SOLO quella chiave si scarta, elementi passa', () => {
    const conColoreSbagliato = { ...RIGA_BASE, contenuto: { elementi: [11], colore: 999 } }
    const risultato = normalizzaPrescrizione(conColoreSbagliato)
    expect(risultato?.contenuto).toEqual({ elementi: [11] })
    expect(warnSpy).toHaveBeenCalled()
  })

  it('contenuto.tipo non è una stringa → scartato con una spia', () => {
    const conTipoSbagliato = { ...RIGA_BASE, contenuto: { tipo: 42 } }
    const risultato = normalizzaPrescrizione(conTipoSbagliato)
    expect(risultato?.contenuto).toEqual({})
    expect(warnSpy).toHaveBeenCalled()
  })

  it('contenuto valido con le tre chiavi passa intatto, senza spia', () => {
    const contenutoValido = { elementi: [11, 12], colore: 'A3', tipo: 'corona' }
    const risultato = normalizzaPrescrizione({ ...RIGA_BASE, contenuto: contenutoValido })
    expect(risultato?.contenuto).toEqual(contenutoValido)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('contenuto assente o null → {} senza spia (nessuna trascrizione non è un dato malformato, V2)', () => {
    expect(normalizzaPrescrizione({ ...RIGA_BASE, contenuto: undefined })?.contenuto).toEqual({})
    expect(warnSpy).not.toHaveBeenCalled()
    expect(normalizzaPrescrizione({ ...RIGA_BASE, contenuto: null })?.contenuto).toEqual({})
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
