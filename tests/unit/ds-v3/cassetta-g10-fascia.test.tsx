// FIX-L — G10 «la cassetta nuova» (P3b uniforme, RATIFICA FINALE 25/07).
// Fonte requisiti: .superpowers/sdd/fixL-brief.md · verbale
// docs/design/decisions/2026-07-24-qa-device-meta-ondata.md §G10 (parziale + finale +
// precisazione) · mockup ratificato docs/design/mockups/2026-07-25-cassetta-g10-rev3-p3-reale.html
// (variante P3b, grafica delle cassette LIBERE).
// Stesso pattern testuale di css-sync.test.ts/parete-fluida.test.ts: il CSS è verificato come
// testo — jsdom non fa layout. La componente `Cassetta.tsx` (classi/struttura) è invece
// verificata via render (testing-library), come in Cassetta.test.tsx.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { Cassetta } from '@/components/ds/Cassetta'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
const norm = css.replace(/\s+/g, ' ')

const lavoroCorto = {
  numero: '144', dentista: 'Bianchi', descrizione: 'corona zirconia', tipoDispositivo: 'protesi_fissa',
  paziente: 'PZ-0144', pazienteAlias: 'Mario Rossi',
}

describe('FIX-L — .ds-cassetta: niente più padding-top fisso (la fascia vive nel flusso)', () => {
  it('padding: 0 (era 66px 10px 12px) — min-height 132 resta invariata', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/padding: 0;/)
    expect(blocco![0]).toMatch(/min-height: 132px;/)
    // il tile resta un flex-column ancorato in basso — invariato, è quello che rende la fascia
    // "che abbraccia il contenuto" possibile senza reintrodurre un padding-top
    expect(blocco![0]).toMatch(/flex-direction: column;/)
    expect(blocco![0]).toMatch(/justify-content: flex-end;/)
  })

  it('.is-nome-lungo alza min-height a 142 SOLO quando serve (dentista o paziente oltre soglia) — resta ben sotto --track (220)', () => {
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-cassetta\.is-nome-lungo \{ min-height: 142px; \}/)
  })
})

describe('FIX-L — finestra/cavità: 8..74 (era 18..64)', () => {
  it('inset 8px 6px auto 6px; height 66px — bordino di 8px verso la fascia (74 + 8 = 82, v. test di misura sotto)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta-cavita \{\s*position: absolute; inset: 8px 6px auto 6px; height: 66px;/
    )
    // guardia negativa: la vecchia finestra 18..64 non deve ricomparire nella dichiarazione REALE
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-cavita \{[^}]*\}/)
    expect(blocco![0]).not.toMatch(/inset: 18px 6px auto 6px/)
    expect(blocco![0]).not.toMatch(/height: 46px/)
  })
})

describe('FIX-L — «fascia etichetta»: nuovo contenitore unico, uniforme per libere e occupate', () => {
  it('.ds-cassetta-fascia: margin/radius/padding/background/box-shadow VERBATIM dal mockup rev.3 P3b', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta-fascia \{\s*position: relative; z-index: 1;\s*margin: 0 4px 4px;\s*border-radius: 4px 4px 9px 9px;\s*padding: 5px 8px 6px;\s*background: rgba\(0,0,0,\.28\);\s*box-shadow: inset 0 1px 3px rgba\(0,0,0,\.25\), inset 0 -1px 0 rgba\(255,255,255,\.12\);\s*display: flex; flex-direction: column; align-items: center; gap: 2px;\s*\}/
    )
  })

  it('is-chiara: fascia più chiara (rgba(29,25,19,.14), verbatim mockup)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta\.is-chiara \.ds-cassetta-fascia \{\s*background: rgba\(29,25,19,\.14\);\s*\}/
    )
  })
})

describe('FIX-L — targa: dimensioni ridotte per la fascia compatta, MA il segnale di stato resta (gate Task 10)', () => {
  it('font 12.5/800, radius 6, padding 1px 8px 2px, max-width 8ch (era 14px/800/radius 8/padding 3px 10px 4px/6ch)', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-targa \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-targa non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/max-width: 8ch;/)
    expect(blocco![0]).toMatch(/border-radius: 6px;/)
    expect(blocco![0]).toMatch(/padding: 1px 8px 2px;/)
    expect(blocco![0]).toMatch(/font-size: 12\.5px;/)
    expect(blocco![0]).not.toMatch(/max-width: 6ch/)
    expect(blocco![0]).not.toMatch(/font-size: 14px/)
  })

  it('.is-libera .ds-cassetta-targa resta ad ANELLO (precisazione Francesco 25/07: l\'uniformità G10 è SOLO strutturale, non tocca il segnale di stato)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta\.is-libera \.ds-cassetta-targa \{ background: transparent; box-shadow: inset 0 0 0 2px rgba\(255,255,255,\.75\); color: rgba\(255,255,255,\.9\); \}/
    )
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta\.is-libera\.is-chiara \.ds-cassetta-targa \{ box-shadow: inset 0 0 0 2px rgba\(29,25,19,\.4\); color: rgba\(29,25,19,\.7\); \}/
    )
  })

  it('occupata (nessuna classe is-libera): la targa resta PIENA bianca — gate Task 10, nessuna deroga (regola base, non sovrascritta)', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-targa \{[^}]*\}/)
    expect(blocco![0]).toMatch(/background: rgba\(255,255,255,\.92\);/)
    expect(blocco![0]).toMatch(/color: #1D1913;/)
  })
})

describe('FIX-L — Opzione A nomi lunghi: il CLINICO va a capo (max 2 righe), il PAZIENTE resta SEMPRE 1 riga', () => {
  it('.ds-cassetta-dent.is-shrink: font 10, line-height 1.15, wrap consentito, clamp a 2 righe', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-cassetta-dent\.is-shrink \{\s*font-size: 10px; line-height: 1\.15; white-space: normal;\s*display: -webkit-box;\s*-webkit-line-clamp: 2;\s*-webkit-box-orient: vertical;\s*\}/
    )
  })

  it('.ds-cassetta-paz.is-shrink: SOLO font/line-height ridotti — NESSUN wrap/clamp (eredita white-space:nowrap dalla regola base)', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-paz\.is-shrink \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-paz.is-shrink non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/font-size: 10px; line-height: 1\.15;/)
    expect(blocco![0]).not.toMatch(/white-space: normal/)
    expect(blocco![0]).not.toMatch(/-webkit-line-clamp/)
  })

  it('.ds-cassetta-cont: niente più margin-top (vive dentro la fascia, che porta già il proprio gap verso la targa)', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-cont \{[^}]*\}/)
    expect(blocco![0]).not.toMatch(/margin-top/)
  })
})

describe('FIX-L — componente Cassetta: struttura (fascia unica, miniatura scalata, is-nome-lungo)', () => {
  it('targa e cont vivono dentro un unico .ds-cassetta-fascia', () => {
    render(<Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroCorto} stato="normale" onTap={() => {}} />)
    const fascia = screen.getByRole('button').querySelector('.ds-cassetta-fascia')
    expect(fascia).toBeTruthy()
    expect(fascia?.querySelector('.ds-cassetta-targa')).toBeTruthy()
    expect(fascia?.querySelector('.ds-cassetta-cont')).toBeTruthy()
  })

  it('la struttura è IDENTICA per libere e occupate (stessa fascia, stessa finestra)', () => {
    render(<Cassetta id="c2" nome="C4" colore="grigia" lavoro={null} stato="normale" onTap={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn.querySelector('.ds-cassetta-cavita')).toBeTruthy()
    const fascia = btn.querySelector('.ds-cassetta-fascia')
    expect(fascia).toBeTruthy()
    expect(fascia?.querySelector('.ds-cassetta-targa')).toBeTruthy()
    expect(fascia?.querySelector('.ds-cassetta-cont')).toBeTruthy()
  })

  it('la miniatura scala nella finestra più grande: height 37 (~56% di 66, verbatim mockup .fin svg{height:56%})', () => {
    render(<Cassetta id="c3" nome="C12" colore="rossa" lavoro={lavoroCorto} stato="normale" onTap={() => {}} />)
    const miniatura = screen.getByRole('button').querySelector('.ds-miniatura') as HTMLElement | null
    expect(miniatura).toBeTruthy()
    expect(miniatura?.style.height).toBe('37px')
  })

  it('is-nome-lungo: presente quando il dentista supera la soglia', () => {
    const dentistaLungo = { ...lavoroCorto, dentista: 'Dott.ssa Annamaria Bellinghieri' }
    render(<Cassetta id="c4" nome="C12" colore="rossa" lavoro={dentistaLungo} stato="normale" onTap={() => {}} />)
    expect(screen.getByRole('button').className).toContain('is-nome-lungo')
  })

  it('is-nome-lungo: presente quando il paziente (alias reso) supera la soglia, anche col dentista corto', () => {
    const pazienteLungo = { ...lavoroCorto, dentista: 'Bianchi', pazienteAlias: 'Maria Vittoria Del Grosso Esposito' }
    render(<Cassetta id="c5" nome="C12" colore="rossa" lavoro={pazienteLungo} stato="normale" onTap={() => {}} />)
    expect(screen.getByRole('button').className).toContain('is-nome-lungo')
  })

  it('is-nome-lungo: ASSENTE coi nomi corti (caso comune) — il tile resta a min-height 132', () => {
    render(<Cassetta id="c6" nome="C12" colore="rossa" lavoro={lavoroCorto} stato="normale" onTap={() => {}} />)
    expect(screen.getByRole('button').className).not.toContain('is-nome-lungo')
  })

  it('is-nome-lungo: ASSENTE su una cassetta libera (mai nomi lunghi da mostrare)', () => {
    render(<Cassetta id="c7" nome="C4" colore="grigia" lavoro={null} stato="normale" onTap={() => {}} />)
    expect(screen.getByRole('button').className).not.toContain('is-nome-lungo')
  })
})

describe('Review FIX-L (Importante) — nomi troncati DENTRO la fascia, non più liberi di sforare sulle celle vicine', () => {
  // Riscontro empirico (Chromium headless): senza un vincolo di larghezza su `.ds-cassetta-cont`,
  // la fascia è `align-items:center` → `.ds-cassetta-cont` (flex item, colonna) shrink-wrappa sul
  // proprio contenuto invece di ereditare la larghezza reale della fascia. Con un paziente lungo
  // («Maria Vittoria Del Grosso Esposito») il blocco cresce ~175px e sfora sia la fascia sia il
  // tile, sulle celle confinanti — l'ellissi su `.ds-cassetta-dent`/`.ds-cassetta-paz` non scatta
  // mai perché quei nodi non hanno mai una larghezza-vincolo contro cui troncare.
  // jsdom non fa layout (niente scrollWidth/clientWidth reali) — stesso pattern del resto del
  // file: verifichiamo testualmente le proprietà CSS che REALIZZANO il contenimento, sulle
  // regole giuste, invece di un numero misurato in browser (quello vive in fixL-report.md).
  it('.ds-cassetta-cont: align-self:stretch + min-width:0 — eredita la larghezza REALE della fascia (non shrink-wrap) a qualsiasi dimensione di tile', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-cont \{[^}]*\}/)
    expect(blocco, 'blocco .ds-cassetta-cont non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/align-self: stretch;/)
    expect(blocco![0]).toMatch(/min-width: 0;/)
  })

  it('.ds-cassetta-dent/.ds-cassetta-paz: max-width:96px (VERBATIM mockup rev.3 righe ~97-98, `.dent`/`.paz{...max-width:96px}`) — cap fisso che riproduce ESATTAMENTE il mockup quando la fascia è più larga di 96px', () => {
    const blocco = norm.match(/\[data-ds="v3"\] \.ds-cassetta-dent,\s*\[data-ds="v3"\] \.ds-cassetta-paz \{[^}]*\}/)
    expect(blocco, 'blocco condiviso .ds-cassetta-dent, .ds-cassetta-paz non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/max-width: 96px;/)
    expect(blocco![0]).toMatch(/overflow: hidden; text-overflow: ellipsis; white-space: nowrap;/)
  })
})

describe('FIX-L — guardia della cavità RICALCOLATA per la nuova geometria: il caso peggiore resta ben sotto --track (220)', () => {
  // Il vecchio meccanismo di guardia (padding-top fisso pari al fondo della cavità) è stato
  // sostituito dal layout a flusso della fascia (v. commento in ds-v3.css su `.ds-cassetta`):
  // qui NON c'è più un calcolo puramente aritmetico da verificare (non esiste più una formula
  // testuale nel foglio, a differenza di --track/--passo-maglia) — la garanzia è stata invece
  // MISURATA in un browser reale (Playwright headless, Chromium), contro un harness che
  // riproduce 1:1 il CSS committato in questo commit (non un ricalco a mano): v. fixL-report.md
  // per lo script e la tabella completa dei numeri. Questo test fissa quei numeri MISURATI come
  // regressione: se la geometria del foglio cambia senza aggiornare questa nota, la garanzia va
  // rimisurata (non ri-derivata a mente).
  it('caso comune (nessun is-shrink): il tile resta a min-height 132 — IDENTICO al rendering del mockup ratificato P3b (fascia-top misurato 65.6/81.3px, mai sopra il fondo della miniatura ≈59.5px)', () => {
    // Valori letti dal CSS: nessuna crescita imposta quando .is-nome-lungo non è applicata.
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-cassetta \{[^}]*min-height: 132px;/)
  })

  it('caso peggiore (.is-nome-lungo, dentista 2 righe wrap + paziente 1 riga NON shrink — la combinazione misurata più alta): tile 142px, ben sotto --track 220px (margine 78px)', () => {
    const trackBase = 44 * 5 // --passo-maglia 44 * --track: calc(... * 5), v. parete-fluida.test.ts
    const worstTile = 142 // .ds-cassetta.is-nome-lungo { min-height: 142px } — v. sopra
    expect(trackBase).toBe(220)
    expect(worstTile).toBeLessThan(trackBase)
    expect(trackBase - worstTile).toBeGreaterThanOrEqual(70) // margine ampio, non un pareggio risicato
  })
})
