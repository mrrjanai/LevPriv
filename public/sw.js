// Minimal service worker - exists purely to satisfy Chrome's installability
// criteria for Android. Does not cache anything or work offline; this app
// is server-dependent by design (notes live in Redis, not on the device).
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Intentionally pass every request straight through to the network.
})