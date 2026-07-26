// Task 12 — CassettaSheet (§5.3). Test in tests/unit/ (D-O1), NON in __tests__.
//
// Nessun mockup per questo sheet: l'anatomia è composta di soli componenti ds. I contratti API
// (verbatim dalle route) sono la parte graded: PATCH un campo per volta ({nome} XOR {colore}),
// liberazione con body `null` letterale, sposta-lavoro {cassetta_id}, DELETE, riordino via
// callback nel PareteClient. Dizionario: «Butta via», MAI «Elimina».
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { CassettaSheet } from '@/components/features/cassette/CassettaSheet'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

function fetchMock() {
  return fetch as unknown as ReturnType<typeof vi.fn>
}

const occupata: CassettaParete = {
  id: 'c-occ',
  nome: 'C12',
  colore: 'rossa',
  posizione: 1,
  lavoro: { id: 'lav-1', numero: '144', dentista: 'Bianchi', paziente: 'MAR-42', pazienteAlias: null, tipoDispositivo: 'protesi_fissa', descrizione: 'Corona', noteInterne: null },
}
const libera: CassettaParete = { id: 'c-lib', nome: 'C4', colore: 'grigia', posizione: 3, lavoro: null }
const altraLibera: CassettaParete = { id: 'c-lib2', nome: 'C7', colore: 'blu', posizione: 4, lavoro: null }

function renderSheet(over: Partial<Parameters<typeof CassettaSheet>[0]> = {}) {
  const props = {
    cassetta: libera as CassettaParete | null,
    libere: [libera] as CassettaParete[],
    posto: 2,
    totale: 4,
    aperto: true,
    onChiudi: vi.fn(),
    onCambiata: vi.fn(),
    onSposta: vi.fn().mockResolvedValue(true),
    ...over,
  }
  render(<CassettaSheet {...props} />)
  return props
}

/** Collaudo R1 (P11a) — l'`<input type="color">` è il controllo REALE (nome accessibile «Colore
 *  personalizzato»), sovrapposto allo swatch custom. Si cerca via `querySelector` e non
 *  `getByLabelText` solo perché il `Sheet` ds monta il pannello in un portale fuori dal
 *  `container` di RTL: `screen` copre comunque il documento intero, ma il tipo qui serve certo. */
function pickerColore(): HTMLInputElement {
  const input = document.querySelector('input[type="color"]')
  if (!input) throw new Error('input[type=color] non trovato nello sheet')
  return input as HTMLInputElement
}

describe('CassettaSheet — cassetta LIBERA (§5.3)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rinomina: PATCH con SOLO {nome} (mai accorpato al colore) → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    const { onCambiata } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Banco Ciro' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cassette/c-lib')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body as string)).toEqual({ nome: 'Banco Ciro' })
  })

  it('rinomina 409 → errore inline verbatim, NON onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 409, json: async () => ({ errore: 'nome_occupato' }) })
    const { onCambiata } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'C12' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Questo nome è già sulla parete')
    expect(onCambiata).not.toHaveBeenCalled()
  })

  it('colore: swatch tap → PATCH con SOLO {colore} → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok', colore: 'verde' }) })
    const { onCambiata } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Verde' }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cassette/c-lib')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body as string)).toEqual({ colore: 'verde' })
  })

  // Review Task 12, Important 1 — il picker nativo emette valori LIVE mentre il cursore si
  // trascina (React mappa `onChange` sull'evento DOM `input`). Appesa lì, la PATCH salvava un
  // colore intermedio a caso E chiudeva lo sheet in faccia all'utente al primo movimento.
  it('colore CUSTOM: i valori live del picker non salvano e non chiudono lo sheet', () => {
    const { onCambiata } = renderSheet()
    const picker = pickerColore()

    fireEvent.change(picker, { target: { value: '#aabbcc' } })
    fireEvent.change(picker, { target: { value: '#112233' } })

    expect(fetchMock()).not.toHaveBeenCalled()
    expect(onCambiata).not.toHaveBeenCalled()
    // La scelta però si VEDE: lo swatch custom (span decorativo attorno all'input) è selezionato
    // (classe is-scelto + ✓), altrimenti chi sceglie non saprebbe che il colore è stato preso.
    const custom = picker.closest('.ds-swatch-custom')
    expect(custom).toHaveClass('is-scelto')
    expect(custom).toHaveTextContent('✓')
  })

  it('colore CUSTOM: «Salva il colore» committa UNA sola PATCH, con l\'ULTIMO valore scelto', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    const { onCambiata } = renderSheet()
    const picker = pickerColore()
    // Prima del picker il tasto non esiste: le 6 facce standard non ne hanno bisogno (un click è
    // già una scelta conclusa) e una riga in più sotto gli swatch sarebbe rumore.
    expect(screen.queryByRole('button', { name: /salva il colore/i })).toBeNull()

    fireEvent.change(picker, { target: { value: '#aabbcc' } })
    fireEvent.change(picker, { target: { value: '#112233' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il colore/i }))

    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    expect(fetchMock()).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cassette/c-lib')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body as string)).toEqual({ colore: '#112233' })
  })

  it('«Butta via» attiva: DialogConferma verbatim (MAI «Elimina») → DELETE → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    const { onCambiata } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Butta via' }))
    const dialog = await screen.findByRole('dialog', { name: /butto via la cassetta c4/i })
    expect(within(dialog).queryByText(/elimina/i)).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Butta via' }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cassette/c-lib')
    expect(options.method).toBe('DELETE')
  })

  it('rinomina 422 (nome > 20 caratteri) → messaggio dedicato, non un «riprova» cieco', async () => {
    fetchMock().mockResolvedValueOnce({ status: 422, json: async () => ({ errore: 'nome_non_valido' }) })
    const { onCambiata } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Un nome davvero troppo lungo' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Il nome è troppo lungo (massimo 20 caratteri)')
    expect(onCambiata).not.toHaveBeenCalled()
  })

  // Review finale whole-branch, Fix 1 — Sheet e DialogConferma ascoltano ENTRAMBI Esc su window:
  // senza guardia un solo Esc sul dialog «Butta via» chiudeva anche lo sheet sotto (flusso
  // distruttivo che collassa). Con dialog aperto Esc deve chiudere SOLO il dialog.
  it('Esc con DialogConferma «Butta via» aperto: chiude SOLO il dialog, il secondo Esc chiude lo sheet', async () => {
    const { onChiudi } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Butta via' }))
    await screen.findByRole('dialog', { name: /butto via la cassetta c4/i })

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /butto via/i })).toBeNull())
    expect(onChiudi).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  // Review finale whole-branch — QUESTO TEST È STATO RI-PUNTATO. Fino all'ondata di fix
  // «componenti» pin-ava un LIMITE NOTO: il back del telefono consumava l'unica history-entry
  // esistente (quella dello Sheet — `DialogConferma` non ne pushava una propria), la guardia
  // `dialogAperto` fermava `onChiudi`, e non si chiudeva NIENTE mentre l'entry era comunque
  // persa. Quel limite NON C'È PIÙ: `src/components/ds/storia-overlay.ts` tiene UNA entry per
  // l'intera pila di overlay e una pila LIFO di chi la usa — a un back reagisce SOLO il più
  // alto (qui il dialog), e l'entry viene ri-spinta per lo sheet che resta sotto.
  //
  // Perché il vecchio test restava verde pur asserendo il comportamento sbagliato (ed è la
  // ragione per cui va scritto così): controllava i due `role="dialog"` SUBITO dopo il
  // `popstate`, sincrono. Il dialog si chiude, ma esce dall'albero solo a fine uscita di
  // `AnimatePresence`: un istante dopo il back i nodi sono ancora due. Misurato: subito dopo
  // il popstate 2 dialog, dopo `waitFor` 1, `onChiudi` mai chiamato. Da qui il `waitFor`.
  it('back con DialogConferma «Butta via» aperto: chiude SOLO il dialog, lo sheet resta aperto sotto (gemello del test Esc)', async () => {
    const { onChiudi } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Butta via' }))
    await screen.findByRole('dialog', { name: /butto via la cassetta c4/i })
    expect(screen.getAllByRole('dialog')).toHaveLength(2) // Sheet + DialogConferma, entrambi aperti

    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })

    // Il dialog distruttivo se ne va — e se ne va DAVVERO dall'albero, non solo "visivamente".
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /butto via/i })).toBeNull())
    // …lo sheet no: resta l'unico overlay in scena, e il chiamante non è mai stato avvisato di
    // una chiusura che non è avvenuta. Un secondo back toccherà a lui (catena presidiata
    // end-to-end in `tests/unit/stanze-pager.test.tsx`, caso «C2 — dialog distruttivo sopra lo
    // sheet»: 1° back il dialog, 2° lo sheet, 3° la pagina).
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'C4' })).toBeInTheDocument()
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('nessuna azione «Sposta il lavoro in…» su una cassetta libera (non c\'è lavoro da spostare)', () => {
    renderSheet()
    expect(screen.queryByText(/sposta il lavoro in/i)).toBeNull()
  })

  it('«Sposta» ▲: callback onSposta(\'su\') + aria-live «C4 spostata al posto 1»', async () => {
    const { onSposta, onCambiata } = renderSheet({ posto: 2, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: /sposta su/i }))
    expect(onSposta).toHaveBeenCalledWith('su')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('C4 spostata al posto 1'))
    // Il riordino è l'UNICA azione che NON chiude lo sheet: ci si sposta di un posto alla volta.
    expect(onCambiata).not.toHaveBeenCalled()
  })

  it('«Sposta» che NON va a buon fine non annuncia uno spostamento mai avvenuto', async () => {
    const onSposta = vi.fn().mockResolvedValue(false)
    renderSheet({ posto: 2, totale: 4, onSposta })
    fireEvent.click(screen.getByRole('button', { name: /sposta su/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('')
    expect(screen.getByRole('status')).not.toHaveTextContent('spostata al posto')
  })

  it('la prima cassetta non ha ▲, l\'ultima non ha ▼', () => {
    const { onSposta } = renderSheet({ posto: 1, totale: 4 })
    expect(screen.queryByRole('button', { name: /sposta su/i })).toBeNull()
    expect(screen.getByRole('button', { name: /sposta giù/i })).toBeInTheDocument()
    expect(onSposta).not.toHaveBeenCalled()
  })
})

// Task 5 (spec redesign §2.5, punto 13) — «Metti un lavoro» dallo sheet della cassetta LIBERA:
// azione primaria sopra rinomina/colore/butta-via, apre una sottovista interna con la lista dei
// lavori vivi senza cassetta (GET /api/cassette/lavori-liberi), tap → POST assegnazione (route
// ESISTENTE, riuso — già collaudata sopra da «Sposta il lavoro in…»). Ricerca client-side SOLO
// se >8 liberi. Stato vuoto: «Tutti i lavori hanno già una cassetta». Errori → riga quieta, MAI
// chiusura silenziosa.
describe('CassettaSheet — cassetta LIBERA: «Metti un lavoro» (Task 5, §2.5 punto 13)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const unLibero = { id: 'l9', numero: '151', dentista: 'Studio Bruno', pazienteAlias: null, urgenza: 1 }

  it('azione primaria «Metti un lavoro» → lista dei liberi → tap → POST assegnazione {cassetta_id} → onCambiata', async () => {
    fetchMock()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: [unLibero] }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    const { onCambiata } = renderSheet()

    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    expect(fetchMock().mock.calls[0][0]).toBe('/api/cassette/lavori-liberi')

    fireEvent.click(await screen.findByRole('button', { name: /151/i }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[1]
    expect(url).toBe('/api/lavori/l9/cassetta')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body as string)).toEqual({ cassetta_id: 'c-lib' })
  })

  it('la riga mostra anche l\'alias paziente quando c\'è', async () => {
    fetchMock().mockResolvedValueOnce({
      status: 200,
      json: async () => ({ lavori: [{ ...unLibero, pazienteAlias: 'Rossi Mario' }] }),
    })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    expect(await screen.findByText(/rossi mario/i)).toBeInTheDocument()
  })

  // G9-lista (FIX-I) — V2 «targhetta» RATIFICATA: il numero vive in un chip col bordo, SENZA
  // il prefisso «n.» (mockup `docs/design/mockups/2026-07-25-sheet-metti-lavoro-lista.html`,
  // variante V2 — «2026/0007», non «n.2026/0007»).
  it('il chip del numero è SENZA prefisso «n.» (V2 «targhetta»)', async () => {
    fetchMock().mockResolvedValueOnce({
      status: 200,
      json: async () => ({ lavori: [{ ...unLibero, numero: '2026/0007' }] }),
    })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    const chip = await screen.findByText('2026/0007')
    expect(chip).toHaveClass('ds-riga-metti-chip')
    expect(screen.queryByText('n.2026/0007')).toBeNull()
  })

  // G9-lista — riga urgente (`urgenza > 0`): tinta rossa + label «URGENTE» a destra.
  it('riga con urgenza > 0: classe is-urgente + label «Urgente» visibile', async () => {
    fetchMock().mockResolvedValueOnce({
      status: 200,
      json: async () => ({ lavori: [{ ...unLibero, urgenza: 1 }] }),
    })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    const riga = await screen.findByRole('button', { name: /151/i })
    expect(riga).toHaveClass('ds-riga-metti')
    expect(riga).toHaveClass('is-urgente')
    expect(within(riga).getByText('Urgente')).toHaveClass('ds-riga-metti-urgente')
  })

  // G9-lista — riga NON urgente (`urgenza === 0`): niente tinta, niente label.
  it('riga con urgenza 0: NIENTE classe is-urgente e NIENTE label «Urgente»', async () => {
    fetchMock().mockResolvedValueOnce({
      status: 200,
      json: async () => ({ lavori: [{ ...unLibero, urgenza: 0 }] }),
    })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    const riga = await screen.findByRole('button', { name: /151/i })
    expect(riga).not.toHaveClass('is-urgente')
    expect(within(riga).queryByText('Urgente')).toBeNull()
  })

  // G9-lista — testo: paziente 15.5/800 (bold), dentista 13/500 (muted) — classi dedicate.
  it('paziente in classe bold dedicata, dentista in classe muted dedicata', async () => {
    fetchMock().mockResolvedValueOnce({
      status: 200,
      json: async () => ({ lavori: [{ ...unLibero, pazienteAlias: 'Rossi Mario' }] }),
    })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    expect(await screen.findByText('Rossi Mario')).toHaveClass('ds-riga-metti-paziente')
    expect(screen.getByText('Studio Bruno')).toHaveClass('ds-riga-metti-dentista')
  })

  // G9-lista — `pazienteAlias` assente → «— nessun paziente» (peso 600, colore --faint via
  // `.is-assente`), non più una riga muta senza alcun testo paziente (comportamento pre-G9).
  it('pazienteAlias assente → «— nessun paziente» con classe is-assente', async () => {
    fetchMock().mockResolvedValueOnce({
      status: 200,
      json: async () => ({ lavori: [{ ...unLibero, pazienteAlias: null }] }),
    })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    const assente = await screen.findByText('— nessun paziente')
    expect(assente).toHaveClass('ds-riga-metti-paziente')
    expect(assente).toHaveClass('is-assente')
  })

  it('nessun lavoro libero → «Tutti i lavori hanno già una cassetta»', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: [] }) })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    expect(await screen.findByText(/tutti i lavori hanno già una cassetta/i)).toBeInTheDocument()
  })

  it('8 o meno liberi → nessun campo di ricerca', async () => {
    const pochi = Array.from({ length: 8 }, (_, i) => ({
      id: `l${i}`, numero: String(100 + i), dentista: `Dentista ${i}`, pazienteAlias: null, urgenza: i,
    }))
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: pochi }) })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    await screen.findByRole('button', { name: /100/i })
    expect(screen.queryByLabelText(/cerca/i)).toBeNull()
  })

  it('più di 8 liberi → campo di ricerca che filtra client-side su numero/dentista/alias (dopo il debounce, D9b FIX-F)', async () => {
    const molti = Array.from({ length: 9 }, (_, i) => ({
      id: `l${i}`, numero: String(100 + i), dentista: `Dentista ${i}`, pazienteAlias: null, urgenza: i,
    }))
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: molti }) })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    await screen.findByRole('button', { name: /100/i })

    fireEvent.change(screen.getByLabelText(/cerca/i), { target: { value: 'Dentista 3' } })
    // Il filtro è debounced (D9b): non è sincrono al keystroke, quindi si aspetta l'esito.
    await waitFor(() => expect(screen.queryByRole('button', { name: /100/i })).toBeNull())
    expect(screen.getByRole('button', { name: /103/i })).toBeInTheDocument()
  })

  // D9b (FIX-F) — root cause: `liberiFiltrati` (CassettaSheet.tsx ~359-364, prima del fix) era
  // ricalcolato in modo SINCRONO e non memoizzato a ogni keystroke, senza debounce — a differenza
  // del gemello ratificato in `PareteClient.tsx` (`DEBOUNCE_FILTRO_MS`, riserva FE R4: «un FLIP
  // per keystroke è il punto esatto dove peggiora WebKit»). Qui si prova l'effetto osservabile:
  // subito dopo il tasto premuto (PRIMA che passi il debounce) la lista precedente resta ancora
  // visibile — se ricalcolasse sincrono, n.100 sparirebbe immediatamente.
  it('il filtro NON ricalcola sincrono ad ogni tasto: subito dopo il keystroke la lista precedente resta, il filtro scatta solo dopo il debounce', async () => {
    const molti = Array.from({ length: 9 }, (_, i) => ({
      id: `l${i}`, numero: String(100 + i), dentista: `Dentista ${i}`, pazienteAlias: null, urgenza: i,
    }))
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: molti }) })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    await screen.findByRole('button', { name: /100/i })

    fireEvent.change(screen.getByLabelText(/cerca/i), { target: { value: 'Dentista 3' } })
    // Subito dopo — nessun debounce ancora passato: la lista NON si è rifiltrata.
    expect(screen.getByRole('button', { name: /100/i })).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByRole('button', { name: /100/i })).toBeNull())
    expect(screen.getByRole('button', { name: /103/i })).toBeInTheDocument()
  })

  // «Mai una pagina bianca» (§5.26): con liberi presenti ma ricerca a zero risultati, l'area
  // lista non deve restare vuota senza spiegazione — distinto dallo stato vuoto «tutti hanno
  // già una cassetta» (quello copre zero liberi TOTALI, non zero liberi TROVATI).
  it('ricerca senza risultati → riga quieta dedicata (non la stessa dello stato vuoto totale)', async () => {
    const molti = Array.from({ length: 9 }, (_, i) => ({
      id: `l${i}`, numero: String(100 + i), dentista: `Dentista ${i}`, pazienteAlias: null, urgenza: i,
    }))
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: molti }) })
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    await screen.findByRole('button', { name: /100/i })

    fireEvent.change(screen.getByLabelText(/cerca/i), { target: { value: 'zzz-nessuno' } })
    expect(await screen.findByText(/nessun lavoro trovato/i)).toBeInTheDocument()
    expect(screen.queryByText(/tutti i lavori hanno già una cassetta/i)).toBeNull()
  })

  it('errore nel caricamento della lista → riga d\'errore quieta, sheet resta aperto (NON chiusura silenziosa)', async () => {
    fetchMock().mockRejectedValueOnce(new Error('rete'))
    const { onChiudi } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('errore sul POST di assegnazione → riga d\'errore quieta, NON onCambiata, sheet resta aperto', async () => {
    fetchMock()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: [unLibero] }) })
      .mockResolvedValueOnce({ status: 500, json: async () => ({}) })
    const { onCambiata, onChiudi } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    fireEvent.click(await screen.findByRole('button', { name: /151/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onCambiata).not.toHaveBeenCalled()
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('«Metti un lavoro» non compare su una cassetta OCCUPATA', () => {
    renderSheet({ cassetta: occupata, libere: [libera], posto: 1, totale: 4 })
    expect(screen.queryByRole('button', { name: /metti un lavoro/i })).toBeNull()
  })

  it('lo stato della sottovista si resetta al cambio di cassetta', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: [unLibero] }) })
    const props = {
      cassetta: libera as CassettaParete | null,
      libere: [libera] as CassettaParete[],
      posto: 2, totale: 4, aperto: true,
      onChiudi: vi.fn(), onCambiata: vi.fn(), onSposta: vi.fn().mockResolvedValue(true),
    }
    const { rerender } = render(<CassettaSheet {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    await screen.findByRole('button', { name: /151/i })

    rerender(<CassettaSheet {...props} cassetta={altraLibera} />)
    expect(screen.getByRole('button', { name: /metti un lavoro/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /151/i })).toBeNull()
  })
})

describe('CassettaSheet — cassetta OCCUPATA (§5.3)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('mostra «Dentro c\'è il n.144»', () => {
    renderSheet({ cassetta: occupata, libere: [libera, altraLibera], posto: 1, totale: 4 })
    expect(screen.getByText(/Dentro c'è il n\.144/)).toBeInTheDocument()
  })

  it('«Sposta il lavoro in…»: chip di una libera → POST /api/lavori/[id]/cassetta {cassetta_id} → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok', nome: 'C4' }) })
    const { onCambiata } = renderSheet({ cassetta: occupata, libere: [libera, altraLibera], posto: 1, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: 'C4' }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/lavori/lav-1/cassetta')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body as string)).toEqual({ cassetta_id: 'c-lib' })
  })

  it('«Sposta il lavoro in…» 409 → riga bloccante, NON onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 409, json: async () => ({ errore: 'occupata', nome: 'C4' }) })
    const { onCambiata } = renderSheet({ cassetta: occupata, libere: [libera, altraLibera], posto: 1, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: 'C4' }))
    await waitFor(() => expect(screen.getByText(/occupata/i)).toBeInTheDocument())
    expect(onCambiata).not.toHaveBeenCalled()
  })

  it('«Segna come libera»: LinkQuieto + DialogConferma «Il n.144 esce dalla C12?» → POST body null → onCambiata', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok', nome: 'C12' }) })
    const { onCambiata } = renderSheet({ cassetta: occupata, libere: [libera], posto: 1, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: /segna come libera/i }))
    const dialog = await screen.findByRole('dialog', { name: /il n\.144 esce dalla c12/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /esce|libera/i }))
    await waitFor(() => expect(onCambiata).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/lavori/lav-1/cassetta')
    expect(options.method).toBe('POST')
    // Liberazione: body deve essere il letterale `null` (NON {cassetta_id:null}, che è 422).
    expect(options.body).toBe(JSON.stringify(null))
  })

  it('Esc con DialogConferma «Segna come libera» aperto: chiude SOLO il dialog, non lo sheet', async () => {
    const { onChiudi } = renderSheet({ cassetta: occupata, libere: [libera], posto: 1, totale: 4 })
    fireEvent.click(screen.getByRole('button', { name: /segna come libera/i }))
    await screen.findByRole('dialog', { name: /il n\.144 esce dalla c12/i })

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /esce dalla/i })).toBeNull())
    expect(onChiudi).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('«Butta via» DISABILITATA su occupata: riga bloccante «Dentro c\'è il n.144», nessun DELETE', () => {
    renderSheet({ cassetta: occupata, libere: [libera], posto: 1, totale: 4 })
    // Nessun DialogConferma di butta-via raggiungibile: la parola «Butta via» non è un bottone
    // che apre il dialog distruttivo (è resa disabilitata + riga bloccante).
    expect(screen.queryByRole('dialog', { name: /butto via/i })).toBeNull()
    // La riga bloccante c'è (testo verbatim del brief).
    expect(screen.getAllByText(/Dentro c'è il n\.144/).length).toBeGreaterThan(0)
  })
})

// Review finale whole-branch — ciclo di import fra i due moduli: `CassettaSheet` importava
// `DEBOUNCE_FILTRO_MS` da `PareteClient`, che importa `CassettaSheet`. Sopravviveva solo perché
// la costante veniva letta pigramente dentro un `useEffect`: il primo uso a livello di modulo
// (una costante derivata, un valore di default) sarebbe diventato un `ReferenceError` in fase di
// import — dipendente dall'ordine con cui il bundler risolve il ciclo, quindi un crash che si
// vede in produzione e non in un test unitario che importa `CassettaSheet` da solo. La costante
// vive ora in un modulo foglia (`@/lib/ui/debounce-ricerca`), che non importa nessuno dei due.
describe('CassettaSheet — nessun ciclo di import con PareteClient', () => {
  it('non importa nulla da `./PareteClient`', () => {
    const sorgente = readFileSync(join(process.cwd(), 'src/components/features/cassette/CassettaSheet.tsx'), 'utf8')
    expect(sorgente).not.toMatch(/from '\.\/PareteClient'/)
    expect(sorgente).toMatch(/import \{ DEBOUNCE_FILTRO_MS \} from '@\/lib\/ui\/debounce-ricerca'/)
  })

  it('e i due gemelli condividono lo STESSO ritardo: un solo numero, non due copie', async () => {
    const { DEBOUNCE_FILTRO_MS } = await import('@/lib/ui/debounce-ricerca')
    const parete = readFileSync(join(process.cwd(), 'src/components/features/cassette/PareteClient.tsx'), 'utf8')
    expect(parete).toMatch(/from '@\/lib\/ui\/debounce-ricerca'/)
    expect(DEBOUNCE_FILTRO_MS).toBe(180)
  })
})
