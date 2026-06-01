const CACHE_NAME = 'bastion-v1';
const ASSETS = ['/', '/index.html', '/app.js', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('fetch', (event) => {
    event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});

self.addEventListener('push', (event) => {
    let data = { title: 'Бастион', body: 'Добавлена новая позиция в каталог' };
    if (event.data) {
        try { data = event.data.json(); } catch (err) { data.body = event.data.text(); }
    }
    event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/icons/icon-128.png', badge: '/icons/icon-96.png' }));
});
