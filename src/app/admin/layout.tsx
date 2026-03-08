'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useMemoFirebase, useAuth, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger/security-logger';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Memoize the document reference
  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'admins', user.uid);
  }, [firestore, user]);

  const { data: adminDoc, isLoading: isAdminLoading } = useDoc(adminRef);

  const isAdmin = adminDoc !== null;
  const isLoading = isUserLoading || (user && isAdminLoading);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auth && email && password) {
      try {
        setIsSigningIn(true);
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        const err = error as { code?: string; message?: string };
        // MANDATO-FILTRO: SecurityLogger ofusca datos PII automáticamente
        logger.security('[admin/login] Intento de acceso fallido.', { code: err.code });
        let description = 'Por favor, verifique sus credenciales e intente de nuevo.';
        if (
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/user-not-found' ||
          err.code === 'auth/wrong-password'
        ) {
          description = 'Credenciales incorrectas. Por favor, verifique el email y la contraseña.';
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

  const handlePasswordReset = async () => {
    if (!auth) return;
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email requerido',
        description: 'Por favor, ingrese su email para restablecer la contraseña.',
      });
      return;
    }
    setIsSigningIn(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Correo enviado',
        description:
          'Revise su bandeja de entrada. Se ha enviado un enlace para restablecer su contraseña.',
      });
    } catch {
      logger.error('[admin/login] Error al enviar correo de restablecimiento de contraseña.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          'No se pudo enviar el correo de restablecimiento. Verifique que el email sea correcto e inténtelo de nuevo.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground text-center mb-6">Inicie sesión para continuar</p>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ejemplo.com"
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
                  onClick={handlePasswordReset}
                  disabled={isSigningIn}
                >
                  ¿Olvidó su contraseña?
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
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
              <span>Volver al Inicio Publico</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background p-4 text-center">
        <h1 className="text-3xl font-bold text-destructive">Acceso Denegado</h1>
        <p className="text-muted-foreground">
          La cuenta con la que ha iniciado sesión no tiene permisos de administrador.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => auth.signOut()}>
            Cerrar Sesión
          </Button>
          <Button onClick={() => router.push('/')}>Volver al Inicio</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
