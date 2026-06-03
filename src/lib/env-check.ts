import { z } from 'zod';

/**
 * envSchema - Esquema de validación para variables de entorno.
 * MANDATO-FILTRO: No credenciales hardcodeadas y validación estricta.
 */
const envSchema = z.object({
  // Firebase Client
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Falta API Key de Firebase'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),

  // Business Logic
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().regex(/^\d+$/, 'Número de WhatsApp inválido'),
  NEXT_PUBLIC_BRAND_NAME: z.string().default('Desmulta'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://desmulta.online'),

  // Security & Shield
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1, 'Falta Site Key de Cloudflare Turnstile'),

  // Server Side (Optional but recommended)
  GEMINI_API_KEY: z.string().min(10, 'Falta GEMINI_API_KEY para OCR multimodelo'),
  RESEND_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // ✅ Variables de seguridad críticas — obligatorias en producción
  COOKIE_SIGNATURE_SECRET: z.string().min(32, 'Debe tener mínimo 32 caracteres'),
  CRON_SECRET: z.string().min(20),
  INTERNAL_API_SECRET: z.string().min(20),
  RSA_PRIVATE_KEY: z.string().includes('BEGIN PRIVATE KEY'),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(20),
  VIP_JWT_SECRET: z.string().min(32, 'Falta VIP_JWT_SECRET para firmar sesiones'),
  PII_HMAC_SECRET: z.string().min(32, 'Falta PII_HMAC_SECRET para hashear datos sensibles'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * validateEnv - Valida que todas las variables de entorno necesarias estén presentes.
 * Debe ser llamado en el punto de entrada de la aplicación.
 */
export const validateEnv = () => {
  try {
    const parsed = envSchema.parse({
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
      NEXT_PUBLIC_BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      COOKIE_SIGNATURE_SECRET: process.env.COOKIE_SIGNATURE_SECRET,
      CRON_SECRET: process.env.CRON_SECRET,
      INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
      RSA_PRIVATE_KEY: process.env.RSA_PRIVATE_KEY,
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
      VIP_JWT_SECRET: process.env.VIP_JWT_SECRET,
      PII_HMAC_SECRET: process.env.PII_HMAC_SECRET,
    });
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Error de configuración (Variables de Entorno):');
      error.errors.forEach((err) => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
    }
    // En producción queremos que falle rápido si la configuración es crítica
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Configuración de entorno inválida. Abortando.');
    }
  }
};
