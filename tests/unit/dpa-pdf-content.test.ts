// @vitest-environment node
// D126 — il contratto sul trattamento dei dati (DPA) smette di dire cose non vere.
//
// 🔑 PERCHÉ QUESTA PROVA ESISTE. Il DPA è l'unico documento del progetto che esce
// dal laboratorio e va in mano a un TERZO (il dentista, Titolare del trattamento)
// senza che nessuno lo rilegga mai. Fino al 03/08/2026 dichiarava tre misure di
// sicurezza che il prodotto NON ha e citava due volte una norma che per i
// dispositivi su misura non esiste. Una rete che guarda solo «il PDF si genera»
// (`generate-dpa.test.ts`) non poteva vederlo: bisogna leggere le PAROLE.
//
// ⚠️ Le asserzioni negative sono la parte che conta e sono deliberatamente
// LETTERALI: ognuna nomina la frase che era davvero stampata, così se qualcuno la
// rimette la prova si accende. Una `not.toContain` su un concetto («sicurezza»)
// non proverebbe niente.
//
// Zero DB, zero Supabase: il template si rende direttamente con una fixture.

import { describe, it, expect, beforeAll } from 'vitest'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { DpaTemplate } from '@/components/features/pdf/DpaTemplate'

const DPA_FIXTURE = {
  lab: {
    ragione_sociale: 'Laboratorio Odontotecnico Opromolla S.r.l.',
    nome: 'Opromolla',
    partita_iva: '03508740655',
    codice_fiscale: null,
    indirizzo: 'Via Roma 12',
    cap: '84028',
    citta: 'Serre',
    provincia: 'SA',
    prrc_nome: 'Filippo Opromolla',
    codice_itca: 'ITCA01051686',
  },
  cliente: {
    studio_nome: 'Studio Dentistico Rossi',
    nome: 'Mario',
    cognome: 'Rossi',
    partita_iva: '01234567890',
    codice_fiscale: null,
    indirizzo: 'Corso Italia 4',
    cap: '84121',
    citta: 'Salerno',
    provincia: 'SA',
  },
  numero_dpa: 'DPA-2026-ABCD1234',
  data_emissione: '2026-08-03T10:00:00.000Z',
}

describe('DPA — il contratto che esce dal laboratorio', () => {
  let testo = ''

  beforeAll(async () => {
    const buffer = await renderPdfDocument(createElement(DpaTemplate, { dpa: DPA_FIXTURE }))
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    // Il PDF spezza le righe: si normalizza per confrontare frasi intere.
    testo = result.text.replace(/\s+/g, ' ')
  })

  // ─── Le tre affermazioni di sicurezza FALSE, misurate il 03/08/2026 ─────────

  it('🔴 NON dichiara autenticazione a più fattori — nel prodotto non esiste', () => {
    // provato: grep -riE "\bmfa\b|two.factor|2fa|totp" src/ → 0 riscontri.
    // Le passkey esistono ma sono un accesso ALTERNATIVO, non un secondo fattore.
    expect(testo).not.toContain('Autenticazione a più fattori')
    expect(testo).not.toContain('più fattori')
  })

  it('🔴 NON dichiara pseudonimizzazione — il nome paziente è in chiaro e indicizzato', () => {
    // provato: supabase/schema.sql:891 (paziente_nome_snapshot TEXT, in chiaro)
    // e :1011 (indice full-text GIN che lo include). Ciò che esiste è un
    // mascheramento in lettura per ruolo: un'altra cosa dall'Art. 4(5) GDPR.
    expect(testo).not.toContain('Pseudonimizzazione')
    expect(testo).not.toContain('pseudonimizzazione')
  })

  it('🔴 NON dichiara un log immutabile di TUTTI GLI ACCESSI — registra le modifiche, e su due tabelle', () => {
    // provato: 20260704120000_b3_cicli_fasi_audit.sql:7,11 → trigger su
    // cicli_produzione e fasi_produzione soltanto; e sono trigger di MUTAZIONE,
    // non di lettura. Né lavori né pazienti sono coperti.
    expect(testo).not.toContain('Log immutabile')
    expect(testo).not.toContain('tutti gli accessi ai dati sanitari')
  })

  // ─── Le quattro citazioni normative sbagliate ──────────────────────────────

  it('🔴 NON cita l\'Art. 10(8) MDR — è la norma dei dispositivi NON su misura', () => {
    // Art. 10(8) nomina documentazione tecnica All. II/III e dichiarazione di
    // conformità UE: oggetti riservati ai dispositivi «diversi dai su misura»
    // (Art. 10(4) e 10(6)), che per un laboratorio odontotecnico non esistono.
    expect(testo).not.toContain('10(8)')
  })

  it('🔴 NON cita l\'Art. 10(4) MDR né il «Fascicolo Tecnico» — stesso errore, quarta riga', () => {
    // Art. 10(4): «I fabbricanti di dispositivi DIVERSI DAI DISPOSITIVI SU MISURA
    // redigono e tengono aggiornata una documentazione tecnica». Trovata il 03/08
    // rileggendo il template per intero: D62 e la roadmap ne enumeravano tre.
    expect(testo).not.toContain('10(4)')
    expect(testo).not.toContain('Fascicolo Tecnico')
  })

  it('✅ cita l\'Allegato XIII — la norma vera dei dispositivi su misura', () => {
    expect(testo).toContain('Allegato XIII')
  })

  it('✅ dice che i 10 anni riguardano la DICHIARAZIONE, non «i dati»', () => {
    // Allegato XIII punto 4, verbatim: «La dichiarazione di cui alla parte
    // introduttiva del punto 1 è conservata per un periodo di almeno 10 anni».
    expect(testo).toMatch(/dichiarazione[^.]{0,120}almeno 10 anni/i)
  })

  it('✅ distingue i 15 anni degli impiantabili — il documento non conosce il dispositivo, quindi enuncia la regola', () => {
    // DpaTemplate non riceve alcun dato del dispositivo (è per CLIENTE, non per
    // lavoro): la clausola non può essere condizionale, deve dire la regola.
    expect(testo).toContain('15 anni')
    expect(testo).toContain('impiantabili')
  })

  it('✅ dice esplicitamente che il materiale di lavorazione NON ha un termine minimo MDR', () => {
    // È la frase che rende il documento coerente con la cancellazione delle foto
    // (permessa fino alla consegna: api/lavori/[id]/immagini/[imgId]/route.ts:200-205).
    expect(testo).toMatch(/materiale di lavorazione/i)
  })

  it('✅ conserva la riga GIUSTA: Art. 52(8) per la dichiarazione dei su misura', () => {
    // Verbatim: «I fabbricanti di dispositivi su misura seguono la procedura di
    // cui all'allegato XIII e redigono la dichiarazione prevista al punto 1».
    // La correzione DISCRIMINA: non passa la scopa su tutte le citazioni.
    expect(testo).toContain('52(8)')
  })

  // ─── La catena dei sub-responsabili ────────────────────────────────────────

  it('✅ dichiara UÀ come sub-responsabile, non solo i suoi fornitori', () => {
    // Supabase, Vercel e Resend sono sub-responsabili DI UÀ, non del laboratorio:
    // presentarli come diretti salta lo strato intermedio (Art. 28(2) e (4)).
    expect(testo).toMatch(/UÀ[^.]{0,80}sub-responsabile/i)
  })

  it('✅ dice che AdE/SdI e Ministero della Salute NON sono sub-responsabili', () => {
    // Ricevono per obbligo di legge e determinano le proprie finalità: sono
    // titolari autonomi (Art. 6(1)(c)).
    expect(testo).toMatch(/titolari autonomi/i)
  })

  // ─── Le clausole Art. 28 che mancavano ─────────────────────────────────────

  it('✅ la scelta fra cancellazione e restituzione è del TITOLARE (Art. 28(3)(g))', () => {
    expect(testo).toMatch(/a scelta del Titolare/i)
  })

  it('✅ le 24 ore del data breach decorrono dalla CONOSCENZA, non dall\'evento', () => {
    // Art. 33 GDPR misura dal momento in cui si viene a conoscenza.
    expect(testo).not.toContain("entro 24 ore dall'evento")
    expect(testo).toMatch(/conoscenza/i)
  })

  it('✅ contiene l\'obbligo di segnalare un\'istruzione che viola il GDPR (Art. 28(3)(h))', () => {
    expect(testo).toMatch(/viol[ai][^.]{0,80}(GDPR|Regolamento)/i)
  })

  it('✅ contiene audit e ispezioni del Titolare (Art. 28(3)(h))', () => {
    expect(testo).toMatch(/ispezioni|audit/i)
  })

  // ─── Ciò che non deve rompersi ─────────────────────────────────────────────

  it('✅ resta un accordo ex Art. 28 GDPR, con le due parti e il numero', () => {
    expect(testo).toContain('Art. 28')
    expect(testo).toContain('Studio Dentistico Rossi')
    expect(testo).toContain('Laboratorio Odontotecnico Opromolla')
    expect(testo).toContain('DPA-2026-ABCD1234')
  })
})
