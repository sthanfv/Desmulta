/**
 * SecurityLogger: Motor de auditoría con ofuscación automática de PII (v2.3.5).
 */

type LogLevel = 'info' | 'warn' | 'error' | 'security';

interface LogContext {
  [key: string]: unknown;
}

class SecurityLogger {
  private static instance: SecurityLogger;

  private constructor() {}

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Ofusca datos sensibles en un objeto o string
   */
  private obfuscate(data: unknown): unknown {
    if (typeof data === 'string') {
      // Ofuscar Cédulas (ej: 1020***789)
      if (/^\d{6,12}$/.test(data)) {
        return `${data.slice(0, 4)}***${data.slice(-3)}`;
      }
      // Ofuscar Teléfonos (ej: 300***567)
      if (/^\+?\d{10,13}$/.test(data)) {
        return `${data.slice(0, 3)}***${data.slice(-3)}`;
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.obfuscate(item));
    }

    if (data !== null && typeof data === 'object') {
      const sanitized = Object.create(null);
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        // Guard against Prototype Pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }

        // Blacklist de llaves sensibles
        const sensitiveKeys = [
          'cedula',
          'contacto',
          'nombre',
          'placa',
          'email',
          'password',
          'token',
        ];

        if (sensitiveKeys.includes(key.toLowerCase())) {
          // eslint-disable-next-line security/detect-object-injection
          sanitized[key] = this.obfuscate(value);
        } else {
          // eslint-disable-next-line security/detect-object-injection
          sanitized[key] = this.obfuscate(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  public log(level: LogLevel, message: string, context?: LogContext) {
    const isProd = process.env.NODE_ENV === 'production';

    // En producción, solo logueamos eventos críticos y sanitizados
    if (isProd && level === 'info') return;

    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.obfuscate(context) : '';

    const formattedLog = `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(sanitizedContext)}`;

    switch (level) {
      case 'error':
      case 'security':
        console.error(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      default:
        console.log(formattedLog);
    }
  }

  public info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  public warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  public error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  public security(message: string, context?: LogContext) {
    this.log('security', `[SECURITY EVENT] ${message}`, context);
  }
}

export const logger = SecurityLogger.getInstance();
