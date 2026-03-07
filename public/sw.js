if (!self.define) {
  let e,
    n = {};
  const t = (t, s) => (
    (t = new URL(t + '.js', s).href),
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
  self.define = (s, r) => {
    const a = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (n[a]) return;
    let c = {};
    const i = (e) => t(e, a),
      o = { module: { uri: a }, exports: c, require: i };
    n[a] = Promise.all(s.map((e) => o[e] || i(e))).then((e) => (r(...e), c));
  };
}
define(['./workbox-f1770938'], function (e) {
  'use strict';
  (importScripts('/fallback-ce627215c0e4a9af.js'),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/static/-3Ncc_nQ7EcDw3CUcHUXv/_buildManifest.js',
          revision: '57b0cc1548ec21a517a56fba35d1efa8',
        },
        {
          url: '/_next/static/-3Ncc_nQ7EcDw3CUcHUXv/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/_next/static/chunks/1068-5c77fb400a551279.js', revision: '5c77fb400a551279' },
        { url: '/_next/static/chunks/1646.9123ee47220ed70b.js', revision: '9123ee47220ed70b' },
        { url: '/_next/static/chunks/1658-1e3419b0955c51a5.js', revision: '1e3419b0955c51a5' },
        { url: '/_next/static/chunks/1885-5a1125346dc4c443.js', revision: '5a1125346dc4c443' },
        { url: '/_next/static/chunks/2619-3c9e02e22d10480a.js', revision: '3c9e02e22d10480a' },
        { url: '/_next/static/chunks/2825-f67e3c15d55a3ded.js', revision: 'f67e3c15d55a3ded' },
        { url: '/_next/static/chunks/3223.b182246e91c7d7f5.js', revision: 'b182246e91c7d7f5' },
        { url: '/_next/static/chunks/3286-afb0eda11a4f80e6.js', revision: 'afb0eda11a4f80e6' },
        { url: '/_next/static/chunks/4210-399914a093e2ff87.js', revision: '399914a093e2ff87' },
        { url: '/_next/static/chunks/4696-bdd1a0c93806401e.js', revision: 'bdd1a0c93806401e' },
        { url: '/_next/static/chunks/4bd1b696-f6bedae49f0827a5.js', revision: 'f6bedae49f0827a5' },
        { url: '/_next/static/chunks/5139.c5e46d26064a85db.js', revision: 'c5e46d26064a85db' },
        { url: '/_next/static/chunks/7185-52d91de7d1feabc0.js', revision: '52d91de7d1feabc0' },
        { url: '/_next/static/chunks/7559-33c3ac4b891d51da.js', revision: '33c3ac4b891d51da' },
        { url: '/_next/static/chunks/7945-85af66fb1b73c6ce.js', revision: '85af66fb1b73c6ce' },
        { url: '/_next/static/chunks/9398-c6dcd91c6e5f6102.js', revision: 'c6dcd91c6e5f6102' },
        {
          url: '/_next/static/chunks/app/_not-found/page-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/admin/layout-2276314ec2a23b74.js',
          revision: '2276314ec2a23b74',
        },
        {
          url: '/_next/static/chunks/app/admin/loading-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/admin/page-18af878a3777ec32.js',
          revision: '18af878a3777ec32',
        },
        {
          url: '/_next/static/chunks/app/api/create-consultation/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/api/cron/cleanup-blob/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/api/cron/retry-notifications/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/api/notify/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/api/telegram-webhook/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/api/upload/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/api/validar-consulta/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/blog/%5Bslug%5D/page-349de5b2b44b2583.js',
          revision: '349de5b2b44b2583',
        },
        {
          url: '/_next/static/chunks/app/blog/page-349de5b2b44b2583.js',
          revision: '349de5b2b44b2583',
        },
        { url: '/_next/static/chunks/app/error-ac62b38000e904be.js', revision: 'ac62b38000e904be' },
        {
          url: '/_next/static/chunks/app/faq/page-7fbd283dd1fcfe83.js',
          revision: '7fbd283dd1fcfe83',
        },
        {
          url: '/_next/static/chunks/app/layout-9cb35f3806da4055.js',
          revision: '9cb35f3806da4055',
        },
        {
          url: '/_next/static/chunks/app/manifest.webmanifest/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/metodologia/page-2a63d85e945b546b.js',
          revision: '2a63d85e945b546b',
        },
        {
          url: '/_next/static/chunks/app/not-found-349de5b2b44b2583.js',
          revision: '349de5b2b44b2583',
        },
        {
          url: '/_next/static/chunks/app/offline/page-e4c1f6ac4fb2f691.js',
          revision: 'e4c1f6ac4fb2f691',
        },
        { url: '/_next/static/chunks/app/page-532bf9e7a7f455dd.js', revision: '532bf9e7a7f455dd' },
        {
          url: '/_next/static/chunks/app/robots.txt/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/servicios/%5Bciudad%5D/opengraph-image/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/servicios/%5Bciudad%5D/page-7487a289858f331a.js',
          revision: '7487a289858f331a',
        },
        {
          url: '/_next/static/chunks/app/servicios/page-e1d0830cd633f93a.js',
          revision: 'e1d0830cd633f93a',
        },
        {
          url: '/_next/static/chunks/app/sitemap.xml/route-a44217e924328dfc.js',
          revision: 'a44217e924328dfc',
        },
        {
          url: '/_next/static/chunks/app/terminos/page-b29ec19a04fad748.js',
          revision: 'b29ec19a04fad748',
        },
        { url: '/_next/static/chunks/bc9e92e6-7bc3a47eb846fe9c.js', revision: '7bc3a47eb846fe9c' },
        { url: '/_next/static/chunks/c15bf2b0-c59ed6c02f757fc5.js', revision: 'c59ed6c02f757fc5' },
        { url: '/_next/static/chunks/ceb9e9aa-897957b2c77f9fbb.js', revision: '897957b2c77f9fbb' },
        { url: '/_next/static/chunks/framework-4b8bff41d25f2cea.js', revision: '4b8bff41d25f2cea' },
        { url: '/_next/static/chunks/main-753a649054d31ac6.js', revision: '753a649054d31ac6' },
        { url: '/_next/static/chunks/main-app-93b81f16e52c7daa.js', revision: '93b81f16e52c7daa' },
        {
          url: '/_next/static/chunks/pages/_app-131c90850aef965b.js',
          revision: '131c90850aef965b',
        },
        {
          url: '/_next/static/chunks/pages/_error-e4ba546eb376bdf4.js',
          revision: 'e4ba546eb376bdf4',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        { url: '/_next/static/chunks/webpack-2180d61bb242af7d.js', revision: '2180d61bb242af7d' },
        { url: '/_next/static/css/5084eb8d77ffd111.css', revision: '5084eb8d77ffd111' },
        { url: '/_next/static/css/642a86d79cd309df.css', revision: '642a86d79cd309df' },
        { url: '/_next/static/css/b460b1ed0d4b6af2.css', revision: 'b460b1ed0d4b6af2' },
        {
          url: '/_next/static/media/7b0b24f36b1a6d0b-s.p.woff2',
          revision: '98ccc2b7f18991a5126a91ac56fbb1fc',
        },
        {
          url: '/_next/static/media/98848575513c9742-s.woff2',
          revision: 'e2b64ddcb351dbe7397e0da426a8c8d6',
        },
        { url: '/fallback-ce627215c0e4a9af.js', revision: '4dcf244407b1873fdbf7691cc5089fdc' },
        { url: '/google390e0a55723f2003.html', revision: '7d3cb8a2e8d5b0334f2aae25bee7e5f6' },
        { url: '/hero-bg.avif', revision: '39586ba51bdf7cf925ece6483010029c' },
        { url: '/icon.png', revision: 'c9cc3bb7e293b3b2554e67084566c668' },
        { url: '/manifest.json', revision: 'ba33dd77c19131176cf8e2e6e068b32d' },
        { url: '/offline.html', revision: '1392552f6ca9fe935372f4addec4056b' },
        { url: '/oficina.avif', revision: 'ec6aeda7a3897eed999b911ef3e59b8f' },
        { url: '/sw-custom.js', revision: '36979c81b13f96bcee31b9a5e292e319' },
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
          s = e.sameOrigin;
        return (
          '1' === n.headers.get('RSC') &&
          '1' === n.headers.get('Next-Router-Prefetch') &&
          s &&
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
          s = e.sameOrigin;
        return '1' === n.headers.get('RSC') && s && !t.startsWith('/api/');
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
