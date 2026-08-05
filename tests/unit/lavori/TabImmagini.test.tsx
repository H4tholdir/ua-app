// T11 (ondata b) — `src/components/features/lavori/form/TabImmagini.tsx`.
//
// 🔴 RIPARAZIONE, non abbellimento. Da T3 (30/07) la rotta di upload PRETENDE
//    il campo `categoria` (`src/app/api/lavori/[id]/immagini/route.ts:97-103`)
//    e questo componente spediva ancora `descrizione`: OGNI caricamento
//    riceveva 422. Insieme a D81 (il client leggeva `img.descrizione` come
//    categoria, colonna che non esiste più), la funzione «carica una foto»
//    era ferma su entrambi i lati fino a questo task.
//
// ============================================================
// R-P4 — misura sull'implementazione «inerte»
// ============================================================
// L'ABBOZZO INERTE è il file COM'ERA prima di questo task (commit `28a83c70`,
// `git show 28a83c70:src/components/features/lavori/form/TabImmagini.tsx`):
// niente `FoglioCategoria` montato, campo `descrizione`, `TIPI_FOTO` locale,
// `totalFotos` che conta doppio, due gestori di scrittura separati,
// `img.descrizione` letto come categoria.
// Comando: `npx vitest run tests/unit/lavori/TabImmagini.test.tsx` con quel
// file rimesso al suo posto (via `git stash`, poi ripristinato il fix).
// Esito MISURATO sull'abbozzo inerte: **15 falliti su 16** (1 solo verde).
// La sola prova verde è «nessun file selezionato: no-op» — prova di ASSENZA,
// vera anche sul file rotto perché `handleFiles` faceva il return anticipato
// anche lì. Tutte le altre 14 mordono davvero: senza `FoglioCategoria`
// montato nessun bottone dello stub esiste (`getByText('scegli-…')` non
// trova nulla → throw), quindi ogni prova che dipende dal foglio va rossa
// per un motivo REALE (comportamento assente), non per "modulo non trovato".
// Le tre prove D70/D81 restano rosse anche in isolamento sintattico: la spia
// conta 2 occorrenze di `method: 'PATCH'` (non 1), il PATCH manuale porta
// ancora `descrizione` invece di `categoria`, e il <select> legge
// `img.descrizione` invece di `img.categoria`.
//
// Ogni forma d'ingresso enumerata PRIMA delle asserzioni (R-P4): nessun file ·
// una foto sola · più file insieme · un PDF · un tipo che il server rifiuta ·
// una richiesta che fallisce in rete · l'utente che esce dal foglio senza
// scegliere.

import { useState } from 'react'
import { readFileSync } from 'node:fs'
import { render, screen, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LavoroImmagine } from '@/types/domain'

// ─── Mock: compressione immagine (Web Worker/canvas non esistono in jsdom) ──
// Il doppio è pilotabile per prova: `comprimiMock.mockResolvedValueOnce(...)`
// per dire che cosa la libreria restituisce. Il default resta «restituisce
// quello che ha ricevuto», che è ciò che tutte le prove preesistenti danno per
// buono.
const { comprimiMock } = vi.hoisted(() => ({
  comprimiMock: vi.fn(async (file: File) => file),
}))
vi.mock('browser-image-compression', () => ({
  default: comprimiMock,
}))

const { caricaMock } = vi.hoisted(() => ({ caricaMock: vi.fn() }))
vi.mock('@/lib/storage/carica-diretto-client', () => ({
  caricaImmagineDiretta: caricaMock,
}))

// ─── Mock: haptic/sound v3 — stessa convenzione di FoglioCategoria.test.tsx ─
const vibraMock = vi.fn()
const suonaMock = vi.fn()
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
}))

// ─── Mock: FoglioCategoria — stub deterministico, tracciato per props ───────
// 🛑 NON si mocka per aggirare il componente reale: si mocca per ISOLARE la
// logica di TabImmagini dalla sua (già provata altrove, FoglioCategoria.test
// .tsx). Qui serve tracciare OGNI chiamata con le sue props — è l'unico modo
// di provare che `ancoraFocus` resta la STESSA identità attraverso i render
// del genitore (la trappola nota del brief).
const { foglioCalls } = vi.hoisted(() => ({ foglioCalls: [] as Array<Record<string, unknown>> }))
vi.mock('@/components/ds/FoglioCategoria', () => ({
  FoglioCategoria: (props: {
    aperto: boolean
    quante: number
    anteprime: string[]
    ancoraFocus: { current: HTMLElement | null }
    onScegli: (c: string) => void
    onChiudi: () => void
  }) => {
    foglioCalls.push(props)
    if (!props.aperto) return null
    return (
      <div role="dialog" aria-label="foglio-categoria-stub">
        <span data-quante={props.quante}>{props.quante} foto</span>
        {['impronta', 'pre_lavoro', 'colore', 'post_prova', 'rx', 'altro'].map((c) => (
          <button
            key={c}
            onClick={() => {
              props.onScegli(c)
              props.onChiudi()
            }}
          >
            scegli-{c}
          </button>
        ))}
        <button
          onClick={() => {
            // Stessa sequenza del vero FoglioCategoria (D74): ogni uscita
            // che non è una scelta chiama comunque onScegli('altro') PRIMA
            // di onChiudi().
            props.onScegli('altro')
            props.onChiudi()
          }}
        >
          esci-senza-scegliere
        </button>
      </div>
    )
  },
}))

import { TabImmagini } from '@/components/features/lavori/form/TabImmagini'
import { AvvisiProvider } from '@/components/ds/Avviso'

// ─── Il doppio del caricamento diretto (T4) ─────────────────────────────────
// 🔑 Da T4 questo componente non parla più con `POST …/immagini` via XHR: usa
//    `caricaImmagineDiretta`, che fa i tre passi (permesso → byte al magazzino
//    → conferma) ed è provata a sé in `carica-diretto-client.test.ts`, contro
//    una forma di richiesta MISURATA sul magazzino vero. Qui si mocka per
//    isolare il comportamento del COMPONENTE: che cosa manda, che cosa mostra
//    mentre aspetta, e che cosa fa quando arriva un no.
// Ogni chiamata resta SOSPESA finché la prova non decide come va a finire —
// è il modo di provare gli stati intermedi (avanzamento, errore su una foto
// sola fra tre).
interface CaricamentoSospeso {
  args: { lavoroId: string; file: File; categoria: string; onProgress?: (n: number) => void }
  risolvi: (img: LavoroImmagine) => void
  rifiuta: (e: Error) => void
}
const sospesi: CaricamentoSospeso[] = []

function ultimoCaricamento(): CaricamentoSospeso {
  const c = sospesi[sospesi.length - 1]
  if (!c) throw new Error('nessun caricamento avviato: il file non è mai partito')
  return c
}

async function simulaSuccesso(c: CaricamentoSospeso, immagine: LavoroImmagine) {
  await act(async () => { c.risolvi(immagine) })
}
async function simulaErrore(c: CaricamentoSospeso, messaggio: string) {
  await act(async () => { c.rifiuta(new Error(messaggio)) })
}

function immagineDb(overrides: Partial<LavoroImmagine> = {}): LavoroImmagine {
  return {
    id: `db-${Math.random().toString(36).slice(2, 8)}`,
    laboratorio_id: 'lab-1',
    lavoro_id: 'lav-1',
    url: 'https://storage.esempio/immagine.webp',
    // T1 (05/08/2026): prima cartella = laboratorio (il recinto).
    storage_path: 'lab-1/lavori/lav-1/3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d.jpg',
    nome_file: 'immagine.webp',
    descrizione: null,
    data_scatto: null,
    categoria: 'colore',
    created_at: new Date().toISOString(),
    ordine: 0,
    ...overrides,
  }
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

// ─── Harness — replica il chiamante reale (`LavoroFormClient`):
//     `immagini` vive nello STATO DEL GENITORE, `onAdd` lo accresce, e il
//     tutto sta dentro `AvvisiProvider` — che il form monta per davvero
//     (auto-avvolgimento, stesso pattern di `SchedaLavoroV3`). 🛑 Il provider
//     NON è un dettaglio del test: `useAvvisi()` fuori dal suo contesto
//     LANCIA, quindi montarlo qui è replicare il chiamante, non aggirarlo.
function Harness({ onAddSpy }: { onAddSpy?: (img: LavoroImmagine) => void }) {
  const [immagini, setImmagini] = useState<LavoroImmagine[]>([])
  return (
    <AvvisiProvider>
      <TabImmagini
        immagini={immagini}
        lavoro_id="lav-1"
        onAdd={(img) => {
          onAddSpy?.(img)
          setImmagini((prev) => [...prev, img])
        }}
      />
    </AvvisiProvider>
  )
}

function inputGalleria(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[accept="image/*,application/pdf"]') as HTMLInputElement
}
function inputCamera(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[capture="environment"]') as HTMLInputElement
}

/** Un File di peso dichiarato — allocare davvero 6MB per prova è tempo buttato. */
function fileDaByte(nome: string, tipo: string, byte: number): File {
  const f = new File(['x'], nome, { type: tipo })
  Object.defineProperty(f, 'size', { value: byte, configurable: true })
  return f
}

const MB = 1024 * 1024

beforeEach(() => {
  sospesi.length = 0
  caricaMock.mockClear()
  caricaMock.mockImplementation((args: CaricamentoSospeso['args']) =>
    new Promise<LavoroImmagine>((risolvi, rifiuta) => { sospesi.push({ args, risolvi, rifiuta }) })
  )
  foglioCalls.length = 0
  vibraMock.mockClear()
  suonaMock.mockClear()
  comprimiMock.mockClear()
  comprimiMock.mockImplementation(async (file: File) => file)
  // jsdom non implementa affatto questi due (verificato: `undefined`, non un
  // no-op) — senza lo stub `handleFiles` esplode sul PRIMO file.
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:mock-${Math.random().toString(36).slice(2, 8)}`),
    revokeObjectURL: vi.fn(),
  }))
  mockMatchMedia(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TabImmagini — T11: la categoria si chiede una volta, si scrive da un punto solo', () => {
  // ══ LE FORME DI INGRESSO (R-P4: enumerate PRIMA delle asserzioni) ═══════
  describe('le forme di ingresso', () => {
    it('nessun file selezionato: no-op, nessun foglio, nessuna richiesta', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      await utente.upload(inputGalleria(container), [])
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(sospesi).toHaveLength(0)
    })

    it('una foto sola: il foglio chiede quante=1', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
      await utente.upload(inputGalleria(container), file)
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(foglioCalls.at(-1)?.quante).toBe(1)
    })

    it('più file insieme: il foglio chiede UNA VOLTA per il gruppo, e la scelta vale per tutti', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const f1 = new File(['a'], 'uno.jpg', { type: 'image/jpeg' })
      const f2 = new File(['b'], 'due.jpg', { type: 'image/jpeg' })
      await utente.upload(inputGalleria(container), [f1, f2])

      expect(foglioCalls.filter((p) => p.aperto)).toHaveLength(1)
      expect(foglioCalls.at(-1)?.quante).toBe(2)

      await utente.click(screen.getByText('scegli-colore'))

      expect(sospesi).toHaveLength(2)
      expect(sospesi[0].args.categoria).toBe('colore')
      expect(sospesi[1].args.categoria).toBe('colore')
    })

    it('un PDF: si rende come tessera documento, MAI un <img> — in upload e da banca dati', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const pdf = new File(['%PDF-1.4'], 'referto.pdf', { type: 'application/pdf' })
      await utente.upload(inputGalleria(container), pdf)
      await utente.click(screen.getByText('scegli-colore'))

      // In volo: nessun <img>, e la tessera porta il nome del file.
      expect(container.querySelectorAll('img')).toHaveLength(0)
      expect(screen.getByRole('img', { name: /Documento: referto\.pdf/ })).toBeTruthy()

      // Dopo il successo: la stessa cosa vale per la foto ORA in banca dati
      // (il locale è sparito, la tessera viene da `storage_path` che finisce
      // per `.pdf`).
      await simulaSuccesso(
        ultimoCaricamento(),
        immagineDb({ storage_path: 'lab-1/lavori/lav-1/9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d.pdf', nome_file: 'referto.pdf', categoria: 'colore' })
      )
      expect(container.querySelectorAll('img')).toHaveLength(0)
      expect(screen.getByRole('img', { name: /Documento: referto\.pdf/ })).toBeTruthy()
    })

    it('il server rifiuta (es. tipo non ammesso, 415): errore visibile, vibrazione+suono d\'errore', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
      await utente.upload(inputGalleria(container), file)
      await utente.click(screen.getByText('scegli-colore'))

      await simulaErrore(ultimoCaricamento(), 'Tipo file non consentito: image/jpeg')

      expect(screen.getByRole('alert')).toBeTruthy()
      expect(vibraMock).toHaveBeenCalledWith('error')
      expect(suonaMock).toHaveBeenCalledWith('errore')

      // 🛑 UNA volta sola. Il suono dell'errore lo fa `errore()` del DS
      // (§5.18): finché il 05/08/2026 questo componente lo suonava anche da
      // sé, e le due sorgenti insieme darebbero due suoni sullo stesso fatto —
      // la classe di difetto «due posti che fanno la stessa cosa», che qui si
      // sentirebbe letteralmente.
      expect(suonaMock.mock.calls.filter((c) => c[0] === 'errore')).toHaveLength(1)
      expect(vibraMock.mock.calls.filter((c) => c[0] === 'error')).toHaveLength(1)
    })

    it('la rete fallisce (xhr.onerror): stesso trattamento d\'errore', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
      await utente.upload(inputGalleria(container), file)
      await utente.click(screen.getByText('scegli-colore'))

      await simulaErrore(ultimoCaricamento(), 'Errore di rete durante il caricamento.')

      expect(screen.getByRole('alert')).toBeTruthy()
      expect(vibraMock).toHaveBeenCalledWith('error')
    })

    it('l\'utente esce dal foglio senza scegliere: la categoria è "altro" (D74), non un errore', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
      await utente.upload(inputGalleria(container), file)
      await utente.click(screen.getByText('esci-senza-scegliere'))

      expect(sospesi).toHaveLength(1)
      expect(sospesi[0].args.categoria).toBe('altro')
    })
  })

  // ══ D81 — IL CAMPO SPEDITO ═══════════════════════════════════════════════
  describe('il campo spedito alla POST', () => {
    it('porta `categoria` scelta dall\'utente, e il lavoro giusto', async () => {
      // 🔑 Nel corridoio vecchio questo era un campo del FormData, e per un
      //    periodo il componente spediva `descrizione` al posto di `categoria`:
      //    OGNI caricamento riceveva 422. Ora è un argomento di funzione, che
      //    il compilatore stesso protegge — ma l'asserzione resta, perché il
      //    VALORE (quello che l'utente ha scelto) nessun compilatore lo vede.
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
      await utente.upload(inputGalleria(container), file)
      await utente.click(screen.getByText('scegli-rx'))

      expect(sospesi[0].args.categoria).toBe('rx')
      expect(sospesi[0].args.lavoroId).toBe('lav-1')
    })
  })

  // ══ LA FOTO LOCALE SPARISCE QUANDO ARRIVA QUELLA VERA ═══════════════════
  describe('niente doppioni: la locale sparisce al successo', () => {
    it('dopo un caricamento riuscito la foto compare UNA VOLTA SOLA', async () => {
      const utente = userEvent.setup()
      const onAddSpy = vi.fn()
      const { container } = render(<Harness onAddSpy={onAddSpy} />)
      const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
      await utente.upload(inputGalleria(container), file)
      await utente.click(screen.getByText('scegli-colore'))

      await simulaSuccesso(ultimoCaricamento(), immagineDb({ nome_file: 'foto.jpg' }))

      expect(onAddSpy).toHaveBeenCalledTimes(1)
      // Un solo <img> nell'intero componente: non uno locale + uno da DB.
      expect(container.querySelectorAll('img')).toHaveLength(1)
      expect(screen.getByText('1 foto allegate')).toBeTruthy()
    })

    it('il contatore che decideva "Vista lista" NON conta più doppio (era il sintomo osservabile del bug)', async () => {
      // `totalFotos` non compare mai come testo: il suo UNICO lettore è la
      // soglia `isSmallViewport && totalFotos >= 6` (riga 378 pre-T11). Sul
      // file rotto, 3 upload riusciti facevano 3 (immagini) + 3 (fotoLocali
      // con uploadedId MAI rimosso) = 6 → soglia raggiunta. Dopo il fix: 3.
      mockMatchMedia(true) // forza isSmallViewport=true (il mock globale di tests/setup.ts è sempre `false`)
      const utente = userEvent.setup()
      const { container } = render(<Harness />)

      const files = [
        new File(['a'], 'uno.jpg', { type: 'image/jpeg' }),
        new File(['b'], 'due.jpg', { type: 'image/jpeg' }),
        new File(['c'], 'tre.jpg', { type: 'image/jpeg' }),
      ]
      await utente.upload(inputGalleria(container), files)
      await utente.click(screen.getByText('scegli-colore'))

      expect(sospesi).toHaveLength(3)
      for (const c of [...sospesi]) {
        await simulaSuccesso(c, immagineDb())
      }

      expect(screen.queryByRole('button', { name: /vista lista|vista griglia/i })).toBeNull()
    })
  })

  // ══ D70 — UN SOLO PUNTO DI SCRITTURA ═════════════════════════════════════
  describe('un solo punto di scrittura della categoria (D70)', () => {
    it('spia sul sorgente: un SOLO `method: \'PATCH\'` nel file', () => {
      const src = readFileSync(
        'src/components/features/lavori/form/TabImmagini.tsx',
        'utf-8'
      )
      const occorrenze = src.match(/method:\s*['"]PATCH['"]/g) ?? []
      expect(occorrenze).toHaveLength(1)
    })

    it('correggere la categoria di una foto già in banca dati chiama quella funzione (fetch PATCH)', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', fetchMock)

      const { container } = render(
        <AvvisiProvider>
          <TabImmagini
            immagini={[immagineDb({ id: 'img-9', categoria: 'impronta', nome_file: 'a.jpg' })]}
            lavoro_id="lav-1"
            onAdd={() => {}}
          />
        </AvvisiProvider>
      )
      const select = container.querySelector('select') as HTMLSelectElement
      const utente = userEvent.setup()
      await utente.selectOptions(select, 'rx')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/lavori/lav-1/immagini/img-9',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ categoria: 'rx' }),
        })
      )
    })

    it('legge `img.categoria`, non `img.descrizione` (D81)', () => {
      const { container } = render(
        <AvvisiProvider>
          <TabImmagini
            immagini={[
              immagineDb({ id: 'img-1', categoria: 'rx', descrizione: 'nota libera irrilevante' }),
            ]}
            lavoro_id="lav-1"
            onAdd={() => {}}
          />
        </AvvisiProvider>
      )
      const select = container.querySelector('select') as HTMLSelectElement
      expect(within(select).getByText('Radiografia').getAttribute('value')).toBe('rx')
      expect(select.value).toBe('rx')
    })
  })

  // ══ IL PESO — il difetto vivo del 05/08/2026 (handoff §0②b) ═════════════
  // Fino a qui questa superficie non aveva ALCUN controllo di peso
  // (`grep -c troppoGrande` → 0): è il TERZO percorso di caricamento, e il
  // modulo del limite dichiarava di coprirne due. Un modulo scansionato da 6MB
  // partiva, la piattaforma lo tagliava PRIMA dell'applicazione, la risposta
  // non era JSON e l'utente leggeva «Upload fallito: 413».
  //
  // Forme d'ingresso (R-P4): PDF sopra il limite · PDF sotto · immagine grande
  // che la compressione porta sotto (NON-REGRESSIONE: oggi funziona e deve
  // continuare) · immagine che resta sopra anche dopo · più file di cui uno
  // solo troppo pesante.
  describe('il peso si controlla PRIMA di spendere un byte', () => {
    it('un PDF da 62MB non parte affatto, e la frase dice il peso vero', async () => {
      // 📌 Il numero è cambiato con T4, e il cambiamento È il lavoro: prima il
      //    tetto era 4MB (il muro della piattaforma), ora è quello del
      //    magazzino. Un modulo scansionato da 6MB — il caso che generava
      //    «Upload fallito: 413» — oggi passa: c'è una prova apposta, qui sotto.
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      await utente.upload(inputGalleria(container), fileDaByte('modulo.pdf', 'application/pdf', 62 * MB))
      await utente.click(screen.getByText('scegli-altro'))

      // Nessun viaggio: il file non è mai partito.
      expect(sospesi).toHaveLength(0)

      // E la frase si LEGGE — non è solo un aria-label su un triangolino.
      const avviso = await screen.findByRole('alert')
      expect(avviso.textContent).toContain('62,0 MB')
      expect(avviso.textContent).toContain('50MB')
      // 🛑 A un PDF non si dice «scattala di nuovo»: non c'è niente da riscattare.
      expect(avviso.textContent).not.toContain('scattala')
      expect(vibraMock).toHaveBeenCalledWith('error')
    })

    it('🔑 IL CASO CHE HA GENERATO TUTTO: un modulo scansionato da 6MB ORA PASSA', async () => {
      // Prima di oggi: partiva, la piattaforma lo tagliava a metà strada, la
      // risposta non era JSON, e l'utente leggeva «Upload fallito: 413».
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      await utente.upload(inputGalleria(container), fileDaByte('modulo.pdf', 'application/pdf', 6 * MB))
      await utente.click(screen.getByText('scegli-altro'))

      expect(sospesi).toHaveLength(1)
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('NON-REGRESSIONE: una foto da 6MB che la compressione porta a 0,4MB parte lo stesso', async () => {
      // 🔑 È la ragione per cui il controllo sta DOPO la compressione e non
      // prima: un telefono di oggi fa foto da 6MB, e comprimerle è esattamente
      // ciò che le fa passare. Un controllo messo a monte le rifiuterebbe
      // tutte — rompendo una funzione che oggi lavora.
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      comprimiMock.mockResolvedValueOnce(fileDaByte('foto.jpg', 'image/jpeg', 400 * 1024))

      await utente.upload(inputGalleria(container), fileDaByte('foto.jpg', 'image/jpeg', 6 * MB))
      await utente.click(screen.getByText('scegli-impronta'))

      expect(sospesi).toHaveLength(1)
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('una foto che resta sopra il limite ANCHE dopo la compressione non parte, e lo dice', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      // La libreria ha un tetto ma non lo garantisce: se non riesce a
      // scendere restituisce ciò che ha ottenuto.
      comprimiMock.mockResolvedValueOnce(fileDaByte('enorme.jpg', 'image/jpeg', 55 * MB))

      await utente.upload(inputGalleria(container), fileDaByte('enorme.jpg', 'image/jpeg', 90 * MB))
      await utente.click(screen.getByText('scegli-impronta'))

      expect(sospesi).toHaveLength(0)
      const avviso = await screen.findByRole('alert')
      expect(avviso.textContent).toContain('55,0 MB')
    })

    it('fra tre file, solo quello troppo pesante si ferma: gli altri due partono', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      comprimiMock.mockImplementation(async (file: File) => file)

      await utente.upload(inputGalleria(container), [
        fileDaByte('a.pdf', 'application/pdf', 1 * MB),
        fileDaByte('troppo.pdf', 'application/pdf', 70 * MB),
        fileDaByte('c.pdf', 'application/pdf', 1 * MB),
      ])
      await utente.click(screen.getByText('scegli-altro'))

      expect(sospesi).toHaveLength(2)
      const avviso = await screen.findByRole('alert')
      // La frase dice DI QUALE file parla: con tre carte uguali, senza il nome
      // l'utente non sa quale togliere.
      expect(avviso.textContent).toContain('troppo.pdf')
    })
  })

  // ══ IL FORMATO — il difetto vivo (a): WebP non può avere il colore pieno ══
  describe('la compressione chiede JPEG, mai WebP (D237②)', () => {
    it('spia sulle opzioni passate alla libreria: `image/jpeg`, e nessun «webp» nel file', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      await utente.upload(inputGalleria(container), fileDaByte('foto.jpg', 'image/jpeg', 900 * 1024))
      await utente.click(screen.getByText('scegli-impronta'))

      expect(comprimiMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fileType: 'image/jpeg' })
      )

      // 🛑 E la compressione NON si richiama più da qui a mano: passa dal
      // modulo che controlla anche cosa è tornato indietro. Una spia sulla
      // stringa «image/webp» non servirebbe — la trova anche in un commento
      // che ne racconta la storia; questa guarda la dipendenza, che è
      // l'invariante vero: chi reintroducesse una compressione locale
      // reintrodurrebbe anche il silenzio su Safari.
      const src = readFileSync('src/components/features/lavori/form/TabImmagini.tsx', 'utf-8')
      expect(src).not.toMatch(/from\s+['"]browser-image-compression['"]/)
    })

    it('il PDF non passa MAI dalla compressione (D237: i PDF non si comprimono in nessun caso)', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      await utente.upload(inputGalleria(container), fileDaByte('modulo.pdf', 'application/pdf', 1 * MB))
      await utente.click(screen.getByText('scegli-altro'))

      expect(comprimiMock).not.toHaveBeenCalled()
      expect(sospesi).toHaveLength(1)
    })
  })

  // ══ LA TRAPPOLA NOTA — ancoraFocus stabile attraverso i render ══════════
  describe('FoglioCategoria — `ancoraFocus` (trappola nota del brief)', () => {
    it('è la STESSA identità attraverso un re-render del genitore, mai un letterale ricreato', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
      await utente.upload(inputGalleria(container), file)

      const primaChiamata = foglioCalls.at(-1)
      const lunghezzaPrima = foglioCalls.length
      expect(primaChiamata?.aperto).toBe(true)

      // Forza un re-render di TabImmagini SENZA toccare il foglio: il
      // listener di resize aggiorna `windowW`, uno stato TUTTO SUO. 🛑 jsdom
      // parte da `innerWidth: 1024` e un `resize` che non lo cambia farebbe
      // scrivere a `setWindowW` lo STESSO valore — React salterebbe il
      // render (bailout su stato invariato) e lo stub non verrebbe MAI
      // richiamato una seconda volta: cambio davvero la larghezza, prima.
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      })
      await act(async () => {
        window.dispatchEvent(new Event('resize'))
      })

      // 🛑 Prova che lo stub sia stato DAVVERO richiamato una seconda volta
      // (non che React abbia bypassato il render): senza questa riga
      // `secondaChiamata` potrebbe essere lo STESSO oggetto della prima per
      // assenza di un secondo render, e il confronto sotto passerebbe per il
      // motivo sbagliato — proprio la trappola che questa prova deve chiudere.
      expect(foglioCalls.length).toBeGreaterThan(lunghezzaPrima)

      const secondaChiamata = foglioCalls.at(-1)
      expect(secondaChiamata?.aperto).toBe(true)
      expect(secondaChiamata?.ancoraFocus).toBe(primaChiamata?.ancoraFocus)
    })

    it('l\'àncora è il bottone Galleria quando i file vengono da lì', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
      await utente.upload(inputGalleria(container), file)

      const bottoneGalleria = screen.getByRole('button', { name: 'Seleziona da galleria o file' })
      const ancora = foglioCalls.at(-1)?.ancoraFocus as { current: HTMLElement | null }
      expect(ancora.current).toBe(bottoneGalleria)
    })

    it('l\'àncora è il bottone Camera quando i file vengono dalla fotocamera', async () => {
      const utente = userEvent.setup()
      const { container } = render(<Harness />)
      const file = new File(['x'], 'scatto.jpg', { type: 'image/jpeg' })
      await utente.upload(inputCamera(container), file)

      const bottoneCamera = screen.getByRole('button', { name: 'Scatta foto con la fotocamera' })
      const ancora = foglioCalls.at(-1)?.ancoraFocus as { current: HTMLElement | null }
      expect(ancora.current).toBe(bottoneCamera)
    })
  })
})
