const CACHE_NAME = 'ymlsflix-cache-v1';
const urlsToCache = [
  '/', // Cache the root
  '/index.html', // Your main HTML
  '/style.css', // Your CSS
  '/script.js', // Your JS file if separated
  // Add other assets like images, fonts, icons, etc.
];

// Install event - caching assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});

// Fetch event - serve cached assets
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // serve from cache
        }
        return fetch(event.request); // fetch from network
      })
  );
});
