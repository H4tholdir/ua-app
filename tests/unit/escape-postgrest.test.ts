import { describe, expect, it } from 'vitest'
import { pgrestQuote, ilikeLiterale } from '@/lib/utils/escape-postgrest'

describe('pgrestQuote', () => {
  it('racchiude il valore tra doppi apici (sintassi PostgREST per valori letterali)', () => {
    expect(pgrestQuote('CNC')).toBe('"CNC"')
  })

  it('lascia intatta una virgola — non deve più spezzare il parsing di .or()', () => {
    expect(pgrestQuote('Rossi, Mario')).toBe('"Rossi, Mario"')
  })

  it('lascia intatte le parentesi', () => {
    expect(pgrestQuote('Studio (Roma)')).toBe('"Studio (Roma)"')
  })

  it('lascia intatti punto e due punti', () => {
    expect(pgrestQuote('CNC.TitCer:v2')).toBe('"CNC.TitCer:v2"')
  })

  it('escapa le doppie virgolette interne', () => {
    expect(pgrestQuote('Lab "Sorriso"')).toBe('"Lab \\"Sorriso\\""')
  })

  it('escapa il backslash prima di escapare le virgolette (evita un doppio escape errato)', () => {
    expect(pgrestQuote('a\\b')).toBe('"a\\\\b"')
  })

  it('preserva il wildcard % del pattern ilike se già incluso nel valore', () => {
    expect(pgrestQuote('%CNC%')).toBe('"%CNC%"')
  })

  it('stringa vuota → coppia di doppi apici', () => {
    expect(pgrestQuote('')).toBe('""')
  })
})

// T6 (ondata b) — D48. `ilikeLiterale` spegne i metacaratteri di ILIKE PRIMA
// che il termine venga incorniciato con `%…%` e passato a `pgrestQuote`.
// 🔑 Attesi SCRITTI A MANO, mai calcolati riapplicando la funzione: una prova
// che ricalcola l'implementazione non prova niente (lezione T4).
// `String.raw` ovunque compaia un backslash: `'\\%'` in JavaScript è `%`, non
// `\%`, e una prova che si sbaglia su questo passa a vuoto.
describe('ilikeLiterale — D48, i quattro metacaratteri', () => {
  it('un termine senza metacaratteri esce identico', () => {
    expect(ilikeLiterale('bagheria')).toBe('bagheria')
  })

  it('il percento diventa un percento LETTERALE, non il jolly', () => {
    expect(ilikeLiterale('%')).toBe(String.raw`\%`)
  })

  it('il trattino basso diventa letterale, non «un carattere qualsiasi»', () => {
    expect(ilikeLiterale('_')).toBe(String.raw`\_`)
  })

  it('il backslash si raddoppia (per Postgres è il carattere di escape dentro ILIKE)', () => {
    expect(ilikeLiterale('\\')).toBe(String.raw`\\`)
  })

  it("l'asterisco si RIMUOVE: PostgREST lo traduce in % sul valore già spogliato dagli apici", () => {
    expect(ilikeLiterale('*')).toBe('')
    expect(ilikeLiterale('a*b')).toBe('ab')
  })

  it('UNA sola passata: backslash e percento insieme non si ri-escapano a vicenda', () => {
    // Input `\%` (2 caratteri). Atteso `\\` + `\%` = 4 caratteri.
    // 🛑 Due passate separate (prima `%`, poi `\`) darebbero `\\\\%`: una barra
    // LETTERALE seguita dal jolly — cioè il buco che si voleva chiudere.
    expect(ilikeLiterale(String.raw`\%`)).toBe(String.raw`\\\%`)
  })

  it('un termine misto: ogni metacarattere spento, il resto intatto', () => {
    expect(ilikeLiterale('50%_a')).toBe(String.raw`50\%\_a`)
  })

  it('la virgola NON si tocca — è compito di pgrestQuote, non di questa funzione', () => {
    expect(ilikeLiterale('rossi, mario')).toBe('rossi, mario')
  })

  it("l'apice doppio NON si tocca — anche quello è di pgrestQuote", () => {
    expect(ilikeLiterale('lab "sorriso"')).toBe('lab "sorriso"')
  })

  it('stringa vuota → stringa vuota (è il caso che innesca la guardia sul vuoto)', () => {
    expect(ilikeLiterale('')).toBe('')
  })

  it('composizione reale: `%` incorniciato e quotato arriva a PostgREST come letterale', () => {
    // L'ordine di T6: ilikeLiterale → cornice `%…%` → pgrestQuote (ULTIMO).
    // `\%` → `%\%%` → `"%\\%%"`: il parser di PostgREST mangia una barra e a
    // SQL arriva `%\%%`, cioè «contiene un percento».
    expect(pgrestQuote(`%${ilikeLiterale('%')}%`)).toBe(String.raw`"%\\%%"`)
  })

  it("l'ordine inverso cercherebbe un'altra stringa — controllo negativo", () => {
    // pgrestQuote PRIMA e ilikeLiterale DOPO produce una stringa diversa da
    // quella corretta: la prova serve a incidere che l'ordine non è opinabile.
    const corretto = pgrestQuote(`%${ilikeLiterale('%')}%`)
    const invertito = ilikeLiterale(pgrestQuote('%%%'))
    expect(invertito).not.toBe(corretto)
  })
})
