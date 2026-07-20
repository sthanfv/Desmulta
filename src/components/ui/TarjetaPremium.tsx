'use client';

import { MouseEvent, useRef } from 'react';

interface TarjetaPremiumProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
  /** Estilos en línea opcionales (ej: animationDelay para escalonar animaciones de entrada) */
  style?: React.CSSProperties;
}

/**
 * TarjetaPremium — El Estándar de Oro de la Interfaz Desmulta
 *
 * Utiliza variables de CSS nativas para un efecto de iluminación dinámica
 * procesado por la GPU, garantizando 120 FPS sin re-renders de React.
 *
 * MANDATO-FILTRO v5.40.0: Rendimiento extremo y estética de alta tecnología.
 */
export function TarjetaPremium({
  children,
  className = '',
  onClick,
  style,
  id,
  ...props
}: TarjetaPremiumProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || window.innerWidth < 768) return;
    const rect = divRef.current.getBoundingClientRect();

    // Calculamos las coordenadas x, y relativas al contenedor
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Inyectamos las propiedades CSS de forma directa para evitar re-renders
    divRef.current.style.setProperty('--mouse-x', `${x}px`);
    divRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={divRef}
      id={id}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      style={style}
      className={`card-elevated relative overflow-hidden bg-white/5 dark:bg-white/[0.02] backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-3xl group transition-colors duration-300 ${className}`}
      {...props}
    >
      {/* Efecto Linterna (Solo en PC con puntero real para optimizar móvil) */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 hidden md:block"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,193,7,0.1), transparent 40%)`,
        }}
      />

      {/* Capa de Brillo de Borde (Opcional, añade profundidad) */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 hidden md:block"
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255,193,7,0.15), transparent 40%)`,
          maskImage: 'linear-gradient(black, black) content-box, linear-gradient(black, black)',
          WebkitMaskImage:
            'linear-gradient(black, black) content-box, linear-gradient(black, black)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />

      {children}
    </div>
  );
}
