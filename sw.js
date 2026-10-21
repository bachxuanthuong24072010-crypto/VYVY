// ==============================================================================
// SERVICE WORKER - BIOPLANNER 2027 (CHUYÊN SINH HỌC PWA)
// ==============================================================================

const CACHE_NAME = 'bioplanner-pwa-v7';

const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.png',
    './icon-192.png',
    './icon-512.png',
    './apple-touch-icon.png'
];

// Cài đặt: Nạp trước các file cốt lõi
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).catch((err) => {
            console.warn('[BioPlanner SW] Precache non-critical notice:', err);
        })
    );
});

// Kích hoạt: Xóa cache cũ & kiểm soát ngay các tab đang mở
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((k) => {
                    if (k !== CACHE_NAME) {
                        return caches.delete(k);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Bắt yêu cầu mạng (Fetch): Cache First cho assets tĩnh, Network First cho navigation
self.addEventListener('fetch', (e) => {
    const request = e.request;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
        return;
    }

    // Điều hướng trang HTML
    if (request.mode === 'navigate') {
        e.respondWith(
            fetch(request)
                .then((networkRes) => {
                    if (networkRes && networkRes.status === 200) {
                        const copy = networkRes.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkRes;
                })
                .catch(() => {
                    return caches.match('./index.html') || caches.match('./');
                })
        );
        return;
    }

    // Tài nguyên tĩnh (ảnh, icon, script, css)
    e.respondWith(
        caches.match(request).then((cachedRes) => {
            if (cachedRes) {
                return cachedRes;
            }
            return fetch(request).then((networkRes) => {
                if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
                    const copy = networkRes.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return networkRes;
            }).catch(() => {
                return new Response('', { status: 408, statusText: 'Offline Resource' });
            });
        })
    );
});
