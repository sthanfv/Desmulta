import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  // ✅ En producción: error visible en Vercel logs, no silencioso
  throw new Error(
    '[resend] RESEND_API_KEY no configurada. El servicio de email no puede arrancar.'
  );
}

import { logger } from '@/lib/logger/security-logger';

if (!apiKey) {
  logger.warn('[Resend] RESEND_API_KEY no detectada. El envío de correos fallará en desarrollo.');
}

export const resend = new Resend(apiKey);
