const CACHE_NAME = 'ymlsflix-v60'; 

// All static UI assets that make the app work offline
const assets = [
  './',
  'index.html',
  'style.css',        // External CSS file
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.plyr.io/3.7.8/plyr.css',
  'https://cdn.plyr.io/3.7.8/plyr.js',
  'https://cdn.jsdelivr.net/npm/hls.js@latest',
  'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css'
];

// Install Service Worker and cache core UI assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// Fetch handler with smart logic
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache for large, dynamic files
  if (
    url.href.includes('.m3u8') || 
    url.href.includes('.ts') || 
    url.hostname.includes('consumet.org') ||
    url.hostname.includes('anilist.co') ||
    url.hostname.includes('googlevideo.com') 
  ) {
    return; // Fetch directly from network
  }

  // Cache-First for static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./');
        }
      });
    })
  );
});

// Cleanup old caches during activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});
