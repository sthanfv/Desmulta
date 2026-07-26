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
  ChevronUp,
} from 'lucide-react';
import { z } from 'zod';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import { StarBorder } from '@/components/ui/star-border';
import CountUp from '@/components/ui/CountUp';

const manualSchema = z.object({
  valor: z
    .number({ invalid_type_error: 'Debe ser numérico' })
    .min(0, 'Mínimo $0')
    .max(100000000, 'Máximo $100M'),
  fecha: z.string().refine((val) => {
    if (!val) return false;
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date() && d >= new Date('2002-08-08');
  }, 'Fecha inválida. Debe ser entre Ago 2002 y Hoy.'),
});

interface HistorialInteres {
  anio: number;
  acumulado: number;
}
interface ProyeccionesData {
  en3Meses: number;
  en12Meses: number;
}
interface DescuentosData {
  aplicaDescuento: boolean;
  valorCon50Pct: number;
}
interface EstrategiaData {
  bloqueoEmbriaguez: boolean;
  esSalvablePorPrescripcion: boolean;
}
interface ResultadoPrescripcion {
  probabilidadExito: string | number;
  estado: string;
  estadoLegal: string;
  disclaimerLegal: string;
}

export function SavingsCalculator() {
  // Estados Financieros
  const [montoBase, setMontoBase] = useState(0);
  const [mesesMora, setMesesMora] = useState(0);
  const [intereses, setIntereses] = useState(0);

  // Estados Legales y de Conversión
  const [coactivo, setCoactivo] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPrescripcion | null>(null);
  const [proyecciones, setProyecciones] = useState<ProyeccionesData | null>(null);
  const [descuentos, setDescuentos] = useState<DescuentosData | null>(null);
  const [historialIntereses, setHistorialIntereses] = useState<HistorialInteres[]>([]);
  const [riesgoEmbargo, setRiesgoEmbargo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [estrategia, setEstrategia] = useState<EstrategiaData | null>(null);
  const [isEmbriaguez, setIsEmbriaguez] = useState(false);

  const [leadState, setLeadState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [leadNombre, setLeadNombre] = useState('');
  const [leadContacto, setLeadContacto] = useState('');
  const [leadHp, setLeadHp] = useState(''); // Honeypot

  const [isExpanded, setIsExpanded] = useState(false);

  // Estados Manuales Zod
  const [manualMonto, setManualMonto] = useState('');
  const [manualFechaText, setManualFechaText] = useState(''); // DD/MM/YYYY
  const [manualErrors, setManualErrors] = useState<{ valor?: string; fecha?: string }>({});
  const [fechaExactaGlobal, setFechaExactaGlobal] = useState<string | null>(null);

  const handleManualChange = () => {
    // Sanitizar y parsear a número
    const parsedMonto = parseInt(manualMonto.replace(/\D/g, ''), 10) || 0;

    // Convertir DD/MM/YYYY a YYYY-MM-DD para validación
    const parts = manualFechaText.split('/');
    let isoDate = '';
    if (parts.length === 3 && parts[2].length === 4) {
      isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      isoDate = 'invalid'; // Forzar error Zod
    }
    const result = manualSchema.safeParse({ valor: parsedMonto, fecha: isoDate });
    if (result.success) {
      setManualErrors({});
      setMontoBase(result.data.valor);
      setFechaExactaGlobal(result.data.fecha);

      // Sincronizar el slider visualmente (aproximado en meses)
      const d = new Date(result.data.fecha);
      const now = new Date();
      let diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (diffMonths < 0) diffMonths = 0;
      setMesesMora(diffMonths);

      setIsExpanded(true);
    } else {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0]] = issue.message;
      });
      setManualErrors(errors);
    }
  };

  useEffect(() => {
    // Timeout removido: la UI ya no se cerrará sola.
  }, [isExpanded]);

  useEffect(() => {
    let fechaInfraccionISO = '';
    if (fechaExactaGlobal) {
      fechaInfraccionISO = fechaExactaGlobal;
    } else {
      const simulatedDate = new Date();
      simulatedDate.setMonth(simulatedDate.getMonth() - mesesMora);
      fechaInfraccionISO = simulatedDate.toISOString().split('T')[0];
    }

    const fetchData = async () => {
      try {
        const response = await fetch('/api/public/calcular-multa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            valorMulta: montoBase,
            fechaInfraccion: fechaInfraccionISO,
            tieneCobroCoactivo: coactivo,
            tipoInfraccion: isEmbriaguez ? 'F' : '',
          }),
        });
        if (response.ok) {
          const json = await response.json();
          const { prescripcion, financiero, estrategiaLegal } = json.data;
          setIntereses(financiero.interesesAcumulados);
          setResultado(prescripcion);
          setProyecciones(financiero.proyecciones);
          setDescuentos(financiero.descuentos);
          setHistorialIntereses(financiero.historialIntereses || []);
          setRiesgoEmbargo(prescripcion.riesgoEmbargo || null);
          setEstrategia(estrategiaLegal);
        }
      } catch (error) {
        console.error('Error fetching API', error);
      }
    };

    // Debounce para no colapsar la API cuando el usuario mueve rápido el slider
    const timeoutId = setTimeout(fetchData, 300);
    return () => clearTimeout(timeoutId);
  }, [montoBase, mesesMora, coactivo, fechaExactaGlobal, isEmbriaguez]);

  const total = montoBase + intereses;

  // Transformar historial para efecto Bola de Nieve (Deuda Total Acumulada)
  const chartData = React.useMemo(() => {
    if (!historialIntereses || historialIntereses.length <= 1) return [];
    let sum = montoBase;
    return historialIntereses.map((h) => {
      sum += h.acumulado;
      return {
        anio: h.anio,
        deudaTotal: sum,
      };
    });
  }, [historialIntereses, montoBase]);

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
              <TabsTrigger
                value="slider"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all"
              >
                Modo Rápido
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all"
              >
                Modo Preciso
              </TabsTrigger>
            </TabsList>

            <TabsContent value="slider" className="space-y-6 mt-4">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Valor original de la multa
                  </label>
                  <span className="font-black text-primary text-xl tracking-tight">
                    $ <CountUp from={0} to={montoBase} separator="." duration={0.8} />
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
                  max={3000000}
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
                      {new Date(
                        new Date().setMonth(new Date().getMonth() - mesesMora)
                      ).getFullYear()}
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
                    setFechaExactaGlobal(null); // Al mover el slider, volvemos a la fecha relativa
                    setIsExpanded(true);
                  }}
                  min={0}
                  max={120}
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
                  placeholder="Ej: 1.500.000"
                  value={manualMonto}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    if (!raw) {
                      setManualMonto('');
                      return;
                    }
                    const formatted = new Intl.NumberFormat('es-CO').format(parseInt(raw, 10));
                    setManualMonto(formatted);
                  }}
                  className="w-full bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
                {manualErrors.valor && (
                  <p className="text-xs font-bold text-red-500">{manualErrors.valor}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Fecha exacta del comparendo (DD/MM/AAAA)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 11/04/2026"
                  value={manualFechaText}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                    if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5, 9);
                    setManualFechaText(val);
                  }}
                  maxLength={10}
                  className="w-full bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
                {manualErrors.fecha && (
                  <p className="text-xs font-bold text-red-500">{manualErrors.fecha}</p>
                )}
              </div>
              <button
                onClick={handleManualChange}
                className="w-full mt-2 py-3 px-4 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Calcular Viabilidad
              </button>
            </TabsContent>

            <div
              className={`grid transition-all duration-500 ease-in-out ${
                isExpanded || coactivo || isEmbriaguez
                  ? 'grid-rows-[1fr] opacity-100 mt-4'
                  : 'grid-rows-[0fr] opacity-0 mt-0'
              }`}
            >
              <div className="overflow-hidden flex flex-col gap-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors cursor-pointer group">
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
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    El SIMIT indica &quot;Cobro Coactivo&quot;
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <Checkbox
                      id="embriaguez"
                      checked={isEmbriaguez}
                      onCheckedChange={(checked) => {
                        setIsEmbriaguez(checked === true);
                        setIsExpanded(true);
                      }}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 data-[state=checked]:bg-red-500 data-[state=checked]:text-white focus:ring-red-500 focus:ring-offset-gray-900"
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    La multa incluyó inmovilización del vehículo o suspensión de licencia
                    (Infracciones Especiales)
                  </span>
                </label>
              </div>
            </div>
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
                    <span className="font-bold text-red-500">
                      +$ <CountUp from={0} to={intereses} separator="." duration={1.5} />
                    </span>
                  </div>
                  <div className="flex flex-col bg-foreground/5 dark:bg-black/40 p-4 rounded-2xl border border-foreground/10 gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-base font-medium text-muted-foreground">
                        Deuda Total Actual
                      </span>
                      <span className="font-black text-2xl text-foreground tracking-tight">
                        $ <CountUp from={0} to={total} separator="." duration={1.5} />
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/70 leading-tight">
                      * Proyectada a hoy. Plataformas como SIMIT pueden tardar semanas en actualizar
                      los intereses en pantalla.
                    </span>
                  </div>

                  {/* SÚPER PODERES DE GO - MONETIZACIÓN & ESTRATEGIA LEGAL */}
                  <div
                    className={`grid transition-all duration-500 ease-in-out ${estrategia?.bloqueoEmbriaguez ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                  >
                    <div className="overflow-hidden">
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                        <h4 className="font-bold text-red-600 flex items-center gap-2 mb-1">
                          <AlertOctagon className="w-4 h-4" /> Sin Descuentos (Ley 1696)
                        </h4>
                        <p className="text-sm text-red-700/80">
                          Las multas por embriaguez tienen prohibición expresa de recibir cualquier
                          tipo de amnistía o descuento por ley.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`grid transition-all duration-500 ease-in-out ${estrategia?.esSalvablePorPrescripcion ? 'grid-rows-[1fr] opacity-100 mt-5' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                  >
                    <div className="overflow-hidden">
                      <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-5 rounded-2xl relative flex flex-col items-start shadow-inner">
                        <div className="absolute -top-4 -right-4 p-2 opacity-5 pointer-events-none">
                          <ShieldCheck className="w-32 h-32" />
                        </div>
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                          <div className="p-2 bg-primary/20 rounded-lg text-primary">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <h4 className="font-black text-primary text-lg">
                            Viabilidad de Defensa Detectada
                          </h4>
                        </div>
                        <p className="text-sm text-foreground/80 relative z-10 mb-5 leading-relaxed">
                          Según el cálculo de tiempos, tu caso podría ser apto para solicitar la
                          figura legal de prescripción. Adquiere el documento técnico y preséntalo
                          ante la Secretaría de Tránsito correspondiente para iniciar el proceso.
                        </p>
                        <a
                          href="/plantillas"
                          className="relative z-10 group inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground font-black px-6 py-3.5 rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-[0_0_20px_-5px_rgba(242,201,76,0.4)] hover:shadow-[0_0_30px_-5px_rgba(242,201,76,0.6)] hover:-translate-y-0.5 w-full sm:w-auto ring-1 ring-black/5 dark:ring-white/10"
                        >
                          <span>Ver Documentos de Defensa</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* SÚPER PODERES DE GO - DISEÑO VISUAL */}
                  <div
                    className={`grid transition-all duration-500 ease-in-out ${descuentos?.aplicaDescuento ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                  >
                    <div className="overflow-hidden">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                        <h4 className="font-bold text-emerald-600 mb-2">
                          🎁 Ley 1383 (Descuento Activo)
                        </h4>
                        <p className="text-sm text-emerald-700/80 mb-3">
                          Estás a tiempo. Paga hoy mismo y ahorra dinero:
                        </p>
                        <div className="flex justify-between items-center bg-emerald-500/20 px-3 py-2 rounded-lg font-bold text-emerald-700">
                          <span>50% Descuento</span>
                          <span>{descuentos ? formatCurrency(descuentos.valorCon50Pct) : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`grid transition-all duration-500 ease-in-out ${!descuentos?.aplicaDescuento && proyecciones ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                  >
                    <div className="overflow-hidden">
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                        <h4 className="font-bold text-red-600 mb-2">
                          🔮 Riesgo Financiero (Deuda Futura)
                        </h4>
                        <p className="text-sm text-red-700/80 mb-3">
                          Si no resuelves esto, tu deuda seguirá sumando intereses de mora:
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-sm font-medium text-red-600 bg-red-500/10 px-3 py-1.5 rounded">
                            <span>En 3 meses:</span>
                            <span>{proyecciones ? formatCurrency(proyecciones.en3Meses) : ''}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-bold text-red-700 bg-red-500/20 px-3 py-1.5 rounded">
                            <span>En 1 año:</span>
                            <span>
                              {proyecciones ? formatCurrency(proyecciones.en12Meses) : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`grid transition-all duration-500 ease-in-out ${chartData.length > 1 ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                  >
                    <div className="overflow-hidden">
                      <div className="bg-foreground/5 p-4 rounded-xl border border-foreground/10">
                        <h4 className="font-bold mb-1 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-red-500" />
                          Efecto Bola de Nieve
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          Así creció tu deuda real (Capital + Intereses) año tras año.
                        </p>
                        <div className="h-32 w-full">
                          <ResponsiveContainer width="100%" height={128}>
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="colorDeuda" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="anio"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                              />
                              <RechartsTooltip
                                formatter={(value: unknown) => [
                                  formatCurrency(Number(value)),
                                  'Deuda Total',
                                ]}
                                labelFormatter={(label) => `Año ${label}`}
                                contentStyle={{
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  border: 'none',
                                  backgroundColor: '#1f2937',
                                  color: '#fff',
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="deudaTotal"
                                stroke="#ef4444"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorDeuda)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`grid transition-all duration-500 ease-in-out ${resultado ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className={`p-4 rounded-2xl border flex items-start gap-3 ${
                          resultado?.estado === 'CADUCIDAD ESTIMADA'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {resultado?.estado === 'CADUCIDAD ESTIMADA' ? (
                          <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
                        )}
                        <div>
                          <h4 className="font-bold text-sm">
                            {resultado?.estado === 'CADUCIDAD ESTIMADA'
                              ? 'Apta para Prescripción'
                              : 'Requiere Defensa Técnica'}
                          </h4>
                          {/* Estado legal enriquecido — visible solo cuando difiere del estado visual */}
                          {resultado?.estadoLegal &&
                            resultado.estadoLegal !== 'VIGENTE' &&
                            resultado.estadoLegal !== 'REQUIERE_REVISION' && (
                              <span className="inline-block mt-1 mb-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-foreground/10">
                                {resultado.estadoLegal === 'PRESCRITO' &&
                                  '⚖️ PRESCRITO (Art. 159 CNT)'}
                                {resultado.estadoLegal === 'CADUCADO' &&
                                  '⏱️ CADUCADO (Art. 161 CNT)'}
                                {resultado.estadoLegal === 'IMPUGNABLE_C038' &&
                                  '📷 IMPUGNABLE (C-038/2020)'}
                              </span>
                            )}
                          <p className="text-xs opacity-90 mt-1 leading-relaxed">
                            {resultado?.disclaimerLegal}
                          </p>
                          <div className="mt-2 inline-block px-2 py-1 rounded bg-foreground/10 text-[10px] font-bold uppercase tracking-wider">
                            Éxito Histórico:{' '}
                            {String(resultado?.probabilidadExito || '').split('%')[0]}%
                          </div>

                          {/* Semáforo de Probabilidad de Cobro Coactivo (Con Disclaimer Legal) */}
                          {riesgoEmbargo && (
                            <div className="mt-4 pt-3 border-t border-foreground/10">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help w-fit bg-white dark:bg-black/40 border px-3 py-2 rounded-lg shadow-sm">
                                      <AlertOctagon
                                        className={`w-4 h-4 ${riesgoEmbargo === 'Alto' ? 'text-red-500' : riesgoEmbargo === 'Medio' ? 'text-amber-500' : 'text-emerald-500'}`}
                                      />
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                        Probabilidad de Acción de Cobro:
                                        <span
                                          className={`ml-1 ${riesgoEmbargo === 'Alto' ? 'text-red-600 dark:text-red-400' : riesgoEmbargo === 'Medio' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                                        >
                                          {riesgoEmbargo.toUpperCase()}
                                        </span>
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs p-3">
                                    <p className="font-bold mb-1">Algoritmo Predictivo</p>
                                    <p>
                                      Cálculo referencial y educativo basado en los tiempos de
                                      caducidad (Ley 769 de 2002).{' '}
                                      <strong>
                                        Desmulta no es una autoridad ni ofrece asesoría legal.
                                      </strong>{' '}
                                      Solo el SIMIT o la Secretaría de Movilidad determinan y
                                      ejecutan medidas cautelares como el embargo.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
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
                    maxLength={60}
                    onChange={(e) => {
                      setLeadNombre(e.target.value);
                      setIsExpanded(true);
                    }}
                    className="w-full bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-inset focus:ring-primary focus:border-transparent outline-none transition-all"
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
                      className="flex-1 bg-foreground/5 dark:bg-black/50 border border-foreground/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-inset focus:ring-primary focus:border-transparent outline-none transition-all"
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

              <button
                onClick={() => setIsExpanded(false)}
                className="w-full mt-6 py-2 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all"
              >
                <ChevronUp className="w-5 h-5" />
                <span className="text-sm font-bold">Ocultar resultados</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 justify-center text-[10px] text-muted-foreground font-medium text-center pt-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-3 h-3 flex-shrink-0" />
              <span>
                Simulador SIMIT (Cálculo Aproximado): Interés Simple con Límite (Art 159).
              </span>
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
