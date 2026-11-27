/* Laudos UH – funcionamento sem internet */
const VERSION = "laudos-uh-v20";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./lib/jspdf.umd.min.js", "./lib/docx.iife.js", "./lib/exifr-lite.umd.js", "./lib/leaflet.min.js", "./lib/leaflet.min.css",
  "./lib/images/marker-icon.png", "./lib/images/marker-icon-2x.png", "./lib/images/marker-shadow.png"];
const RUNTIME = "laudos-uh-runtime";

self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== RUNTIME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function timeout(ms, p) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); }); }

self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  // página: tenta a versão mais nova; sem sinal, usa a guardada
  if (req.mode === "navigate" && /mapa\.html$/.test(url.pathname)) { e.respondWith(fetch(req).catch(() => caches.match(req))); return; }
  if (req.mode === "navigate") {
    e.respondWith(timeout(5000, fetch(req)).then(r => { const c = r.clone(); caches.open(VERSION).then(ca => ca.put("./index.html", c)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // arquivos do próprio site: do cache primeiro
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { const c = n.clone(); caches.open(VERSION).then(ca => ca.put(req, c)); return n; })));
    return;
  }
  // fontes e mapas já vistos ficam guardados para uso sem sinal
  if (/fonts\.(googleapis|gstatic)\.com|tile\.openstreetmap\.org/.test(url.host)) {
    e.respondWith(caches.open(RUNTIME).then(ca => ca.match(req).then(hit => {
      const net = fetch(req).then(n => { if (n.ok || n.type === "opaque") ca.put(req, n.clone()); return n; }).catch(() => hit);
      return hit || net;
    })));
  }
});
