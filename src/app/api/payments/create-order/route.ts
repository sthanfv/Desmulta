import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { hashPII } from '@/lib/security/server-crypto';
import { createHash } from 'crypto';

// Precios en CENTAVOS COP
const PRODUCT_PRICES: Record<string, number> = {
  peticion_general: 2500000, // $25.000 COP
  prescripcion_directa: 3500000, // $35.000 COP
  doble_prescripcion: 4500000, // $45.000 COP
  nulidad_notificacion: 3000000, // $30.000 COP
  tutela_silencio: 5000000, // $50.000 COP
  poder_especial: 2000000, // $20.000 COP
};

const schema = z.object({
  productType: z.enum([
    'peticion_general',
    'prescripcion_directa',
    'doble_prescripcion',
    'nulidad_notificacion',
    'tutela_silencio',
    'poder_especial',
  ]),
  customerEmail: z.string().email(),
  cedula: z.string().min(5).max(12),
  celular: z.string().min(10).max(12),
  caseData: z.object({
    infractorName: z.string().min(1),
    infractorId: z.string().min(1),
    licensePlate: z.string().optional().default('N/A'),
    ticketNumber: z.string().optional(),
    antiguedad: z.string().optional(),
    estadoCoactivo: z.string().optional(),
    tipoInfraccion: z.string().optional(),
    ciudadEmision: z.string().optional(),
    autoridadTransito: z.string().optional(),
    direccionNotificacion: z.string().optional(),
    shortId: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

  // 1. Rate limiting — máx 5 órdenes por IP por hora
  const rl = await checkRateLimit('consultation', ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
      { status: 429 }
    );
  }

  // 2. Validar body
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { productType, customerEmail, cedula, celular, caseData } = parsed.data;
  const amountCop = PRODUCT_PRICES[productType];

  // 3. Generar referencia única para esta transacción
  const timestamp = Date.now();
  const shortId = caseData.shortId.replace('CASE', '').slice(0, 6);
  const wompiReference = `DSM-${shortId}-${timestamp}`;

  // 4. Crear firma de integridad para Wompi
  // Fórmula Wompi: SHA256(reference + amountInCents + currency + integritySecret)
  const integrityString = `${wompiReference}${amountCop}COP${process.env.WOMPI_INTEGRITY_SECRET}`;
  const signature = createHash('sha256').update(integrityString).digest('hex');

  // 5. Guardar la compra PENDIENTE en Firestore ANTES de redirigir a Wompi
  const db = getFirestore(getAdminApp());
  const hashedCedula = hashPII(cedula);
  const hashedCelular = hashPII(celular);

  await db
    .collection('purchases')
    .doc(wompiReference)
    .set({
      id: wompiReference,
      wompiReference,
      productType,
      productLabel: caseData.infractorName + ' — ' + productType,
      amountCop,
      status: 'PENDING',
      hashedCedula,
      hashedCelular,
      customerEmail,
      caseData: { ...caseData, citizenEmail: customerEmail },
      createdAt: FieldValue.serverTimestamp(),
      idempotencyKey: wompiReference,
      ipAddress: ip,
    });

  // 6. Devolver los datos para que el frontend abra el checkout de Wompi
  return NextResponse.json({
    wompiReference,
    amountCop,
    signature,
    publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
    redirectUrl: `${req.nextUrl.origin}/documentos/confirmacion?ref=${wompiReference}`,
  });
}
