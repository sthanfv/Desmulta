import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';

/**
 * GET /api/og
 * Genera imágenes OpenGraph dinámicas por ciudad para mejorar el CTR
 * en búsquedas locales de Google, WhatsApp y redes sociales.
 *
 * Parámetros de query:
 *   ?ciudad=Bogotá  — nombre del municipio (requerido)
 *   ?dept=Cundinamarca — departamento (opcional)
 *
 * MANDATO-FILTRO v8.11.0 — Edge Runtime:
 * - Usa el runtime 'edge' (no Node.js) para generación de imagen ultrarápida
 *   sin cold-start. La imagen se genera en <50ms y se cachea en CDN automáticamente.
 * - Sin dependencias externas — usa canvas del runtime de Vercel.
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/image-response
 */
export const runtime = 'edge';

// Tamaño estándar OG — requerido por Facebook, WhatsApp, Twitter/X
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ciudad = searchParams.get('ciudad') || 'Colombia';
  const dept = searchParams.get('dept') || '';

  const type = searchParams.get('type') || 'city';
  const title = searchParams.get('title') || '';

  if (type === 'blog') {
    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#09090b',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '800px',
            height: '800px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,191,0,0.2) 0%, rgba(255,191,0,0) 70%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '80px 96px',
            flex: 1,
            gap: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255,191,0,0.15)',
              border: '1px solid rgba(255,191,0,0.3)',
              borderRadius: '100px',
              padding: '8px 20px',
            }}
          >
            <span
              style={{
                color: '#fde047',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              BLOG LEGAL
            </span>
          </div>
          <span
            style={{
              color: '#ffffff',
              fontSize: title.length > 50 ? '60px' : '72px',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              maxWidth: '900px',
            }}
          >
            {title}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 96px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ color: '#52525b', fontSize: '20px', fontWeight: 600 }}>
            Desmulta.online
          </span>
        </div>
      </div>,
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
      }
    );
  }

  // Línea secundaria: si hay departamento, lo mostramos; si no, solo Colombia
  const subtitulo = dept ? `${dept}, Colombia` : 'Colombia';

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#09090b', // zinc-950 — fondo oscuro de marca
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Fondo de gradiente radial — marca Desmulta */}
      <div
        style={{
          position: 'absolute',
          top: '-200px',
          left: '-200px',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0) 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '-100px',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)',
        }}
      />

      {/* Contenido principal */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px 96px',
          flex: 1,
          gap: '24px',
        }}
      >
        {/* Etiqueta de la marca */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '100px',
            padding: '8px 20px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#6366f1',
            }}
          />
          <span
            style={{
              color: '#a5b4fc',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            DESMULTA.ONLINE
          </span>
        </div>

        {/* Título con nombre de ciudad */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              opacity: 0.7,
            }}
          >
            Multas de Tránsito en
          </span>
          <span
            style={{
              color: '#ffffff',
              fontSize: '80px',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {ciudad}
          </span>
          <span
            style={{
              color: '#6366f1',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            {subtitulo}
          </span>
        </div>

        {/* Descripción */}
        <span
          style={{
            color: '#a1a1aa', // zinc-400
            fontSize: '22px',
            fontWeight: 400,
            lineHeight: 1.4,
            maxWidth: '700px',
          }}
        >
          Expertos en prescripción, impugnación y saneamiento de fotomultas y comparendos.
        </span>
      </div>

      {/* Footer de la imagen */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 96px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ color: '#52525b', fontSize: '18px', fontWeight: 500 }}>
          Consulta inicial gratuita
        </span>
        <span style={{ color: '#6366f1', fontSize: '18px', fontWeight: 700 }}>
          desmulta.online/servicios/{ciudad.toLowerCase().replace(/ /g, '-')}
        </span>
      </div>
    </div>,
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
    }
  );
}
