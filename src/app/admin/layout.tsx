'use client';
import { logger } from '@/lib/logger/security-logger';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { OfflineBanner } from '@/components/ui/offline-banner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // 🛡️ TESTING BYPASS: Permitir el bypass de autenticación del cliente en los tests de Playwright (solo en dev)
  const isMockAdmin =
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    (Boolean((window as Record<string, unknown>).__is_mock_admin__) ||
      document.cookie.includes('__session=mock-admin-token'));

  const [isAdmin, setIsAdmin] = useState<boolean>(isMockAdmin);
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(!isMockAdmin);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 🛡️ MANDATO-FILTRO: Vigía de Sesión (Activa la redirección en cliente)
  useEffect(() => {
    if (isMockAdmin) return;
    if (!isUserLoading && !user) {
      window.location.href = '/acceso-panel';
    }
  }, [user, isUserLoading, isMockAdmin]);

  // Verificar Custom Claims (admin: true) sin leer Firestore
  useEffect(() => {
    if (isMockAdmin) return;
    let mounted = true;
    if (user) {
      user
        .getIdTokenResult()
        .then((idTokenResult) => {
          if (mounted) {
            setIsAdmin(!!idTokenResult.claims.admin);
            setIsAdminLoading(false);
          }
        })
        .catch((e) => {
          logger.error('Error verifying admin permissions', e);
          if (mounted) {
            setIsAdmin(false);
            setIsAdminLoading(false);
          }
        });
    } else if (!isUserLoading) {
      if (mounted) {
        setIsAdmin(false);
        setIsAdminLoading(false);
      }
    }
    return () => {
      mounted = false;
    };
  }, [user, isUserLoading, isMockAdmin]);

  // 🛡️ MANDATO-FILTRO: Vigía de Inactividad (Cierra sesión a los 30 min)
  useEffect(() => {
    if (!user || !isAdmin) return;

    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_TIME = 30 * 60 * 1000; // 30 minutos

    const logout = () => {
      router.push('/logout?reason=inactividad');
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logout, INACTIVITY_TIME);
    };

    // Eventos que reinician el contador
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    events.forEach((event) => document.addEventListener(event, resetTimer, { passive: true }));
    resetTimer(); // Iniciar cronómetro por primera vez

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [user, isAdmin, auth, router]);

  const handleRefreshPermissions = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const idTokenResult = await user.getIdTokenResult(true); // true = force refresh
      setIsAdmin(!!idTokenResult.claims.admin);
      if (!!idTokenResult.claims.admin) {
        // Recargar la página para que el middleware de Next.js obtenga la cookie actualizada si es necesario
        window.location.reload();
      }
    } catch (e: unknown) {
      logger.error('Error forzando refresco de token', e instanceof Error ? e.message : String(e));
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = isUserLoading || isAdminLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hay usuario, el middleware o el cliente ya deberían haberlo redirigido,
  // pero por precaución devolvemos un estado vacío mientras ocurre la redirección.
  if (!user && !isMockAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <p className="text-sm text-zinc-500 max-w-md">
          Si le acaban de otorgar permisos desde el panel principal (Modo Dios), necesita refrescar
          sus credenciales locales para que tengan efecto.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button
            variant="default"
            onClick={handleRefreshPermissions}
            disabled={isRefreshing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refrescar Permisos
          </Button>

          <Button variant="outline" onClick={() => router.push('/logout?reason=manual')}>
            Cerrar Sesión
          </Button>
          <Button variant="ghost" onClick={() => router.push('/')}>
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
