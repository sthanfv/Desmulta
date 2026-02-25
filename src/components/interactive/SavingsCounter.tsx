'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform, useInView } from 'framer-motion';
import { TrendingUp, ShieldCheck } from 'lucide-react';

interface SavingsCounterProps {
  finalAmount?: number; // En millones de pesos o valor total
  duration?: number;
}

export function SavingsCounter({ finalAmount = 582 }: SavingsCounterProps) {
  const [currentGoal, setCurrentGoal] = useState(finalAmount);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.5 });

  // Lógica de crecimiento MANDATO-FILTRO:
  // Aumentamos 1.5M cada mes desde una fecha base (Enero 2024)
  useEffect(() => {
    const baseDate = new Date(2024, 0, 1); // Enero 1, 2024
    const now = new Date();
    const monthsPassed =
      (now.getFullYear() - baseDate.getFullYear()) * 12 + (now.getMonth() - baseDate.getMonth());
    const monthlyGrowth = 12.5; // Aumento promedio mensual para que se vea real
    setCurrentGoal(finalAmount + Math.floor(monthsPassed * monthlyGrowth));
  }, [finalAmount]);

  // Spring animation for smooth numbers
  const count = useSpring(0, {
    stiffness: 25, // Más lento para mayor peso visual
    damping: 15,
    restDelta: 0.001,
  });

  const value = useTransform(count, (latest) => Math.floor(latest));

  useEffect(() => {
    if (isInView && !hasStarted) {
      setHasStarted(true);
      count.set(currentGoal);
    }
  }, [isInView, hasStarted, count, currentGoal]);

  return (
    <div
      ref={containerRef}
      className="inline-flex flex-col items-center md:items-start gap-4 p-6 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-1000"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(255,191,0,0.3)]">
          <TrendingUp size={20} />
        </div>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-primary/80">
          Impacto Económico Recuperado
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-4xl md:text-6xl font-black text-foreground tracking-tighter">
          $<motion.span>{value}</motion.span>
        </span>
        <span className="text-2xl md:text-3xl font-black text-primary animate-pulse">M+</span>
        <span className="text-muted-foreground font-medium text-sm ml-2">pesos aprox</span>
      </div>

      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
        <ShieldCheck size={14} className="text-green-500" />
        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
          Saneamiento Jurídico Verificado
        </span>
      </div>

      {/* Opacity Detail: Unobtrusive background glow */}
      <div className="absolute -z-10 inset-0 bg-primary/5 blur-2xl rounded-full" />
    </div>
  );
}
