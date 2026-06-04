'use client';
import { logger } from '@/lib/logger/security-logger';

import { useState } from 'react';
import { calcularViabilidadLegal } from '@/lib/calculadora-legal';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Loader2,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';

import { TarjetaPremium } from './ui/TarjetaPremium';

declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}

/**
 * CalculadoraPrescripcion — Herramienta interactiva de análisis de viabilidad legal.
 *
 * Recibe la fecha de infracción y el estado coactivo del usuario,
 * invoca el motor legal determinista y renderiza el dictamen con animaciones.
 * Un solo proveedor LazyMotion cubre todo el árbol (patrón correcto Framer Motion).
 */
export function CalculadoraPrescripcion({ cityContext }: { cityContext?: string } = {}) {
  const [fecha, setFecha] = useState('');
  const [coactivo, setCoactivo] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultado, setResultado] = useState<ReturnType<typeof calcularViabilidadLegal> | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados del Panel de Leads
  const [leadState, setLeadState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [leadNombre, setLeadNombre] = useState('');
  const [leadContacto, setLeadContacto] = useState('');
  const [leadHp, setLeadHp] = useState(''); // Honeypot

  const handleCalcular = () => {
    if (!fecha) return;

    // 1. Iniciamos el estado de tensión (Loading)
    setIsCalculating(true);
    setResultado(null); // Ocultamos resultados anteriores si los hay
    setErrorMsg(null);
    setLeadState('idle'); // Reiniciamos estado del lead
    setLeadNombre('');
    setLeadContacto('');

    // 2. Retraso psicológico de 2.5 segundos para aumentar percepción de valor/precisión
    setTimeout(() => {
      try {
        const res = calcularViabilidadLegal(fecha, coactivo);
        setResultado(res);

        // Telemetría de Viabilidad Real: Evento Google Analytics en semáforo verde/viable
        if (res.estado === 'PRESCRITA') {
          window.gtag?.('event', 'semaforo_viable', {
            ciudad: cityContext || 'desconocida',
            status: res.estado,
          });
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error inesperado en el motor.';
        setErrorMsg(msg);
      } finally {
        setIsCalculating(false);
      }
    }, 2500);
  };

  const openModal = () => {
    window.dispatchEvent(new CustomEvent('open-consultation-modal'));
  };

  // Función explícita para enviar el Lead
  const submitLead = async () => {
    if (!resultado || !fecha) return;

    const cleanPhone = leadContacto.replace(/\D/g, '');
    const colPrefixRegex = /^3(0[0-5]|1[0-9]|2[0-4]|5[01])[0-9]{7}$/;

    if (!colPrefixRegex.test(cleanPhone)) {
      setLeadState('error');
      return;
    }

    setLeadState('sending');

    try {
      const response = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: fecha,
          coactivo,
          status: resultado.estado,
          probability: resultado.probabilidadExito,
          contacto: cleanPhone,
          nombre: leadNombre.trim() || undefined,
          website_hp: leadHp,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el envío');
      }

      // UI reacciona inmediatamente al éxito psicológico
      setLeadState('success');

      // Auto-colapsar el panel tras 5 segundos de éxito
      setTimeout(() => {
        setLeadState('idle');
        setLeadContacto('');
        setLeadNombre('');
      }, 5000);
    } catch (error) {
      logger.error('Fallo en lead capture:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Error al procesar la solicitud');
      setLeadState('error');

      // Si es un error de rate limit o contenido, mantenemos el mensaje de error por 6 segundos
      setTimeout(() => {
        setErrorMsg(null);
      }, 6000);
    }
  };

  // Un único proveedor LazyMotion cubre todos los m.* y AnimatePresence del árbol
  return (
    <TarjetaPremium
      id="calculadora-prescripcion"
      className="w-full max-w-2xl mx-auto p-6 md:p-8 shadow-2xl transition-all rounded-3xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-card-foreground">Calculadora de Viabilidad</h2>
          <p className="text-muted-foreground text-sm">
            Verifica la vigencia y estado temporal de tu infracción
          </p>
        </div>
      </div>

      {/* Controles de la Calculadora */}
      <div className="space-y-5">
        <div>
          <label
            htmlFor="fecha-infraccion"
            className="block text-sm font-bold text-muted-foreground mb-2"
          >
            ¿En qué fecha ocurrió la infracción?
          </label>
          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50"
              aria-hidden="true"
            />
            <label htmlFor="fecha-infraccion" className="sr-only">
              Fecha de la infracción
            </label>
            <input
              id="fecha-infraccion"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={isCalculating}
              min="2000-01-01"
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-muted border border-input text-foreground rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
              aria-required="true"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 bg-muted/50 p-4 rounded-xl border border-border">
          <input
            type="checkbox"
            id="coactivo"
            checked={coactivo}
            onChange={(e) => setCoactivo(e.target.checked)}
            disabled={isCalculating}
            className="w-5 h-5 accent-primary rounded bg-muted border-input disabled:opacity-50"
          />
          <label
            htmlFor="coactivo"
            className="text-sm text-foreground/80 cursor-pointer select-none"
          >
            El SIMIT indica que tiene &quot;Cobro Coactivo&quot;
          </label>
        </div>

        {/* Botón Dinámico de Tensión */}
        <button
          onClick={handleCalcular}
          disabled={!fecha || isCalculating}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base sm:text-lg py-4 rounded-xl transition-all disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden relative"
        >
          {isCalculating ? (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 min-w-0"
            >
              <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
              <span className="truncate">Calculando viabilidad...</span>
            </m.div>
          ) : (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 min-w-0"
            >
              <Database className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Calcular Viabilidad Legal</span>
            </m.div>
          )}
        </button>
      </div>

      {/* Notificación de Error (fecha fuera de rango, etc.) */}
      <AnimatePresence>
        {errorMsg && !isCalculating && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-2xl text-sm font-bold mb-4"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {errorMsg}
          </m.div>
        )}
      </AnimatePresence>

      {/* Resultados Dinámicos con Framer Motion */}
      <AnimatePresence>
        {resultado && !isCalculating && (
          <m.div
            initial={{ opacity: 0, height: 0, y: 20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-8 pt-8 border-t border-border overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted rounded-2xl p-4 border border-border">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">
                  Tiempo Exacto
                </p>
                <p className="text-xl font-black text-foreground">
                  {resultado.tiempoTranscurrido.anos}{' '}
                  <span className="text-sm font-normal text-muted-foreground">años</span>,{' '}
                  {resultado.tiempoTranscurrido.meses}{' '}
                  <span className="text-sm font-normal text-muted-foreground">meses</span>
                </p>
              </div>
              <div className="bg-muted rounded-2xl p-4 border border-border">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">
                  Probabilidad
                </p>
                <p
                  className={`text-xl font-black ${resultado.estado === 'PRESCRITA' ? 'text-green-500' : resultado.estado === 'ALERTA' ? 'text-primary' : 'text-destructive'}`}
                >
                  {resultado.probabilidadExito.split(' - ')[0]}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground font-medium">Progreso de Saneamiento</span>
                <span className="text-primary font-bold">{resultado.porcentajeCaducidad}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border">
                <m.div
                  initial={{ width: 0 }}
                  animate={{ width: `${resultado.porcentajeCaducidad}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                  className="bg-primary h-3 rounded-full"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0 text-muted-foreground/70 mt-0.5" />
              <p>{resultado.disclaimerLegal}</p>
            </div>

            {/* Anzuelo para abrir el Modal de consulta */}
            <m.button
              onClick={openModal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-6 w-full group bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-border hover:border-primary/50 shadow-lg"
            >
              <ShieldCheck className="w-5 h-5 text-primary" />
              Iniciar Defensa Legal Ahora
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </m.button>

            {/* PANEL DE CAPTACIÓN DE LEADS (Aparece post-resultado) */}
            <AnimatePresence mode="wait">
              {leadState !== 'success' && (
                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="mt-6 p-5 rounded-2xl bg-card border border-border/50 shadow-inner"
                >
                  <div className="mb-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                        📲
                      </span>
                      ¿Quieres que un experto revise tu caso?
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 ml-8">
                      Déjanos tu número y te contactaremos por WhatsApp sin costo.
                    </p>
                  </div>

                  <div className="space-y-3 ml-8">
                    {/* Honeypot Oculto para Bots */}
                    <input
                      type="text"
                      name="website_hp"
                      value={leadHp}
                      onChange={(e) => setLeadHp(e.target.value)}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="opacity-0 absolute -z-10 h-0 w-0"
                      autoComplete="off"
                    />

                    <input
                      type="text"
                      placeholder="Tu nombre (Opcional)"
                      value={leadNombre}
                      onChange={(e) => setLeadNombre(e.target.value)}
                      disabled={leadState === 'sending'}
                      className="w-full text-sm bg-muted border border-input text-foreground rounded-lg py-2.5 px-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
                    />

                    <div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="Celular (10 dígitos)"
                        value={leadContacto}
                        onChange={(e) => setLeadContacto(e.target.value.replace(/\D/g, ''))}
                        disabled={leadState === 'sending'}
                        className={`w-full text-sm bg-muted border text-foreground rounded-lg py-2.5 px-3 focus:outline-none transition-all disabled:opacity-50 ${
                          leadState === 'error' && leadContacto.length !== 10
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-input focus:border-primary focus:ring-1 focus:ring-primary'
                        }`}
                      />
                      {leadState === 'error' &&
                        !/^3(0[0-5]|1[0-9]|2[0-4]|5[01])[0-9]{7}$/.test(
                          leadContacto.replace(/\D/g, '')
                        ) && (
                          <p className="text-red-500 text-[10px] mt-1 font-bold">
                            {leadContacto.length === 10
                              ? 'Prefijo no válido en Colombia.'
                              : 'Ingresa un número de 10 dígitos.'}
                          </p>
                        )}
                    </div>

                    {leadState === 'error' && errorMsg && (
                      <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-xs font-bold mt-1">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      onClick={submitLead}
                      disabled={leadState === 'sending' || leadContacto.length < 10}
                      className="w-full bg-foreground hover:bg-foreground/90 text-background font-bold text-sm py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {leadState === 'sending' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Solicitar Revisión Gratuita'
                      )}
                    </button>
                  </div>
                </m.div>
              )}

              {leadState === 'success' && (
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-600 dark:text-green-400"
                >
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold">¡Solicitud enviada!</p>
                    <p className="text-xs opacity-90">Un asesor te contactará pronto.</p>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        )}
      </AnimatePresence>
    </TarjetaPremium>
  );
}
