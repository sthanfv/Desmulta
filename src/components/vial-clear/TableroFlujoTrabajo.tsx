'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  AlertCircle,
  FileArchive,
  Info,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ModalDetalleExpediente } from './ModalDetalleExpediente';
import { TarjetaKanban } from './TarjetaKanban';
import { ModalNotaOperador } from './ModalNotaOperador';
import { ModalAyudaOperador } from './ModalAyudaOperador';
import { ModalAuthPin } from './ModalAuthPin';

import type { PlantillasDisponibles } from '@/lib/legal/legal-types';
import { Badge } from '@/components/ui/badge';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface KanbanItem {
  id: string;
  placa: string;
  ciudad: string;
  estado: string;
  ahorro?: string;
  createdAt?: string;
  evidenceUrl?: string;
  nombre?: string;
  cedula?: string;
  contacto?: string;
  email?: string;
  tipo: 'lead' | 'caso';
  esRecurrente?: boolean;
  conteoRetornos?: number;
  // Metadatos para el Motor Jurídico Dinámico
  antiguedad?: string;
  estadoCoactivo?: string;
  tipoInfraccion?: string;
  shortId?: string;
  trackingUuid?: string;
  ticketNumber?: string;
  plantillasDisponibles?: PlantillasDisponibles;
  _lastPushAttempt?: {
    status: string;
    reason?: string;
    at: string;
  };
}

import { COLUMNAS_UNIFICADAS, COLUMNAS_LEADS } from '@/lib/constants/kanban-columns';
import { useKanban } from '@/hooks/useKanban';
import { useAuth } from '@/firebase';
import { SecurityLogger } from '@/lib/logger/security-logger';
import { logExportAction } from '@/app/admin/audit-actions';

export const TableroFlujoTrabajo = React.memo(function TableroFlujoTrabajo({
  leadsReales,
  casosReales,
  loadMoreLeads,
  loadMoreCases,
  hasMoreLeads,
  hasMoreCases,
  _isLoadingMore,
  refreshKanban,
  realtimeNewLeadsCount,
}: {
  leadsReales: KanbanItem[];
  casosReales: KanbanItem[];
  loadMoreLeads?: () => Promise<void>;
  loadMoreCases?: () => Promise<void>;
  hasMoreLeads?: boolean;
  hasMoreCases?: boolean;
  _isLoadingMore?: boolean;
  refreshKanban?: () => Promise<void>;
  realtimeNewLeadsCount?: number;
}) {
  const { toast } = useToast();
  const auth = useAuth();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');

  // Enlace mágico desde Telegram: Auto-rellenar búsqueda
  useEffect(() => {
    const s = searchParams?.get('search');
    if (s) setSearchQuery(s);
  }, [searchParams]);

  const [filterCiudad, setFilterCiudad] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const [pinAuth, setPinAuth] = useState<{
    isOpen: boolean;
    actionName: string;
    onSuccess: (pin?: string) => void;
    onCancel?: () => void;
  }>({ isOpen: false, actionName: '', onSuccess: () => {} });

  const handleRefresh = useCallback(async () => {
    if (!refreshKanban) return;
    setIsRefreshing(true);
    try {
      await refreshKanban();
      toast({ title: 'Tablero actualizado correctamente' });
    } catch (_error) {
      toast({ variant: 'destructive', title: 'Error al actualizar el tablero' });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshKanban, toast]);

  const {
    allItems,
    itemSeleccionado,
    setItemSeleccionado,
    modalNota,
    setModalNota,
    handleCambiarEstadoDesdeModal,
    handlePromoverDesdeModal,
    confirmCambioEstado,
    setAllItems,
  } = useKanban(leadsReales, casosReales);

  const handleAvanzar = useCallback(
    (id: string, estadoSiguiente: string) => {
      const item = allItems.find((i) => i.id === id);
      if (!item) return;

      const targetIsCasoInfo = ['APERTURA', 'RADICADO', 'TRAMITE', 'FINALIZADO'].includes(
        estadoSiguiente
      );

      if (item.tipo === 'caso' && !targetIsCasoInfo) {
        toast({
          variant: 'destructive',
          title: 'Operación no permitida',
          description: 'No puedes devolver un Caso al flujo de Peticiones.',
        });
        return;
      }

      setAllItems((prev) => prev.map((i) => (i.id === id ? { ...i, estado: estadoSiguiente } : i)));

      const indiceAnterior = COLUMNAS_UNIFICADAS.findIndex((c) => c.id === item.estado);
      const indiceNuevo = COLUMNAS_UNIFICADAS.findIndex((c) => c.id === estadoSiguiente);
      const esRetroceso =
        indiceNuevo < indiceAnterior && indiceAnterior !== -1 && indiceNuevo !== -1;

      setModalNota({
        isOpen: true,
        itemId: id,
        nuevoEstado: estadoSiguiente,
        estadoAnterior: item.estado,
        esModalDetalle: false,
        esRetroceso,
      });
    },
    [allItems, setModalNota, setAllItems, toast]
  );

  // Reproducir sonido cuando llegan nuevos leads en tiempo real
  const prevLeadsCountRef = useRef(realtimeNewLeadsCount || 0);
  useEffect(() => {
    const currentCount = realtimeNewLeadsCount || 0;
    if (currentCount > prevLeadsCountRef.current) {
      try {
        const audio = new Audio('/notification.mp3');
        // Usamos una promesa vacía para ignorar el error si el navegador bloquea el autoplay sin interacción previa
        audio.play().catch(() => {});
      } catch (_e) {
        // Ignorar
      }
    }
    prevLeadsCountRef.current = currentCount;
  }, [realtimeNewLeadsCount]);

  // NUEVO: Motor Táctil Magnético (Pointer Events + Hardware Acceleration)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let activeElement: HTMLElement | null = null;
    let clone: HTMLElement | null = null;
    let offsetX = 0;
    let offsetY = 0;

    // ── Edge-scroll: variables para el scroll automático ──────────────────────
    let scrollRafId: number | null = null; // ID del requestAnimationFrame activo
    let scrollVelocity = 0; // velocidad actual del scroll (-ve = izquierda, +ve = derecha)

    // Zona de activación: los últimos/primeros 120px de la pantalla
    const EDGE_ZONE = 120;
    // Velocidad máxima de scroll en px por frame (≈16ms)
    const MAX_SPEED = 40;

    // Bucle de scroll que corre mientras hay arrastre activo cerca del borde
    const runEdgeScroll = () => {
      if (!activeElement || scrollVelocity === 0) {
        scrollRafId = null;
        return;
      }
      container.scrollLeft += scrollVelocity;
      scrollRafId = requestAnimationFrame(runEdgeScroll);
    };

    // Calcula la velocidad según qué tan cerca está el dedo del borde
    // Devuelve 0 (sin scroll), negativo (izquierda) o positivo (derecha)
    const getEdgeVelocity = (clientX: number): number => {
      const screenW = window.innerWidth;

      if (clientX < EDGE_ZONE) {
        // Zona izquierda: más cerca del borde = más rápido
        const ratio = 1 - clientX / EDGE_ZONE;
        return -(ratio * MAX_SPEED);
      }

      if (clientX > screenW - EDGE_ZONE) {
        // Zona derecha: más cerca del borde = más rápido
        const ratio = 1 - (screenW - clientX) / EDGE_ZONE;
        return ratio * MAX_SPEED;
      }

      return 0; // Centro de pantalla: sin scroll
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest('button, a')) return;

      const draggable = target.closest('.touch-draggable') as HTMLElement;
      if (!draggable) return;

      e.preventDefault();
      activeElement = draggable;
      const rect = activeElement.getBoundingClientRect();

      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      container.style.scrollSnapType = 'none';

      // Clon visual
      clone = activeElement.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.zIndex = '9999';
      clone.style.pointerEvents = 'none';
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.left = '0px';
      clone.style.top = '0px';
      clone.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(1.03) rotate(1.5deg)`;
      clone.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.4)';
      clone.style.opacity = '0.92';
      clone.style.willChange = 'transform';
      document.body.appendChild(clone);

      activeElement.style.opacity = '0.3';

      try {
        activeElement.setPointerCapture(e.pointerId);
      } catch {}

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      if (navigator.vibrate) navigator.vibrate(30);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeElement || !clone) return;
      e.preventDefault();

      // Mover el clon siguiendo el dedo
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      clone.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.03) rotate(1.5deg)`;

      // ── Edge-scroll magnético ──────────────────────────────────────────────
      const newVelocity = getEdgeVelocity(e.clientX);

      if (newVelocity !== 0 && scrollVelocity === 0) {
        // Acaba de entrar en zona de borde: arrancar el bucle
        scrollVelocity = newVelocity;
        if (!scrollRafId) scrollRafId = requestAnimationFrame(runEdgeScroll);
      } else if (newVelocity === 0 && scrollVelocity !== 0) {
        // Salió de la zona de borde: detener el scroll
        scrollVelocity = 0;
        if (scrollRafId) {
          cancelAnimationFrame(scrollRafId);
          scrollRafId = null;
        }
      } else {
        // Actualizar velocidad si cambió (más o menos cerca del borde)
        scrollVelocity = newVelocity;
      }

      // ── Resaltado visual de la columna destino ─────────────────────────────
      // elementFromPoint ignora el clon porque tiene pointerEvents: none
      const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
      document
        .querySelectorAll('.kanban-column')
        .forEach((col) => col.classList.remove('border-primary', 'bg-primary/5'));
      const dropzone = elementBelow?.closest('.kanban-column');
      if (dropzone) dropzone.classList.add('border-primary', 'bg-primary/5');
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!activeElement) return;

      // Detener edge-scroll
      scrollVelocity = 0;
      if (scrollRafId) {
        cancelAnimationFrame(scrollRafId);
        scrollRafId = null;
      }

      container.style.scrollSnapType = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';

      document
        .querySelectorAll('.kanban-column')
        .forEach((col) => col.classList.remove('border-primary', 'bg-primary/5'));

      if (e.type !== 'pointercancel') {
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        const dropzone = elementBelow?.closest('.kanban-column') as HTMLElement;

        if (dropzone) {
          const estadoDestino = dropzone.getAttribute('data-column-id');
          const itemId = activeElement.getAttribute('data-item-id');
          const estadoActual = activeElement.getAttribute('data-estado-actual');

          if (itemId && estadoDestino && estadoActual !== estadoDestino) {
            handleAvanzar(itemId, estadoDestino);

            // Snap magnético a la columna destino
            setTimeout(() => {
              dropzone.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }, 60);
          }
        }
      }

      try {
        activeElement.releasePointerCapture(e.pointerId);
      } catch {}

      activeElement.style.opacity = '1';
      if (clone) {
        clone.remove();
        clone = null;
      }
      activeElement = null;

      if (navigator.vibrate) navigator.vibrate(15);
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: false });
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);

    return () => {
      // Limpiar el scroll si el componente se desmonta durante un arrastre
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, [handleAvanzar]);

  // Filtro de fechas (Rango)
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  const totalLeads = useMemo(
    () => allItems.filter((i) => i.tipo === 'lead' && i.estado !== 'DESCARTADO').length,
    [allItems]
  );
  const totalCasos = useMemo(() => allItems.filter((i) => i.tipo === 'caso').length, [allItems]);
  const urgentes = useMemo(
    () =>
      allItems.filter((i) => {
        if (i.estado !== 'NUEVO' || !i.createdAt) return false;
        const horas = (Date.now() - new Date(i.createdAt).getTime()) / 3600000;
        return horas > 2;
      }).length,
    [allItems]
  );

  // Filtrado por buscador y filtros avanzados (v8.0.0)
  const filteredItems = useMemo(() => {
    let result = allItems;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        return (
          item.nombre?.toLowerCase().includes(q) ||
          item.placa?.toLowerCase().includes(q) ||
          item.cedula?.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        );
      });
    }

    if (filterCiudad) {
      result = result.filter((item) =>
        item.ciudad?.toLowerCase().includes(filterCiudad.toLowerCase())
      );
    }

    if (filterEstado) {
      result = result.filter((item) => item.estado === filterEstado);
    }

    if (filterFechaInicio || filterFechaFin) {
      result = result.filter((item) => {
        if (!item.createdAt) return false;
        const itemDate = item.createdAt.split('T')[0];
        if (filterFechaInicio && itemDate < filterFechaInicio) return false;
        if (filterFechaFin && itemDate > filterFechaFin) return false;
        return true;
      });
    }

    return result;
  }, [searchQuery, filterCiudad, filterEstado, filterFechaInicio, filterFechaFin, allItems]);

  const exportToExcel = useCallback(async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Expedientes');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 25 },
        { header: 'TIPO', key: 'tipo', width: 20 },
        { header: 'ESTADO', key: 'estado', width: 15 },
        { header: 'PLACA', key: 'placa', width: 15 },
        { header: 'CÉDULA', key: 'cedula', width: 15 },
        { header: 'NOMBRE', key: 'nombre', width: 30 },
        { header: 'CONTACTO', key: 'contacto', width: 20 },
        { header: 'EMAIL', key: 'email', width: 30 },
        { header: 'CIUDAD', key: 'ciudad', width: 20 },
        { header: 'FECHA_CREACIÓN', key: 'fecha', width: 20, style: { numFmt: 'dd/mm/yyyy' } },
        { header: 'AHORRO', key: 'ahorro', width: 15 },
      ];

      filteredItems.forEach((item) => {
        worksheet.addRow({
          id: item.id,
          tipo: item.tipo === 'lead' ? 'Petición (Consulta)' : 'Caso Legal',
          estado: item.estado,
          placa: item.placa || 'N/A',
          cedula: item.cedula || 'N/A',
          nombre: item.nombre || 'N/A',
          contacto: item.contacto || 'N/A',
          email: item.email || 'N/A',
          ciudad: item.ciudad || 'N/A',
          fecha: item.createdAt ? new Date(item.createdAt) : null,
          ahorro: item.ahorro || 'N/A',
        });
      });

      worksheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const fecha = new Date().toISOString().split('T')[0];
      saveAs(blob, `Reporte_Desmulta_${fecha}.xlsx`);

      const userEmail = auth?.currentUser?.email || 'desconocido';
      SecurityLogger.info('auditoria-exportacion', {
        user: userEmail,
        type: 'excel',
        count: filteredItems.length,
      });
      logExportAction({ user: userEmail, type: 'excel', count: filteredItems.length });

      toast({ title: 'Exportación a Excel exitosa' });
    } catch (error) {
      SecurityLogger.error('Error al exportar a Excel', { error: String(error) });
      toast({ variant: 'destructive', title: 'Error al exportar los datos a Excel' });
    }
  }, [filteredItems, toast, auth?.currentUser?.email]);

  const exportToPDF = async (pin?: string) => {
    if (!pin) {
      toast({ variant: 'destructive', title: 'Error: PIN no proporcionado' });
      return;
    }

    try {
      toast({ title: 'Generando PDF en el servidor...' });

      const user = auth?.currentUser;

      const data = {
        items: filteredItems.map((i: KanbanItem) => ({
          id: i.id,
          tipo: i.tipo,
          estado: i.estado,
          placa: i.placa,
          cedula: i.cedula,
          nombre: i.nombre,
          ciudad: i.ciudad,
          createdAt: i.createdAt,
        })),
        fechaExportacion: new Date().toLocaleDateString('es-CO'),
        operatorDetails: {
          nombre: user?.displayName || 'N/A',
          email: user?.email || 'N/A',
          telefono: user?.phoneNumber || 'N/A',
        },
        filtros: {
          ciudad: filterCiudad,
          estado: filterEstado,
          fechaInicio: '',
          fechaFin: '',
        },
      };

      const res = await fetch('/api/admin/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, data }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.details || 'Error al compilar PDF en el servidor');
      }

      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Reporte_Desmulta_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();

      toast({ title: 'Exportación a PDF exitosa' });
    } catch (error) {
      SecurityLogger.error('Error al exportar a PDF', { error: String(error) });
      toast({
        variant: 'destructive',
        title: error instanceof Error ? error.message : 'Error al exportar los datos a PDF',
      });
    }
  };

  // Detector magnético de columnas para móviles (IntersectionObserver)
  const [columnaVisible, setColumnaVisible] = useState<string | null>(null);
  const [mostrarTooltip, setMostrarTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: true });

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setScrollState({
        canScrollLeft: scrollLeft > 10,
        canScrollRight: Math.ceil(scrollLeft + clientWidth) < scrollWidth - 10,
      });
    }
  }, []);

  const handleColumnScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>, isLead: boolean) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      // Si llegamos al final de la columna (umbral de 20px)
      if (scrollHeight - scrollTop <= clientHeight + 20) {
        if (isLead && loadMoreLeads) loadMoreLeads();
        else if (!isLead && loadMoreCases) loadMoreCases();
      }
    },
    [loadMoreLeads, loadMoreCases]
  );

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, allItems]);

  const scrollColumn = useCallback((direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = window.innerWidth >= 1024 ? 300 : window.innerWidth * 0.85;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    if (window.innerWidth >= 1024) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = entry.target.getAttribute('data-index');
            if (index !== null) {
              const col = COLUMNAS_UNIFICADAS[Number(index)];
              if (col) {
                setColumnaVisible(col.titulo);
                setMostrarTooltip(true);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                  setMostrarTooltip(false);
                }, 3000);
              }
            }
          }
        });
      },
      { threshold: 0.6, root: null }
    );
    const cols = document.querySelectorAll('.kanban-column');
    cols.forEach((col) => observer.observe(col));
    return () => {
      observer.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full min-h-[80vh] bg-background/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex flex-col items-center mb-8 relative z-10 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center justify-center gap-3 mb-2">
            Gestor de Expedientes
            <span className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full border border-primary/30">
              Alta Capacidad (v1.0.0)
            </span>
          </h2>
          <p className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase opacity-60 mb-3">
            Escalamiento e Infraestructura Optimizada
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold">
            <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
              {totalLeads} consultas activas
            </span>
            <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-full border border-green-500/20">
              {totalCasos} casos
            </span>
            <span
              className={`px-3 py-1 rounded-full border shadow-sm font-bold ${
                urgentes > 0 || (realtimeNewLeadsCount || 0) > 0
                  ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              }`}
            >
              {realtimeNewLeadsCount || 0} consultas activas · {urgentes} urgentes
            </span>
          </div>
        </div>

        {/* BUSCADOR Y FILTROS GLOBALES (v8.0.0) */}
        <TooltipProvider delayDuration={200}>
          <div className="w-full max-w-4xl flex flex-col gap-3">
            <div className="flex gap-3 w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative group flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por Nombre, Placa o Cédula..."
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 p-4 pl-12 rounded-[1.5rem] outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm font-bold text-slate-900 dark:text-white transition-all shadow-inner"
                    />
                    <AlertCircle className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buscar cliente por placa, cédula o nombre en tiempo real (0 lecturas)</p>
                </TooltipContent>
              </Tooltip>
              {refreshKanban && (
                <div className="flex items-center gap-2">
                  {(realtimeNewLeadsCount || 0) > 0 ? (
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-[1.5rem] text-sm font-bold flex items-center gap-2 animate-pulse shadow-lg transition-all"
                    >
                      <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Actualizar Tablero ({realtimeNewLeadsCount} nuevos)
                    </button>
                  ) : (
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/10 text-slate-900 dark:text-white p-4 rounded-[1.5rem] flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-inner"
                      title="Refrescar tablero"
                    >
                      <RefreshCw
                        className={`w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ${isRefreshing ? 'animate-spin text-primary' : ''}`}
                      />
                    </button>
                  )}
                </div>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() =>
                      setPinAuth({
                        isOpen: true,
                        actionName: 'Exportar a Excel',
                        onSuccess: exportToExcel,
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 hover:border-green-500/50 hover:bg-green-500/10 text-slate-900 dark:text-white p-4 rounded-[1.5rem] flex items-center justify-center transition-all group shadow-inner"
                    title="Exportar a Excel"
                  >
                    <Download className="w-5 h-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exportar vista actual a Excel (0 lecturas)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() =>
                      setPinAuth({
                        isOpen: true,
                        actionName: 'Exportar a PDF',
                        onSuccess: (pin) => exportToPDF(pin),
                      })
                    }
                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 hover:border-red-500/50 hover:bg-red-500/10 text-slate-900 dark:text-white p-4 rounded-[1.5rem] flex items-center justify-center transition-all group shadow-inner"
                    title="Exportar a PDF"
                  >
                    <FileArchive className="w-5 h-5 text-muted-foreground group-hover:text-red-500 transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exportar vista actual a PDF (0 lecturas)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsHelpModalOpen(true)}
                    className="bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 p-4 rounded-[1.5rem] flex items-center justify-center transition-all group shadow-inner"
                    title="Guía de herramientas"
                  >
                    <Info className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver Guía Rápida del Tablero</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* NUEVOS FILTROS */}
            <div className="flex flex-wrap gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary/50 flex-1 min-w-[150px]"
                  >
                    <option value="">Todos los Estados</option>
                    {COLUMNAS_UNIFICADAS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.titulo}
                      </option>
                    ))}
                  </select>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filtrar por estado en el flujo (0 lecturas)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <input
                    type="text"
                    value={filterCiudad}
                    onChange={(e) => setFilterCiudad(e.target.value)}
                    placeholder="Filtrar por ciudad..."
                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary/50 flex-1 min-w-[150px]"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mostrar solo clientes de esta ciudad (0 lecturas)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden focus-within:border-primary/50 flex-1 min-w-[250px]">
                    <input
                      type="date"
                      value={filterFechaInicio}
                      onChange={(e) => setFilterFechaInicio(e.target.value)}
                      title="Fecha Inicio"
                      className="bg-transparent p-3 text-sm font-bold text-slate-900 dark:text-white outline-none flex-1 border-r border-slate-200 dark:border-white/10"
                    />
                    <input
                      type="date"
                      value={filterFechaFin}
                      onChange={(e) => setFilterFechaFin(e.target.value)}
                      title="Fecha Fin"
                      className="bg-transparent p-3 text-sm font-bold text-slate-900 dark:text-white outline-none flex-1"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filtrar por rango de fechas (0 lecturas)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      <ModalAyudaOperador isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />

      {/* TOOLTIP FLOTANTE MÓVIL */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 pointer-events-none lg:hidden
        ${mostrarTooltip ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
      >
        <div className="bg-white dark:bg-slate-900 border border-primary/50 text-slate-900 dark:text-white font-bold text-sm px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Estás en: <span className="text-primary tracking-wide">{columnaVisible}</span>
        </div>
      </div>

      <div className="relative group/kanban w-full">
        {scrollState.canScrollLeft && (
          <button
            onClick={() => scrollColumn('left')}
            className="absolute left-[-10px] top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white p-3 rounded-full shadow-2xl backdrop-blur-xl transition-all active:scale-95 animate-in fade-in zoom-in"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {scrollState.canScrollRight && (
          <button
            onClick={() => scrollColumn('right')}
            className="absolute right-[-10px] top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white p-3 rounded-full shadow-2xl backdrop-blur-xl transition-all active:scale-95 animate-in fade-in zoom-in"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex flex-row gap-4 overflow-x-auto pb-4 relative z-10 w-full snap-x snap-mandatory scroll-smooth custom-scrollbar"
        >
          {COLUMNAS_UNIFICADAS.map((columna, index) => {
            const isLeadCol = index < COLUMNAS_LEADS.length;
            const hasMore = isLeadCol ? hasMoreLeads : hasMoreCases;

            return (
              <div
                key={columna.id}
                data-index={index}
                data-column-id={columna.id}
                className="kanban-column w-[85vw] max-w-[340px] lg:w-auto lg:flex-1 lg:min-w-[320px] shrink-0 snap-center bg-slate-50/80 dark:bg-[#0a0a0c]/80 backdrop-blur-2xl rounded-[2rem] border border-slate-200/60 dark:border-white/5 p-5 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_40px_rgb(0,0,0,0.2)] transition-all hover:border-slate-300 dark:hover:border-white/10"
              >
                <div className={`border-b-2 pb-3 mb-4 ${columna.color}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${columna.bgIcon}`}>
                        <columna.icono className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-lg uppercase tracking-wide flex items-center gap-2">
                        {columna.titulo}
                        {columna.id === 'NUEVO' && (realtimeNewLeadsCount || 0) > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-2 animate-bounce border-none font-black shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                          >
                            {realtimeNewLeadsCount} Nuevo{realtimeNewLeadsCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-muted-foreground/30 hover:text-primary transition-colors p-1 rounded-full hover:bg-white/5">
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-4 max-w-[260px] text-xs font-bold leading-relaxed rounded-2xl shadow-2xl z-[100]">
                          <div className="space-y-2">
                            <h4 className="font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-1 mb-2">
                              Guía de Gestión
                            </h4>
                            <p className="text-slate-700 dark:text-slate-200">
                              {columna.descripcion}
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <span className="bg-white/10 text-muted-foreground font-black text-xs py-1 px-3 rounded-full">
                      {
                        filteredItems.filter((item: KanbanItem) => item.estado === columna.id)
                          .length
                      }
                    </span>
                  </div>
                  <p className="text-xs font-bold opacity-80 mt-2 flex items-center gap-1.5 ml-1">
                    👉 {columna.accion}
                  </p>
                </div>

                {/* CONTENEDOR CON INFINITE SCROLL (v7.9.0) */}
                <div
                  onScroll={(e) => handleColumnScroll(e, isLeadCol)}
                  className="flex-1 flex flex-col gap-3 min-h-[200px] max-h-[65vh] overflow-y-auto pr-2 rounded-xl custom-scrollbar"
                >
                  {filteredItems
                    .filter((item: KanbanItem) => item.estado === columna.id)
                    .map((item: KanbanItem) => (
                      <div key={item.id} onClick={() => setItemSeleccionado(item)}>
                        <TarjetaKanban data={item} onAvanzar={handleAvanzar} />
                      </div>
                    ))}

                  {/* INDICADOR DE CARGA (INFINITE SCROLL) */}
                  {hasMore && (
                    <div className="py-6 flex flex-col items-center justify-center opacity-40">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        Cargando más...
                      </p>
                    </div>
                  )}

                  {filteredItems.filter((item: KanbanItem) => item.estado === columna.id).length ===
                    0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm font-medium">
                      {searchQuery ? 'Sin Resultados' : 'Vacío'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {itemSeleccionado && (
        <ModalDetalleExpediente
          data={itemSeleccionado}
          onClose={() => setItemSeleccionado(null)}
          onCambiarEstado={handleCambiarEstadoDesdeModal}
          onPromoverACaso={(item) => {
            return new Promise<void>((resolve, reject) => {
              setPinAuth({
                isOpen: true,
                actionName: 'Formalizar Expediente',
                onSuccess: () => {
                  handlePromoverDesdeModal(item).then(resolve).catch(reject);
                },
                onCancel: () => reject(new Error('Cancelado')),
              });
            });
          }}
          esCaso={itemSeleccionado.tipo === 'caso'}
        />
      )}

      <ModalAuthPin
        isOpen={pinAuth.isOpen}
        actionName={pinAuth.actionName}
        onSuccess={pinAuth.onSuccess}
        onCancel={pinAuth.onCancel}
        onClose={() => setPinAuth((prev) => ({ ...prev, isOpen: false }))}
      />

      <ModalNotaOperador
        isOpen={modalNota.isOpen}
        onClose={() => {
          // Si cancela, revertimos el estado optimista
          setAllItems((prev) =>
            prev.map((i) =>
              i.id === modalNota.itemId ? { ...i, estado: modalNota.estadoAnterior } : i
            )
          );
          setModalNota((prev) => ({ ...prev, isOpen: false }));
        }}
        onConfirm={(nota) => {
          const isCriticalPromotion =
            ['APERTURA', 'RADICADO', 'TRAMITE', 'FINALIZADO'].includes(modalNota.nuevoEstado) &&
            allItems.find((i) => i.id === modalNota.itemId)?.tipo === 'lead';
          if (isCriticalPromotion) {
            setPinAuth({
              isOpen: true,
              actionName: `Promover a ${modalNota.nuevoEstado}`,
              onSuccess: () => confirmCambioEstado(nota),
            });
          } else {
            confirmCambioEstado(nota);
          }
        }}
        estadoDestino={modalNota.nuevoEstado}
        esRetroceso={modalNota.esRetroceso}
      />
    </div>
  );
});
