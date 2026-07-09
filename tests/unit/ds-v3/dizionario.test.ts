import { describe, it, expect } from 'vitest'
import { trovaParoleVietate, PAROLE_VIETATE } from '@/design-system/v3/dizionario'

describe('dizionario v3 — parole del banco', () => {
  it('trova le parole del software in un testo UI', () => {
    expect(trovaParoleVietate('Compila il form e premi Submit')).toEqual(['form', 'submit'])
    expect(trovaParoleVietate('Vai alla dashboard')).toEqual(['dashboard'])
    expect(trovaParoleVietate('Errore 500: richiesta fallita')).toContain('errore 500')
  })
  it('non segnala testi in parole del banco', () => {
    expect(trovaParoleVietate('È arrivata un\'impronta? Tocca il tasto rosso')).toEqual([])
    expect(trovaParoleVietate('Corona n.147 · consegna oggi alle 16:00')).toEqual([])
  })
  it('non fa falsi positivi su sottostringhe', () => {
    // "informa" contiene "forma" non "form" come parola
    expect(trovaParoleVietate('UÀ ti informa quando ha finito')).toEqual([])
    expect(trovaParoleVietate('la piattaforma')).toEqual([])
  })
  it('ogni parola vietata ha il sostituto del banco', () => {
    for (const p of PAROLE_VIETATE) expect(p.usa.length).toBeGreaterThan(0)
  })

  // Copertura completa: un caso positivo per OGNI pattern, nello stesso ordine di PAROLE_VIETATE
  const casiPositivi: Array<{ testo: string; attesa: string }> = [
    { testo: 'Vai alla dashboard', attesa: 'dashboard' },
    { testo: 'Compila il form', attesa: 'form' },
    { testo: 'Nuovo record creato', attesa: 'record' },
    { testo: 'Premi Submit per continuare', attesa: 'submit' },
    { testo: 'Salva le modifiche', attesa: 'salva' },
    { testo: 'Applica i filtri alla lista', attesa: 'filtri' },
    { testo: 'Esegui la query sul database', attesa: 'query' },
    { testo: 'Nuovo task assegnato', attesa: 'task' },
    { testo: 'Aggiungi alla to-do list', attesa: 'to-do' },
    { testo: 'Errore 500 dal server', attesa: 'errore 500' },
    { testo: 'Richiesta fallita, riprova più tardi', attesa: 'richiesta fallita' },
    { testo: 'Loading, attendere prego', attesa: 'loading' },
    { testo: 'Caricamento in corso…', attesa: 'caricamento in corso' },
    { testo: 'stato: in_lavorazione', attesa: 'in_lavorazione' },
    { testo: 'Vuoi eliminare? Elimina definitivamente', attesa: 'elimina definitivamente' },
    { testo: 'Campo obbligatorio mancante', attesa: 'campo obbligatorio' },
    { testo: 'Fattura emessa verso SDI', attesa: 'fattura emessa verso sdi' },
  ]
  it('copre tutti i pattern con un match positivo ciascuno', () => {
    expect(casiPositivi.length).toBe(PAROLE_VIETATE.length)
    for (const { testo, attesa } of casiPositivi) {
      expect(trovaParoleVietate(testo), `atteso "${attesa}" in "${testo}"`).toContain(attesa)
    }
  })

  it('word boundary sui pattern multi-parola: niente falsi positivi', () => {
    expect(trovaParoleVietate('Precaricamento in corso')).toEqual([])
    expect(trovaParoleVietate('Ricaricamento in corso')).toEqual([])
    // "errore 5001" non deve fabbricare il match "errore 500"
    expect(trovaParoleVietate('errore 5001')).not.toContain('errore 500')
    expect(trovaParoleVietate('errore 5001')).toEqual([])
  })
  it('word boundary sulle parole singole: niente falsi positivi', () => {
    expect(trovaParoleVietate('il salvataggio è automatico')).toEqual([])
    expect(trovaParoleVietate('multitasking')).toEqual([])
  })
})
