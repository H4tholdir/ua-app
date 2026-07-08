import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { act } from 'react'
import { AvvisiProvider } from '@/components/ds/Avviso'

// QA visivo T15: ogni pagina che monta <AvvisiProvider> generava un errore di
// idratazione ad OGNI load (riproducibile al 100% nel browser). Causa: la
// guardia sincrona `typeof document !== 'undefined'` — sul server è false
// (niente contenitore nell'HTML), ma al PRIMO render client document esiste
// già, quindi il <div position:fixed> del contenitore compariva subito →
// mismatch reale. Sheet/DialogConferma con la stessa guardia non lo innescano
// perché il loro contenuto portalato è vuoto finché chiusi; il contenitore di
// Avviso è incondizionato anche con zero toast. Questi test riproducono la
// vera differenza server/client con la stessa tecnica dei test hydration di
// B18 (ThemeToggleButton/useReducedMotion): renderToString senza window né
// document, poi hydrateRoot nel DOM reale.

/**
 * Simula l'SSR reale: in Node.js lato server non esistono NÉ window NÉ
 * document — li rimuoviamo entrambi solo per la renderToString().
 */
function renderServerHtml(node: React.ReactElement): string {
  const savedWindow = globalThis.window
  const savedDocument = globalThis.document
  // @ts-expect-error rimozione deliberata e temporanea per simulare l'SSR
  delete globalThis.window
  // @ts-expect-error rimozione deliberata e temporanea per simulare l'SSR
  delete globalThis.document
  try {
    return renderToString(node)
  } finally {
    globalThis.window = savedWindow
    globalThis.document = savedDocument
  }
}

async function hydrateAndCollectErrors(container: HTMLElement, node: React.ReactElement): Promise<string[]> {
  const errors: string[] = []
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  })
  try {
    await act(async () => {
      hydrateRoot(container, node, {
        onRecoverableError: (error) => { errors.push(String((error as Error)?.message ?? error)) },
      })
    })
  } finally {
    consoleErrorSpy.mockRestore()
  }
  return errors
}

const albero = (
  <AvvisiProvider>
    <p>contenuto della pagina</p>
  </AvvisiProvider>
)

describe('AvvisiProvider — hydration (§5.18, QA visivo T15)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('il server non renderizza mai il contenitore dei toast', () => {
    const html = renderServerHtml(albero)
    expect(html).toContain('contenuto della pagina')
    expect(html).not.toContain('position:fixed')
    expect(html).not.toContain('data-ds')
  })

  it('idratazione senza mismatch: il primo render client coincide con l\'HTML server', async () => {
    const html = renderServerHtml(albero)

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    const errors = await hydrateAndCollectErrors(container, albero)

    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([])
  })

  it('dopo l\'idratazione il contenitore monta nel body (i toast funzionano)', async () => {
    const html = renderServerHtml(albero)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    await hydrateAndCollectErrors(container, albero)

    // Post-mount il contenitore fixed esiste (portal su document.body): l'unico
    // data-ds="v3" fuori dal catalogo sanzionato dal constraint 3 (come Sheet).
    expect(document.body.querySelector('[data-ds="v3"]')).not.toBeNull()
  })
})
