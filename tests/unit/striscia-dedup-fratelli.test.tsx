// Task 16b — review Important (post-consegna): HomeV3 e HomeDesktop→NavDesk montano come
// FRATELLI nello stesso `dashboard/page.tsx` (righe ~102/112 — il CSS decide chi si vede a
// 1024px, ENTRAMBI sono sempre nel DOM), ricevendo lo STESSO `segnale`. Ogni fratello chiama
// `useRaccontoVisto(segnale.eventoId)` — se l'hook legge/scrive `localStorage` dentro il proprio
// effect (versione precedente), il primo fratello a girare il suo effect SCRIVE l'eventoId
// prima che il secondo lo LEGGA, e il secondo si vede "già visto" un racconto che non ha mai
// mostrato lui stesso. `tests/unit/HomeV3.test.tsx`/`NavDesk.test.tsx` non lo intercettano:
// montano un componente alla volta, in isolamento — esattamente il motivo per cui entrambi
// passavano nonostante il bug. Questo file monta i DUE fratelli nello STESSO render, come fa
// davvero `dashboard/page.tsx`.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeV3 } from '@/components/features/home/HomeV3'
import { NavDesk } from '@/components/ds/NavDesk'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/design-system/v3/sound', async (importOriginal) => {
  const reale = await importOriginal<typeof import('@/design-system/v3/sound')>()
  return { ...reale, initSuoni: () => {} }
})

const lavoro = (numero: string): PileHome['liste']['rossa'][number] => ({
  id: `l${numero}`, numero, dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  cassetta: null,
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: true, consegna: { data: '2026-07-09', ora: '16:00:00' }, rientro: null,
  fasi: [], tecnico: null,
})
const PILE: PileHome = {
  liste: { rossa: [lavoro('147')], ambra: [], viola: [], blu: [] },
  sub: { rossa: 'n.147 alle 16', ambra: 'Niente sul banco', viola: 'Nessuna prova in giro', blu: 'Nessun nuovo arrivo' },
  striscia: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null, arrivoVecchio: null, fermo: null, consegneOggiTotali: 1, prossimaOra: '16:00' },
}
const RACCONTO: SegnaleStriscia = {
  attenzione: false,
  forte: null,
  testo: 'UÀ ha liberato C12',
  azione: { etichetta: 'Guarda ›', href: '/dashboard?stanza=parete' },
  eventoId: 'lib-c1-2026-07-27T09:00:00.000Z',
}

// Riproduce ESATTAMENTE la struttura di dashboard/page.tsx: due fratelli, stesso `segnale`,
// nello stesso albero — non due render() separati (che nasconderebbero il bug, come fanno oggi
// HomeV3.test.tsx/NavDesk.test.tsx presi singolarmente).
function renderFratelli(segnale: SegnaleStriscia) {
  return render(
    <>
      <HomeV3 nome="Francesco" eyebrow="Lunedì 27 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={segnale} parete={[]} homePref="pile" />
      <NavDesk conteggi={{ rossa: 1, ambra: 0, viola: 0, blu: 0 }} pilaSelezionata="rossa" segnale={segnale} />
    </>
  )
}

describe('Dedup del racconto — i due fratelli montati insieme (review Important)', () => {
  it('prima visita in assoluto: ENTRAMBI i fratelli mostrano il racconto — nessuno dei due si vede "già visto" per colpa dell\'altro', () => {
    localStorage.clear()
    renderFratelli(RACCONTO)
    // Due region `role="status"` — una per fratello — entrambe presenti: se il bug fosse
    // ancora lì, una delle due (quella il cui effect gira per seconda) sarebbe assente.
    const regioni = screen.getAllByRole('status')
    expect(regioni).toHaveLength(2)
    regioni.forEach((r) => expect(r).toHaveTextContent('UÀ ha liberato C12'))
  })

  it('la scrittura è UNA sola voce in localStorage, non duplicata dai due fratelli', () => {
    localStorage.clear()
    renderFratelli(RACCONTO)
    const visti = JSON.parse(localStorage.getItem('ua_racconti_visti') ?? '[]')
    expect(visti).toEqual(['lib-c1-2026-07-27T09:00:00.000Z'])
  })

  it('un racconto già visto in un caricamento PRECEDENTE resta nascosto su ENTRAMBI i fratelli oggi (la semantica ratificata: "non riappare" vale sul giorno dopo, non tra fratelli dello stesso giro)', () => {
    localStorage.clear()
    localStorage.setItem('ua_racconti_visti', JSON.stringify(['lib-c1-2026-07-27T09:00:00.000Z']))
    renderFratelli(RACCONTO)
    expect(screen.queryAllByRole('status')).toHaveLength(0)
  })
})
