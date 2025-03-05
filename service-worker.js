self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('not-on-spotify-cache').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/service-worker.js'
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
