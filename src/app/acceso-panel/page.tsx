'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger/security-logger';

export default function AccesoPanel() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [syncError, setSyncError] = useState<string | null>(null);

  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Sincronizar la cookie HttpOnly si el usuario ya está autenticado client-side.
  // Si la sincronización falla, mostramos el formulario con un mensaje de error
  // en lugar de mantener el spinner activo indefinidamente.
  useEffect(() => {
    let active = true;
    const syncSession = async () => {
      if (!isUserLoading && user && auth) {
        try {
          setSyncError(null);
          const idToken = await user.getIdToken(true);
          if (!active) return;

          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });

          if (!active) return;

          if (res.ok) {
            router.push('/admin');
          } else {
            // Fallo del servidor: limpiamos la sesión client-side y mostramos error
            await auth.signOut();
            if (active) setSyncError('No fue posible sincronizar la sesión. Intente de nuevo.');
          }
        } catch (error) {
          logger.error('[acceso-panel] Error al sincronizar sesión.', { error: String(error) });
          if (active) {
            await auth.signOut();
            setSyncError('Error de red al iniciar sesión. Verifique su conexión.');
          }
        }
      }
    };

    syncSession();
    return () => {
      active = false;
    };
  }, [user, isUserLoading, router, auth]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auth && email && password) {
      try {
        setIsSigningIn(true);
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken(true);
        // Generar la cookie de sesión en el backend para el middleware
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        toast({
          title: 'Acceso exitoso',
          description: 'Iniciando el panel de gestión...',
        });

        // Redirigir al panel de administración tras iniciar sesión con éxito
        router.push('/admin');
      } catch (error) {
        const err = error as { code?: string; message?: string };
        logger.security('[acceso-panel] Intento de acceso fallido.', { code: err.code });
        let description = 'Por favor, verifique sus credenciales e intente de nuevo.';
        if (
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/user-not-found' ||
          err.code === 'auth/wrong-password'
        ) {
          description = 'Credenciales incorrectas. Por favor, verifique el correo y la contraseña.';
        }
        toast({
          variant: 'destructive',
          title: 'Error de inicio de sesión',
          description: description,
        });
      } finally {
        setIsSigningIn(false);
      }
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: 'Correo electrónico requerido',
        description: 'Por favor, ingrese su correo para restablecer la contraseña.',
      });
      return;
    }
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Correo enviado',
        description:
          'Si el correo está registrado, recibirá un enlace para restablecer su contraseña.',
      });
      setIsResetMode(false); // Volver al login tras éxito
    } catch {
      logger.error('[acceso-panel] Error al enviar correo de restablecimiento de contraseña.');
      // Fail-safe genérico para evitar user enumeration, la UI es idéntica
      toast({
        title: 'Correo enviado',
        description:
          'Si el correo está registrado, recibirá un enlace para restablecer su contraseña.',
      });
      setIsResetMode(false);
    } finally {
      setIsResetting(false);
    }
  };

  // 1. Carga inicial de Firebase Auth — bloqueante
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. Usuario autenticado y sincronización en curso → spinner de redirección
  if (user && !syncError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        {isResetMode ? (
          <>
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
                {isResetting ? <Loader2 className="animate-spin mr-2" /> : null}
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
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Panel de Gestión</h1>
            <p className="text-muted-foreground text-center mb-6">Inicie sesión para continuar</p>

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              {/* 3. Banner de error de sincronización — visible al fallar el sync de cookie */}
              {syncError && (
                <div
                  role="alert"
                  className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                >
                  {syncError}
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
                  disabled={isSigningIn}
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
                    disabled={isSigningIn}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSigningIn}
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
                      setResetEmail(email); // Pre-fill with current email
                      setIsResetMode(true);
                    }}
                    disabled={isSigningIn}
                  >
                    ¿Olvidó su contraseña?
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSigningIn}>
                {isSigningIn ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <LogIn className="mr-2" />
                )}
                Ingresar
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-muted-foreground hover:text-primary transition-colors gap-2 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a la Página Principal</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
