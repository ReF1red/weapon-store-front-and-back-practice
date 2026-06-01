const CACHE_NAME = 'bastion-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/css/style.css',
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
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const isDocument = request.mode === 'navigate';
    const isCode = url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/';

    // HTML/JS/CSS — network-first: онлайн берём свежее, офлайн — из кэша
    if (isDocument || isCode) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
        );
        return;
    }

    // Картинки и прочая статика — cache-first
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
