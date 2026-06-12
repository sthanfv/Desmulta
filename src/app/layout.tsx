import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
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
import { OCRPrewarmer } from '@/components/providers/OCRPrewarmer';
import { SystemHealthProvider } from '@/components/providers/SystemHealthProvider';
import { PWAAutoUpdater } from '@/components/providers/PWAAutoUpdater';

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
    default: 'Desmulta — Expertos en Multas de Tránsito Colombia',
    template: '%s | Desmulta — Saneamiento y Prescripción Legal',
  },
  description:
    'Análisis técnico de multas de tránsito en Colombia. Identificamos si su caso tiene fundamentos de prescripción, caducidad o vicios de notificación. Consulta inicial gratuita.',
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
  creator: 'Desmulta Corp',
  publisher: 'Desmulta Colombia',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === 'development' ? 'http://localhost:9005' : 'https://desmulta.online')
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
  const nonce = (await headers()).get('x-nonce') || '';

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

        {/* Meta Pixel Code (MANDATO-FILTRO) */}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <Script id="facebook-pixel" strategy="afterInteractive" nonce={nonce}>
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
        <ErrorBoundary>
          <FirebaseClientProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
              {/* MANDATO-FILTRO: El main es un contenedor limpio — HomeClient maneja su propio layout */}
              {/* PushProvider inyectado globalmente — escucha notificaciones en primer y segundo plano */}
              <SystemHealthProvider>
                <PushProvider>
                  <MotionProvider>
                    <OCRPrewarmer />
                    <PWAAutoUpdater />
                    <main id="main-content">{children}</main>
                  </MotionProvider>
                </PushProvider>
              </SystemHealthProvider>


              <ShadcnToaster />
            </ThemeProvider>
          </FirebaseClientProvider>
        </ErrorBoundary>

        {/* Google Analytics (MANDATO-FILTRO) */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} nonce={nonce} />
        )}

        {/* Vercel Speed Insights */}
        <SpeedInsights />

        {/* Telemetría Edge: Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
