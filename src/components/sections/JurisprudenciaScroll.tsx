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
      cardsRef.current.forEach((card) => {
        if (!card) return;

        // La animación de Modo Bestia
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 60,
            scale: 0.97,
            // MANDATO-FILTRO v7.4.3: Se elimina rotateX(5) que activaba el motor
            // de perspectiva 3D en Android Gama Media — costoso sin beneficio visual real.
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
              end: 'top 50%',
              scrub: 0.8, // Más rápido que 1.5s (mejor respuesta en móvil)
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
      desc: 'La Corte Constitucional establece que las fotomultas exigen identificación plena del conductor. En muchos casos ese requisito no se cumplió — y eso puede ser determinante para su situación.',
    },
    {
      icon: <Clock className="w-8 h-8 text-blue-500" />,
      title: 'Vencimientos de Ley',
      desc: 'La ley fija plazos exactos para que el Estado actúe. Cuando las Secretarías de Tránsito no los cumplen, se configura un argumento técnico sólido que puede sustentar la impugnación.',
    },
    {
      icon: <ShieldAlert className="w-8 h-8 text-red-500" />,
      title: 'Vicios de Notificación',
      desc: 'La notificación debe realizarse en la dirección registrada en el RUNT y dentro de los términos legales. Cuando esto no ocurre, se configura una posible violación al debido proceso que puede ser la base de una impugnación.',
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
