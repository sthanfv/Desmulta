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
    <section id="faq" className="py-16 md:py-24 px-4 bg-muted/10">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4 mb-20 reveal">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground tracking-tighter text-balance">
            Preguntas Frecuentes
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Claridad legal para su total confianza.
          </p>
        </div>
        {!mounted ? (
          <div className="w-full h-96 bg-card/20 animate-pulse rounded-[3rem] border border-white/10 flex items-center justify-center">
            <p className="text-muted-foreground font-medium">Sincronizando información legal...</p>
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
                a: 'Nuestro compromiso principal es tu tranquilidad. Por ello, realizamos un diagnóstico previo gratuito para confirmar que tu caso cuenta con opciones reales de éxito, cuidando así tu dinero. Si encontramos errores de tránsito, caducidad o prescripción, asumiremos con total transparencia tu defensa técnica para proteger tus derechos.',
              },
              {
                q: '¿Debo pagar por adelantado?',
                a: 'El diagnóstico inicial es completamente gratuito. Si decide iniciar la gestión, los honorarios se acuerdan antes de comenzar de forma transparente y dependen de la complejidad del caso.',
              },
              {
                q: '¿Qué pasa si mis comparendos son muy antiguos?',
                a: 'Un comparendo antiguo puede tener a su favor argumentos de caducidad o prescripción que la propia ley establece. El tiempo de permanencia en el sistema es uno de los factores que analizamos — pero la viabilidad la definimos caso a caso.',
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
                q: '¿Por qué es riesgoso gestionarlo solo?',
                a: 'El procedimiento administrativo tiene términos, formatos y canales específicos. Una objeción mal presentada o enviada fuera de tiempo puede cerrar la posibilidad de impugnar. Conocer esos pasos es la diferencia entre que su argumento sea válido o descartado.',
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
