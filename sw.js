// Service worker de Despierta Maruja.
// IMPORTANTE: cambia VERSION cada vez que publiques un cambio en la app.
// Así los móviles con la app instalada verán el aviso «Hay una versión nueva».
const VERSION = '2026-11-15.1';
const CACHE = 'dm-' + VERSION;
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest', './css/estilos.css',
  './js/app.js', './js/api.js', './js/config.js', './js/datos.js', './js/excel.js',
  './vendor/supabase.js',
  './iconos/icono-192.png', './iconos/icono-512.png', './iconos/apple-touch-icon.png', './iconos/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'activar') self.skipWaiting(); });

// Primero la red (para tener siempre lo último); si no hay conexión, la copia guardada.
// Los datos (Supabase) nunca pasan por aquí: van directamente a internet.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) cache.put(req.mode === 'navigate' ? './index.html' : req, res.clone());
      return res;
    } catch {
      return (await cache.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true })) ||
        new Response('Sin conexión', { status: 503 });
    }
  })());
});
