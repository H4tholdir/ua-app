import { describe, expect, it } from 'vitest'
import {
  CATEGORIE_FOTO,
  etichettaCategoria,
  isCategoriaFoto,
  ordinaFotoPerCategoria,
  raggruppaPerCategoria,
} from '@/lib/domain/categorie-foto'

const f = (id: string, categoria: string, created_at: string) => ({ id, categoria, created_at })

describe('categorie-foto — l\'elenco chiuso di D72 e l\'ordine di D71+D92', () => {
  it('SETTE voci, nell\'ordine di D71 corretto da D92 — MAI alfabetico', () => {
    expect(CATEGORIE_FOTO.map((c) => c.valore)).toEqual([
      'impronta', 'pre_lavoro', 'colore', 'post_prova', 'prescrizione', 'rx', 'altro',
    ])
  })

  it('le etichette sono quelle ratificate da Francesco', () => {
    expect(CATEGORIE_FOTO.map((c) => c.etichetta)).toEqual([
      'Impronta', 'Pre-lavoro', 'Guida colore', 'Post-prova', 'Prescrizione', 'Radiografia', 'Altro',
    ])
  })

  // ── D92, e si prova col COMPORTAMENTO, non rileggendo la lista ──────────
  // 🛑 Le due prove qui sotto valgono più di un `toEqual` sull'elenco: quello
  //    si aggiorna copiando la lista nuova senza accorgersi di cosa cambia.
  //    Queste due si accendono se qualcuno rimette la prescrizione in testa —
  //    che è ESATTAMENTE ciò che il brief proponeva e che Francesco ha
  //    rettificato.
  it('D92 — la prescrizione ordina PRIMA della radiografia', () => {
    const dato = [f('r', 'rx', '2026-01-01'), f('p', 'prescrizione', '2026-06-01')]
    expect(ordinaFotoPerCategoria(dato).map((x) => x.id)).toEqual(['p', 'r'])
  })

  it('D92 — ma NON prima di tutto: l\'impronta le resta davanti, ed è la foto grande della carta', () => {
    const dato = [f('p', 'prescrizione', '2026-01-01'), f('i', 'impronta', '2026-06-01')]
    // La prima del primo gruppo è la copertina della scheda: dev'essere il
    // lavoro, non il foglio del dentista.
    expect(ordinaFotoPerCategoria(dato).map((x) => x.id)).toEqual(['i', 'p'])
    expect(raggruppaPerCategoria(dato)[0].categoria).toBe('impronta')
  })

  it('la prescrizione è una categoria a pieno titolo, non più un ripiego su «altro» (D91)', () => {
    expect(isCategoriaFoto('prescrizione')).toBe(true)
    expect(etichettaCategoria('prescrizione')).toBe('Prescrizione')
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
