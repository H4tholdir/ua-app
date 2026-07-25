// Nomi lunghi sulla parete — variante 6 «la combinata» (mockup ratificato
// `docs/design/mockups/2026-07-26-nomi-lunghi-cassetta.html` §6, proposta di lista in
// `docs/design/decisions/2026-07-26-nomi-lunghi-variante6.md`).
//
// Questo file presidia le DUE parti pure della regola:
//  1. `accorciaNomeStudio` — la rimozione delle parole di categoria in testa al nome. È la
//     parte che il mockup aveva fatto A MANO, nome per nome: qui vive la lista vera.
//  2. `costruisciScalaNome` — l'ordine dei tentativi (prima il corpo, poi l'accorciamento),
//     cioè la regola ratificata resa esplicita e verificabile senza browser.
// La MISURA (quale gradino entra davvero in 2 righe) non si può fare qui: jsdom non impagina.
// Vive nel browser (scripts/tmp/nomi-lunghi-v6-misure.mjs) e, come simulazione della sola
// macchina a stati, in tests/unit/ds-v3/cassetta-nomi-lunghi.test.tsx.
import { describe, expect, it } from 'vitest'
import {
  accorciaNomeStudio,
  costruisciScalaNome,
  CORPI_CLINICO,
  MIN_LETTERE_NOME_ACCORCIATO,
  PAROLE_CATEGORIA_STUDIO,
  FORME_SOCIETARIE,
} from '@/lib/domain/nome-studio'

/** Copia locale della normalizzazione del modulo: il test non deve dipendere da un export
 *  interno, ma l'invariante ha bisogno di confrontare come lo fa la funzione vera. */
function normalizzaPerTest(parola: string): string {
  return parola.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
}

describe('accorciaNomeStudio — i tre esiti attesi dal mockup ratificato (§6, tabella esiti)', () => {
  it('«STUDI MEDICI DI SANTI GIUSEPPE» → «DI SANTI GIUSEPPE» (il DI resta: non è una parola di categoria)', () => {
    expect(accorciaNomeStudio('STUDI MEDICI DI SANTI GIUSEPPE')).toBe('DI SANTI GIUSEPPE')
  })
  it('«CENTRO ODONTOIATRICO SANTA MARIA» → «SANTA MARIA»', () => {
    expect(accorciaNomeStudio('CENTRO ODONTOIATRICO SANTA MARIA')).toBe('SANTA MARIA')
  })
  it('«POLIAMBULATORIO ODONTOIATRICO SAN RAFFAELE» → «SAN RAFFAELE»', () => {
    expect(accorciaNomeStudio('POLIAMBULATORIO ODONTOIATRICO SAN RAFFAELE')).toBe('SAN RAFFAELE')
  })
})

describe('accorciaNomeStudio — i nomi VERI che NON si devono toccare (campione del laboratorio, 26/07)', () => {
  it('«DI SANTI CATERINA»: il «DI» non è una parola di categoria — nome intatto', () => {
    expect(accorciaNomeStudio('DI SANTI CATERINA')).toBeNull()
  })
  it('«BARALE S.A.S.»: nessuna parola di categoria in testa — nome intatto', () => {
    expect(accorciaNomeStudio('BARALE S.A.S.')).toBeNull()
  })
  it('«C.O.M. s.r.l. uninominale»: una sigla non è una parola di categoria — nome intatto', () => {
    expect(accorciaNomeStudio('C.O.M. s.r.l. uninominale')).toBeNull()
  })
  it('«Studio Bianchi» (fixture E2E): si accorcerebbe in «Bianchi», e infatti lo fa — la scala decide POI se serve', () => {
    // La funzione dice solo «si può accorciare così»; è `costruisciScalaNome` + la misura in
    // browser a decidere se quel gradino viene mai raggiunto. Su «Studio Bianchi» non lo è
    // (entra intero a 10px, 1 riga — misurato).
    expect(accorciaNomeStudio('Studio Bianchi')).toBe('Bianchi')
  })
})

describe('accorciaNomeStudio — si toglie SOLO dalla testa, SOLO una sequenza iniziale', () => {
  it('parola di categoria in mezzo: non si tocca', () => {
    expect(accorciaNomeStudio('ROSSI CENTRO ODONTOIATRICO')).toBeNull()
  })
  it('parola di categoria in fondo: non si tocca', () => {
    expect(accorciaNomeStudio('BAGHERIA STUDIO')).toBeNull()
  })
  it('la sequenza si ferma alla prima parola non di categoria e non riprende', () => {
    expect(accorciaNomeStudio('STUDIO DENTISTICO ROSSI CENTRO MEDICO')).toBe('ROSSI CENTRO MEDICO')
  })
})

describe('accorciaNomeStudio — maiuscole, accenti, punteggiatura', () => {
  it('minuscole e Iniziali Maiuscole valgono come le maiuscole', () => {
    expect(accorciaNomeStudio('Studio Odontoiatrico Rossi')).toBe('Rossi')
    expect(accorciaNomeStudio('studio dentistico rossi')).toBe('rossi')
  })
  it('la punteggiatura attaccata non salva la parola di categoria', () => {
    expect(accorciaNomeStudio('STUDIO, DENTISTICO: BELLINI')).toBe('BELLINI')
  })
  it("l'accento non fa sfuggire la parola (confronto senza segni diacritici)", () => {
    expect(accorciaNomeStudio('CLÌNICA ODONTOIATRICA SAN CARLO')).toBe('SAN CARLO')
  })
  it('la spaziatura interna del residuo resta quella originale', () => {
    expect(accorciaNomeStudio('STUDIO   DENTISTICO   SAN  CARLO')).toBe('SAN  CARLO')
  })
})

describe('accorciaNomeStudio — le guardie: mai un nome vuoto, mai un residuo che non identifica', () => {
  it('un nome fatto SOLO di parole di categoria non si accorcia (svuoterebbe la targa)', () => {
    expect(accorciaNomeStudio('STUDIO DENTISTICO')).toBeNull()
    expect(accorciaNomeStudio('STUDIO')).toBeNull()
  })
  it(`un residuo con meno di ${MIN_LETTERE_NOME_ACCORCIATO} lettere non si accorcia — le sigle della forma societaria non identificano nessuno`, () => {
    expect(accorciaNomeStudio('STUDIO DENTISTICO SRL')).toBeNull()
    expect(accorciaNomeStudio('STUDI MEDICI S.R.L.')).toBeNull()
    expect(accorciaNomeStudio('CENTRO ODONTOIATRICO RE')).toBeNull()
  })
  it('4 lettere esatte bastano (soglia inclusiva)', () => {
    expect(accorciaNomeStudio('CENTRO ODONTOIATRICO NERI')).toBe('NERI')
  })
  it('stringa vuota o soli spazi: niente da accorciare, nessun crash', () => {
    expect(accorciaNomeStudio('')).toBeNull()
    expect(accorciaNomeStudio('   ')).toBeNull()
  })
})

describe('accorciaNomeStudio — i titoli NON sono parole di categoria (scelta dichiarata nel verbale)', () => {
  it('«Dott.ssa Annamaria Bellinghieri» resta intero', () => {
    expect(accorciaNomeStudio('Dott.ssa Annamaria Bellinghieri')).toBeNull()
  })
  it('il titolo sopravvive alla rimozione della categoria che lo precede', () => {
    expect(accorciaNomeStudio('STUDIO DENTISTICO DOTT. ROSSI')).toBe('DOTT. ROSSI')
  })
})

describe('PAROLE_CATEGORIA_STUDIO — la lista, così com’è ratificata', () => {
  it('contiene le parole del campione (quelle che il mockup ha tolto a mano)', () => {
    for (const p of ['studi', 'medici', 'centro', 'odontoiatrico', 'poliambulatorio']) {
      expect(PAROLE_CATEGORIA_STUDIO).toContain(p)
    }
  })
  it('NON contiene preposizioni, congiunzioni e titoli — le tre famiglie escluse per decisione', () => {
    for (const p of ['di', 'del', 'della', 'dei', 'degli', 'delle', 'e', 'dott', 'dottor', 'dottore', 'dr', 'prof']) {
      expect(PAROLE_CATEGORIA_STUDIO).not.toContain(p)
    }
  })
  it('è tutta in minuscolo e senza accenti (è la forma normalizzata del confronto)', () => {
    for (const p of PAROLE_CATEGORIA_STUDIO) {
      expect(p).toBe(p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())
      expect(p).toMatch(/^[a-z]+$/)
    }
  })
})

describe('costruisciScalaNome — l’ordine dei tentativi È la regola ratificata', () => {
  it('i gradini di corpo sono 10 → 9,5 → 9 e non si scende mai sotto 9px', () => {
    expect(CORPI_CLINICO.map((c) => c.px)).toEqual([10, 9.5, 9])
    expect(Math.min(...CORPI_CLINICO.map((c) => c.px))).toBe(9)
  })

  it('il primo gradino è sempre il nome INTERO a corpo pieno (chi ci sta in 2 righe non si accorge di nulla)', () => {
    const scala = costruisciScalaNome('DI SANTI CATERINA')
    expect(scala[0]).toEqual({ testo: 'DI SANTI CATERINA', corpoPx: 10, classeCorpo: null })
  })

  it('nome non accorciabile: 3 gradini, solo corpo — poi tocca alla sfumatura di oggi', () => {
    const scala = costruisciScalaNome('C.O.M. s.r.l. uninominale')
    expect(scala.map((g) => `${g.testo}@${g.corpoPx}`)).toEqual([
      'C.O.M. s.r.l. uninominale@10',
      'C.O.M. s.r.l. uninominale@9.5',
      'C.O.M. s.r.l. uninominale@9',
    ])
  })

  it('nome accorciabile: 6 gradini — PRIMA tutto il corpo sul nome intero, POI l’accorciato (rimpicciolire non toglie informazione, accorciare sì)', () => {
    const scala = costruisciScalaNome('CENTRO ODONTOIATRICO SANTA MARIA')
    expect(scala.map((g) => `${g.testo}@${g.corpoPx}`)).toEqual([
      'CENTRO ODONTOIATRICO SANTA MARIA@10',
      'CENTRO ODONTOIATRICO SANTA MARIA@9.5',
      'CENTRO ODONTOIATRICO SANTA MARIA@9',
      'SANTA MARIA@10',
      'SANTA MARIA@9.5',
      'SANTA MARIA@9',
    ])
  })

  it('ogni gradino porta la classe CSS del proprio corpo (il valore in px vive nel foglio, non qui)', () => {
    const scala = costruisciScalaNome('CENTRO ODONTOIATRICO SANTA MARIA')
    expect(scala.map((g) => g.classeCorpo)).toEqual([
      null, 'is-corpo-95', 'is-corpo-9', null, 'is-corpo-95', 'is-corpo-9',
    ])
  })

  it('nome vuoto: un solo testo, nessun crash', () => {
    expect(costruisciScalaNome('').every((g) => g.testo === '')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Panel advisor del 26/07 (verbale `docs/design/decisions/2026-07-26-parole-categoria-panel.md`)
// — VIA A ratificata da Francesco.
//
// Il difetto: la guardia contava le lettere di TUTTO il residuo, quindi «SRL UNIPERSONALE»
// (16 lettere) passava e sulla cassetta si sarebbe letta la sigla della società al posto del
// nome dello studio. Trovato dalla ricerca sui 1.604 nomi reali, riprodotto sul modulo vero.
//
// ⚠️ TRAPPOLA EVITATA (riserva bloccante dell'advisor di architettura): il documento di ricerca,
// in un punto, propone «le 4 lettere contate sulla PRIMA parola». Preso alla lettera ucciderebbe
// due esiti che Francesco ha già approvato — `DI SANTI GIUSEPPE` («DI» = 2 lettere) e
// `SAN RAFFAELE` («SAN» = 3). In italiano «San», «Santa», «Di», «Del», «De» sono fra le teste di
// nome più comuni: tagliarle è una regressione, non una taratura.
// Quindi: la soglia delle 4 lettere RESTA sul residuo intero, e sulla prima parola si AGGIUNGE
// una guardia che chiede solo due cose — almeno una lettera, e non una forma societaria.
describe('accorciaNomeStudio — guardia sulla prima parola del residuo (via A, 26/07)', () => {
  it('rinuncia quando quel che resta comincia con una forma societaria', () => {
    // i sei nomi reali trovati dalla ricerca: oggi la cassetta scriverebbe la sigla
    expect(accorciaNomeStudio('STUDIO ODONTOIATRICO SRL UNIPERSONALE')).toBeNull()
    expect(accorciaNomeStudio('STUDIO ODONTOIATRICO STP S.R.L.')).toBeNull()
    expect(accorciaNomeStudio('STUDIO DENTISTICO S.A.S. DI GIUSEPPE SANNINO')).toBeNull()
    expect(accorciaNomeStudio('CENTRO DENTALE S.R.L.S. ROSSI')).toBeNull()
    expect(accorciaNomeStudio('AMBULATORIO ODONTOIATRICO SNC BIANCHI')).toBeNull()
    expect(accorciaNomeStudio('STUDIO MEDICO SPA VERDI')).toBeNull()
  })

  it('rinuncia quando quel che resta comincia con un segno o una cifra', () => {
    // il trattino: la via B della ricerca qui avrebbe tolto anche CLINICA, lasciando
    // «DEL SORRISO» — cioè amputando il marchio. La via A non tocca niente.
    expect(accorciaNomeStudio('AMBULATORIO ODONTOIATRICO - CLINICA DEL SORRISO')).toBeNull()
    expect(accorciaNomeStudio('STUDIO DENTISTICO & DENTISTI ASSOCIATI S.R.L.')).toBeNull()
    expect(accorciaNomeStudio('STUDIO 2 V S.A.S. DI DOMENELLA SIMONE')).toBeNull()
  })

  it('NON tocca gli esiti già ratificati da Francesco — le teste corte di nome italiane', () => {
    // se la guardia chiedesse 4 lettere sulla PRIMA parola, questi due morirebbero
    expect(accorciaNomeStudio('STUDI MEDICI DI SANTI GIUSEPPE')).toBe('DI SANTI GIUSEPPE')
    expect(accorciaNomeStudio('POLIAMBULATORIO ODONTOIATRICO SAN RAFFAELE')).toBe('SAN RAFFAELE')
    expect(accorciaNomeStudio('CENTRO ODONTOIATRICO SANTA MARIA')).toBe('SANTA MARIA')
  })

  it('non tocca i tre clienti veri che oggi hanno la stessa testa', () => {
    // l'argomento più forte a favore di tutta la regola: tre cassette indistinguibili
    expect(accorciaNomeStudio('STUDIO ODONTOIATRICO SCIENGA FRANCO')).toBe('SCIENGA FRANCO')
    expect(accorciaNomeStudio('STUDIO ODONTOIATRICO PIEGARI GIANFRANCO')).toBe('PIEGARI GIANFRANCO')
    expect(accorciaNomeStudio('STUDIO ODONTOIATRICO SICA FRANCESCO')).toBe('SICA FRANCESCO')
    // e il quarto cliente, che si chiama SOLO così: non resterebbe niente
    expect(accorciaNomeStudio('STUDIO ODONTOIATRICO')).toBeNull()
  })

  // La prova che regge da sola qualunque parola venga aggiunta alla lista in futuro: non parla
  // della lista, parla della guardia. È la risposta alla domanda «cosa si rompe il giorno che
  // Francesco aggiunge una parola?» — con questa, la guardia si difende da sé.
  it('INVARIANTE: se accorcia, quel che resta comincia sempre come un nome', () => {
    const campione = [
      'STUDI MEDICI DI SANTI GIUSEPPE', 'POLIAMBULATORIO ODONTOIATRICO SAN RAFFAELE',
      'CENTRO ODONTOIATRICO SANTA MARIA', 'STUDIO ODONTOIATRICO SCIENGA FRANCO',
      'STUDIO ODONTOIATRICO SRL UNIPERSONALE', 'STUDIO ODONTOIATRICO STP S.R.L.',
      'AMBULATORIO ODONTOIATRICO - CLINICA DEL SORRISO', 'STUDIO DENTISTICO & DENTISTI ASSOCIATI',
      'DI SANTI CATERINA', 'BARALE S.A.S.', 'C.O.M. s.r.l. uninominale', 'STUDIO ODONTOIATRICO',
      'Dental Center s.r.l. uninominale', 'Dott. Mario Rossi', 'STUDIO DENTISTICO E. ROSSI',
      'Studio Dentistico Del Corso', 'CENTRO CLINICO ROSSI', 'STUDIO 2 V S.A.S.',
    ]
    for (const nome of campione) {
      const r = accorciaNomeStudio(nome)
      if (r === null) continue
      const prima = r.split(/\s+/)[0]
      expect(prima, `«${nome}» → «${r}»: la prima parola non ha nemmeno una lettera`)
        .toMatch(/[a-zA-Z]/)
      expect(FORME_SOCIETARIE.has(normalizzaPerTest(prima)),
        `«${nome}» → «${r}»: comincia con una forma societaria`).toBe(false)
      expect((r.match(/[a-zA-Z]/g) ?? []).length,
        `«${nome}» → «${r}»: meno di ${MIN_LETTERE_NOME_ACCORCIATO} lettere in tutto`)
        .toBeGreaterThanOrEqual(MIN_LETTERE_NOME_ACCORCIATO)
    }
  })

  // Prova che VIETA, non che permette (stesso schema già usato in Cassetta.test.tsx). Il motivo
  // sta nel nome: la ricerca dedica un paragrafo intero a `dental`, e sui dati di Francesco
  // metterla in lista trasformerebbe «Dental Center s.r.l. uninominale» in «s.r.l. uninominale».
  // Con le prove di prima, aggiungerla non avrebbe fatto fallire NIENTE.
  it('VIETA le parole che spaccherebbero i marchi', () => {
    for (const vietata of ['dental', 'center', 'centre', 'clinic', 'smile', 'dent', 'care']) {
      expect(PAROLE_CATEGORIA_STUDIO,
        `«${vietata}» non è una categoria: è la prima metà di un marchio (v. ricerca §5.2)`)
        .not.toContain(vietata)
    }
    // i titoli dicono la persona, non il posto; le particelle sono pezzi di cognome
    for (const vietata of ['dott', 'dottor', 'dottore', 'dr', 'prof', 'di', 'del', 'de', 'la', 'lo'])
      expect(PAROLE_CATEGORIA_STUDIO).not.toContain(vietata)
  })
})
