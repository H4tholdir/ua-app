const CACHE_NAME = 'ua-__BUILD_ID__'
const PRECACHE = ['/offline.html', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Non cachare API routes
  if (url.pathname.startsWith('/api/')) return
  // Non cachare routes esterne
  if (url.origin !== self.location.origin) return
  // Navigazione (pagine SSR): SEMPRE network-first, MAI cache-first. Servire
  // una pagina SSR autenticata dalla cache ha già causato un refresh loop su
  // /dashboard (fix 61fa47b, 17/05/2026) — il cache-first ignorava lo stato
  // auth/tenant corrente. La cache serve SOLO come ultima spiaggia quando la
  // rete è realmente assente, mai come sorgente primaria per la navigazione,
  // e la risposta di navigazione non viene mai scritta in cache.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline.html').then(r => r ?? new Response('Offline', { status: 503 }))
      )
    )
    return
  }
  // Non cachare bundle Next.js (cambiano ad ogni deploy)
  if (url.pathname.startsWith('/_next/')) return
  // Non cachare le fetch RSC di Next.js (router.refresh(), navigazione client-side,
  // prefetch dei Link): sono payload differenziali dei React Server Components, non
  // pagine HTML da servire offline. Next le marca esso stesso `Cache-Control:
  // no-cache, must-revalidate` e le distingue con l'header `RSC` — intercettarle qui
  // le serviva dalla cache stale-while-revalidate, causando UI non aggiornata dopo
  // ogni mutazione (POST/PATCH) finché non si ricaricava manualmente la pagina
  // (bug scoperto durante B2 — Contabilità Clienti, 03/07/2026).
  if (request.headers.has('RSC') || request.headers.has('Next-Router-State-Tree')) return

  e.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match('/offline.html').then(r => r ?? new Response('Offline', { status: 503 })))

      return cached ?? networkFetch
    })
  )
})

// ---------------------------------------------------------------------------
// Push notifications — Task B7
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const { title = 'UÀ', body = '', url = '/' } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      data: { url },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const notifUrl = event.notification.data?.url ?? '/'
      for (const client of windowClients) {
        if (client.url.includes(notifUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(notifUrl)
    })
  )
})
