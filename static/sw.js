
const CACHE_NAME = 'oceny-kierowcow-v1';
const urlsToCache = [
  '/',
  '/static/css/style.css',
  '/static/css/icons.css',
  '/static/js/app.js',
  '/static/js/icons.js',
  '/static/js/pwa.js',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  '/static/manifest.json',
  'https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Install event
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[SW] Failed to cache:', error);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request).catch(error => {
          console.error('[SW] Network fetch failed:', error);
          // Return offline page or default response if needed
        });
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync');
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  return new Promise((resolve) => {
    console.log('[SW] Performing background sync');
    resolve();
  });
}
