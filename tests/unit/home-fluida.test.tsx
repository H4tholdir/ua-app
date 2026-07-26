// Guardia testuale «la home v3 è FLUIDA» (D8, spec §3.3, decisione 2026-07-25) — SOSTITUISCE
// la protezione «home fuori perimetro» abrogata dal Task 12 (v. decision record
// docs/design/decisions/2026-07-25-abrogazione-guardie-stanza-parete.md, che rimanda qui per
// la seconda abrogazione prescritta dal piano dell'ondata). Stesso pattern di
// tests/unit/ds-v3/parete-fluida.test.ts: il CSS è verificato come testo, jsdom non fa layout —
// niente qui presidia che il clamp *risolva* al pixel giusto (quello è compito del QA device,
// Task 15).
//
// Task 14 (D8): il wrapper `.corpo` di HomeV3 diventa un size-container (`container-type:
// size`), che fa risolvere i `cqh` dei blocchi interni (pile, cassette KPI) in base
// all'altezza REALE disponibile — non più i gradini fissi di `@media (max-height: 780px)`
// (morto per legge da questo task in poi). Il piede (`.foot`, col TastoPiù) resta FUORI da
// `.corpo` — non deve mai rimpicciolire — e il degrado scroll P3 (`overflow-y: auto`) resta
// la rete di sicurezza sotto la scala fluida, non un residuo dimenticato.
//
// Fix round 2 (review Task 14, Critical) — il degrado P3 di `.corpo` NON copre la forma
// pager: `.ua-stanze-viewport` (ds-v3.css) è `overflow-y: hidden` e clippa l'overflow della
// stanza Pile due livelli PRIMA che possa mai arrivare a `.corpo`. Verificato in browser
// reale (jsdom non fa layout, non l'avrebbe mai mostrato): a 390×660 con contenuto forzato
// oltre il viewport, `corpo.scrollHeight === corpo.clientHeight` — nessuna superficie di
// scroll si attivava, contenuto irraggiungibile. Il fix dà alla stanza Pile la stessa
// ricetta della stanza Parete (`.ua-stanza-parete-scroll`, già in ds-v3.css): una superficie
// di scroll propria DENTRO `.ua-stanza`, prima del clip. Le due guardie sotto presidiano che
// la regola CSS esista e che `StanzePager.tsx` la applichi davvero al ramo pile.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { spazio } from '@/design-system/v3/tokens'
import { dichiarazioniDi, contenutoMedia } from '../helpers/css'

const srcHome = readFileSync(join(process.cwd(), 'src/components/features/home/HomeV3.tsx'), 'utf8')
const srcCss = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
const srcPager = readFileSync(join(process.cwd(), 'src/components/features/home/StanzePager.tsx'), 'utf8')

describe('HomeV3 — scala verticale fluida + pile centrate (D8, §3.3)', () => {
  it('il wrapper interno è un size-container e i blocchi usano cqh con floor px', () => {
    expect(srcHome).toMatch(/container-type: size/)
    // QA device (verbale 2026-07-24 «Ri-collaudo device #2», fix-list G2b) — ceiling
    // salito da 16px (spazio.m) a 20px (spazio.ml, v3/tokens.ts §4.2): il floor/preferred
    // cqh (che governa il degrado sui device corti, D2) resta invariato, guardia aggiornata
    // sotto (describe dedicato G2b) col resto del gradino.
    expect(srcHome).toMatch(/gap: clamp\(8px, 2\.2cqh, 20px\)/)
  })

  // Review finale whole-branch — il nome diceva «il degrado scroll P3 resta», ma l'asserzione
  // era un `toMatch(/overflow-y: auto/)` senza alcun ancoraggio: prendeva la prima occorrenza
  // del testo ovunque nel sorgente (oggi la regola vera solo perché i commenti vicini scrivono
  // `overflow-y:auto` senza lo spazio — una coincidenza tipografica, non una garanzia). E
  // taceva il fatto più importante: la regola vive dentro `@media (max-width: 767px)`, quindi
  // la rete di sicurezza esiste SOLO sotto i 768px. Ora è ancorata al selettore, dentro quel
  // media, e il nome lo dice.
  it('il degrado scroll P3 di `.corpo` resta — ma vale solo sotto i 768px, dove la regola vive', () => {
    const sottoI768 = contenutoMedia(srcHome, /max-width:\s*767px/)
    expect(dichiarazioniDi(sottoI768, '.ua-home .corpo')).toContain('overflow-y: auto')
    // Rinforzo, con la sua portata dichiarata: nella regola BASE di `.corpo` (la prima con
    // quel selettore — `dichiarazioniDi` guarda solo quella) non c'è overflow-y. È il
    // size-container della scala fluida: lo scroll è il degrado, non il comportamento normale.
    // Una seconda regola `.ua-home .corpo` fuori dal media sfuggirebbe a questa riga; a
    // prendere quel caso è comunque la corsa completa del QA device, non una guardia testuale.
    const base = dichiarazioniDi(srcHome, '.ua-home .corpo')
    expect(base).not.toBeNull()
    expect(base?.some((d) => d.startsWith('overflow-y'))).toBe(false)
  })

  it('la vecchia scala a gradini è morta', () => {
    expect(srcHome).not.toMatch(/@media \(max-height: 780px\)/)
  })
})

// QA device (verbale 25/07, fix-list D2) — CAUSA MISURATA a 390×640: `.ua-stanza-pile-scroll`
// box 377px vs `scrollHeight` 446px (67 overflow); `justify-content: center` di `.pile` centra
// l'eccesso invece di ancorarlo in alto — la 4ª pila finisce interamente sotto la piega, dove
// prima cominciavano i dot (ora morti, E1). Fix: `safe center` — centra quando ci sta, degrada
// ad ancoraggio in alto quando sfora (l'eccesso cade nel fondo scrollabile, mai nascosto).
// Supporto verificato per i target del collaudo (Chrome Android, Safari iOS correnti): il
// valore `safe` per `justify-content` è supportato da entrambi da tempo — da riverificare su
// device reale in FASE 9 (QA browser), non un blocco: la doppia dichiarazione (v. sotto) rende
// innocuo anche un eventuale mancato supporto.
// Fallback progressivo, non un salto secco: la dichiarazione `center` PRIMA di `safe center`
// nella stessa regola tiene il comportamento di oggi su un ipotetico motore che non
// riconoscesse `safe` (un parser CSS scarta la seconda dichiarazione se il valore non è
// valido, mai l'intera regola — l'ultima dichiarazione VALIDA vince).
describe('HomeV3 — D2: `.pile` degrada a "safe center" (mai una pila nascosta dal centraggio)', () => {
  it('`.ua-home .pile` dichiara center come fallback E POI safe center (progressive enhancement)', () => {
    expect(srcHome).toMatch(/\.ua-home \.pile \{[^}]*justify-content: center; justify-content: safe center;/)
  })

  // D2 — CALCOLO DOCUMENTATO, non un test (review finale whole-branch: qui c'erano quattro
  // `expect` che verificavano aritmetica su letterali dichiarati tre righe sopra — `expect(4 +
  // 44).toBe(48)` e simili. Sarebbero passati anche con `HomeV3.tsx` cancellato: contavano
  // nella suite senza presidiare nulla. Un commento documenta il calcolo altrettanto bene).
  //
  // Misure del QA device a 390×640: `.ua-stanza-pile-scroll` alta 377px contro 446px di
  // contenuto → 69px di sforo. La rimozione dei dot (E1) restituisce il margin-top di
  // `.ua-stanze-dots` (4px) più l'intera hit-area del tablist (44px, touch target di legge) =
  // 48px, quindi la scatola sale a 425px e lo sforo scende a 21px. Non è azzerato — la
  // taratura fine del clamp resta demandata, già a ledger — ma con `safe center` l'eccesso
  // residuo è SEMPRE raggiungibile in fondo allo scroll, mai nascosto dal centraggio: è quella
  // la garanzia, e la presidia il test qui sopra sulla doppia dichiarazione.
})

describe('StanzePager — la stanza Pile ha una sua superficie di scroll interna (fix round 2, Critical P3 pager)', () => {
  it('`.ua-stanza-pile-scroll` esiste in ds-v3.css con la stessa ricetta di `.ua-stanza-parete-scroll`', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\]\s*\.ua-stanza-pile-scroll\s*\{[^}]*flex:\s*1;\s*min-height:\s*0;[^}]*overflow-y:\s*auto;/
    )
  })

  it('StanzePager.tsx avvolge il contenuto della stanza pile in `.ua-stanza-pile-scroll`', () => {
    expect(srcPager).toMatch(/className="ua-stanza-pile-scroll"/)
  })

  // QA device T15 (verbale 2026-07-24, fix 1c) — «barra grigia laterale fissa nella home» era
  // la scrollbar di QUESTA rete di sicurezza: resta funzionante (overflow-y: auto invariato,
  // guardia sopra) ma non deve più essere VISIBILE. Verificato in browser reale (non jsdom, che
  // non renderizza scrollbar): `.superpowers/sdd/fixB-report.md` — scrollbarWidth passa da
  // 'auto' a 'none' a parità di overflow.
  it('`.ua-stanza-pile-scroll` nasconde la propria scrollbar (scrollbar-width + pseudo-elemento webkit) senza disattivare lo scroll', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\]\s*\.ua-stanza-pile-scroll\s*\{[^}]*overflow-y:\s*auto;[^}]*scrollbar-width:\s*none;[^}]*-ms-overflow-style:\s*none;/
    )
    expect(srcCss).toMatch(/\[data-ds="v3"\]\s*\.ua-stanza-pile-scroll::-webkit-scrollbar\s*\{\s*display:\s*none;\s*\}/)
  })
})

// QA device (verbale 2026-07-24 «Ri-collaudo device #2», fix-list G2a) — la clip
// dell'ombra dell'ultima pila era già stata risolta nel pager delle stanze (Collaudo R2/R3,
// `552e9f5`/`b8dbd31`: 36px di respiro) con un padding-bottom messo su `.ua-stanza`. Il fix
// round 2 (Task 14, `ff65f21`, arrivato DOPO quei due commit) ha inserito
// `.ua-stanza-pile-scroll` come unico figlio flex:1 di `.ua-stanza`, con un proprio
// `overflow-y: auto`: da quel momento è QUESTO il contenitore che clippa davvero, e il
// padding-bottom di `.ua-stanza` (un livello più fuori) è diventato spazio morto SOTTO il
// clip — la regressione osservata il 24/07. Le due guardie sotto presidiano la CAUSA (non
// solo l'effetto): il respiro deve stare nella scatola che clippa, non fuori da essa.
describe('HomeV3/ds-v3.css — G2a: il respiro dell\'ombra vive nella scatola che clippa davvero (regressione post `ff65f21`)', () => {
  it('`.ua-stanza` non porta più il padding-bottom morto (era un livello troppo fuori rispetto al clip vero)', () => {
    expect(srcCss).toMatch(/\[data-ds="v3"\] \.ua-stanza \{[^}]*padding: 0 24px;/)
    // Guardia negativa esplicita: se qualcuno reintroducesse un terzo valore qui, tornerebbe
    // a essere spazio morto (v. commento in ds-v3.css) — non un semplice refuso da tollerare.
    expect(srcCss).not.toMatch(/\[data-ds="v3"\] \.ua-stanza \{[^}]*padding: 0 24px 36px;/)
  })

  // Calcolo documentato (riusato verbatim da `b8dbd31`, non un numero nuovo): l'estensione
  // massima dell'ombra --sh-card sotto il bordo della card è offset-y 16 + spread −18 + blur
  // 30 = 28px; il respiro aggiunge 8px di margine oltre quel massimo → 36px. Anche qui le due
  // `expect` aritmetiche su letterali sono state tolte (review finale whole-branch): non
  // toccavano né il CSS né il componente.
  it('`.ua-stanza-pile-scroll` porta il respiro (36px = 28px d\'ombra + 8px di margine) DENTRO il proprio overflow-y:auto', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\]\s*\.ua-stanza-pile-scroll\s*\{[^}]*overflow-y:\s*auto;[^}]*padding-bottom:\s*36px;/
    )
  })
})

// QA device (verbale 2026-07-24 «Ri-collaudo device #2», fix-list G2b, ratificata da
// Francesco — la taratura del clamp era demandata, v. commento D2 sopra) — «ingrandiamo le
// pile sfruttando lo spazio libero tra l'ultima pila ed il pulsante nuovo lavoro»: il ceiling
// di gap/margin-top/padding-verticale della card sale di UN gradino sulla scala chiusa 8px
// (`spazio` in src/design-system/v3/tokens.ts, §4.2: …12·16·20·24…) — 16 (spazio.m) → 20
// (spazio.ml), lo stesso valore già usato come padding verticale canonico di `.ds-pila` fuori
// dalla home (ds-v3.css riga ~116: `padding: 20px 22px`). Il font-size del numero resta
// fermo a 52 = `tipografia.size.display`, la cima della scala tipografica CHIUSA (§4.1): non
// c'è un gradino sopra senza uscire dal vocabolario chiuso.
describe('HomeV3 — G2b: le pile crescono nello spazio libero (ceiling sul gradino 8px sopra, mai un numero nuovo)', () => {
  it('gap e margin-top di `.pile` salgono al ceiling 20px (spazio.ml) — floor/preferred cqh (degrado D2) invariati', () => {
    expect(srcHome).toMatch(/gap: clamp\(8px, 2\.2cqh, 20px\); margin-top: clamp\(8px, 1\.8cqh, 20px\);/)
  })

  it('il padding verticale di `.ds-pila` sale allo stesso ceiling 20px — pari al padding verticale canonico di `.ds-pila` fuori dalla home', () => {
    expect(srcHome).toMatch(/\.ua-home \.pile \.ds-pila \{ padding: clamp\(11px, 1\.9cqh, 20px\) 18px; \}/)
    expect(srcCss).toMatch(/\[data-ds="v3"\] \.ds-pila \{ padding: 20px 22px; \}/)
  })

  it('il font-size del numero resta al tetto della scala tipografica chiusa (52px) — nessun gradino sopra senza uscire dal vocabolario chiuso', () => {
    expect(srcHome).toMatch(/\.ua-home \.pile \.ds-pila-num \{ font-size: clamp\(38px, 6\.5cqh, 52px\); \}/)
  })

  // Review finale whole-branch — questo test ricopiava la scala a mano (`[4, 8, 12, 16, 20,
  // 24, 32, 44]`), cioè presidiava una COPIA della verità invece della verità: se `spazio.ml`
  // diventasse 18, il tetto di 20px scritto nel CSS smetterebbe di essere un gradino del
  // token e il test resterebbe verde lo stesso. Ora la scala si legge dai token e i due
  // gradini si RICAVANO da lì — la loro identità numerica (16 e 20) resta asserita perché è
  // quella che compare nel CSS controllato dai test qui sopra.
  it('il gradino scelto (spazio.m → spazio.ml) è il successivo sulla scala 8px dei token, non un valore inventato', () => {
    const scala8px = Object.values(spazio) // tokens.ts §4.2 — xs·s·sm·m·ml·l·xl·xxl, in ordine
    expect(spazio.m).toBe(16) // il vecchio ceiling, e il valore che il CSS aveva prima di G2b
    expect(spazio.ml).toBe(20) // il nuovo, quello scritto nei clamp presidiati qui sopra
    expect(scala8px.indexOf(spazio.ml)).toBe(scala8px.indexOf(spazio.m) + 1)
  })
})
