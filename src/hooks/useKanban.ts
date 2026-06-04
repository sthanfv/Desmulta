import { logger } from '@/lib/logger/security-logger';
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { updateConsultationStatus, updateCaseStatus, convertToCase } from '@/app/admin/actions';
import { Consultation } from '@/lib/definitions';
import { KanbanItem } from '@/components/vial-clear/TableroFlujoTrabajo';

const MAPEO_ESTADOS = new Map<string, string>([
  ['NUEVO', 'pendiente'],
  ['CONTACTADO', 'contactado'],
  ['ESTUDIO', 'estudio'],
  ['DESCARTADO', 'descartado'],
  ['APERTURA', 'apertura'],
  ['RADICADO', 'radicado'],
  ['TRAMITE', 'tramite'],
  ['FINALIZADO', 'finalizado'],
]);

export function useKanban(leadsReales: KanbanItem[], casosReales: KanbanItem[]) {
  const { toast } = useToast();
  const auth = useAuth();

  const [allItems, setAllItems] = useState<KanbanItem[]>([]);

  useEffect(() => {
    setAllItems([...leadsReales, ...casosReales]);
  }, [leadsReales, casosReales]);

  const [itemSeleccionado, setItemSeleccionado] = useState<KanbanItem | null>(null);

  const [modalNota, setModalNota] = useState<{
    isOpen: boolean;
    itemId: string;
    nuevoEstado: string;
    estadoAnterior: string;
    esModalDetalle: boolean;
  }>({
    isOpen: false,
    itemId: '',
    nuevoEstado: '',
    estadoAnterior: '',
    esModalDetalle: false,
  });

  const onDragStart = useCallback((e: React.DragEvent, id: string, estadoActual: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, estadoActual }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent, nuevaColumna: string) => {
    e.preventDefault();
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const { id, estadoActual } = JSON.parse(rawData);

      if (estadoActual === nuevaColumna) return;

      setAllItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, estado: nuevaColumna } : item))
      );

      setModalNota({
        isOpen: true,
        itemId: id,
        nuevoEstado: nuevaColumna,
        estadoAnterior: estadoActual,
        esModalDetalle: false,
      });
    } catch (err) {
      logger.error('Error in onDrop parse:', err);
    }
  }, []);

  const handleCambiarEstadoDesdeModal = useCallback(
    async (id: string, nuevoEstado: string, _tipo: 'lead' | 'caso') => {
      const estadoAnterior = itemSeleccionado?.estado || 'NUEVO';
      setAllItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item))
      );

      setModalNota({
        isOpen: true,
        itemId: id,
        nuevoEstado,
        estadoAnterior,
        esModalDetalle: true,
      });
    },
    [itemSeleccionado?.estado]
  );

  const handlePromoverDesdeModal = useCallback(
    async (item: KanbanItem) => {
      try {
        // Fix (getIdToken(true))
        const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
        const result = await convertToCase(
          idToken,
          {
            id: item.id,
            cedula: item.cedula || '',
            nombre: item.nombre || '',
            contacto: item.contacto || '',
            placa: item.placa || '',
            email: item.email || '',
            status: 'en_proceso',
          } as unknown as Consultation,
          'apertura'
        );
        if (!result.success) throw new Error(result.error || 'Error desconocido');
        toast({ title: 'Solicitud promovida a Gestión de Caso exitosamente' });
      } catch (error) {
        logger.error('Fallo al promover', error);
        toast({ variant: 'destructive', title: 'Error al promover a caso.' });
        throw error;
      }
    },
    [auth, toast]
  );

  const confirmCambioEstado = useCallback(
    async (nota: string) => {
      const { itemId, nuevoEstado, estadoAnterior, esModalDetalle } = modalNota;
      setModalNota((prev) => ({ ...prev, isOpen: false }));

      const item = allItems.find((i) => i.id === itemId);
      if (!item) return;

      const targetIsCasoInfo = ['APERTURA', 'RADICADO', 'TRAMITE', 'FINALIZADO'].includes(
        nuevoEstado
      );

      try {
        // Fix getIdToken(true)
        const idToken = (await auth?.currentUser?.getIdToken(true)) || '';

        if (item.tipo === 'lead' && targetIsCasoInfo) {
          const result = await convertToCase(
            idToken,
            {
              id: item.id,
              cedula: item.cedula || '',
              nombre: item.nombre || '',
              contacto: item.contacto || '',
              placa: item.placa || '',
              email: item.email || '',
              status: 'en_proceso',
            } as unknown as Consultation,
            MAPEO_ESTADOS.get(nuevoEstado) || nuevoEstado.toLowerCase()
          );

          if (!result.success) throw new Error(result.error);
          toast({ title: `Petición Promovida a Caso y movida a ${nuevoEstado}` });
        } else {
          const estadoNormalizado = MAPEO_ESTADOS.get(nuevoEstado) || nuevoEstado.toLowerCase();

          if (item.tipo === 'lead') {
            const result = await updateConsultationStatus(
              idToken,
              itemId,
              estadoNormalizado,
              nota || undefined
            );
            if (result.error) throw new Error(result.error);
          } else {
            const desc = `Actualización de flujo: ${nuevoEstado}`;
            const result = await updateCaseStatus(
              idToken,
              itemId,
              estadoNormalizado,
              desc,
              nota || undefined
            );
            if (result.error) throw new Error(result.error);
          }

          const EMAIL_STATES = [
            'CONTACTADO',
            'ESTUDIO',
            'APERTURA',
            'RADICADO',
            'TRAMITE',
            'FINALIZADO',
          ];
          if (EMAIL_STATES.includes(nuevoEstado)) {
            toast({
              title: 'Estado actualizado y Notificación enviada',
              description: `Se notificó al cliente el cambio a ${nuevoEstado}`,
            });
          } else {
            toast({ title: `Estado actualizado a ${nuevoEstado}` });
          }
        }

        if (esModalDetalle) {
          setItemSeleccionado((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
        }
      } catch (error) {
        logger.error('Error al actualizar estado:', error);
        toast({
          variant: 'destructive',
          title: 'Error al sincronizar con el servidor',
          description: 'Se ha revertido el cambio local',
        });
        setAllItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, estado: estadoAnterior } : i))
        );
      }
    },
    [allItems, auth, modalNota, toast]
  );

  return {
    allItems,
    itemSeleccionado,
    setItemSeleccionado,
    modalNota,
    setModalNota,
    onDragStart,
    onDragOver,
    onDrop,
    handleCambiarEstadoDesdeModal,
    handlePromoverDesdeModal,
    confirmCambioEstado,
    setAllItems,
  };
}
