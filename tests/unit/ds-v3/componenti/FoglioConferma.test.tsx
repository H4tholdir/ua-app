import { type RefObject } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { raggio, materia } from '@/design-system/v3/tokens'
import { coreografie } from '@/design-system/v3/motion'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import type { FotoAlbum } from '@/components/ds/CartaAlbum'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { FoglioConferma, variantePannello } from '@/components/ds/FoglioConferma'
import { Sheet } from '@/components/ds/Sheet'

/** Un'àncora vera nel documento: dove il focus deve tornare alla chiusura.
 *  🛑 Dichiarata dal chiamante (F-12), mai catturata: chi apre questa conferma
 *  può essere una voce di menù che sta smontando. */
function ancoraNelDocumento(): RefObject<HTMLElement | null> {
  const tasto = document.createElement('button')
  tasto.textContent = 'apri il menù'
  document.body.appendChild(tasto)
  return { current: tasto }
}

const FOTO_BASE: FotoAlbum = {
  id: 'f-1',
  url: 'https://esempio/scatto.jpg',
  categoria: 'colore',
  created_at: '2026-07-30T10:00:00Z',
  nome_file: 'guida-colore-paziente.jpg',
}

function props(extra: Partial<Parameters<typeof FoglioConferma>[0]> = {}) {
  return {
    aperto: true,
    titolo: 'Elimini questa foto?',
    testo: 'Sparisce dalla scheda e dall\'archivio: non si recupera.',
    etichettaDistruttiva: 'Elimina foto',
    etichettaSicura: 'Annulla',
    foto: FOTO_BASE,
    ancoraFocus: ancoraNelDocumento(),
    onConferma: () => {},
    onAnnulla: () => {},
    ...extra,
  }
}

function pannello(): HTMLElement {
  return screen.getByRole('dialog')
}

function bottoni(): HTMLElement[] {
  return Array.from(pannello().querySelectorAll('button'))
}

function velo(): HTMLElement {
  return document.querySelector('.ds-foglioconferma-velo') as HTMLElement
}

/** jsdom riscrive i colori a modo suo: far passare anche il token dalla stessa
 *  riscrittura lega la prova al token invece che a una stringa ricopiata. */
function comeLoScriveJsdom(valore: string): string {
  const d = document.createElement('div')
  d.style.background = valore
  return d.style.background
}

describe('FoglioConferma — il foglio di conferma prima di cancellare una foto (§5.42)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  // ══ LA GRAMMATICA DELLE DUE AZIONI (§5.17 D82, stessa riga di §5.42) ══════
  describe('le due azioni, e l\'ordine (D82)', () => {
    it('«Annulla» (TastoSecondario) SOPRA, la distruttiva (TastoPrimario) SOTTO — stesso ordine di §5.17', () => {
      render(<FoglioConferma {...props()} />)
      const [primo, secondo] = bottoni()
      expect(primo.textContent).toBe('Annulla')
      expect(secondo.textContent).toBe('Elimina foto')
    })

    it('🔑 il controllo positivo che manca sempre: «Annulla» NON chiama `onConferma`', () => {
      const onConferma = vi.fn()
      const onAnnulla = vi.fn()
      render(<FoglioConferma {...props({ onConferma, onAnnulla })} />)
      fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))
      expect(onAnnulla).toHaveBeenCalledTimes(1)
      expect(onConferma).not.toHaveBeenCalled()
    })

    it('tap sulla distruttiva chiama SOLO `onConferma`, mai `onAnnulla`', () => {
      const onConferma = vi.fn()
      const onAnnulla = vi.fn()
      render(<FoglioConferma {...props({ onConferma, onAnnulla })} />)
      fireEvent.click(screen.getByRole('button', { name: 'Elimina foto' }))
      expect(onConferma).toHaveBeenCalledTimes(1)
      expect(onAnnulla).not.toHaveBeenCalled()
    })

    it('`Escape` chiude e NON conferma', () => {
      const onConferma = vi.fn()
      const onAnnulla = vi.fn()
      render(<FoglioConferma {...props({ onConferma, onAnnulla })} />)
      fireEvent.keyDown(pannello(), { key: 'Escape' })
      expect(onAnnulla).toHaveBeenCalledTimes(1)
      expect(onConferma).not.toHaveBeenCalled()
    })

    it('«indietro» (il popstate del telefono) annulla, non conferma', () => {
      const onConferma = vi.fn()
      const onAnnulla = vi.fn()
      render(<FoglioConferma {...props({ onConferma, onAnnulla })} />)
      fireEvent.popState(window)
      expect(onAnnulla).toHaveBeenCalledTimes(1)
      expect(onConferma).not.toHaveBeenCalled()
    })

    it('tap sul velo annulla, non conferma', () => {
      const onConferma = vi.fn()
      const onAnnulla = vi.fn()
      render(<FoglioConferma {...props({ onConferma, onAnnulla })} />)
      fireEvent.pointerDown(velo())
      fireEvent.click(velo())
      expect(onAnnulla).toHaveBeenCalledTimes(1)
      expect(onConferma).not.toHaveBeenCalled()
    })

    it('il ghost click di Chrome Android (click senza pointerdown) non annulla niente', () => {
      const onAnnulla = vi.fn()
      render(<FoglioConferma {...props({ onAnnulla })} />)
      fireEvent.click(velo())
      expect(onAnnulla).not.toHaveBeenCalled()
    })
  })

  // ══ SUONO E VIBRAZIONE — nessuno, mai, chiamato da QUESTO componente (§1.10) ══
  describe('suono e vibrazione', () => {
    it('uscire senza toccare i tasti (Esc) non emette NESSUN suono/vibrazione: li portano solo i due tasti, per conto proprio', () => {
      render(<FoglioConferma {...props()} />)
      fireEvent.keyDown(pannello(), { key: 'Escape' })
      expect(suonaMock).not.toHaveBeenCalled()
      expect(vibraMock).not.toHaveBeenCalled()
    })
  })

  // ══ IL TASTO DISTRUTTIVO PUÒ ESSERE DISABILITATO (§5.42, F-10) ═══════════
  describe('la cancellazione in volo — il tasto distruttivo si disabilita, «Annulla» resta vivo', () => {
    it('`distruttivaDisabilitata`: il tasto è disabilitato e il click non conferma', () => {
      const onConferma = vi.fn()
      render(<FoglioConferma {...props({ onConferma, distruttivaDisabilitata: true })} />)
      const distruttiva = screen.getByRole('button', { name: 'Elimina foto' }) as HTMLButtonElement
      expect(distruttiva.disabled).toBe(true)
      fireEvent.click(distruttiva)
      expect(onConferma).not.toHaveBeenCalled()
    })

    it('«Annulla» resta attivo mentre la distruttiva è disabilitata: la via di fuga non si chiude mai', () => {
      const onAnnulla = vi.fn()
      render(<FoglioConferma {...props({ onAnnulla, distruttivaDisabilitata: true })} />)
      const sicura = screen.getByRole('button', { name: 'Annulla' }) as HTMLButtonElement
      expect(sicura.disabled).toBe(false)
      fireEvent.click(sicura)
      expect(onAnnulla).toHaveBeenCalledTimes(1)
    })

    it('non disabilitata di default: `distruttivaDisabilitata` è opzionale', () => {
      render(<FoglioConferma {...props()} />)
      expect((screen.getByRole('button', { name: 'Elimina foto' }) as HTMLButtonElement).disabled).toBe(false)
    })
  })

  // ══ L'ANTEPRIMA DELL'OGGETTO (§5.42) ══════════════════════════════════════
  describe('l\'anteprima dell\'oggetto — miniatura, categoria, data (§5.42)', () => {
    it('miniatura 60×60 `raggio.riga - 6`, `alt` = l\'ETICHETTA della categoria', () => {
      render(<FoglioConferma {...props()} />)
      const img = pannello().querySelector('img') as HTMLImageElement
      expect(img.style.width).toBe('60px')
      expect(img.style.height).toBe('60px')
      expect(img.style.borderRadius).toBe(`${raggio.riga - 6}px`)
      expect(img.getAttribute('alt')).toBe('Guida colore')
      expect(img.getAttribute('src')).toBe(FOTO_BASE.url)
    })

    it('l\'etichetta della categoria e la data di caricamento compaiono come testo', () => {
      render(<FoglioConferma {...props()} />)
      expect(screen.getByText('Guida colore')).toBeTruthy()
      expect(screen.getByText(/Caricata il 30 luglio 2026/)).toBeTruthy()
    })

    it('🔴 G5·D75 — l\'indirizzo firmato compare SOLO dentro un `src` di `<img>`: vincolo di POSTO', () => {
      const SENTINELLA = 'FIRMA-SENTINELLA'
      const foto = { ...FOTO_BASE, url: `https://esempio/${SENTINELLA}/scatto.jpg` }
      const { baseElement } = render(<FoglioConferma {...props({ foto })} />)
      const inTutto = (baseElement.innerHTML.match(new RegExp(SENTINELLA, 'g')) ?? []).length
      const dentroSrc = Array.from(baseElement.querySelectorAll('img')).filter((i) =>
        (i.getAttribute('src') ?? '').includes(SENTINELLA),
      ).length
      expect(inTutto).toBe(dentroSrc)
      expect(dentroSrc).toBe(1)
      expect(baseElement.textContent).not.toContain(SENTINELLA)
    })

    it('`nome_file` non finisce da nessuna parte nel reso — è dato del paziente quanto la foto', () => {
      const { baseElement } = render(<FoglioConferma {...props()} />)
      expect(baseElement.innerHTML).not.toContain('guida-colore-paziente.jpg')
    })

    it('🔴 data non interpretabile: niente `RangeError`, la sotto-riga sparisce invece di rompere lo schermo', () => {
      const foto = { ...FOTO_BASE, created_at: 'non-e-una-data' }
      expect(() => render(<FoglioConferma {...props({ foto })} />)).not.toThrow()
      expect(screen.queryByText(/Caricata il/)).toBeNull()
      // La miniatura e l'etichetta restano: solo la data manca.
      expect(screen.getByText('Guida colore')).toBeTruthy()
    })
  })

  // ══ I TESTI — l'oggetto esplicito, e il dizionario ═══════════════════════
  describe('i testi', () => {
    it('il titolo porta l\'oggetto esplicito (contratto del chiamante): è quello che il chiamante passa', () => {
      render(<FoglioConferma {...props({ titolo: 'Elimini questa foto?' })} />)
      expect(screen.getByRole('heading').textContent).toBe('Elimini questa foto?')
    })

    it('il testo ratificato passa il dizionario, ed «e dall\'archivio» è la parte che pesa (D61)', () => {
      render(
        <FoglioConferma
          {...props({
            testo: (
              <>
                Sparisce dalla scheda <strong>e dall&apos;archivio</strong>: non si recupera. Resta annotato
                chi l&apos;ha eliminata e quando.
              </>
            ),
          })}
        />,
      )
      expect(trovaParoleVietate(pannello().textContent ?? '')).toEqual([])
      expect(screen.getByText('e dall\'archivio', { exact: false })).toBeTruthy()
    })

    it('🔴 «elimina definitivamente» è vietata dal dizionario — se il chiamante la scrivesse, la prova se ne accorge', () => {
      render(<FoglioConferma {...props({ testo: 'Vuoi elimina definitivamente questa foto?' })} />)
      expect(trovaParoleVietate(pannello().textContent ?? '')).toContain('elimina definitivamente')
    })

    it('`testo` accetta markup: la parte in `<strong>` pesa di più (§5.42: callout `--muted`, la parte che pesa in `--ink`/700)', () => {
      // La regola vive nel <style> iniettato dal componente stesso (dentro il
      // portale). 🔑 Misurato (non assunto): jsdom APPLICA davvero la cascata
      // da un <style> nel documento, e per `color` risolve al valore
      // letterale della custom property (`var(--ink)`, senza sostituirla) —
      // non a stringa vuota. Si prova quindi il comportamento reale, non solo
      // il testo del foglio di stile.
      render(
        <FoglioConferma
          {...props({
            testo: (
              <>
                testo normale <strong>parte che pesa</strong>
              </>
            ),
          })}
        />,
      )
      const forte = screen.getByText('parte che pesa')
      const normale = screen.getByText(/testo normale/)
      expect(getComputedStyle(forte).fontWeight).toBe('700')
      expect(getComputedStyle(forte).color).toBe('var(--ink)')
      // Il resto del paragrafo NON eredita il peso: solo la clausola marcata.
      expect(getComputedStyle(normale).fontWeight).not.toBe('700')
    })
  })

  // ══ ANATOMIA E STRATO ═════════════════════════════════════════════════════
  describe('il pannello', () => {
    it('è un dialogo vero: `aria-modal`, nome dal titolo, descrizione dal testo', () => {
      render(<FoglioConferma {...props()} />)
      const p = pannello()
      expect(p.getAttribute('aria-modal')).toBe('true')
      const titolo = screen.getByRole('heading')
      expect(p.getAttribute('aria-labelledby')).toBe(titolo.id)
    })

    it('geometria: 100% con tetto 480, raggio.sheet SOLO in alto, 0 in basso, e scorre davvero', () => {
      render(<FoglioConferma {...props()} />)
      const p = pannello()
      expect(p.style.width).toBe('100%')
      expect(p.style.maxWidth).toBe('480px')
      expect(p.style.borderTopLeftRadius).toBe(`${raggio.sheet}px`)
      expect(p.style.borderTopRightRadius).toBe(`${raggio.sheet}px`)
      expect(p.style.borderBottomLeftRadius).toBe('0px')
      expect(p.style.borderBottomRightRadius).toBe('0px')
      expect(p.style.overflowY).toBe('auto')
      expect(p.style.overscrollBehavior).toBe('contain')
    })

    it('faccia `var(--elv)`: un valore solo per tutti e due i temi (ds-v3.css:13 → `--elv: var(--card)`)', () => {
      render(<FoglioConferma {...props()} />)
      expect(pannello().style.background).toBe('var(--elv)')
    })

    it('è il QUARTO strato: z-index 1030, portale su `document.body`', () => {
      const { container } = render(<FoglioConferma {...props()} />)
      expect(container.querySelector('[role="dialog"]')).toBeNull()
      const radice = document.querySelector('.ds-foglioconferma-radice') as HTMLElement
      expect(radice.style.zIndex).toBe('1030')
      expect(radice.parentElement).toBe(document.body)
    })

    it('il velo è quello di casa e ferma il gesto dove nasce', () => {
      render(<FoglioConferma {...props()} />)
      expect(velo().style.background).toBe(comeLoScriveJsdom(materia.scrim))
      expect(velo().style.touchAction).toBe('none')
    })

    it('il manico: 36×4 `var(--line)`, non è un comando — è l\'innesco dello swipe', () => {
      render(<FoglioConferma {...props()} />)
      const manico = pannello().querySelector('.ds-foglioconferma-manico') as HTMLElement
      expect(manico.style.width).toBe('36px')
      expect(manico.style.height).toBe('4px')
      expect(manico.style.background).toBe('var(--line)')
      expect(manico.getAttribute('aria-hidden')).toBe('true')
      expect(manico.tagName).not.toBe('BUTTON')
    })
  })

  // ══ LA STORIA E LO SCORRIMENTO (§1.4, mandato corretto D84) ══════════════
  describe('lo strato', () => {
    it('si registra con la marca `uaSheet`', () => {
      window.history.replaceState({ sentinella: true }, '')
      render(<FoglioConferma {...props()} />)
      expect((window.history.state as Record<string, unknown>)?.uaSheet).toBe(true)
    })

    it('blocca lo scorrimento mentre è aperto e restituisce il valore VERO (non \'\') alla chiusura', () => {
      // Sentinella: nessun bloccante scriverebbe MAI 'scroll'/'7px' — se dopo la
      // chiusura vale ancora questo, il componente ha bloccato E sbloccato davvero.
      document.body.style.overflow = 'scroll'
      document.body.style.paddingRight = '7px'

      const { rerender } = render(<FoglioConferma {...props()} />)
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<FoglioConferma {...props({ aperto: false })} />)
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('7px')
    })

    it('due strati chiusi NELL\'ORDINE SBAGLIATO (prima quello sotto): il corpo torna comunque suo', () => {
      document.body.style.overflow = 'scroll'
      document.body.style.paddingRight = '7px'
      const { rerender } = render(
        <>
          <Sheet aperto onChiudi={() => {}} titolo="Sotto"><p>contenuto</p></Sheet>
          <FoglioConferma {...props()} />
        </>,
      )
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<><FoglioConferma {...props()} /></>)
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<></>)
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('7px')
    })

    it('`Escape` non collassa lo strato di sotto (§1.5)', () => {
      const chiudiSheet = vi.fn()
      render(
        <>
          <Sheet aperto onChiudi={chiudiSheet} titolo="Sotto"><p>contenuto</p></Sheet>
          <FoglioConferma {...props()} />
        </>,
      )
      fireEvent.keyDown(screen.getByRole('dialog', { name: /Elimini questa foto/ }), { key: 'Escape' })
      expect(chiudiSheet).not.toHaveBeenCalled()
    })
  })

  // ══ IL FOCUS — sulla PRIMA azione, che è quella SICURA (§5.42, non D90 pos.) ══
  describe('il focus', () => {
    it('all\'apertura il focus va al tasto SICURO («Annulla»), non al pannello e non alla distruttiva', () => {
      render(<FoglioConferma {...props()} />)
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Annulla' }))
    })

    it('`Tab` TRATTENUTO: due tasti raggiungibili, il giro torna al primo', async () => {
      const utente = userEvent.setup()
      const fuori = document.createElement('a')
      fuori.href = '#main-content'
      fuori.textContent = 'Vai al contenuto'
      document.body.appendChild(fuori)

      render(<FoglioConferma {...props()} />)
      const p = pannello()
      const sicuro = screen.getByRole('button', { name: 'Annulla' })
      const distruttiva = screen.getByRole('button', { name: 'Elimina foto' })

      await utente.tab()
      expect(document.activeElement).toBe(distruttiva)
      await utente.tab()
      expect(document.activeElement).toBe(sicuro)
      expect(p.contains(document.activeElement)).toBe(true)
      expect(document.activeElement).not.toBe(fuori)
    })

    it('alla chiusura il focus torna all\'àncora DICHIARATA dal chiamante', () => {
      const ancoraFocus = ancoraNelDocumento()
      const { rerender } = render(<FoglioConferma {...props({ ancoraFocus })} />)
      rerender(<FoglioConferma {...props({ ancoraFocus, aperto: false })} />)
      expect(document.activeElement).toBe(ancoraFocus.current)
    })

    it('àncora vuota: avvisa in sviluppo — un focus che non torna non si vede in nessuno screenshot', () => {
      const avviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(<FoglioConferma {...props({ ancoraFocus: { current: null } })} />)
      expect(avviso).toHaveBeenCalledTimes(1)
      expect(avviso.mock.calls[0][0]).toContain('FoglioConferma')
      avviso.mockRestore()
    })
  })

  // ══ «RIDUCI MOVIMENTO» — §1.9 B-6, come §5.41 ═════════════════════════════
  describe('«riduci movimento»', () => {
    it('a preferenza SPENTA la coreografia è quella di casa, non una copia', () => {
      expect(variantePannello(false)).toBe(coreografie.sheetSu)
    })

    it('🛑 a preferenza ACCESA: `y` finale = 0 (il pannello ARRIVA) e nessun tween su `y`', () => {
      const ridotta = variantePannello(true)
      expect(ridotta.animate.y).toBe(0)
      expect(ridotta.exit.y).toBe('100%')
      expect(ridotta.animate.transition.y).toEqual({ duration: 0 })
      expect(ridotta.exit.transition.y).toEqual({ duration: 0 })
    })
  })

  // ══ LE FORME CHE NON RENDONO NIENTE ═══════════════════════════════════════
  describe('le forme di ingresso che non rendono niente', () => {
    it('chiuso: niente a schermo e il corpo non si tocca', () => {
      document.body.style.overflow = 'scroll'
      render(<FoglioConferma {...props({ aperto: false })} />)
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.body.style.overflow).toBe('scroll')
    })
  })
})
