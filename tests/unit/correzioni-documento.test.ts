// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { LAVORO_FIXTURE } from './helpers/pdf-fixtures'
import type { LavoroDettaglio, Paziente } from '@/types/domain'
import {
  CAMPI_CORREGGIBILI_DOCUMENTO,
  validaCorrezioni,
  fondiCorrezioni,
} from '@/lib/dichiarazione/correzioni'

/**
 * Task C — LE OTTO VOCI CORREGGIBILI DEL DOCUMENTO, e la regola sola che
 * chiude C2.
 *
 * 🔑 PERCHÉ QUESTO MODULO ESISTE E NON È «i campi di `lavori`»: una seconda
 * penna sul lavoro non conoscerebbe le ~200 righe di regole della PATCH
 * (colore di caso, tinta, sentinelle, blocco fiscale). Qui si correggono le
 * voci che il DOCUMENTO stampa, e sono otto nomi per sette voci a schermo — il
 * paziente si corregge scegliendone un altro (`paziente_id`) OPPURE correggendo
 * l'identificativo per questo documento (`paziente_nome_snapshot`).
 *
 * 🛑 C2, misurato dalla revisione del Task B: una sola chiamata con
 * `denti_coinvolti: []`, `paziente_id: null` e stringhe vuote è tornata `ok` e
 * ha SVUOTATO cinque campi. Il database non rifiuta il vuoto. Lo rifiuta qui,
 * con UNA regola — «una correzione vuota non è una correzione» — non con tre
 * casi speciali.
 */

const PAZIENTE_NUOVO = {
  id: 'paz-nuovo',
  laboratorio_id: 'lab-test-001',
  nome_cognome: 'Giuseppa Esposito',
  codice_paziente: 'PZ-002',
} as unknown as Paziente

const UUID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function ok(grezzo: unknown) {
  const e = validaCorrezioni(grezzo)
  if (!e.ok) throw new Error(`atteso ok, ricevuto: ${e.errore}`)
  return e.correzioni
}

describe('CAMPI_CORREGGIBILI_DOCUMENTO — otto nomi e non uno di più', () => {
  it('sono esattamente le otto chiavi dell\'allowlist della RPC', () => {
    // 🛑 Lo stesso elenco vive nella RPC (`c_su_lavori || c_su_penne`). Sono due
    // scritture della stessa verità e questo test è l'unico posto in cui si
    // guardano in faccia: la RPC è la penna, questa è la rete davanti.
    expect([...CAMPI_CORREGGIBILI_DOCUMENTO].sort()).toEqual([
      'denti_coinvolti', 'descrizione', 'numero_prescrizione', 'paziente_id',
      'paziente_nome_snapshot', 'prescrizione_caratteristiche',
      'richiedente_nome', 'tipo_dispositivo',
    ])
  })
})

describe('validaCorrezioni — la forma dell\'ingresso', () => {
  it('un oggetto vuoto NON è una correzione (C2)', () => {
    // Chi vuole solo rifare la carta OMETTE la chiave: quella è la strada, e
    // resta aperta. `{}` mandato apposta è una richiesta che non chiede niente.
    const e = validaCorrezioni({})
    expect(e.ok).toBe(false)
  })

  it.each([
    ['un array', []],
    ['una stringa', 'richiedente_nome'],
    ['un numero', 3],
    ['null', null],
  ])('%s non è un oggetto di correzioni → rifiutato', (_nome, valore) => {
    expect(validaCorrezioni(valore).ok).toBe(false)
  })

  it('una chiave fuori dalle otto è rifiutata, e il messaggio la NOMINA', () => {
    const e = validaCorrezioni({ classe_rischio: 'classe_i' })
    if (e.ok) throw new Error('atteso rifiuto')
    expect(e.errore).toContain('classe_rischio')
  })

  it('🛑 una chiave fuori dalle otto non si scarta in silenzio insieme a una buona', () => {
    // È lo scarto muto di `route.ts:259-264` — l'utente legge «Salvato» su un
    // dato che non c'è. Su una carta a valore legale non si fa.
    const e = validaCorrezioni({ descrizione: 'Corona in zirconia', stato: 'consegnato' })
    expect(e.ok).toBe(false)
  })
})

describe('🛑 C2 — una regola sola: una correzione VUOTA non è una correzione', () => {
  it.each([
    ['stringa vuota', { descrizione: '' }],
    ['stringa di soli spazi', { descrizione: '   ' }],
    ['null su un testo', { richiedente_nome: null }],
    ['null sul paziente', { paziente_id: null }],
    ['array vuoto sui denti', { denti_coinvolti: [] }],
    ['oggetto vuoto sulle caratteristiche', { prescrizione_caratteristiche: {} }],
    ['snapshot vuoto — il caso D242', { paziente_nome_snapshot: '  ' }],
  ])('%s → rifiutata', (_nome, corpo) => {
    expect(validaCorrezioni(corpo).ok).toBe(false)
  })

  it('⚠️ D242 — uno snapshot vuoto vincerebbe sul nome vivo e stamperebbe un\'identificazione paziente assente', () => {
    // `generate-ddc.ts:258` ripiega con `??`, che conosce solo `null`: una
    // stringa vuota lo supera intatta e la voce 4 dell'Allegato XIII esce vuota.
    const e = validaCorrezioni({ paziente_nome_snapshot: '' })
    expect(e.ok).toBe(false)
  })

  it('i testi arrivano ripuliti ai bordi, non come li ha digitati chi scriveva di fretta', () => {
    expect(ok({ descrizione: '  Corona in zirconia  ' }).descrizione).toBe('Corona in zirconia')
  })
})

describe('validaCorrezioni — le forme che il database non saprebbe raccontare', () => {
  it('🛑 `denti_coinvolti` come array di STRINGHE FDI è rifiutato qui, non dalla penna', () => {
    // La chiave si chiama come la colonna denormalizzata e invita all'errore.
    // Lasciarlo passare costa un PDF orfano e un progressivo bruciato, perché
    // il rifiuto arriverebbe DOPO il render.
    const e = validaCorrezioni({ denti_coinvolti: ['21', '22'] })
    expect(e.ok).toBe(false)
  })

  it('`denti_coinvolti` come array di oggetti passa, e torna NORMALIZZATO dalla penna unica', () => {
    const c = ok({ denti_coinvolti: [{ fdi: 22 }, { fdi: 21, ruolo: 'mancante' }] })
    const denti = c.denti_coinvolti as Array<Record<string, unknown>>
    // `validaDenti` applica i default: chi non dice il ruolo dice «elemento».
    expect(denti[0]).toMatchObject({ fdi: 22, ruolo: 'elemento', provenienza: 'prescritto' })
    expect(denti[1]).toMatchObject({ fdi: 21, ruolo: 'mancante' })
  })

  it('un dente fuori dal dominio FDI è rifiutato dalla stessa validazione delle altre due porte', () => {
    expect(validaCorrezioni({ denti_coinvolti: [{ fdi: 99 }] }).ok).toBe(false)
  })

  it.each([
    ['una stringa', 'A3'],
    ['un array', ['A3']],
    ['un numero', 3],
  ])('`prescrizione_caratteristiche` come %s → rifiutata', (_n, v) => {
    expect(validaCorrezioni({ prescrizione_caratteristiche: v }).ok).toBe(false)
  })

  it('🔑 una sotto-chiave che la prescrizione non conosce è rifiutata QUI, non dalla penna dopo l\'annullo', () => {
    // Senza questa riga `campo_non_valido` arriverebbe dalla penna DOPO che la
    // dichiarazione è già stata annullata: il contratto lo trasforma in una
    // eccezione, cioè in un 500 dove c'era solo un refuso del chiamante.
    expect(validaCorrezioni({ prescrizione_caratteristiche: { materiale: 'zirconia' } }).ok).toBe(false)
  })

  it('una sotto-chiave buona ma di forma sbagliata è rifiutata (elementi non è un array di numeri)', () => {
    expect(validaCorrezioni({ prescrizione_caratteristiche: { elementi: ['26'] } }).ok).toBe(false)
  })

  it('le tre sotto-chiavi vere passano', () => {
    const c = ok({ prescrizione_caratteristiche: { elementi: [26], colore: 'A3', tipo: 'corona' } })
    expect(c.prescrizione_caratteristiche).toEqual({ elementi: [26], colore: 'A3', tipo: 'corona' })
  })

  it('`paziente_id` che non è un UUID è rifiutato: al database darebbe un 22P02 illeggibile', () => {
    expect(validaCorrezioni({ paziente_id: 'pippo' }).ok).toBe(false)
  })

  it.each([
    ['un numero al posto di un testo', { descrizione: 12 }],
    ['un booleano al posto di un testo', { tipo_dispositivo: true }],
    ['un oggetto al posto di un testo', { numero_prescrizione: { n: 1 } }],
  ])('%s → rifiutato', (_n, corpo) => {
    expect(validaCorrezioni(corpo).ok).toBe(false)
  })
})

describe('fondiCorrezioni — il PDF si stampa dai dati CORRETTI, non da quelli vecchi', () => {
  const base = LAVORO_FIXTURE

  it('i testi finiscono sul lavoro che va al generatore', () => {
    const c = ok({ descrizione: 'Corona in zirconia', richiedente_nome: 'Dott. Bianchi' })
    const corretto = fondiCorrezioni(base, c)
    expect(corretto.descrizione).toBe('Corona in zirconia')
    expect(corretto.richiedente_nome).toBe('Dott. Bianchi')
  })

  it('🛑 non muta il lavoro originale: la fusione è in memoria e a copia', () => {
    const prima = base.descrizione
    fondiCorrezioni(base, ok({ descrizione: 'Un altro testo' }))
    expect(base.descrizione).toBe(prima)
  })

  it('🔴 correggere `paziente_id` PORTA CON SÉ L\'EMBED: senza, il PDF stampa il paziente VECCHIO', () => {
    // `generate-ddc.ts:258` ripiega su `lavoro.paziente?.nome_cognome` quando lo
    // snapshot è nullo. Cambiare il solo identificativo e lasciare l'embed
    // stantìo scrive sul documento il nome della persona SBAGLIATA, mentre la
    // riga in banca dati punta a quella giusta. È il difetto peggiore possibile
    // su questa carta, e non lo nomina nessun documento a monte.
    const senzaSnapshot = { ...base, paziente_nome_snapshot: null, paziente: null } as LavoroDettaglio
    const corretto = fondiCorrezioni(senzaSnapshot, ok({ paziente_id: UUID_A }), PAZIENTE_NUOVO)
    expect(corretto.paziente_id).toBe(UUID_A)
    expect(corretto.paziente?.nome_cognome).toBe('Giuseppa Esposito')
  })

  it('🔑 `tipo_dispositivo` corretto arriva PRIMA della costruzione, che ci pesca i rischi residui', () => {
    // `costruisciDichiarazione:216` cerca `rischi_tipo_dispositivo` per
    // `lavoro.tipo_dispositivo`: fondere dopo la costruzione darebbe un
    // documento col tipo nuovo e i rischi del tipo vecchio.
    const corretto = fondiCorrezioni(base, ok({ tipo_dispositivo: 'protesi_mobile' }))
    expect(corretto.tipo_dispositivo).toBe('protesi_mobile')
  })

  it('i denti si denormalizzano COME LA PENNA: solo i `elemento`, in ordine NUMERICO, come testo', () => {
    // La penna fa `array_agg(fdi::text ORDER BY fdi)` filtrando `ruolo =
    // 'elemento'`, e `fdi` è un INTERO: l'ordine è numerico, non alfabetico.
    // ⚠️ LIMITE DICHIARATO DELLA PROVA: oggi ogni FDI è a due cifre (11-48 e
    //    51-85), quindi ordine numerico e alfabetico COINCIDONO e questa prova
    //    non li sa distinguere. Il codice ordina lo stesso per numero, che è la
    //    forma che resta giusta se il dominio cambia — detto, non nascosto.
    const c = ok({
      denti_coinvolti: [
        { fdi: 26 }, { fdi: 47, ruolo: 'mancante' }, { fdi: 11 }, { fdi: 36, ruolo: 'impianto' },
      ],
    })
    const corretto = fondiCorrezioni(base, c)
    expect(corretto.denti_coinvolti).toEqual(['11', '26'])
    expect(corretto.denti_mancanti).toEqual([47])
    expect(corretto.denti_impianti).toEqual([36])
  })

  it('le caratteristiche prescritte si FONDONO sul contenuto, non lo sostituiscono', () => {
    // La penna fa `jsonb_set(contenuto, [campo], valore)` una sotto-chiave alla
    // volta: correggere il colore non cancella gli elementi.
    const conPrescrizione = {
      ...base,
      prescrizione: { contenuto: { elementi: [26], colore: 'A2', tipo: 'corona' } },
    } as unknown as LavoroDettaglio
    const corretto = fondiCorrezioni(conPrescrizione, ok({ prescrizione_caratteristiche: { colore: 'A3' } }))
    expect(corretto.prescrizione?.contenuto).toEqual({ elementi: [26], colore: 'A3', tipo: 'corona' })
  })
})
