const CACHE_NAME = 'ymlsflix-v55';
const assets = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

// Install Service Worker and cache core UI assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Added the CDN scripts to the cache so the UI loads instantly
      return cache.addAll(assets);
    })
  );
});

// Fetching Assets with Streaming Bypass
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: Bypass cache for video streams (.m3u8, .ts) and the Streaming API
  // This prevents the PWA from crashing when watching long episodes
  if (
    url.href.includes('.m3u8') || 
    url.href.includes('.ts') || 
    url.hostname.includes('consumet') ||
    url.hostname.includes('anilist')
  ) {
    return; // Let the browser handle these normally
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached asset if found, otherwise fetch from network
      return response || fetch(event.request);
    }).catch(() => {
      // Optional: Fallback if network is down and asset isn't cached
      return caches.match('/');
    })
  );
});

// Activate & Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
});
