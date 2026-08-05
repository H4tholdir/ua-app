import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { AllegaPrescrizioneSheet } from '@/components/features/wizard/AllegaPrescrizioneSheet'
// 🛑 La prova che lega il client al server si fa con la funzione VERA della
// rotta (`immagini/route.ts:97-103` la usa per rifiutare con 422), non
// ricopiandone l'elenco (precedente: FrameFatto.test.tsx).
import { isCategoriaFoto } from '@/lib/domain/categorie-foto'
// Idem per il dizionario delle quattro forme della fonte: la rotta
// (`prescrizione/fonte/route.ts:78`) rifiuta con 422 chi manda altro.
import { isFonteTipo } from '@/lib/domain/prescrizione-costanti'

// T4 — la prescrizione non passa più da una POST multipart: va dritta al
// magazzino col caricamento firmato. ⚖️ E NON si comprime mai (D237): è il
// documento su cui si appoggia la Dichiarazione di Conformità.
const { caricaMock } = vi.hoisted(() => ({ caricaMock: vi.fn() }))
vi.mock('@/lib/storage/carica-diretto-client', async (originale) => {
  const vero = await originale<typeof import('@/lib/storage/carica-diretto-client')>()
  return { caricaImmagineDiretta: caricaMock, ErroreCaricamento: vero.ErroreCaricamento }
})

vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))

import { ErroreCaricamento } from '@/lib/storage/carica-diretto-client'

/** Un File di peso dichiarato: allocare 62MB per una prova è tempo buttato. */
function fileDaByte(nome: string, tipo: string, byte: number): File {
  const f = new File(['x'], nome, { type: tipo })
  Object.defineProperty(f, 'size', { value: byte, configurable: true })
  return f
}

const LAVORO_ID = 'lav-1'
const IMG_ID = '11111111-2222-3333-4444-555555555555'

function monta(overrides: Partial<Parameters<typeof AllegaPrescrizioneSheet>[0]> = {}) {
  const onChiudi = vi.fn()
  const onFonte = vi.fn()
  const utili = render(
    <AvvisiProvider>
      <AllegaPrescrizioneSheet
        aperto
        onChiudi={onChiudi}
        lavoroId={LAVORO_ID}
        onFonte={onFonte}
        {...overrides}
      />
    </AvvisiProvider>
  )
  return { ...utili, onChiudi, onFonte }
}

function foglio() {
  return within(screen.getByRole('dialog', { name: 'La prescrizione del dentista' }))
}

// 📌 `okImmagine` è USCITA con T4: la rotta immagini non è più nel cammino di
//    questo foglio — il file va dritto al magazzino e la riga la scrive la
//    conferma. Restano solo le risposte della rotta FONTE, che parla un altro
//    dialetto (`{errore, esito?}`, non `{error}`).
function okFonte(fonte: Record<string, unknown>) {
  return { ok: true, status: 200, json: async () => ({ fonte }) }
}

beforeEach(() => {
  caricaMock.mockClear()
  caricaMock.mockResolvedValue({ id: IMG_ID })
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

// ════════════════════════════════════════════════════════════════════════════
// L'ANATOMIA — testi D222, INVARIATI ALLA LETTERA
// ════════════════════════════════════════════════════════════════════════════

describe('T9 — il foglio a2: anatomia e testi (D222)', () => {
  it('titolo e sottotesto alla lettera', () => {
    monta()
    const f = foglio()
    expect(screen.getByRole('dialog', { name: 'La prescrizione del dentista' })).toBeInTheDocument()
    expect(
      f.getByText(
        (_, el) =>
          el?.textContent ===
          'In qualunque forma sia arrivata: si allega l’originale, e la Dichiarazione si appoggia a quello. Senza, la consegna si ferma (te lo ricordo lì, non adesso).'
      )
    ).toBeInTheDocument()
  })

  it('le TRE voci, coi nomi e i sottotitoli esatti', () => {
    monta()
    const f = foglio()
    expect(f.getByText('Scatta una foto')).toBeInTheDocument()
    expect(f.getByText('il foglio scritto a mano, il modulo compilato')).toBeInTheDocument()
    expect(f.getByText('Dalla galleria o un PDF')).toBeInTheDocument()
    expect(f.getByText('una foto già fatta, l’email salvata, il PDF del modulo')).toBeInTheDocument()
    expect(f.getByText('Non ce l’ho ancora qui')).toBeInTheDocument()
    expect(
      f.getByText('arriva per email o dalla piattaforma: segno da dove, la allego dopo')
    ).toBeInTheDocument()
  })

  it('«Chiudi» in fondo (la via di fuga di legge dello Sheet v3)', async () => {
    const { onChiudi } = monta()
    await userEvent.setup().click(foglio().getByRole('button', { name: 'Chiudi' }))
    expect(onChiudi).toHaveBeenCalled()
  })

  it('chiuso → nessun dialog', () => {
    monta({ aperto: false })
    expect(screen.queryByRole('dialog', { name: 'La prescrizione del dentista' })).not.toBeInTheDocument()
  })

  it('ogni voce è un bersaglio ≥44px', () => {
    monta()
    for (const nome of ['Scatta una foto', 'Dalla galleria o un PDF', 'Non ce l’ho ancora qui']) {
      const voce = foglio().getByText(nome).closest('button') as HTMLElement
      expect(voce).toHaveStyle({ minHeight: '56px' })
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ① SCATTA UNA FOTO — capture, categoria 'prescrizione', fonte 'foglio'
// ════════════════════════════════════════════════════════════════════════════

describe('T9 ① — «Scatta una foto»', () => {
  it('l’input è la fotocamera: accept image/* + capture="environment"', () => {
    monta()
    const input = foglio().getByLabelText('Scatta la foto della prescrizione') as HTMLInputElement
    expect(input.getAttribute('accept')).toBe('image/*')
    expect(input.getAttribute('capture')).toBe('environment')
  })

  it('la voce apre l’input della fotocamera (click delegato)', async () => {
    monta()
    const input = foglio().getByLabelText('Scatta la foto della prescrizione') as HTMLInputElement
    const spia = vi.spyOn(input, 'click')
    await userEvent.setup().click(foglio().getByText('Scatta una foto'))
    expect(spia).toHaveBeenCalled()
  })

  it('foto scelta → caricamento diretto {categoria:"prescrizione"} POI POST fonte {fonte_tipo:"foglio", fonte_immagine_id}', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce(okFonte({ fonte_tipo: 'foglio', fonte_immagine_id: IMG_ID, fonte_riferimento: null }))

    const { onFonte, onChiudi } = monta()
    const user = userEvent.setup()
    const file = new File(['x'], 'presc.jpg', { type: 'image/jpeg' })
    await user.upload(foglio().getByLabelText('Scatta la foto della prescrizione'), file)

    await waitFor(() => expect(m).toHaveBeenCalledTimes(1))

    // Il file va dritto al magazzino (T4), non più in multipart alla funzione.
    expect(caricaMock).toHaveBeenCalledTimes(1)
    const args = caricaMock.mock.calls[0][0]
    expect(args.file).toBe(file)
    expect(args.lavoroId).toBe(LAVORO_ID)
    expect(isCategoriaFoto(args.categoria)).toBe(true)
    expect(args.categoria).toBe('prescrizione')

    const [urlFonte, optFonte] = m.mock.calls[0]
    expect(urlFonte).toBe(`/api/lavori/${LAVORO_ID}/prescrizione/fonte`)
    expect(optFonte.method).toBe('POST')
    const corpo = JSON.parse(optFonte.body as string)
    expect(isFonteTipo(corpo.fonte_tipo)).toBe(true)
    expect(corpo).toEqual({ fonte_tipo: 'foglio', fonte_immagine_id: IMG_ID })

    await waitFor(() =>
      expect(onFonte).toHaveBeenCalledWith({ tipo: 'foglio', immagineId: IMG_ID, riferimento: null })
    )
    expect(onChiudi).toHaveBeenCalled()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ② DALLA GALLERIA O UN PDF — niente capture, tipo DEDOTTO dal gesto
// ════════════════════════════════════════════════════════════════════════════

describe('T9 ② — «Dalla galleria o un PDF»', () => {
  it('accetta immagini E pdf, SENZA capture (precedente TabImmagini:389-391)', () => {
    monta()
    const input = foglio().getByLabelText('Scegli la prescrizione dalla galleria o un PDF') as HTMLInputElement
    expect(input.getAttribute('accept')).toBe('image/*,application/pdf')
    expect(input.hasAttribute('capture')).toBe(false)
  })

  it('un’immagine → fonte_tipo "foglio"', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce(okFonte({ fonte_tipo: 'foglio', fonte_immagine_id: IMG_ID, fonte_riferimento: null }))

    monta()
    await userEvent
      .setup()
      .upload(
        foglio().getByLabelText('Scegli la prescrizione dalla galleria o un PDF'),
        new File(['x'], 'foto.png', { type: 'image/png' })
      )

    await waitFor(() => expect(m).toHaveBeenCalledTimes(1))
    expect(JSON.parse(m.mock.calls[0][1].body as string).fonte_tipo).toBe('foglio')
  })

  it('un PDF → fonte_tipo "modulo" (il tipo si deduce dal gesto, mai da una domanda)', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce(okFonte({ fonte_tipo: 'modulo', fonte_immagine_id: IMG_ID, fonte_riferimento: null }))

    const { onFonte } = monta()
    await userEvent
      .setup()
      .upload(
        foglio().getByLabelText('Scegli la prescrizione dalla galleria o un PDF'),
        new File(['x'], 'modulo.pdf', { type: 'application/pdf' })
      )

    await waitFor(() => expect(m).toHaveBeenCalledTimes(1))
    const corpo = JSON.parse(m.mock.calls[0][1].body as string)
    expect(corpo.fonte_tipo).toBe('modulo')
    expect(isFonteTipo(corpo.fonte_tipo)).toBe(true)
    await waitFor(() => expect(onFonte).toHaveBeenCalledWith({ tipo: 'modulo', immagineId: IMG_ID, riferimento: null }))
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ③ NON CE L'HO ANCORA QUI — il passo leggero (risoluzione del controllore)
// ════════════════════════════════════════════════════════════════════════════

describe('T9 ③ — «Non ce l’ho ancora qui»', () => {
  async function apriPromessa(user: ReturnType<typeof userEvent.setup>) {
    await user.click(foglio().getByText('Non ce l’ho ancora qui'))
  }

  it('apre un passo NELLO STESSO foglio: le tre voci lasciano il posto alle due pastiglie', async () => {
    monta()
    const user = userEvent.setup()
    await apriPromessa(user)
    const f = foglio()
    expect(f.queryByText('Scatta una foto')).not.toBeInTheDocument()
    expect(f.getByRole('button', { name: 'Per email' })).toBeInTheDocument()
    expect(f.getByRole('button', { name: 'Dalla piattaforma' })).toBeInTheDocument()
    expect(f.getByLabelText('Da dove arriva?')).toBeInTheDocument()
  })

  it('nessuna via preselezionata, e senza scelta il «Conferma» non parte', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    monta()
    const user = userEvent.setup()
    await apriPromessa(user)
    expect(foglio().getByRole('button', { name: 'Per email' })).toHaveAttribute('aria-pressed', 'false')
    expect(foglio().getByRole('button', { name: 'Dalla piattaforma' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(foglio().getByRole('button', { name: 'Conferma' }))
    expect(m).not.toHaveBeenCalled()
  })

  it('«Per email» + testo → POST fonte {fonte_tipo:"email", fonte_riferimento:<testo>}, MAI un’immagine', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce(
      okFonte({ fonte_tipo: 'email', fonte_immagine_id: null, fonte_riferimento: 'email del 4 agosto dal Dr. Rossi' })
    )

    const { onFonte, onChiudi } = monta()
    const user = userEvent.setup()
    await apriPromessa(user)
    await user.click(foglio().getByRole('button', { name: 'Per email' }))
    await user.type(foglio().getByLabelText('Da dove arriva?'), 'email del 4 agosto dal Dr. Rossi')
    await user.click(foglio().getByRole('button', { name: 'Conferma' }))

    await waitFor(() => expect(m).toHaveBeenCalledTimes(1))
    const [url, opt] = m.mock.calls[0]
    expect(url).toBe(`/api/lavori/${LAVORO_ID}/prescrizione/fonte`)
    const corpo = JSON.parse(opt.body as string)
    expect(corpo).toEqual({ fonte_tipo: 'email', fonte_riferimento: 'email del 4 agosto dal Dr. Rossi' })
    expect(corpo.fonte_immagine_id).toBeUndefined()

    await waitFor(() =>
      expect(onFonte).toHaveBeenCalledWith({
        tipo: 'email',
        immagineId: null,
        riferimento: 'email del 4 agosto dal Dr. Rossi',
      })
    )
    expect(onChiudi).toHaveBeenCalled()
  })

  it('testo lasciato vuoto → un riferimento ONESTO di riposo (la rotta rifiuta il vuoto, 422)', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce(
      okFonte({ fonte_tipo: 'piattaforma', fonte_immagine_id: null, fonte_riferimento: 'Arriva dalla piattaforma' })
    )

    monta()
    const user = userEvent.setup()
    await apriPromessa(user)
    await user.click(foglio().getByRole('button', { name: 'Dalla piattaforma' }))
    await user.click(foglio().getByRole('button', { name: 'Conferma' }))

    await waitFor(() => expect(m).toHaveBeenCalledTimes(1))
    const corpo = JSON.parse(m.mock.calls[0][1].body as string)
    expect(corpo.fonte_tipo).toBe('piattaforma')
    expect(corpo.fonte_riferimento).toBe('Arriva dalla piattaforma')
    expect(corpo.fonte_riferimento.trim()).not.toBe('')
  })

  it('testo di soli spazi → stesso riposo, mai una stringa che la rotta respinge', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce(okFonte({ fonte_tipo: 'email', fonte_immagine_id: null, fonte_riferimento: 'Arriva per email' }))

    monta()
    const user = userEvent.setup()
    await apriPromessa(user)
    await user.click(foglio().getByRole('button', { name: 'Per email' }))
    await user.type(foglio().getByLabelText('Da dove arriva?'), '   ')
    await user.click(foglio().getByRole('button', { name: 'Conferma' }))

    await waitFor(() => expect(m).toHaveBeenCalledTimes(1))
    expect(JSON.parse(m.mock.calls[0][1].body as string).fonte_riferimento).toBe('Arriva per email')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// GLI ESITI NON-OK — contratto VERO `{errore, esito?}`, MAI `.error`
// ════════════════════════════════════════════════════════════════════════════

describe('T9 — quando qualcosa non riesce', () => {
  it('upload fallito → frase piana, il foglio RESTA aperto, nessuna chiamata alla fonte', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    caricaMock.mockRejectedValueOnce(new ErroreCaricamento('Il caricamento non è riuscito.', 500))

    const { onChiudi, onFonte } = monta()
    await userEvent
      .setup()
      .upload(
        foglio().getByLabelText('Scatta la foto della prescrizione'),
        new File(['x'], 'presc.jpg', { type: 'image/jpeg' })
      )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Non sono riuscita a salvare la prescrizione. Riprova.')).toBeInTheDocument()
    // 🔑 NESSUNA chiamata alla rotta della fonte: se il file non è salito, un
    //    collegamento a un'immagine che non esiste sarebbe una riga che punta
    //    al nulla. Prima il caricamento era una fetch e questa era «1»; ora è
    //    il modulo del caricamento diretto, e la fetch resta a zero.
    expect(m).not.toHaveBeenCalled()
    expect(onFonte).not.toHaveBeenCalled()
    expect(onChiudi).not.toHaveBeenCalled()
  })

  // 🔑 413/415 sono raggiungibili DAL PICKER STESSO: `accept="image/*"`
  // (voce ①) ammette formati che `immagini/route.ts` rifiuta (TIFF, HEIF).
  // La frase generica «Riprova» produrrebbe un ciclo chiuso — stesso file,
  // stesso rifiuto — quindi questi esiti dicono COSA cambiare.
  //
  // 🔴 M3-T39-6, misurato sul deployment vivo il 05/08/2026: la frase diceva
  //    «più grande di 20MB» e NON era vera per nessun file. La piattaforma
  //    taglia a ~4,2MB PRIMA dell'applicazione (401 a 4,10MB · 413 a 4,30MB),
  //    quindi chi caricava una foto da 6MB leggeva un limite che il suo file
  //    non superava. Adesso il controllo scatta prima di partire (test sotto)
  //    e questo 413 è solo la rete, con il numero VERO.
  it('413 dal server → la frase porta il limite vero, mai il vecchio 20MB', async () => {
    caricaMock.mockRejectedValueOnce(new ErroreCaricamento('File troppo grande', 413))

    const { onFonte } = monta()
    await userEvent
      .setup()
      .upload(
        foglio().getByLabelText('Scatta la foto della prescrizione'),
        new File(['x'], 'presc.jpg', { type: 'image/jpeg' })
      )

    const avviso = await screen.findByRole('alert')
    expect(avviso).toHaveTextContent('Questo file supera il massimo di 50MB: scegline uno più leggero.')
    expect(avviso).not.toHaveTextContent(/20MB/)
    expect(onFonte).not.toHaveBeenCalled()
  })

  // Il caso che conta davvero: oltre il limite non si parte nemmeno. Su rete
  // mobile aspettare il viaggio significa decine di secondi per un rifiuto già
  // deciso in partenza — e la richiesta non arriverebbe comunque all'app.
  it('file oltre il limite → avvisa col peso VERO e non chiama nessuna rotta', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockClear()
    monta()
    await userEvent
      .setup()
      .upload(
        foglio().getByLabelText('Scatta la foto della prescrizione'),
        fileDaByte('presc.jpg', 'image/jpeg', 62 * 1024 * 1024)
      )
    const avviso = await screen.findByRole('alert')
    expect(avviso).toHaveTextContent(/62,0 MB/)
    expect(avviso).toHaveTextContent(/50MB/)
    expect(m).not.toHaveBeenCalled()
    expect(caricaMock).not.toHaveBeenCalled()
  })

  it('formato non supportato (415) → frase che dice i formati accettati, non "Riprova"', async () => {
    caricaMock.mockRejectedValueOnce(new ErroreCaricamento('Tipo file non consentito: image/tiff', 415))

    const { onFonte } = monta()
    await userEvent
      .setup()
      .upload(
        foglio().getByLabelText('Scatta la foto della prescrizione'),
        new File(['x'], 'presc.tiff', { type: 'image/tiff' })
      )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      // 🔴 HEIC è USCITO dall'elenco il 05/08: il bucket non lo accetta
      //    (misurato), e dichiararlo faceva arrivare il rifiuto DOPO aver
      //    speso i byte — fino a 50MB, col caricamento diretto.
      screen.getByText('Formato non supportato: usa JPG, PNG, WEBP, GIF o PDF.')
    ).toBeInTheDocument()
    expect(onFonte).not.toHaveBeenCalled()
  })

  it('foto salvata ma fonte rifiutata → si dice ENTRAMBE le cose (la foto c’è, il collegamento no)', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ errore: 'fonte_immagine_id non appartiene a questo lavoro' }),
    })

    const { onFonte } = monta()
    await userEvent
      .setup()
      .upload(
        foglio().getByLabelText('Scatta la foto della prescrizione'),
        new File(['x'], 'presc.jpg', { type: 'image/jpeg' })
      )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText('Ho salvato la foto, ma non sono riuscita a segnarla come prescrizione. La colleghi dalla scheda.')
    ).toBeInTheDocument()
    expect(onFonte).not.toHaveBeenCalled()
  })

  // 🔑 LA PROVA CHE DISCRIMINA: se il codice leggesse `.error` (l'altro
  // contratto, quello della rotta immagini) l'esito non arriverebbe mai e la
  // frase sarebbe quella generica. Questa asserzione cade, le altre no.
  it('esito «fonte_congelata» (409) → la SUA frase, non quella generica', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        errore:
          'La fonte è congelata: il lavoro ha una Dichiarazione di Conformità attiva. Per sostituirla, annulla prima la dichiarazione.',
        esito: 'fonte_congelata',
      }),
    })

    monta()
    const user = userEvent.setup()
    await user.click(foglio().getByText('Non ce l’ho ancora qui'))
    await user.click(foglio().getByRole('button', { name: 'Per email' }))
    await user.click(foglio().getByRole('button', { name: 'Conferma' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Questa prescrizione è già bloccata dalla Dichiarazione di Conformità. Per cambiarla, annulla prima la Dichiarazione.'
      )
    ).toBeInTheDocument()
  })

  it('risposta non-JSON (un 502 di un proxy) → frase generica, mai un’eccezione che risale', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('non è JSON')
      },
    })

    monta()
    const user = userEvent.setup()
    await user.click(foglio().getByText('Non ce l’ho ancora qui'))
    await user.click(foglio().getByRole('button', { name: 'Per email' }))
    await user.click(foglio().getByRole('button', { name: 'Conferma' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Non sono riuscita a segnare la prescrizione. Riprova.')).toBeInTheDocument()
  })

  it('la rete cade (fetch solleva) → frase generica, il foglio resta aperto', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockRejectedValueOnce(new Error('offline'))

    const { onChiudi } = monta()
    const user = userEvent.setup()
    await user.click(foglio().getByText('Non ce l’ho ancora qui'))
    await user.click(foglio().getByRole('button', { name: 'Per email' }))
    await user.click(foglio().getByRole('button', { name: 'Conferma' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('il caricamento non restituisce una riga → non si inventa un uuid, si dice che non è riuscita', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    // 🔑 Il modulo del caricamento solleva già se la conferma non torna con
    //    l'immagine: qui si prova che il foglio NON prosegue lo stesso — senza,
    //    la rotta fonte riceverebbe un uuid inventato e risponderebbe 422 con
    //    un errore che non spiega niente.
    caricaMock.mockRejectedValueOnce(new ErroreCaricamento('Risposta del server non valida.'))

    const { onFonte } = monta()
    await userEvent
      .setup()
      .upload(
        foglio().getByLabelText('Scatta la foto della prescrizione'),
        new File(['x'], 'presc.jpg', { type: 'image/jpeg' })
      )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(m).not.toHaveBeenCalled()
    expect(onFonte).not.toHaveBeenCalled()
  })
})
