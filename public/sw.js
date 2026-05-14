const CACHE_NAME = 'ua-v1'
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
