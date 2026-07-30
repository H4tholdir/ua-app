import { describe, it, expect } from 'vitest'
import { oggiRomaISO, adessoRoma, aggiungiGiorniISO, annoRoma, mesiFaISO, GIORNI, MESI, saluto } from '@/lib/utils/data-roma'

describe('annoRoma — anno del giorno civile di Roma (date fiscali)', () => {
  it('capodanno: 23:30 UTC del 31/12 è GIÀ il 2027 a Roma (CET +1)', () => {
    expect(annoRoma(new Date('2026-12-31T23:30:00Z'))).toBe(2027)
  })
  it('22:30 UTC del 31/12 è ancora 2026 a Roma (23:30 CET)', () => {
    expect(annoRoma(new Date('2026-12-31T22:30:00Z'))).toBe(2026)
  })
  it("a metà anno coincide con l'anno UTC", () => {
    expect(annoRoma(new Date('2026-07-20T12:00:00Z'))).toBe(2026)
  })
})

describe('oggiRomaISO — il giorno civile a Roma, non in UTC (O1b)', () => {
  it('23:59 UTC in estate (CEST, UTC+2) è già il giorno DOPO a Roma', () => {
    expect(oggiRomaISO(new Date('2026-07-15T23:59:00Z'))).toBe('2026-07-16')
  })
  it('00:30 a Roma in estate (22:30 UTC del giorno prima) resta il giorno di Roma', () => {
    expect(oggiRomaISO(new Date('2026-07-15T22:30:00Z'))).toBe('2026-07-16')
  })
  it('in inverno (CET, UTC+1) 23:30 UTC è il giorno dopo, 22:30 UTC no', () => {
    expect(oggiRomaISO(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16')
    expect(oggiRomaISO(new Date('2026-01-15T22:30:00Z'))).toBe('2026-01-15')
  })
  it('DST marzo (29/03/2026, 02:00→03:00): attorno al salto il giorno resta il 29', () => {
    expect(oggiRomaISO(new Date('2026-03-28T23:30:00Z'))).toBe('2026-03-29') // 00:30 Roma
    expect(oggiRomaISO(new Date('2026-03-29T01:30:00Z'))).toBe('2026-03-29') // 03:30 Roma (post-salto)
  })
  it('DST ottobre (25/10/2026, 03:00→02:00): attorno al rientro il giorno resta il 25', () => {
    expect(oggiRomaISO(new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25') // 00:30 Roma (CEST)
    expect(oggiRomaISO(new Date('2026-10-25T02:30:00Z'))).toBe('2026-10-25') // 03:30 Roma (CET)
  })
})

describe('adessoRoma — wall-clock di Roma', () => {
  it('23:59 UTC estivo → 01:59 del giorno dopo a Roma', () => {
    const d = adessoRoma(new Date('2026-07-15T23:59:00Z'))
    expect(d.getHours()).toBe(1)
    expect(d.getMinutes()).toBe(59)
    expect(d.getDate()).toBe(16)
  })
  it('22:30 UTC invernale → 23:30 dello stesso giorno a Roma', () => {
    const d = adessoRoma(new Date('2026-01-15T22:30:00Z'))
    expect(d.getHours()).toBe(23)
    expect(d.getDate()).toBe(15)
  })
})

describe('aggiungiGiorniISO — aritmetica date-only senza UTC', () => {
  it('somma dentro il mese e oltre il confine di mese/anno', () => {
    expect(aggiungiGiorniISO('2026-07-20', 7)).toBe('2026-07-27')
    expect(aggiungiGiorniISO('2026-07-28', 7)).toBe('2026-08-04')
    expect(aggiungiGiorniISO('2026-12-29', 7)).toBe('2027-01-05')
  })
  it('attraversa il salto DST di marzo senza perdere un giorno', () => {
    expect(aggiungiGiorniISO('2026-03-27', 3)).toBe('2026-03-30')
  })
})

describe('GIORNI / MESI / saluto — copy della home', () => {
  it('GIORNI è Domenica-first capitalizzato, MESI minuscolo', () => {
    expect(GIORNI[0]).toBe('Domenica')
    expect(GIORNI[6]).toBe('Sabato')
    expect(MESI[0]).toBe('gennaio')
    expect(MESI[11]).toBe('dicembre')
  })
  it('saluto: 5→Buongiorno · 12→Buon pomeriggio · 18→Buonasera · 4→Buonasera', () => {
    expect(saluto(new Date(2026, 6, 20, 5, 0))).toBe('Buongiorno')
    expect(saluto(new Date(2026, 6, 20, 12, 0))).toBe('Buon pomeriggio')
    expect(saluto(new Date(2026, 6, 20, 18, 0))).toBe('Buonasera')
    expect(saluto(new Date(2026, 6, 20, 4, 0))).toBe('Buonasera')
  })
})

// ── `mesiFaISO` — la finestra all'indietro che non trabocca (31/07/2026) ────────
//
// Nasce da un difetto vero, gemello di quello riparato in `queries.ts` la stessa
// notte: `setFullYear(y - 1)` su una Date NON fallisce mai. Se il giorno non
// esiste nell'anno (o nel mese) di arrivo — il 29 febbraio guardato da un anno
// non bisestile, il 31 guardato da un mese di 30 — JavaScript TRABOCCA al mese
// successivo, e la finestra nasce spostata in avanti senza che nessuno se ne
// accorga.
//
// Le FORME D'INPUT enumerate PRIMA delle asserzioni (R-P4):
//   1. giorno che NON esiste nel mese di arrivo (29 feb → anno non bisestile) ✔
//   2. giorno 31 verso un mese di 30 ✔
//   3. giorno 29/30/31 verso febbraio ✔
//   4. giorno che esiste (il caso normale, che non deve cambiare) ✔
//   5. bisestile → bisestile (il 29 febbraio SOPRAVVIVE se l'arrivo ce l'ha) ✔
//   6. `mesi = 0` (identità) ✔
//   7. salto che attraversa il capodanno ✔
//   8. `mesi` NEGATIVO, cioè in avanti ✔
//   9. data d'INGRESSO che non esiste (29 febbraio non bisestile) ✔ — trovata
//      sbagliando la prova del caso 6, e vale la pena fissarla
// 🛑 Non coperta, e il perché: nessun fuso orario. Questa funzione lavora su una
// data-only (YYYY-MM-DD) e non passa MAI da UTC — è la stessa scelta di
// `aggiungiGiorniISO` qui sopra, ed è il motivo per cui il fuso non può entrarci.
describe('mesiFaISO — indietro di N mesi senza traboccare (difetto 29 febbraio)', () => {
  it('🔴 il 29 febbraio, un anno indietro: si ferma al 28, NON scivola al 1° marzo', () => {
    expect(mesiFaISO('2028-02-29', 12)).toBe('2027-02-28')
  })

  it('il 31 verso un mese di 30: si ferma al 30', () => {
    expect(mesiFaISO('2026-07-31', 1)).toBe('2026-06-30')
  })

  it('il 31 marzo verso febbraio (il salto più corto del calendario)', () => {
    expect(mesiFaISO('2026-03-31', 1)).toBe('2026-02-28')
  })

  it('il caso normale non cambia: un giorno che esiste resta quel giorno', () => {
    expect(mesiFaISO('2026-07-15', 12)).toBe('2025-07-15')
    expect(mesiFaISO('2026-07-15', 1)).toBe('2026-06-15')
  })

  it('bisestile → bisestile: il 29 febbraio SOPRAVVIVE quando l\'anno di arrivo ce l\'ha', () => {
    expect(mesiFaISO('2028-02-29', 48)).toBe('2024-02-29')
  })

  it('zero mesi: la data torna identica', () => {
    expect(mesiFaISO('2028-02-29', 0)).toBe('2028-02-29')
    expect(mesiFaISO('2026-07-31', 0)).toBe('2026-07-31')
  })

  // Trovata scrivendo la prova qui sopra, sbagliandola: il 2026 NON è bisestile,
  // quindi `2026-02-29` è una data che non esiste. Vale la pena fissare cosa
  // succede, perché è la stessa scelta di tutto il resto — si scende all'ultimo
  // giorno vero del mese, non si trabocca al primo del successivo.
  it('una data d\'ingresso che non esiste (29 febbraio di un anno non bisestile) scende al 28, non trabocca', () => {
    expect(mesiFaISO('2026-02-29', 0)).toBe('2026-02-28')
  })

  it('attraversa il capodanno all\'indietro', () => {
    expect(mesiFaISO('2026-01-15', 2)).toBe('2025-11-15')
    expect(mesiFaISO('2026-01-31', 1)).toBe('2025-12-31')
  })

  it('mesi negativi: va in AVANTI, e non trabocca nemmeno lì', () => {
    expect(mesiFaISO('2026-01-31', -1)).toBe('2026-02-28')
    expect(mesiFaISO('2026-07-15', -1)).toBe('2026-08-15')
  })
})
