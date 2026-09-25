'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldCheck,
  ArrowRight,
  Gift,
  PhoneCall,
  CheckCircle2,
  Star,
  AlertTriangle,
} from 'lucide-react';
import { Haptics } from '@/lib/utils/haptics';
import Link from 'next/link';
import { registerReferral } from './actions';

const formatPhone = (val: string) => {
  return val.replace(/\D/g, '').substring(0, 10);
};

export function ReferralsClient() {
  const [tuNumero, setTuNumero] = useState('');
  const [suNumero, setSuNumero] = useState('');
  const [emailHoneypot, setEmailHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    Haptics.success();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await registerReferral(tuNumero, suNumero, emailHoneypot);
      if (res.success) {
        setSuccess(true);
        setTuNumero('');
        setSuNumero('');
        setEmailHoneypot('');
      } else {
        setError(res.error || 'Ocurrió un error inesperado.');
        Haptics.error();
      }
    } catch {
      setError('Error de conexión con el servidor. Inténtalo de nuevo.');
      Haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-amber-500/30 selection:text-white relative overflow-hidden flex flex-col">
      {/* Background Effects VIP */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Header Minimalista */}
      <header className="relative z-10 px-6 py-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group">
          <ShieldCheck className="w-8 h-8 text-amber-500" />
          <span className="text-xl font-black tracking-tight text-white group-hover:text-amber-500 transition-colors">
            DESMULTA <span className="font-light">VIP</span>
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm font-bold text-white/50 hover:text-white transition-colors"
        >
          Volver al Inicio
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 py-12 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          {/* Copy y Propuesta de Valor */}
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-500">
                Programa de Invitados
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black leading-[1.1] tracking-tight">
              Comparte el acceso <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                y gana beneficios.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-lg leading-relaxed">
              ¿Conoces a alguien con problemas de fotomultas o comparendos? Refiérelos hoy y recibe
              descuentos exclusivos en tu trámite o bonos en efectivo cuando finalicen su proceso
              con éxito.
            </p>

            {/* [2026-09-24] Antes mostraba avatares de relleno y "Más de 500+ usuarios referidos este
                mes", una cifra inventada (publicidad engañosa, Ley 1480 art. 30). Solo afirmaciones
                verificables. */}
            <p className="text-sm font-medium text-white/50">
              Programa exclusivo para clientes de Desmulta.
            </p>
          </div>

          {/* Formulario VIP */}
          <div className="relative w-full max-w-md mx-auto lg:mx-0 animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-[2.5rem] blur-xl" />
            <div className="relative bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              {success ? (
                <div className="py-12 text-center animate-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">¡Referencia Registrada!</h3>
                  <p className="text-white/60 mb-8">
                    Contactaremos a tu referido de forma confidencial. Te notificaremos si inicia un
                    trámite.
                  </p>
                  <Button
                    onClick={() => setSuccess(false)}
                    className="w-full h-14 rounded-2xl bg-transparent border border-white/20 text-white hover:bg-white/10 hover:border-white/30 active:scale-95 transition-all font-bold"
                  >
                    Referir a otra persona
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white">Ingresa los datos</h3>
                    <p className="text-sm text-white/50">Mantenemos estricta confidencialidad.</p>
                  </div>

                  <div className="space-y-5">
                    {/* Honeypot de seguridad contra bots */}
                    <div className="absolute opacity-0 pointer-events-none w-0 h-0 z-[-1] overflow-hidden">
                      <Label htmlFor="email-confirm">Confirmar Correo Electrónico</Label>
                      <Input
                        id="email-confirm"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={emailHoneypot}
                        onChange={(e) => setEmailHoneypot(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="tu-numero"
                        className="text-xs font-black uppercase tracking-widest text-white/50"
                      >
                        Tu Número (WhatsApp)
                      </Label>
                      <div className="relative">
                        <Input
                          id="tu-numero"
                          required
                          value={tuNumero}
                          onChange={(e) => setTuNumero(formatPhone(e.target.value))}
                          placeholder="Ej: 300 123 4567"
                          className="w-full bg-black/50 border-white/10 rounded-2xl pl-12 h-14 text-white focus:border-amber-500"
                        />
                        <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="su-numero"
                        className="text-xs font-black uppercase tracking-widest text-white/50"
                      >
                        Número del Referido
                      </Label>
                      <div className="relative">
                        <Input
                          id="su-numero"
                          required
                          value={suNumero}
                          onChange={(e) => setSuNumero(formatPhone(e.target.value))}
                          placeholder="Ej: 310 987 6543"
                          className="w-full bg-black/50 border-white/10 rounded-2xl pl-12 h-14 text-white focus:border-amber-500"
                        />
                        <PhoneCall className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-2xl animate-in fade-in duration-300">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-2xl group transition-all"
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">Procesando...</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        ENVIAR REFERENCIA VIP
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>

                  <p className="text-[10px] text-center text-white/30 uppercase tracking-widest mt-4">
                    Protegido por cifrado de extremo a extremo
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
