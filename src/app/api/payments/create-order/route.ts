/**
 * @file create-order/route.ts
 * @description Endpoint de creación de órdenes de pago para el checkout de Wompi.
 *
 * FLUJO:
 *   1. Rate limiting exclusivo para pagos (cubeta 'checkoutOrder' — 3/hora por IP).
 *   2. Validación estricta del cuerpo con Zod.
 *   3. Cálculo del monto desde el diccionario server-side (fuente de verdad).
 *   4. Generación de referencia única y firma de integridad para Wompi.
 *   5. Persistencia de la pre-orden en Firestore en estado PENDING.
 *   6. Retorno de los datos para que el frontend abra el checkout de Wompi.
 *
 * PRECIOS:
 *   Los precios se definen EXCLUSIVAMENTE en el diccionario `PRODUCT_PRICES`
 *   de este archivo. El frontend NO debe tener precios hardcodeados; debe
 *   consumir el endpoint `GET /api/payments/prices` para renderizarlos.
 *
 * HISTORIAL:
 *   - v1.0.0 (2026-06-21): Implementación inicial.
 *   - v1.1.0 (2026-06-22): Corrección auditoría — se migra el rate limit de
 *     la cubeta compartida 'consultation' a la cubeta exclusiva 'checkoutOrder',
 *     evitando bloqueos cruzados entre flujos de consulta y de pago.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { hashPII } from '@/lib/security/server-crypto';
import { createHash } from 'crypto';
import { PRODUCT_PRICES } from '@/lib/payments/product-prices';

const schema = z.object({
  productType: z.enum([
    'peticion_general',
    'prescripcion_directa',
    'doble_prescripcion',
    'nulidad_notificacion',
    'tutela_silencio',
    'caducidad_1_anio',
    'nulidad_falta_identidad',
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
  const { getSecureIp } = await import('@/lib/security/ip-utils');
  const ip = getSecureIp(req);

  // 1. Rate limiting — cubeta EXCLUSIVA para pagos: máx 3 órdenes por IP por hora.
  // Se usa 'checkoutOrder' (NO 'consultation') para evitar bloqueos cruzados:
  // si un usuario ha usado la calculadora o el formulario de consulta, ese
  // historial NO debe afectar su capacidad de realizar un pago.
  const rl = await checkRateLimit('checkoutOrder', ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes de pago. Intenta en unos minutos.' },
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
  // 🛡️ FIX: la referencia ya NO depende de shortId+timestamp (colisionable).
  // crypto.randomUUID() da ~122 bits de entropía, eliminando la posibilidad de colisiones accidentales o provocadas.
  const wompiReference = `DSM-${crypto.randomUUID()}`;

  // 4. Crear firma de integridad para Wompi
  // Fórmula Wompi: SHA256(reference + amountInCents + currency + integritySecret)
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!integritySecret) {
    return NextResponse.json(
      { error: 'Configuración de pagos incompleta (Integrity Secret faltante)' },
      { status: 500 }
    );
  }
  const integrityString = `${wompiReference}${amountCop}COP${integritySecret}`;
  const signature = createHash('sha256').update(integrityString).digest('hex');

  // 5. Guardar la compra PENDIENTE en Firestore ANTES de redirigir a Wompi
  const db = getFirestore(getAdminApp());
  const hashedCedula = hashPII(cedula);
  const hashedCelular = hashPII(celular);
  const downloadToken = crypto.randomUUID();

  try {
    // 🛡️ FIX: .create() falla atómicamente (ALREADY_EXISTS) si el doc ya
    // existe. A diferencia de .set(), JAMÁS sobrescribe una orden previa.
    await db
      .collection('purchases')
      .doc(wompiReference)
      .create({
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
        downloadToken,
        // 🛡️ FIX: expiración del enlace y control de descargas (Hallazgo 5)
        downloadTokenExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h de validez
        downloadCount: 0,
        maxDownloads: 5,
      });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 6 /* ALREADY_EXISTS */) {
      return NextResponse.json(
        { error: 'Referencia en conflicto. Por favor intenta de nuevo.' },
        { status: 409 }
      );
    }
    throw err;
  }

  // 6. Devolver los datos para que el frontend abra el checkout de Wompi
  const response = NextResponse.json({
    wompiReference,
    amountCop,
    signature,
    publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
    redirectUrl: `${req.nextUrl.origin}/documentos/confirmacion?ref=${wompiReference}`,
  });

  // 🛡️ FIX: Establecer Cookie HttpOnly en lugar de enviar el secreto al frontend (Hallazgo 1)
  response.cookies.set(`dt_${wompiReference}`, downloadToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 72 * 60 * 60, // 72 horas
    path: '/',
  });

  return response;
}
