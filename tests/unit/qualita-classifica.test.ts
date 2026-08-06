import { describe, it, expect } from 'vitest'
import { classifica } from '@/lib/qualita/classifica'
import type { FattiEvento } from '@/lib/qualita/classifica'
import type { Esito } from '@/lib/domain/qualita-costanti'

const base = {
  natura: 'difetto_fisico', origine: 'odontoiatra',
  statoDispositivo: 'applicato', potenzialeDiDanno: 'nessuno',
} as const

describe('classifica — ordine ministeriale (D268)', () => {
  it('il difetto segnalato dal dentista PRIMA dell applicazione è un RECLAMO, non lavoro interno', () => {
    // È il caso 2 ribaltato dal panel: il Ministero lo chiama il caso TIPICO di reclamo
    const p = classifica({ ...base, statoDispositivo: 'consegnato_non_applicato' })
    expect(p.esito).toBe('reclamo')
  })

  it('il danno POSSIBILE fa incidente ANCHE se il dispositivo non era applicato', () => {
    // Il test dell incidente viene PRIMA: invertirlo nasconderebbe l obbligo dell Art. 88
    const p = classifica({ ...base, statoDispositivo: 'consegnato_non_applicato', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })

  // ⚖️ D277 (06/08/2026) — AGGIORNATA. Prima chiedeva per scontato che `accertato` bastasse a
  // dedurre «grave» e a fissare SEMPRE 15 giorni. L'Art. 2(65), citato nella spec stessa,
  // separa «è un incidente?» (Art. 2(64), asse di `potenzialeDiDanno`) da «è grave?» (una
  // domanda diversa, che va posta a una persona): un danno può essere accertato ed essere
  // lieve. Senza una risposta sulla gravità, l'esito resta «incidente» IN ATTESA, non
  // «incidente_grave», e il termine resta vuoto finché qualcuno non risponde.
  it('⚖️ D277 — il danno ACCERTATO è un incidente, ma la gravità si CHIEDE: senza risposta resta in attesa, termine vuoto', () => {
    const p = classifica({ ...base, potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('incidente')
    expect(p.termineOre).toBeNull()
    expect(p.perche).toContain('?') // la domanda dell'Art. 2(65) è in chiaro, non silenziosa
  })

  it('⚖️ D277 — «accertato» NON implica grave: risposto esplicitamente «non grave» resta incidente, non grave', () => {
    const p = classifica({ ...base, potenzialeDiDanno: 'accertato' }, 'non_grave')
    expect(p.esito).toBe('incidente')
    expect(p.termineOre).toBeNull()
  })

  it('⚖️ D277 — minaccia grave alla salute pubblica (Art. 87(4)): 2 giorni, non 15', () => {
    const p = classifica({ ...base, potenzialeDiDanno: 'possibile' }, 'minaccia_grave_salute_pubblica')
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(2 * 24)
  })

  it('⚖️ D277 — morte o deterioramento grave non previsto (Art. 87(5)): 10 giorni, non 15', () => {
    const p = classifica({ ...base, potenzialeDiDanno: 'accertato' }, 'morte_o_deterioramento_grave_non_previsto')
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(10 * 24)
  })

  it('⚖️ D277 — incidente grave, regola generale (Art. 87(3)): 15 giorni', () => {
    const p = classifica({ ...base, potenzialeDiDanno: 'accertato' }, 'grave_regola_generale')
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(15 * 24)
  })

  it('«da valutare» NON scivola in reclamo: resta candidato incidente', () => {
    // Art. 87(7): nel dubbio si segnala. Un default prudente non deve essere aggirabile
    const p = classifica({ ...base, potenzialeDiDanno: 'da_valutare' })
    expect(p.esito).toBe('incidente')
  })

  it('il difetto visto DAL LABORATORIO, senza danno, è non conformità interna — non reclamo', () => {
    const p = classifica({ ...base, origine: 'laboratorio_interno', statoDispositivo: 'consegnato_non_applicato' })
    expect(p.esito).toBe('non_conformita_interna')
    expect(p.ramoIso).toBe('8.3.3')   // era già uscito dal controllo
  })

  it('il difetto visto in casa PRIMA che esca è §8.3.2, non §8.3.3', () => {
    const p = classifica({ ...base, origine: 'laboratorio_interno', statoDispositivo: 'mai_uscito_dal_lab' })
    expect(p.ramoIso).toBe('8.3.2')
  })

  it('la richiesta clinica nuova NON è una non conformità', () => {
    const p = classifica({ ...base, natura: 'nuova_esigenza_clinica', origine: 'odontoiatra' })
    expect(p.esito).toBe('nessuna_azione')
  })

  it('«non lo so» sullo stato del dispositivo non blocca e non declassa', () => {
    // Francesco, 06/08: «spesso non lo sappiamo». I tre test non chiedono mai se fosse applicato
    const p = classifica({ ...base, statoDispositivo: 'non_noto', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })

  it('ogni proposta porta il PERCHÉ in chiaro', () => {
    expect(classifica(base).perche.length).toBeGreaterThan(10)
  })

  // ⚖️ D276 — le due prove che chiudono il difetto trovato dal controllo pre-volo.
  // Senza queste, l'uscita anticipata dei tre motivi tornerebbe senza far rumore.
  //
  // 🔄 AGGIORNATA (D277): l'assunto «accertato → sempre incidente_grave/15gg» non vale più
  // per default — ora passa esplicitamente la risposta di gravità, e resta la prova che una
  // natura esente (D276) non impedisce di arrivare fino a «grave», nemmeno passando dalla
  // domanda dell'Art. 2(65).
  it('🛑 «richiesta clinica nuova» NON scavalca il test dell\'incidente: con la gravità confermata è incidente GRAVE', () => {
    const p = classifica({ ...base, natura: 'nuova_esigenza_clinica', potenzialeDiDanno: 'accertato' }, 'grave_regola_generale')
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(15 * 24)
  })

  it('🛑 «registrato per sbaglio» NON scavalca il test dell\'incidente', () => {
    const p = classifica({ ...base, natura: 'errore_registrazione', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })

  // 🕳️ Lacuna di copertura (rilievo della revisione del Task 2): l'unico ramo `natura` di
  // ①-bis che nessuna prova raggiungeva. La prova con `errore_registrazione` (sopra) esce
  // sempre PRIMA, al passo ①, perché usa un `potenzialeDiDanno` diverso da `nessuno`.
  it('🕳️ natura COMMERCIALE, senza alcun potenziale di danno, è nessuna azione (ramo mai raggiunto da una prova)', () => {
    const p = classifica({ ...base, natura: 'commerciale', potenzialeDiDanno: 'nessuno' })
    expect(p.esito).toBe('nessuna_azione')
  })
})

// ⚖️ D278 (06/08/2026) — «mai uscito dal laboratorio» esclude l'incidente, qualunque sia il
// potenziale di danno E qualunque sia l'origine: un incidente riguarda un dispositivo «messo
// a disposizione» (Art. 2(64)), e uno che non è mai uscito dal laboratorio non lo è mai stato.
// Vince la spec §3 su §6 (le due si contraddicevano).
describe('classifica — D278: mai uscito dal laboratorio = mai un incidente', () => {
  it('🛑 CASO NORMALE (non il raro): mai uscito + danno ACCERTATO resta non conformità interna, non incidente grave', () => {
    // `potenziale_di_danno` nasce `da_valutare` in banca dati: un difetto registrato su un
    // lavoro ancora al banco, lasciato al valore di default, usciva "incidente" con la
    // versione precedente del motore — qui il caso è portato al limite (accertato, non
    // da_valutare) per provare che l'esclusione vale ANCHE per il potenziale di danno più
    // grave possibile, non solo per il default prudente.
    const p = classifica({ ...base, statoDispositivo: 'mai_uscito_dal_lab', potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('non_conformita_interna')
    expect(p.ramoIso).toBe('8.3.2')
    expect(p.termineOre).toBeNull()
  })

  it('🛑 «qualunque sia l\'origine»: mai uscito + danno accertato + origine INTERNA resta §8.3.2, non incidente', () => {
    const p = classifica({ ...base, origine: 'laboratorio_interno', statoDispositivo: 'mai_uscito_dal_lab', potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('non_conformita_interna')
    expect(p.ramoIso).toBe('8.3.2')
  })

  it('anche con la risposta di gravità già in mano, mai uscito resta non conformità interna: la domanda non si pone nemmeno', () => {
    const p = classifica({ ...base, statoDispositivo: 'mai_uscito_dal_lab', potenzialeDiDanno: 'accertato' }, 'grave_regola_generale')
    expect(p.esito).toBe('non_conformita_interna')
    expect(p.ramoIso).toBe('8.3.2')
  })

  // La spec elenca solo `potenzialeDiDanno` e `origine` fra i «qualunque sia» di D278 — NON
  // `natura`. Un motivo che di per sé non è mai un problema del dispositivo (D276, ①-bis)
  // resta esente anche quando il dispositivo non è mai uscito: non c'era nessun incidente da
  // nascondere in nessuno dei due casi, quindi le due regole non collidono.
  it('una natura ESENTE (D276) resta nessuna azione anche se il dispositivo non è mai uscito', () => {
    const p = classifica({ ...base, natura: 'commerciale', statoDispositivo: 'mai_uscito_dal_lab', potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('nessuna_azione')
  })
})

// 🟠 D279 (06/08/2026) — il «perché» si compone dai FATTI registrati (`statoDispositivo`,
// `origine`), mai da una frase fissa che può affermare il contrario di ciò che l'utente ha
// appena dichiarato. Tre casi, gli stessi tre della revisione.
describe('classifica — D279: il PERCHÉ non contraddice i fatti registrati', () => {
  it('dispositivo APPLICATO, segnalato dall\'odontoiatra: il perché non nega che fosse applicato', () => {
    const p = classifica({ ...base, statoDispositivo: 'applicato', origine: 'odontoiatra' })
    expect(p.esito).toBe('reclamo')
    expect(p.perche).not.toContain('non è ancora stato applicato')
    expect(p.perche.toLowerCase()).toContain('applicato')
  })

  it('stato NON NOTO, visto dal laboratorio: il perché non afferma con certezza che fosse già uscito', () => {
    const p = classifica({ ...base, statoDispositivo: 'non_noto', origine: 'laboratorio_interno', potenzialeDiDanno: 'nessuno' })
    expect(p.esito).toBe('non_conformita_interna')
    expect(p.perche).not.toContain('a dispositivo già uscito')
    expect(p.perche.toLowerCase()).toContain('non sappiamo')
  })

  it('mai uscito dal laboratorio, segnalato dall\'odontoiatra: il perché non dice "ce ne siamo accorti noi"', () => {
    const p = classifica({ ...base, statoDispositivo: 'mai_uscito_dal_lab', origine: 'odontoiatra' })
    expect(p.esito).toBe('non_conformita_interna')
    expect(p.perche).not.toMatch(/^Ce ne siamo accorti noi/)
    expect(p.perche.toLowerCase()).toContain('odontoiatra')
  })
})

// 🕳️ Lacuna di copertura (rilievo della revisione del Task 2): la prova «ogni proposta porta
// il perché» guardava UN SOLO esito (`reclamo`, via `base`). Un `perche` vuoto su un esito
// diverso avrebbe superato tutte le altre prove. Qui si guardano tutti gli esiti raggiungibili
// (i sei rami distinti del motore, non solo i cinque valori di `Esito`: `nessuna_azione` e
// `non_conformita_interna` hanno ciascuno due rami diversi con testi diversi).
describe('classifica — ogni ramo raggiungibile porta un PERCHÉ non vuoto', () => {
  const casi: Array<{ nome: string; fatti: Parameters<typeof classifica>[0]; gravita?: Parameters<typeof classifica>[1]; esitoAtteso: Esito }> = [
    { nome: 'nessuna_azione — nuova esigenza clinica', fatti: { ...base, natura: 'nuova_esigenza_clinica', potenzialeDiDanno: 'nessuno' }, esitoAtteso: 'nessuna_azione' },
    { nome: 'nessuna_azione — commerciale/errore di registrazione', fatti: { ...base, natura: 'commerciale', potenzialeDiDanno: 'nessuno' }, esitoAtteso: 'nessuna_azione' },
    { nome: 'reclamo', fatti: { ...base, statoDispositivo: 'consegnato_non_applicato', potenzialeDiDanno: 'nessuno' }, esitoAtteso: 'reclamo' },
    { nome: 'non_conformita_interna — §8.3.3 (uscito, visto in laboratorio)', fatti: { ...base, origine: 'laboratorio_interno', potenzialeDiDanno: 'nessuno' }, esitoAtteso: 'non_conformita_interna' },
    { nome: 'non_conformita_interna — §8.3.2 (D278, mai uscito)', fatti: { ...base, statoDispositivo: 'mai_uscito_dal_lab', potenzialeDiDanno: 'accertato' }, esitoAtteso: 'non_conformita_interna' },
    { nome: 'incidente — gravità in attesa di risposta', fatti: { ...base, potenzialeDiDanno: 'possibile' }, esitoAtteso: 'incidente' },
    { nome: 'incidente — gravità risposta NON grave', fatti: { ...base, potenzialeDiDanno: 'possibile' }, gravita: 'non_grave', esitoAtteso: 'incidente' },
    { nome: 'incidente_grave — minaccia salute pubblica', fatti: { ...base, potenzialeDiDanno: 'possibile' }, gravita: 'minaccia_grave_salute_pubblica', esitoAtteso: 'incidente_grave' },
    { nome: 'incidente_grave — morte o deterioramento grave non previsto', fatti: { ...base, potenzialeDiDanno: 'possibile' }, gravita: 'morte_o_deterioramento_grave_non_previsto', esitoAtteso: 'incidente_grave' },
    { nome: 'incidente_grave — regola generale', fatti: { ...base, potenzialeDiDanno: 'possibile' }, gravita: 'grave_regola_generale', esitoAtteso: 'incidente_grave' },
  ]

  it.each(casi)('$nome', ({ fatti, gravita, esitoAtteso }) => {
    const p = classifica(fatti, gravita)
    expect(p.esito).toBe(esitoAtteso)
    expect(p.perche.length).toBeGreaterThan(10)
  })

  it('i dieci rami sopra non condividono tutti lo stesso testo (nessuna frase fissa copre più di un fatto reale)', () => {
    const testi = new Set(casi.map(({ fatti, gravita }) => classifica(fatti, gravita).perche))
    // Misurato dopo la ri-revisione: i dieci rami hanno DIECI testi distinti, non solo "più di
    // uno" — un vincolo debole (toBeGreaterThan(1)) passerebbe anche con 2 testi su 10 rami
    // realmente diversi. toBe(10) è il numero vero, misurato con questo stesso comando.
    expect(testi.size).toBe(10)
  })
})

// 🛑 RI-REVISIONE (06/08/2026) — REGRESSIONE introdotta dalla correzione D277-D279: i tre
// helper interni che compongono `perche` (`descriviProvenienza`, `descriviStatoDispositivo`) e
// il calcolo della gravità (`esitoDaGravita`, dietro la destrutturazione del passo ①) sono
// `switch` esaustivi SUL TIPO dichiarato, ma senza un ramo di riserva per un valore che il tipo
// dichiarato esclude e che arriva comunque a runtime (body JSON non ancora validato, un `Task
// 4` che costruisce `FattiEvento` da un oggetto parziale). Prima di questa correzione questi
// ingressi restituivano una proposta (sbagliata ma viva, sempre verso PIÙ obblighi); la
// correzione D277-D279 li ha resi esplosivi. Qui si prova che sono tornati a NON esplodere, e
// che restano dalla parte di più obblighi — mai di meno.
describe('classifica — ri-revisione: un ingresso imprevisto non fa mai esplodere la funzione', () => {
  describe('statoDispositivo imprevisto — resta "reclamo" (② non cambia), il perché non contiene "undefined"', () => {
    it('fuori vocabolario', () => {
      const p = classifica({ ...base, statoDispositivo: 'boh' } as unknown as FattiEvento)
      expect(p.esito).toBe('reclamo')
      expect(p.perche).not.toContain('undefined')
    })

    it('assente (chiave mancante nell\'oggetto)', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { statoDispositivo, ...senzaStato } = base
      const p = classifica(senzaStato as unknown as FattiEvento)
      expect(p.esito).toBe('reclamo')
      expect(p.perche).not.toContain('undefined')
    })

    it('null', () => {
      const p = classifica({ ...base, statoDispositivo: null } as unknown as FattiEvento)
      expect(p.esito).toBe('reclamo')
      expect(p.perche).not.toContain('undefined')
    })

    it('di tipo sbagliato (un numero)', () => {
      const p = classifica({ ...base, statoDispositivo: 42 } as unknown as FattiEvento)
      expect(p.esito).toBe('reclamo')
      expect(p.perche).not.toContain('undefined')
    })
  })

  describe('rispostaGravita imprevista — resta "incidente" IN ATTESA (mai dedotta da un valore a caso, D277), termine vuoto', () => {
    it('fuori vocabolario', () => {
      const p = classifica({ ...base, potenzialeDiDanno: 'possibile' }, 'boh' as unknown as Parameters<typeof classifica>[1])
      expect(p.esito).toBe('incidente')
      expect(p.termineOre).toBeNull()
      expect(p.perche).not.toContain('undefined')
    })

    it('null', () => {
      const p = classifica({ ...base, potenzialeDiDanno: 'possibile' }, null as unknown as Parameters<typeof classifica>[1])
      expect(p.esito).toBe('incidente')
      expect(p.termineOre).toBeNull()
      expect(p.perche).not.toContain('undefined')
    })

    it('un numero', () => {
      const p = classifica({ ...base, potenzialeDiDanno: 'possibile' }, 42 as unknown as Parameters<typeof classifica>[1])
      expect(p.esito).toBe('incidente')
      expect(p.termineOre).toBeNull()
      expect(p.perche).not.toContain('undefined')
    })
  })

  describe('origine imprevista — resta "reclamo" (② tratta l\'ignoto come esterno), il perché non contiene "undefined"', () => {
    it('fuori vocabolario', () => {
      const p = classifica({ ...base, origine: 'boh' } as unknown as FattiEvento)
      expect(p.esito).toBe('reclamo')
      expect(p.perche).not.toContain('undefined')
    })

    it('assente (chiave mancante nell\'oggetto)', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { origine, ...senzaOrigine } = base
      const p = classifica(senzaOrigine as unknown as FattiEvento)
      expect(p.esito).toBe('reclamo')
      expect(p.perche).not.toContain('undefined')
    })
  })
})
