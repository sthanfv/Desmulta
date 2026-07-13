'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { RateLimitBanner, useRateLimit } from '@/components/ui/RateLimitBanner';

export default function VipLoginPage() {
  const [cedula, setCedula] = useState('');
  const [celular, setCelular] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { rateLimitState, handleRateLimitResponse, clearRateLimit } = useRateLimit();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula.trim() || !celular.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos',
        description: 'Por favor, ingrese su Cédula y número de Celular.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/vip/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, celular }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          handleRateLimitResponse(res, data.error);
          return;
        }
        throw new Error(data.error || 'Credenciales inválidas');
      }

      toast({
        title: 'Acceso Permitido',
        description: 'Bienvenido al Portal VIP.',
      });
      router.push(data.redirect);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Acceso Denegado',
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[#D4AF37] opacity-20 blur-[60px] rounded-full pointer-events-none"></div>

      <div className="text-center mb-8 relative z-10">
        <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#D4AF37]/20 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
          <KeyRound className="w-8 h-8 text-[#D4AF37]" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Portal VIP</h1>
        <p className="text-slate-400 text-sm">
          Acceso seguro. Ingrese sus datos para consultar su expediente.
        </p>
      </div>

      {rateLimitState.active && (
        <div className="mb-6 relative z-10">
          <RateLimitBanner
            secondsRemaining={rateLimitState.secondsRemaining}
            message={rateLimitState.message}
            onExpire={clearRateLimit}
            onDismiss={clearRateLimit}
          />
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5 relative z-10">
        <div className="space-y-1">
          <label
            htmlFor="cedula-input"
            className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1"
          >
            Número de Cédula
          </label>
          <Input
            id="cedula-input"
            type="tel"
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 1010123456"
            disabled={isLoading}
            className="h-14 bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:border-[#D4AF37]/50 focus:ring-[#D4AF37]/20 rounded-xl text-lg px-4 transition-all"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="celular-input"
            className="text-xs font-semibold text-slate-300 uppercase tracking-wider pl-1"
          >
            Número de Celular
          </label>
          <Input
            id="celular-input"
            type="tel"
            value={celular}
            onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 3001234567"
            disabled={isLoading}
            className="h-14 bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:border-[#D4AF37]/50 focus:ring-[#D4AF37]/20 rounded-xl text-lg px-4 transition-all"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 bg-[#D4AF37] hover:bg-[#c4a133] text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 group"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              Continuar
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 relative z-10">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Conexión Segura & Cifrada</span>
      </div>
    </div>
  );
}
