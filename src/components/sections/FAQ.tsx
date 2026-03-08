'use client';

import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQProps {
  mounted: boolean;
}

/**
 * FAQ - Sección de Preguntas Frecuentes.
 * MANDATO-FILTRO: Claridad legal y confianza.
 */
export const FAQ = ({ mounted }: FAQProps) => {
  return (
    <section id="faq" className="py-24 px-4 bg-muted/10">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4 mb-20 reveal">
          <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Claridad legal para su total confianza.
          </p>
        </div>
        {!mounted ? (
          <div className="w-full h-96 bg-card/20 animate-pulse rounded-[3rem] border border-white/10 flex items-center justify-center">
            <p className="text-muted-foreground font-medium">
              Sincronizando información legal...
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {[
              {
                q: '¿Cómo logran el saneamiento de las multas?',
                a: 'Utilizamos protocolos de defensa administrativa basados en el debido proceso y la normativa legal vigente para corregir irregularidades en su historial vial.',
              },
              {
                q: '¿Cuánto tiempo demora la eliminación?',
                a: 'La gestión suele tomar entre 15 y 30 días calendario, dependiendo de los tiempos de respuesta de cada organismo de tránsito y la complejidad del historial administrativo.',
              },
              {
                q: '¿Garantizan que la multa será eliminada?',
                a: 'Realizamos un estudio técnico de viabilidad previo. Si determinamos que el caso cumple con los requisitos técnicos necesarios, procedemos con la gestión garantizando un servicio de alta calidad.',
              },
              {
                q: '¿Debo pagar por adelantado el trámite?',
                a: 'El estudio técnico inicial es 100% gratuito. Para iniciar la gestión administrativa se establecen honorarios que se detallan de forma transparente según el éxito del proceso.',
              },
              {
                q: '¿Qué pasa si mis comparendos son muy antiguos?',
                a: 'Los casos con mayor tiempo de permanencia en el sistema suelen tener altas probabilidades de éxito tras nuestro análisis técnico especializado.',
              },
              {
                q: '¿Es seguro proporcionar mi número de cédula?',
                a: 'Es indispensable para realizar la consulta técnica en las bases de datos oficiales. No almacenamos su documento de forma permanente y cumplimos con la normativa de Protección de Datos.',
              },
              {
                q: '¿Es segura esta página? (SSL y el candado verde)',
                a: 'Totalmente. Operamos bajo tecnología SSL (HTTPS) de grado industrial a través de Vercel. Puedes verificarlo viendo el candado verde o gris cerrado en la barra de direcciones de tu navegador.',
              },
              {
                q: '¿Por qué es riesgoso gestionar mis deudas de tránsito por mi cuenta?',
                a: 'Analizamos la viabilidad técnica de tu historial bajo protocolos de alta precisión para diseñar una estrategia jurídica que busca maximizar tus probabilidades de éxito.',
              },
            ].map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/50 bg-card/50 backdrop-blur-sm rounded-3xl px-6 py-2 shadow-sm transition-all hover:bg-card hover:border-primary/30"
              >
                <AccordionTrigger className="text-lg font-bold text-foreground hover:text-primary hover:no-underline py-5 text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-md leading-relaxed pb-6 pr-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </section>
  );
};
