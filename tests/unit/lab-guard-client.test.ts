// tests/unit/lab-guard-client.test.ts
// N13: interceptor fetch PWA — mappa i 403 con code UA_LAB_* al redirect
// /impostazioni/abbonamento (il gate del layout (app) poi raffina la meta).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installLabGuardInterceptor } from '@/lib/api/lab-guard-client'

type FakeWin = {
  fetch: typeof fetch
  location: { pathname: string; origin: string; assign: (url: string) => void }
}

function res403(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  })
}

function makeWin(response: Response, pathname = '/lavori'): { win: FakeWin; assign: ReturnType<typeof vi.fn>; rawFetch: ReturnType<typeof vi.fn> } {
  const rawFetch = vi.fn().mockResolvedValue(response)
  const assign = vi.fn()
  const win: FakeWin = {
    fetch: rawFetch as unknown as typeof fetch,
    location: { pathname, origin: 'http://localhost', assign },
  }
  return { win, assign, rawFetch }
}

// flush della microtask-queue: l'ispezione del clone è asincrona
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('installLabGuardInterceptor (N13)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('403 con code UA_LAB_* su /api/ → redirect a /impostazioni/abbonamento (una sola volta)', async () => {
    const { win, assign } = makeWin(res403({ error: 'x', code: 'UA_LAB_SOSPESO' }))
    installLabGuardInterceptor(win)
    const r1 = await win.fetch('/api/lavori', { method: 'POST' })
    expect(r1.status).toBe(403) // la risposta originale arriva comunque al chiamante
    await flush()
    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith('/impostazioni/abbonamento')
    // seconda risposta: nessun secondo redirect (flag one-shot per pagina)
    await win.fetch('/api/lavori', { method: 'POST' })
    await flush()
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('403 senza code → nessun redirect', async () => {
    const { win, assign } = makeWin(res403({ error: 'Non autorizzato' }))
    installLabGuardInterceptor(win)
    await win.fetch('/api/lavori')
    await flush()
    expect(assign).not.toHaveBeenCalled()
  })

  it('403 non-JSON → nessun redirect, nessun errore', async () => {
    const { win, assign } = makeWin(new Response('Forbidden', { status: 403 }))
    installLabGuardInterceptor(win)
    await win.fetch('/api/lavori')
    await flush()
    expect(assign).not.toHaveBeenCalled()
  })

  it('200 → il body non viene toccato e nessun redirect', async () => {
    const ok = new Response(JSON.stringify({ dati: 1 }), { status: 200 })
    const { win, assign } = makeWin(ok)
    installLabGuardInterceptor(win)
    const r = await win.fetch('/api/lavori')
    await flush()
    expect(assign).not.toHaveBeenCalled()
    expect(await r.json()).toEqual({ dati: 1 }) // body originale non consumato
  })

  it('URL non-/api/ → nessuna ispezione', async () => {
    const { win, assign } = makeWin(res403({ code: 'UA_LAB_SOSPESO', error: 'x' }))
    installLabGuardInterceptor(win)
    await win.fetch('http://esterno.example.com/api/altro')
    await flush()
    expect(assign).not.toHaveBeenCalled()
  })

  it('già su /billing, /blocked o /impostazioni/abbonamento → nessun redirect (anti-loop)', async () => {
    for (const path of ['/billing', '/blocked', '/impostazioni/abbonamento']) {
      const { win, assign } = makeWin(res403({ error: 'x', code: 'UA_LAB_SCADUTO' }), path)
      installLabGuardInterceptor(win)
      await win.fetch('/api/lavori', { method: 'POST' })
      await flush()
      expect(assign).not.toHaveBeenCalled()
    }
  })

  it('uninstall ripristina il fetch originale', () => {
    const { win, rawFetch } = makeWin(res403({ error: 'x', code: 'UA_LAB_SOSPESO' }))
    const uninstall = installLabGuardInterceptor(win)
    expect(win.fetch).not.toBe(rawFetch)
    uninstall()
    expect(win.fetch).toBe(rawFetch)
  })
})
