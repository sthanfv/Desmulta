'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

interface HeaderProps {
  onOpenModal: () => void;
}

/**
 * Header - Encabezado principal con Glassmorphism.
 * MANDATO-FILTRO: Diseño premium y funcional.
 */
export const Header = ({ onOpenModal }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-8 pointer-events-none">
      <div className="max-w-6xl mx-auto glass rounded-full px-6 py-4 flex justify-between items-center shadow-2xl border-white/5 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-black tracking-tight text-foreground hidden sm:inline-block">
            DES<span className="text-primary italic">MULTA</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/blog"
            className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>Guía Legal</span>
          </Link>
          <ModeToggle />
          <Button
            onClick={onOpenModal}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full px-8 active:scale-95 transition-all shadow-lg shadow-primary/20 border-none relative overflow-hidden"
            aria-label="Abrir formulario de consulta de multas"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none shimmer-child"
            />
            Consultar Ahora
          </Button>
        </div>
      </div>
    </header>
  );
};
