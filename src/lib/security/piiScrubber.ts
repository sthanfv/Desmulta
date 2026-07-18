/**
 * piiScrubber.ts: USO EN TELEMETRÍA — para sanitizar datos antes de enviarlos a Sentry/logs
 * NO usar para mostrar datos al usuario (reemplaza datos con tokens genéricos como [DOC_OCULTO]).
 * Motor de sanitización de PII (Información Personal Identificable).
 * Intercepta telemetría antes de enviarla a servicios de terceros.
 * @param {string} payload - Cadena JSON a sanitizar.
 * @returns {string} - Cadena con PII enmascarada.
 */
import type { ErrorEvent } from '@sentry/nextjs';

export function sanitizePII(payload: string): string {
  if (!payload || typeof payload !== 'string') return payload;

  return payload
    .replace(/[A-Z]{3}-?\d{3}/gi, '[PLACA_OCULTA]') // Placas colombianas (ej. ABC123, ABC-123)
    .replace(/\b\d{8,10}\b/g, '[DOC_OCULTO]') // Cédulas colombianas (8-10 dígitos)
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_OCULTO]') // Emails
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[TOKEN_OCULTO]') // UUIDs
    .replace(
      /([?&](?:token|downloadToken|temp_token|code|ref|cedula|celular|phone|whatsapp)=)[^&\s"'#]*/gi,
      '$1[REDACTED]'
    ); // Query params
}

/**
 * @param {Event} event - Objeto de evento de Sentry
 * @returns {Event} - Evento Sentry mutado de forma segura
 */
export function applyPIIScrubber(event: ErrorEvent): ErrorEvent {
  if (!event) return event;

  try {
    // 1. Mensaje Principal
    if (typeof event.message === 'string') {
      event.message = sanitizePII(event.message);
    }

    // 2. Valores de Excepción (Stacktrace)
    if (event.exception?.values && Array.isArray(event.exception.values)) {
      event.exception.values.forEach((ex) => {
        if (typeof ex.value === 'string') {
          ex.value = sanitizePII(ex.value);
        }
      });
    }

    // 3. Ruta de migas de pan (Breadcrumbs)
    if (event.breadcrumbs && Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs.forEach((crumb) => {
        if (typeof crumb.message === 'string') {
          crumb.message = sanitizePII(crumb.message);
        }
        if (crumb.data && typeof crumb.data === 'object') {
          try {
            crumb.data = JSON.parse(sanitizePII(JSON.stringify(crumb.data)));
          } catch {
            // Fallback de seguridad
          }
        }
      });
    }

    // 4. URL de Petición
    if (event.request && typeof event.request.url === 'string') {
      event.request.url = sanitizePII(event.request.url);
    }

    // 5. 🛡️ FIX AB-2: Sanitizar cabeceras de peticiones sensibles
    if (event.request?.headers && typeof event.request.headers === 'object') {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-internal-secret', 'x-wompi-signature'];
      sensitiveHeaders.forEach((h) => {
        if ((event.request!.headers as Record<string, string>)[h]) {
          (event.request!.headers as Record<string, string>)[h] = '[REDACTED]';
        }
      });
    }

    // 6. 🛡️ FIX AB-2: Sanitizar metadatos adicionales (extra context)
    if (event.extra && typeof event.extra === 'object') {
      try {
        event.extra = JSON.parse(sanitizePII(JSON.stringify(event.extra)));
      } catch {
        // Fallback de seguridad
      }
    }
  } catch (err) {
    console.warn('[QA-DevSecOps] Error mudo en la sobreescritura del Scrubber Sentry.', err);
  }

  return event;
}
