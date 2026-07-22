// Guardia testuale della decisione «gap cassette tablet — variante C fluida»
// (ratifica Francesco 23/07/2026 — docs/design/decisions/2026-07-22-gap-cassette-tablet.md):
// sulla pagina /cassette la spaziatura della parete scala con la larghezza della
// shell (container query), SENZA gradini di media query — 16px sul telefono,
// ~23px a shell 720 (tablet), 26px dal desktop. La home (.ua-stanza-parete) NON
// è nel perimetro: resta ai valori fissi misurati del collaudo R3b (744px
// compatta) finché non arriva l'ondata «Redesign parete/home».
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

  it('la home resta FUORI dal perimetro: nessuna regola fluida tocca .ua-stanza-parete', () => {
    // Le regole della stanza-parete non devono contenere clamp/cqw: la compatta
    // R3b (gap 12, misure 744px) è sanzionata e non va alterata da questo giro.
    // I commenti CSS vanno spogliati PRIMA del match: menzionare la stanza-parete
    // in un commento è lecito (e succede), toccarne le regole no.
    const senzaCommenti = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const regole = [...senzaCommenti.matchAll(/\.ua-stanza-parete[^{]*\{([^}]*)\}/g)]
    expect(regole.length).toBeGreaterThan(0) // la guardia deve guardare qualcosa
    for (const m of regole) {
      expect(m[1]).not.toMatch(/clamp|cqw/)
    }
  })
})
