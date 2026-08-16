const APP_BASE_PATH = '/kriyo';
const STATIC_CACHE = 'kriyo-static-v2';
const RUNTIME_CACHE = 'kriyo-runtime-v2';

const PRECACHE_URLS = [
  `${APP_BASE_PATH}/`,
  `${APP_BASE_PATH}/sas`,
  `${APP_BASE_PATH}/login`,
  `${APP_BASE_PATH}/signup`,
  `${APP_BASE_PATH}/manifest.json`,
  `${APP_BASE_PATH}/icons/icon-192.svg`,
  `${APP_BASE_PATH}/icons/icon-512.svg`
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith(`${APP_BASE_PATH}/_next/static/`) ||
    pathname.startsWith(`${APP_BASE_PATH}/icons/`) ||
    pathname === `${APP_BASE_PATH}/manifest.json` ||
    pathname === `${APP_BASE_PATH}/sw.js` ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.json')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (names) => {
      await Promise.all(names.filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(`${APP_BASE_PATH}/`).then((cached) => cached ?? caches.match(`${APP_BASE_PATH}/sas`)))
    );
    return;
  }

  if (!isSameOrigin(url)) {
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
