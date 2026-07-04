import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { act } from 'react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

import { BottomNavPill } from '../../src/components/layout/BottomNavPill'

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

async function hydrateAndCollectErrors(container: HTMLElement, node: React.ReactElement): Promise<string[]> {
  const errors: string[] = []
  await act(async () => {
    hydrateRoot(container, node, {
      onRecoverableError: (error) => { errors.push(String((error as Error)?.message ?? error)) },
    })
  })
  return errors
}

describe('BottomNavPill — hydration tooltip FAB (B18.8)', () => {
  afterEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
  })

  it('nessun mismatch di idratazione alla prima visita (tooltip FAB mai mostrato prima)', async () => {
    // localStorage vuoto → prima visita → il client, senza il fix, mostra
    // subito il tooltip lato client mentre il server non lo renderizza mai
    const html = renderServerHtml(<BottomNavPill />)
    expect(html).not.toContain('role="tooltip"')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    const errors = await hydrateAndCollectErrors(container, <BottomNavPill />)

    expect(errors.some((e) => /hydrat/i.test(e))).toBe(false)
  })

  it('dopo il mount, alla prima visita il tooltip FAB compare comunque (comportamento invariato)', async () => {
    const html = renderServerHtml(<BottomNavPill />)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    await hydrateAndCollectErrors(container, <BottomNavPill />)

    expect(container.querySelector('[role="tooltip"]')).not.toBeNull()
  })

  it('se il tooltip è già stato visto (localStorage), non ricompare — né su server né su client', async () => {
    localStorage.setItem('ua-tooltip-fab-shown', '1')

    const html = renderServerHtml(<BottomNavPill />)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    const errors = await hydrateAndCollectErrors(container, <BottomNavPill />)

    expect(errors.some((e) => /hydrat/i.test(e))).toBe(false)
    expect(container.querySelector('[role="tooltip"]')).toBeNull()
  })
})
