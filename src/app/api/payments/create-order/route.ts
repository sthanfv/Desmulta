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
import { createHash, timingSafeEqual } from 'crypto';
import { PRODUCT_PRICES } from '@/lib/payments/product-prices';
import { logger } from '@/lib/logger/security-logger';

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
    // 🛡️ FIX A-6: Prevención de inyección HTML/XSS en el payload del correo transaccional (Resend).
    // Sanear los caracteres peligrosos de inyección desde el Zod Schema usando transform y refine.
    infractorName: z
      .string()
      .min(1)
      .max(60)
      .transform((val) =>
        val
          .replace(/[<>'"\\\/\[\]{}|`]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .refine((val) => /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s\-\.]+$/.test(val), {
        message: 'El nombre solo puede contener letras, espacios, guiones y puntos.',
      }),
    infractorId: z.string().min(1).max(20),
    licensePlate: z.string().optional().default('N/A'),
    ticketNumber: z.string().optional(),
    antiguedad: z.string().optional(),
    estadoCoactivo: z.string().optional(),
    tipoInfraccion: z.string().optional(),
    ciudadEmision: z.string().optional(),
    autoridadTransito: z.string().optional(),
    direccionNotificacion: z.string().optional(),
    shortId: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/), // termina en Content-Disposition
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
    const secondsRemaining = Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Demasiadas solicitudes de pago. Intenta más tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': secondsRemaining.toString() },
      }
    );
  }

  // 🧨 CAOS ENGINEERING: Simular Caída de Pasarela de Pagos (Wompi)
  if (process.env.CHAOS_SIMULATE_WOMPI_DOWN?.replace(/"/g, '') === 'true') {
    logger.warn('[create-order] 🧨 CHAOS: Simulando Caída de Banco Wompi');
    return NextResponse.json(
      { error: 'Simulación de Caída de Banco Wompi (Chaos Engineering)' },
      { status: 503 }
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

  const db = getFirestore(getAdminApp());

  // 3. Llave de idempotencia (anti doble-clic).
  // [2026-09-22] FIX: antes se CONSULTABA sha256(cedula-producto) pero se GUARDABA
  // idempotencyKey = wompiReference → la reutilización nunca ocurría. Además, si hubiera
  // funcionado, entregaba la cookie dt_ de la orden a CUALQUIERA que conociera la cédula
  // (secuestro del documento pagado). Ahora: llave con HMAC y reutilización SOLO si el
  // navegador ya presenta la cookie dt_ de esa orden.
  const idempotencyKey = createHash('sha256')
    .update(`${hashPII(cedula)}:${productType}:${customerEmail.trim().toLowerCase()}`)
    .digest('hex');

  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!integritySecret) {
    return NextResponse.json(
      { error: 'Configuración de pagos incompleta (Integrity Secret faltante)' },
      { status: 500 }
    );
  }

  try {
    const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);

    const recentOrders = await db
      .collection('purchases')
      .where('idempotencyKey', '==', idempotencyKey)
      .where('status', '==', 'PENDING')
      .where('createdAt', '>', unaHoraAtras) // FIX: Solo reutilizar enlaces frescos
      .limit(1)
      .get();

    const existingOrder = recentOrders.empty ? null : recentOrders.docs[0].data();
    const presented = existingOrder
      ? req.cookies.get(`dt_${existingOrder.wompiReference}`)?.value || ''
      : '';
    const sameBrowser =
      !!existingOrder &&
      presented.length > 0 &&
      presented.length === String(existingOrder.downloadToken || '').length &&
      timingSafeEqual(Buffer.from(presented), Buffer.from(String(existingOrder.downloadToken)));

    if (existingOrder && sameBrowser) {
      // Reutilizar la orden existente (mismo navegador → doble clic / reintento)
      const existingRef = existingOrder.wompiReference;
      const existingDownloadToken = existingOrder.downloadToken;

      const integrityString = `${existingRef}${amountCop}COP${integritySecret}`;
      const signature = createHash('sha256').update(integrityString).digest('hex');

      const response = NextResponse.json({
        wompiReference: existingRef,
        amountCop,
        signature,
        publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
        redirectUrl: `${req.nextUrl.origin}/documentos/confirmacion?ref=${existingRef}`,
      });

      response.cookies.set(`dt_${existingRef}`, existingDownloadToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 72 * 60 * 60,
        path: '/',
      });
      return response;
    }
  } catch (error) {
    console.error('[create-order] Error al verificar idempotencia:', error);
  }

  // 4. Generar nueva referencia si no existe una PENDING
  // crypto.randomUUID() da ~122 bits de entropía
  const wompiReference = `DSM-${crypto.randomUUID()}`;

  // 5. Crear firma de integridad para Wompi
  const integrityString = `${wompiReference}${amountCop}COP${integritySecret}`;
  const signature = createHash('sha256').update(integrityString).digest('hex');

  // 5. Guardar la compra PENDIENTE en Firestore ANTES de redirigir a Wompi
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
        idempotencyKey,
        ipAddress: ip,
        downloadToken,
        // [2026-09-22] FIX: campos explícitos para que la DLQ pueda filtrar con == null
        pdfDeliveredAt: null,
        deliveryRetries: 0,
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
