if (!self.define) {
  let e,
    n = {};
  const t = (t, r) => (
    (t = new URL(t + '.js', r).href),
    n[t] ||
      new Promise((n) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = t), (e.onload = n), document.head.appendChild(e));
        } else ((e = t), importScripts(t), n());
      }).then(() => {
        let e = n[t];
        if (!e) throw new Error(`Module ${t} didn’t register its module`);
        return e;
      })
  );
  self.define = (r, s) => {
    const c = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (n[c]) return;
    let a = {};
    const i = (e) => t(e, c),
      o = { module: { uri: c }, exports: a, require: i };
    n[c] = Promise.all(r.map((e) => o[e] || i(e))).then((e) => (s(...e), a));
  };
}
define(['./workbox-f1770938'], function (e) {
  'use strict';
  (importScripts('/fallback-ce627215c0e4a9af.js'),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/static/chunks/139.7a5a8e93a21948c1.js', revision: '7a5a8e93a21948c1' },
        { url: '/_next/static/chunks/286-6cccda17374337ce.js', revision: '6cccda17374337ce' },
        { url: '/_next/static/chunks/348-102a0dedb228e975.js', revision: '102a0dedb228e975' },
        { url: '/_next/static/chunks/420-9d1984b0c9d61af7.js', revision: '9d1984b0c9d61af7' },
        { url: '/_next/static/chunks/44-c3d0bb641e1603b3.js', revision: 'c3d0bb641e1603b3' },
        { url: '/_next/static/chunks/4bd1b696-21f374d1156f834a.js', revision: '21f374d1156f834a' },
        { url: '/_next/static/chunks/559-c7494bfcd9db5aa0.js', revision: 'c7494bfcd9db5aa0' },
        { url: '/_next/static/chunks/619-9168df9c2a29b74b.js', revision: '9168df9c2a29b74b' },
        { url: '/_next/static/chunks/635-4a8f3620e0f6d94f.js', revision: '4a8f3620e0f6d94f' },
        { url: '/_next/static/chunks/646.f342b7cffc01feb0.js', revision: 'f342b7cffc01feb0' },
        { url: '/_next/static/chunks/658-eacde13ce409f2c1.js', revision: 'eacde13ce409f2c1' },
        { url: '/_next/static/chunks/696-99c0873d8dabb53d.js', revision: '99c0873d8dabb53d' },
        {
          url: '/_next/static/chunks/app/_not-found/page-734ae0d593712742.js',
          revision: '734ae0d593712742',
        },
        {
          url: '/_next/static/chunks/app/admin/layout-6d213ebcba39a73d.js',
          revision: '6d213ebcba39a73d',
        },
        {
          url: '/_next/static/chunks/app/admin/page-abbfc7a855ff3cee.js',
          revision: 'abbfc7a855ff3cee',
        },
        {
          url: '/_next/static/chunks/app/api/create-consultation/route-846cdc07b53cdb48.js',
          revision: '846cdc07b53cdb48',
        },
        {
          url: '/_next/static/chunks/app/api/cron/retry-notifications/route-846cdc07b53cdb48.js',
          revision: '846cdc07b53cdb48',
        },
        {
          url: '/_next/static/chunks/app/api/notify/route-846cdc07b53cdb48.js',
          revision: '846cdc07b53cdb48',
        },
        {
          url: '/_next/static/chunks/app/api/telegram-webhook/route-846cdc07b53cdb48.js',
          revision: '846cdc07b53cdb48',
        },
        {
          url: '/_next/static/chunks/app/api/upload/route-846cdc07b53cdb48.js',
          revision: '846cdc07b53cdb48',
        },
        { url: '/_next/static/chunks/app/error-04fb941d9230d2bc.js', revision: '04fb941d9230d2bc' },
        {
          url: '/_next/static/chunks/app/layout-8f6cecf3a4bd2203.js',
          revision: '8f6cecf3a4bd2203',
        },
        { url: '/_next/static/chunks/app/page-44a1f61cceffb684.js', revision: '44a1f61cceffb684' },
        {
          url: '/_next/static/chunks/app/robots.txt/route-846cdc07b53cdb48.js',
          revision: '846cdc07b53cdb48',
        },
        {
          url: '/_next/static/chunks/app/sitemap.xml/route-846cdc07b53cdb48.js',
          revision: '846cdc07b53cdb48',
        },
        {
          url: '/_next/static/chunks/app/terminos/page-ec8420701bd1e8eb.js',
          revision: 'ec8420701bd1e8eb',
        },
        { url: '/_next/static/chunks/bc9e92e6-b695a50295ed481e.js', revision: 'b695a50295ed481e' },
        { url: '/_next/static/chunks/ceb9e9aa-817ab974e95e0037.js', revision: '817ab974e95e0037' },
        { url: '/_next/static/chunks/framework-1492b273e2c4ac92.js', revision: '1492b273e2c4ac92' },
        { url: '/_next/static/chunks/main-app-d49e8c4f02ead936.js', revision: 'd49e8c4f02ead936' },
        { url: '/_next/static/chunks/main-be085ee276666506.js', revision: 'be085ee276666506' },
        {
          url: '/_next/static/chunks/pages/_app-82835f42865034fa.js',
          revision: '82835f42865034fa',
        },
        {
          url: '/_next/static/chunks/pages/_error-013f4188946cdd04.js',
          revision: '013f4188946cdd04',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        { url: '/_next/static/chunks/webpack-84a1afcd1589004e.js', revision: '84a1afcd1589004e' },
        { url: '/_next/static/css/642a86d79cd309df.css', revision: '642a86d79cd309df' },
        { url: '/_next/static/css/f858252aa83cd5fd.css', revision: 'f858252aa83cd5fd' },
        {
          url: '/_next/static/media/7b0b24f36b1a6d0b-s.p.woff2',
          revision: '98ccc2b7f18991a5126a91ac56fbb1fc',
        },
        {
          url: '/_next/static/media/98848575513c9742-s.woff2',
          revision: 'e2b64ddcb351dbe7397e0da426a8c8d6',
        },
        {
          url: '/_next/static/q1MGFzayf52Nn1VrL6Vee/_buildManifest.js',
          revision: 'f0fd26747746aa43f882c78169d65b71',
        },
        {
          url: '/_next/static/q1MGFzayf52Nn1VrL6Vee/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/android-chrome-512x512.png', revision: '6fe84244dee76c535b9c887ae4cb93f6' },
        { url: '/fallback-ce627215c0e4a9af.js', revision: '59cd976709673f0e171d9e873c0ed15c' },
        { url: '/google390e0a55723f2003.html', revision: '7d3cb8a2e8d5b0334f2aae25bee7e5f6' },
        { url: '/logo.png', revision: '6fe84244dee76c535b9c887ae4cb93f6' },
        { url: '/manifest.json', revision: '3be008c1952e08f6d8815b6afe535b5a' },
        { url: '/offline.html', revision: '1392552f6ca9fe935372f4addec4056b' },
        { url: '/sitemap-0.xml', revision: '9018876177c75f1b713411d259c438e6' },
        { url: '/sitemap.xml', revision: '983f8bb67b8e95026ac130c5a6e94d89' },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: function (e) {
              var n = e.response;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [
                    2,
                    n && 'opaqueredirect' === n.type
                      ? new Response(n.body, { status: 200, statusText: 'OK', headers: n.headers })
                      : n,
                  ];
                });
              })();
            },
          },
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: 'next-static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      function (e) {
        var n = e.sameOrigin,
          t = e.url.pathname;
        return !(!n || t.startsWith('/api/auth/callback') || !t.startsWith('/api/'));
      },
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      function (e) {
        var n = e.request,
          t = e.url.pathname,
          r = e.sameOrigin;
        return (
          '1' === n.headers.get('RSC') &&
          '1' === n.headers.get('Next-Router-Prefetch') &&
          r &&
          !t.startsWith('/api/')
        );
      },
      new e.NetworkFirst({
        cacheName: 'pages-rsc-prefetch',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      function (e) {
        var n = e.request,
          t = e.url.pathname,
          r = e.sameOrigin;
        return '1' === n.headers.get('RSC') && r && !t.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'pages-rsc',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      function (e) {
        var n = e.url.pathname;
        return e.sameOrigin && !n.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'pages',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      function (e) {
        return !e.sameOrigin;
      },
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
          {
            handlerDidError: function (e) {
              var n = e.request;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [2, 'undefined' != typeof self ? self.fallback(n) : Response.error()];
                });
              })();
            },
          },
        ],
      }),
      'GET'
    ));
});
