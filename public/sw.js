const CACHE_NAME = 'ua-v2'
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
  // Non intercettare navigazione (SSR pages) — causava refresh loop su /dashboard
  if (request.mode === 'navigate') return
  // Non cachare bundle Next.js (cambiano ad ogni deploy)
  if (url.pathname.startsWith('/_next/')) return

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
