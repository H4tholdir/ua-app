import { describe, it, expect } from 'vitest'
import { caricaTinteScheda } from '@/lib/lavori/tinta-scheda'

/**
 * Finto client col suo OSSERVATORE, e ogni occhio dell'osservatore è asserito
 * da almeno una prova.
 *
 * 🔑 È la lezione P4-④ di quest'ondata, applicata prima di pagarla di nuovo:
 *    nel T4 il finto registrava il nome della tabella e NESSUNA prova lo
 *    leggeva — se la funzione avesse interrogato `colori_dentali` invece di
 *    `tinte_manufatto`, tutte e undici le prove sarebbero rimaste verdi.
 *    Qui la tabella, la famiglia chiesta e la colonna d'ordine hanno ciascuna
 *    la sua asserzione.
 */
function svcFinto(righe: Array<Record<string, unknown>>, errore = false) {
  const spia = {
    consultato: 0,
    tabella: null as string | null,
    famigliaChiesta: null as string | null,
    ordinatoPer: null as string | null,
  }
  const svc = {
    from: (tabella: string) => {
      spia.consultato++
      spia.tabella = tabella
      return {
        select: () => ({
          eq: (_colonna: string, valore: string) => {
            spia.famigliaChiesta = valore
            return {
              order: (colonna: string) => {
                spia.ordinatoPer = colonna
                return Promise.resolve(
                  errore ? { data: null, error: { message: 'ko' } } : { data: righe, error: null }
                )
              },
            }
          },
        }),
      }
    },
  }
  return { svc: svc as never, spia }
}

const CATALOGO_SPORT = [
  { famiglia: 'sport', codice: 'trasparente', nome: 'Trasparente', ordine: 1, hex: null },
  { famiglia: 'sport', codice: 'rosso', nome: 'Rosso', ordine: 7, hex: '#D90012' },
]

describe('caricaTinteScheda — il catalogo letto DAL SERVER, per la riga e per la tavolozza', () => {
  it('un tipo di lavoro senza famiglia di tinte NON interroga il catalogo', async () => {
    const { svc, spia } = svcFinto(CATALOGO_SPORT)
    const esito = await caricaTinteScheda(svc, {
      tipo_dispositivo: 'protesi_fissa',
      tinta_famiglia: null,
      tinta_codice: null,
    })
    // Il meccanismo, non solo l'esito: una corona non deve costare una query.
    expect(spia.consultato).toBe(0)
    expect(esito).toEqual({ scelta: null, disponibili: [] })
  })

  it('interroga la tabella giusta, la famiglia giusta, e nell ordine del catalogo', async () => {
    const { svc, spia } = svcFinto(CATALOGO_SPORT)
    await caricaTinteScheda(svc, {
      tipo_dispositivo: 'bite_splint',
      tinta_famiglia: null,
      tinta_codice: null,
    })
    expect(spia.tabella).toBe('tinte_manufatto')
    expect(spia.famigliaChiesta).toBe('sport')
    // Senza questa, il giorno in cui l'ordinamento sparisce la tavolozza
    // cambia disposizione e nessuna prova se ne accorge.
    expect(spia.ordinatoPer).toBe('ordine')
  })

  it('un lavoro senza tinta ha la tavolozza ma nessuna scelta', async () => {
    const { svc } = svcFinto(CATALOGO_SPORT)
    const esito = await caricaTinteScheda(svc, {
      tipo_dispositivo: 'bite_splint',
      tinta_famiglia: null,
      tinta_codice: null,
    })
    expect(esito.scelta).toBeNull()
    expect(esito.disponibili).toHaveLength(2)
  })

  it('un lavoro con tinta porta NOME e HEX presi dal catalogo, mai inventati', async () => {
    const { svc } = svcFinto(CATALOGO_SPORT)
    const esito = await caricaTinteScheda(svc, {
      tipo_dispositivo: 'bite_splint',
      tinta_famiglia: 'sport',
      tinta_codice: 'rosso',
    })
    expect(esito.scelta).toEqual({
      famiglia: 'sport',
      codice: 'rosso',
      nome: 'Rosso',
      hex: '#D90012',
    })
  })

  it('una tinta senza pallino resta senza pallino (D114): hex nullo, non una stringa vuota', async () => {
    const { svc } = svcFinto(CATALOGO_SPORT)
    const esito = await caricaTinteScheda(svc, {
      tipo_dispositivo: 'bite_splint',
      tinta_famiglia: 'sport',
      tinta_codice: 'trasparente',
    })
    expect(esito.scelta?.nome).toBe('Trasparente')
    expect(esito.scelta?.hex).toBeNull()
  })

  it('un codice che nel catalogo NON esiste non diventa una tinta con un nome inventato', async () => {
    const { svc } = svcFinto(CATALOGO_SPORT)
    const esito = await caricaTinteScheda(svc, {
      tipo_dispositivo: 'bite_splint',
      tinta_famiglia: 'sport',
      tinta_codice: 'fucsia_immaginario',
    })
    expect(esito.scelta).toBeNull()
    // La tavolozza però resta usabile: il lavoro si corregge, non si blocca.
    expect(esito.disponibili).toHaveLength(2)
  })

  it('una famiglia che non corrisponde al tipo del lavoro non si mostra come scelta', async () => {
    // Dato incoerente (il vincolo del database lo impedisce, ma la lettura è
    // fail-closed): la famiglia scritta sul lavoro non è quella della macro.
    const { svc } = svcFinto(CATALOGO_SPORT)
    const esito = await caricaTinteScheda(svc, {
      tipo_dispositivo: 'bite_splint',
      tinta_famiglia: 'resina_ortodontica',
      tinta_codice: 'rosso',
    })
    expect(esito.scelta).toBeNull()
  })

  it('se il catalogo non risponde, la scheda NON muore: nessuna tinta, nessuna tavolozza', async () => {
    const { svc } = svcFinto(CATALOGO_SPORT, true)
    const esito = await caricaTinteScheda(svc, {
      tipo_dispositivo: 'bite_splint',
      tinta_famiglia: 'sport',
      tinta_codice: 'rosso',
    })
    expect(esito).toEqual({ scelta: null, disponibili: [] })
  })
})
