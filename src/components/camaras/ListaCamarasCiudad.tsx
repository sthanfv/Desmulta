'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Radar,
  Calendar,
  AlertTriangle,
  Search,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import camarasData from '@/lib/data/camaras-ansv.json';

interface Props {
  ciudadSlug: string;
  ciudadNombre: string;
}

export default function ListaCamarasCiudad({ ciudadNombre, ciudadSlug }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  const normalizeCityName = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\bd\.?c\.?\b/g, '') // Quita D.C o D.C.
      .trim();
  };

  // Filtrar cámaras de la ciudad una sola vez
  const camarasCiudad = React.useMemo(() => {
    return camarasData.filter(
      (camara) =>
        normalizeCityName(camara.municipio) === normalizeCityName(ciudadNombre)
    );
  }, [ciudadNombre]);

  // Simular escaneo de radar al cargar
  useEffect(() => {
    if (camarasCiudad.length === 0) {
      setIsScanning(false);
      return;
    }
    const timer = setTimeout(() => setIsScanning(false), 1200);
    return () => clearTimeout(timer);
  }, [camarasCiudad]);

  // Normalizar strings para buscador
  const normalizeString = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const camarasFiltradas = camarasCiudad.filter((camara) => {
    if (!searchTerm) return true;
    const searchNormalized = normalizeString(searchTerm);
    return (
      normalizeString(camara.direccion).includes(searchNormalized) ||
      normalizeString(camara.tecnologia).includes(searchNormalized)
    );
  });

  // Helper de Colores Psicológicos para Infracciones
  const getSeverityColor = (codigo: string) => {
    if (codigo.startsWith('D'))
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white';
    if (codigo.startsWith('C'))
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500 hover:text-black';
    return 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 border-slate-200 dark:border-white/5 hover:bg-brand-500 hover:text-black';
  };

  // --- ESTADO VACÍO (0 Cámaras en la ciudad) ---
  if (camarasCiudad.length === 0 && !isScanning) {
    return (
      <section className="py-12 px-4 sm:px-6 md:px-12 bg-background" id="camaras-autorizadas">
        {/* ... código del estado vacío ... */}
        <div className="max-w-4xl mx-auto text-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 shadow-sm">
          <div className="inline-flex items-center justify-center p-4 bg-green-500/10 rounded-full mb-6">
            <ShieldCheck className="text-green-500" size={40} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
            No hay cámaras autorizadas en {ciudadNombre}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base mb-8">
            Según el directorio oficial de la Agencia Nacional de Seguridad Vial (ANSV), actualmente{' '}
            <strong>no existen</strong> radares de fotodetección con permisos de operación vigentes
            en este municipio.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 sm:p-8 text-left max-w-2xl mx-auto shadow-sm">
            <div className="flex items-start gap-4">
              <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={28} />
              <div className="w-full">
                <h3 className="font-bold text-amber-700 dark:text-amber-500 mb-2 text-lg">
                  ¿Recibiste una fotomulta en este municipio?
                </h3>
                <p className="text-amber-700/80 dark:text-amber-500/80 text-sm sm:text-base leading-relaxed mb-6">
                  Cualquier comparendo electrónico emitido en <strong>{ciudadNombre}</strong> es
                  completamente ilegal por no contar con el aval técnico de la ANSV ni del
                  Ministerio de Transporte. Tienes todas las garantías legales para tumbar esta
                  multa mediante impugnación.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/#escaner"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Consultar Multa Gratis <ArrowRight size={18} />
                  </Link>
                  <Link
                    href={`/multas/${ciudadSlug}`}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-amber-700 dark:text-amber-400 font-bold text-sm rounded-xl transition-all"
                  >
                    Ver servicios legales
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // --- LISTA PRINCIPAL DE CÁMARAS CON OVERLAY DE CARGA (Para SEO) ---
  return (
    <section
      className="py-6 sm:py-8 px-4 sm:px-6 md:px-12 bg-background relative min-h-[500px]"
      id="camaras-autorizadas"
    >
      {/* OVERLAY DE ESCANEO (Desaparece al cargar, pero el HTML inferior ya existe para Google) */}
      <AnimatePresence>
        {isScanning && (
          <m.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-start pt-20 text-center"
          >
            {/* Radar Premium Nivel Militar */}
            <div className="relative w-56 h-56 md:w-64 md:h-64 mb-10 rounded-full bg-[#050505] border-[8px] border-slate-800 overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)] flex items-center justify-center">
              {/* Anillos de distancia (Grid) */}
              <div className="absolute inset-0 rounded-full border border-brand-500/30 m-6"></div>
              <div className="absolute inset-0 rounded-full border border-brand-500/40 m-12 border-dashed"></div>
              <div className="absolute inset-0 rounded-full border border-brand-500/20 m-18"></div>
              <div className="absolute inset-0 rounded-full border border-brand-500/10 m-24"></div>

              {/* Ejes Centrales Cruzados */}
              <div className="absolute w-full h-[1px] bg-brand-500/40"></div>
              <div className="absolute h-full w-[1px] bg-brand-500/40"></div>
              <div className="absolute w-full h-[1px] bg-brand-500/20 rotate-45"></div>
              <div className="absolute w-full h-[1px] bg-brand-500/20 -rotate-45"></div>

              {/* El Barrido (Sweep) */}
              <div
                className="absolute inset-0 rounded-full opacity-90 animate-[spin_2s_linear_infinite]"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 50%, rgba(245,158,11,0.2) 85%, rgba(245,158,11,1) 100%)',
                }}
              ></div>

              {/* --- OBJETIVOS DETECTADOS (Blips) --- */}
              {/* Objetivo 1: Cuadrante superior derecho */}
              <div className="absolute top-12 right-16 flex items-center justify-center">
                <div
                  className="absolute w-4 h-4 bg-brand-500 rounded-full animate-ping opacity-75"
                  style={{ animationDuration: '2s' }}
                ></div>
                <div className="relative w-2.5 h-2.5 bg-brand-400 rounded-full shadow-[0_0_10px_#f59e0b]"></div>
              </div>

              {/* Objetivo 2: Cuadrante inferior izquierdo (Alerta Roja) */}
              <div className="absolute bottom-16 left-16 flex items-center justify-center">
                <div
                  className="absolute w-5 h-5 bg-red-500 rounded-full animate-ping opacity-60"
                  style={{ animationDuration: '2s', animationDelay: '0.8s' }}
                ></div>
                <div className="relative w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_#ef4444]"></div>
                <span className="absolute left-6 text-[10px] text-red-500 font-mono font-bold">
                  RADAR
                </span>
              </div>

              {/* Objetivo 3: Cuadrante superior izquierdo */}
              <div className="absolute top-24 left-10 flex items-center justify-center">
                <div
                  className="absolute w-3 h-3 bg-brand-500 rounded-full animate-ping opacity-80"
                  style={{ animationDuration: '2s', animationDelay: '1.5s' }}
                ></div>
                <div className="relative w-2 h-2 bg-brand-300 rounded-full shadow-[0_0_8px_#f59e0b]"></div>
              </div>

              {/* Objetivo 4: Centro Emisor de Señal */}
              <div className="absolute flex items-center justify-center">
                <div
                  className="absolute w-12 h-12 border border-brand-500/40 rounded-full animate-ping"
                  style={{ animationDuration: '2s' }}
                ></div>
                <div className="relative w-4 h-4 bg-brand-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,1)] animate-pulse"></div>
              </div>
            </div>

            <h3 className="text-3xl md:text-4xl font-black text-foreground mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-500 to-amber-700 dark:from-brand-400 dark:to-brand-600 animate-pulse tracking-tight">
              Escaneando red de la ANSV...
            </h3>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full">
              <Activity size={16} className="text-brand-500 animate-pulse" />
              <p className="text-sm md:text-base text-muted-foreground font-semibold">
                Localizando {camarasCiudad.length} radares activos en{' '}
                <span className="text-foreground">{ciudadNombre}</span>
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <div
        className={`max-w-6xl mx-auto transition-opacity duration-500 ${isScanning ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}
      >
        {/* Buscador de Cámaras */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 sm:pl-6 flex items-center pointer-events-none">
              <Search
                className="text-muted-foreground group-focus-within:text-brand-500 transition-colors"
                size={20}
              />
            </div>
            <input
              type="text"
              placeholder="Ej: Avenida 7, Calle 10, El Salado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 sm:pl-16 pr-4 sm:pr-6 py-4 sm:py-5 bg-slate-50 dark:bg-black/60 border-2 border-slate-200 dark:border-white/10 rounded-full text-sm sm:text-base text-foreground focus:outline-none focus:border-brand-500 dark:focus:border-brand-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Cuadrícula de Cámaras con Scroll y Animaciones */}
        <div className="max-h-[75vh] overflow-y-auto pr-2 pb-32">
          <m.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {camarasFiltradas.length > 0 ? (
                camarasFiltradas.map((camara, index) => {
                  const isGPS = camara.direccion.startsWith('Punto GPS:');
                  const cleanAddress = isGPS
                    ? camara.direccion.replace('Punto GPS:', '').trim()
                    : camara.direccion;

                  let mapsQuery = encodeURIComponent(
                    `${cleanAddress}, ${camara.municipio}, Colombia`
                  );
                  if (isGPS) {
                    mapsQuery = encodeURIComponent(cleanAddress);
                  }
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

                  return (
                    <m.div
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      key={`${camara.id}-${index}`}
                      className="bg-gradient-to-br from-white to-slate-50 dark:from-[#0f0f0f] dark:to-[#050505] border border-slate-200 dark:border-white/10 rounded-3xl p-5 sm:p-7 hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/10 dark:hover:shadow-brand-500/5 transition-all duration-300 group shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none flex flex-col h-full relative overflow-hidden"
                    >
                      {/* Estado: Activa Pulsante */}
                      <div className="absolute top-5 sm:top-6 right-5 sm:right-6 flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full z-10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
                          Activa
                        </span>
                      </div>

                      <div className="flex items-start gap-3 sm:gap-4 mb-6 pr-24">
                        <div className="p-3 bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 rounded-2xl shrink-0 group-hover:bg-brand-500/20 transition-colors">
                          <MapPin className="text-brand-600 dark:text-brand-500" size={24} />
                        </div>
                        <div>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg sm:text-xl font-bold text-foreground mb-1 flex flex-wrap items-center gap-2 hover:text-brand-500 transition-colors group/link"
                            title="Ver en Google Maps"
                          >
                            {isGPS ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-brand-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <Activity size={12} /> Coordenada Satelital
                                </span>
                                <span className="font-mono text-base">{cleanAddress}</span>
                              </div>
                            ) : (
                              <span className="line-clamp-2">{cleanAddress}</span>
                            )}
                            <ExternalLink
                              size={16}
                              className="text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0"
                            />
                          </a>
                          <p className="text-sm text-muted-foreground font-medium mt-1">
                            Sentido: {camara.sentido}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6 bg-white dark:bg-[#0a0a0a] rounded-2xl p-4 border border-slate-100 dark:border-white/5 shadow-sm">
                        <div>
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Radar size={14} />
                            <span className="text-xs uppercase font-bold tracking-wider">
                              Tecnología
                            </span>
                          </div>
                          <p
                            className="text-sm font-semibold text-foreground line-clamp-1"
                            title={camara.tecnologia}
                          >
                            {camara.tecnologia}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Calendar size={14} />
                            <span className="text-xs uppercase font-bold tracking-wider">
                              Autorización
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            Año:{' '}
                            {camara.fechaAutorizacion.split('/').pop() || camara.fechaAutorizacion}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wide">
                            Detecta:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {camara.infracciones.length > 0 ? (
                            camara.infracciones.map((codigo) => (
                              <Link
                                key={`${camara.id}-${codigo}-${index}`}
                                href={`/multas/codigo/${codigo.toLowerCase()}`}
                                className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-black rounded-xl transition-all border shadow-sm ${getSeverityColor(codigo)}`}
                              >
                                {codigo}
                              </Link>
                            ))
                          ) : (
                            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-white/50 italic px-1">
                              Infracciones no especificadas en el reporte oficial de la ANSV.
                            </span>
                          )}
                        </div>
                      </div>
                    </m.div>
                  );
                })
              ) : (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-16 text-center bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10"
                >
                  <Search className="mx-auto text-muted-foreground mb-4 opacity-50" size={48} />
                  <p className="text-lg text-foreground font-bold">
                    No se encontraron cámaras con esa descripción.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Intenta buscar por otra avenida o tipo de radar.
                  </p>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        </div>
      </div>

      {/* Sticky Stats Bar Flotante */}
      <m.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, type: 'spring' }}
        className="fixed bottom-6 left-0 right-0 z-40 mx-4 sm:mx-auto max-w-sm pointer-events-none"
      >
        <div className="bg-slate-900 dark:bg-black/80 backdrop-blur-md border border-slate-700 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-full p-2 pl-6 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </div>
            <p className="text-white font-bold text-sm tracking-wide">
              <span className="text-brand-500 text-base">{camarasFiltradas.length}</span> Radares
              detectados
            </p>
          </div>
          <Link
            href="/#escaner"
            className="ml-4 bg-amber-500 hover:bg-amber-400 text-black px-6 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center gap-2 group"
          >
            Auditar{' '}
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </m.div>
    </section>
  );
}
