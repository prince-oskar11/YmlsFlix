const CACHE_NAME = 'ymlsflix-v60-2024'; // Updated versioned cache

const assets = [
  './',
  'index.html',
  'style.css', // Your minified CSS
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.plyr.io/3.7.8/plyr.css',
  'https://cdn.plyr.io/3.7.8/plyr.js',
  'https://cdn.jsdelivr.net/npm/hls.js@latest',
  'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cache for streaming and dynamic API data
  if (
    url.href.includes('.m3u8') ||
    url.href.includes('.ts') ||
    url.hostname.includes('consumet.org') ||
    url.hostname.includes('anilist.co') ||
    url.hostname.includes('googlevideo.com')
  ) {
    return; // Network-only
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      // Fallback for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('./') || fetch(event.request);
      }

      // Try network for other requests
      return fetch(event.request).catch(() => {
        // Offline fallback for documents
        if (event.request.destination === 'document') {
          return caches.match('./');
        }
        // Optional: fallback images or other assets
      });
    }).catch(() => {
      // Final fallback if cache and fetch both fail
      if (event.request.destination === 'document') {
        return caches.match('./');
      }
    })
  );
});
