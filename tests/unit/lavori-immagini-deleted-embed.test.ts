// T8 (ondata b), §3(C)/(D) del brief — gli OTTO siti che leggono l'innesto
// `immagini:lavori_immagini(*)` devono filtrare `deleted_at`, altrimenti una
// foto soft-cancellata torna a schermo con una URL firmata fresca e valida
// (catena verificata nel brief: il file resta nello storage, `getSignedUrl`
// riesce lo stesso). Tutti e otto usano `getServiceClient()`, che scavalca la
// RLS — la RLS su `lavori_immagini` filtra già `deleted_at`
// (`002_fase2_schema.sql:258-259`), ma non viene mai valutata: il filtro va
// scritto A MANO nella query, o non c'è.
//
// Stessa forma di `tests/unit/ddc-lettori-gruppo-b.test.ts` (precedente in
// casa per lo STESSO problema): legge il sorgente con `readFileSync`, conta
// le occorrenze dell'innesto, conta quelle del filtro, asserisce che i due
// numeri siano UGUALI — conteggio-contro-conteggio, non "contiene il filtro".
// 🔑 È la forma che la lezione di T6 impone: mai una lista nera ("non deve
// comparire X"), sempre un'uguaglianza numerica sulla stringa esatta. Un nono
// sito aggiunto domani senza filtro rompe l'uguaglianza; anche un innesto in
// più nello stesso file.
//
// Grafia del filtro — PROVATA da P12 (piano-v2.md §5): `.is('lavori_immagini.deleted_at', null)`,
// col NOME DI TABELLA (non l'alias `immagini.`) — PostgREST accetta entrambe
// le grafie su un innesto semplice, ma questa è quella dettata dal piano e
// riprodotta identica su tutti e otto i siti (uniformità, non necessità).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const FILES = [
  'src/app/(app)/lavori/[id]/page.tsx',
  'src/app/(app)/lavori/[id]/modifica/page.tsx',
  'src/app/api/lavori/[id]/route.ts',
  'src/app/api/fatture/batch/route.ts',
  'src/app/api/fatture/[id]/xml/route.ts',
  'src/lib/pdf/generate-ricevuta-consegna.ts',
  'src/lib/pdf/generate-etichetta.ts',
  'src/lib/pdf/generate-ifu.ts',
]

describe('lettori lavori_immagini — embed filtrato su deleted_at (T8)', () => {
  for (const f of FILES) {
    it(`${f} filtra l'embed immagini:lavori_immagini su deleted_at`, () => {
      const src = readFileSync(f, 'utf-8')
      const embeds = src.match(/immagini:lavori_immagini\(\*\)/g) ?? []
      const filtri = src.match(/\.is\('lavori_immagini\.deleted_at',\s*null\)/g) ?? []
      expect(embeds.length).toBeGreaterThan(0)
      expect(filtri.length).toBe(embeds.length)
    })

    it(`${f} NON usa !inner sull'innesto immagini (cancellerebbe i padri senza foto vive)`, () => {
      const src = readFileSync(f, 'utf-8')
      expect(src).not.toMatch(/immagini:lavori_immagini!inner/)
    })
  }
})
