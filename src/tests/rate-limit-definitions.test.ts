// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

// Mock de Redis para evitar conectar al servidor real de Upstash
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({})),
  },
}));

vi.mock('@upstash/ratelimit', () => {
  const limitMock = vi.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 1000,
  });

  return {
    Ratelimit: class MockRatelimit {
      limiter: any;
      limit = limitMock;
      constructor(config: any) {
        this.limiter = config.limiter;
      }
      static slidingWindow(tokens: number, window: string) {
        return { tokens, window };
      }
    },
    limitMock, // Exportamos para poder referenciarlo
  };
});

import { rateLimiters, rateLimit } from '@/lib/security/rate-limit';

describe('🛡️ Rate Limiting — Configuración y Límites', () => {
  it('Debe tener configurados los límites requeridos en todas las cubetas', () => {
    // Leads: 10 por 15 minutos
    expect(rateLimiters.leads.limiter.tokens).toBe(10);
    expect(rateLimiters.leads.limiter.window).toBe('15 m');

    // OCR: 3 por semana (modificado a petición del usuario)
    expect(rateLimiters.ocr.limiter.tokens).toBe(3);
    expect(rateLimiters.ocr.limiter.window).toBe('7 d');

    // Validación rápida: 3 por 1 minuto
    expect(rateLimiters.validarOtp.limiter.tokens).toBe(3);
    expect(rateLimiters.validarOtp.limiter.window).toBe('1 m');

    // QR: 60 por 1 hora
    expect(rateLimiters.qr.limiter.tokens).toBe(60);
    expect(rateLimiters.qr.limiter.window).toBe('1 h');

    // Referidos: 5 por 24 horas
    expect(rateLimiters.referidos.limiter.tokens).toBe(5);
    expect(rateLimiters.referidos.limiter.window).toBe('24 h');

    // Consultation: 10 por 24 horas
    expect(rateLimiters.consultation.limiter.tokens).toBe(10);
    expect(rateLimiters.consultation.limiter.window).toBe('24 h');

    // Checkout: 3 por 1 hora
    expect(rateLimiters.checkoutOrder.limiter.tokens).toBe(3);
    expect(rateLimiters.checkoutOrder.limiter.window).toBe('1 h');

    // Gallery Upload: 20 por 1 hora
    expect(rateLimiters.galleryUpload.limiter.tokens).toBe(20);
    expect(rateLimiters.galleryUpload.limiter.window).toBe('1 h');

    // Gallery Delete: 10 por 1 hora
    expect(rateLimiters.galleryDelete.limiter.tokens).toBe(10);
    expect(rateLimiters.galleryDelete.limiter.window).toBe('1 h');

    // God Mode: 3 por 30 minutos
    expect(rateLimiters.godMode.limiter.tokens).toBe(3);
    expect(rateLimiters.godMode.limiter.window).toBe('30 m');

    // Operator Pin: 5 por 15 minutos
    expect(rateLimiters.operatorPin.limiter.tokens).toBe(5);
    expect(rateLimiters.operatorPin.limiter.window).toBe('15 m');

    // Export PDF: 10 por 30 minutos
    expect(rateLimiters.exportPdf.limiter.tokens).toBe(10);
    expect(rateLimiters.exportPdf.limiter.window).toBe('30 m');

    // Login Cedula: 5 por 1 hora
    expect(rateLimiters.loginCedula.limiter.tokens).toBe(5);
    expect(rateLimiters.loginCedula.limiter.window).toBe('1 h');

    // VIP Auth: 5 por 15 minutos
    expect(rateLimiters.vipAuth.limiter.tokens).toBe(5);
    expect(rateLimiters.vipAuth.limiter.window).toBe('15 m');

    // Telemetry: 3 por 24 horas
    expect(rateLimiters.telemetry.limiter.tokens).toBe(3);
    expect(rateLimiters.telemetry.limiter.window).toBe('24 h');

    // Crash Report: 20 por 1 minuto
    expect(rateLimiters.crashReport.limiter.tokens).toBe(20);
    expect(rateLimiters.crashReport.limiter.window).toBe('1 m');

    // 🛡️ Nuevas cubetas agregadas por auditoría
    expect(rateLimiters.referral.limiter.tokens).toBe(3);
    expect(rateLimiters.referral.limiter.window).toBe('10 m');

    expect(rateLimiters.abandonment.limiter.tokens).toBe(5);
    expect(rateLimiters.abandonment.limiter.window).toBe('1 h');

    expect(rateLimiters.webPushRegister.limiter.tokens).toBe(5);
    expect(rateLimiters.webPushRegister.limiter.window).toBe('1 h');

    expect(rateLimiters.webPushRevoke.limiter.tokens).toBe(10);
    expect(rateLimiters.webPushRevoke.limiter.window).toBe('1 h');
  });

  it('Debe mapear correctamente las llamadas clásicas a las nuevas cubetas', async () => {
    const { limitMock } = (await import('@upstash/ratelimit')) as any;
    limitMock.mockClear();

    // OCR
    await rateLimit('test-ip', 2, 600, 'ocrRateLimits');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:ocr:test-ip');

    // QR
    await rateLimit('test-ip', 3, 600, 'qrRateLimits');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:qr:test-ip');

    // Referidos (mapea a referral, cubeta aislada)
    await rateLimit('test-ip', 5, 600, 'referidosCooldowns');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:referral:test-ip');

    // Validar OTP
    await rateLimit('test-ip', 10, 60, 'validar_consulta_rl');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:validarOtp:test-ip');

    // Leads (mapea a abandonment, cubeta aislada)
    await rateLimit('test-ip', 10, 60, 'abandonmentRateLimits');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:abandonment:test-ip');

    // Consultation
    await rateLimit('test-ip', 5, 60, 'consultationCooldowns');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:consultation:test-ip');

    // Crash Report
    await rateLimit('test-ip', 20, 60, 'crash_reports_cooldown');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:crashReport:test-ip');

    // Gallery Upload
    await rateLimit('test-ip', 20, 60, 'galleryRateLimits');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:galleryUpload:test-ip');

    // Export PDF
    await rateLimit('test-ip', 10, 60, 'exportPdfLimits');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:exportPdf:test-ip');

    // Telemetry
    await rateLimit('test-ip', 3, 60, 'telemetryCooldowns');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:telemetry:test-ip');

    // Web Push Register/Revoke -> cubetas aisladas
    await rateLimit('test-ip', 5, 60, 'web_push_register_rl');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:webPushRegister:test-ip');

    await rateLimit('test-ip', 5, 60, 'web_push_revoke_rl');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:webPushRevoke:test-ip');

    // Expediente Action -> expedienteAction
    await rateLimit('test-ip', 5, 60, 'expediente_action_rl');
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:expedienteAction:test-ip');

    // Prefijo god-mode-auth: -> godMode
    await rateLimit('god-mode-auth:user123', 3, 60);
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:godMode:god-mode-auth:user123');

    // Prefijo operator-pin: -> operatorPin
    await rateLimit('operator-pin:op123', 5, 60);
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:operatorPin:operator-pin:op123');

    // Prefijo estado_login_ -> loginCedula
    await rateLimit('estado_login_ip123', 5, 60);
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:loginCedula:estado_login_ip123');

    // Prefijo vip-auth: -> vipAuth
    await rateLimit('vip-auth:ip123', 5, 60);
    expect(limitMock).toHaveBeenLastCalledWith('ratelimit:vipAuth:vip-auth:ip123');
  });
});
