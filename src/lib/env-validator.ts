import { z } from 'zod';
import { SecurityLogger } from '@/lib/logger/security-logger';

// Esquema de validación estricto para variables de entorno críticas y altas
const envSchema = z.object({
  // CRÍTICAS - Criptografía y Firebase Admin
  PII_HMAC_SECRET: z.string().min(16, 'Mínimo 16 caracteres para seguridad'),
  PII_ENCRYPTION_KEY: z
    .string()
    .min(32, 'La clave de encriptación PII debe tener al menos 32 caracteres'),
  RSA_PRIVATE_KEY: z.string().min(100, 'Debe ser una llave RSA válida en formato PEM'),
  NEXT_PUBLIC_RSA_KEY: z.string().min(100, 'Debe ser una llave pública RSA válida en formato PEM'),
  AUTH_COOKIE_SIGNATURE_KEY_CURRENT: z.string().min(16, 'Mínimo 16 caracteres para seguridad'),

  FIREBASE_PROJECT_ID: z.string().min(1, 'Requerido para Firebase Admin'),
  FIREBASE_CLIENT_EMAIL: z.string().email('Debe ser el email de la Service Account'),
  FIREBASE_PRIVATE_KEY: z.string().min(100, 'Debe ser la llave privada de la Service Account'),

  // ALTAS - Operatividad de Cliente y API
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  CLIENT_PORTAL_JWT_SECRET: z.string().min(16),
  VIP_JWT_SECRET: z.string().min(16),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(16),
  COOKIE_SIGNATURE_SECRET: z.string().min(32, 'Debe tener mínimo 32 caracteres'),
  CRON_SECRET: z.string().min(20),
  OPERATOR_PIN: z.string().min(4, 'OPERATOR_PIN debe tener al menos 4 caracteres'),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(20),

  // PAGOS - Wompi
  WOMPI_PRIVATE_KEY: z.string().min(20, 'Clave privada Wompi requerida'),
  WOMPI_EVENTS_SECRET: z.string().min(10, 'Secret de eventos Wompi requerido'),
  WOMPI_INTEGRITY_SECRET: z.string().min(10, 'Integrity secret Wompi requerido'),
  NEXT_PUBLIC_WOMPI_PUBLIC_KEY: z.string().min(10, 'Clave pública Wompi requerida'),

  // Estas son opcionales según el caso (e.g. rotación de cookies)
  AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS: z.string().optional(),
});

/**
 * Valida que todas las variables de entorno requeridas estén configuradas correctamente.
 * Se ejecuta durante el arranque del servidor (instrumentation.ts).
 */
export function validateEnvVariables() {
  // Evitar romper los tests unitarios o builds en la nube que no necesiten secretos reales.
  // En Next.js, 'test' es comúnmente usado por Vitest/Jest.
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const isProductionMode = process.env.NODE_ENV === 'production';
  // Vercel u otros CIs setean CI=1 o VERCEL=1
  const isCI = process.env.CI === '1' || process.env.CI === 'true';

  // 🛡️ DEVSECOPS: Validar SIEMPRE valores por defecto inseguros en producción antes de cualquier otra cosa
  if (isProductionMode && !isCI) {
    if (!process.env.DEFAULT_OPERATOR_ID || process.env.DEFAULT_OPERATOR_ID === '0000000000') {
      throw new Error(
        '💥 STARTUP ABORTADO: DEFAULT_OPERATOR_ID no configurado o es el valor por defecto en producción.'
      );
    }

    if (
      !process.env.OPERATOR_PIN ||
      process.env.OPERATOR_PIN.length < 4 ||
      process.env.OPERATOR_PIN === '1234'
    ) {
      throw new Error(
        '💥 STARTUP ABORTADO: OPERATOR_PIN no configurado o es demasiado débil (mínimo 4 caracteres) en producción.'
      );
    }

    if (
      !process.env.NEXT_PUBLIC_DEBUG_PIN ||
      process.env.NEXT_PUBLIC_DEBUG_PIN.length < 4 ||
      process.env.NEXT_PUBLIC_DEBUG_PIN === '1234'
    ) {
      throw new Error(
        '💥 STARTUP ABORTADO: NEXT_PUBLIC_DEBUG_PIN no configurado o es demasiado débil (mínimo 4 caracteres) en producción.'
      );
    }
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    SecurityLogger.error(
      '❌ [FATAL ERROR] Variables de entorno críticas faltantes o inválidas',
      parsed.error.format()
    );

    // En producción (y no en CI puro sin entorno runtime) rompemos el arranque
    if (isProductionMode && !isCI) {
      console.error(
        '💥 STARTUP ABORTADO: Faltan secretos criptográficos o credenciales requeridas.'
      );
      throw new Error(
        'El servidor no puede arrancar en producción sin las variables de entorno críticas configuradas correctamente.'
      );
    } else {
      // En desarrollo o durante la compilación CI local emitimos una advertencia ruidosa pero permitimos continuar
      SecurityLogger.warn(
        '⚠️ ATENCIÓN: El servidor está corriendo en modo desarrollo con variables de entorno CRÍTICAS faltantes o inválidas.'
      );
    }
  } else {
    // Si la base es correcta, verificamos las MEDIAS (Solo emiten warnings, no crashean)
    const missingMedias: string[] = [];
    if (!process.env.GEMINI_API_KEY) missingMedias.push('GEMINI_API_KEY');
    if (!process.env.TELEGRAM_BOT_TOKEN) missingMedias.push('TELEGRAM_BOT_TOKEN');
    if (!process.env.TELEGRAM_CHAT_ID) missingMedias.push('TELEGRAM_CHAT_ID');
    if (!process.env.RESEND_API_KEY) missingMedias.push('RESEND_API_KEY');
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) missingMedias.push('NEXT_PUBLIC_SENTRY_DSN');
    if (!process.env.SENTRY_WEBHOOK_SECRET) missingMedias.push('SENTRY_WEBHOOK_SECRET');
    // TELEGRAM_SECURITY_CHAT_ID: Chat separado para alertas de seguridad (exportaciones masivas).
    // Si no está configurado, logExportAction() fallará silenciosamente sin emitir alerta.
    if (!process.env.TELEGRAM_SECURITY_CHAT_ID) missingMedias.push('TELEGRAM_SECURITY_CHAT_ID');

    if (missingMedias.length > 0) {
      SecurityLogger.warn(
        `[EnvValidator] Variables opcionales faltantes. El sistema operará con funciones degradadas: ${missingMedias.join(
          ', '
        )}`
      );
    } else {
      SecurityLogger.info('✅ Todas las variables de entorno validadas exitosamente.');
    }
  }
}
