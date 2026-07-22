// Logica pura della parete delle cassette (Task 3, spec §5) — client-safe,
// NESSUN `import 'server-only'`: la query vive in `parco.ts`.
export type CassettaParete = {
  id: string
  nome: string
  colore: string
  posizione: number
  lavoro: {
    id: string
    numero: string
    dentista: string
    paziente: string
    tipoDispositivo: string | null
    descrizione: string | null
  } | null
}

export type RawCassetta = { id: string; nome: string; colore: string; posizione: number; created_at: string }
export type RawViva = { cassetta_id: string; lavoro_id: string }
export type RawLavoro = {
  id: string
  numero_lavoro: string
  stato: string
  deleted_at: string | null
  descrizione: string | null
  tipo_dispositivo: string | null
  clienti: { studio_nome: string | null; nome: string | null; cognome: string | null } | null
  pazienti: { codice_paziente: string | null } | null
}

/** Motivo da passare a `cassetta_libera_atomica` per la riga da riparare
 *  (correzione 21/07 "CORREZIONI" #2 / risoluzione R-B): SOLO un lavoro
 *  davvero `consegnato` chiude con `'consegna'` — è l'UNICO motivo che
 *  `cassetta_riassegna_post_annullo` considera eleggibile alla riassegnazione
 *  post-annullo-consegna (`WHERE liberato_per = 'consegna'`). Ogni altro caso
 *  (annullato, lavoro assente dalla query, soft-deleted) chiude con
 *  `'annullo_lavoro'`: mai il default ottimistico, sempre quello che esclude
 *  la riassegnazione — è la stessa guardia già incisa dentro la RPC (finding
 *  #6 della migration). */
export type Riparazione = { lavoroId: string; motivo: 'consegna' | 'annullo_lavoro' }

const CHIUSI = new Set(['consegnato', 'annullato'])

export function deriveParete(
  cassette: RawCassetta[],
  vive: RawViva[],
  lavori: RawLavoro[],
): { parete: CassettaParete[]; daRiparare: Riparazione[] } {
  const perLavoro = new Map(lavori.map((l) => [l.id, l]))
  const perCassetta = new Map(vive.map((v) => [v.cassetta_id, v.lavoro_id]))
  const daRiparare: Riparazione[] = []
  const parete = [...cassette]
    .sort((a, b) => a.posizione - b.posizione || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .map((c) => {
      const lavoroId = perCassetta.get(c.id)
      const l = lavoroId ? perLavoro.get(lavoroId) : undefined
      if (lavoroId && (!l || CHIUSI.has(l.stato) || l.deleted_at)) {
        daRiparare.push({ lavoroId, motivo: l?.stato === 'consegnato' ? 'consegna' : 'annullo_lavoro' })
        return { id: c.id, nome: c.nome, colore: c.colore, posizione: c.posizione, lavoro: null }
      }
      return {
        id: c.id,
        nome: c.nome,
        colore: c.colore,
        posizione: c.posizione,
        lavoro: l
          ? {
              id: l.id,
              numero: l.numero_lavoro,
              dentista: l.clienti?.studio_nome ?? (`${l.clienti?.nome ?? ''} ${l.clienti?.cognome ?? ''}`.trim() || '—'),
              paziente: l.pazienti?.codice_paziente ?? '—',
              tipoDispositivo: l.tipo_dispositivo,
              descrizione: l.descrizione,
            }
          : null,
      }
    })
  return { parete, daRiparare }
}
