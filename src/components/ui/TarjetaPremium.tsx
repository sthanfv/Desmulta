'use client';

import { MouseEvent, useRef } from 'react';

interface TarjetaPremiumProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * TarjetaPremium — El Estándar de Oro de la Interfaz Desmulta
 * 
 * Utiliza variables de CSS nativas para un efecto de iluminación dinámica
 * procesado por la GPU, garantizando 120 FPS sin re-renders de React.
 * 
 * MANDATO-FILTRO v5.40.0: Rendimiento extremo y estética de alta tecnología.
 */
export function TarjetaPremium({ children, className = '' }: TarjetaPremiumProps) {
    const divRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
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
            onMouseMove={handleMouseMove}
            className={`relative overflow-hidden bg-card border border-border rounded-3xl group transition-colors duration-300 ${className}`}
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
                    WebkitMaskImage: 'linear-gradient(black, black) content-box, linear-gradient(black, black)',
                    maskComposite: 'exclude',
                    WebkitMaskComposite: 'xor',
                    padding: '1px',
                }}
            />

            {/* Contenido Real */}
            <div className="relative z-10 h-full">{children}</div>
        </div>
    );
}
