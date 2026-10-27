const CACHE_NAME = "anops-cache-v5";
const OFFLINE_URL = "/offline";

const STATIC_PRECACHE = [
  OFFLINE_URL,
  "/manifest.json",
  "/brand-kit/02-app-icons/anops-favicon-32x32.svg",
  "/brand-kit/02-app-icons/anops-web-icon-artwork-192x192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip auth, AI endpoints, and webhooks
  if (
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/ai") ||
    url.pathname.startsWith("/api/v1/marketing/worker")
  ) {
    return;
  }

  // 1. Navigation and RSC flight requests (pages and components)
  const isNavigation = request.mode === "navigate";
  const isRscHeader =
    request.headers.get("RSC") === "1" ||
    request.headers.has("Next-Router-State-Tree") ||
    request.headers.has("Next-Url");
  const isRscQuery = url.searchParams.has("_rsc");

  if (isNavigation || isRscHeader || isRscQuery) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Store exact request (including RSC headers/params)
              cache.put(request, copy);
              // Also store under clean path for router back/forward navigation
              if (url.origin === self.location.origin) {
                cache.put(url.pathname, response.clone());
              }
            });
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);

          // 1. Exact match
          const exactMatch = await cache.match(request);
          if (exactMatch) return exactMatch;

          // 2. Clean pathname match
          const pathnameMatch = await cache.match(url.pathname);
          if (pathnameMatch) return pathnameMatch;

          // 3. Trim trailing slash match
          const cleanPath = url.pathname.replace(/\/$/, "");
          const cleanMatch = await cache.match(cleanPath);
          if (cleanMatch) return cleanMatch;

          // 4. If this is a client back/forward RSC request, try any cached match for the pathname
          if (isRscHeader || isRscQuery) {
            const keys = await cache.keys();
            const matchedKey = keys.find((req) => new URL(req.url).pathname === url.pathname);
            if (matchedKey) {
              const res = await cache.match(matchedKey);
              if (res) return res;
            }
          }

          // 5. Fallback to /offline page
          const offlinePage = await cache.match(OFFLINE_URL);
          return offlinePage || Response.error();
        })
    );
    return;
  }

  // 2. Next.js Static Chunks, Scripts, and CSS (Stale-While-Revalidate)
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 3. Media, fonts, images (Cache-first)
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|woff|ttf|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }
});
