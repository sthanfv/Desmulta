const CACHE_NAME = 'desmulta-cache-custom-v1';

// Recursos vitales que queremos guardar en el celular del usuario de inmediato
const RECURSOS_ESTATICOS = ['/', '/faq', '/metodologia'];

// Instalación: Guardamos lo básico
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos .catch en addAll para que si un recurso falla (ej. icono no existe) no impida el caché completo
      return cache.addAll(RECURSOS_ESTATICOS).catch((err) => {
        console.warn('Algunos recursos estáticos no pudieron ser cacheados inicialmente.', err);
      });
    })
  );
  self.skipWaiting();
});

// Interceptamos las peticiones (Estrategia: Stale-While-Revalidate para archivos de Next.js)
self.addEventListener('fetch', (event) => {
  // Solo interceptamos peticiones GET (no interceptamos envíos de formularios a Firebase)
  if (event.request.method !== 'GET') return;
  // Ignorar peticiones que no sean HTTP u HTTPS (ej. chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Si está en caché, lanzamos la promesa en segundo plano ultra rápido
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // 2. Silenciosamente actualizamos la caché por debajo si la red funciona
          if (networkResponse.ok && event.request.url.startsWith('http')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 3. Si no hay internet y no está en caché, no rompemos la página (Fallo elegante)
          return (
            cachedResponse ||
            new Response('Sin conexión a Internet', { status: 503, statusText: 'Offline' })
          );
        });

      // Retornar caché inmediato o red si no hay caché
      return cachedResponse || fetchPromise;
    })
  );
});
