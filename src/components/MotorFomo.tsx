'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';

// Bases de datos para permutar (Incluyendo ciudades intermedias)
const NOMBRES = [
  'Carlos',
  'María',
  'Jorge',
  'Ana',
  'Luis',
  'Diana',
  'Andrés',
  'Laura',
  'Diego',
  'Paola',
  'Fabián',
  'Camila',
  'Javier',
  'Valentina',
  'Héctor',
  'Natalia',
];
const CIUDADES = [
  'Medellín',
  'Bogotá',
  'Cali',
  'Barranquilla',
  'Bucaramanga',
  'Cartagena',
  'Cúcuta',
  'Pereira',
  'Santa Marta',
  'Ibagué',
  'Pasto',
  'Manizales',
  'Neiva',
  'Villavicencio',
  'Armenia',
  'Popayán',
  'Valledupar',
  'Sincelejo',
  'Tunja',
  'Riohacha',
  'Florencia',
  'Quibdó',
  'Montería',
  'Envigado',
  'Bello',
  'Soacha',
  'Palmira',
  'Tulúa',
  'Buga',
  'Cartago',
  'Girardot',
  'Facatativá',
  'Zipaquirá',
  'Fusagasugá',
  'Chía',
  'Sogamoso',
  'Duitama',
  'Pitalito',
  'Caucasia',
  'Apartadó',
];
const TIEMPOS = ['Hace 2 min', 'Hace 5 min', 'Hace justo ahora', 'Hace 12 min', 'Hace 8 min'];

interface FomoData {
  id: number;
  mensaje: string;
  tiempo: string;
}

export function MotorFomo() {
  const [notificacion, setNotificacion] = useState<FomoData | null>(null);
  const [contador, setContador] = useState(0);

  useEffect(() => {
    // Si ya mostramos 4 mensajes, apagamos el motor para no ser molestos
    if (contador >= 4) return;

    // Generar un tiempo aleatorio para el próximo popup (entre 45s y 90s)
    const tiempoAleatorio = Math.floor(Math.random() * (90000 - 45000 + 1) + 45000);

    const timer = setTimeout(() => {
      // 1. Generar datos únicos
      const nombre = NOMBRES[Math.floor(Math.random() * NOMBRES.length)];
      const ciudad = CIUDADES[Math.floor(Math.random() * CIUDADES.length)];
      const tiempo = TIEMPOS[Math.floor(Math.random() * TIEMPOS.length)];

      // Monto aleatorio entre $300.000 y $2.500.000, redondeado a miles
      const montoCrudo = Math.floor(Math.random() * (2500000 - 300000 + 1) + 300000);
      const montoFormateado = Math.floor(montoCrudo / 1000) * 1000;
      const montoString = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(montoFormateado);

      // Tres tipos de acciones para variar el texto
      const acciones = [
        `descubrió que su multa de ${montoString} está vencida.`,
        `inició el análisis para una fotomulta en ${ciudad}.`,
        `salvó ${montoString} por caducidad en el SIMIT.`,
      ];
      const accion = acciones[Math.floor(Math.random() * acciones.length)];

      setNotificacion({
        id: Date.now(),
        mensaje: `🚗 ${nombre} de ${ciudad} ${accion}`,
        tiempo: tiempo,
      });

      setContador((prev) => prev + 1);

      // Auto-ocultar después de 6 segundos
      setTimeout(() => setNotificacion(null), 6000);
    }, tiempoAleatorio);

    return () => clearTimeout(timer);
  }, [contador, notificacion]);

  return (
    <AnimatePresence>
      {notificacion && (
        <motion.div
          key={notificacion.id}
          initial={{ opacity: 0, y: 50, x: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-6 left-6 z-50 w-80 bg-card border border-border shadow-2xl shadow-black/50 rounded-2xl p-4 flex gap-3 items-start"
        >
          <div className="bg-green-500/10 p-2 rounded-full shrink-0 mt-1">
            <ShieldCheck className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground/90 leading-tight">
              <span className="font-bold text-foreground block mb-1">Nueva consulta en vivo</span>
              {notificacion.mensaje}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{notificacion.tiempo}</p>
          </div>
          <button
            onClick={() => setNotificacion(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
