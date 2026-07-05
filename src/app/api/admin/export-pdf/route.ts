import { NextResponse } from 'next/server';
import { verifyOperatorPin, logExportPdfAction } from '@/app/admin/audit-actions';
import { generarHtmlReporte, PDFTemplateData } from '@/lib/pdf/template';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { SecurityLogger } from '@/lib/logger/security-logger';
import { getTokens } from 'next-firebase-auth-edge';
import { rateLimit } from '@/lib/security/rate-limit';
export async function POST(request: Request) {
  try {
    // Protección Rate Limit (10 por 30 mins)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await rateLimit(`export-pdf:${ip}`, 10, 30 * 60 * 1000, 'exportPdfLimits');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Demasiadas exportaciones de PDF. Espera 30 minutos.' },
        { status: 429 }
      );
    }

    // 1.5. Validar cabecera Origin (Mitigación CSRF)
    const origin = request.headers.get('origin') || request.headers.get('Origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && origin && origin !== siteUrl) {
      return NextResponse.json(
        { error: 'Acceso prohibido: Origen no permitido (CSRF).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pin, data } = body as { pin: string; data: PDFTemplateData };

    if (!pin || !data || !data.items) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // Paso A: Validación segura del PIN
    const pinVerification = await verifyOperatorPin(pin);
    if (!pinVerification.success) {
      return NextResponse.json(
        { error: pinVerification.error || 'Autenticación fallida' },
        { status: 403 }
      );
    }

    // Paso B: Auditoría y Extracción de Identidad
    const cookieStore = await cookies();

    let adminEmail = 'admin_desconocido@desmulta.com';
    try {
      const tokens = await getTokens(cookieStore, {
        cookieName: '__session',
        cookieSignatureKeys: [
          process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT || '',
          process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS || '',
        ],
        serviceAccount: {
          projectId:
            process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        },
        apiKey:
          process.env.NEXT_PUBLIC_BASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      });
      if (tokens?.decodedToken?.email) {
        adminEmail = tokens.decodedToken.email;
      }
    } catch (e) {
      SecurityLogger.warn('[export-pdf] Error obteniendo tokens para watermark', {
        error: String(e),
      });
    }

    const filtrosArr = [
      data.filtros?.ciudad && `Ciudad: ${data.filtros.ciudad}`,
      data.filtros?.estado && `Estado: ${data.filtros.estado}`,
      data.filtros?.fechaInicio && `Desde: ${data.filtros.fechaInicio}`,
      data.filtros?.fechaFin && `Hasta: ${data.filtros.fechaFin}`,
    ].filter(Boolean);
    const filtrosStr = filtrosArr.length > 0 ? filtrosArr.join(' | ') : 'Todos';

    const auditResult = await logExportPdfAction(filtrosStr);
    if (!auditResult.success) {
      return NextResponse.json(
        { error: 'Error interno: No se pudo registrar la auditoría' },
        { status: 500 }
      );
    }

    // Paso C: Hash SHA-256 e inyección de datos anti-filtración
    const plaintextForHash = JSON.stringify(data.items);
    const integrityHash = createHash('sha256').update(plaintextForHash).digest('hex');
    data.integrityHash = integrityHash;

    // Asegurar que la identidad de la sesión sobrescribe cualquier spoofing
    if (!data.operatorDetails) {
      data.operatorDetails = { nombre: 'Operador', email: adminEmail, telefono: 'N/A' };
    } else {
      // Fuerza el email real por seguridad
      data.operatorDetails.email = adminEmail;
    }

    // Paso D: Generar HTML
    const htmlContent = generarHtmlReporte(data);

    try {
      const isLocal = process.env.NODE_ENV === 'development';
      // Por defecto a desmulta-colombia si no está la env
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'desmulta-colombia';

      // En functions v2 la url es dada por cloud run, pero usaremos un custom domain o la url estandar si está disponible. Mejor usamos la var de entorno si está, o el formato genérico de v1 fallback.
      const finalUrl =
        process.env.PDF_CLOUD_FUNCTION_URL ||
        (isLocal
          ? `http://127.0.0.1:5001/${projectId}/us-central1/generatePdf`
          : `https://us-central1-${projectId}.cloudfunctions.net/generatePdf`);

      const functionRes = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PDF_API_SECRET || 'dev_secret'}`,
        },
        body: JSON.stringify({ htmlContent }),
      });

      if (!functionRes.ok) {
        const errorText = await functionRes.text();
        throw new Error(`Cloud Function devolvió status: ${functionRes.status} - ${errorText}`);
      }

      const pdfBuffer = await functionRes.arrayBuffer();

      // Retornar el PDF binario
      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Reporte_Desmulta_${data.fechaExportacion}.pdf"`,
        },
      });
    } catch (pdfError) {
      SecurityLogger.error('[export-pdf] Error llamando a Cloud Function generatePdf', {
        error: String(pdfError),
      });

      return NextResponse.json(
        {
          error: 'Error de renderizado de PDF en el servidor.',
          details: 'El motor Chromium falló durante la compilación en Vercel.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    SecurityLogger.error('[export-pdf] Error general', { error: String(error) });
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}
