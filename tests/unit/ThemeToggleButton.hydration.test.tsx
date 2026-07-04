import { describe, it, expect, afterEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { act } from 'react'
import { ThemeToggleButton } from '../../src/components/layout/ThemeToggleButton'

/**
 * Simula la divergenza reale server/client: in Next.js il primo render
 * server-side avviene in Node.js dove `window` non esiste affatto — qui lo
 * rimuoviamo temporaneamente solo per la renderToString(), per riprodurre
 * la stessa condizione (senza questo trucco jsdom fornisce sempre `window`
 * anche "lato server", mascherando il bug reale).
 */
function renderServerHtml(node: React.ReactElement): string {
  const savedWindow = globalThis.window
  // @ts-expect-error rimozione deliberata e temporanea per simulare l'SSR
  delete globalThis.window
  try {
    return renderToString(node)
  } finally {
    globalThis.window = savedWindow
  }
}

/** Idrata catturando i recoverable error di React (via onRecoverableError,
 *  l'API documentata per rilevare mismatch di idratazione) invece di
 *  affidarsi a console.error, che in React 19 non è l'unico canale usato. */
async function hydrateAndCollectErrors(container: HTMLElement, node: React.ReactElement): Promise<string[]> {
  const errors: string[] = []
  await act(async () => {
    hydrateRoot(container, node, {
      onRecoverableError: (error) => { errors.push(String((error as Error)?.message ?? error)) },
    })
  })
  return errors
}

describe('ThemeToggleButton — hydration (B18.8)', () => {
  afterEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
  })

  it('nessun mismatch di idratazione quando il tema salvato in localStorage è "dark"', async () => {
    localStorage.setItem('ua-theme', 'dark')

    const html = renderServerHtml(<ThemeToggleButton />)
    // Il rendering server deve assumere il default "light" — la correttezza
    // dell'aria-label finale (dopo il mount) è verificata a parte più sotto.
    expect(html).toContain('Passa al tema scuro')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    const errors = await hydrateAndCollectErrors(container, <ThemeToggleButton />)

    expect(errors.some((e) => /hydrat/i.test(e))).toBe(false)
  })

  it('dopo il mount, l\'aria-label riflette il tema reale salvato in localStorage', async () => {
    localStorage.setItem('ua-theme', 'dark')

    const html = renderServerHtml(<ThemeToggleButton />)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    await hydrateAndCollectErrors(container, <ThemeToggleButton />)

    const button = container.querySelector('button')
    expect(button?.getAttribute('aria-label')).toBe('Passa al tema chiaro')
  })
})
