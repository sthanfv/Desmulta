import { ImageResponse } from 'next/og';
import ciudadesData from '@/lib/data/ciudades.json';

export const runtime = 'edge';
export const alt = 'Multas de tránsito — Desmulta';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { ciudad: string } }) {
  const ciudad = ciudadesData.find((c) => c.slug === params.ciudad);
  const nombreCiudad = ciudad?.nombre ?? decodeURIComponent(params.ciudad);
  const entidad = ciudad?.entidadTransito ?? 'Secretaría de Tránsito';

  return new ImageResponse(
    <div
      style={{
        background: '#0F172A',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px',
        fontFamily: 'sans-serif',
        position: 'relative',
        textAlign: 'center',
      }}
    >
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <span style={{ fontSize: '44px' }}>🛡️</span>
        <span style={{ fontSize: '44px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
          Desmulta
        </span>
      </div>

      <h1
        style={{
          fontSize: '68px',
          fontWeight: 900,
          color: 'white',
          lineHeight: 1.1,
          margin: '0 0 24px 0',
        }}
      >
        Fotomultas en <span style={{ color: '#FFC107' }}>{nombreCiudad}</span>
      </h1>

      <p style={{ fontSize: '32px', color: '#94A3B8', margin: '0 0 40px 0', maxWidth: '800px' }}>
        Auditoría ante la {entidad}. Prescripción, caducidad y nulidades.
      </p>

      <div
        style={{
          background: 'rgba(255,193,7,0.12)',
          border: '2px solid rgba(255,193,7,0.35)',
          borderRadius: '100px',
          padding: '14px 32px',
          color: '#FFC107',
          fontSize: '26px',
          fontWeight: 600,
        }}
      >
        ✓ Consulta gratis en {nombreCiudad}
      </div>
    </div>,
    { ...size }
  );
}
