import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { resolve } from 'node:path'

const TEMPLATE_PATH = resolve(__dirname, '../../scripts/sw-template.js')

interface FakeCacheStore {
  puts: Array<{ url: string }>
  matches: Map<string, Response>
}

function loadServiceWorker(opts: {
  networkOk?: boolean
  networkResponse?: Response
  offlineHtmlResponse?: Response
}) {
  const store: FakeCacheStore = { puts: [], matches: new Map() }
  const listeners: Record<string, (e: unknown) => void> = {}

  const offlineHtml = opts.offlineHtmlResponse ?? new Response('<html>offline</html>', { status: 200 })
  store.matches.set('/offline.html', offlineHtml)

  const cacheApi = {
    addAll: async () => {},
    put: async (req: Request) => {
      store.puts.push({ url: typeof req === 'string' ? req : req.url })
    },
  }

  const caches = {
    open: async () => cacheApi,
    match: async (req: Request | string) => {
      const url = typeof req === 'string' ? req : req.url
      return store.matches.get(url)
    },
    keys: async () => [],
    delete: async () => true,
  }

  const selfObj: Record<string, unknown> = {
    addEventListener: (type: string, handler: (e: unknown) => void) => {
      listeners[type] = handler
    },
    location: { origin: 'https://uachelab.com' },
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  }

  const networkFetch = () => {
    if (opts.networkOk === false) return Promise.reject(new Error('offline'))
    return Promise.resolve(opts.networkResponse ?? new Response('rete ok', { status: 200 }))
  }

  const context = vm.createContext({
    self: selfObj,
    caches,
    fetch: networkFetch,
    Response,
    URL,
    Promise,
    console,
  })

  const code = readFileSync(TEMPLATE_PATH, 'utf-8')
  vm.runInContext(code, context)

  return { listeners, store }
}

function fireFetch(listeners: Record<string, (e: unknown) => void>, request: Request) {
  let respondWithPromise: Promise<Response> | undefined
  const event = {
    request,
    respondWith: (p: Promise<Response>) => {
      respondWithPromise = p
    },
  }
  listeners.fetch(event)
  return respondWithPromise
}

// Il browser riserva mode:'navigate' alle navigazioni reali — il costruttore
// Request nativo (anche in Node/Undici) lo rifiuta esplicitamente. Il service
// worker legge solo .method/.mode/.url/.headers, quindi un oggetto con la
// stessa forma è equivalente per questo test, senza dover istanziare un vero
// Request del browser (impossibile fuori da una navigazione reale).
function navigateRequest(url = 'https://uachelab.com/dashboard') {
  return {
    method: 'GET',
    mode: 'navigate',
    url,
    headers: new Headers(),
  } as unknown as Request
}

describe('sw-template.js — gestione fetch per navigate (offline B6)', () => {
  let sw: ReturnType<typeof loadServiceWorker>

  describe('online: rete disponibile', () => {
    beforeEach(() => {
      sw = loadServiceWorker({ networkOk: true, networkResponse: new Response('pagina fresca', { status: 200 }) })
    })

    it('una navigazione va sempre in rete (network-first), mai servita dalla cache', async () => {
      const res = await fireFetch(sw.listeners, navigateRequest())
      expect(await res?.text()).toBe('pagina fresca')
    })

    it('la risposta di navigazione NON viene messa in cache — regressione 61fa47b (refresh loop /dashboard)', async () => {
      await fireFetch(sw.listeners, navigateRequest())
      expect(sw.store.puts).toHaveLength(0)
    })
  })

  describe('offline: rete non disponibile', () => {
    beforeEach(() => {
      sw = loadServiceWorker({ networkOk: false })
    })

    it('una navigazione fallita in rete ritorna /offline.html precachato, non un errore chrome-error://', async () => {
      const res = await fireFetch(sw.listeners, navigateRequest())
      expect(await res?.text()).toBe('<html>offline</html>')
    })

    it('se /offline.html non è (per assurdo) in cache, ritorna comunque una Response 503 esplicita', async () => {
      const swSenzaCache = loadServiceWorker({ networkOk: false, offlineHtmlResponse: undefined })
      swSenzaCache.store.matches.delete('/offline.html')
      const res = await fireFetch(swSenzaCache.listeners, navigateRequest())
      expect(res?.status).toBe(503)
    })
  })

  describe('richieste non-navigate restano invariate (nessuna regressione)', () => {
    it('un asset stesso-origine passa dal cache-first esistente e VIENE messo in cache', async () => {
      sw = loadServiceWorker({ networkOk: true, networkResponse: new Response('asset', { status: 200 }) })
      const req = new Request('https://uachelab.com/qualche-asset.png', { method: 'GET' })
      const res = await fireFetch(sw.listeners, req)
      expect(await res?.text()).toBe('asset')
      expect(sw.store.puts).toHaveLength(1)
    })
  })
})
