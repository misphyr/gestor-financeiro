/* PWA Service Worker */
// Incrementar este número sempre que fizer um build para limpar cache antigo
const CACHE_VERSION = '4';
const CACHE_NAME = `gestor-financeiro-v${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => {
        // Pré-cache dos arquivos estáticos (CSS e JS do build)
        return caches.open(CACHE_NAME)
          .then(cache => {
            return fetch('/')
              .then(response => {
                if (response.ok) {
                  cache.put('/', response);
                }
              })
              .catch(() => {
                // Offline, sem problema
              });
          });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Deletar TODOS os caches antigos
          if (cacheName !== CACHE_NAME) {
            console.log('Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Para HTML, sempre tenta rede primeiro (stale-while-revalidate)
  if (event.request.url.includes('.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) {
            return caches.match(event.request) || response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(response => response || new Response('Offline'));
        })
    );
  } else {
    // Para outros recursos, cache first
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch(() => {
            return new Response('Offline');
          });
        })
    );
  }
});
          return response;
        });
      })
      .catch(() => {
        return new Response('Offline - conteúdo não disponível', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});
