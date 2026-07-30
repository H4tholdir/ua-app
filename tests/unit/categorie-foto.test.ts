import { describe, expect, it } from 'vitest'
import {
  CATEGORIE_FOTO,
  etichettaCategoria,
  isCategoriaFoto,
  ordinaFotoPerCategoria,
  raggruppaPerCategoria,
} from '@/lib/domain/categorie-foto'

const f = (id: string, categoria: string, created_at: string) => ({ id, categoria, created_at })

describe('categorie-foto — l\'elenco chiuso di D72 e l\'ordine di D71', () => {
  it('sei voci, nell\'ordine cronologico di D71 — MAI alfabetico', () => {
    expect(CATEGORIE_FOTO.map((c) => c.valore)).toEqual([
      'impronta', 'pre_lavoro', 'colore', 'post_prova', 'rx', 'altro',
    ])
  })

  it('le etichette sono quelle ratificate da Francesco', () => {
    expect(CATEGORIE_FOTO.map((c) => c.etichetta)).toEqual([
      'Impronta', 'Pre-lavoro', 'Guida colore', 'Post-prova', 'Radiografia', 'Altro',
    ])
  })

  it('etichettaCategoria ripiega sul valore grezzo se arriva un valore ignoto', () => {
    expect(etichettaCategoria('rx')).toBe('Radiografia')
    expect(etichettaCategoria('sconosciuta')).toBe('sconosciuta')
  })

  // 🛑 IL CASO CHE DEVE FALLIRE se qualcuno "semplifica" in ORDER BY alfabetico:
  // alfabeticamente `altro` verrebbe PRIMA di `impronta`.
  it('«altro» sta in FONDO, mai davanti — il caso che uccide l\'ordinamento alfabetico', () => {
    const dato = [f('a', 'altro', '2026-01-01'), f('b', 'impronta', '2026-06-01')]
    expect(ordinaFotoPerCategoria(dato).map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('dentro il gruppo ordina per created_at crescente, con id come spareggio', () => {
    const dato = [
      f('tardi', 'impronta', '2026-06-02T10:00:00Z'),
      f('presto', 'impronta', '2026-06-01T10:00:00Z'),
      f('b', 'impronta', '2026-06-01T10:00:00Z'),
    ]
    expect(ordinaFotoPerCategoria(dato).map((x) => x.id)).toEqual(['b', 'presto', 'tardi'])
  })

  it('una categoria ignota non sparisce: finisce in fondo, dopo «altro»', () => {
    const dato = [f('x', 'categoria_del_futuro', '2026-01-01'), f('a', 'altro', '2026-01-01')]
    expect(ordinaFotoPerCategoria(dato).map((x) => x.id)).toEqual(['a', 'x'])
  })

  it('raggruppa saltando i gruppi vuoti, nell\'ordine di D71', () => {
    const dato = [f('r', 'rx', '2026-01-01'), f('i', 'impronta', '2026-01-01')]
    const gruppi = raggruppaPerCategoria(dato)
    expect(gruppi.map((g) => g.categoria)).toEqual(['impronta', 'rx'])
    expect(gruppi.map((g) => g.etichetta)).toEqual(['Impronta', 'Radiografia'])
    expect(gruppi[0].foto.map((x) => x.id)).toEqual(['i'])
  })

  it('elenco vuoto: nessun gruppo, nessuna eccezione', () => {
    expect(raggruppaPerCategoria([])).toEqual([])
    expect(ordinaFotoPerCategoria([])).toEqual([])
  })

  // ── AGGIUNTA DICHIARATA DI T2 (non era nel Passo 1 del piano) ─────────────
  // 🛑 Il modulo del Passo 4 ESPORTA `isCategoriaFoto` e il piano non le dà
  //    nessuna prova, mentre T3 (`piano:643`) ci costruisce sopra il 422 del
  //    POST e del PATCH. È la stessa forma di P10: una guardia che nessuno
  //    accende. Qui la prova c'è, prima che T3 la consumi.
  it('isCategoriaFoto riconosce tutte e sei le categorie, e nessun\'altra stringa', () => {
    for (const c of CATEGORIE_FOTO) expect(isCategoriaFoto(c.valore), c.valore).toBe(true)
    expect(isCategoriaFoto('pippo')).toBe(false)
    expect(isCategoriaFoto('')).toBe(false)
    expect(isCategoriaFoto('RX')).toBe(false)          // maiuscole: il CHECK distingue
    expect(isCategoriaFoto('foto')).toBe(false)        // il vecchio valore di `tipo`, morto con T1
  })

  it('isCategoriaFoto rifiuta ciò che stringa non è: il POST riceve FormData, il PATCH JSON', () => {
    // Il corpo di una richiesta porta quello che vuole: qui si prova che la
    // guardia non si fa ingannare da una forma diversa da `string`.
    expect(isCategoriaFoto(null)).toBe(false)
    expect(isCategoriaFoto(undefined)).toBe(false)
    expect(isCategoriaFoto(42)).toBe(false)
    expect(isCategoriaFoto(['rx'])).toBe(false)
    expect(isCategoriaFoto({ valore: 'rx' })).toBe(false)
    expect(isCategoriaFoto(new String('rx'))).toBe(false)  // oggetto, non primitiva
  })
})
