import { logger } from '@/lib/logger/security-logger';

/**
 * Mock SMS Provider (INACTIVO)
 *
 * ⚠️ NOTA DE ARQUITECTURA:
 * El proyecto actualmente no cuenta con presupuesto ni integración con una API
 * de SMS externa (Twilio, AWS SNS, Infobip, etc.).
 * Por lo tanto, cualquier intento de requerir OTP por SMS (como se recomendaba en
 * la auditoría para el Portal VIP) ha sido categorizado como "Riesgo Aceptado"
 * por el negocio, mitigado por un rate limiting agresivo.
 *
 * Esta función queda estrictamente como un MOCK inactivo.
 */
export async function sendOtpSms(celular: string, otpCode: string): Promise<void> {
  logger.warn(
    `[SMS Mock] Se intentó enviar un OTP, pero la infraestructura SMS está inactiva. Celular: ${celular}`
  );
  console.log(`[SMS MOCK INACTIVO] => Código OTP para ${celular}: ${otpCode}`);

  // Simulamos delay de red
  await new Promise((resolve) => setTimeout(resolve, 500));
}
