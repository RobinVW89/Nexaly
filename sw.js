// Service Worker pour Nexaly - Cache offline optimisé
const CACHE_NAME = 'nexaly-v3';
const STATIC_CACHE = 'nexaly-static-v3';
const DYNAMIC_CACHE = 'nexaly-dynamic-v3';

// Assets statiques à mettre en cache immédiatement
const staticAssets = [
  '/',
  '/index.html',
  '/public/vehicules/Volkswagen ID.3.png',
  '/public/vehicules/Volkswagen ID.5.png',
  '/public/vehicules/Peugeot E-3008.png',
  '/public/vehicules/Cupra Borne.png.avif'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] ✅ Cache statique ouvert');
        return cache.addAll(staticAssets);
      })
      .then(() => self.skipWaiting()) // Activer immédiatement le nouveau SW
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] 🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prendre le contrôle immédiatement
  );
});

// Stratégie de cache optimisée
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Stratégie Cache-First pour les assets statiques (images, fonts, etc.)
  if (request.destination === 'image' || 
      request.destination === 'font' || 
      request.destination === 'style' ||
      request.destination === 'script') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stratégie Network-First pour le HTML et les API calls
  if (request.destination === 'document' || 
      url.pathname.endsWith('.html') ||
      url.hostname.includes('formspree') ||
      url.hostname.includes('clarity')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Par défaut: Cache-First avec fallback réseau
  event.respondWith(cacheFirst(request));
});

// Stratégie Cache-First (assets statiques)
async function cacheFirst(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] 📦 Depuis le cache:', request.url);
      return cachedResponse;
    }

    console.log('[SW] 🌐 Depuis le réseau:', request.url);
    const networkResponse = await fetch(request);
    
    // Mettre en cache la nouvelle réponse si elle est valide
    if (networkResponse && networkResponse.status === 200) {
      const clonedResponse = networkResponse.clone();
      cache.put(request, clonedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] ❌ Erreur cache-first:', error);
    return offlineFallback(request);
  }
}

// Stratégie Network-First (HTML, API)
async function networkFirst(request) {
  try {
    console.log('[SW] 🌐 Network-first pour:', request.url);
    const networkResponse = await fetch(request);
    
    // Mettre en cache pour utilisation offline
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] ⚠️ Réseau indisponible, utilisation du cache');
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return offlineFallback(request);
  }
}

// Page de fallback offline
function offlineFallback(request) {
  if (request.destination === 'document') {
    return new Response(
      `<!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mode Hors Ligne - Nexaly</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #0F3A5E 0%, #1a5080 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 2rem;
          }
          .offline-container {
            text-align: center;
            max-width: 500px;
          }
          h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #00D4FF, #00FFB3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          p {
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 2rem;
            opacity: 0.9;
          }
          .btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, #00D4FF, #00FFB3);
            color: #0F3A5E;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: transform 0.3s ease;
          }
          .btn:hover {
            transform: translateY(-2px);
          }
          .offline-icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
          }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="offline-icon">📡</div>
          <h1>Mode Hors Ligne</h1>
          <p>Vous êtes actuellement hors ligne. Veuillez vérifier votre connexion Internet et réessayer.</p>
          <a href="/" class="btn" onclick="window.location.reload()">Réessayer</a>
        </div>
      </body>
      </html>`,
      {
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
  
  // Pour les autres types de requêtes
  return new Response('Mode hors ligne', { 
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}
