import { describe, it, expect } from 'vitest'
import { precheckMDR } from '@/lib/consegna/precheck'
import type { LavoroDettaglio } from '@/types/domain'

// Helper per costruire un lavoro minimo valido
function makeLavoro(overrides: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'test-id',
    laboratorio_id: 'lab-id',
    numero_lavoro: '2026-0001',
    anno_lavoro: 2026,
    codice_interno: null,
    numero_prescrizione: null,
    numero_cassetta: null,
    cliente_id: 'cliente-id',
    paziente_id: 'paziente-id',
    tecnico_id: null,
    ciclo_id: null,
    paziente_nome_snapshot: 'ROSSI MARIO',
    paziente_nascita_snapshot: null,
    tipo_dispositivo: 'protesi_fissa',
    descrizione: 'Corona ceramica 14 colore A2',
    note_interne: null,
    richiedente_nome: null,
    colore_dente: null,
    colore_collo: null,
    colore_corpo: null,
    colore_incisale: null,
    effetti_speciali: null,
    tecnica_colore: null,
    colorazione_esterna: null,
    denti_coinvolti: null,
    arcata: null,
    anamnesi_note: null,
    anamnesi_bruxismo: false,
    anamnesi_precauzioni: null,
    anamnesi_altri_dispositivi: null,
    classe_rischio: 'classe_iia',
    norma_riferimento: null,
    da_conformare: true,
    dispositivo_semilavorato: false,
    stato: 'pronto',
    priorita: 'normale',
    data_ingresso: '2026-05-14T09:00:00Z',
    data_consegna_prevista: '2026-05-20',
    ora_consegna: null,
    data_prima_prova: null,
    data_seconda_prova: null,
    data_terza_prova: null,
    data_consegna_effettiva: null,
    file_stl_url: null,
    immagini_urls: null,
    impronta_digitale: false,
    buono_pdf_url: null,
    buono_numero: null,
    listino_id: null,
    prezzo_unitario: null,
    codice_iva: 'N4',
    natura_iva: 'N4',
    incluso_in_fattura: false,
    conformato: false,
    data_conformazione: null,
    is_rifacimento: false,
    consegna_in_corso: false,
    consegna_tap_at: null,
    consegna_completata_at: null,
    post_consegna_correzioni: 0,
    consegna_precheck_passato_al_primo_tentativo: null,
    spedizione_corriere: null,
    spedizione_tracking: null,
    spedizione_stato: null,
    spedizione_data_prevista: null,
    spedizione_note: null,
    created_at: '2026-05-14T09:00:00Z',
    updated_at: '2026-05-14T09:00:00Z',
    deleted_at: null,
    // Join
    cliente: {
      id: 'cliente-id',
      laboratorio_id: 'lab-id',
      studio_nome: null,
      nome: 'Mario',
      cognome: 'Rossi',
      telefono: '3331234567',
      email: null,
      partita_iva: null,
      codice_fiscale: null,
      codice_sdi: '1234567',
      pec: null,
      indirizzo: null,
      cap: null,
      citta: null,
      provincia: null,
      paese: 'IT',
      listino_numero: 1,
      sconto_percentuale: 0,
      tecnico_default_id: null,
      modalita_pagamento: null,
      non_soggetto_fe: false,
      portale_token: 'tok-test',
      note: null,
    },
    paziente: null,
    tecnico: null,
    lavorazioni: [],
    appuntamenti: [],
    immagini: [],
    fasi: [],
    materiali: [],
    partitario: [],
    ddc: null,
    ...overrides,
  } as unknown as LavoroDettaglio
}

describe('precheckMDR', () => {
  it('passa con tutti i campi obbligatori presenti', () => {
    const result = precheckMDR(makeLavoro())
    // Il check sui materiali aggiunge warning ma ok rimane false — questo è corretto
    // Per il test verifichiamo che gli elementi 3-7 siano ok
    const erroriCritici = result.errori.filter(e => e.elemento !== 5 || e.campo !== 'materiali')
    expect(erroriCritici).toHaveLength(0)
  })

  // 🔄 I SEI NUMERI QUI SOTTO SONO CAMBIATI IL 07/08/2026 (D295), e non è
  //    cosmesi. L'elenco di prima diceva di verificare «gli 8 elementi
  //    obbligatori Allegato XIII» e poi numerava una lista che nell'Allegato
  //    XIII NON ESISTE: prescrittore=3, descrizione=5, classe di rischio=6,
  //    data di consegna=7. Nell'Allegato vero il prescrittore è la voce 5, i
  //    dati che identificano il dispositivo sono la voce 3, e classe di rischio
  //    e data di consegna NON SONO VOCI — non compaiono da nessuna parte.
  //    È quella numerazione inventata la ragione per cui la voce 6 (le
  //    caratteristiche prescritte) è rimasta scoperta per mesi: chi leggeva
  //    «6 = classe di rischio» aveva ogni motivo di credere che la 6 fosse fatta.

  it('fallisce senza prescrittore (VOCE 5 — «il nome della persona che ha prescritto»)', () => {
    const lavoro = makeLavoro({
      richiedente_nome: null,
      cliente: { ...makeLavoro().cliente, nome: '', cognome: '' },
    })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 5 && e.campo === 'cliente_id')).toBe(true)
  })

  it('fallisce senza paziente (VOCE 4 — l\'unico numero che era già giusto)', () => {
    const lavoro = makeLavoro({ paziente_nome_snapshot: null, paziente_id: null })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 4)).toBe(true)
  })

  it('fallisce con descrizione troppo breve (VOCE 3 — «i dati che consentono di identificare il dispositivo»)', () => {
    const lavoro = makeLavoro({ descrizione: 'A2' })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 3 && e.campo === 'descrizione')).toBe(true)
  })

  it('fallisce senza tipo dispositivo (VOCE 3, stessa voce della descrizione)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lavoro = makeLavoro({ tipo_dispositivo: '' as any })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 3 && e.campo === 'tipo_dispositivo')).toBe(true)
  })

  it('fallisce senza classe rischio — controllo VERO ma NON una voce: `elemento: null`', () => {
    // 🛑 Il controllo RESTA, e resta bloccante com'era: `classe_rischio` è
    //    `NOT NULL` su `dichiarazioni_conformita` (schema.sql:1231), quindi
    //    senza di lei l'insert della dichiarazione fallisce. Toglierlo perché
    //    «non è una voce dell'Allegato» sarebbe togliere un cancello — cioè
    //    l'esatto opposto del mandato. Cambia solo l'ETICHETTA: `null` dice
    //    onestamente «controllo d'integrità, non voce dell'Allegato XIII».
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lavoro = makeLavoro({ classe_rischio: null as any })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === null && e.campo === 'classe_rischio')).toBe(true)
  })

  it('fallisce senza data consegna — anche questo un controllo d\'esercizio, non una voce', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lavoro = makeLavoro({ data_consegna_prevista: null as any })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === null && e.campo === 'data_consegna_prevista')).toBe(true)
  })

  it('🔴 NESSUN errore porta più un numero che l\'Allegato XIII non ha', () => {
    // La rete che impedisce alla numerazione inventata di tornare: ogni
    // `elemento` è o una voce vera (1-8) o `null`. Prima di oggi qui sarebbero
    // passati 6 e 7 su voci che non esistono.
    const lavoro = makeLavoro({
      richiedente_nome: null,
      cliente: { ...makeLavoro().cliente, nome: '', cognome: '' },
      paziente_nome_snapshot: null,
      paziente_id: null,
      descrizione: 'A2',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tipo_dispositivo: '' as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      classe_rischio: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data_consegna_prevista: null as any,
    })
    const result = precheckMDR(lavoro)
    expect(result.errori.length).toBeGreaterThan(0)
    for (const e of result.errori) {
      if (e.elemento === null) continue
      expect(e.elemento).toBeGreaterThanOrEqual(1)
      expect(e.elemento).toBeLessThanOrEqual(8)
    }
    // E le due voci che il vecchio elenco spacciava per 6 e 7 non ci sono più.
    expect(result.errori.some(e => e.elemento === 6)).toBe(false)
    expect(result.errori.some(e => e.elemento === 7)).toBe(false)
  })

  it('usa richiedente_nome se presente (bypass cliente.cognome vuoto)', () => {
    const lavoro = makeLavoro({
      richiedente_nome: 'Dott. Amendola Aldo',
      cliente: { ...makeLavoro().cliente, nome: '', cognome: '' },
    })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.campo === 'cliente_id')).toBe(false)
  })

  it('NON blocca la consegna se materiali vuoti (warning visivo nella pagina, non errore bloccante)', () => {
    // Il check materiali è gestito come warning UI nella pagina /consegna,
    // non come errore bloccante nel precheck MDR.
    const lavoro = makeLavoro({ materiali: [] })
    const result = precheckMDR(lavoro)
    const erroriBloccanti = result.errori.filter(e => e.campo !== 'materiali')
    expect(erroriBloccanti).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// D295 — LA RETE SULLA VOCE 6: «prescrizione presente ma caratteristiche vuote»
// ═══════════════════════════════════════════════════════════════════════════
// 🔑 I DUE CASI SI DEVONO DISTINGUERE, ed è tutto il punto del controllo.
//    · Nessuna prescrizione → la voce 6 resta vuota LEGITTIMAMENTE («indicate
//      nella prescrizione»: se prescrizione non c'è, non c'è nulla da
//      riportare). Nessun avviso: un avviso qui sarebbe un falso allarme
//      ripetuto su ogni lavoro nato senza foglio del dentista.
//    · Prescrizione presente ma senza caratteristiche → è il buco di oggi che
//      si ripresenta, e deve VEDERSI.
//
// 🛑 L'AVVISO NON BLOCCA, e non deve: «la PWA non dà blocchi, dà aiuti» (D262).
//    Vive nel canale morbido (`avvisi`), che la rotta di precheck versa nei
//    `warnings` del foglio di conferma — lo stesso foglio che compare già oggi
//    a ogni consegna consegnabile. Rendere bloccante un controllo che oggi non
//    lo è è una decisione di Francesco, non di chi scrive il codice.
describe('D295 — la voce 6 non può più sparire in silenzio', () => {
  it('nessuna prescrizione: nessun avviso, e la consegna resta consegnabile', () => {
    const result = precheckMDR(makeLavoro())
    expect(result.avvisi ?? []).toHaveLength(0)
  })

  it('🔴 prescrizione presente ma contenuto VUOTO: l\'avviso c\'è', () => {
    const lavoro = makeLavoro({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prescrizione: { contenuto: {} } as any,
    })
    const result = precheckMDR(lavoro)
    expect(result.avvisi ?? []).toHaveLength(1)
    expect((result.avvisi ?? [])[0]).toMatch(/caratteristiche/i)
  })

  it('🛑 e NON blocca: `ok` resta vero, l\'avviso non entra fra gli errori', () => {
    const lavoro = makeLavoro({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prescrizione: { contenuto: {} } as any,
    })
    const result = precheckMDR(lavoro)
    expect(result.ok).toBe(true)
    expect(result.errori.some(e => e.elemento === 6)).toBe(false)
  })

  it('prescrizione CON caratteristiche: nessun avviso — il controllo non urla sul caso normale', () => {
    const lavoro = makeLavoro({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prescrizione: { contenuto: { elementi: [26], colore: 'A3' } } as any,
    })
    const result = precheckMDR(lavoro)
    expect(result.avvisi ?? []).toHaveLength(0)
  })

  it('prescrizione col SOLO numero (contenuto vuoto ma riga legittima): avvisa', () => {
    // `componiSnapshot` crea la riga anche con il solo numero di prescrizione
    // (M-T3-3): `contenuto: {}` con numero presente è una riga LEGITTIMA. Ed è
    // proprio il caso in cui la voce 6 esce vuota senza che nessuno se ne accorga.
    const lavoro = makeLavoro({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prescrizione: { contenuto: {}, numero_prescrizione: 'P-2026-77' } as any,
    })
    const result = precheckMDR(lavoro)
    expect(result.avvisi ?? []).toHaveLength(1)
  })
})
