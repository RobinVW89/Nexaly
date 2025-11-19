// Service Worker pour Nexaly - Cache offline
const CACHE_NAME = 'nexaly-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/mentions-legales.html',
  '/politique-confidentialite.html',
  '/politique-cookies.html',
  '/public/vehicules/Volkswagen ID.3.png',
  '/public/vehicules/Volkswagen ID.5.png',
  '/public/vehicules/Peugeot E-3008.png',
  '/public/vehicules/Cupra Borne.png.avif'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Stratégie Cache First pour les ressources, Network First pour les pages
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - retourner la réponse du cache
        if (response) {
          return response;
        }

        // Cloner la requête
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cloner la réponse
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // En cas d'erreur réseau, retourner une page offline basique
          return new Response(
            '<h1>Mode hors ligne</h1><p>Vous êtes actuellement hors ligne. Veuillez vérifier votre connexion Internet.</p>',
            {
              headers: { 'Content-Type': 'text/html' }
            }
          );
        });
      })
  );
});
