import { logger } from '@/lib/logger/security-logger';

/**
 * Mock SMS Provider
 * 
 * En producción, esto debería integrarse con Twilio, AWS SNS, Infobip, etc.
 * Actualmente imprime el código OTP en la consola del servidor.
 */
export async function sendOtpSms(celular: string, otpCode: string): Promise<void> {
  // Aquí iría la llamada HTTP al proveedor SMS.
  logger.info(`[SMS Mock] Enviando OTP ${otpCode} al celular ${celular}`);
  console.log(`[SMS MOCK] => Código OTP para ${celular}: ${otpCode}`);
  
  // Simulamos delay de red
  await new Promise((resolve) => setTimeout(resolve, 500));
}
