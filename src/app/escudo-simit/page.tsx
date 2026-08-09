'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { m, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then((mod) => mod.Turnstile), {
  ssr: false,
});
import {
  ShieldCheck,
  ArrowLeft,
  BellRing,
  Lock,
  Activity,
  SearchCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  CreditCard,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// ── Interfaces de datos del Scraper ────────────────────────────────────

interface MultaDetalle {
  id: string;
  tipo: string;
  secretaria: string;
  codigo: string;
  estado: string;
  valor: number;
  interes: number;
  valorPagar: number;
  esFotodeteccion: boolean;
  placa: string;
  fechaCoactivo: string;
  fechaResolucion: string;
}

interface SimitResumen {
  totalMultas: number;
  totalComparendos: number;
  totalAcuerdos: number;
  valorTotal: number;
  nombre: string;
}

interface SimitData {
  resumen: SimitResumen;
  multas: MultaDetalle[];
  textoBruto: string;
}

// ── Utilidades ─────────────────────────────────────────────────────────

const formatCOP = (valor: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor);

// ── Componente Principal ───────────────────────────────────────────────

export default function EscudoSimitPage() {
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [isActivated, setIsActivated] = useState(false);
  const [resultData, setResultData] = useState<SimitData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileRefreshCount, setTurnstileRefreshCount] = useState(0);
  const turnstileRef = useRef<string | null>(null);
  const { toast } = useToast();

  const loadingPhases = [
    'Iniciando conexión segura con SIMIT...',
    'Evadiendo cortafuegos gubernamentales...',
    'Extrayendo resoluciones y comparendos...',
    'Procesando cobros coactivos e intereses...',
    'Encriptando datos y blindando cédula...',
    'Generando reporte final...',
  ];

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActivating) {
      setLoadingPhase(0);
      let currentPhase = 0;
      interval = setInterval(() => {
        currentPhase++;
        // Se queda en la última fase hasta que termine
        if (currentPhase < loadingPhases.length) {
          setLoadingPhase(currentPhase);
        }
      }, 3500); // 3.5 segundos por fase
    }
    return () => clearInterval(interval);
  }, [isActivating]);

  const handleActivate = useCallback(async () => {
    setError(null);

    if (!cedula || !/^\d{5,12}$/.test(cedula)) {
      setError('Ingresa un número de cédula válido (5 a 12 dígitos).');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (!turnstileRef.current) {
      setError('Completa la verificación anti-bot.');
      return;
    }

    setIsActivating(true);

    try {
      const response = await fetch('/api/escudo-simit/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cedula,
          email,
          turnstileToken: turnstileRef.current,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al activar el Escudo SIMIT.');
      }

      setResultData(data.data);
      setIsActivated(true);
      toast({
        title: '🛡️ Escudo SIMIT Activado',
        description: `Se detectaron ${data.data.resumen.totalMultas} multa(s). Revisa tu correo ${email}.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      // Forzar reseteo del widget de Turnstile porque los tokens son de un solo uso
      setTurnstileRefreshCount((c) => c + 1);
      turnstileRef.current = null;
      
      toast({
        title: '❌ Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsActivating(false);
    }
  }, [cedula, email, toast]);

  return (
    <LazyMotion features={domAnimation}>

      <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30 text-foreground">
        {/* Fondos glassmorphism */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,191,0,0.08)_0%,transparent_50%)] pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.03)_0%,transparent_50%)] pointer-events-none" />

        {/* Header */}
        <header className="fixed top-0 w-full z-50 p-6">
          <div className="max-w-4xl mx-auto glass rounded-3xl px-8 h-16 flex items-center justify-between shadow-2xl border-white/10">
            <Link
              href="/servicios"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group active:scale-95"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold text-sm">Volver a Servicios</span>
            </Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} />
              <span className="font-black tracking-tighter text-lg uppercase">
                Escudo SIMIT
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 pt-36 pb-24 relative z-10">
          {/* Hero */}
          <div className="text-center mb-20">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Fase Beta Gratuita
              </div>
              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[0.95]">
                Paz Mental <br />
                <span className="text-primary italic underline decoration-primary/20 underline-offset-8">
                  Automatizada
                </span>
              </h1>
              <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
                ¿Miedo a multas fantasma? Nuestro sistema inteligente vigila tu cédula 24/7
                y te notifica al instante si el Estado intenta sorprenderte con una fotomulta o comparendo.
              </p>
            </m.div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            <m.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="glass p-10 rounded-[3rem] border border-white/10 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <SearchCheck size={120} className="text-primary" />
              </div>
              <BellRing className="text-primary mb-6" size={40} />
              <h3 className="text-2xl font-black mb-4">Alertas Tempranas</h3>
              <p className="text-muted-foreground leading-relaxed">
                El 70% de las prescripciones se pierden porque el conductor no se entera a tiempo
                del mandamiento de pago. Nosotros detectamos el movimiento en el primer segundo.
              </p>
            </m.div>

            <m.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="glass p-10 rounded-[3rem] border border-white/10 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Lock size={120} className="text-primary" />
              </div>
              <Activity className="text-primary mb-6" size={40} />
              <h3 className="text-2xl font-black mb-4">Máxima Privacidad</h3>
              <p className="text-muted-foreground leading-relaxed">
                Nuestras consultas a las bases de datos gubernamentales son 100% seguras y anónimas. 
                No guardamos tu información personal (Zero-PII) ni compartimos tus datos con terceros.
              </p>
            </m.div>
          </div>

          {/* Formulario / Resultados */}
          <AnimatePresence mode="wait">
            {!isActivated ? (
              <m.div
                key="form"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-card/40 backdrop-blur-xl border border-white/10 p-10 md:p-14 rounded-[3.5rem] shadow-2xl shadow-primary/5 relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-primary/10 blur-[100px] pointer-events-none" />

                  <h2 className="text-3xl font-black mb-2 relative z-10">
                    Activa tu Escudo SIMIT
                  </h2>
                  <p className="text-muted-foreground mb-10 relative z-10">
                    Ingresa tu cédula y correo para recibir tu estado de cuenta actual. 
                    <br/><br/>
                    <strong className="text-primary">Nota:</strong> Te enviaremos reportes periódicos semanales de forma automática. Te recomendamos revisar tu bandeja principal y la carpeta de <strong>Spam / Correo No Deseado</strong> para no perderte nuestras alertas tempranas.
                  </p>

                  <div className="space-y-5 relative z-10">
                    {/* Cédula */}
                    <div>
                      <label htmlFor="escudo-cedula" className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                        <CreditCard size={14} className="inline mr-1" />
                        Número de Cédula
                      </label>
                      <input
                        id="escudo-cedula"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Ej: 1093778172"
                        value={cedula}
                        onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                        maxLength={12}
                        className="w-full h-14 px-6 rounded-2xl bg-background/50 border border-white/10 text-foreground font-bold text-lg placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="escudo-email" className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                        <Mail size={14} className="inline mr-1" />
                        Correo Electrónico
                      </label>
                      <input
                        id="escudo-email"
                        type="email"
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-14 px-6 rounded-2xl bg-background/50 border border-white/10 text-foreground font-bold text-lg placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      />
                    </div>

                    {/* Turnstile */}
                    <div className="flex justify-center py-2">
                      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                        <Turnstile
                          key={`ts-${turnstileRefreshCount}`}
                          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                          onSuccess={(token) => {
                            turnstileRef.current = token;
                          }}
                          options={{
                            theme: 'dark',
                            size: 'normal',
                          }}
                        />
                      ) : (
                        <p className="text-red-500 text-xs">Falta SITE_KEY de Turnstile</p>
                      )}
                    </div>

                    {/* Error */}
                    {error && (
                      <m.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium"
                      >
                        <AlertTriangle size={16} />
                        {error}
                      </m.div>
                    )}

                    {/* Botón o Terminal de Carga */}
                    {isActivating ? (
                      <m.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full p-6 rounded-2xl bg-black/60 border border-primary/30 flex flex-col gap-3 font-mono text-sm shadow-inner shadow-primary/10"
                      >
                        {loadingPhases.map((phase, i) => (
                           <div 
                             key={i} 
                             className={`flex items-center gap-3 transition-all duration-500 ${
                               i > loadingPhase ? 'opacity-20 scale-95' 
                               : i === loadingPhase ? 'text-primary scale-100 font-bold' 
                               : 'text-muted-foreground scale-100'
                             }`}
                           >
                              {i < loadingPhase ? (
                                <CheckCircle2 size={16} className="text-green-500" />
                              ) : i === loadingPhase ? (
                                <Loader2 size={16} className="animate-spin text-primary" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-current opacity-30" />
                              )}
                              <span>{phase}</span>
                           </div>
                        ))}
                      </m.div>
                    ) : (
                      <Button
                        size="lg"
                        onClick={handleActivate}
                        disabled={isActivating}
                        className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
                      >
                        Activar Monitoreo Gratuito
                      </Button>
                    )}

                    <p className="text-xs text-muted-foreground/60 font-medium text-center">
                      Al activar, aceptas nuestros términos de servicio y política de privacidad
                      Zero-PII.
                    </p>
                  </div>
                </div>
              </m.div>
            ) : (
              /* ── Resultados ─────────────────────────────────────────── */
              <m.div
                key="results"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                {/* Encabezado de éxito */}
                <div className="text-center">
                  <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary mb-6"
                  >
                    <CheckCircle2 size={40} className="text-primary" />
                  </m.div>
                  <h2 className="text-3xl font-black mb-2">¡Escudo SIMIT Activado!</h2>
                  <p className="text-muted-foreground">
                    Tu cédula <strong className="text-primary">{cedula}</strong> está ahora bajo
                    monitoreo continuo. Te hemos enviado un resumen a{' '}
                    <strong className="text-foreground">{email}</strong>.
                  </p>
                </div>

                {resultData && (
                  <>
                    {/* Resumen */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="glass p-6 rounded-3xl border border-white/10 text-center">
                        <div className="text-3xl font-black text-primary">
                          {resultData.resumen.totalMultas}
                        </div>
                        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-1">
                          Multas
                        </div>
                      </div>
                      <div className="glass p-6 rounded-3xl border border-white/10 text-center">
                        <div className="text-3xl font-black text-primary">
                          {resultData.resumen.totalComparendos}
                        </div>
                        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-1">
                          Comparendos
                        </div>
                      </div>
                      <div className="glass p-6 rounded-3xl border border-white/10 text-center">
                        <div className="text-3xl font-black text-primary">
                          {resultData.resumen.totalAcuerdos}
                        </div>
                        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-1">
                          Acuerdos
                        </div>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="glass p-8 rounded-3xl border border-primary/20 bg-primary/5 text-center">
                      <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                        Total registrado en SIMIT
                      </div>
                      <div className="text-4xl md:text-5xl font-black text-foreground">
                        {formatCOP(resultData.resumen.valorTotal)}
                      </div>
                    </div>

                    {/* Tabla de multas */}
                    {resultData.multas.length > 0 && (
                      <div className="glass rounded-3xl border border-white/10 overflow-hidden">
                        <div className="p-6 border-b border-white/5">
                          <h3 className="text-lg font-black">Detalle de Multas</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-primary/20">
                                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  ID
                                </th>
                                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  Código
                                </th>
                                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  Placa
                                </th>
                                <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  Estado
                                </th>
                                <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  Valor
                                </th>
                                <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  Interés
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {resultData.multas.map((multa, idx) => (
                                <m.tr
                                  key={multa.id + idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                                >
                                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                                    {multa.id.substring(0, 15)}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold">
                                    <span className="inline-flex items-center gap-1">
                                      {multa.codigo || '—'}
                                      {multa.esFotodeteccion && (
                                        <Camera size={14} className="text-yellow-500" />
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                                    {multa.placa || '—'}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        multa.estado === 'Cobro coactivo'
                                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                      }`}
                                    >
                                      {multa.estado}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold text-right">
                                    {formatCOP(multa.valor)}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-red-400 font-medium text-right">
                                    {multa.interes > 0 ? `+${formatCOP(multa.interes)}` : '—'}
                                  </td>
                                </m.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* CTA de consultoría */}
                    <div className="glass p-8 rounded-3xl border border-white/10 text-center">
                      <p className="text-muted-foreground mb-6">
                        ¿Quieres impugnar alguna de estas multas? Nuestro equipo legal puede
                        analizar tu caso gratuitamente.
                      </p>
                      <Button asChild size="lg" className="rounded-2xl font-black">
                        <Link href="/?action=consultar">Solicitar Análisis Gratuito</Link>
                      </Button>
                    </div>
                  </>
                )}
              </m.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="py-20 text-center opacity-40">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">
            Desmulta Colombia • Saneamiento Vial Premium
          </p>
        </footer>
      </div>
    </LazyMotion>
  );
}
