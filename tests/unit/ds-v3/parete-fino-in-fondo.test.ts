// Verifica finale wave H (verbale `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`,
// APPEND 26/07, difetto 1b) — «sopra la barra delle gesture di android c'è una striscia panna,
// vorrei eliminarla». RATIFICATA da Francesco: «il muro arriva fino in fondo».
//
// CAUSA MISURATA (Playwright su :3020, muro più alto del viewport, scrollato a fondo):
// `.ds-parete-shell` portava `padding-bottom: 40px` — 40px FUORI dal muro, in cui si vedeva il
// fondo pagina panna PIATTO, senza la trama della rete. Il muro (`.ds-parete`) chiudeva quindi
// a 40px dal bordo inferiore dello schermo. Nessun overlay sovrapposto: il muro finiva prima.
//
// FIX: i 40px si spostano DENTRO il muro (sommati al suo `padding-bottom` di 18px) invece di
// stare fuori. Il muro cresce fino al bordo e la sua trama ci arriva; lo spazio fra l'ultima
// fila di cassette e il bordo NON cambia — cambia solo di che cosa è fatto (rete invece che
// panna liscia). In più `env(safe-area-inset-bottom)`: sui telefoni con barra gesture il muro
// deve arrivare ANCHE sotto la barra, che è il punto da cui è nata la segnalazione.
// Prima/dopo misurato: striscia liscia 40px → 0px a 390 e 768, light e dark
// (`docs/design/screenshots/2026-07-26-fix-collaudo/1b-muro-*`).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')

/** Le dichiarazioni della regola `[data-ds="v3"] <selettore> { … }`. */
function regola(selettore: string): string {
  const i = css.indexOf(`[data-ds="v3"] ${selettore} {`)
  expect(i, `regola \`${selettore}\` non trovata in ds-v3.css`).toBeGreaterThan(-1)
  return css.slice(i, css.indexOf('\n}', i))
}

describe('Parete — il muro arriva fino in fondo (difetto 1b, ratificato 26/07)', () => {
  it('la shell non tiene più i 40px di panna liscia sotto il muro', () => {
    const shell = regola('.ds-parete-shell')
    const padding = shell.match(/\n\s*(?:.*;\s*)*?\s*padding: *([^;]+);/)?.[1]
      ?? shell.match(/padding: *([^;]+);/)?.[1]
    expect(padding, 'dichiarazione `padding` della shell non trovata').toBeDefined()
    expect(padding, 'la shell non deve più chiudere con 40px di padding in fondo')
      .not.toMatch(/40px\s*$/)
  })

  it('lo spazio recuperato vive DENTRO il muro, insieme alla safe-area', () => {
    const parete = regola('.ds-parete')
    const padding = parete.match(/padding: *([^;]+);/)?.[1]
    expect(padding, 'dichiarazione `padding` del muro non trovata').toBeDefined()
    // i 18px originali restano la base, i 40px della shell si sommano qui
    expect(padding).toMatch(/18px/)
    expect(padding).toMatch(/40px/)
    // sotto la barra gesture Android/iOS il muro deve continuare
    expect(padding).toMatch(/env\(safe-area-inset-bottom/)
  })

  // ⚠️ LA GUARDIA CHE MANCAVA (round 2, difetto trovato da una verifica indipendente).
  // Le due asserzioni sopra guardano la regola BASE di `.ds-parete` e passavano — ma sulla
  // build vera il `padding-bottom` risolveva a 18px, cioè il recupero non arrivava a schermo:
  // `[data-ds="v3"] .ds-parete-shell .ds-parete` RIDICHIARA lo shorthand `padding` e, avendo
  // specificità più alta (0,3,0 contro 0,2,0), sostituisce l'intero valore — silenziosamente.
  // Entrambe le superfici che montano il muro (`/cassette` e la stanza parete della home)
  // stanno dentro `.ds-parete-shell`, quindi il recupero era morto OVUNQUE.
  // Guardare una regola sola non basta: qui si pretende il recupero da OGNI regola del foglio
  // che dichiari `padding` su `.ds-parete`, quale che sia il selettore. Una regola nuova che
  // domani ridichiarasse lo shorthand senza il recupero fallirebbe subito.
  //
  // Verifica finale d'ondata (26/07, difetto A5) — il regex pretendeva che il selettore FINISSE
  // su `.ds-parete`: `.ds-parete.is-compatta { padding: … }` o `.ds-parete:hover { padding: … }`
  // gli sfuggivano del tutto. Sarebbe stato lo stesso identico difetto (uno shorthand più
  // specifico che scarta in silenzio il recupero) a una forma di selettore di distanza, sotto una
  // guardia che promette «OGNI regola del foglio». Ora si accettano anche le parti composte e le
  // pseudo-classi in coda; la negative lookahead esclude i PARENTI di nome (`.ds-parete-grid`,
  // `.ds-parete-shell`), che sono altri elementi e hanno un padding tutto loro.
  it('OGNI regola che ridichiara il padding del muro porta con sé il recupero del fondo', () => {
    const senzaCommenti = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const regoleConPadding: { selettore: string; padding: string }[] = []
    const re = /([^{}]*\.ds-parete(?![\w-])[^{},]*)\{([^{}]*)\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(senzaCommenti)) !== null) {
      const padding = m[2].match(/(?:^|;)\s*padding: *([^;]+)/)?.[1]
      if (padding) regoleConPadding.push({ selettore: m[1].replace(/\s+/g, ' ').trim(), padding })
    }
    expect(regoleConPadding.length, 'nessuna regola con `padding` su `.ds-parete`: il parser ' +
      'di questa guardia non sta più trovando nulla — va corretto, non ignorato')
      .toBeGreaterThanOrEqual(2)
    for (const { selettore, padding } of regoleConPadding) {
      expect(padding, `\`${selettore}\` ridichiara il padding del muro SENZA i 40px recuperati ` +
        'dalla shell: a schermo il respiro sotto l\'ultima fila torna a 18px').toMatch(/40px/)
      expect(padding, `\`${selettore}\` ridichiara il padding del muro SENZA la safe-area: sui ` +
        'telefoni con barra gesture l\'ultima fila finisce sotto la barra')
        .toMatch(/env\(safe-area-inset-bottom/)
    }
  })

  it('lo spazio in cima al muro non è stato toccato', () => {
    // guardia anti-effetto-collaterale: il fix è SOLO sul fondo. `--wall-pad-top` governa
    // l'aggancio dei gancetti alla prima fila (geometria ratificata H3) — se cambiasse,
    // salterebbe l'allineamento fra ganci e fili della rete.
    expect(regola('.ds-parete')).toMatch(/--wall-pad-top: *24px/)
    expect(regola('.ds-parete')).toMatch(/padding: *var\(--wall-pad-top\) *16px/)
  })
})
