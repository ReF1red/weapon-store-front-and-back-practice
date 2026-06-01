const CACHE_NAME = 'bastion-v6';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
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
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(cacheNames.filter((cache) => cache !== CACHE_NAME).map((cache) => caches.delete(cache))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;

    const isCode = request.mode === 'navigate'
        || url.pathname === '/'
        || url.pathname.endsWith('.html')
        || url.pathname.endsWith('.js')
        || url.pathname.endsWith('.css');

    if (isCode) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => null);
                    }
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => null);
                }
                return response;
            });
        })
    );
});

self.addEventListener('push', (event) => {
    let data = {
        title: 'Бастион',
        body: 'Новое уведомление',
        icon: '/icons/icon-128.png',
        badge: '/icons/icon-96.png',
        data: {}
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (error) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        data: data.data || {},
        requireInteraction: true,
        tag: `bastion-${data.data?.type || 'notification'}-${Date.now()}`
    };

    if (data.data?.type === 'sale') {
        options.actions = [
            {
                action: 'remind',
                title: 'Напомнить через 5 минут'
            }
        ];
        options.tag = `bastion-sale-${Date.now()}`;
        options.renotify = true;
    }

    if (data.data?.type === 'reminder') {
        options.actions = [
            {
                action: 'snooze',
                title: 'Отложить на 5 минут'
            }
        ];
        const rid = data.data?.reminderId || Date.now();
        options.tag = `bastion-reminder-${rid}-${Date.now()}`;
        options.renotify = true;
    }

    event.waitUntil((async () => {
        await self.registration.showNotification(data.title, options);

        // Отладка: если вкладка открыта, передаем событие в клиент, чтобы
        // видеть факт прихода push даже если системный баннер подавлен ОС.
        const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientsList.forEach((client) => {
            client.postMessage({
                source: 'sw-push',
                title: data.title,
                body: data.body,
                type: data.data?.type || 'unknown',
                reminderId: data.data?.reminderId || null,
                ts: Date.now()
            });
        });
    })());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'snooze') {
        const reminderId = event.notification?.data?.reminderId;
        if (!reminderId) return;

        event.waitUntil(
            fetch(`https://localhost:3443/api/snooze?reminderId=${reminderId}`, {
                method: 'POST',
                credentials: 'include'
            }).catch(() => null)
        );
        return;
    }

    if (event.action === 'remind') {
        const nextData = event.notification?.data || {};

        event.waitUntil(
            new Promise((resolve) => {
                setTimeout(() => {
                    self.registration.showNotification(event.notification.title, {
                        body: event.notification.body,
                        icon: event.notification.icon || '/icons/icon-128.png',
                        badge: event.notification.badge || '/icons/icon-96.png',
                        data: nextData,
                        requireInteraction: true,
                        tag: 'bastion-sale-remind'
                    }).finally(resolve);
                }, 5 * 60 * 1000);
            })
        );
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow('/');
            return null;
        })
    );
});
