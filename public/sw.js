const SW_BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = 'dip-bhola-pwa-' + SW_BUILD_ID;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/db-logo-192.png',
  '/db-logo-512.png',
  '/db-logo-maskable-512.png',
  '/db-apple-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to precache some static assets:', err);
      });
    })
  );
  if (!self.registration.active) {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const reqUrl = new URL(event.request.url);

  // Never intercept or cache manifest.json, sw.js, or version.json so Chrome WebAPK always gets direct server response with credentials
  if (
    reqUrl.pathname === '/version.json' ||
    reqUrl.pathname === '/sw.js' ||
    reqUrl.pathname === '/manifest.json'
  ) {
    return;
  }

  // Skip caching Firebase / Google APIs dynamic network streams
  if (
    reqUrl.hostname.includes('firestore.googleapis.com') ||
    reqUrl.hostname.includes('identitytoolkit.googleapis.com') ||
    reqUrl.hostname.includes('firebase')
  ) {
    return;
  }

  const isHashedAsset =
    reqUrl.pathname.startsWith('/assets/') &&
    (reqUrl.pathname.endsWith('.js') || reqUrl.pathname.endsWith('.css'));

  const isStaticMediaOrFont =
    reqUrl.hostname === 'fonts.googleapis.com' ||
    reqUrl.hostname === 'fonts.gstatic.com' ||
    reqUrl.pathname === '/icon.svg' ||
    reqUrl.pathname.startsWith('/db-') ||
    reqUrl.pathname.startsWith('/pwa-') ||
    reqUrl.pathname === '/apple-touch-icon.png' ||
    event.request.destination === 'font' ||
    event.request.destination === 'image';

  // Strategy 1: Cache-First for hashed JS/CSS, icons, images, and Google Fonts -> 0ms launch
  if (isHashedAsset || isStaticMediaOrFont) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategy 2: Network-first with cached fallback for HTML navigation (never cache auth redirects)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy.clone());
              cache.put('/index.html', copy);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedHtml = await caches.match('/index.html');
          const cachedRoot = await caches.match('/');
          return cachedHtml || cachedRoot || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Strategy 3: Stale-While-Revalidate for everything else
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => cached || new Response('', { status: 504 }));

      return cached || fetchPromise;
    })
  );
});
