'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ShieldCheck, BookOpen, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import {
  LazyMotion,
  domAnimation,
  m,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';

const ThemeToggle = dynamic(
  () => import('@/components/vial-clear/ThemeToggle').then((mod) => mod.ThemeToggle),
  {
    ssr: false,
  }
);
const ChangelogWidget = dynamic(
  () => import('@/components/ui/ChangelogWidget').then((mod) => mod.ChangelogWidget),
  {
    ssr: false,
  }
);

interface HeaderProps {
  onOpenModal: (mode: 'full' | 'simit') => void;
}

interface MagneticItemProps {
  children: React.ReactNode;
  mouseX: MotionValue<number>;
}

/**
 * MagneticItem - Wrapper que replica la magnificación del Dock de macOS.
 * Escala y eleva sutilmente el elemento basándose en la distancia del mouse.
 */
function MagneticItem({ children, mouseX }: MagneticItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const range = 120; // Rango de influencia en píxeles

  const mouseDistance = useTransform(mouseX, (val) => {
    if (!ref.current) return range;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    return val - centerX;
  });

  const targetScale = useTransform(mouseDistance, [-range, 0, range], [1, 1.12, 1]);
  const targetY = useTransform(mouseDistance, [-range, 0, range], [0, -3, 0]);

  const scale = useSpring(targetScale, { mass: 0.1, stiffness: 180, damping: 14 });
  const y = useSpring(targetY, { mass: 0.1, stiffness: 180, damping: 14 });

  return (
    <m.div ref={ref} style={{ scale, y }} className="flex items-center justify-center">
      {children}
    </m.div>
  );
}

/**
 * Header - Encabezado principal con Glassmorphism y Menú Móvil Animado.
 * MANDATO-FILTRO: Diseño premium, responsivo y funcional (Mobile-First).
 */
export const Header = ({ onOpenModal }: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Tracking horizontal del cursor para el menú magnético
  const mouseX = useMotionValue(Infinity);

  const closeMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <header className="fixed top-0 left-0 right-0 z-50 px-2 sm:px-4 py-4 sm:py-8 pointer-events-none">
        {/* Contenedor Principal (Píldora Glassmorphism iOS-17) */}
        <div
          className={`max-w-6xl mx-auto glass overflow-visible rounded-[2rem] px-4 sm:px-6 flex justify-between items-center shadow-2xl border-white/5 pointer-events-auto relative z-50 transition-all duration-500 ${
            isCollapsed ? 'py-2 sm:py-2.5 header-collapsed' : 'py-3 sm:py-4'
          }`}
        >
          {/* Logo de Desmulta */}
          <div className="flex items-center w-[140px] sm:w-[170px] transition-all duration-500">
            <div className="bg-primary p-1.5 sm:p-2 rounded-xl shadow-lg shadow-primary/20 flex-shrink-0 shield-container">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <Link
              href="/"
              className={`text-lg sm:text-xl font-black tracking-tight text-foreground transition-all duration-500 logo-text-transition ${
                isCollapsed
                  ? 'max-w-0 opacity-0 ml-0 scale-75'
                  : 'max-w-[120px] opacity-100 ml-1.5 sm:ml-2'
              }`}
              onClick={closeMenu}
            >
              DES<span className="text-primary italic">MULTA</span>
            </Link>
          </div>

          {/* Navegación de Escritorio con Efecto Magnético (Oculta en móviles) */}
          <div
            className="hidden lg:flex items-center gap-2"
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
          >
            <MagneticItem mouseX={mouseX}>
              <Link
                href="/estado"
                className="px-4 py-2 text-sm font-bold text-foreground/80 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                Consultar Expediente
              </Link>
            </MagneticItem>

            <MagneticItem mouseX={mouseX}>
              <Link
                href="/blog"
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-foreground/80 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Guía Legal</span>
              </Link>
            </MagneticItem>

            <div className="hidden sm:block">
              <MagneticItem mouseX={mouseX}>
                <ChangelogWidget />
              </MagneticItem>
            </div>

            <MagneticItem mouseX={mouseX}>
              <ThemeToggle />
            </MagneticItem>
          </div>

          {/* Botón Principal y Menú Hamburguesa (Móvil) */}
          <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
            <Button
              onClick={() => onOpenModal('simit')}
              variant="outline"
              size="icon"
              className="w-11 h-11 rounded-full border-primary/20 text-primary hover:bg-primary/10 shadow-sm"
              aria-label="Subir captura"
            >
              <Camera size={18} />
            </Button>
            <ThemeToggle />

            {/* Menú Hamburguesa Animado (Hamburger to X) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="relative w-11 h-11 flex flex-col justify-center items-center bg-foreground/5 hover:bg-foreground/10 rounded-full transition-colors"
              aria-label="Abrir menú móvil"
            >
              <span
                className={`absolute h-[2px] w-5 bg-foreground rounded-full transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'rotate-45' : '-translate-y-1.5'}`}
              />
              <span
                className={`absolute h-[2px] w-5 bg-foreground rounded-full transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
              />
              <span
                className={`absolute h-[2px] w-5 bg-foreground rounded-full transition-all duration-300 ease-in-out ${isMobileMenuOpen ? '-rotate-45' : 'translate-y-1.5'}`}
              />
            </button>
          </div>

          {/* Botones de Consultar (Visible en ambas pantallas, posicionado al final en escritorio) */}
          <div className="hidden lg:flex items-center gap-3 ml-2">
            <Button
              onClick={() => onOpenModal('simit')}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full px-6 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center gap-2 border-none"
            >
              <Camera size={16} />
              Subir Captura
            </Button>

            <Button
              onClick={() => onOpenModal('full')}
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

        {/* Menú Desplegable Móvil (Panel Glassmorphism) */}
        {/* O3: origin-top corrige la animación scale-y en Safari iOS — sin él escala desde el centro */}
        {/* MANDATO-FILTRO v7.4.3: pointer-events-none EXPLÍCITO cuando está cerrado para evitar
            que el div invisible capture toques en Android sobre las secciones inferiores */}
        <div
          className={`lg:hidden absolute top-[90px] left-4 right-4 transition-all duration-300 ease-in-out origin-top ${
            isMobileMenuOpen
              ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-y-95 -translate-y-4 pointer-events-none'
          }`}
          aria-hidden={!isMobileMenuOpen}
        >
          <div className="glass rounded-3xl p-5 flex flex-col gap-4 shadow-2xl border-white/5 border">
            <Link
              href="/estado"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-foreground hover:bg-primary/10 rounded-2xl transition-colors"
            >
              <span>Consultar Expediente</span>
            </Link>

            <Link
              href="/blog"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-foreground hover:bg-primary/10 rounded-2xl transition-colors"
            >
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <BookOpen className="w-5 h-5" />
              </div>
              <span>Guía Legal Completa</span>
            </Link>

            <div className="px-2 py-3 border-t border-border/10 flex justify-between items-center">
              <span className="text-sm font-semibold text-muted-foreground">
                Últimas Actualizaciones
              </span>
              <ChangelogWidget usePortal={true} />
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <Button
                onClick={() => {
                  closeMenu();
                  onOpenModal('simit');
                }}
                variant="secondary"
                className="w-full font-bold rounded-2xl py-6 flex items-center justify-center gap-2"
              >
                <Camera size={18} />
                Subir Captura SIMIT
              </Button>
              <Button
                onClick={() => {
                  closeMenu();
                  onOpenModal('full');
                }}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-2xl py-6 shadow-lg shadow-primary/20"
              >
                Iniciar Estudio Gratuito
              </Button>
            </div>
          </div>
        </div>
      </header>
    </LazyMotion>
  );
};
