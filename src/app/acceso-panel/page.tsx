'use client';

/**
 * Pantalla de Acceso al Panel de Administración — Flujo Wompi 2FA
 *
 * Implementa una máquina de estados explícita para el flujo de autenticación
 * de doble factor por correo electrónico. El modal de OTP se despliega
 * dentro de la misma página sin redirecciones de router.
 *
 * Fases del flujo:
 *   idle → authenticating → pre_login → awaiting_otp → verifying → success
 *
 * Seguridad:
 * - El tempToken se almacena SOLO en estado de React (nunca en localStorage/cookies)
 * - La cookie de sesión (__session) SOLO se emite en /api/auth/verify-otp
 *   una vez que el OTP es verificado. No existe sesión antes de ese punto.
 * - El modal de OTP NO se cierra al hacer clic en el fondo (backdrop-click desactivado)
 * - El countdown de 2 minutos cierra el modal automáticamente al agotarse
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Eye, EyeOff, ArrowLeft, KeyRound, RefreshCw, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger/security-logger';
import { cn } from '@/lib/utils';

// ── Máquina de estados del flujo de autenticación ────────────────────────────
type AuthPhase =
  | 'idle' // Formulario de login visible, sin actividad
  | 'authenticating' // Firebase signInWithEmailAndPassword en curso
  | 'pre_login' // POST /api/auth/pre-login en curso (enviando OTP)
  | 'awaiting_otp' // Modal OTP visible — esperando código del usuario
  | 'verifying' // POST /api/auth/verify-otp en curso
  | 'success'; // Autenticación completada — redirigiendo al panel

/**
 * Enmascara una dirección de correo para proteger la privacidad.
 * Ejemplo: 'admin@desmulta.online' → 'a***n@d***a.online'
 */
function maskEmail(rawEmail: string): string {
  if (!rawEmail) return '';
  const [local, domain] = rawEmail.split('@');
  if (!domain) return rawEmail;
  const maskedLocal =
    local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`;
  const domainParts = domain.split('.');
  const domainName = domainParts[0];
  const tld = domainParts.slice(1).join('.');
  const maskedDomain =
    domainName.length > 2
      ? `${domainName[0]}***${domainName[domainName.length - 1]}.${tld}`
      : `${domainName}.${tld}`;
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Formatea un tiempo en segundos como MM:SS.
 */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AccesoPanel() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  // ── Máquina de estados ────────────────────────────────────────────────────
  const [phase, setPhase] = useState<AuthPhase>('idle');
  const [loginError, setLoginError] = useState<string | null>(null);

  // ── Formulario de login ───────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Modo recuperación de contraseña ───────────────────────────────────────
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // ── Estado del modal OTP ──────────────────────────────────────────────────
  // tempToken: almacenado SOLO en estado de React (nunca en localStorage/sessionStorage)
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [otpCooldown, setOtpCooldown] = useState<number>(0);

  // Refs para los 6 inputs del OTP (autofocus secuencial entre dígitos)
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Sincronizar usuarios ya autenticados (solo en fase idle) ──────────────
  // IMPORTANTE: Si el usuario llega a /acceso-panel (ya sea manual o por redirección 
  // del middleware debido a que su cookie __session caducó), debemos purgar el estado 
  // local de Firebase Auth. Esto rompe el bucle infinito de redirección.
  useEffect(() => {
    // Guard explícito: cualquier fase que no sea idle cancela este efecto
    if (phase !== 'idle') return;
    if (isUserLoading || !user || !auth) return;

    // Si el usuario tiene estado local pero está en la pantalla de login,
    // significa que el servidor rechazó su cookie __session o decidió cerrar sesión.
    // Purgamos el estado local para mantener la sincronización y mostrar el form.
    logger.info('[acceso-panel] Purgando estado local obsoleto para sincronizar con el servidor.');
    auth.signOut().catch(() => {});
  }, [user, isUserLoading, auth, phase]);

  // ── Cooldown de reenvío ───────────────────────────────────────────────────
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // ── Handlers de estado ────────────────────────────────────────────────────

  /** Reinicia el componente completamente al estado inicial */
  const resetToIdle = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setTempToken(null);
    setDigits(['', '', '', '', '', '']);
    setExpiresAt(0);
    setTimeLeft(0);
    setOtpCooldown(0);
    setLoginError(null);
  }, []);

  /** Maneja el agotamiento del countdown — cierra el modal y resetea */
  const handleOtpTimeout = useCallback(() => {
    resetToIdle();
    if (auth) auth.signOut().catch(() => {});
    toast({
      variant: 'destructive',
      title: 'Tiempo agotado',
      description: 'El código de verificación expiró. Por favor inicia sesión nuevamente.',
    });
  }, [resetToIdle, auth, toast]);

  // ── Countdown del modal OTP ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'awaiting_otp' && phase !== 'verifying') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (!expiresAt) return;

    // Limpiar intervalo previo si existe
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleOtpTimeout();
      }
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, expiresAt, handleOtpTimeout]);

  // ── Iniciar OTP: llama a /api/auth/pre-login y configura el modal ─────────
  const initiateOtpFlow = useCallback(async (idToken: string) => {
    setPhase('pre_login');
    const res = await fetch('/api/auth/pre-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al enviar el código de verificación.');
    }

    const { temp_token } = await res.json();

    // Almacenar tempToken en React state (nunca en localStorage)
    setTempToken(temp_token);

    // Iniciar countdown de 2 minutos
    const expiry = Date.now() + 2 * 60 * 1000;
    setExpiresAt(expiry);
    setTimeLeft(120);
    setOtpCooldown(60);
    setDigits(['', '', '', '', '', '']);
    setPhase('awaiting_otp');

    // Auto-focus al primer dígito del OTP
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  // ── Handler: Login con email y contraseña ─────────────────────────────────
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;

    setLoginError(null);
    setPhase('authenticating');

    try {
      // Fase 1a: Autenticación con Firebase Auth (solo valida credenciales)
      const credential = await signInWithEmailAndPassword(auth, email, password);

      // Verificar privilegios de administrador
      const idTokenResult = await credential.user.getIdTokenResult();
      if (!idTokenResult.claims.admin) {
        await auth.signOut();
        setPhase('idle');
        setLoginError('Esta cuenta no posee privilegios de administración.');
        return;
      }

      const idToken = await credential.user.getIdToken(true);

      // Fase 1b: Pre-login — despacha OTP y obtiene tempToken
      // En este punto NO existe ninguna cookie de sesión
      await initiateOtpFlow(idToken);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      logger.security('[acceso-panel] Intento de acceso fallido.', { code: err.code });

      if (auth) await auth.signOut().catch(() => {});
      setPhase('idle');

      let description = 'Por favor, verifique sus credenciales e intente de nuevo.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        description = 'Credenciales incorrectas. Verifique el correo y la contraseña.';
      } else if (err.message) {
        description = err.message;
      }
      setLoginError(description);
    }
  };

  // ── Handler: Verificar OTP — llama a /api/auth/verify-otp ────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;

    const code = digits.join('');
    if (code.length !== 6) {
      toast({
        variant: 'destructive',
        title: 'Código incompleto',
        description: 'Por favor ingresa los 6 dígitos del código enviado.',
      });
      return;
    }

    setPhase('verifying');

    try {
      // Fase 2: Verificación final — AQUÍ se emiten __session + admin-2fa-token
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Código incorrecto o expirado.');
      }

      setPhase('success');
      toast({
        title: '✅ Acceso autorizado',
        description: 'Verificación de doble factor completada.',
      });

      // Remediación del race condition post-OTP (Hallazgo 3 — Auditoría Manus AI):
      // En lugar de un delay fijo e impredecible, se usa un mecanismo de reintento con
      // backoff exponencial que verifica activamente si el servidor ya reconoce la sesión
      // antes de navegar. Esto es robusto ante redes lentas o navegadores con carga alta.
      const MAX_RETRIES = 5;
      const BASE_DELAY_MS = 200;
      let adminAccessible = false;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, BASE_DELAY_MS * (attempt + 1)));
        try {
          // HEAD request silenciosa: si el servidor devuelve 200, las cookies están activas.
          // Si devuelve 302/307 (redirect a /acceso-panel), aún no están registradas.
          const check = await fetch('/admin', { method: 'HEAD', redirect: 'manual' });
          if (check.status === 200 || check.type === 'opaqueredirect') {
            adminAccessible = check.status === 200;
            if (adminAccessible) break;
          }
        } catch {
          // Error de red transitorio: continuar reintentando
        }
      }

      // Recarga completa (no client-side navigation) para que el middleware
      // de Next.js lea el nuevo estado de cookies desde el servidor.
      window.location.href = '/admin';
    } catch (error: unknown) {
      // Regresar a la fase de espera y limpiar los dígitos para reintento
      setPhase('awaiting_otp');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);

      toast({
        variant: 'destructive',
        title: 'Verificación fallida',
        description: error instanceof Error ? error.message : 'Código incorrecto.',
      });
    }
  };

  // ── Handler: Reenviar OTP ─────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (!auth || !user || otpCooldown > 0 || phase === 'verifying') return;

    try {
      const idToken = await user.getIdToken(true);
      await initiateOtpFlow(idToken);

      toast({
        title: 'Código reenviado',
        description: 'Revisa tu correo para obtener el nuevo código de acceso.',
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error al reenviar',
        description: error instanceof Error ? error.message : 'Error interno.',
      });
    }
  };

  // ── Handler: Cancelar flujo de OTP ───────────────────────────────────────
  const handleCancelOtp = async () => {
    if (phase === 'verifying') return; // No cancelar mientras verifica
    if (auth) await auth.signOut().catch(() => {});
    resetToIdle();
  };

  // ── Handlers de los 6 inputs del OTP ─────────────────────────────────────

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    // Avanzar foco automáticamente al siguiente dígito
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = ['', '', '', '', '', ''];
    pasted.split('').forEach((char, i) => {
      newDigits[i] = char;
    });
    setDigits(newDigits);
    // Foco al último dígito pegado o al primero vacío
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  // ── Handler: Restablecimiento de contraseña ───────────────────────────────
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !resetEmail) return;
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
    } catch {
      // Silenciar el error por seguridad (no revelar si el correo existe)
      logger.error('[acceso-panel] Error al enviar correo de recuperación.');
    } finally {
      toast({
        title: 'Correo enviado',
        description:
          'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      });
      setIsResetMode(false);
      setIsResetting(false);
    }
  };

  // ── Estado de carga inicial ───────────────────────────────────────────────
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Variables de renderizado ──────────────────────────────────────────────
  const isOtpPhase = phase === 'awaiting_otp' || phase === 'verifying';
  const isFormBusy = phase === 'authenticating' || phase === 'pre_login' || phase === 'success';

  const otpCode = digits.join('');

  // Color del countdown según urgencia temporal
  const countdownColorClass =
    timeLeft <= 30 ? 'text-destructive' : timeLeft <= 60 ? 'text-amber-500' : 'text-primary';

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4 relative">
      {/* ── 1. Tarjeta de login (siempre presente en el DOM) ─────────────── */}
      <div
        className={cn(
          'w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg transition-all duration-300',
          // Atenuar y bloquear interacción mientras el modal OTP está activo
          isOtpPhase && 'opacity-20 pointer-events-none blur-[2px]'
        )}
      >
        {isResetMode ? (
          /* Modo recuperación de contraseña */
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-center mb-2">Recuperar Acceso</h1>
            <p className="text-muted-foreground text-center text-sm mb-6">
              Ingrese su correo para recibir un enlace de recuperación.
            </p>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <Label htmlFor="resetEmail">Correo electrónico</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="administrador@ejemplo.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={isResetting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isResetting}>
                {isResetting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Enviar Enlace
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setIsResetMode(false)}
                disabled={isResetting}
              >
                Cancelar
              </Button>
            </form>
          </div>
        ) : (
          /* Formulario de login principal */
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-center mb-2">Panel de Gestión</h1>
            <p className="text-muted-foreground text-center mb-6">Inicie sesión para continuar</p>

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              {loginError && (
                <div
                  role="alert"
                  className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                >
                  {loginError}
                </div>
              )}

              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="administrador@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isFormBusy || isOtpPhase}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isFormBusy || isOtpPhase}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isFormBusy || isOtpPhase}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                <div className="text-right">
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs h-auto p-0 text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setResetEmail(email);
                      setIsResetMode(true);
                    }}
                    disabled={isFormBusy || isOtpPhase}
                  >
                    ¿Olvidó su contraseña?
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isFormBusy || isOtpPhase}>
                {isFormBusy ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {phase === 'pre_login' ? 'Enviando código...' : 'Ingresar'}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                disabled={isFormBusy || isOtpPhase}
                className="text-muted-foreground hover:text-primary transition-colors gap-2 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a la Página Principal</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Modal OTP — Superpuesto sobre la tarjeta de login ─────────── */}
      {isOtpPhase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-[3px] p-4 animate-in fade-in duration-200"
          // INTENCIONALMENTE sin onClick — el backdrop NO cierra el modal
          // Solo el botón "Cancelar" puede cerrar el flujo explícitamente
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow decorativo de fondo */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            {/* Encabezado del modal */}
            <div className="flex flex-col items-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-center">Verificación de Doble Factor</h2>
              <p className="text-muted-foreground text-center text-xs mt-1.5 max-w-[280px]">
                Código enviado a <strong className="text-foreground">{maskEmail(email)}</strong>
              </p>
              <p className="text-[10px] text-muted-foreground/60 text-center mt-1.5 max-w-[280px]">
                💡 Si no lo encuentras, revisa tu carpeta de <strong>Correo no deseado</strong>.
              </p>
            </div>

            {/* Countdown visual de expiración */}
            <div
              className={cn(
                'flex items-center justify-center gap-1.5 text-sm font-mono font-semibold mb-5 transition-colors duration-500',
                countdownColorClass
              )}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* 6 inputs separados con autofocus secuencial */}
              <div className="flex justify-center gap-2" onPaste={handleDigitPaste}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    disabled={phase === 'verifying'}
                    className={cn(
                      'w-10 h-12 rounded-xl border-2 bg-background text-center text-lg font-bold',
                      'transition-all duration-150 outline-none select-none',
                      'focus:border-primary focus:shadow-[0_0_10px_rgba(255,191,0,0.15)]',
                      digit
                        ? 'border-zinc-500 text-foreground dark:border-zinc-400'
                        : 'border-border text-transparent',
                      phase === 'verifying' && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label={`Dígito ${index + 1} del código de verificación`}
                  />
                ))}
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  type="submit"
                  className="w-full rounded-xl py-5"
                  disabled={phase === 'verifying' || otpCode.length !== 6}
                >
                  {phase === 'verifying' ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Verificando código...
                    </>
                  ) : (
                    'Confirmar Código'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendOtp}
                  disabled={otpCooldown > 0 || phase === 'verifying'}
                  className="w-full rounded-xl py-5 border-border/60 hover:bg-muted text-xs gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {otpCooldown > 0 ? `Reenviar en ${otpCooldown}s` : 'Reenviar Código'}
                </Button>
              </div>
            </form>

            {/* Footer del modal */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/40">
              <button
                type="button"
                onClick={handleCancelOtp}
                disabled={phase === 'verifying'}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
