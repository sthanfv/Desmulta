'use client';

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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { TarjetaPremium } from './ui/TarjetaPremium';

export function CalculadoraPrescripcion() {
  const [fecha, setFecha] = useState('');
  const [coactivo, setCoactivo] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultado, setResultado] = useState<ReturnType<typeof calcularViabilidadLegal> | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCalcular = () => {
    if (!fecha) return;

    // 1. Iniciamos el estado de tensión (Loading)
    setIsCalculating(true);
    setResultado(null); // Ocultamos resultados anteriores si los hay
    setErrorMsg(null);

    // 2. Retraso psicológico de 2.5 segundos para aumentar percepción de valor/precisión
    setTimeout(() => {
      try {
        const res = calcularViabilidadLegal(fecha, coactivo);
        setResultado(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error inesperado en el motor.';
        setErrorMsg(msg);
      } finally {
        setIsCalculating(false); // Apagamos el motor
      }
    }, 2500);
  };

  const openModal = () => {
    window.dispatchEvent(new CustomEvent('open-consultation-modal'));
  };

  return (
    <TarjetaPremium className="w-full max-w-2xl mx-auto p-6 md:p-8 shadow-2xl transition-all rounded-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-card-foreground">Motor de Prescripción</h2>
          <p className="text-muted-foreground text-sm">Auditoría de tiempos legales y caducidad</p>
        </div>
      </div>

      {/* Controles de la Calculadora */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-2">
            ¿En qué fecha ocurrió la infracción?
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={isCalculating}
              min="2000-01-01"
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-muted border border-input text-foreground rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
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
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg py-4 rounded-xl transition-all disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden relative"
        >
          {isCalculating ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Calculando viabilidad...</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <Database className="w-5 h-5" />
              <span>Calcular Viabilidad Legal</span>
            </motion.div>
          )}
        </button>
      </div>

      {/* Notificación de Error (fecha fuera de rango, etc.) */}
      <AnimatePresence>
        {errorMsg && !isCalculating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-2xl text-sm font-bold mb-4"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultados Dinámicos con Framer Motion */}
      <AnimatePresence>
        {resultado && !isCalculating && (
          <motion.div
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
                <span className="text-muted-foreground font-medium">Progreso hacia caducidad</span>
                <span className="text-primary font-bold">{resultado.porcentajeCaducidad}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border">
                <motion.div
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

            {/* El Anzuelo para abrir tu Modal real */}
            <motion.button
              onClick={openModal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-6 w-full group bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-border hover:border-primary/50 shadow-lg"
            >
              <ShieldCheck className="w-5 h-5 text-primary" />
              Iniciar Defensa Legal Ahora
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </TarjetaPremium>
  );
}
