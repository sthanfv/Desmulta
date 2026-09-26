'use client';

/**
 * Cierre de sesión por inactividad del panel (OWASP Session Management / NIST 800-63B).
 *
 * El servidor es quien manda: el middleware cierra la sesión tras 15 min sin actividad y a las
 * 8 h en total (src/lib/auth/admin-sesion.ts). Este componente es la parte visible:
 *   - cuenta la actividad real de TODAS las pestañas del panel (marca compartida en localStorage);
 *   - mientras hay actividad, envía un "latido" cada 4 min (GET /api/admin/sesion) para que la
 *     sesión no venza aunque el operador solo esté leyendo;
 *   - a 2 min del cierre muestra un aviso con cuenta regresiva; con el aviso abierto hay que
 *     pulsar "Seguir conectado" (mover el mouse no basta, como en la banca en línea);
 *   - al vencer, o al cerrar sesión en otra pestaña, sale en todas (BroadcastChannel);
 *   - usa marcas de tiempo, no contadores: al volver a una pestaña en segundo plano detecta
 *     de inmediato si la sesión ya venció.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export const CANAL_SESION_ADMIN = 'desmulta-admin-sesion';
const CLAVE_ACTIVIDAD = 'desmulta-admin-actividad';
const INACTIVIDAD_MS = 15 * 60 * 1000;
const AVISO_MS = 2 * 60 * 1000;
const LATIDO_CADA_MS = 4 * 60 * 1000;
const REGISTRAR_CADA_MS = 5 * 1000;
const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll', 'mousemove'] as const;

function leerActividad(): number {
  try {
    return Number(localStorage.getItem(CLAVE_ACTIVIDAD)) || 0;
  } catch {
    return 0;
  }
}

function guardarActividad(ms: number) {
  try {
    localStorage.setItem(CLAVE_ACTIVIDAD, String(ms));
  } catch {
    // Navegación privada o almacenamiento bloqueado: solo cuenta esta pestaña.
  }
}

function irASalida(motivo: 'inactividad' | 'otra-pestana') {
  window.location.href = `/logout?reason=${motivo}`;
}

export function CierrePorInactividad() {
  const [segundos, setSegundos] = useState<number | null>(null);
  const ultimaLocal = useRef(Date.now());
  const ultimoLatido = useRef(Date.now());
  const ultimoRegistro = useRef(0);
  const avisoVisible = useRef(false);
  const cerrando = useRef(false);
  const canal = useRef<BroadcastChannel | null>(null);

  const cerrar = useCallback((motivo: 'inactividad' | 'otra-pestana') => {
    if (cerrando.current) return;
    cerrando.current = true;
    if (motivo === 'inactividad') canal.current?.postMessage('salir');
    irASalida(motivo);
  }, []);

  const latido = useCallback(async () => {
    const res = await fetch('/api/admin/sesion', { cache: 'no-store', credentials: 'same-origin' });
    if (res.status === 401) cerrar('inactividad');
  }, [cerrar]);

  const registrar = useCallback(
    (forzar = false) => {
      if (avisoVisible.current && !forzar) return;
      const ahora = Date.now();
      ultimaLocal.current = ahora;
      if (forzar || ahora - ultimoRegistro.current > REGISTRAR_CADA_MS) {
        ultimoRegistro.current = ahora;
        guardarActividad(ahora);
      }
      if (ahora - ultimoLatido.current > LATIDO_CADA_MS) {
        ultimoLatido.current = ahora;
        latido().catch(() => {});
      }
    },
    [latido]
  );

  useEffect(() => {
    guardarActividad(Date.now());
    try {
      canal.current = new BroadcastChannel(CANAL_SESION_ADMIN);
      canal.current.onmessage = (e) => {
        if (e.data === 'salir') cerrar('otra-pestana');
        if (e.data === 'seguir') {
          avisoVisible.current = false;
          setSegundos(null);
        }
      };
    } catch {
      canal.current = null;
    }

    const alActuar = () => registrar();
    EVENTOS.forEach((ev) => window.addEventListener(ev, alActuar, { passive: true }));

    const revisar = () => {
      const restante =
        INACTIVIDAD_MS - (Date.now() - Math.max(ultimaLocal.current, leerActividad()));
      if (restante <= 0) {
        cerrar('inactividad');
      } else if (restante <= AVISO_MS) {
        avisoVisible.current = true;
        setSegundos(Math.ceil(restante / 1000));
      } else if (avisoVisible.current) {
        avisoVisible.current = false;
        setSegundos(null);
      }
    };
    const intervalo = window.setInterval(revisar, 1000);
    document.addEventListener('visibilitychange', revisar);

    return () => {
      EVENTOS.forEach((ev) => window.removeEventListener(ev, alActuar));
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', revisar);
      canal.current?.close();
      canal.current = null;
    };
  }, [registrar, cerrar]);

  const seguir = async () => {
    avisoVisible.current = false;
    setSegundos(null);
    ultimoLatido.current = Date.now();
    registrar(true);
    canal.current?.postMessage('seguir');
    await latido().catch(() => {});
  };

  if (segundos === null) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="aviso-inactividad"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <h2 id="aviso-inactividad" className="text-lg font-bold">
          ¿Sigues ahí?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Por seguridad cerraremos tu sesión por inactividad en{' '}
          <strong className="font-mono text-base text-primary">
            {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')}
          </strong>
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={seguir} autoFocus className="rounded-xl">
            Seguir conectado
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => cerrar('inactividad')}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
