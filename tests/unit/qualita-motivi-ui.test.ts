import { describe, it, expect } from 'vitest'
import { MOTIVI_UI, FAMIGLIE, motiviDellaFamiglia, ORIGINE_UI, STATO_UI, DANNO_UI, ESITO_UI } from '@/lib/qualita/motivi-ui'
import { MOTIVI, ORIGINI_INFORMAZIONE, STATI_DISPOSITIVO, POTENZIALI_DI_DANNO, ESITI } from '@/lib/domain/qualita-costanti'

/**
 * I testi di «Devo intervenire» (Task 6) — D300-D303.
 *
 * 🛑 QUESTE PROVE ESISTONO PER UNA RAGIONE MISURATA, non per scrupolo: in questo
 * progetto **un elenco scritto a mano sembra completo e non lo è**, ed è
 * successo QUATTRO volte in un giorno solo (handoff 07/08, lezione 3). Qui
 * cinque vocabolari dell'interfaccia devono corrispondere, uno a uno, ai
 * vocabolari chiusi del dominio — che a loro volta sono copiati dai CHECK vivi
 * in banca dati. La prova conta; nessuno rilegge.
 */

describe('i testi di «Devo intervenire» — nessun vocabolario può perdere una voce', () => {
  it('i nove motivi hanno tutti la loro voce, e non ce n\'è una di troppo', () => {
    expect(Object.keys(MOTIVI_UI).sort()).toEqual([...MOTIVI].sort())
  })

  it('ogni motivo appartiene a una famiglia DICHIARATA', () => {
    const chiavi = FAMIGLIE.map((f) => f.chiave)
    for (const m of MOTIVI) {
      expect(chiavi, m).toContain(MOTIVI_UI[m].famiglia)
    }
  })

  it('🛑 nessuna famiglia è vuota — una intestazione senza voci è un buco che si vede a schermo', () => {
    for (const f of FAMIGLIE) {
      expect(motiviDellaFamiglia(f.chiave).length, f.etichetta).toBeGreaterThan(0)
    }
  })

  it('le cinque famiglie coprono tutti e nove i motivi, senza doppioni', () => {
    const raccolti = FAMIGLIE.flatMap((f) => motiviDellaFamiglia(f.chiave))
    expect(raccolti.sort()).toEqual([...MOTIVI].sort())
  })

  it('ogni voce porta un\'etichetta e un sottotitolo che dice che cosa succede', () => {
    for (const m of MOTIVI) {
      expect(MOTIVI_UI[m].etichetta.length, m).toBeGreaterThan(3)
      // Il sottotitolo è la parte utile: se è troppo corto non sta dicendo un effetto.
      expect(MOTIVI_UI[m].sottotitolo.length, m).toBeGreaterThan(15)
    }
  })

  // ⚖️ D301 · D302 · D303 — la rete sulle parole di casa.
  it('🛑 nessun testo dice «pezzo» o «carta» (D301, D302)', () => {
    for (const m of MOTIVI) {
      const t = `${MOTIVI_UI[m].etichetta} ${MOTIVI_UI[m].sottotitolo}`.toLowerCase()
      expect(t, `${m} — si dice «manufatto»`).not.toMatch(/\bpezzo\b/)
      expect(t, `${m} — nelle etichette si dice «la dichiarazione»`).not.toMatch(/\bcarta\b/)
    }
  })

  it('🛑 e nessun testo dice «dispositivo»: qui parla il BANCO, non la norma (D303)', () => {
    // D303 ammette le DUE parole, ma ognuna nel suo registro: «dispositivo» vive
    // in `classifica.ts`, dove il testo cita la legge. Qui sarebbe la stessa
    // alternanza che il difetto di stamattina ha già mostrato costare.
    for (const m of MOTIVI) {
      const t = `${MOTIVI_UI[m].etichetta} ${MOTIVI_UI[m].sottotitolo}`.toLowerCase()
      expect(t, `${m} — al banco si dice «manufatto»`).not.toMatch(/\bdispositiv/)
    }
  })

  it('gli altri quattro vocabolari dell\'interfaccia corrispondono a quelli del dominio', () => {
    expect(Object.keys(ORIGINE_UI).sort()).toEqual([...ORIGINI_INFORMAZIONE].sort())
    expect(Object.keys(STATO_UI).sort()).toEqual([...STATI_DISPOSITIVO].sort())
    expect(Object.keys(DANNO_UI).sort()).toEqual([...POTENZIALI_DI_DANNO].sort())
    expect(Object.keys(ESITO_UI).sort()).toEqual([...ESITI].sort())
  })
})
