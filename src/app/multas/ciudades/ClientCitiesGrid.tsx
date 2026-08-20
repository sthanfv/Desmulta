'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { m, LazyMotion, domAnimation } from 'framer-motion';

interface City {
  slug: string;
  nombre: string;
}

interface Props {
  cities: City[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

export function ClientCitiesGrid({ cities }: Props) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
      >
        {cities.map((city) => (
          <m.div key={city.slug} variants={itemVariants} className="h-full">
            <Link
              href={`/multas/${city.slug}`}
              className="group flex items-center gap-3 p-4 bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 hover:border-brand-500/30 transition-all active:scale-95 shadow-sm h-full"
              title={`Impugnar multas y fotomultas en ${city.nombre}`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-white/5 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors shrink-0">
                <MapPin
                  size={14}
                  className="text-slate-500 dark:text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-500 transition-colors"
                />
              </div>
              <span className="text-sm font-bold text-slate-700 dark:text-white/80 group-hover:text-foreground transition-colors truncate">
                {city.nombre}
              </span>
            </Link>
          </m.div>
        ))}
      </m.div>
    </LazyMotion>
  );
}
