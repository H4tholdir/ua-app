// Guardia testuale della decisione «gap cassette tablet — variante C fluida»
// (ratifica Francesco 23/07/2026 — docs/design/decisions/2026-07-22-gap-cassette-tablet.md):
// sulla pagina /cassette la spaziatura della parete scala con la larghezza della
// shell (container query), SENZA gradini di media query — 16px sul telefono,
// ~23px a shell 720 (tablet), 26px dal desktop.
// Task 12 (D2, spec redesign §3.1, 25/07) — l'ondata «Redesign parete/home» è arrivata: la
// stanza Parete della home NON ha più una propria superficie CSS (`.ua-stanza-parete*` è
// morta) — monta la STESSA `PareteClient`/`.ds-parete-shell` di `/cassette`, quindi eredita
// questo stesso perimetro fluido by design. Le due guardie che presidiavano il VECCHIO
// perimetro («la home resta fuori», «il leak vettore via home riusa la regola base») sono
// state abrogate e sostituite (panel ARCH R6 + FE R2, spec §5.4) — v. decision record
// `docs/design/decisions/2026-07-25-abrogazione-guardie-stanza-parete.md`.
// Stesso pattern di css-sync.test.ts: il CSS è verificato come testo, jsdom non
// fa layout.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
const norm = css.replace(/\s+/g, ' ')

describe('parete /cassette — variante C fluida (decisione 23/07/2026)', () => {
  it('la shell è il container delle query (cqw risolve sulla larghezza della shell, non del viewport)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \{[^}]*container-type: inline-size;/
    )
  })

  it('il gap della griglia scala fluido SOLO nel perimetro della shell: clamp(16px, 3.6cqw, 26px)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ gap: clamp\(16px, 3\.6cqw, 26px\); \}/
    )
  })

  it('il padding della parete scala con la stessa formula (22-28 / 16-24 / 18-24)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete \{ padding: clamp\(22px, 3\.8cqw, 28px\) clamp\(16px, 3\.2cqw, 24px\) clamp\(18px, 3\.4cqw, 24px\); \}/
    )
  })

  // Task 12 (D2, 25/07) — ABROGATA e SOSTITUITA (panel ARCH R6 + FE R2, spec §5.4; era «assert
  // 4» del piano dell'ondata). La guardia originale presidiava un leak preciso: la home, prima
  // del Task 12, rendeva `.ds-parete`/`.ds-parete-grid` SENZA passare da `.ds-parete-shell` (un
  // proprio `.ua-stanza-parete .ds-parete-grid` sovrascriveva solo le colonne) — rendere fluida
  // la regola BASE l'avrebbe fatta trapelare lì. Quella premessa non esiste più: la home monta
  // la stessa `PareteClient` di `/cassette`, quindi il SUO `.ds-parete-shell` è il perimetro
  // anche per la home — non c'è più un consumatore della regola base fuori da questo perimetro.
  // Le due asserzioni strutturali (loop cqw→shell, valori base verbatim) restano perché vere e
  // utili, ma sotto un titolo che non promette più una guardia specifica per la home.
  it('ogni cqw del foglio vive in un selettore col perimetro .ds-parete-shell — un solo perimetro fluido, home inclusa dal Task 12 in poi', () => {
    const senzaCommenti = css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const m of senzaCommenti.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (/cqw/.test(m[2])) expect(m[1]).toContain('.ds-parete-shell')
    }
    expect(senzaCommenti).toMatch(/\[data-ds="v3"\] \.ds-parete-grid \{ display: grid; grid-template-columns: repeat\(3, 1fr\); gap: 16px; \}/)
    // Task 8 (adeguamento del testo guardato, NON abrogazione — le custom property
    // GRIGLIA FISSA + SNAP ratificate 24/07 vivono PRIMA di position: relative). QA device T15
    // (verbale 2026-07-24, fix 7/e, 25/07 notte) — SECONDO adeguamento del testo guardato: track
    // sale da 4· a 5·passo-maglia (176→220 a scala base) — la VERA altezza massima del tile (T2,
    // due righe) misurata in browser reale clippava il gancio della riga sotto a 4·, v.
    // ds-v3.css per i numeri e per la dimostrazione che la garanzia hook≡wire-center (mod
    // passo-maglia) non dipende dal multiplo scelto.
    expect(senzaCommenti).toMatch(/\[data-ds="v3"\] \.ds-parete \{\s*--passo-maglia: 44px; --track: calc\(var\(--passo-maglia\) \* 5\); --hook-above: 14px;\s*--wall-pad-top: 24px; --wire-center: calc\(var\(--wall-pad-top\) - var\(--hook-above\)\); --wire-w: 3px;\s*position: relative; border-radius: 18px; padding: var\(--wall-pad-top\) 16px 18px;/)
  })

  // Task 12 (D2, 25/07) — ABROGATA e SOSTITUITA (panel ARCH R6 + FE R2, spec §5.4; era «assert
  // 5» del piano dell'ondata: «la home resta FUORI dal perimetro: nessuna regola fluida tocca
  // .ua-stanza-parete»). L'oggetto della guardia (le regole `.ua-stanza-parete*`, il perimetro
  // CSS proprio della vecchia anteprima cap-8) non esiste più — `regole.length` cadrebbe a 0 by
  // design, un RED che certificherebbe solo che il componente è morto, non un difetto. La nuova
  // guardia presidia il contratto CSS che lo sostituisce: la stanza Parete della home è oggi
  // `.ua-stanza-parete-scroll`, il contenitore di scroll interno attorno alla `PareteClient`
  // vera (§3.1) — v. decision record 2026-07-25 per il resto delle regole morte.
  it('la stanza parete della home è il contenitore di scroll del riordino (decisione 2026-07-25)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ua-stanza-parete-scroll \{[^}]*overflow-y: auto;[^}]*overscroll-behavior-y: contain;/
    )
  })

  // QA device (verbale 25/07, fix-list D5a) — CAUSA MISURATA: `.ua-stanza-parete-scroll` non
  // aveva la stessa ricetta nascondi-scrollbar del gemello `.ua-stanza-pile-scroll`
  // (home-fluida.test.tsx, fix 1c): la scrollbar era visibile SOLO sul lato parete del pager,
  // una divergenza rispetto alla route standalone /cassette (che non la mostra — v.
  // `.ds-parete-shell` non scrolla lui, scrolla il body della pagina senza libreria custom).
  // Stessa coppia di proprietà del gemello: lo scroll resta, solo la barra sparisce.
  it('`.ua-stanza-parete-scroll` nasconde la propria scrollbar (scrollbar-width + pseudo-elemento webkit) senza disattivare lo scroll — stessa ricetta del gemello .ua-stanza-pile-scroll', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ua-stanza-parete-scroll \{[^}]*overflow-y: auto;[^}]*overscroll-behavior-y: contain;[^}]*scrollbar-width: none;[^}]*-ms-overflow-style: none;/
    )
    expect(norm).toMatch(/\[data-ds="v3"\] \.ua-stanza-parete-scroll::-webkit-scrollbar \{ display: none; \}/)
  })

  // QA device (verbale 25/07, fix-list D5a) — CAUSA MISURATA: `.ua-stanza { padding: 0 24px
  // 36px }` (regola base, invariata per la stanza Pile) si applicava ANCHE alla stanza Parete
  // dentro il pager, restringendo la shell interna a ≈302px contro i ≈350px della route
  // standalone /cassette (−48px di larghezza utile, misurati a runtime). La stanza Parete
  // eredita già il proprio padding orizzontale da `.ds-parete-shell`/`.ds-parete` (v. sopra):
  // il padding di `.ua-stanza` qui sopra è un secondo strato che la route standalone non ha.
  // Fix scoped SOLO al lato parete via l'attributo `data-stanza` (già scritto da
  // `StanzePager.tsx` su ogni pannello) — la stanza Pile NON viene toccata.
  it('la stanza parete del pager azzera il padding orizzontale duplicato di `.ua-stanza` (D5a — larghezza pari alla route standalone)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ua-stanza\[data-stanza="parete"\] \{ padding-left: 0; padding-right: 0; \}/
    )
  })
})

// Guardia «Task 8 — la rete disegnata» (docs/design/decisions/2026-07-24-rete-gancetto-targa.md
// §Vincoli Task 8-10, mockup ratificato 2026-07-24-rete-gancetto-targa.html rev.3 P=44): la
// maglia metallica fissa sul MURO (.ds-parete, MAI la shell) + la griglia quantizzata
// (grid-auto-rows/row-gap/align-items su .ds-parete-grid) coi valori ratificati.
describe('parete /cassette — rete disegnata «griglia fissa + snap» (ratifica 24/07/2026, P=44; track 4→5 dal QA T15 25/07)', () => {
  it('.ds-parete dichiara i parametri GRIGLIA FISSA + SNAP ratificati (P=44 · track=5P (QA T15, fix 7/e) · hook-above=14 · wall-pad-top=24 · wire-center=wall-pad-top-hook-above · wire-w=3) PRIMA di position: relative — poi la maglia SVG light + fallback colore', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete \{ --passo-maglia: 44px; --track: calc\(var\(--passo-maglia\) \* 5\); --hook-above: 14px; --wall-pad-top: 24px; --wire-center: calc\(var\(--wall-pad-top\) - var\(--hook-above\)\); --wire-w: 3px; position: relative; border-radius: 18px; padding: var\(--wall-pad-top\) 16px 18px;/
    )
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete \{[^}]*background-image: url\("data:image\/svg\+xml,/)
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete \{[^}]*background-size: 44px 44px;/)
    // QA device T15 (verbale 2026-07-24, addendum punto 5) — il fondo del muro era --bg-deep
    // (stonava col fondo pagina, screenshot Francesco): ora è --bg, lo stesso token del
    // page-root che ospita la parete (v. ds-v3.css per il ragionamento completo).
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete \{[^}]*background-color: var\(--bg\);/)
  })

  it('dark = flat, verbatim mockup .notte MA con l\'adeguamento QA T15 (fondo --bg + filo alzato .07→.09 per compensare, v. ds-v3.css): due repeating-linear-gradient (filo rgba(255,255,255,.09), spessore --wire-w) + background-position ancorato a wire-center - wire-w/2', () => {
    expect(norm).toMatch(
      /\[data-theme="dark"\] \[data-ds="v3"\] \.ds-parete \{ --filo-flat: rgba\(255,255,255,\.09\); background: repeating-linear-gradient\(180deg, var\(--filo-flat\) 0 var\(--wire-w\), transparent var\(--wire-w\) var\(--passo-maglia\)\), repeating-linear-gradient\(90deg, var\(--filo-flat\) 0 var\(--wire-w\), transparent var\(--wire-w\) var\(--passo-maglia\)\), var\(--bg\); background-position: 0 calc\(var\(--wire-center\) - var\(--wire-w\) \/ 2\), 0 0, 0 0; \}/
    )
  })

  it('.ds-parete-grid è quantizzata: grid-auto-rows: var(--track), row-gap: 0, align-items: start — SENZA toccare la regola base esistente (gap: 16px resta verbatim per la guardia)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-grid \{ grid-auto-rows: var\(--track\); row-gap: 0; align-items: start; \}/
    )
    // la regola-guardia preesistente non deve sparire: deve continuare a matchare verbatim
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-grid \{ display: grid; grid-template-columns: repeat\(3, 1fr\); gap: 16px; \}/
    )
  })

  // Task 12 (25/07) — il terzo `expect` di questo test («…e nel ramo home a device corti») è
  // una conseguenza MECCANICA (non prescritta dal piano, scoperta in implementazione) della
  // stessa rimozione delle guardie qui sopra: presidiava che `.ua-stanza-parete .ds-parete-grid
  // { row-gap: 0; }` ribadisse la quantizzazione dentro `@media (max-height:780px)`, perché lì
  // `.ua-stanza-parete .ds-parete-grid { gap: 12px; }` (shorthand — azzerava anche row-gap)
  // vinceva per specificità sulla regola base. Quella coppia di regole home-specifiche non
  // esiste più: la home non ha più un proprio ramo di gap fisso, usa lo stesso
  // `.ds-parete-shell .ds-parete-grid` fluido di `/cassette` — la quantizzazione della regola
  // base (Task 8) vale già, senza bisogno di un contro-effetto home-specifico. V. decision
  // record 2026-07-25. Il resto del test (perimetro shell) resta intatto.
  it('il row-gap:0 vince anche dentro il perimetro shell (specificità 0,2,0, DOPO la regola-guardia del gap fluido — non la tocca)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ row-gap: 0; \}/
    )
    // la regola-guardia del gap fluido shell resta intatta (assert esistente riga 24-28)
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ gap: clamp\(16px, 3\.6cqw, 26px\); \}/
    )
  })

  it('passo fluido SOLO nel perimetro shell (riserva FE R1, clamp ratificato 40-50 vs 10.2cqw) — il track resta accoppiato via calc(), non va ridichiarato', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete \{ --passo-maglia: clamp\(40px, 10\.2cqw, 50px\); \}/
    )
  })
})

// QA device T15 (verbale 2026-07-24, addendum punto 5) — «il tile "+ Nuova cassetta" non è
// leggibile sopra la maglia»: NUOVA guardia (il tile non ne aveva una prima) — scrim velato +
// bordo/testo più marcati, contrasto WCAG AA verificato in entrambi i temi (calcolo in
// fixB-report.md, >9:1 light e >13:1 dark contro il fondo scrim+muro peggiore plausibile).
// PROPOSTA per il ri-collaudo di Francesco — v. ds-v3.css per il ragionamento.
describe('parete /cassette — tile «+ Nuova cassetta» leggibile sopra la maglia (QA T15, fix 3)', () => {
  it('scrim velato (non trasparente, non opaco) + tratteggio e testo più marcati, entrambi i temi', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-tray-nuova \{ border: 2\.5px dashed #9C9080; border-radius: 12px; min-height: 104px;/
    )
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-tray-nuova \{[^}]*color: #4A4030; background: rgba\(255, 254, 250, \.68\);/)
    expect(norm).toMatch(
      /\[data-theme="dark"\] \[data-ds="v3"\] \.ds-tray-nuova \{ border-color: #756A5C; color: #EDE6D8; background: rgba\(33, 29, 24, \.62\); \}/
    )
  })
})

// Guardia «Task 11 — colonne della parete in container query» (riserva ARCH R7,
// pre-embed Task 12): le colonne 4/6 della griglia devono rispondere al CONTAINER
// (la shell, già container-type: inline-size), non al viewport — indispensabile per
// l'embed della parete nella home (Task 12), dove la shell non è larga quanto il
// viewport.
describe('parete /cassette — colonne in container query (Task 11, riserva ARCH R7)', () => {
  it('le colonne della griglia rispondono al CONTAINER, non al viewport (riserva ARCH R7)', () => {
    expect(norm).toMatch(/@container \(min-width: 680px\) \{ \[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ grid-template-columns: repeat\(4, 1fr\); \} \}/)
    expect(norm).toMatch(/@container \(min-width: 1060px\) \{ \[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ grid-template-columns: repeat\(6, 1fr\); \} \}/)
    // le vecchie media query viewport sulle colonne NON devono più esistere:
    expect(norm).not.toMatch(/@media \(min-width: 768px\)\s*\{ \[data-ds="v3"\] \.ds-parete-grid/)
  })
})
