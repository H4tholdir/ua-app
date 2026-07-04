import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { act } from 'react'
import { useReducedMotion } from '../../src/design-system/motion'

/**
 * Stessa tecnica già usata per B18 (ThemeToggleButton/BottomNavPill): rimuove
 * `window` solo per la renderToString(), per riprodurre la reale differenza
 * server/client (in Node.js `window` non esiste affatto lato server).
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

/** Componente-sonda: unico modo per osservare un hook via renderToString/hydrateRoot. */
function Probe() {
  const reduced = useReducedMotion()
  return <div data-testid="probe" data-reduced={String(reduced)} />
}

describe('useReducedMotion — hydration', () => {
  beforeEach(() => {
    // Simula un utente con "Riduci il movimento" attivo nel sistema/browser —
    // il caso che genera il mismatch, dato che il default server è sempre false.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('nessun mismatch di idratazione quando prefers-reduced-motion è realmente attivo', async () => {
    const html = renderServerHtml(<Probe />)
    expect(html).toContain('data-reduced="false"')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    const errors = await hydrateAndCollectErrors(container, <Probe />)

    expect(errors.some((e) => /hydrat/i.test(e))).toBe(false)
  })

  it('dopo il mount, il valore riflette la preferenza reale del sistema', async () => {
    const html = renderServerHtml(<Probe />)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    await hydrateAndCollectErrors(container, <Probe />)

    const probe = container.querySelector('[data-testid="probe"]')
    expect(probe?.getAttribute('data-reduced')).toBe('true')
  })
})
