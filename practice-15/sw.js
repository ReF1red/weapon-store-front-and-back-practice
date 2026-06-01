const CACHE_NAME = 'bastion-v4';
const DYNAMIC_CACHE_NAME = 'dynamic-content-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    '/css/style.css',
    '/icons/icon-16.png',
    '/icons/icon-32.png',
    '/icons/icon-96.png',
    '/icons/icon-128.png',
    '/icons/icon-256.png',
    '/icons/icon-512.png',
    '/images/ak-12.jpeg',
    '/images/glock-17.jpeg',
    '/images/m4a1.jpeg',
    '/images/remington-870.jpeg',
    '/images/taurus-44.jpeg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) return;

    if (url.pathname.startsWith('/content/')) {
        event.respondWith(
            fetch(event.request)
                .then((networkRes) => {
                    const resClone = networkRes.clone();
                    caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(event.request, resClone));
                    return networkRes;
                })
                .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/content/home.html')))
        );
        return;
    }

    event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});
