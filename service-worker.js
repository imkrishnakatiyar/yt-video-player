self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('orpheus-cache-9').then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/service-worker.js',
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== 'orpheus-cache-v9') {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});
