import { describe, it, expect } from 'vitest'
import {
  naturaDaMotivo,
  isMotivo,
  isRispostaGravitaIncidente,
  MOTIVI,
  RISPOSTE_GRAVITA_INCIDENTE,
} from '@/lib/domain/qualita-costanti'

describe('naturaDaMotivo — la derivazione fissa motivo → natura (spec §5)', () => {
  // Le otto voci non-'altro', copiate dalla tabella di spec §5, una per una:
  // nessuna lacuna di copertura (rilievo della revisione del Task 2).
  //
  // 🔑 Firma STRETTA (`motivo: Motivo`), ripristinata dalla ri-revisione (06/08/2026): ogni
  // valore qui sotto è un letterale valido dell'unione `Motivo`, verificato da TypeScript a
  // compile-time. La guardia sul prototipo/sui tipi estranei vive SEPARATA, in `isMotivo`
  // (describe sotto) — così `null` continua a significare UNA sola cosa: "è `altro`, chiedi la
  // natura all'utente".
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
})

// 🛑 RI-REVISIONE (06/08/2026) — la guardia sul prototipo/sui tipi estranei che prima viveva
// DENTRO `naturaDaMotivo` (allargandone la firma a `unknown`) è stata spostata QUI, in una
// funzione a parte. Motivo: con la firma allargata, `null` significava DUE cose diverse per chi
// chiamava («è `altro`, chiedi la natura» oppure «è spazzatura, rispondi 422») — proprio il
// difetto che il commento sopra `naturaDaMotivo` dichiarava chiuso. Stesso idioma già in casa:
// `isFonteTipo` in `src/lib/domain/prescrizione-costanti.ts:72-74`.
describe('isMotivo — la guardia separata sul vocabolario (spec §5)', () => {
  it.each(MOTIVI)('"%s" è un motivo valido', (m) => {
    expect(isMotivo(m)).toBe(true)
  })

  // 🛑 Ritrovamento della revisione del Task 2 (06/08/2026): con un `Record` indicizzato senza
  // controllo di TIPO, un valore che risale al prototipo di `Object` restituiva quel membro del
  // prototipo (una FUNZIONE, un OGGETTO) invece di `null`/`false`. Prove spostate qui — non
  // duplicate — perché la guardia, non `naturaDaMotivo`, è il punto che le chiude ora.
  describe('la guardia sui valori estranei al prototipo (ritrovamento della revisione del Task 2)', () => {
    it('«constructor» NON risale al prototipo di Object', () => {
      expect(isMotivo('constructor')).toBe(false)
    })

    it('«toString» NON risale al prototipo di Object', () => {
      expect(isMotivo('toString')).toBe(false)
    })

    it('«valueOf» NON risale al prototipo di Object', () => {
      expect(isMotivo('valueOf')).toBe(false)
    })

    it('«__proto__» NON risale al prototipo di Object', () => {
      expect(isMotivo('__proto__')).toBe(false)
    })
  })

  // Il body di una richiesta JSON non porta solo stringhe: la guardia va provata anche sulle
  // forme che non sono nemmeno stringhe (R-P4 — si enumerano le forme d'ingresso).
  describe('valori che non sono nemmeno stringhe, o stringhe fuori vocabolario', () => {
    it('un numero → false', () => {
      expect(isMotivo(42)).toBe(false)
    })

    it('null → false', () => {
      expect(isMotivo(null)).toBe(false)
    })

    it('undefined → false', () => {
      expect(isMotivo(undefined)).toBe(false)
    })

    it('un array → false', () => {
      expect(isMotivo(['difetto_lavorazione'])).toBe(false)
    })

    it('un oggetto → false', () => {
      expect(isMotivo({ motivo: 'difetto_lavorazione' })).toBe(false)
    })

    it('una stringa fuori vocabolario ("pippo") → false', () => {
      expect(isMotivo('pippo')).toBe(false)
    })

    it('una stringa quasi giusta ma con maiuscola ("ALTRO") → false', () => {
      expect(isMotivo('ALTRO')).toBe(false)
    })
  })
})

// 🛑 RI-REVISIONE (06/08/2026) — guardia nuova, introdotta per chiudere la regressione di
// `classifica()`: un `rispostaGravita` fuori vocabolario/`null`/di tipo sbagliato non deve far
// esplodere `esitoDaGravita` (il `switch` interno non aveva un ramo di riserva). La guardia
// normalizza l'ingresso PRIMA di chiamare `esitoDaGravita` — vedi `src/lib/qualita/classifica.ts`.
// A differenza di `isMotivo`, questo vocabolario non ha un CHECK di banca dati da cui copiare
// (righe 6/7 sopra `RISPOSTE_GRAVITA_INCIDENTE`): non esiste ancora una colonna.
describe('isRispostaGravitaIncidente — la guardia sul vocabolario nuovo, senza CHECK in banca dati', () => {
  it.each(RISPOSTE_GRAVITA_INCIDENTE)('"%s" è una risposta valida', (v) => {
    expect(isRispostaGravitaIncidente(v)).toBe(true)
  })

  it('una stringa fuori vocabolario → false', () => {
    expect(isRispostaGravitaIncidente('boh')).toBe(false)
  })

  it('un numero → false', () => {
    expect(isRispostaGravitaIncidente(42)).toBe(false)
  })

  it('null → false', () => {
    expect(isRispostaGravitaIncidente(null)).toBe(false)
  })

  it('undefined → false', () => {
    expect(isRispostaGravitaIncidente(undefined)).toBe(false)
  })
})
