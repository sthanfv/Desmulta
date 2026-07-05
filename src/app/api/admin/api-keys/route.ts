import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { logger } from '@/lib/logger/security-logger';
import { apiError } from '@/lib/types/api-response';
import { invalidateApiKeyCache } from '@/lib/security/api-key-guard';
import type { ApiKeyDocument, ApiKeyPlan } from '@/lib/types/api-key';
import { API_KEY_PLANS } from '@/lib/types/api-key';
import { createHash, randomBytes } from 'crypto';
import { checkRateLimit } from '@/lib/security/rate-limit';

/**
 * API Route: /api/admin/api-keys
 *
 * CRUD de API Keys — Solo accesible por administradores autenticados con Firebase.
 *
 * GET  → Listar todas las API Keys (sin exponer los hashes)
 * POST → Crear una nueva API Key
 * DELETE → Revocar (desactivar) una API Key existente
 *
 * Seguridad:
 * - Requiere token JWT válido de Firebase Admin en la cookie __session
 * - Rate limit: 30 req/h (reutiliza el limiter de galería)
 * - La key NUNCA se expone en la base de datos. Solo su hash SHA-256.
 * - La key completa se devuelve UNA sola vez en la respuesta de creación.
 *
 * OWASP:
 * - A01:2021 (Broken Access Control): Resuelto con verificación de tokens Firebase Admin.
 * - A02:2021 (Cryptographic Failures): Resuelto con SHA-256 + randomBytes(32).
 */

const FIRESTORE_COLLECTION = 'api_keys';

// ─── Tipos de Planes Válidos ────────────────────────────────────────────────────

const PLANES_VALIDOS: ApiKeyPlan[] = ['starter', 'growth', 'enterprise'];

// ─── Helpers de Seguridad ──────────────────────────────────────────────────────

/**
 * Genera una API Key criptográficamente segura y su ID público.
 * Formato: "dm_live_<48 chars hex>"
 * Entropía: 192 bits (imposible de fuerza bruta).
 */
function generateApiKey(): { rawKey: string; keyId: string } {
  const random = randomBytes(24).toString('hex');
  const rawKey = `dm_live_${random}`;
  const keyId = `dm_live_${random.substring(0, 8)}`;
  return { rawKey, keyId };
}

/**
 * Genera el hash SHA-256 de una API Key para almacenar en Firestore.
 */
function hashApiKey(rawKey: string): string {
  return 'sha256:' + createHash('sha256').update(rawKey).digest('hex');
}

// ─── Verificación de Admin Firebase ───────────────────────────────────────────

/**
 * Verifica que el request viene de un administrador con sesión Firebase válida.
 * Retorna true si está autenticado como admin, false en cualquier otro caso.
 */
async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  try {
    const tokens = await getTokens(request.cookies, {
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

    if (!tokens) return false;

    // Verificar que el email del token sea un admin conocido
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim());
    const userEmail = tokens.decodedToken.email ?? '';
    if (adminEmails.length === 0 || (adminEmails.length === 1 && adminEmails[0] === '')) {
      logger.error('[admin/api-keys] ADMIN_EMAILS no configurada — acceso denegado a todos');
      return false;
    }
    return adminEmails.includes(userEmail);
  } catch {
    return false;
  }
}

/**
 * Valida que el header Origin coincida con la URL oficial del sitio.
 * Mitiga ataques de Cross-Site Request Forgery (CSRF).
 */
function verifyOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin') || request.headers.get('Origin');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && origin && origin !== siteUrl) {
    return false;
  }
  return true;
}

// ─── GET: Listar API Keys ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  const rl = await checkRateLimit('galleryUpload', `admin-api-keys:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError('RATE_LIMITED', 'Demasiadas solicitudes.'), { status: 429 });
  }

  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(apiError('AUTH_FAILED', 'No autorizado.'), { status: 401 });
  }

  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const snapshot = await db.collection(FIRESTORE_COLLECTION).orderBy('creadaEn', 'desc').get();

    const keys = snapshot.docs.map((doc) => {
      const data = doc.data() as ApiKeyDocument;
      return {
        keyId: data.keyId,
        nombre: data.nombre,
        email: data.email,
        plan: data.plan,
        activa: data.activa,
        creadaEn: data.creadaEn,
        expiresAt: data.expiresAt,
        usoTotal: data.usoTotal,
        usoMesActual: data.usoMesActual,
        mesActual: data.mesActual,
        ultimoUso: data.ultimoUso,
        quotaDelPlan: API_KEY_PLANS[data.plan],
        // NUNCA exponer keyHash ni la key real
      };
    });

    return NextResponse.json({ success: true, total: keys.length, keys }, { status: 200 });
  } catch (error) {
    logger.error('[admin/api-keys] Error al listar keys', { error: String(error) });
    return NextResponse.json(apiError('INTERNAL_ERROR', 'Error al obtener las keys.'), {
      status: 500,
    });
  }
}

// ─── POST: Crear API Key ───────────────────────────────────────────────────────

const CrearKeySchema = z.object({
  nombre: z.string().min(2, 'El nombre es requerido.').max(100),
  email: z.string().email('Email inválido.'),
  plan: z.enum(['starter', 'growth', 'enterprise'] as [ApiKeyPlan, ...ApiKeyPlan[]]),
  expiresAt: z.string().datetime().optional().nullable(),
  notaAdmin: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  // 🛡️ Validación de cabecera Origin (Mitigación CSRF)
  if (!verifyOrigin(request)) {
    return NextResponse.json(
      apiError('AUTH_FAILED', 'Acceso prohibido: Origen no permitido (CSRF).'),
      { status: 403 }
    );
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  const rl = await checkRateLimit('galleryUpload', `admin-api-keys-create:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError('RATE_LIMITED', 'Demasiadas solicitudes.'), { status: 429 });
  }

  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(apiError('AUTH_FAILED', 'No autorizado.'), { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError('VALIDATION_ERROR', 'JSON inválido.'), { status: 400 });
  }

  const parsed = CrearKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError('VALIDATION_ERROR', 'Datos inválidos.', parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { nombre, email, plan, expiresAt, notaAdmin } = parsed.data;

  if (!PLANES_VALIDOS.includes(plan)) {
    return NextResponse.json(apiError('VALIDATION_ERROR', 'Plan inválido.'), { status: 400 });
  }

  try {
    // 1. Generar la key y su hash
    const { rawKey, keyId } = generateApiKey();
    const keyHash = hashApiKey(rawKey);

    // 2. Construir el documento
    const ahora = new Date().toISOString();
    const mesActual = ahora.substring(0, 7); // "YYYY-MM"

    const keyDoc: ApiKeyDocument = {
      keyId,
      keyHash,
      nombre,
      email,
      plan,
      activa: true,
      creadaEn: ahora,
      expiresAt: expiresAt ?? null,
      usoTotal: 0,
      usoMesActual: 0,
      mesActual,
      notaAdmin: notaAdmin ?? undefined,
      ultimoUso: null,
    };

    // 3. Guardar en Firestore
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    await db.collection(FIRESTORE_COLLECTION).doc(keyId).set(keyDoc);

    logger.info('[admin/api-keys] API Key creada', { nombre, email, plan });

    // 4. Devolver la key completa UNA sola vez
    // ADVERTENCIA: Esta es la única vez que el sistema muestra la key completa.
    // El cliente debe guardarla de forma segura. No hay forma de recuperarla.
    return NextResponse.json(
      {
        success: true,
        mensaje:
          '⚠️ GUARDA ESTA KEY AHORA. No podrás verla de nuevo. Si la pierdes, deberás revocar y crear una nueva.',
        apiKey: rawKey, // ← Solo se devuelve aquí, nunca más
        keyId,
        plan,
        quotaDelPlan: API_KEY_PLANS[plan],
        expiresAt: expiresAt ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[admin/api-keys] Error al crear key', { error: String(error) });
    return NextResponse.json(apiError('INTERNAL_ERROR', 'Error al crear la API Key.'), {
      status: 500,
    });
  }
}

// ─── DELETE: Revocar API Key ───────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  // 🛡️ Validación de cabecera Origin (Mitigación CSRF)
  if (!verifyOrigin(request)) {
    return NextResponse.json(
      apiError('AUTH_FAILED', 'Acceso prohibido: Origen no permitido (CSRF).'),
      { status: 403 }
    );
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  const rl = await checkRateLimit('galleryDelete', `admin-api-keys-delete:${ip}`);
  if (!rl.success) {
    return NextResponse.json(apiError('RATE_LIMITED', 'Demasiadas solicitudes.'), { status: 429 });
  }

  const isAdmin = await verifyAdminAuth(request);
  if (!isAdmin) {
    return NextResponse.json(apiError('AUTH_FAILED', 'No autorizado.'), { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError('VALIDATION_ERROR', 'JSON inválido.'), { status: 400 });
  }

  const parsed = z.object({ keyId: z.string().min(10) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(apiError('VALIDATION_ERROR', 'keyId requerido.'), { status: 400 });
  }

  const { keyId } = parsed.data;

  try {
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);
    const docRef = db.collection(FIRESTORE_COLLECTION).doc(keyId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(apiError('NOT_FOUND', 'API Key no encontrada.'), { status: 404 });
    }

    // Revocar: marcar como inactiva (no eliminar, para mantener el historial)
    await docRef.update({ activa: false });

    // Invalidar caché de Redis para que el bloqueo sea inmediato
    await invalidateApiKeyCache(keyId);

    logger.info('[admin/api-keys] API Key revocada', { keyId });

    return NextResponse.json(
      {
        success: true,
        mensaje: 'API Key revocada correctamente. El acceso queda bloqueado de forma inmediata.',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[admin/api-keys] Error al revocar key', { error: String(error) });
    return NextResponse.json(apiError('INTERNAL_ERROR', 'Error al revocar la API Key.'), {
      status: 500,
    });
  }
}
