import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

// Stessa finta di CardLavoro.test.tsx: il tatto e il suono si osservano, non
// si eseguono. `suona` è mockata anche se il componente non la importa — è
// proprio quella l'asserzione di §9.2 (la carta è sola lettura: MAI un suono).
const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { CartaAlbum } from '@/components/ds/CartaAlbum'

// L'array in ingresso è MESCOLATO apposta: né per categoria né per data. Se la
// carta rendesse «la prima dell'array» invece della prima dell'ORDINE (D71),
// metà delle prove qui sotto cadrebbe.
//
// Ordine atteso dopo raggruppaPerCategoria (D71 + created_at + id):
//   1 f-imp1 Impronta · 2 f-imp2 Impronta · 3 f-col Guida colore
//   4 f-rx Radiografia · 5 f-alt Altro
const FOTO = [
  { id: 'f-rx', url: 'https://esempio/rx.jpg', categoria: 'rx', created_at: '2026-07-30T10:00:00Z', nome_file: 'radiografia-paziente.jpg' },
  { id: 'f-imp2', url: 'https://esempio/imp2.jpg', categoria: 'impronta', created_at: '2026-07-30T09:30:00Z', nome_file: null },
  { id: 'f-alt', url: 'https://esempio/alt.jpg', categoria: 'altro', created_at: '2026-07-30T11:00:00Z', nome_file: 'alt.jpg' },
  { id: 'f-imp1', url: 'https://esempio/imp1.jpg', categoria: 'impronta', created_at: '2026-07-30T09:00:00Z', nome_file: 'imp1.jpg' },
  { id: 'f-col', url: 'https://esempio/col.jpg', categoria: 'colore', created_at: '2026-07-30T09:45:00Z', nome_file: 'col.jpg' },
]

const NULLA = { onApri: () => {}, onCorreggiCategoria: () => {} }

/** Le etichette di gruppo nell'ordine in cui stanno nel DOM — non «esistono
 *  tutte», ma «sono in QUEST'ordine»: un `getByText` per ciascuna resterebbe
 *  verde su un elenco rovesciato. */
function etichetteDiGruppoInOrdine(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.ds-album-gr-et')).map((e) => e.textContent ?? '')
}

describe('CartaAlbum — la carta delle foto (§5.38)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })

  // ── Anatomia ────────────────────────────────────────────────────────────
  it('ha un TITOLO, ed è un\'intestazione vera (il difetto n.1 di FotoStrip: un blocco senza capo)', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    expect(screen.getByRole('heading', { name: 'Foto' })).toBeInTheDocument()
  })

  it('il conteggio in testa dice quante foto sono', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    expect(screen.getByText('5 foto')).toBeInTheDocument()
  })

  it('la foto grande è la PRIMA DELL\'ORDINE, non la prima dell\'array in ingresso', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    // f-imp1 (Impronta, 09:00) — nell'array in ingresso sta in quarta posizione.
    const grande = screen.getByRole('button', { name: /^Apri la foto grande/ })
    const img = grande.querySelector('img') as HTMLImageElement
    expect(img.src).toContain('imp1.jpg')
    expect(grande).toHaveAccessibleName('Apri la foto grande: Impronta, 1 di 5')
  })

  it('il contatore dice «1 di 5», e il 5 è il NUMERO DELLE FOTO — mai un valore di colonna', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    expect(screen.getByText('1 di 5')).toBeInTheDocument()
  })

  it('sotto la foto grande c\'è l\'etichetta della sua categoria', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    expect(screen.getByRole('button', { name: 'Cambia la categoria: Impronta' })).toBeInTheDocument()
  })

  it('elenco vuoto → non rende NULLA (return null)', () => {
    const { container } = render(<CartaAlbum foto={[]} {...NULLA} />)
    expect(container.firstElementChild).toBeNull()
  })

  it('una sola foto → «1 di 1», un solo gruppo, una sola miniatura', () => {
    const { container } = render(<CartaAlbum foto={[FOTO[0]]} {...NULLA} />)
    expect(screen.getByText('1 di 1')).toBeInTheDocument()
    expect(screen.getByText('1 foto')).toBeInTheDocument()
    expect(etichetteDiGruppoInOrdine(container)).toEqual(['Radiografia'])
  })

  // ── L'ordine (D71 · G7) ─────────────────────────────────────────────────
  it('i gruppi stanno NELL\'ORDINE D71, non in quello dell\'array né in alfabetico', () => {
    const { container } = render(<CartaAlbum foto={FOTO} {...NULLA} />)
    // Alfabeticamente «Altro» verrebbe per primo; nell'array in ingresso «rx»
    // sta per primo. Nessuna delle due è la risposta giusta.
    expect(etichetteDiGruppoInOrdine(container)).toEqual([
      'Impronta',
      'Guida colore',
      'Radiografia',
      'Altro',
    ])
  })

  it('i sei gruppi al completo stanno nell\'ordine impronta → pre_lavoro → colore → post_prova → rx → altro', () => {
    const sei = [
      { id: 'z6', url: 'https://esempio/6.jpg', categoria: 'altro', created_at: '2026-07-30T09:00:00Z', nome_file: null },
      { id: 'z5', url: 'https://esempio/5.jpg', categoria: 'rx', created_at: '2026-07-30T09:00:00Z', nome_file: null },
      { id: 'z4', url: 'https://esempio/4.jpg', categoria: 'post_prova', created_at: '2026-07-30T09:00:00Z', nome_file: null },
      { id: 'z3', url: 'https://esempio/3.jpg', categoria: 'colore', created_at: '2026-07-30T09:00:00Z', nome_file: null },
      { id: 'z2', url: 'https://esempio/2.jpg', categoria: 'pre_lavoro', created_at: '2026-07-30T09:00:00Z', nome_file: null },
      { id: 'z1', url: 'https://esempio/1.jpg', categoria: 'impronta', created_at: '2026-07-30T09:00:00Z', nome_file: null },
    ]
    const { container } = render(<CartaAlbum foto={sei} {...NULLA} />)
    expect(etichetteDiGruppoInOrdine(container)).toEqual([
      'Impronta',
      'Pre-lavoro',
      'Guida colore',
      'Post-prova',
      'Radiografia',
      'Altro',
    ])
  })

  it('dentro il gruppo l\'ordine è `created_at`, anche quando l\'array in ingresso dice il contrario', () => {
    // f-imp2 (09:30) sta PRIMA di f-imp1 (09:00) nell'array; la carta deve
    // mostrare f-imp1 come prima del gruppo.
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const prima = screen.getByRole('button', { name: 'Impronta, 1 di 5' })
    expect((prima.querySelector('img') as HTMLImageElement).src).toContain('imp1.jpg')
    const seconda = screen.getByRole('button', { name: 'Impronta, 2 di 5' })
    expect((seconda.querySelector('img') as HTMLImageElement).src).toContain('imp2.jpg')
  })

  it('🛑 la colonna `ordine` NON decide niente: invertita rispetto a `created_at`, l\'ordine mostrato segue `created_at`', () => {
    // `ordine` è ambigua in banca dati (schema DEFAULT 1, l'insert scrive 0) e
    // questa superficie non la usa. Non sta nemmeno nel tipo delle prop: il
    // cast serve a simulare un chiamante che la passasse comunque.
    const conOrdine = [
      { id: 'b', url: 'https://esempio/tardi.jpg', categoria: 'impronta', created_at: '2026-07-30T10:00:00Z', nome_file: null, ordine: 1 },
      { id: 'a', url: 'https://esempio/presto.jpg', categoria: 'impronta', created_at: '2026-07-30T09:00:00Z', nome_file: null, ordine: 2 },
    ] as unknown as typeof FOTO
    render(<CartaAlbum foto={conOrdine} {...NULLA} />)
    const grande = screen.getByRole('button', { name: /^Apri la foto grande/ })
    expect((grande.querySelector('img') as HTMLImageElement).src).toContain('presto.jpg')
  })

  it('a parità di `created_at` lo spareggio è l\'`id`', () => {
    const pari = [
      { id: 'bbb', url: 'https://esempio/bbb.jpg', categoria: 'impronta', created_at: '2026-07-30T09:00:00Z', nome_file: null },
      { id: 'aaa', url: 'https://esempio/aaa.jpg', categoria: 'impronta', created_at: '2026-07-30T09:00:00Z', nome_file: null },
    ]
    render(<CartaAlbum foto={pari} {...NULLA} />)
    const grande = screen.getByRole('button', { name: /^Apri la foto grande/ })
    expect((grande.querySelector('img') as HTMLImageElement).src).toContain('aaa.jpg')
  })

  it('una categoria che non conosciamo finisce DOPO «Altro» e porta il valore grezzo come etichetta', () => {
    const conIgnota = [
      ...FOTO,
      { id: 'f-x', url: 'https://esempio/x.jpg', categoria: 'panoramica', created_at: '2026-07-30T08:00:00Z', nome_file: null },
    ]
    const { container } = render(<CartaAlbum foto={conIgnota} {...NULLA} />)
    expect(etichetteDiGruppoInOrdine(container)).toEqual([
      'Impronta',
      'Guida colore',
      'Radiografia',
      'Altro',
      'panoramica',
    ])
  })

  // ── I gesti, e gli indici che passano ───────────────────────────────────
  it('tap su una miniatura CAMBIA la foto grande (selezione, non navigazione): etichetta e contatore la seguono', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    fireEvent.click(screen.getByRole('button', { name: 'Radiografia, 4 di 5' }))
    const grande = screen.getByRole('button', { name: /^Apri la foto grande/ })
    expect((grande.querySelector('img') as HTMLImageElement).src).toContain('rx.jpg')
    expect(screen.getByText('4 di 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambia la categoria: Radiografia' })).toBeInTheDocument()
  })

  it('tap su una miniatura → vibra("selection"), MAI suona (sola lettura, §9.2)', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    fireEvent.click(screen.getByRole('button', { name: 'Guida colore, 3 di 5' }))
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('tap sulla foto grande → onApri con l\'INDICE nell\'elenco ordinato + vibra("light"), mai un suono', () => {
    const onApri = vi.fn()
    render(<CartaAlbum foto={FOTO} onApri={onApri} onCorreggiCategoria={() => {}} />)
    // Prima si sceglie la quarta (Radiografia), poi si apre: l'indice deve
    // essere 3, cioè la posizione nell'elenco ORDINATO — non nell'array.
    fireEvent.click(screen.getByRole('button', { name: 'Radiografia, 4 di 5' }))
    fireEvent.click(screen.getByRole('button', { name: /^Apri la foto grande/ }))
    expect(onApri).toHaveBeenCalledTimes(1)
    expect(onApri).toHaveBeenCalledWith(3)
    expect(vibraMock).toHaveBeenCalledWith('light')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('tap sull\'etichetta → onCorreggiCategoria con l\'indice della foto mostrata (D70: si corregge anche dall\'album)', () => {
    const onCorreggiCategoria = vi.fn()
    render(<CartaAlbum foto={FOTO} onApri={() => {}} onCorreggiCategoria={onCorreggiCategoria} />)
    fireEvent.click(screen.getByRole('button', { name: 'Altro, 5 di 5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambia la categoria: Altro' }))
    expect(onCorreggiCategoria).toHaveBeenCalledWith(4)
  })

  it('l\'etichetta è un COMANDO, non un testo muto: è un <button> alto almeno 44', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const etichetta = screen.getByRole('button', { name: 'Cambia la categoria: Impronta' })
    expect(etichetta.tagName).toBe('BUTTON')
    expect(etichetta.style.minHeight).toBe('44px')
  })

  // ── `indiceAperto` ──────────────────────────────────────────────────────
  it('`indiceAperto` passato dal chiamante decide quale foto è la grande', () => {
    render(<CartaAlbum foto={FOTO} indiceAperto={2} {...NULLA} />)
    const grande = screen.getByRole('button', { name: /^Apri la foto grande/ })
    expect((grande.querySelector('img') as HTMLImageElement).src).toContain('col.jpg')
    expect(screen.getByText('3 di 5')).toBeInTheDocument()
  })

  it('`indiceAperto` fuori dall\'elenco → si ripiega sulla prima foto, mai un `undefined` letto', () => {
    render(<CartaAlbum foto={FOTO} indiceAperto={99} {...NULLA} />)
    expect(screen.getByText('1 di 5')).toBeInTheDocument()
  })

  it('`indiceAperto` negativo → stessa via: la prima foto', () => {
    render(<CartaAlbum foto={FOTO} indiceAperto={-1} {...NULLA} />)
    expect(screen.getByText('1 di 5')).toBeInTheDocument()
  })

  it('🛑 finché `indiceAperto` è definito COPRE la scelta interna: toccare una miniatura non sposta la foto grande', () => {
    // Il contratto scelto è `indiceAperto ?? indiceInterno` — la §5.38 non
    // nomina mai questa prop, quindi la conseguenza si FISSA qui invece di
    // restare un fatto scoperto per caso da chi monta la carta (T10): chi la
    // tiene definita a visore chiuso deve aggiornarla lui a ogni scelta.
    render(<CartaAlbum foto={FOTO} indiceAperto={2} {...NULLA} />)
    fireEvent.click(screen.getByRole('button', { name: 'Altro, 5 di 5' }))
    const grande = screen.getByRole('button', { name: /^Apri la foto grande/ })
    expect((grande.querySelector('img') as HTMLImageElement).src).toContain('col.jpg')
    expect(screen.getByText('3 di 5')).toBeInTheDocument()
  })

  // ── Accessibilità ───────────────────────────────────────────────────────
  it('ogni miniatura è un <button> con nome «{etichetta}, {n} di {m}»', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    for (const nome of ['Impronta, 1 di 5', 'Impronta, 2 di 5', 'Guida colore, 3 di 5', 'Radiografia, 4 di 5', 'Altro, 5 di 5']) {
      expect(screen.getByRole('button', { name: nome }).tagName).toBe('BUTTON')
    }
  })

  it('aria-current sta SOLO sulla miniatura scelta, e segue la scelta (mai `false`)', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    expect(screen.getByRole('button', { name: 'Impronta, 1 di 5' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Altro, 5 di 5' })).not.toHaveAttribute('aria-current')
    fireEvent.click(screen.getByRole('button', { name: 'Altro, 5 di 5' }))
    expect(screen.getByRole('button', { name: 'Altro, 5 di 5' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Impronta, 1 di 5' })).not.toHaveAttribute('aria-current')
  })

  it('la miniatura scelta porta ANCHE l\'anello 2px --ink: il colore non è mai l\'unica fonte di stato (G4)', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const scelta = screen.getByRole('button', { name: 'Impronta, 1 di 5' })
    expect(scelta.style.boxShadow).toBe('0 0 0 2px var(--ink)')
    expect(screen.getByRole('button', { name: 'Altro, 5 di 5' }).style.boxShadow).toBe('none')
  })

  it('ogni gruppo è legato alla sua etichetta (role="group" + aria-labelledby)', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    expect(screen.getByRole('group', { name: 'Impronta' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Guida colore' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Radiografia' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Altro' })).toBeInTheDocument()
  })

  it('`alt` = l\'ETICHETTA della categoria — mai la sigla interna, mai il nome del file', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const alt = Array.from(document.querySelectorAll('img')).map((i) => i.getAttribute('alt'))
    expect(alt).toContain('Radiografia')
    expect(alt).not.toContain('rx')
    expect(alt).not.toContain('radiografia-paziente.jpg')
    expect(alt.every((a) => a !== null && a !== '')).toBe(true)
  })

  it('la pastiglia «⤢ Apri» è aria-hidden: sta dentro il bersaglio, non è un controllo suo', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const pastiglia = screen.getByText(/Apri$/, { selector: 'span' })
    expect(pastiglia).toHaveAttribute('aria-hidden', 'true')
  })

  it('miniature 60×60 (ben oltre i 44 di G4) con raggio 12 = raggio.riga - 6', () => {
    render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const mini = screen.getByRole('button', { name: 'Impronta, 1 di 5' })
    expect(mini.style.width).toBe('60px')
    expect(mini.style.height).toBe('60px')
    expect(mini.style.borderRadius).toBe('12px')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) su foto grande, etichetta e miniature', () => {
    const { container } = render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const regole = container.querySelector('style')?.textContent ?? ''
    for (const classe of ['.ds-album-grande', '.ds-album-etichetta', '.ds-album-mini']) {
      expect(regole).toContain(`${classe}:focus-visible`)
    }
    expect(regole).toContain('outline: 2px solid var(--blue)')
    expect(regole).toContain('outline-offset: 2px')
  })

  it('🛑 NESSUNA trappola del focus: è contenuto di pagina, il Tab la attraversa', () => {
    const { container } = render(<CartaAlbum foto={FOTO} {...NULLA} />)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(container.querySelector('[aria-modal]')).toBeNull()
    const grande = screen.getByRole('button', { name: /^Apri la foto grande/ })
    grande.focus()
    // Se qualcuno mettesse una trappola, il keydown risulterebbe annullato.
    const passato = fireEvent.keyDown(grande, { key: 'Tab' })
    expect(passato).toBe(true)
  })

  // ── Sicurezza — G5 · D75 ────────────────────────────────────────────────
  it('🔴 G5·D75 — l\'indirizzo firmato compare SOLO dentro un `src` di <img>: vincolo di POSTO, non di conteggio', () => {
    const SENTINELLA = 'FIRMA-SENTINELLA'
    const conFirma = FOTO.map((f) => ({ ...f, url: `https://esempio/${SENTINELLA}/${f.id}.jpg` }))
    const { container } = render(<CartaAlbum foto={conFirma} {...NULLA} />)

    const riscontriInTuttoIlDOM = (container.innerHTML.match(new RegExp(SENTINELLA, 'g')) ?? []).length
    const riscontriDentroSrcDiImg = Array.from(container.querySelectorAll('img')).filter((i) =>
      (i.getAttribute('src') ?? '').includes(SENTINELLA),
    ).length

    // Uguaglianza, non un numero fisso: la prima foto compare LEGITTIMAMENTE
    // due volte (grande + miniatura del suo gruppo), e ogni `src` legittimo
    // porta esattamente un riscontro. Un `title`, un `href`, un `data-*` o un
    // testo rompe l'uguaglianza senza che nessuno debba averlo previsto.
    expect(riscontriInTuttoIlDOM).toBe(riscontriDentroSrcDiImg)
    expect(riscontriDentroSrcDiImg).toBeGreaterThan(0)
    expect(container.textContent).not.toContain(SENTINELLA)
  })

  it('🔴 G5·D75, metà speculare — nessuna callback riceve la foto intera: si passa un NUMERO', () => {
    const onApri = vi.fn()
    const onCorreggiCategoria = vi.fn()
    render(<CartaAlbum foto={FOTO} onApri={onApri} onCorreggiCategoria={onCorreggiCategoria} />)
    fireEvent.click(screen.getByRole('button', { name: /^Apri la foto grande/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambia la categoria: Impronta' }))
    expect(onApri).toHaveBeenCalledWith(expect.any(Number))
    expect(onCorreggiCategoria).toHaveBeenCalledWith(expect.any(Number))
    for (const chiamata of [...onApri.mock.calls, ...onCorreggiCategoria.mock.calls]) {
      expect(chiamata).toHaveLength(1)
      expect(typeof chiamata[0]).toBe('number')
    }
  })

  it('`nome_file` non finisce da nessuna parte nel reso — è il campo che invita a scriverlo in un `alt` o in un `title`', () => {
    const { container } = render(<CartaAlbum foto={FOTO} {...NULLA} />)
    expect(container.innerHTML).not.toContain('radiografia-paziente.jpg')
  })

  // ── Misure di legge ─────────────────────────────────────────────────────
  it('la carta: raggio 24, faccia --card, ombra --sh-card, padding 16px 20px', () => {
    const { container } = render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const carta = container.firstElementChild as HTMLElement
    expect(carta.style.borderRadius).toBe('24px')
    expect(carta.style.background).toBe('var(--card)')
    expect(carta.style.boxShadow).toBe('var(--sh-card)')
    expect(carta.style.padding).toBe('16px 20px')
  })

  it('la foto grande è 4/3 a 390 e 16/9 da 768 (il rapporto vive nel blocco style: jsdom non applica le media query)', () => {
    const { container } = render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const regole = container.querySelector('style')?.textContent ?? ''
    expect(regole).toContain('aspect-ratio: 4 / 3')
    expect(regole).toContain('@media (min-width: 768px)')
    expect(regole).toContain('aspect-ratio: 16 / 9')
  })

  it('l\'etichetta di gruppo è 12,5/800 spaziata, MAIUSCOLA, --faint — 12,5 e non 11 (D87: 11 è sotto il minimo di §4.1)', () => {
    const { container } = render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const et = container.querySelector('.ds-album-gr-et') as HTMLElement
    expect(et.style.fontSize).toBe('12.5px')
    expect(et.style.fontWeight).toBe('800')
    expect(et.style.letterSpacing).toBe('0.1em')
    expect(et.style.textTransform).toBe('uppercase')
    expect(et.style.color).toBe('var(--faint)')
  })

  it('la fascia dei gruppi scorre in orizzontale, con gap 14 fra i gruppi e 8 fra le foto', () => {
    const { container } = render(<CartaAlbum foto={FOTO} {...NULLA} />)
    const fascia = container.querySelector('.ds-album-gruppi') as HTMLElement
    expect(fascia.style.overflowX).toBe('auto')
    expect(fascia.style.gap).toBe('14px')
    const dentro = container.querySelector('.ds-album-gr-foto') as HTMLElement
    expect(dentro.style.gap).toBe('8px')
  })

  // ── Dizionario (§2.3) ───────────────────────────────────────────────────
  it('tutti i testi resi passano trovaParoleVietate', () => {
    const { container } = render(<CartaAlbum foto={FOTO} {...NULLA} />)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})
