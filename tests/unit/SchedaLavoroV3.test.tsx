import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/lavori/lav',
}))
// Review finding G1 (fix-list FIX-G) — la scheda-vista `/lavori/[id]` renderizza
// `TastoTondo`/`TastoPrimario`/`TastoSecondario` (`suona('tap')`) più `SchedaNavRail` e
// `FrameConsegnato` (idem, `suona('tap')`/`suona('ua')`) senza che nulla a monte chiamasse
// mai `initSuoni()`: primo tap muto, stesso bug chiuso su `/dashboard` con `HomeV3.tsx`.
const { initSuoniSpy } = vi.hoisted(() => ({ initSuoniSpy: vi.fn() }))
vi.mock('@/design-system/v3/sound', async (importOriginal) => {
  const reale = await importOriginal<typeof import('@/design-system/v3/sound')>()
  return { ...reale, initSuoni: initSuoniSpy }
})
import { SchedaLavoroV3 } from '../../src/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio } from '../../src/types/domain'

function makeLavoro(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav', numero_lavoro: '2026-0147', stato: 'pronto',
    data_consegna_prevista: '2026-07-20', ora_consegna: '16:00',
    descrizione: 'Corona zirconia', paziente_nome_snapshot: null,
    cliente: { studio_nome: 'Studio Esposito', nome: 'Marco', cognome: 'Esposito' },
    paziente: null, tecnico: { nome: 'Ciro', cognome: 'B', sigla: 'CB' },
    fasi: [], immagini: [], lavorazioni: [], appuntamenti: [], materiali: [], ddc: null,
    laboratorio: { nome: 'Lab', telefono: null },
    ...over,
  } as unknown as LavoroDettaglio
}

describe('SchedaLavoroV3', () => {
  // NB (polish L1): il nome del TastoPrimario è ESATTAMENTE 'Consegna'; la riga
  // editabile della consegna ha nome 'Modifica consegna' (WCAG label-in-name).
  // Le query usano il nome esatto per non far collidere i due controlli.
  it('CONSEGNA abilitato su lavoro pronto', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'pronto' })} />)
    const btn = screen.getByRole('button', { name: 'Consegna' })
    expect(btn).not.toBeDisabled()
  })
  it('CONSEGNA disabilitato su lavoro in_lavorazione con callout', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'in_lavorazione' })} />)
    expect(screen.getByRole('button', { name: 'Consegna' })).toBeDisabled()
    expect(screen.getByText(/completa il controllo finale/i)).toBeInTheDocument()
  })
  it('la riga Consegna ha nome accessibile "Modifica consegna" (WCAG 2.5.3 label-in-name)', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(screen.getByRole('button', { name: 'Modifica consegna' })).toBeInTheDocument()
  })
  it('CONSEGNA disabilitato su lavoro CONSEGNATO mostra "già consegnato", non "completa il controllo" (D6)', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'consegnato', data_consegna_effettiva: '2026-07-06T10:00:00Z' })} />)
    expect(screen.getByRole('button', { name: 'Consegna' })).toBeDisabled()
    expect(screen.getByText(/già consegnato il 6 lug/i)).toBeInTheDocument()
    expect(screen.queryByText(/completa il controllo finale/i)).not.toBeInTheDocument()
  })
  it('mostra numero e dati principali', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(screen.getByText(/2026-0147/)).toBeInTheDocument()
    expect(screen.getByText('Corona zirconia')).toBeInTheDocument()
  })
  it('note_interne è mostrata come nota del laboratorio, mai attribuita al dentista', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ note_interne: 'Attenzione: colore A2, non A3' })} />)
    // Il testo della nota è presente...
    expect(screen.getByText('Attenzione: colore A2, non A3')).toBeInTheDocument()
    // ...ma NON è attribuito al dentista/studio (niente citazione stile
    // NotaDentista '"..." — Studio Esposito'): il nome dello studio non
    // compare accanto al testo della nota.
    expect(screen.queryByText(/Attenzione: colore A2, non A3[\s\S]*Studio Esposito/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^".*"\s*—\s*Studio Esposito$/)).not.toBeInTheDocument()
    // Tap → apre l'editor della nota (ModificaRigaSheet campo="note", che
    // mostra il titolo "Note interne").
    const bottone = screen.getByRole('button', { name: /modifica nota del laboratorio/i })
    fireEvent.click(bottone)
    expect(screen.getByRole('heading', { name: 'Note interne' })).toBeInTheDocument()
  })
  it('mostra il callout tracciabilità materiali (MDR) quando incompleta', () => {
    render(
      <SchedaLavoroV3
        lavoro={makeLavoro({
          tracciabilita_materiali_ok: false,
          materiali_incompleti_dettaglio: [
            { magazzino_id: 'mag-1', nome_materiale: 'Zirconia HT', motivo: 'lotto_assente' },
          ],
        })}
      />
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/tracciabilità materiali incompleta/i)).toBeInTheDocument()
    expect(screen.getByText(/Zirconia HT/)).toBeInTheDocument()
    expect(screen.getByText(/nessun lotto disponibile in magazzino/i)).toBeInTheDocument()
  })
  it('non mostra il callout tracciabilità quando i materiali sono ok', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ tracciabilita_materiali_ok: true, materiali_incompleti_dettaglio: null })} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/tracciabilità materiali incompleta/i)).not.toBeInTheDocument()
  })
  // T10 — l'innesto della carta album (§5.38) al posto della FotoStrip (§5.33,
  // superata). `tests/unit/SchedaLavoroV3.test.tsx` passava sempre `immagini: []`
  // (fixture di riga 27): questa era l'unica zona a copertura zero, perché la
  // carta e la striscia si distinguono SOLO quando ci sono foto da mostrare.
  it('con le foto monta la CARTA ALBUM (titolo «Foto», conteggio) e non la striscia nuda (§5.33 superata)', () => {
    const immagini: LavoroDettaglio['immagini'] = [
      {
        id: 'img-1', laboratorio_id: 'lab', lavoro_id: 'lav',
        url: 'https://esempio/imp.jpg', storage_path: 'lab/lav/imp.jpg',
        nome_file: null, descrizione: null, data_scatto: null,
        categoria: 'impronta', created_at: '2026-07-30T09:00:00Z', ordine: 0,
      },
      {
        id: 'img-2', laboratorio_id: 'lab', lavoro_id: 'lav',
        url: 'https://esempio/rx.jpg', storage_path: 'lab/lav/rx.jpg',
        nome_file: null, descrizione: null, data_scatto: null,
        categoria: 'rx', created_at: '2026-07-30T10:00:00Z', ordine: 0,
      },
      // Terza foto (rilievo di revisione): stessa categoria di img-1 ma
      // `created_at` PRIMA — serve a rendere osservabile anche il passaggio
      // di `created_at`, che con sole due categorie diverse non lascia
      // traccia (l'ordine fra gruppi segue D71, non la data).
      {
        id: 'img-3', laboratorio_id: 'lab', lavoro_id: 'lav',
        url: 'https://esempio/imp-presto.jpg', storage_path: 'lab/lav/imp-presto.jpg',
        nome_file: null, descrizione: null, data_scatto: null,
        categoria: 'impronta', created_at: '2026-07-30T08:00:00Z', ordine: 0,
      },
    ]
    const { container } = render(<SchedaLavoroV3 lavoro={makeLavoro({ immagini })} />)
    // La carta ha un TITOLO vero — la striscia (FotoStrip) non ne aveva mai uno.
    expect(screen.getByRole('heading', { name: 'Foto' })).toBeInTheDocument()
    expect(screen.getByText('3 foto')).toBeInTheDocument()
    // Firma della vecchia striscia (il suo unico contenitore portava questo
    // aria-label): se comparisse ancora, la sostituzione non è avvenuta.
    expect(container.querySelector('[aria-label="Foto del lavoro"]')).toBeNull()
    // Guardia sull'innesto (rilievo di revisione): l'unica cosa di cui QUESTO
    // task è responsabile è che la scheda passi alla carta la `categoria` VERA
    // di ciascuna foto, non un valore fisso. La carta raggruppa per categoria
    // mostrandone l'etichetta (§5.38, superficie pubblica `role="group"`, non
    // la classe interna della carta) — con impronta + rx devono comparire DUE
    // gruppi distinti. Se l'innesto passasse una categoria fissa (es. sempre
    // 'altro'), le tre foto crollerebbero in un unico gruppo «Altro» e questa
    // ricerca fallirebbe (il gruppo «Impronta» non esisterebbe più).
    expect(screen.getByRole('group', { name: 'Impronta' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Radiografia' })).toBeInTheDocument()
    // Guardia sul `created_at` VERO di ciascuna foto: dentro il gruppo
    // «Impronta» ci sono due foto (img-3 delle 08:00, img-1 delle 09:00) — se
    // l'innesto passasse un `created_at` fisso, il loro ordine dipenderebbe
    // solo dallo spareggio per `id` ('img-1' < 'img-3' alfabeticamente) e
    // img-3 (quella vera più vecchia) non sarebbe più la prima del gruppo.
    const primaImpronta = screen.getByRole('button', { name: 'Impronta, 1 di 3' })
    expect((primaImpronta.querySelector('img') as HTMLImageElement).src).toContain('imp-presto.jpg')
  })

  it('dopo router.refresh() il nuovo tecnico dal prop fresco sostituisce quello locale (bug FK-refresh)', () => {
    const lavoroA = makeLavoro({ tecnico: { nome: 'Ciro', cognome: 'B', sigla: 'CB' } as unknown as LavoroDettaglio['tecnico'] })
    const { rerender } = render(<SchedaLavoroV3 lavoro={lavoroA} />)
    expect(screen.getByText('Ciro B')).toBeInTheDocument()
    // Simula ciò che accade dopo `router.refresh()`: il Server Component
    // rilegge il JOIN e passa un `lavoro` fresco con un tecnico diverso.
    const lavoroB = makeLavoro({ tecnico: { nome: 'Anna', cognome: 'V', sigla: 'AV' } as unknown as LavoroDettaglio['tecnico'] })
    rerender(<SchedaLavoroV3 lavoro={lavoroB} />)
    expect(screen.getByText('Anna V')).toBeInTheDocument()
    expect(screen.queryByText('Ciro B')).not.toBeInTheDocument()
  })
})

describe('SchedaLavoroV3 — motore audio al mount (G1, review FIX-G)', () => {
  beforeEach(() => { initSuoniSpy.mockClear() })

  it('chiama initSuoni() al mount — root client di /lavori/[id]', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(initSuoniSpy).toHaveBeenCalledTimes(1)
  })
})
