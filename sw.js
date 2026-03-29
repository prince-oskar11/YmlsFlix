const CACHE_NAME = 'ymlsflix-v60'; // Updated version to match your app v60.0
const assets = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.plyr.io/3.7.8/plyr.css',
  'https://cdn.plyr.io/3.7.8/plyr.js',
  'https://cdn.jsdelivr.net/npm/hls.js@latest',
  'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css'
];

// Install Service Worker and cache core UI assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces the waiting service worker to become the active one
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Added all core UI dependencies for instant loading
      return cache.addAll(assets);
    })
  );
});

// Fetching Assets with Smart Logic
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. CRITICAL: Bypass cache for video streams and dynamic API data
  // This ensures video playback stays smooth and doesn't eat storage
  if (
    url.href.includes('.m3u8') || 
    url.href.includes('.ts') || 
    url.hostname.includes('consumet.org') ||
    url.hostname.includes('anilist.co') ||
    url.hostname.includes('googlevideo.com') // Bypass YouTube trailer streams
  ) {
    return; // Direct network request
  }

  // 2. Cache-First Strategy for static assets (CSS, JS, Fonts)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // If everything fails (offline), return the homepage
        if (event.request.mode === 'navigate') {
          return caches.match('/');
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
  // Ensure the updated SW takes control of the pages immediately
  self.clients.claim();
});
