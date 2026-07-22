'use client';

import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Calculator,
  TrendingDown,
  Info,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Activity,
  AlertOctagon,
} from 'lucide-react';
import { z } from 'zod';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import { StarBorder } from '@/components/ui/star-border';

const manualSchema = z.object({
  valor: z.number({ invalid_type_error: "Debe ser numérico" }).min(0, "Mínimo $0").max(100000000, "Máximo $100M"),
  meses: z.number({ invalid_type_error: "Debe ser numérico" }).min(0, "Mínimo 0 meses").max(600, "Máximo 600 meses")
});

export function SavingsCalculator() {
  // Estados Financieros
  const [montoBase, setMontoBase] = useState(0);
  const [mesesMora, setMesesMora] = useState(0);
  const [intereses, setIntereses] = useState(0);

  // Estados Legales y de Conversión
  const [coactivo, setCoactivo] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [proyecciones, setProyecciones] = useState<any>(null);
  const [descuentos, setDescuentos] = useState<any>(null);
  const [historialIntereses, setHistorialIntereses] = useState<any[]>([]);
  const [riesgoEmbargo, setRiesgoEmbargo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [leadState, setLeadState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [leadNombre, setLeadNombre] = useState('');
  const [leadContacto, setLeadContacto] = useState('');
  const [leadHp, setLeadHp] = useState(''); // Honeypot

  const [isExpanded, setIsExpanded] = useState(false);

  // Estados Manuales Zod
  const [manualMonto, setManualMonto] = useState('');
  const [manualMeses, setManualMeses] = useState('');
  const [manualErrors, setManualErrors] = useState<{valor?: string, meses?: string}>({});

  const handleManualChange = () => {
     // Sanitizar y parsear a número
     const parsedMonto = parseInt(manualMonto.replace(/\D/g, ''), 10) || 0;
     const parsedMeses = parseInt(manualMeses.replace(/\D/g, ''), 10) || 0;
     
     const result = manualSchema.safeParse({ valor: parsedMonto, meses: parsedMeses });
     if (result.success) {
       setManualErrors({});
       setMontoBase(result.data.valor);
       setMesesMora(result.data.meses);
       setIsExpanded(true);
     } else {
       const errors: any = {};
       result.error.issues.forEach(issue => {
         errors[issue.path[0]] = issue.message;
       });
       setManualErrors(errors);
     }
  };

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

    const fetchData = async () => {
      try {
        const response = await fetch('/api/public/calcular-multa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            valorMulta: montoBase,
            fechaInfraccion: fechaInfraccionISO,
            tieneCobroCoactivo: coactivo
          })
        });
        if (response.ok) {
          const json = await response.json();
          const { prescripcion, financiero } = json.data;
          setIntereses(financiero.interesesAcumulados);
          setResultado(prescripcion);
          setProyecciones(financiero.proyecciones);
          setDescuentos(financiero.descuentos);
          setHistorialIntereses(financiero.historialIntereses || []);
          setRiesgoEmbargo(prescripcion.riesgoEmbargo || null);
        }
      } catch (error) {
        console.error('Error fetching API', error);
      }
    };
    
    // Debounce para no colapsar la API cuando el usuario mueve rápido el slider
    const timeoutId = setTimeout(fetchData, 300);
    return () => clearTimeout(timeoutId);
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

    // Validación client-side robusta del teléfono colombiano (complementa la validación Zod del servidor)
    const cleanPhone = leadContacto.replace(/\D/g, '');
    if (!/^3[0-9]{9}$/.test(cleanPhone)) {
      setErrorMsg(
        'Número inválido. Debe ser un celular colombiano de 10 dígitos (ej: 300 123 4567).'
      );
      return;
    }

    setLeadState('sending');
    setErrorMsg(null);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'SIMIT_LEAD',
          probability: resultado?.probabilidadExito,
          contacto: cleanPhone,
          // Truncar nombre a 60 chars para evitar overflow antes de enviarlo al servidor
          nombre: leadNombre.trim().slice(0, 60) || undefined,
          website_hp: leadHp,
          deuda_total: total,
          ahorro_potencial: intereses,
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
                Calculadora Legal
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Diagnóstico instantáneo de viabilidad judicial
              </p>
            </div>
          </div>

          {/* --- CONTROLES FINANCIEROS Y TIEMPO (DOBLE INTERFAZ) --- */}
          <Tabs defaultValue="slider" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-foreground/10 p-1 rounded-xl">
              <TabsTrigger value="slider" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all">Modo Rápido</TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all">Modo Preciso</TabsTrigger>
            </TabsList>

            <TabsContent value="slider" className="space-y-6 mt-4">
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
                  onValueChange={(val) => {
                    setMontoBase(val[0]);
                    setManualMonto(val[0].toString()); // Sincroniza hacia el manual
                    setIsExpanded(true);
                  }}
                  min={0}
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
                      Aprox.{' '}
                      {new Date(new Date().setMonth(new Date().getMonth() - mesesMora)).getFullYear()}
                    </span>
                  </label>
                  <div className="flex flex-col items-end">
                    <span className="font-black text-slate-900 dark:text-white text-xl tracking-tight">
                      {Math.floor(mesesMora / 12) > 0 &&
                        `${Math.floor(mesesMora / 12)} ${Math.floor(mesesMora / 12) === 1 ? 'año' : 'años'} `}
                      {mesesMora % 12 > 0 &&
                        `${mesesMora % 12} ${mesesMora % 12 === 1 ? 'mes' : 'meses'}`}
                      {mesesMora === 0 && '0 meses'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      ({mesesMora} {mesesMora === 1 ? 'mes' : 'meses'})
                    </span>
                  </div>
                </div>
                <Slider
                  value={[mesesMora]}
                  onValueChange={(val) => {
                    setMesesMora(val[0]);
                    setManualMeses(val[0].toString()); // Sincroniza hacia el manual
                    setIsExpanded(true);
                  }}
                  min={0}
                  max={312}
                  step={1}
                  className="py-2"
                  aria-label="Tiempo de mora en meses"
                  aria-valuetext={`${mesesMora} meses`}
                />
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Valor exacto de la multa (sin puntos)
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="Ej: 1500000"
                  value={manualMonto}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); 
                    setManualMonto(val);
                  }}
                  onBlur={handleManualChange}
                  className="w-full bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
                {manualErrors.valor && <p className="text-xs font-bold text-red-500">{manualErrors.valor}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Meses exactos de mora
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="Ej: 24 (equivale a 2 años)"
                  value={manualMeses}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setManualMeses(val);
                  }}
                  onBlur={handleManualChange}
                  className="w-full bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
                {manualErrors.meses && <p className="text-xs font-bold text-red-500">{manualErrors.meses}</p>}
              </div>
              <button 
                onClick={handleManualChange}
                className="w-full mt-2 py-3 px-4 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Calcular Viabilidad
              </button>
            </TabsContent>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors cursor-pointer group mt-4">
              <div className="relative flex items-center justify-center">
                <Checkbox
                  id="coactivo"
                  checked={coactivo}
                  onCheckedChange={(checked) => {
                    setCoactivo(checked === true);
                    setIsExpanded(true);
                  }}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus:ring-primary focus:ring-offset-gray-900"
                />
                <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-5 h-5 bg-primary/20 rounded absolute inset-0 animate-ping"></div>
                </div>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                El SIMIT indica &quot;Cobro Coactivo&quot;
              </span>
            </label>
          </Tabs>

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
                    <span className="text-base font-medium text-muted-foreground">
                      Deuda Total Actual
                    </span>
                    <span className="font-black text-2xl text-foreground tracking-tight">
                      {formatCurrency(total)}
                    </span>
                  </div>

                  {/* SÚPER PODERES DE GO - DISEÑO VISUAL */}
                  {descuentos?.aplicaDescuento && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mt-4">
                      <h4 className="font-bold text-emerald-600 mb-2">🎁 Ley 1383 (Descuento Activo)</h4>
                      <p className="text-sm text-emerald-700/80 mb-3">Estás a tiempo. Paga hoy mismo y ahorra dinero:</p>
                      <div className="flex justify-between items-center bg-emerald-500/20 px-3 py-2 rounded-lg font-bold text-emerald-700">
                        <span>50% Descuento</span>
                        <span>{formatCurrency(descuentos.valorCon50Pct)}</span>
                      </div>
                    </div>
                  )}

                  {!descuentos?.aplicaDescuento && proyecciones && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mt-4">
                      <h4 className="font-bold text-red-600 mb-2">🔮 Riesgo Financiero (Deuda Futura)</h4>
                      <p className="text-sm text-red-700/80 mb-3">Si no resuelves esto, tu deuda seguirá sumando intereses de mora:</p>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-sm font-medium text-red-600 bg-red-500/10 px-3 py-1.5 rounded">
                          <span>En 3 meses:</span>
                          <span>{formatCurrency(proyecciones.en3Meses)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold text-red-700 bg-red-500/20 px-3 py-1.5 rounded">
                          <span>En 1 año:</span>
                          <span>{formatCurrency(proyecciones.en12Meses)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {historialIntereses && historialIntereses.length > 0 && (
                    <div className="bg-foreground/5 p-4 rounded-xl mt-4 border border-foreground/10">
                      <h4 className="font-bold mb-1 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        Crecimiento Cronológico
                      </h4>
                      <p className="text-xs text-muted-foreground mb-4">Intereses acumulados año a año según Tasa de Usura.</p>
                      <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={historialIntereses}>
                            <XAxis dataKey="anio" fontSize={10} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                              formatter={(value: any) => formatCurrency(Number(value))}
                              labelFormatter={(label) => `Año ${label}`}
                              contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', backgroundColor: '#1f2937', color: '#fff' }}
                            />
                            <Bar dataKey="acumulado" radius={[4, 4, 0, 0]}>
                              {historialIntereses.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === historialIntereses.length - 1 ? '#ef4444' : '#f87171'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {resultado && (
                    <div
                      className={`p-4 rounded-2xl border flex items-start gap-3 ${
                        resultado.estado === 'CADUCIDAD ESTIMADA'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {resultado.estado === 'CADUCIDAD ESTIMADA' ? (
                        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
                      )}
                      <div>
                        <h4 className="font-bold text-sm">
                          {resultado.estado === 'CADUCIDAD ESTIMADA'
                            ? 'Apta para Prescripción'
                            : 'Requiere Defensa Técnica'}
                        </h4>
                        {/* Estado legal enriquecido — visible solo cuando difiere del estado visual */}
                        {resultado.estadoLegal &&
                          resultado.estadoLegal !== 'VIGENTE' &&
                          resultado.estadoLegal !== 'REQUIERE_REVISION' && (
                            <span className="inline-block mt-1 mb-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-foreground/10">
                              {resultado.estadoLegal === 'PRESCRITO' &&
                                '⚖️ PRESCRITO (Art. 159 CNT)'}
                              {resultado.estadoLegal === 'CADUCADO' && '⏱️ CADUCADO (Art. 161 CNT)'}
                              {resultado.estadoLegal === 'IMPUGNABLE_C038' &&
                                '📷 IMPUGNABLE (C-038/2020)'}
                            </span>
                          )}
                        <p className="text-xs opacity-90 mt-1 leading-relaxed">
                          {resultado.disclaimerLegal}
                        </p>
                        <div className="mt-2 inline-block px-2 py-1 rounded bg-foreground/10 text-[10px] font-bold uppercase tracking-wider">
                          Éxito Histórico: {resultado.probabilidadExito.split('%')[0]}%
                        </div>
                        
                        {/* Semáforo de Probabilidad de Cobro Coactivo (Con Disclaimer Legal) */}
                        {riesgoEmbargo && (
                          <div className="mt-4 pt-3 border-t border-foreground/10">
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 cursor-help w-fit bg-white dark:bg-black/40 border px-3 py-2 rounded-lg shadow-sm">
                                    <AlertOctagon className={`w-4 h-4 ${riesgoEmbargo === 'Alto' ? 'text-red-500' : riesgoEmbargo === 'Medio' ? 'text-amber-500' : 'text-emerald-500'}`} />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                      Probabilidad de Acción de Cobro: 
                                      <span className={`ml-1 ${riesgoEmbargo === 'Alto' ? 'text-red-600 dark:text-red-400' : riesgoEmbargo === 'Medio' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {riesgoEmbargo.toUpperCase()}
                                      </span>
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs p-3">
                                  <p className="font-bold mb-1">Algoritmo Predictivo</p>
                                  <p>Cálculo referencial y educativo basado en los tiempos de caducidad (Ley 769 de 2002). <strong>Desmulta no es una autoridad ni ofrece asesoría legal.</strong> Solo el SIMIT o la Secretaría de Movilidad determinan y ejecutan medidas cautelares como el embargo.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                    maxLength={60}
                    onChange={(e) => {
                      setLeadNombre(e.target.value);
                      setIsExpanded(true);
                    }}
                    className="w-full bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    aria-label="Tu nombre (opcional)"
                  />

                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="Tu número de WhatsApp"
                      value={leadContacto}
                      maxLength={15}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => {
                        setLeadContacto(e.target.value);
                        setIsExpanded(true);
                      }}
                      className="flex-1 bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      aria-label="Tu número de WhatsApp para contacto"
                    />
                    <button
                      onClick={enviarLead}
                      disabled={
                        leadState === 'sending' || !leadContacto.trim() || leadContacto.length < 10
                      }
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      aria-label="Enviar solicitud de estudio gratuito"
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
                      <p className="text-xs font-medium">
                        ¡Solicitud recibida! Un experto analizará tu caso y te contactará a la
                        brevedad posible.
                      </p>
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

          <div className="flex flex-col items-center gap-1.5 justify-center text-[10px] text-muted-foreground font-medium text-center pt-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-3 h-3 flex-shrink-0" />
              <span>Simulador SIMIT: Interés Simple con Límite de Prescripción (Art 159).</span>
            </div>
            <span className="text-[9px] opacity-75">
              *Los intereses se congelan legalmente a los 3 años (o 6 si hay coactivo).
            </span>
          </div>
        </div>
      </TarjetaPremium>
    </StarBorder>
  );
}
