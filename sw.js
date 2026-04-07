const CACHE_NAME = "nebrin-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-512.png"
];

// 1. Hatua ya Install: Inahifadhi mafaili muhimu kwenye cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("NEBRIN: Caching assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Hatua ya Activate: Inafuta cache za zamani ikiwa ulibadilisha toleo
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("NEBRIN: Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Hatua ya Fetch: Inahakikisha App inafanya kazi hata kama upo offline
self.addEventListener("fetch", (event) => {
  // Tunahudumia maombi ya GET pekee (mafaili, picha n.k.)
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Ikiwa kuna internet, tunapakia faili jipya na kulihifadhi kwenye cache
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone);
        });
        return res;
      })
      .catch(() => {
        // Ikiwa mtandao umekata, tunachukua faili lililohifadhiwa awali
        return caches.match(event.request);
      })
  );
});
