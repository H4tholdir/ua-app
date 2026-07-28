import { describe, expect, it } from 'vitest'
import { PATCHABLE_FIELDS } from '@/app/api/lavori/[id]/route'

/**
 * Sentinella denti+colore (spec §4, modello invariante D7 e sentinella cassetta).
 * Dal momento in cui esiste `lavori_denti`, questi SETTE campi hanno una sola
 * penna: PUT /api/lavori/[id]/denti (e la creazione atomica del POST). Lasciarli
 * patchabili significherebbe due sorgenti dello stesso fatto clinico — la classe
 * di difetto già pagata una volta con `numero_cassetta`.
 *
 * Sono sette, non cinque: `denti_mancanti` e `denti_impianti` escono con gli
 * altri, perché il `ruolo` della riga di `lavori_denti` li assorbe entrambi.
 * La tabella di destinazione dei sette nomi (chi li scrive da adesso) vive nel
 * blocco di commento sopra `PATCHABLE_FIELDS`, accanto a ciò che descrive.
 */
const SENTINELLE = [
  'denti_coinvolti',
  'denti_mancanti',
  'denti_impianti',
  'colore_dente',
  'colore_collo',
  'colore_corpo',
  'colore_incisale',
] as const

describe('sentinella denti e colore (spec §4)', () => {
  for (const campo of SENTINELLE) {
    it(`${campo} NON è mai patchabile: scrive solo PUT /denti`, () => {
      expect(PATCHABLE_FIELDS).not.toContain(campo)
    })
  }

  it('la sentinella cassetta e quella D7 restano in piedi', () => {
    expect(PATCHABLE_FIELDS).not.toContain('numero_cassetta')
    expect(PATCHABLE_FIELDS).not.toContain('proposta_dentista')
  })

  // Controllo positivo: senza questo, un'allowlist SVUOTATA per errore
  // passerebbe ogni caso qui sopra — sette `not.toContain` non distinguono
  // «i sette nomi sono usciti» da «non è rimasto niente».
  it('l allowlist regge ancora i campi che devono restare patchabili', () => {
    expect(PATCHABLE_FIELDS).toContain('descrizione')
    expect(PATCHABLE_FIELDS).toContain('effetti_speciali')
    expect(PATCHABLE_FIELDS).toContain('tecnica_colore')
  })
})
