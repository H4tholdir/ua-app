import { describe, it, expect } from 'vitest'
import { classifica } from '@/lib/qualita/classifica'

const base = {
  natura: 'difetto_fisico', origine: 'odontoiatra',
  statoDispositivo: 'applicato', potenzialeDiDanno: 'nessuno',
} as const

describe('classifica — ordine ministeriale (D268)', () => {
  it('il difetto segnalato dal dentista PRIMA dell applicazione è un RECLAMO, non lavoro interno', () => {
    // È il caso 2 ribaltato dal panel: il Ministero lo chiama il caso TIPICO di reclamo
    const p = classifica({ ...base, statoDispositivo: 'consegnato_non_applicato' })
    expect(p.esito).toBe('reclamo')
  })

  it('il danno POSSIBILE fa incidente ANCHE se il dispositivo non era applicato', () => {
    // Il test dell incidente viene PRIMA: invertirlo nasconderebbe l obbligo dell Art. 88
    const p = classifica({ ...base, statoDispositivo: 'consegnato_non_applicato', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })

  it('il danno ACCERTATO su persona è incidente GRAVE, con il termine dei 15 giorni', () => {
    const p = classifica({ ...base, potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(15 * 24)
  })

  it('«da valutare» NON scivola in reclamo: resta candidato incidente', () => {
    // Art. 87(7): nel dubbio si segnala. Un default prudente non deve essere aggirabile
    const p = classifica({ ...base, potenzialeDiDanno: 'da_valutare' })
    expect(p.esito).toBe('incidente')
  })

  it('il difetto visto DAL LABORATORIO, senza danno, è non conformità interna — non reclamo', () => {
    const p = classifica({ ...base, origine: 'laboratorio_interno', statoDispositivo: 'consegnato_non_applicato' })
    expect(p.esito).toBe('non_conformita_interna')
    expect(p.ramoIso).toBe('8.3.3')   // era già uscito dal controllo
  })

  it('il difetto visto in casa PRIMA che esca è §8.3.2, non §8.3.3', () => {
    const p = classifica({ ...base, origine: 'laboratorio_interno', statoDispositivo: 'mai_uscito_dal_lab' })
    expect(p.ramoIso).toBe('8.3.2')
  })

  it('la richiesta clinica nuova NON è una non conformità', () => {
    const p = classifica({ ...base, natura: 'nuova_esigenza_clinica', origine: 'odontoiatra' })
    expect(p.esito).toBe('nessuna_azione')
  })

  it('«non lo so» sullo stato del dispositivo non blocca e non declassa', () => {
    // Francesco, 06/08: «spesso non lo sappiamo». I tre test non chiedono mai se fosse applicato
    const p = classifica({ ...base, statoDispositivo: 'non_noto', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })

  it('ogni proposta porta il PERCHÉ in chiaro', () => {
    expect(classifica(base).perche.length).toBeGreaterThan(10)
  })

  // ⚖️ D276 — le due prove che chiudono il difetto trovato dal controllo pre-volo.
  // Senza queste, l'uscita anticipata dei tre motivi tornerebbe senza far rumore.
  it('🛑 «richiesta clinica nuova» NON scavalca il test dell\'incidente: col danno accertato è incidente GRAVE', () => {
    const p = classifica({ ...base, natura: 'nuova_esigenza_clinica', potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(15 * 24)
  })

  it('🛑 «registrato per sbaglio» NON scavalca il test dell\'incidente', () => {
    const p = classifica({ ...base, natura: 'errore_registrazione', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })
})
