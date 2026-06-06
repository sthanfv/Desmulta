import { ImageResponse } from 'next/og';
import { getBlogPostBySlug } from '@/lib/mdx';

export const runtime = 'nodejs';
export const alt = 'Artículo legal — Desmulta';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getBlogPostBySlug(params.slug);
  const titulo = post?.meta.title ?? 'Guía legal de tránsito';
  const extracto = post?.meta.excerpt ?? 'Información jurídica para tu defensa vial.';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0F172A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Banda amarilla superior */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '10px',
            background: '#FFC107',
          }}
        />
        {/* Banda amarilla inferior */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '10px',
            background: '#FFC107',
          }}
        />

        {/* Badge "Blog Legal" */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              background: 'rgba(255,193,7,0.15)',
              border: '1px solid rgba(255,193,7,0.4)',
              borderRadius: '100px',
              padding: '8px 20px',
              color: '#FFC107',
              fontSize: '22px',
              fontWeight: 600,
            }}
          >
            Blog Legal · Desmulta
          </div>
        </div>

        {/* Título del artículo */}
        <h1
          style={{
            fontSize: titulo.length > 60 ? '48px' : '60px',
            fontWeight: 900,
            color: 'white',
            lineHeight: 1.15,
            margin: '0 0 32px 0',
            maxWidth: '1000px',
          }}
        >
          {titulo}
        </h1>

        {/* Extracto */}
        <p
          style={{
            fontSize: '28px',
            color: '#94A3B8',
            margin: 0,
            maxWidth: '900px',
            lineHeight: 1.5,
          }}
        >
          {extracto.length > 120 ? extracto.slice(0, 117) + '...' : extracto}
        </p>

        {/* Logo abajo */}
        <div
          style={{
            position: 'absolute',
            bottom: '50px',
            right: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'white',
            fontSize: '28px',
            fontWeight: 900,
            letterSpacing: '-0.5px',
          }}
        >
          🛡️ Desmulta
        </div>
      </div>
    ),
    { ...size }
  );
}
