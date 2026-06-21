'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  MessageCircle,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Copy,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { FooterConfig } from '@/lib/site-config';
import _colombiaCities from '@/lib/data/ciudades.json';

interface FooterProps {
  footerData: FooterConfig;
  onOpenWhatsAppWarning: () => void;
}

/**
 * Footer - Pie de página detallado con navegación y contacto.
 * MANDATO-FILTRO: Professionalismo y legalidad comunicada.
 */
export const Footer = ({ footerData, onOpenWhatsAppWarning }: FooterProps) => {
  const { toast } = useToast();

  const handleCopyEmail = () => {
    const email = footerData.email || 'contacto@desmulta.vercel.app';
    navigator.clipboard.writeText(email);
    toast({
      title: '✅ Correo copiado',
      description: 'El correo ha sido copiado al portapapeles.',
    });
  };
  return (
    <footer id="contacto" className="py-16 md:py-32 px-4 relative z-10 reveal">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 floating-card p-10 lg:p-12 bg-card/30 flex flex-col justify-between group overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
            <div className="space-y-8 relative z-10">
              <Link href="/" className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                  <ShieldCheck className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl md:text-4xl font-black tracking-tighter leading-none">
                    DESMULTA
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-1">
                    TECNOLOGÍA VIAL
                  </span>
                </div>
              </Link>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md font-medium">
                Líderes en defensa administrativa y saneamiento vial. Transformamos problemas
                legales en soluciones definitivas con ética y transparencia.
              </p>
              <div className="pt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  <span className="font-bold text-primary">¿Por qué usamos Vercel? </span>
                  Somos un proyecto independiente de tecnología legal (LegalTech) que busca
                  democratizar el acceso a la defensa ciudadana sin costos excesivos.
                </p>
              </div>
            </div>
            <div className="mt-12 flex gap-4">
              {footerData.instagramUrl && (
                <Link
                  href={footerData.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-2xl bg-card border border-white/10 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-95"
                  aria-label="Síguenos en Instagram"
                >
                  <Instagram size={24} aria-hidden="true" />
                </Link>
              )}
              {footerData.facebookUrl && (
                <Link
                  href={footerData.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-2xl bg-card border border-white/10 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-95"
                  aria-label="Síguenos en Facebook"
                >
                  <Facebook size={24} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
            <div className="lg:col-span-3 floating-card p-10 bg-card/20 border-white/5 space-y-8">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">
                Navegación Táctica
              </h2>
              <nav className="flex flex-col gap-6">
                {[
                  {
                    label: 'Inicio',
                    href: '#',
                    action: () =>
                      typeof window !== 'undefined' &&
                      window.scrollTo({ top: 0, behavior: 'smooth' }),
                  },
                  { label: 'Servicios', href: '#servicios' },
                  { label: 'Metodología', href: '#metodologia' },
                  { label: 'Guía Legal', href: '/blog' },
                  { label: 'Preguntas Frecuentes', href: '#faq' },
                  { label: 'Términos y Condiciones', href: '/terminos' },
                  { label: 'API para Empresas', href: '/api-docs' },
                ].map((link, i) => (
                  <Link
                    key={i}
                    href={link.href}
                    onClick={link.action}
                    className="text-lg font-bold text-muted-foreground hover:text-primary flex items-center gap-3 group/link transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover/link:bg-primary transition-colors" />
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="lg:col-span-4 floating-card p-10 bg-primary/5 border-primary/10 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <MessageCircle size={120} className="text-primary rotate-12" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary/90">
                Canales Oficiales
              </h2>
              <div className="space-y-8 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-background rounded-2xl border border-primary/20">
                    <Mail size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">
                      Email Corporativo
                    </p>
                    <button
                      onClick={handleCopyEmail}
                      className="text-lg sm:text-xl font-bold text-foreground truncate max-w-[280px] sm:max-w-full hover:text-primary transition-colors flex items-center gap-2 group/email tracking-tight"
                      title="Haz clic para copiar"
                    >
                      {footerData.email || 'contacto@desmulta.online'}
                      <Copy className="w-4 h-4 opacity-0 group-hover/email:opacity-100 transition-opacity shrink-0 text-primary" />
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-background rounded-2xl border border-primary/20">
                    <MapPin size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">
                      Base de Operaciones
                    </p>
                    <p className="text-xl font-bold text-foreground">Cobertura Nacional Digital</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={onOpenWhatsAppWarning}
                className="w-full h-16 rounded-3xl bg-primary text-primary-foreground font-black text-lg active:scale-95 transition-all shadow-xl shadow-primary/20 border-none group/btn"
              >
                ABRIR CANAL DIRECTO
                <ShieldCheck
                  size={18}
                  className="ml-3 group-hover:translate-x-1 transition-transform"
                />
              </Button>
            </div>
          </div>
        </div>

        {/* SEO Siloing: Directorios (Ciudades y Códigos) */}
        <div className="pt-16 pb-8 border-t border-border/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Directorio de Códigos */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/50 mb-4">
                Defensa por Código de Multa
              </h3>
              <Link
                href="/multas/codigo"
                className="w-full md:w-auto inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all group active:scale-95 text-muted-foreground hover:text-white"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                  <BookOpen size={20} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-black uppercase tracking-widest text-white">
                    Directorio de Códigos
                  </span>
                  <span className="text-xs font-medium">Explora las infracciones defendibles</span>
                </div>
              </Link>
            </div>

            {/* Cobertura Nacional */}
            <div className="flex flex-col items-center md:items-end text-center md:text-right mt-8 md:mt-0">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/50 mb-4">
                Cobertura Nacional por Ciudad
              </h3>
              <Link
                href="/multas/ciudades"
                className="w-full md:w-auto inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-green-500/30 transition-all group active:scale-95 text-muted-foreground hover:text-white"
              >
                <div className="flex flex-col text-right order-2 md:order-1">
                  <span className="text-sm font-black uppercase tracking-widest text-white">
                    Directorio de Cobertura
                  </span>
                  <span className="text-xs font-medium">Encuentra tu ciudad o municipio</span>
                </div>
                <div className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-black transition-colors order-1 md:order-2">
                  <MapPin size={20} />
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-border/20">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">
                © {new Date().getFullYear()} DESMULTA — SERVICIO PRIVADO DE GESTIÓN VIAL
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">
                Sistemas Globales: Operativos
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
