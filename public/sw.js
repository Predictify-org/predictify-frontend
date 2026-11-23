/**
 * Predictify Service Worker
 *
 * Strategy:
 * - Precache: offline shell (/offline), app icons, manifest
 * - Static assets (/\_next/static/): stale-while-revalidate
 * - /markets list data: network-first with cache fallback
 * - /api/*, /api/wallet/*, authenticated: never cached
 * - Non-GET requests: never cached
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `predictify-shell-${CACHE_VERSION}`;
const DATA_CACHE  = `predictify-data-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/manifest.webmanifest',
];

// ── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache non-GET or API routes (wallet, transactions, auth)
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // Static Next.js assets: stale-while-revalidate
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(SHELL_CACHE, request));
    return;
  }

  // /markets list: network-first with cache fallback
  if (url.pathname === '/markets' || url.pathname.startsWith('/markets')) {
    event.respondWith(networkFirstWithFallback(DATA_CACHE, request));
    return;
  }

  // Everything else: network-first, no cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match('/offline'))
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached ?? (await networkPromise) ?? Response.error();
}

async function networkFirstWithFallback(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    return cached ?? (await caches.match('/offline')) ?? Response.error();
  }
}
