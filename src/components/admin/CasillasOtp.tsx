'use client';

/**
 * Casillas animadas para el código de verificación (OTP) del panel de administración.
 *
 * Animación (referencia visual del propietario, la misma del panel de Origgo):
 * - La casilla activa brilla y cada dígito entra con un pequeño rebote.
 * - Al verificar, los dígitos viajan al centro y se funden en un destello que late.
 * - Si el código es correcto se dibuja un check dentro de un anillo luminoso.
 * - Si es incorrecto, las casillas vuelven en rojo y se sacuden.
 *
 * Solo CSS (transform/opacity), sin librerías; respeta prefers-reduced-motion
 * (la regla global de globals.css reduce las duraciones a casi cero).
 */

import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import estilos from './CasillasOtp.module.css';

/** Estado visual del código: escribiendo, verificando, correcto o incorrecto. */
export type EstadoOtp = 'normal' | 'verificando' | 'exito' | 'error';

const LONGITUD = 6;

const TEXTO_ESTADO: Record<EstadoOtp, string> = {
  normal: '',
  verificando: 'Verificando el código…',
  exito: 'Código correcto',
  error: 'Código incorrecto',
};

/** ¿El sistema pide menos movimiento? Las esperas de la animación se acortan. */
export function prefiereMenosMovimiento(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface CasillasOtpProps {
  /** Código escrito hasta ahora (solo dígitos, máx. 6). */
  valor: string;
  onCambio: (valor: string) => void;
  /** Se llama al completar los 6 dígitos (escribiendo o pegando). */
  onCompleto: (valor: string) => void;
  estado: EstadoOtp;
  deshabilitado?: boolean;
}

export function CasillasOtp({
  valor,
  onCambio,
  onCompleto,
  estado,
  deshabilitado = false,
}: CasillasOtpProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  // Al abrir y tras un código incorrecto (casillas vacías) el foco vuelve a la primera.
  useEffect(() => {
    if (estado === 'normal' && !deshabilitado && valor === '') refs.current[0]?.focus();
  }, [estado, deshabilitado, valor]);

  const fijar = (nuevo: string, enfocar: number) => {
    const limpio = nuevo.replace(/\D/g, '').slice(0, LONGITUD);
    onCambio(limpio);
    refs.current[Math.min(enfocar, LONGITUD - 1)]?.focus();
    if (limpio.length === LONGITUD) onCompleto(limpio);
  };

  const alEscribir = (i: number, texto: string) => {
    const digitos = texto.replace(/\D/g, '');
    if (!digitos) return;
    fijar(valor.slice(0, i) + digitos, i + digitos.length);
  };

  const alTecla = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (valor[i]) {
        onCambio(valor.slice(0, i) + valor.slice(i + 1));
      } else if (i > 0) {
        onCambio(valor.slice(0, i - 1) + valor.slice(i));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < LONGITUD - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const alPegar = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fijar(e.clipboardData.getData('text'), LONGITUD - 1);
  };

  return (
    <div className={estilos.otp} data-estado={estado}>
      <div className={estilos.casillas} role="group" aria-label="Código de 6 dígitos">
        {Array.from({ length: LONGITUD }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={valor[i] ? `${estilos.casilla} ${estilos.llena}` : estilos.casilla}
            style={{ '--i': i } as CSSProperties}
            value={valor[i] || ''}
            onChange={(e) => alEscribir(i, e.target.value)}
            onKeyDown={(e) => alTecla(i, e)}
            onPaste={alPegar}
            onFocus={(e) => e.target.select()}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={LONGITUD}
            disabled={deshabilitado}
            aria-label={`Dígito ${i + 1} del código de verificación`}
          />
        ))}
      </div>
      <div className={estilos.centro} aria-hidden="true">
        <span className={estilos.destello} />
        <svg className={estilos.check} viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="25" />
          <path d="M17 29l7.5 7.5L40 21" />
        </svg>
      </div>
      <span className="sr-only" role="status">
        {TEXTO_ESTADO[estado]}
      </span>
    </div>
  );
}
