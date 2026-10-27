const CACHE_NAME = "anops-cache-v4";
const OFFLINE_URL = "/offline";

const MODULE_ROUTES = [
  OFFLINE_URL,
  "/manifest.json",
  "/dashboard",
  "/company",
  "/hr",
  "/crm",
  "/sales",
  "/finance",
  "/inventory",
  "/purchasing",
  "/manufacturing",
  "/marketing",
  "/community",
  "/brand-kit/02-app-icons/anops-favicon-32x32.svg",
  "/brand-kit/02-app-icons/anops-web-icon-artwork-192x192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Precache critical assets and attempt to precache module shells
        for (const url of MODULE_ROUTES) {
          try {
            await cache.add(url);
          } catch (e) {
            // Ignore redirects or unauthenticated routes during install
          }
        }
      })
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

  // 1. Navigation and RSC requests:
  const isNavigation = request.mode === "navigate";
  const isRscHeader = request.headers.get("RSC") === "1" || request.headers.has("Next-Router-State-Tree");
  const isRscQuery = url.searchParams.has("_rsc");

  if (isNavigation || isRscHeader || isRscQuery) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Cache exact request
              cache.put(request, copy);
              // Also index by pathname for clean client-side router navigation lookup
              if (url.origin === self.location.origin) {
                cache.put(url.pathname, response.clone());
              }
            });
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          
          // 1. Exact request match
          const exactMatch = await cache.match(request);
          if (exactMatch) return exactMatch;

          // 2. Pathname match without query parameters or headers
          const pathnameMatch = await cache.match(url.pathname);
          if (pathnameMatch) return pathnameMatch;

          // 3. Normalized path match
          const cleanPath = url.pathname.replace(/\/$/, "");
          const cleanMatch = await cache.match(cleanPath);
          if (cleanMatch) return cleanMatch;

          // 4. If nothing matched and it's a full navigation, show offline fallback
          if (isNavigation) {
            const offlinePage = await cache.match(OFFLINE_URL);
            if (offlinePage) return offlinePage;
          }

          // If an RSC subrequest failed and we don't have it, return offline fallback page
          const offlinePage = await cache.match(OFFLINE_URL);
          return offlinePage || Response.error();
        })
    );
    return;
  }

  // 2. Next.js Static Chunks, Scripts, and Styles (Stale-While-Revalidate)
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

  // 3. Media, fonts, images: Cache-first
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
