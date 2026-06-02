import { useState, useEffect, useCallback, useRef } from 'react';
import type { Auth } from 'firebase/auth';
import type { DocumentData } from 'firebase/firestore';
import { getConsultations, getCases } from '@/app/admin/actions';
import { KanbanItem } from '@/components/vial-clear/TableroFlujoTrabajo';
import { logger } from '@/lib/logger/security-logger';
import { useNuevosLeadsRT } from './useNuevosLeadsRT';

export interface ConsultationRow {
  id: string;
  status: string;
  placa?: string;
  ciudad?: string;
  antiguedad?: string;
  trackingUuid?: string;
  createdAt: string | null;
  evidenceUrl?: string;
  nombre?: string;
  cedula?: string;
  contacto?: string;
  email?: string;
}

export interface CaseRow {
  id: string;
  status: string;
  placa?: string;
  ciudad?: string;
  trackingUuid?: string;
  createdAt: string | null;
  evidenceUrl?: string;
  nombre?: string;
  cedula?: string;
  contacto?: string;
  email?: string;
}

export function useAdminStats(auth: Auth | null) {
  const [leadsParaKanban, setLeadsParaKanban] = useState<KanbanItem[]>([]);
  const [casosParaKanban, setCasosParaKanban] = useState<KanbanItem[]>([]);
  const [isLoadingKanban, setIsLoadingKanban] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  // Estados de paginación (v7.9.0)
  const [lastLeadId, setLastLeadId] = useState<string | null>(null);
  const [lastCaseId, setLastCaseId] = useState<string | null>(null);
  const [hasMoreLeads, setHasMoreLeads] = useState(true);
  const [hasMoreCases, setHasMoreCases] = useState(true);

  // Mapeo seguro de estados
  const mapStatusToKanban = useCallback((status: string, tipo: 'lead' | 'caso') => {
    const s = status?.toLowerCase() || '';
    if (tipo === 'lead') {
      if (s === 'contactado') return 'CONTACTADO';
      if (s === 'estudio' || s === 'en_proceso') return 'ESTUDIO';
      if (s === 'descartado') return 'DESCARTADO';
      if (s === 'finalizado' || s === 'terminado') return 'CONVERTIDO';
      return 'NUEVO';
    } else {
      if (s === 'radicado') return 'RADICADO';
      if (s === 'tramite' || s === 'resolucion' || s === 'en_espera') return 'TRAMITE';
      if (s === 'finalizado' || s === 'archivo' || s === 'descartado') return 'FINALIZADO';
      return 'APERTURA';
    }
  }, []);

  const processLeads = useCallback(
    (data: DocumentData[]) => {
      const rows = data as unknown as ConsultationRow[];
      return rows.map((l) => {
        let ahorro = undefined;
        if (l.antiguedad?.includes('Más de 3 años')) ahorro = '$800k - $1.5M';
        else if (l.antiguedad?.includes('Entre 1 y 3 años')) ahorro = '$400k - $800k';

        return {
          id: l.id,
          placa: l.placa || 'N/A',
          ciudad: l.ciudad || 'Por definir',
          estado: mapStatusToKanban(l.status, 'lead'),
          ahorro,
          createdAt: l.createdAt,
          evidenceUrl: l.evidenceUrl,
          nombre: l.nombre,
          cedula: l.cedula,
          contacto: l.contacto,
          email: l.email, // v7.8.0 support
          trackingUuid: l.trackingUuid,
          tipo: 'lead',
        } as KanbanItem;
      });
    },
    [mapStatusToKanban]
  );

  const processCases = useCallback(
    (data: DocumentData[]) => {
      const rows = data as unknown as CaseRow[];
      return rows.map((c) => {
        return {
          id: c.id,
          placa: c.placa || c.cedula || 'N/A',
          ciudad: c.ciudad || 'Por definir',
          estado: mapStatusToKanban(c.status, 'caso'),
          createdAt: c.createdAt,
          evidenceUrl: c.evidenceUrl,
          nombre: c.nombre,
          cedula: c.cedula,
          contacto: c.contacto,
          email: c.email, // v7.8.0 support
          trackingUuid: c.trackingUuid,
          tipo: 'caso',
        } as KanbanItem;
      });
    },
    [mapStatusToKanban]
  );

  const loadMoreLeads = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreLeads || !auth?.currentUser) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const idToken = (await auth.currentUser.getIdToken(true)) || '';
      const res = await getConsultations(idToken, 20, lastLeadId);
      if (res.success && res.data) {
        const newLeads = processLeads(res.data as DocumentData[]);
        // Filtramos duplicados por si acaso el backend devuelve algo ya existente
        setLeadsParaKanban((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const uniqueNewLeads = newLeads.filter((l) => !existingIds.has(l.id));
          return [...prev, ...uniqueNewLeads];
        });
        setLastLeadId(res.lastDocId || null);
        setHasMoreLeads(res.hasMore || false);
      }
    } catch (err) {
      logger.error('[useAdminStats] Error cargando más leads', { error: String(err) });
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [auth, hasMoreLeads, lastLeadId, processLeads]);

  const loadMoreCases = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreCases || !auth?.currentUser) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const idToken = (await auth.currentUser.getIdToken(true)) || '';
      const res = await getCases(idToken, 20, lastCaseId);
      if (res.success && res.data) {
        const newCases = processCases(res.data as DocumentData[]);
        setCasosParaKanban((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const uniqueNewCases = newCases.filter((c) => !existingIds.has(c.id));
          return [...prev, ...uniqueNewCases];
        });
        setLastCaseId(res.lastDocId || null);
        setHasMoreCases(res.hasMore || false);
      }
    } catch (err) {
      logger.error('[useAdminStats] Error cargando más casos', { error: String(err) });
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [auth, hasMoreCases, lastCaseId, processCases]);

  const refreshKanban = useCallback(async () => {
    // Guard explícito: nunca ejecutar sin sesión activa
    if (!auth?.currentUser) return;
    setIsLoadingKanban(true);
    try {
      const idToken = (await auth.currentUser.getIdToken(true)) || '';
      const [leadsRes, casesRes] = await Promise.all([
        getConsultations(idToken, 30),
        getCases(idToken, 30),
      ]);

      if (leadsRes.success && leadsRes.data) {
        setLeadsParaKanban(processLeads(leadsRes.data as DocumentData[]));
        setLastLeadId(leadsRes.lastDocId || null);
        setHasMoreLeads(leadsRes.hasMore || false);
      }

      if (casesRes.success && casesRes.data) {
        setCasosParaKanban(processCases(casesRes.data as DocumentData[]));
        setLastCaseId(casesRes.lastDocId || null);
        setHasMoreCases(casesRes.hasMore || false);
      }
    } catch (err) {
      logger.error('[useAdminStats] Error cargando datos del kanban', { error: String(err) });
    } finally {
      setIsLoadingKanban(false);
    }
    // auth.currentUser.uid como dep: se recrea solo cuando cambia el USUARIO (no el objeto auth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.currentUser?.uid, processCases, processLeads]);

  // Disparo único al montar o al cambiar de usuario.
  const loadedUid = useRef<string | null>(null);
  useEffect(() => {
    if (auth?.currentUser?.uid && loadedUid.current !== auth.currentUser.uid) {
      loadedUid.current = auth.currentUser.uid;
      refreshKanban();
    }
    // Solo queremos reaccionar al UID del usuario, no al objeto refreshKanban completo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.currentUser?.uid]);

  // Snapshot en tiempo real para Leads nuevos (últimas 2 horas) extraído a su propio hook
  const realtimeNewLeadsCount = useNuevosLeadsRT(auth);

  return {
    leadsParaKanban,
    casosParaKanban,
    isLoadingKanban,
    isLoadingMore,
    hasMoreLeads,
    hasMoreCases,
    loadMoreLeads,
    loadMoreCases,
    refreshKanban,
    realtimeNewLeadsCount,
  };
}
