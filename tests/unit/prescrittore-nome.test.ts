// D242 — UNA sola regola di «vuoto» per il nome del prescrittore.
//
// 🔑 Il fatto che ha generato questo file: la Dichiarazione di Conformità
// poteva uscire SENZA il nome del prescrittore col controllo di consegna VERDE.
// Il precheck (`precheck.ts:22-25`) considerava vuota una stringa di soli
// spazi e ripiegava sul cliente; i due documenti (`generate-ddc.ts:146`,
// `BuonoTemplate.tsx:312`) usavano `??`, che ripiega SOLO su `null`. Due idee
// diverse di «vuoto» nello stesso flusso: il controllo diceva sì, il documento
// usciva senza nome.
//
// 🛑 E `||` da solo NON basta, ed è la ragione per cui questo modulo esiste
// invece di un carattere cambiato: `'   '` è truthy. `TabDati.tsx:311` scrive
// `e.target.value || null`, quindi tre spazi digitati diventano `'   '` in
// banca dati — con `||` il documento uscirebbe ANCORA vuoto, e il controllo
// ANCORA verde. La regola dev'essere sul testo TRIMMATO, la stessa per tutti.
//
// ═══ FORME D'INPUT ENUMERATE (R-P4) ═══════════════════════════════════════
//  ① null                    → ripiega
//  ② undefined / chiave assente → ripiega
//  ③ '' (stringa vuota)      → ripiega            ← il difetto di partenza
//  ④ '   ' (soli spazi)      → ripiega            ← la trappola sotto `||`
//  ⑤ '\t\n ' (altri bianchi) → ripiega
//  ⑥ 'Dott. Bianchi'         → RESTA (controllo positivo: non si tocca ciò che c'è)
//  ⑦ '  Dott. Bianchi  '     → resta, trimmato
//  ⑧ tutti e due vuoti       → null (nessuno inventa un nome)
//  ⑨ ripiego vuoto, primo pieno → resta il primo
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { testoVivo } from '@/lib/utils/testo'
import { nomePrescrittore } from '@/lib/consegna/prescrittore'

describe('testoVivo — un testo che non dice niente è niente', () => {
  it('① null → null', () => {
    expect(testoVivo(null)).toBeNull()
  })

  it('② undefined → null', () => {
    expect(testoVivo(undefined)).toBeNull()
  })

  it('③ stringa vuota → null', () => {
    expect(testoVivo('')).toBeNull()
  })

  it('④ soli spazi → null (il caso che `||` NON prende)', () => {
    expect(testoVivo('   ')).toBeNull()
  })

  it('⑤ tabulazioni e a capo → null', () => {
    expect(testoVivo('\t\n ')).toBeNull()
  })

  it('⑥ un testo vero resta, identico', () => {
    expect(testoVivo('Dott. Bianchi')).toBe('Dott. Bianchi')
  })

  it('⑦ un testo vero con spazi intorno torna trimmato', () => {
    expect(testoVivo('  Dott. Bianchi  ')).toBe('Dott. Bianchi')
  })
})

describe('nomePrescrittore — il ripiego sul cliente vale con la STESSA regola del precheck', () => {
  it('① il nome scritto sul lavoro vince sempre', () => {
    expect(nomePrescrittore('Dott. Bianchi', 'Rossi Mario')).toBe('Dott. Bianchi')
  })

  it('② nome assente (null) → ripiega sul cliente', () => {
    expect(nomePrescrittore(null, 'Rossi Mario')).toBe('Rossi Mario')
  })

  it('③ 🔴 stringa vuota → ripiega sul cliente (il difetto: `??` non lo faceva)', () => {
    expect(nomePrescrittore('', 'Rossi Mario')).toBe('Rossi Mario')
  })

  it('④ 🔴 soli spazi → ripiega sul cliente (il difetto che `||` avrebbe lasciato)', () => {
    expect(nomePrescrittore('   ', 'Rossi Mario')).toBe('Rossi Mario')
  })

  it('⑤ anche il ripiego si misura trimmato: cliente di soli spazi non è un nome', () => {
    expect(nomePrescrittore('', '   ')).toBeNull()
  })

  it('⑧ nessuno dei due dice niente → null: nessun nome si inventa', () => {
    expect(nomePrescrittore(null, null)).toBeNull()
    expect(nomePrescrittore('', '')).toBeNull()
  })

  it('⑨ il ripiego è vuoto ma il primo c\'è → resta il primo', () => {
    expect(nomePrescrittore('Dott. Bianchi', '')).toBe('Dott. Bianchi')
  })
})
