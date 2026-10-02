const CACHE_NAME = "szeszi-v3";

const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];

/* ================================
   TELEPÍTÉS
================================ */

self.addEventListener("install", event => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});


/* ================================
   AKTIVÁLÁS
================================ */

self.addEventListener("activate", event => {
    event.waitUntil(
        caches
            .keys()
            .then(keys => {
                return Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                );
            })
            .then(() => self.clients.claim())
    );
});


/* ================================
   KÉRÉSEK KEZELÉSE
================================ */

self.addEventListener("fetch", event => {

    /*
     * Csak GET kéréseket kezelünk.
     * POST, PUT, DELETE stb. kérésekhez
     * nem nyúlunk hozzá.
     */
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(response => {

                        /*
                         * Csak sikeres, saját eredetű
                         * válaszokat tárolunk gyorsítótárban.
                         */
                        if (
                            response.ok &&
                            response.type === "basic"
                        ) {
                            const responseClone =
                                response.clone();

                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(
                                        event.request,
                                        responseClone
                                    );
                                });
                        }

                        return response;
                    })
                    .catch(() => {

                        /*
                         * Ha nincs internet és az oldal
                         * nincs a gyorsítótárban, az
                         * index.html-t próbáljuk visszaadni.
                         */
                        return caches.match("./index.html");
                    });
            })
    );
});