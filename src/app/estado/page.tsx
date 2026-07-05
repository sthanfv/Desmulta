'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginClientPortal } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, Search, ArrowRight, AlertTriangle, Clock, Lock } from 'lucide-react';
import Link from 'next/link';

/**
 * Portal de Seguimiento del Cliente
 *
 * Manejo de errores:
 * - Errores de validación: banner inline visible debajo de los campos
 * - Rate-limit (429): banner especial con ícono de reloj y tiempo de espera
 * - Error interno: banner genérico de conexión
 *
 * NO usa toast/sonner — el toast no es visible en /estado porque el Toaster
 * está en el layout raíz pero con posición bottom-right en desktop,
 * y en mobile top-center puede quedar oculto por el teclado.
 * El banner inline garantiza visibilidad en cualquier dispositivo.
 */

type ErrorType = 'validation' | 'rate_limit' | 'not_found' | 'internal' | null;

interface PortalError {
  type: ErrorType;
  message: string;
}

function parseError(message: string): PortalError {
  const lower = message.toLowerCase();

  if (lower.includes('demasiados intentos') || lower.includes('minuto')) {
    return { type: 'rate_limit', message };
  }

  if (lower.includes('no encontramos') || lower.includes('no tiene portal')) {
    return { type: 'not_found', message };
  }

  if (lower.includes('error interno') || lower.includes('conexión')) {
    return { type: 'internal', message };
  }

  return { type: 'validation', message };
}

function ErrorBanner({ error }: { error: PortalError }) {
  const isRateLimit = error.type === 'rate_limit';
  const isInternal = error.type === 'internal';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'flex items-start gap-3 rounded-xl p-4 text-sm border',
        isRateLimit
          ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300'
          : isInternal
            ? 'bg-zinc-50 border-zinc-200 text-zinc-700 dark:bg-zinc-900/50 dark:border-zinc-700 dark:text-zinc-400'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-400',
      ].join(' ')}
    >
      <span className="shrink-0 mt-0.5">
        {isRateLimit ? (
          <Clock className="w-4 h-4" aria-hidden="true" />
        ) : (
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        )}
      </span>
      <div className="flex flex-col gap-1">
        <span className="font-semibold leading-snug">
          {isRateLimit
            ? 'Acceso temporalmente bloqueado'
            : isInternal
              ? 'Error de conexión'
              : 'No se pudo verificar'}
        </span>
        <span className="font-normal leading-relaxed opacity-90">{error.message}</span>
        {isRateLimit && (
          <span className="font-normal opacity-75 text-xs mt-0.5">
            Por seguridad, el sistema limita los intentos fallidos. Por favor espere antes de
            reintentar.
          </span>
        )}
      </div>
    </div>
  );
}

export default function ClientPortalLogin() {
  const [loading, setLoading] = useState(false);
  const [portalError, setPortalError] = useState<PortalError | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setPortalError(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginClientPortal(formData);

    if (result.success && result.trackingUuid) {
      router.push(`/seguir/${result.trackingUuid}`);
    } else {
      const errorMsg = result.error || 'No se pudo acceder al portal.';
      setPortalError(parseError(errorMsg));
      setLoading(false);
    }
  }

  const isRateLimited = portalError?.type === 'rate_limit';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
            Portal de Seguimiento
          </h1>
          <p className="text-muted-foreground text-sm">
            Consulte el estado de su expediente con los datos de registro.
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground text-lg font-semibold">Acceso seguro</CardTitle>
            <CardDescription className="text-muted-foreground">
              Ingrese los datos con los que registró su consulta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ── Banner de error — siempre visible, ocupa su espacio ── */}
              {portalError && <ErrorBanner error={portalError} />}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Número de cédula{' '}
                  <span className="text-xs text-muted-foreground font-normal">
                    (Opcional si solo dio su celular)
                  </span>
                </label>
                <div className="relative">
                  <Input
                    name="cedula"
                    placeholder="Ej. 1020304050"
                    className="pl-10 h-12 rounded-xl border-border/50 bg-background focus-visible:ring-primary/20"
                    disabled={isRateLimited || loading}
                    autoComplete="off"
                    aria-describedby={portalError ? 'portal-error' : undefined}
                  />
                  <Shield className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Celular de contacto</label>
                <div className="relative">
                  <Input
                    name="contacto"
                    type="tel"
                    inputMode="numeric"
                    required
                    placeholder="Ej. 3001234567"
                    className="pl-10"
                    disabled={isRateLimited || loading}
                  />
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="bg-muted/40 border border-border rounded-lg p-3 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Este portal está cifrado de extremo a extremo. Nunca solicitamos contraseñas por
                  correo ni WhatsApp.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || isRateLimited}
                className="w-full h-11 font-semibold"
              >
                {loading ? (
                  'Verificando...'
                ) : isRateLimited ? (
                  <>
                    <Clock className="w-4 h-4 mr-1.5" />
                    Acceso bloqueado temporalmente
                  </>
                ) : (
                  <>
                    Consultar estado <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Volver al inicio
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
