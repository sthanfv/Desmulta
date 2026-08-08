import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '24px',
            padding: '60px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            width: '80%',
            height: '80%',
            boxShadow: '0 25px 50px -12px rgba(212, 175, 55, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            {/* Using the actual icon.png from public folder */}
            <img src="https://desmulta.online/icon.png" width={100} height={100} style={{ marginRight: '24px' }} />
            <h1 style={{ color: '#ffffff', fontSize: 64, fontWeight: '900', letterSpacing: '-1px', margin: 0 }}>
              DES<span style={{ color: '#D4AF37', fontStyle: 'italic' }}>MULTA</span>
            </h1>
          </div>
          <p
            style={{
              color: '#a1a1aa',
              fontSize: 32,
              marginTop: '10px',
              textAlign: 'center',
              fontWeight: '500',
              letterSpacing: '1px',
            }}
          >
            Expertos en Multas de Tránsito Colombia
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
