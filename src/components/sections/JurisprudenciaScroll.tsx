'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Scale, Clock, ShieldAlert } from 'lucide-react';

export function JurisprudenciaScroll() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // Un array de referencias para atrapar cada tarjeta de forma independiente
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // 1. Registramos el plugin (vital en Next.js para evitar errores de SSR)
    if (typeof window !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    // 2. gsap.context() es la brujería que evita fugas de memoria en React
    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card, i) => {
        if (!card) return;

        // La animación de Modo Bestia
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 80,
            scale: 0.95,
            rotateX: 5, // Le damos un ligero giro 3D inicial
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 90%', // Detona cuando la tarjeta asoma por abajo
              end: 'top 50%', // Termina la animación cuando llega al centro
              scrub: 1.5, // <-- EL SECRETO: 1.5 segundos de "retraso suave" (Smoothing)
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    }, sectionRef);

    // 3. Limpieza absoluta cuando el componente se destruye
    return () => ctx.revert();
  }, []);

  const setCardRef = (el: HTMLDivElement | null, index: number) => {
    cardsRef.current[index] = el;
  };

  const argumentosLegales = [
    {
      icon: <Scale className="w-8 h-8 text-primary" />,
      title: 'Sentencia C-038 de 2020',
      desc: 'La Corte Constitucional es clara: las multas no pueden imponerse al vehículo, sino al conductor plenamente identificado. Si no saben quién manejaba, es ilegal.',
    },
    {
      icon: <Clock className="w-8 h-8 text-blue-500" />,
      title: 'Prescripción de 3 Años',
      desc: 'Artículo 159 del Código Nacional de Tránsito. Si han pasado 3 años sin un cobro coactivo debidamente notificado, la deuda pierde toda validez jurídica.',
    },
    {
      icon: <ShieldAlert className="w-8 h-8 text-red-500" />,
      title: 'Vicios de Notificación',
      desc: 'Si no recibiste la fotomulta en la dirección registrada en el RUNT dentro de los tiempos de ley, se viola tu derecho al debido proceso. El caso se cae.',
    },
  ];

  return (
    <section ref={sectionRef} className="relative w-full py-24 px-4 overflow-hidden">
      <div className="max-w-3xl mx-auto space-y-16">
        <div className="text-center mb-20 text-balance pwa-native-feel">
          <h2 className="text-3xl font-black text-foreground tracking-tight sm:text-5xl">
            Nuestras Armas <span className="text-primary">Legales</span>.
          </h2>
          <p className="mt-4 text-muted-foreground uppercase tracking-widest text-sm font-bold">
            Tu defensa estructurada paso a paso
          </p>
        </div>

        {/* El contenedor de las tarjetas */}
        <div className="relative space-y-8">
          {/* Línea conectora de fondo (ADN Nativo visual) */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-transparent hidden md:block" />

          {argumentosLegales.map((arg, index) => (
            <div
              key={index}
              ref={(el) => setCardRef(el, index)}
              className="relative z-10 flex flex-col md:flex-row gap-6 items-start p-8 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md shadow-2xl overflow-hidden pwa-native-feel"
              // Forzamos el hardware acceleration en CSS para que GSAP vuele
              style={{ willChange: 'transform, opacity' }}
            >
              {/* Efecto de luz radial sutil en la tarjeta */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-[50px] pointer-events-none" />

              <div className="flex-shrink-0 p-4 rounded-2xl bg-background/50 border border-border/50">
                {arg.icon}
              </div>

              <div className="pt-2">
                <h3 className="text-2xl font-bold text-foreground mb-3">{arg.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{arg.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
