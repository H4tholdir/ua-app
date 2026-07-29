import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { trovaOccupanteCodice } from '@/lib/domain/codice-paziente-unicita'

// ═══════════════════════════════════════════════════════════════════════════
// Task 7 (ondata b) — la lettura di unicità del codice paziente.
//
// La fake `.from('pazienti')` sotto NON è un mock statico (`createChain`):
// APPLICA DAVVERO i filtri, e LANCIA se la chiamata sotto test usa un filtro
// fuori dal predicato dell'indice (`cliente_id`, `archiviato`, `.limit()` sui
// pazienti, `deleted_at` su `pazienti`). Non è quindi un doppione della
// funzione — è una simulazione indipendente, scritta dal testo del predicato
// (v. `codice-paziente-unicita.ts`, intestazione), non dal codice che la
// implementa: se l'implementazione aggiungesse un filtro non previsto, la
// fake lo scopre lanciando, non restituendo un risultato silenziosamente
// diverso. Gli attesi sono scritti a mano — nessuna asserzione confronta
// l'output con una chiamata alla funzione stessa.
// ═══════════════════════════════════════════════════════════════════════════

type RigaLavoroFixture = { data_ingresso: string; deleted_at: string | null }
type RigaPazienteFixture = {
  id: string
  laboratorio_id: string
  codice_paziente: string | null
  nome_cognome: string | null
  lavori?: RigaLavoroFixture[]
}

function fakeSvc(rows: RigaPazienteFixture[]): { svc: SupabaseClient; fromCalls: string[] } {
  const fromCalls: string[] = []
  const svc = {
    from: (tabella: string) => {
      fromCalls.push(tabella)
      if (tabella !== 'pazienti') throw new Error(`tabella inattesa nella fake: ${tabella}`)

      let filtroLab: string | undefined
      let filtroIlike: string | undefined
      let ordinatoOk = false
      let limitatoOk = false
      let deletedAtLavoriOk = false

      const chain = {
        select: (colonne: string) => {
          // Se la proiezione perdesse l'innesto `lavori(data_ingresso)` (una
          // regressione plausibile quanto silenziosa: `order`/`limit`/`is`
          // sui lavori continuerebbero a essere CHIAMATI senza errore, ma
          // senza l'innesto nel `select` PostgREST non li applicherebbe a
          // nulla), la fake lo scopre qui invece di restituire comunque un
          // risultato plausibile.
          if (!colonne.includes('lavori(data_ingresso)')) {
            throw new Error(`.select('${colonne}') — manca l'innesto lavori(data_ingresso)`)
          }
          return chain
        },
        eq: (col: string, v: string) => {
          if (col !== 'laboratorio_id') {
            throw new Error(
              `.eq('${col}', …) non è nel predicato dell'indice (D34/D15) — SOLO laboratorio_id è ammesso`
            )
          }
          filtroLab = v
          return chain
        },
        ilike: (col: string, v: string) => {
          if (col !== 'codice_paziente') throw new Error(`.ilike su colonna inattesa: ${col}`)
          filtroIlike = v
          return chain
        },
        order: (col: string, opts: { referencedTable?: string; ascending?: boolean }) => {
          if (col === 'data_ingresso' && opts?.referencedTable === 'lavori' && opts?.ascending === false) {
            ordinatoOk = true
          } else {
            throw new Error(`.order() inatteso: ${col} ${JSON.stringify(opts)}`)
          }
          return chain
        },
        limit: (n: number, opts?: { referencedTable?: string }) => {
          // 🛑 D34: nessun cap sui PAZIENTI. Solo il limite "per padre" sui
          // lavori innestati (P6-forma) è ammesso.
          if (n === 1 && opts?.referencedTable === 'lavori') {
            limitatoOk = true
          } else {
            throw new Error(`.limit(${n}, ${JSON.stringify(opts)}) — un cap sui pazienti non è consentito`)
          }
          return chain
        },
        is: (col: string, v: unknown) => {
          if (col === 'lavori.deleted_at' && v === null) {
            deletedAtLavoriOk = true
          } else {
            throw new Error(`.is('${col}', ${v}) — un filtro di stato su pazienti non è consentito (D34)`)
          }
          return chain
        },
        then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
          // Il pattern atteso è `%chiave%` (largo apposta, v. commento
          // nell'implementazione): qui si simula ILIKE con un `includes`
          // case-insensitive sul valore GREZZO (non trim-ato) della riga —
          // così una riga con spazi residui ai bordi (fixture sotto) NON
          // combacia col pattern esatto, ma combacia con quello largo,
          // dimostrando perché l'esatto sarebbe stato più cieco.
          if (!filtroIlike || !filtroIlike.startsWith('%') || !filtroIlike.endsWith('%')) {
            throw new Error(`pattern ilike inatteso, non è largo ('%…%'): ${filtroIlike}`)
          }
          const chiave = filtroIlike.slice(1, -1).toLowerCase()
          const candidatiIlike = rows.filter(
            (r) => r.codice_paziente != null && r.codice_paziente.toLowerCase().includes(chiave)
          )
          // Il confronto ESATTO (chiave normalizzata) è quello che decide
          // davvero — stesso btrim+lower che fa `chiaveNormalizzata` nel
          // modulo sotto test, riscritto qui in modo indipendente (non
          // importato) proprio per non ricadere nel confronto-con-se-stessa.
          const trovati = candidatiIlike.filter(
            (r) =>
              r.laboratorio_id === filtroLab &&
              r.codice_paziente != null &&
              r.codice_paziente.trim().toLowerCase() === chiave
          )
          const data = trovati.map((r) => {
            let lav = r.lavori ?? []
            // Applicati SOLO se la chiamata sotto test li ha davvero
            // invocati coi parametri giusti — altrimenti la fixture con più
            // lavori (sotto) smaschera l'omissione invece di nasconderla.
            if (deletedAtLavoriOk) lav = lav.filter((l) => l.deleted_at === null)
            if (ordinatoOk) lav = [...lav].sort((a, b) => b.data_ingresso.localeCompare(a.data_ingresso))
            if (limitatoOk) lav = lav.slice(0, 1)
            return { id: r.id, codice_paziente: r.codice_paziente, nome_cognome: r.nome_cognome, lavori: lav }
          })
          resolve({ data, error: null })
        },
      }
      return chain
    },
  }
  return { svc: svc as unknown as SupabaseClient, fromCalls }
}

const LAB_A = 'lab-a'
const LAB_B = 'lab-b'

describe('trovaOccupanteCodice — forme d\'input che NON toccano il database (R-P4)', () => {
  it('codice null → libero, e la fake non viene mai interrogata', async () => {
    const { svc, fromCalls } = fakeSvc([])
    const esito = await trovaOccupanteCodice(svc, LAB_A, null)
    expect(esito).toEqual({ occupato: false })
    expect(fromCalls).toEqual([])
  })

  it('stringa vuota → libero, nessuna query (il predicato esclude btrim(codice)=\'\')', async () => {
    const { svc, fromCalls } = fakeSvc([])
    const esito = await trovaOccupanteCodice(svc, LAB_A, '')
    expect(esito).toEqual({ occupato: false })
    expect(fromCalls).toEqual([])
  })

  it('soli spazi (\'   \') → libero, nessuna query', async () => {
    const { svc, fromCalls } = fakeSvc([])
    const esito = await trovaOccupanteCodice(svc, LAB_A, '   ')
    expect(esito).toEqual({ occupato: false })
    expect(fromCalls).toEqual([])
  })

  it('non-stringa (numero, array, oggetto, boolean) → libero, nessuna query', async () => {
    for (const valore of [42, ['PZ-0042'], { codice: 'PZ-0042' }, true, undefined]) {
      const { svc, fromCalls } = fakeSvc([])
      const esito = await trovaOccupanteCodice(svc, LAB_A, valore)
      expect(esito).toEqual({ occupato: false })
      expect(fromCalls).toEqual([])
    }
  })

  it('laboratorio inesistente → libero (nessuna riga ha quel laboratorio_id)', async () => {
    const { svc } = fakeSvc([
      { id: 'pz-1', laboratorio_id: LAB_A, codice_paziente: 'PZ-0042', nome_cognome: 'PZ-0042' },
    ])
    const esito = await trovaOccupanteCodice(svc, 'lab-che-non-esiste', 'PZ-0042')
    expect(esito).toEqual({ occupato: false })
  })
})

describe('trovaOccupanteCodice — la portata: nessun cliente_id, nessun cap, nessun filtro di stato', () => {
  it('trova un paziente ARCHIVIATO (D34: il codice archiviato resta impegnato)', async () => {
    // La fake lancerebbe se l'implementazione filtrasse su `archiviato` o
    // `deleted_at` — questo caso passa SOLO perché nessuno dei due esiste
    // nella query. Il campo `archiviato` non è nemmeno nella fixture: è
    // proprio il punto, la lettura non lo guarda.
    const { svc } = fakeSvc([
      { id: 'pz-arch', laboratorio_id: LAB_A, codice_paziente: 'PZ-0042', nome_cognome: 'Bagheria Maria' },
    ])
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0042')
    expect(esito).toEqual({
      occupato: true,
      paziente: { id: 'pz-arch', nomeVisibile: 'Bagheria Maria', dataUltimoLavoro: null },
    })
  })

  it('trova un paziente di un ALTRO dentista (nessun filtro cliente_id: la fake lancerebbe se ci fosse)', async () => {
    const { svc } = fakeSvc([
      { id: 'pz-altro-dentista', laboratorio_id: LAB_A, codice_paziente: 'PZ-0919', nome_cognome: 'Rossi Anna' },
    ])
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0919')
    expect(esito.occupato).toBe(true)
    expect((esito as { paziente: { id: string } }).paziente.id).toBe('pz-altro-dentista')
  })

  it('il codice scritto in un altro modo (minuscolo/spazi) è riconosciuto occupato — chiave normalizzata come l\'indice', async () => {
    const { svc } = fakeSvc([
      { id: 'pz-1', laboratorio_id: LAB_A, codice_paziente: 'PZ-0042', nome_cognome: 'PZ-0042' },
    ])
    for (const variante of ['pz-0042', ' PZ-0042', 'PZ-0042 ', '  pz-0042  ']) {
      const esito = await trovaOccupanteCodice(svc, LAB_A, variante)
      expect(esito.occupato).toBe(true)
      expect((esito as { paziente: { id: string } }).paziente.id).toBe('pz-1')
    }
  })

  it('CONTROLLO POSITIVO — stesso codice, ma nel laboratorio B: libero (nella stessa fixture)', async () => {
    const { svc } = fakeSvc([
      { id: 'pz-lab-a', laboratorio_id: LAB_A, codice_paziente: 'PZ-0042', nome_cognome: 'PZ-0042' },
    ])
    const inLabA = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0042')
    const inLabB = await trovaOccupanteCodice(svc, LAB_B, 'PZ-0042')
    expect(inLabA.occupato).toBe(true)
    expect(inLabB).toEqual({ occupato: false })
  })

  it('CONTROLLO POSITIVO — un codice davvero libero (nessuna riga lo porta, in nessun laboratorio): libero', async () => {
    const { svc } = fakeSvc([
      { id: 'pz-1', laboratorio_id: LAB_A, codice_paziente: 'PZ-0042', nome_cognome: 'PZ-0042' },
    ])
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-9999')
    expect(esito).toEqual({ occupato: false })
  })

  it('il valore STORATO ha spazi residui ai bordi: trovato lo stesso (il pattern largo lo recupera, uno esatto lo perderebbe)', async () => {
    // Scenario di riserva (misurato zero oggi: v. rapporto) — ma se un giorno
    // esistesse una riga così, un pattern ilike ESATTO non l'avrebbe mai
    // vista (differisce carattere per carattere dal letterale). Col pattern
    // largo, il `.includes()` la trova comunque, e il confronto esatto sotto
    // (via `chiaveNormalizzata`, che fa il trim) la conferma.
    const { svc } = fakeSvc([
      { id: 'pz-spazi', laboratorio_id: LAB_A, codice_paziente: ' PZ-0042 ', nome_cognome: 'PZ-0042' },
    ])
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0042')
    expect(esito.occupato).toBe(true)
    expect((esito as { paziente: { id: string } }).paziente.id).toBe('pz-spazi')
  })
})

describe('trovaOccupanteCodice — i due dati di D36: nome visibile + data ultimo lavoro', () => {
  it('caso dei 911/916 — nome_cognome uguale al codice: nomeVisibile ricade sul CODICE (mai stringa vuota)', async () => {
    const { svc } = fakeSvc([
      // `derivaAlias` (parco-shared.ts) riconosce nome_cognome === codice
      // (case-insensitive) come "codice travestito" e lo scarta: qui il
      // fallback della funzione sotto test deve intervenire.
      { id: 'pz-911', laboratorio_id: LAB_A, codice_paziente: 'PZ-0918', nome_cognome: 'pz-0918' },
    ])
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0918')
    expect(esito).toEqual({
      occupato: true,
      paziente: { id: 'pz-911', nomeVisibile: 'PZ-0918', dataUltimoLavoro: null },
    })
  })

  it('nome_cognome un vero alias: nomeVisibile è l\'alias, non il codice', async () => {
    const { svc } = fakeSvc([
      { id: 'pz-alias', laboratorio_id: LAB_A, codice_paziente: 'PZ-0042', nome_cognome: 'BAGHERIA MARIA' },
    ])
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0042')
    expect(esito).toEqual({
      occupato: true,
      paziente: { id: 'pz-alias', nomeVisibile: 'BAGHERIA MARIA', dataUltimoLavoro: null },
    })
  })

  it('paziente SENZA lavori: dataUltimoLavoro è null, e il paziente NON sparisce dal risultato', async () => {
    const { svc } = fakeSvc([
      { id: 'pz-zero-lavori', laboratorio_id: LAB_A, codice_paziente: 'PZ-0042', nome_cognome: 'PZ-0042', lavori: [] },
    ])
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0042')
    expect(esito.occupato).toBe(true)
    expect((esito as { paziente: { dataUltimoLavoro: string | null } }).paziente.dataUltimoLavoro).toBeNull()
  })

  it('più lavori: vince il data_ingresso più recente, non l\'ordine di inserimento in fixture', async () => {
    const { svc } = fakeSvc([
      {
        id: 'pz-multi',
        laboratorio_id: LAB_A,
        codice_paziente: 'PZ-0042',
        nome_cognome: 'PZ-0042',
        lavori: [
          { data_ingresso: '2026-03-01T09:00:00Z', deleted_at: null },
          { data_ingresso: '2026-06-12T09:00:00Z', deleted_at: null },
          { data_ingresso: '2026-01-01T09:00:00Z', deleted_at: null },
        ],
      },
    ])
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0042')
    expect((esito as { paziente: { dataUltimoLavoro: string | null } }).paziente.dataUltimoLavoro).toBe(
      '2026-06-12T09:00:00Z'
    )
  })

  it('un lavoro cancellato (deleted_at valorizzato) NON conta anche se è il più recente', async () => {
    const { svc } = fakeSvc([
      {
        id: 'pz-con-cancellato',
        laboratorio_id: LAB_A,
        codice_paziente: 'PZ-0042',
        nome_cognome: 'PZ-0042',
        lavori: [
          { data_ingresso: '2026-01-01T09:00:00Z', deleted_at: null },
          { data_ingresso: '2026-07-20T09:00:00Z', deleted_at: '2026-07-21T09:00:00Z' },
        ],
      },
    ])
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0042')
    expect((esito as { paziente: { dataUltimoLavoro: string | null } }).paziente.dataUltimoLavoro).toBe(
      '2026-01-01T09:00:00Z'
    )
  })
})

describe('trovaOccupanteCodice — degrado su errore di lettura (G9: mai propagare il testo grezzo)', () => {
  it('un errore Postgres degrada a "libero", non lancia e non espone error.message', async () => {
    const svc = {
      from: () => ({
        select: () => ({
          eq: () => ({
            ilike: () => ({
              order: () => ({
                limit: () => ({
                  is: () => ({
                    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
                      resolve({ data: null, error: { message: 'relation "pazienti" — dettaglio interno' } }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient
    const esito = await trovaOccupanteCodice(svc, LAB_A, 'PZ-0042')
    expect(esito).toEqual({ occupato: false })
  })
})
