import { describe, it, expect } from 'vitest'
import { naturaDaMotivo } from '@/lib/domain/qualita-costanti'

describe('naturaDaMotivo — la derivazione fissa motivo → natura (spec §5)', () => {
  // Le otto voci non-'altro', copiate dalla tabella di spec §5, una per una:
  // nessuna lacuna di copertura (rilievo della revisione del Task 2).
  it('errore_dato_dichiarazione → dato_documentale', () => {
    expect(naturaDaMotivo('errore_dato_dichiarazione')).toBe('dato_documentale')
  })

  it('difetto_lavorazione → difetto_fisico', () => {
    expect(naturaDaMotivo('difetto_lavorazione')).toBe('difetto_fisico')
  })

  it('difetto_materiale → difetto_fisico', () => {
    expect(naturaDaMotivo('difetto_materiale')).toBe('difetto_fisico')
  })

  it('destinatario_errato → identificazione_destinatario', () => {
    expect(naturaDaMotivo('destinatario_errato')).toBe('identificazione_destinatario')
  })

  it('modifica_clinica_richiesta → nuova_esigenza_clinica (caso 5, spec §11 — rimanda a MOTIVI_DIVERGENZA, non lo duplica)', () => {
    expect(naturaDaMotivo('modifica_clinica_richiesta')).toBe('nuova_esigenza_clinica')
  })

  it('errore_prezzo_quantita → commerciale', () => {
    expect(naturaDaMotivo('errore_prezzo_quantita')).toBe('commerciale')
  })

  it('reso_senza_difetto → nessun_difetto', () => {
    expect(naturaDaMotivo('reso_senza_difetto')).toBe('nessun_difetto')
  })

  it('errore_registrazione → errore_registrazione (assorbe il vecchio annullo consegna, D269)', () => {
    expect(naturaDaMotivo('errore_registrazione')).toBe('errore_registrazione')
  })

  it('«altro» → null: la natura si CHIEDE, non si indovina', () => {
    expect(naturaDaMotivo('altro')).toBeNull()
  })

  // 🛑 Ritrovamento della revisione del Task 2 (06/08/2026): con un `Record` indicizzato
  // senza controllo di TIPO, un valore che risale al prototipo di `Object` restituisce
  // quel membro del prototipo invece di `null`. Stesso idioma del precedente in casa
  // (`prescrizione-costanti.ts:61-74`): `new Set<string>` + `typeof v === 'string'`.
  describe('la guardia sui valori estranei al prototipo (ritrovamento della revisione)', () => {
    it('«constructor» NON risale al prototipo di Object: null, non una funzione', () => {
      expect(naturaDaMotivo('constructor')).toBeNull()
    })

    it('«toString» NON risale al prototipo di Object: null, non una funzione', () => {
      expect(naturaDaMotivo('toString')).toBeNull()
    })

    it('«valueOf» NON risale al prototipo di Object: null, non una funzione', () => {
      expect(naturaDaMotivo('valueOf')).toBeNull()
    })

    it('«__proto__» NON risale al prototipo di Object: null, non un oggetto', () => {
      expect(naturaDaMotivo('__proto__')).toBeNull()
    })
  })

  // Il body di una richiesta JSON non porta solo stringhe: la guardia va provata
  // anche sulle forme che non sono nemmeno stringhe (R-P4 — si enumerano le forme
  // d'ingresso, non solo i valori del vocabolario).
  describe('valori che non sono nemmeno stringhe, o stringhe fuori vocabolario', () => {
    it('un numero → null', () => {
      expect(naturaDaMotivo(42)).toBeNull()
    })

    it('null → null', () => {
      expect(naturaDaMotivo(null)).toBeNull()
    })

    it('undefined → null', () => {
      expect(naturaDaMotivo(undefined)).toBeNull()
    })

    it('un array → null', () => {
      expect(naturaDaMotivo(['difetto_lavorazione'])).toBeNull()
    })

    it('un oggetto → null', () => {
      expect(naturaDaMotivo({ motivo: 'difetto_lavorazione' })).toBeNull()
    })

    it('una stringa fuori vocabolario ("pippo") → null', () => {
      expect(naturaDaMotivo('pippo')).toBeNull()
    })

    it('una stringa quasi giusta ma con maiuscola ("ALTRO") → null', () => {
      expect(naturaDaMotivo('ALTRO')).toBeNull()
    })
  })
})
