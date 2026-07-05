/**
 * Tests: followup-cron — Lógica de negocio del cron de seguimiento automático.
 * Valida: autenticación CRON_SECRET, elegibilidad de leads y anti-duplicado.
 *
 * Estos tests son puramente de lógica (sin llamadas reales a Firebase o Resend).
 */

import { describe, it, expect } from 'vitest';

// ── Funciones puras extraídas del cron para testeo aislado ────────────────────

/**
 * Determina si un lead es elegible para recibir un follow-up.
 * Replica exactamente la lógica del API route.
 */
function isLeadEligible(lead: {
  status: string;
  updatedAt: Date;
  followUpSentAt?: Date | null;
  email?: string;
}): boolean {
  // 1. Debe estar en estado "contactado"
  const ELIGIBLE_STATUSES = ['contactado'];
  if (!ELIGIBLE_STATUSES.includes(lead.status)) return false;

  // 2. No debe haber recibido un follow-up antes (anti-duplicado)
  if (lead.followUpSentAt) return false;

  // 3. Debe tener email válido
  if (!lead.email || !lead.email.includes('@')) return false;

  // 4. updatedAt debe ser mayor a 72 horas
  const now = new Date();
  const INACTIVITY_HOURS = 72;
  const cutoff = new Date(now.getTime() - INACTIVITY_HOURS * 60 * 60 * 1000);
  if (lead.updatedAt >= cutoff) return false;

  return true;
}

/**
 * Valida el header de autenticación del cron.
 */
function validateCronAuth(
  authHeader: string | null,
  expectedSecret: string
): { authorized: boolean; reason?: string } {
  if (!expectedSecret) return { authorized: false, reason: 'CRON_SECRET no configurado' };
  if (!authHeader) return { authorized: false, reason: 'Header de autorización ausente' };
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return { authorized: false, reason: 'Token inválido' };
  }
  return { authorized: true };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const MOCK_SECRET = 'daa7d6e80f24fcab415507dd953484039a06f2c3df091db0fea7f430e829d032';

describe('followup-cron — Autenticación', () => {
  it('rechaza petición sin header de autorización', () => {
    const result = validateCronAuth(null, MOCK_SECRET);
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe('Header de autorización ausente');
  });

  it('rechaza petición con token incorrecto', () => {
    const result = validateCronAuth('Bearer token-falso', MOCK_SECRET);
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe('Token inválido');
  });

  it('rechaza si CRON_SECRET no está configurado en el servidor', () => {
    const result = validateCronAuth('Bearer cualquier-cosa', '');
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe('CRON_SECRET no configurado');
  });

  it('aprueba petición con token correcto en formato Bearer', () => {
    const result = validateCronAuth(`Bearer ${MOCK_SECRET}`, MOCK_SECRET);
    expect(result.authorized).toBe(true);
  });
});

describe('followup-cron — Elegibilidad de leads', () => {
  const oldDate = new Date();
  oldDate.setHours(oldDate.getHours() - 80); // 80 horas atrás (> 72h)

  const recentDate = new Date();
  recentDate.setHours(recentDate.getHours() - 10); // 10 horas atrás (< 72h)

  it('marca como elegible un lead en "contactado" sin followUpSentAt y con email, > 72h', () => {
    const lead = {
      status: 'contactado',
      updatedAt: oldDate,
      email: 'cliente@ejemplo.com',
    };
    expect(isLeadEligible(lead)).toBe(true);
  });

  it('rechaza lead con estado diferente a "contactado" (ej: "caso nuevo")', () => {
    const lead = {
      status: 'caso nuevo',
      updatedAt: oldDate,
      email: 'cliente@ejemplo.com',
    };
    expect(isLeadEligible(lead)).toBe(false);
  });

  it('rechaza lead que ya tiene followUpSentAt (anti-duplicado)', () => {
    const lead = {
      status: 'contactado',
      updatedAt: oldDate,
      followUpSentAt: new Date(), // Ya fue enviado
      email: 'cliente@ejemplo.com',
    };
    expect(isLeadEligible(lead)).toBe(false);
  });

  it('rechaza lead actualizado hace menos de 72 horas (no inactivo aún)', () => {
    const lead = {
      status: 'contactado',
      updatedAt: recentDate, // Solo 10 horas atrás
      email: 'cliente@ejemplo.com',
    };
    expect(isLeadEligible(lead)).toBe(false);
  });

  it('rechaza lead sin email registrado', () => {
    const lead = {
      status: 'contactado',
      updatedAt: oldDate,
      email: '',
    };
    expect(isLeadEligible(lead)).toBe(false);
  });

  it('rechaza lead con email malformado', () => {
    const lead = {
      status: 'contactado',
      updatedAt: oldDate,
      email: 'no-es-un-email',
    };
    expect(isLeadEligible(lead)).toBe(false);
  });
});
