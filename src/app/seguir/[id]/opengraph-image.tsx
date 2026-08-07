import { ImageResponse } from 'next/og';
import { getExpedienteCacheado } from '@/app/actions/tracking';

export const alt = 'Estado del Expediente - Desmulta';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const LABELS: Record<string, string> = {
  APERTURA: 'Apertura de Expediente',
  RADICADO: 'Radicado en SIMIT',
  TRAMITE: 'En Trámite',
  FINALIZADO: 'Caso Finalizado',
  NUEVO: 'Solicitud Recibida',
  CONTACTADO: 'En Contacto',
  ESTUDIO: 'En Estudio',
  CONVERTIDO: 'Expediente Iniciado',
  DESCARTADO: 'Caso No Viable',
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const targetId = resolvedParams.id;
  const caseData = await getExpedienteCacheado(targetId);
  
  const statusRaw = caseData?.status?.toUpperCase() || 'DESCONOCIDO';
  const estadoLabel = LABELS[statusRaw] || statusRaw;
  const shortId = caseData?.shortId || targetId.slice(0, 8);
  const nombre = caseData?.nombre ? caseData.nombre.split(' ')[0] : 'Ciudadano';

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
            border: '2px solid #D4AF37',
            borderRadius: '24px',
            padding: '60px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            width: '80%',
            boxShadow: '0 25px 50px -12px rgba(212, 175, 55, 0.1)',
          }}
        >
          {/* Logo / Brand */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <h1 style={{ color: '#D4AF37', fontSize: 36, fontWeight: 'bold', letterSpacing: '2px' }}>
              DESMULTA COLOMBIA
            </h1>
          </div>

          {/* Expediente ID */}
          <h2 style={{ color: '#ffffff', fontSize: 64, fontWeight: 'bold', margin: '20px 0' }}>
            Expediente {shortId}
          </h2>

          {/* Titular */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ color: '#A1A1AA', fontSize: 32, marginRight: '16px' }}>Titular:</span>
            <span style={{ color: '#ffffff', fontSize: 36, fontWeight: 'bold' }}>{nombre}</span>
          </div>

          {/* Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '40px',
              background: 'linear-gradient(90deg, #D4AF37 0%, #B8962E 100%)',
              padding: '16px 48px',
              borderRadius: '50px',
            }}
          >
            <span style={{ color: '#000000', fontSize: 32, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Estado: {estadoLabel}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
