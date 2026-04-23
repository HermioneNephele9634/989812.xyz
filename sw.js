// Service Worker - 推送通知
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '小克找你';
  const options = {
    body: data.body || '有新消息',
    icon: '/icon.png',
    badge: '/badge.png',
    tag: 'keepalive-message',
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://989812.xyz')
  );
});
