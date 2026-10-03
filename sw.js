const CACHE_NAME = 'cyber-arena-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './sound.js',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// インストール時にコアリソースを事前キャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
                console.warn('Cache addAll error (ignoring for dynamic cache):', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// アクティベート時に古いキャッシュを整理
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// フェッチ処理（Cache First, fallback to Network）
self.addEventListener('fetch', (event) => {
    // GETリクエストのみ対象
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // オフライン時のフォールバック
                if (event.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
