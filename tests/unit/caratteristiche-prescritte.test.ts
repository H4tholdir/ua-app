// Le prove della VOCE 6 dell'Allegato XIII — «le caratteristiche specifiche del
// prodotto indicate nella prescrizione».
//
// 🔴 IL FATTO CHE LE HA GENERATE: `generate-ddc.ts:166` cablava
//    `prescrizione_caratteristiche: null`, e il modello rende quella riga in
//    modo condizionale (`DdcTemplate.tsx:442-447`) — quindi la voce 6 NON È MAI
//    COMPARSA su nessuna dichiarazione emessa, pur essendo uno degli otto
//    contenuti obbligatori. Il dato c'era già: `lavori_prescrizioni.contenuto`.
//
// 🔑 LA FRASE È PER UNA PERSONA, non per una macchina: `{"colore":"A3"}` non è
//    una caratteristica prescritta, è un oggetto. Il vocabolario è quello che
//    l'utente vede già nella carta «La prescrizione» del wizard
//    (`FrameFatto.tsx:394-407`): «Elementi: denti 26, 27» e «Colore: A3».
//    `etichettaDenti` è LA STESSA funzione che rende quella riga — spostata
//    qui perché ora ha due lettori, non riscritta.

import { describe, it, expect } from 'vitest'
import { caratteristichePrescritte, etichettaDenti } from '@/lib/prescrizione/caratteristiche-prescritte'

describe('etichettaDenti — singolare e plurale (la funzione di casa, da FrameFatto)', () => {
  it('un dente solo: «dente 26», mai «1 elementi»', () => {
    expect(etichettaDenti([26])).toBe('dente 26')
  })

  it('più denti: «denti 26, 27, 31»', () => {
    expect(etichettaDenti([26, 27, 31])).toBe('denti 26, 27, 31')
  })
})

describe('caratteristichePrescritte — la frase della voce 6', () => {
  // ─── Le forme d'ingresso enumerate PRIMA delle asserzioni (R-P4) ──────────

  it('nessuna prescrizione (undefined): niente da riportare, e non è un difetto', () => {
    // La voce 6 dice «indicate NELLA PRESCRIZIONE»: se prescrizione non ce n'è,
    // il campo resta vuoto LEGITTIMAMENTE. Il documento non mente per omissione.
    expect(caratteristichePrescritte(undefined)).toBeNull()
  })

  it('prescrizione presente ma contenuto vuoto: `null` — è il caso che il controllo deve vedere', () => {
    expect(caratteristichePrescritte({})).toBeNull()
  })

  it('solo elementi: «Elementi: denti 26, 27»', () => {
    expect(caratteristichePrescritte({ elementi: [26, 27] })).toBe('Elementi: denti 26, 27')
  })

  it('un solo elemento: il singolare regge fino in fondo', () => {
    expect(caratteristichePrescritte({ elementi: [26] })).toBe('Elementi: dente 26')
  })

  it('solo colore: «Colore: A3»', () => {
    expect(caratteristichePrescritte({ colore: 'A3' })).toBe('Colore: A3')
  })

  it('entrambi: elementi PRIMA del colore, separati dal punto mediano', () => {
    expect(caratteristichePrescritte({ elementi: [26, 27], colore: 'A3' }))
      .toBe('Elementi: denti 26, 27 · Colore: A3')
  })

  it('il colore resta COME DIGITATO (D210): niente trim, niente maiuscole', () => {
    // La fedeltà è il punto: è il testo del medico, non un valore di catalogo.
    // Su un documento a valore legale «a3,5 » non si raddrizza in «A3.5».
    expect(caratteristichePrescritte({ colore: 'a3,5 ' })).toBe('Colore: a3,5 ')
  })

  it('elementi presenti ma array vuoto: non si scrive «Elementi:» a vuoto', () => {
    expect(caratteristichePrescritte({ elementi: [] })).toBeNull()
  })

  it('colore stringa vuota: non è una trascrizione di niente', () => {
    expect(caratteristichePrescritte({ colore: '' })).toBeNull()
  })

  it('`tipo` NON entra nella frase: non è prescritto (D213) ed è già il §5 del documento', () => {
    // D213: `tipo` entra nello snapshot SOLO alla conferma di consegna, copiato
    // da `lavori.tipo_dispositivo` — cioè è ciò che il laboratorio HA FATTO, non
    // ciò che il medico ha PRESCRITTO. Scriverlo sotto «Caratteristiche
    // prescritte» sarebbe attribuire al dentista una scelta che non è sua.
    expect(caratteristichePrescritte({ tipo: 'protesi_fissa' })).toBeNull()
    expect(caratteristichePrescritte({ tipo: 'protesi_fissa', colore: 'A3' })).toBe('Colore: A3')
  })

  it('l\'ordine degli elementi è quello della trascrizione, non riordinato', () => {
    // L'ordine d'ingresso è un dato (componi-snapshot.ts:36-38), non una
    // casualità: si stampa com'è.
    expect(caratteristichePrescritte({ elementi: [31, 26] })).toBe('Elementi: denti 31, 26')
  })
})
