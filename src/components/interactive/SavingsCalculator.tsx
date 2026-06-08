'use client';

import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingDown, Info, ShieldCheck, Loader2, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import { StarBorder } from '@/components/ui/star-border';
import { calcularViabilidadLegal, calcularIntereses } from '@/lib/calculadora-legal';
import { TASA_EA_VIGENTE } from '@/lib/config-constants';

export function SavingsCalculator() {
  // Estados Financieros
  const [montoBase, setMontoBase] = useState(800000);
  const [mesesMora, setMesesMora] = useState(12);
  const [intereses, setIntereses] = useState(0);
  
  // Estados Legales y de Conversión
  const [coactivo, setCoactivo] = useState(false);
  const [resultado, setResultado] = useState<ReturnType<typeof calcularViabilidadLegal> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [leadState, setLeadState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [leadNombre, setLeadNombre] = useState('');
  const [leadContacto, setLeadContacto] = useState('');
  const [leadHp, setLeadHp] = useState(''); // Honeypot

  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (isExpanded) {
      const timeoutId = setTimeout(() => {
        setIsExpanded(false);
      }, 15000);
      return () => clearTimeout(timeoutId);
    }
  }, [montoBase, mesesMora, coactivo, leadNombre, leadContacto, isExpanded]);

  useEffect(() => {
    const simulatedDate = new Date();
    simulatedDate.setMonth(simulatedDate.getMonth() - mesesMora);
    const fechaInfraccionISO = simulatedDate.toISOString().split('T')[0];

    const interesCalculado = calcularIntereses(montoBase, fechaInfraccionISO);
    setIntereses(interesCalculado);
    
    const res = calcularViabilidadLegal(fechaInfraccionISO, coactivo);
    setResultado(res);
  }, [montoBase, mesesMora, coactivo]);

  const total = montoBase + intereses;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const enviarLead = async () => {
    if (leadHp) return;
    setLeadState('sending');
    setErrorMsg(null);
    try {
      const cleanPhone = leadContacto.replace(/\D/g, '');
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'SIMIT_LEAD',
          probability: resultado?.probabilidadExito,
          contacto: cleanPhone,
          nombre: leadNombre.trim() || undefined,
          website_hp: leadHp,
          deuda_total: total,
          ahorro_potencial: intereses
        }),
      });
      if (!response.ok) throw new Error('Error en el envío');
      setLeadState('success');
      setTimeout(() => { 
        setLeadState('idle'); 
        setLeadContacto(''); 
        setLeadNombre(''); 
        setIsExpanded(false);
      }, 5000);
    } catch (_error) {
      setErrorMsg('Error al procesar la solicitud');
      setLeadState('error');
      setTimeout(() => setErrorMsg(null), 6000);
    }
  };

  return (
    <StarBorder 
      color="#F2C94C"
      speed="12s"
      borderWidth="1.5px"
      borderRadius="1.5rem"
      className="w-full max-w-md mx-auto shadow-[0_0_40px_-15px_rgba(242,201,76,0.3)] group"
      innerClassName="bg-white dark:bg-[#0d0d0d]"
    >
      <TarjetaPremium className="w-full h-full p-6 md:p-8 bg-transparent !border-none !rounded-[inherit] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent z-0"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3 border-b border-foreground/10 pb-4">
            <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                Simulador de Prescripción y Ahorro
              </h3>
              <p className="text-xs text-muted-foreground font-medium">Auditoría Legal y Ahorro Inmediato</p>
            </div>
          </div>

          {/* --- CONTROLES FINANCIEROS Y TIEMPO --- */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Valor original de la multa
                </label>
                <span className="font-black text-primary text-xl tracking-tight">
                  {formatCurrency(montoBase)}
                </span>
              </div>
              <Slider
                value={[montoBase]}
                onValueChange={(val) => { setMontoBase(val[0]); setIsExpanded(true); }}
                min={150000}
                max={5000000}
                step={50000}
                className="py-2"
                aria-label="Valor original de la multa"
                aria-valuetext={`${montoBase} pesos`}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex flex-col">
                  <span>Tiempo de mora</span>
                  <span className="text-xs text-slate-500 font-normal">
                    Aprox. {new Date(new Date().setMonth(new Date().getMonth() - mesesMora)).getFullYear()}
                  </span>
                </label>
                <div className="flex flex-col items-end">
                  <span className="font-black text-slate-900 dark:text-white text-xl tracking-tight">
                    {Math.floor(mesesMora / 12) > 0 && `${Math.floor(mesesMora / 12)} ${Math.floor(mesesMora / 12) === 1 ? 'año' : 'años'} `}
                    {mesesMora % 12 > 0 && `${mesesMora % 12} ${mesesMora % 12 === 1 ? 'mes' : 'meses'}`}
                    {mesesMora === 0 && '0 meses'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    ({mesesMora} {mesesMora === 1 ? 'mes' : 'meses'})
                  </span>
                </div>
              </div>
              <Slider
                value={[mesesMora]}
                onValueChange={(val) => { setMesesMora(val[0]); setIsExpanded(true); }}
                min={0}
                max={120}
                step={1}
                className="py-2"
                aria-label="Tiempo de mora en meses"
                aria-valuetext={`${mesesMora} meses`}
              />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <Checkbox
                  id="coactivo"
                  checked={coactivo}
                  onCheckedChange={(checked) => { setCoactivo(checked === true); setIsExpanded(true); }}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus:ring-primary focus:ring-offset-gray-900"
                />
                <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 bg-primary/20 rounded absolute inset-0 animate-ping"></div>
                </div>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">El SIMIT indica &quot;Cobro Coactivo&quot;</span>
            </label>
          </div>

          {/* --- PANEL DE RESULTADOS Y CONVERSIÓN --- */}
          <div
            className={`grid transition-all duration-500 ease-in-out ${
              resultado && isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="pt-4 border-t border-foreground/10 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Intereses proyectados</span>
                    <span className="font-bold text-red-500">+{formatCurrency(intereses)}</span>
                  </div>
                  <div className="flex justify-between items-end bg-foreground/5 dark:bg-black/40 p-4 rounded-2xl border border-foreground/10">
                    <span className="text-base font-medium text-muted-foreground">Deuda Total Actual</span>
                    <span className="font-black text-2xl text-foreground tracking-tight">{formatCurrency(total)}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    resultado.estado === 'CADUCIDAD ESTIMADA'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {resultado.estado === 'CADUCIDAD ESTIMADA' ? (
                      <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm">
                        {resultado.estado === 'CADUCIDAD ESTIMADA' ? 'Apta para Prescripción' : 'Requiere Defensa Técnica'}
                      </h4>
                      <p className="text-xs opacity-90 mt-1 leading-relaxed">
                        {resultado.disclaimerLegal}
                      </p>
                      <div className="mt-2 inline-block px-2 py-1 rounded bg-foreground/10 text-[10px] font-bold uppercase tracking-wider">
                        Éxito Histórico: {resultado.probabilidadExito}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* FORMULARIO DE CAPTURA - LEAD AUTOMÁTICO */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                    Iniciar estudio sin costo
                  </h4>
                  
                  {/* Honeypot Field */}
                  <input
                    type="text"
                    value={leadHp}
                    onChange={(e) => setLeadHp(e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <input
                    type="text"
                    placeholder="Tu nombre (opcional)"
                    value={leadNombre}
                    onChange={(e) => { setLeadNombre(e.target.value); setIsExpanded(true); }}
                    className="w-full bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                  
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="Tu número de WhatsApp"
                      value={leadContacto}
                      onChange={(e) => { setLeadContacto(e.target.value); setIsExpanded(true); }}
                      className="flex-1 bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                    <button
                      onClick={enviarLead}
                      disabled={leadState === 'sending' || !leadContacto.trim() || leadContacto.length < 10}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {leadState === 'sending' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {leadState === 'success' && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex gap-2 text-emerald-400 mt-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <p className="text-xs font-medium">¡Solicitud recibida! Un abogado experto te contactará en los próximos minutos.</p>
                    </div>
                  )}
                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2 text-red-600 mt-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <p className="text-xs font-bold">{errorMsg}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 justify-center text-[10px] text-muted-foreground font-medium text-center pt-2">
            <Info className="w-3 h-3 flex-shrink-0" />
            <span>Cálculo proyectado ({(TASA_EA_VIGENTE * 100).toFixed(1)}% E.A.). Valores reales SIMIT pueden variar ligeramente.</span>
          </div>
        </div>
      </TarjetaPremium>
    </StarBorder>
  );
}