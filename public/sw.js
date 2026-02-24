if (!self.define) {
  let e,
    a = {};
  const s = (s, n) => (
    (s = new URL(s + '.js', n).href),
    a[s] ||
      new Promise((a) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = s), (e.onload = a), document.head.appendChild(e));
        } else ((e = s), importScripts(s), a());
      }).then(() => {
        let e = a[s];
        if (!e) throw new Error(`Module ${s} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, c) => {
    const t = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (a[t]) return;
    let i = {};
    const r = (e) => s(e, t),
      o = { module: { uri: t }, exports: i, require: r };
    a[t] = Promise.all(n.map((e) => o[e] || r(e))).then((e) => (c(...e), i));
  };
}
define(['./workbox-f1770938'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/static/chunks/139.7a5a8e93a21948c1.js', revision: '7a5a8e93a21948c1' },
        { url: '/_next/static/chunks/286-6cccda17374337ce.js', revision: '6cccda17374337ce' },
        { url: '/_next/static/chunks/348-ff4be1f8887615a2.js', revision: 'ff4be1f8887615a2' },
        { url: '/_next/static/chunks/4bd1b696-21f374d1156f834a.js', revision: '21f374d1156f834a' },
        { url: '/_next/static/chunks/559-db4bef10122c472f.js', revision: 'db4bef10122c472f' },
        { url: '/_next/static/chunks/600-b6a8b13fa61d65ea.js', revision: 'b6a8b13fa61d65ea' },
        { url: '/_next/static/chunks/646.f342b7cffc01feb0.js', revision: 'f342b7cffc01feb0' },
        { url: '/_next/static/chunks/658-eacde13ce409f2c1.js', revision: 'eacde13ce409f2c1' },
        { url: '/_next/static/chunks/667-c0614f9e435a14b6.js', revision: 'c0614f9e435a14b6' },
        { url: '/_next/static/chunks/696-99c0873d8dabb53d.js', revision: '99c0873d8dabb53d' },
        { url: '/_next/static/chunks/803-98b0fbb6adaca788.js', revision: '98b0fbb6adaca788' },
        { url: '/_next/static/chunks/813-f4ed10520e373e04.js', revision: 'f4ed10520e373e04' },
        {
          url: '/_next/static/chunks/app/_not-found/page-30911cae3170a6ae.js',
          revision: '30911cae3170a6ae',
        },
        {
          url: '/_next/static/chunks/app/admin/layout-8de022cd260a8cb9.js',
          revision: '8de022cd260a8cb9',
        },
        {
          url: '/_next/static/chunks/app/admin/page-ba11c9d77ee499b8.js',
          revision: 'ba11c9d77ee499b8',
        },
        {
          url: '/_next/static/chunks/app/api/create-consultation/route-30911cae3170a6ae.js',
          revision: '30911cae3170a6ae',
        },
        {
          url: '/_next/static/chunks/app/api/notify/route-30911cae3170a6ae.js',
          revision: '30911cae3170a6ae',
        },
        {
          url: '/_next/static/chunks/app/api/upload/route-30911cae3170a6ae.js',
          revision: '30911cae3170a6ae',
        },
        { url: '/_next/static/chunks/app/error-04fb941d9230d2bc.js', revision: '04fb941d9230d2bc' },
        {
          url: '/_next/static/chunks/app/layout-cf375df7afcc0722.js',
          revision: 'cf375df7afcc0722',
        },
        {
          url: '/_next/static/chunks/app/not-found-ca7cb91fdc14215a.js',
          revision: 'ca7cb91fdc14215a',
        },
        { url: '/_next/static/chunks/app/page-12ccd56fba689dcb.js', revision: '12ccd56fba689dcb' },
        {
          url: '/_next/static/chunks/app/robots.txt/route-30911cae3170a6ae.js',
          revision: '30911cae3170a6ae',
        },
        {
          url: '/_next/static/chunks/app/sitemap.xml/route-30911cae3170a6ae.js',
          revision: '30911cae3170a6ae',
        },
        {
          url: '/_next/static/chunks/app/terminos/page-a69c9af5daf28815.js',
          revision: 'a69c9af5daf28815',
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
        { url: '/_next/static/chunks/webpack-efaf8725e55e63d5.js', revision: 'efaf8725e55e63d5' },
        { url: '/_next/static/css/6b911ff2a6d16ae9.css', revision: '6b911ff2a6d16ae9' },
        {
          url: '/_next/static/media/7b0b24f36b1a6d0b-s.p.woff2',
          revision: '98ccc2b7f18991a5126a91ac56fbb1fc',
        },
        {
          url: '/_next/static/media/98848575513c9742-s.woff2',
          revision: 'e2b64ddcb351dbe7397e0da426a8c8d6',
        },
        {
          url: '/_next/static/osQkx-S77Jnq4luH7FHRV/_buildManifest.js',
          revision: 'cd85317586c21eb30d1d71ef61cf8651',
        },
        {
          url: '/_next/static/osQkx-S77Jnq4luH7FHRV/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/android-chrome-512x512.png', revision: '6fe84244dee76c535b9c887ae4cb93f6' },
        { url: '/google390e0a55723f2003.html', revision: '7d3cb8a2e8d5b0334f2aae25bee7e5f6' },
        { url: '/logo.png', revision: '6fe84244dee76c535b9c887ae4cb93f6' },
        { url: '/manifest.json', revision: '9138025716f2c17435a174deaae70fb3' },
        { url: '/robots.txt', revision: 'a79e67158616987a84376e7b86e63255' },
        { url: '/sitemap-0.xml', revision: '5f09024b9608bc52da023e5f6b497586' },
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
              var a = e.response;
              return _async_to_generator(function () {
                return _ts_generator(this, function (e) {
                  return [
                    2,
                    a && 'opaqueredirect' === a.type
                      ? new Response(a.body, { status: 200, statusText: 'OK', headers: a.headers })
                      : a,
                  ];
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
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: 'next-static-js-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
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
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      function (e) {
        var a = e.sameOrigin,
          s = e.url.pathname;
        return !(!a || s.startsWith('/api/auth/callback') || !s.startsWith('/api/'));
      },
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      function (e) {
        var a = e.request,
          s = e.url.pathname,
          n = e.sameOrigin;
        return (
          '1' === a.headers.get('RSC') &&
          '1' === a.headers.get('Next-Router-Prefetch') &&
          n &&
          !s.startsWith('/api/')
        );
      },
      new e.NetworkFirst({
        cacheName: 'pages-rsc-prefetch',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      function (e) {
        var a = e.request,
          s = e.url.pathname,
          n = e.sameOrigin;
        return '1' === a.headers.get('RSC') && n && !s.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'pages-rsc',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      function (e) {
        var a = e.url.pathname;
        return e.sameOrigin && !a.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'pages',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
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
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 })],
      }),
      'GET'
    ));
});
