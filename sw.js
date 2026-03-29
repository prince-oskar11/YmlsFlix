const CACHE_NAME = 'ymlsflix-v60'; 

// All static UI assets that make the app work offline
const assets = [
  './',
  'index.html',
  'style.css',        // New external CSS file
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
      // Caching these files allows for "Instant Boot"
      return cache.addAll(assets);
    })
  );
});

// Fetching Assets with Smart Logic
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. CRITICAL: Bypass cache for video streams and dynamic API data
  // We NEVER cache .m3u8 or .ts files as they are huge and dynamic.
  if (
    url.href.includes('.m3u8') || 
    url.href.includes('.ts') || 
    url.hostname.includes('consumet.org') ||
    url.hostname.includes('anilist.co') ||
    url.hostname.includes('googlevideo.com') 
  ) {
    return; // Direct network request
  }

  // 2. Cache-First Strategy for static assets (CSS, JS, Fonts)
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return from cache, or fetch from network if not found
      return response || fetch(event.request).catch(() => {
        // Fallback to the main app shell if the user is totally offline
        if (event.request.mode === 'navigate') {
          return caches.match('./');
        }
      });
    })
  );
});

// Activate & Cleanup: Removes old versions of the app automatically
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  // Take control of the page immediately without requiring a refresh
  self.clients.claim();
});
