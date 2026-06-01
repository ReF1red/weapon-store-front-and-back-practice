const CACHE_NAME = 'bastion-react-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
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
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});
