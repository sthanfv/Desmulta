importScripts('/firebase-app-compat.js');
importScripts('/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAiRkUuVLUIYLLl80WW8drvxGHKgE__lB4",
  projectId: "studio-9140393615-6d1a3",
  messagingSenderId: "10695562214",
  appId: "1:10695562214:web:cf04e10c87f2d0242a3c27",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  if (payload.notification) {
    return;
  }

  const notificationTitle = payload.data?.title || '🔔 Novedad en tu expediente';
  const targetUrl = payload.fcmOptions?.link
    || payload.data?.url
    || 'https://desmulta.online/estado';

  const notificationOptions = {
    body: payload.data?.body || 'Tu caso ha sido actualizado. Toca para ver los detalles.',
    icon: '/icon.png',
    badge: '/maskable_icon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'desmulta-estado',
    renotify: true,
    requireInteraction: false,
    data: { url: targetUrl },
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || 'https://desmulta.online/estado';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('desmulta.online') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    if (data.from) return; 
    
    const title = data.title || '🔔 Desmulta';
    const options = {
      body: data.body || 'Actualización en tu expediente.',
      icon: '/icon.png',
      badge: '/maskable_icon.png',
      tag: 'desmulta-push',
      data: { url: data.url || 'https://desmulta.online/estado' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
  }
});
