const CACHE_NAME = "anops-cache-v6";
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

  // Skip auth, AI endpoints, and workers
  if (
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/ai") ||
    url.pathname.startsWith("/api/v1/marketing/worker") ||
    url.hostname.includes("locize.com") ||
    url.pathname.includes("cdn-cgi")
  ) {
    return;
  }

  // 1. Next.js Static Chunks, JS, and CSS — MUST be Cache-First with background revalidate!
  // If offline, serving the cached chunk avoids Turbopack ChunkLoadError
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // If online, update cache in background
          if (navigator.onLine) {
            fetch(request)
              .then((fresh) => {
                if (fresh && fresh.status === 200) {
                  cache.put(request, fresh.clone());
                }
              })
              .catch(() => {});
          }
          return cached;
        }

        // Not cached yet: try network
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200) {
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch (err) {
          // If offline and chunk not found, search by filename
          const filename = url.pathname.split("/").pop();
          if (filename) {
            const keys = await cache.keys();
            const matchingKey = keys.find((k) => k.url.endsWith(filename));
            if (matchingKey) {
              const res = await cache.match(matchingKey);
              if (res) return res;
            }
          }
          return new Response("// Chunk offline unavailable", {
            status: 200,
            headers: { "Content-Type": "application/javascript" },
          });
        }
      })
    );
    return;
  }

  // 2. Navigation and RSC flight requests
  const isNavigation = request.mode === "navigate";
  const isRscHeader =
    request.headers.get("RSC") === "1" ||
    request.headers.has("Next-Router-State-Tree") ||
    request.headers.has("Next-Url");
  const isRscQuery = url.searchParams.has("_rsc");

  if (isNavigation || isRscHeader || isRscQuery) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // If online, try network first
        if (navigator.onLine) {
          try {
            const response = await fetch(request);
            if (response && response.status === 200) {
              cache.put(request, response.clone());
              if (url.origin === self.location.origin) {
                cache.put(url.pathname, response.clone());
              }
            }
            return response;
          } catch (e) {
            // network failed, fallback to cache
          }
        }

        // Offline or network error: Match from cache
        const exactMatch = await cache.match(request);
        if (exactMatch) return exactMatch;

        const pathnameMatch = await cache.match(url.pathname);
        if (pathnameMatch) return pathnameMatch;

        const cleanPath = url.pathname.replace(/\/$/, "");
        const cleanMatch = await cache.match(cleanPath);
        if (cleanMatch) return cleanMatch;

        // Check any cached key with the same pathname
        const keys = await cache.keys();
        const matchedKey = keys.find((req) => new URL(req.url).pathname === url.pathname);
        if (matchedKey) {
          const res = await cache.match(matchedKey);
          if (res) return res;
        }

        // Fallback to /offline page
        const offlinePage = await cache.match(OFFLINE_URL);
        return (
          offlinePage ||
          new Response("Offline page unavailable", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        );
      })()
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
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return new Response("", { status: 404 });
        }
      })
    );
    return;
  }
});
