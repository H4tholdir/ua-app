import { describe, expect, it } from 'vitest'
import { aggiungiGiorni, inizioGiorno, stessoGiorno } from '@/lib/date/giorni'

// Bug QA critico: inizioGiorno/aggiungiGiorni/stessoGiorno vivevano in
// Campo.tsx ('use client'), ma venivano chiamate server-side da
// dati-wizard.ts ('server-only') e tempi-medi.ts → crash a runtime
// "Attempted to call X() from the server but X is on the client."
// Questo modulo neutro (nessuna direttiva 'use client'/'server-only')
// deve poter essere importato sia da server che da client.

describe('inizioGiorno', () => {
  it('azzera ora/minuti/secondi/millisecondi mantenendo anno/mese/giorno locali', () => {
    const d = new Date(2026, 6, 12, 23, 59, 59, 999) // 12 luglio 2026, 23:59:59.999
    const risultato = inizioGiorno(d)

    expect(risultato.getFullYear()).toBe(2026)
    expect(risultato.getMonth()).toBe(6)
    expect(risultato.getDate()).toBe(12)
    expect(risultato.getHours()).toBe(0)
    expect(risultato.getMinutes()).toBe(0)
    expect(risultato.getSeconds()).toBe(0)
    expect(risultato.getMilliseconds()).toBe(0)
  })
})

describe('aggiungiGiorni', () => {
  it('somma giorni positivi attraversando il cambio mese', () => {
    const d = new Date(2026, 6, 30) // 30 luglio 2026
    const risultato = aggiungiGiorni(d, 3)

    expect(risultato.getFullYear()).toBe(2026)
    expect(risultato.getMonth()).toBe(7) // agosto
    expect(risultato.getDate()).toBe(2)
  })

  it('sottrae giorni (n negativo) attraversando il cambio anno', () => {
    const d = new Date(2026, 0, 1) // 1 gennaio 2026
    const risultato = aggiungiGiorni(d, -1)

    expect(risultato.getFullYear()).toBe(2025)
    expect(risultato.getMonth()).toBe(11) // dicembre
    expect(risultato.getDate()).toBe(31)
  })
})

describe('stessoGiorno', () => {
  it('true se anno/mese/giorno coincidono anche con orari diversi', () => {
    const a = new Date(2026, 6, 12, 8, 0, 0)
    const b = new Date(2026, 6, 12, 21, 30, 0)
    expect(stessoGiorno(a, b)).toBe(true)
  })

  it('false se il giorno differisce', () => {
    const a = new Date(2026, 6, 12)
    const b = new Date(2026, 6, 13)
    expect(stessoGiorno(a, b)).toBe(false)
  })
})
