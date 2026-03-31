// ============================================================
//  sw.js — Service Worker for The Chai Junction PWA
//  Caches all static assets for offline use
// ============================================================

const CACHE_NAME = 'chai-junction-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/menu.html',
  '/order.html',
  '/css/style.css',
  '/js/config.js',
  '/js/main.js',
  '/js/menu.js',
  '/js/order.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: cache static files ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ──────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for static, network-first for API ─────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls (Apps Script) — always network
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: 'Offline' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // Static assets — cache first, fallback network
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
