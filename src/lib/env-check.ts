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
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:9005'),

  // Server Side (Optional but recommended)
  GEMINI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
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
