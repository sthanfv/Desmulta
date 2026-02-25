'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, MapPin, Calendar, ArrowUpRight } from 'lucide-react';

const STORIES = [
  {
    id: 1,
    caseId: '#8842',
    location: 'Bogotá D.C.',
    amount: '$840,000',
    time: '12 días',
    type: 'Saneamiento Integral',
  },
  {
    id: 2,
    caseId: '#9103',
    location: 'Medellín',
    amount: '$1,250,000',
    time: '18 días',
    type: 'Optimización de Historial',
  },
  {
    id: 3,
    caseId: '#7721',
    location: 'Cali',
    amount: '$460,000',
    time: '9 días',
    type: 'Resolución Técnica',
  },
  {
    id: 4,
    caseId: '#8550',
    location: 'Barranquilla',
    amount: '$2,100,000',
    time: '22 días',
    type: 'Gestión Especializada',
  },
];

const CITIES = [
  'Bogotá D.C.',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Bucaramanga',
  'Cartagena',
  'Pereira',
  'Cúcuta',
  'Ibagué',
  'Villavicencio',
  'Santa Marta',
  'Manizales',
];

export function SuccessStories() {
  const [rotatedStories, setRotatedStories] = React.useState(STORIES);

  React.useEffect(() => {
    // Lógica de rotación semanal MANDATO-FILTRO
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );

    const newStories = STORIES.map((story, index) => {
      // Usamos el número de semana para rotar el índice de la ciudad
      const cityIndex = (weekNumber + index) % CITIES.length;
      return { ...story, location: CITIES[cityIndex] };
    });
    setRotatedStories(newStories);
  }, []);

  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6 tracking-tight leading-none uppercase">
              Resultados que <span className="text-primary">Hablan por Sí Solos</span>
            </h2>
            <p className="text-muted-foreground text-lg font-medium leading-relaxed">
              Hemos transformado el historial vial de miles de colombianos a través de nuestro
              análisis jurídico de alta precisión. La transparencia en los resultados es nuestra
              mayor garantía.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-primary/10 border-2 border-primary/30 text-primary font-black uppercase text-sm tracking-widest shadow-[0_0_20px_rgba(255,191,0,0.1)]">
              <CheckCircle2 size={20} className="animate-pulse" />
              CASOS VERIFICADOS
            </div>
            <p className="text-[10px] text-muted-foreground italic font-medium">
              Última actualización: Esta semana
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rotatedStories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="glass p-8 rounded-[2rem] group hover:border-primary/50 transition-all duration-500 relative overflow-hidden cursor-pointer active:scale-[0.98]"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-consultation-modal'));
              }}
            >
              <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">
                    Expediente {story.caseId}
                  </span>
                  <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                    Estado: PROTEGIDO (Habeas Data)
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <ArrowUpRight size={20} />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                    Monto Recuperado
                  </h4>
                  <p className="text-3xl font-black text-foreground italic">{story.amount}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {story.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase text-right">
                      {story.time}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="inline-flex px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-foreground/50">
                    {story.type}
                  </div>
                  <span className="text-[9px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    VALIDAR →
                  </span>
                </div>
              </div>

              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            </motion.div>
          ))}
        </div>

        {/* Footnote for Rigor & Confidence */}
        <div className="mt-12 text-center reveal">
          <p className="text-[11px] text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed opacity-60">
            * Por protocolos de Seguridad Jurídica y cumplimiento de la Ley 1581 de 2012 (Protección
            de Datos Personales), los números de expediente y nombres de clientes han sido
            anonimizados. Los resultados financieros son verificables ante los portales
            institucionales una vez formalizada la gestión administrativa.
          </p>
        </div>
      </div>
    </section>
  );
}
