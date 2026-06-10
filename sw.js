/**
 * Vynas Service Worker — Offline caching + PWA support
 * Feature 8.6: Progressive Web App
 */

const CACHE_NAME = 'vynas-v2.1.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './login.html',
    './css/style.css',
    './css/dashboard.css',
    './img/logo.png',
    './img/logodefault.png',
    './img/8k_stars_milky_way.jpg'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // Network first, fallback to cache
    e.respondWith(
        fetch(e.request)
            .then(response => {
                // Cache successful responses
                if (response.ok && e.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});
