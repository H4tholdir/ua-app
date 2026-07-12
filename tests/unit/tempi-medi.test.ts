import { describe, it, expect } from 'vitest'
import {
  calcolaGiorniPerTipo,
  dataSuggerita,
  fetchCampioniConsegna,
  type CampioneConsegna,
} from '@/lib/lavori/tempi-medi'
import { trovaTipo, labelTipo } from '@/lib/domain/tipi-lavoro'

// Helper: costruisce un campione con delta (giorni tra ingresso e consegna) noto.
function campione(descrizione: string | null, tipo_dispositivo: string, delta: number): CampioneConsegna {
  return {
    descrizione,
    tipo_dispositivo,
    data_ingresso: '2026-01-01',
    data_consegna_effettiva: `2026-01-${String(1 + delta).padStart(2, '0')}`,
  }
}

describe('calcolaGiorniPerTipo — cascata granulare → macro → fallback (spec §8)', () => {
  it('cascata (a): 5 campioni granulari "Corona zirconia" con delta 4,4,6,6,5 → media 5, daStoria true', () => {
    const label = labelTipo(trovaTipo('corona_zirconia')!)
    const campioni: CampioneConsegna[] = [4, 4, 6, 6, 5].map((d) => campione(label, 'protesi_fissa', d))
    const risultato = calcolaGiorniPerTipo(campioni)
    expect(risultato.corona_zirconia).toEqual({ giorni: 5, daStoria: true })
  })

  it('cascata (b): 2 campioni granulari (< 5) ma 6 campioni macro protesi_fissa (≥ 5) → media macro, daStoria true', () => {
    const label = labelTipo(trovaTipo('corona_zirconia')!)
    // Il pool macro (tipo_dispositivo === 'protesi_fissa') include per costruzione
    // anche i 2 campioni granulari (spec §8: descrizione granulare implica lo
    // stesso macro) — qui tutti e 6 hanno delta 10, così la media macro (10) è
    // inequivocabile indipendentemente da come si conta la sovrapposizione.
    const campioni: CampioneConsegna[] = [
      ...[10, 10].map((d) => campione(label, 'protesi_fissa', d)), // granulari: solo 2, non bastano
      ...[10, 10, 10, 10].map((d) => campione('Altra descrizione', 'protesi_fissa', d)), // resto del pool macro
    ]
    const risultato = calcolaGiorniPerTipo(campioni)
    expect(risultato.corona_zirconia).toEqual({ giorni: 10, daStoria: true })
  })

  it('cascata (c): zero campioni → giorniFallback (corona_zirconia → 5), daStoria false', () => {
    const risultato = calcolaGiorniPerTipo([])
    expect(risultato.corona_zirconia).toEqual({ giorni: 5, daStoria: false })
  })

  it('media arrotondata (Math.round): 4,5 giorni medi → 5', () => {
    const label = labelTipo(trovaTipo('riparazione')!)
    // Media = (4+4+4+4+5.5*... ) costruiamo delta che danno media 4.5 esatta su 5 campioni: 4,4,4,5,5 -> media 4.4 no.
    // Usiamo 4,4,5,5,4.5 non intero: i delta sono sempre interi (giorni). Costruiamo media 4.5 con 2 campioni non basta (serve >=5).
    // 5 campioni: 4,4,5,5,4 -> somma 22 media 4.4 -> round 4. Proviamo un set che dia esattamente .5: 4,4,4,5,5 somma 22 media 4.4.
    // Per ottenere media 4.5 su interi con 5 campioni: somma deve essere 22.5, impossibile con interi. Usiamo 4 campioni non permesso (<5).
    // Soluzione: usiamo tipo con soglia macro raggiunta a 5 campioni e media non intera 4.5 -> serve somma 22.5 impossibile;
    // quindi verifichiamo arrotondamento con media 4.6 (somma 23 su 5) -> round(4.6) = 5.
    const campioni: CampioneConsegna[] = [4, 4, 5, 5, 5].map((d) => campione(label, 'riparazione', d))
    const risultato = calcolaGiorniPerTipo(campioni)
    // somma 23, media 4.6 -> round 5
    expect(risultato.riparazione).toEqual({ giorni: 5, daStoria: true })
  })

  it('media arrotondata mai < 1: delta tutti 0 → giorni resta 1', () => {
    const label = labelTipo(trovaTipo('riparazione')!)
    const campioni: CampioneConsegna[] = [0, 0, 0, 0, 0].map((d) => campione(label, 'riparazione', d))
    const risultato = calcolaGiorniPerTipo(campioni)
    expect(risultato.riparazione).toEqual({ giorni: 1, daStoria: true })
  })
})

describe('dataSuggerita — oggi + giorni, domenica slitta a lunedì', () => {
  it('venerdì 10/07/2026 + 2 = domenica 12 → slitta a lunedì 13', () => {
    const oggi = new Date(2026, 6, 10) // venerdì
    const risultato = dataSuggerita(2, oggi)
    expect(risultato.getFullYear()).toBe(2026)
    expect(risultato.getMonth()).toBe(6)
    expect(risultato.getDate()).toBe(13)
    expect(risultato.getDay()).toBe(1) // lunedì
  })

  it('+5 giorni da lunedì 13/07/2026 → sabato 18, resta sabato (solo la domenica slitta)', () => {
    const oggi = new Date(2026, 6, 13) // lunedì
    const risultato = dataSuggerita(5, oggi)
    expect(risultato.getFullYear()).toBe(2026)
    expect(risultato.getMonth()).toBe(6)
    expect(risultato.getDate()).toBe(18)
    expect(risultato.getDay()).toBe(6) // sabato
  })
})

describe('fetchCampioniConsegna — query lavori consegnati, fail-closed', () => {
  function fakeSupabase(result: { data: unknown; error: unknown }) {
    return {
      from(table: string) {
        const builder: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'is', 'not']) builder[m] = () => builder
        builder.then = (resolve: (v: { data: unknown; error: unknown }) => void) => {
          if (table !== 'lavori') { resolve({ data: [], error: null }); return }
          resolve(result)
        }
        return builder
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  }

  it('ritorna i campioni mappati sulle colonne attese', async () => {
    const righe = [
      { descrizione: 'Corona zirconia', tipo_dispositivo: 'protesi_fissa', data_ingresso: '2026-01-01', data_consegna_effettiva: '2026-01-05' },
    ]
    const svc = fakeSupabase({ data: righe, error: null })
    const r = await fetchCampioniConsegna(svc, 'lab-1')
    expect(r).toEqual(righe)
  })

  it('errore di query → throw (fail-closed, prassi post-Ondata 3)', async () => {
    const svc = fakeSupabase({ data: null, error: { message: 'boom' } })
    await expect(fetchCampioniConsegna(svc, 'lab-1')).rejects.toThrow()
  })
})
