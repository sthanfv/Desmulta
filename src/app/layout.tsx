import type { Metadata, Viewport } from 'next';
import { cn } from '@/lib/utils';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import Script from 'next/script';
import { ThemeProvider } from '@/components/theme-provider';
import { Outfit } from 'next/font/google';
import { ScrollProgressBar } from '@/components/ui/ScrollProgressBar';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_PIXEL_ID;
const GSC_ID = process.env.NEXT_PUBLIC_GSC_ID;

export const viewport: Viewport = {
  themeColor: '#ffbf00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === 'development' ? 'http://localhost:9005' : 'https://desmulta.com')
  ),
  title: `${process.env.NEXT_PUBLIC_BRAND_NAME || 'Desmulta'} - Saneamiento de Multas de Tránsito`,
  description:
    'Gestionamos técnicamente sus trámites ante las Secretarías de Tránsito para sanear deudas administrativas de forma eficiente.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Desmulta',
    startupImage: [
      {
        url: '/splash-640x1136.png',
        media:
          '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: `Desmulta - Recupere su Tranquilidad Vial`,
    description: 'Gestión técnica de trámites de tránsito a nivel nacional.',
    type: 'website',
    images: [{ url: '/logo.png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {GSC_ID && <meta name="google-site-verification" content={GSC_ID} />}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LegalService',
              name: 'Desmulta Colombia',
              description:
                'Expertos en la gestión administrativa y saneamiento de trámites de tránsito a nivel nacional.',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'https://desmulta.com',
              telephone: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+573005648309',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'CO',
              },
              serviceType: 'Saneamiento de Trámites de Tránsito',
              areaServed: 'Colombia',
              priceRange: 'Gratis/Por Resultados',
            }),
          }}
        />
        {/* Google Analytics 4 */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
        {/* Meta Pixel */}
        {PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </head>
      <body className={cn(outfit.className, 'antialiased')} suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <FirebaseClientProvider>
            <ScrollProgressBar />
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
