const CACHE_NAME = 'fintracker-shell-v2';
const DEV_MODE = new URL(self.location.href).searchParams.get('dev') === 'true';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (!DEV_MODE) {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL).catch(() => {});
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if (!DEV_MODE) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames
        .filter(name => (name.startsWith('fintracker-shell-') || name.startsWith('fintracker-cache-')) && name !== CACHE_NAME)
        .map(name => caches.delete(name)));
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (DEV_MODE || event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Financial/account API data must always come from the server, never a cache.
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', response.clone());
        }
        return response;
      } catch {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Vite's hashed build assets are immutable, so cache them; refresh public
  // assets from the network and retain a cached copy for offline launches.
  if (requestUrl.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return (await caches.match(event.request)) || Response.error();
    }
  })());
});
