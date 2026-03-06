import { ImageResponse } from 'next/og';

// Forzamos el Edge Runtime para que la imagen se genere en milisegundos cerca del usuario
export const runtime = 'edge';

export const alt = 'Desmulta - Auditoría y Saneamiento Vial';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Next.js pasa automáticamente los parámetros de la URL (la ciudad) a esta función
export default async function Image({ params }: { params: { ciudad: string } }) {
  // Limpiamos el string de la ciudad (ej: "medellin" -> "Medellín")
  const ciudadCruda = decodeURIComponent(params.ciudad);
  const ciudadCapitalizada = ciudadCruda.charAt(0).toUpperCase() + ciudadCruda.slice(1);

  return new ImageResponse(
    <div
      style={{
        background: '#0F172A', // Tu Oxford Blue
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* Borde decorativo superior e inferior usando tu Regulation Yellow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '12px',
          background: '#FFC107',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '12px',
          background: '#FFC107',
        }}
      />

      {/* Logo / Nombre de la plataforma */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: '#FFC107',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '32px' }}>🛡️</span>
        </div>
        <span style={{ fontSize: '48px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
          Desmulta
        </span>
      </div>

      {/* Título Dinámico e Implacable */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
        }}
      >
        <h1
          style={{ fontSize: '72px', fontWeight: 900, color: 'white', lineHeight: 1.1, margin: 0 }}
        >
          ¿Fotomultas injustas en <span style={{ color: '#FFC107' }}>{ciudadCapitalizada}</span>?
        </h1>
        <p
          style={{
            fontSize: '36px',
            color: '#94A3B8',
            maxWidth: '900px',
            margin: 0,
            marginTop: '20px',
          }}
        >
          Auditoría legal por prescripción y fallas de notificación. Consulta tu viabilidad gratis.
        </p>
      </div>

      {/* Etiqueta de confianza en la parte inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 193, 7, 0.1)',
          border: '2px solid rgba(255, 193, 7, 0.3)',
          padding: '12px 24px',
          borderRadius: '100px',
          color: '#FFC107',
          fontSize: '24px',
          fontWeight: 600,
        }}
      >
        ✓ Sistema verificado en {ciudadCapitalizada}
      </div>
    </div>,
    {
      ...size,
    }
  );
}
