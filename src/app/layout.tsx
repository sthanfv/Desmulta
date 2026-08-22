import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import { PushProvider } from '@/components/providers/PushProvider';
import { MotionProvider } from '@/components/providers/MotionProvider';
import { SystemHealthProvider } from '@/components/providers/SystemHealthProvider';
import { PWAAutoUpdater } from '@/components/providers/PWAAutoUpdater';
import { PageProgressBar } from '@/components/ui/PageProgressBar';
import { ChatAssistantWidget } from '@/components/chat/ChatAssistantWidget';

// Directiva Mobile-First y Adaptive del Sistema Operativo
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: 'Desmulta — Eliminación de Fotomultas y Saneamiento Vial en Colombia',
    template: '%s | Desmulta — Saneamiento y Prescripción Legal',
  },
  description:
    'Expertos en análisis técnico de multas de tránsito en Colombia. Logramos la prescripción, caducidad e impugnación de fotomultas por vicios de notificación. Consulta 100% gratuita.',
  applicationName: 'Desmulta Colombia',
  keywords: [
    'multas de tránsito Colombia',
    'fotomulta Colombia',
    'comparendo prescripción',
    'impugnar multa tránsito',
    'saneamiento multas',
    'prescripción multa de tránsito',
    'SIMIT Colombia',
    'comparendo fotomulta',
    'cómo eliminar multa de tránsito',
    'caducidad fotomultas',
  ],
  authors: [{ name: 'Desmulta Legal', url: 'https://desmulta.online' }],
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  creator: 'Desmulta Corp',
  publisher: 'Desmulta Colombia',
  // FIX SEO: Forzar siempre el dominio canónico de producción para evitar
  // que Vercel indexe subdominios (.vercel.app) en los bots de Google.
  metadataBase: new URL(
    process.env.NODE_ENV === 'development' ? 'http://localhost:9005' : 'https://desmulta.online'
  ),
  alternates: {
    canonical: '/',
    languages: {
      'es-CO': '/',
    },
  },
  openGraph: {
    title: 'Desmulta — Expertos en Multas de Tránsito Colombia',
    description:
      'Blindaje legal experto. Prescripción, impugnación y saneamiento de fotomultas y comparendos en Colombia con absoluta reserva.',
    url: 'https://desmulta.online',
    siteName: 'Desmulta',
    images: [
      {
        url: 'https://desmulta.online/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Desmulta — Expertos en Multas de Tránsito en Colombia',
      },
    ],
    locale: 'es_CO',
    type: 'website',
    countryName: 'Colombia',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Desmulta — Expertos en Multas de Tránsito',
    description: 'Blindaje legal experto para fotomultas y comparendos en Colombia.',
    images: ['https://desmulta.online/og-image.png'],
    creator: '@desmulta',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${geistSans.variable} font-sans`}>
      <head>
        {/* Pre-poblar conexión a dominios críticos */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {/* Cloudflare Turnstile — se carga en el paso 2 del formulario */}
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />
        {/* Firebase — autenticación anónima al cargar la app */}
        <link rel="preconnect" href="https://firebaseinstallations.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebaseinstallations.googleapis.com" />
      </head>
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen selection:bg-primary/30 selection:text-primary-foreground"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-bold"
        >
          Saltar al contenido principal
        </a>
        <PageProgressBar />
        <ErrorBoundary>
          <FirebaseClientProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
              {/* MANDATO-FILTRO: El main es un contenedor limpio — HomeClient maneja su propio layout */}
              {/* PushProvider inyectado globalmente — escucha notificaciones en primer y segundo plano */}
              <SystemHealthProvider>
                <PushProvider>
                  <MotionProvider>
                    <PWAAutoUpdater />
                    <main id="main-content" className="overflow-x-clip w-full relative">
                      {children}
                    </main>
                  </MotionProvider>
                </PushProvider>
              </SystemHealthProvider>

              <ShadcnToaster />
              <ChatAssistantWidget />
            </ThemeProvider>
          </FirebaseClientProvider>
        </ErrorBoundary>

        {/* Google Analytics (MANDATO-FILTRO) */}
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}

        {/* Vercel Speed Insights */}
        <SpeedInsights />

        {/* Telemetría Edge: Vercel Analytics */}
        <Analytics />

        {/* Meta Pixel Code (MANDATO-FILTRO) */}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <Script id="facebook-pixel" strategy="lazyOnload">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}

        {/* Microsoft Clarity - Auditoría de Comportamiento UX (Cero PII) */}
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <Script id="microsoft-clarity" strategy="lazyOnload">
            {`
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
