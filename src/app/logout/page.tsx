'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Database, HardDrive, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { secureLogout } from '@/lib/security/client-logout';
import { useSearchParams } from 'next/navigation';
import { CANAL_SESION_ADMIN } from '@/components/admin/CierrePorInactividad';

function SweeperContent() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'manual';

  const [step, setStep] = useState(0);

  useEffect(() => {
    let isMounted = true;

    // Cerrar sesión aquí la cierra en todas las pestañas del panel (ver CierrePorInactividad).
    if (reason !== 'otra-pestana') {
      try {
        const canal = new BroadcastChannel(CANAL_SESION_ADMIN);
        canal.postMessage('salir');
        canal.close();
      } catch {
        // Navegador sin BroadcastChannel: solo se cierra esta pestaña.
      }
    }

    const runSweep = async () => {
      // Step 0: "Activando protocolo Zero-Trust..."
      if (isMounted) setStep(0);
      await new Promise((r) => setTimeout(r, 1200));

      // Step 1: "Destruyendo credenciales seguras..."
      if (isMounted) setStep(1);

      // Iniciar el borrado real en segundo plano
      const logoutPromise = secureLogout(auth, reason, true);

      await new Promise((r) => setTimeout(r, 1500));

      // Step 2: "Vaciando caché y base de datos local..."
      if (isMounted) setStep(2);

      // Esperar a que el protocolo Scorched Earth termine realmente
      await logoutPromise;

      await new Promise((r) => setTimeout(r, 1000));

      // Step 3: "Limpieza completada"
      if (isMounted) setStep(3);

      await new Promise((r) => setTimeout(r, 800));

      // Redirección dura final (purga memoria de Next.js)
      window.location.href = `/acceso-panel?reason=${reason === 'inactividad' ? 'inactividad' : 'clean'}`;
    };

    runSweep();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = [
    { icon: ShieldCheck, text: 'Cerrando sesión de forma segura...' },
    { icon: Database, text: 'Borrando información confidencial...' },
    { icon: HardDrive, text: 'Limpiando memoria de la aplicación...' },
    { icon: CheckCircle2, text: 'Limpieza completada. Hasta pronto.' },
  ];

  const CurrentIcon = steps[step].icon;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <div className="w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="flex flex-col items-center justify-center z-10 max-w-md w-full p-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-8"
          >
            <div className="relative">
              {/* Icon Glow */}
              <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full" />
              <CurrentIcon className="w-24 h-24 text-primary relative z-10" strokeWidth={1.5} />
            </div>

            <h2 className="text-xl md:text-2xl font-medium text-foreground font-sans tracking-wide">
              {steps[step].text}
            </h2>
          </motion.div>
        </AnimatePresence>

        {/* Progress bar container */}
        <div className="w-full max-w-xs h-1.5 bg-secondary rounded-full mt-16 overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LogoutSweeperPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-background" />}>
      <SweeperContent />
    </Suspense>
  );
}
