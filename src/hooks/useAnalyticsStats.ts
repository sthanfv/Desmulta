'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Auth } from 'firebase/auth';
import { getAnalyticsStats } from '@/app/admin/actions';

export interface AnalyticsData {
  prospectosTotales: number;
  totalLeads: number;
  totalCases: number;
  conversionRate: string;
  conversionGlobal: string;
  averageResolutionTime: string;
  growthData: { date: string; count: number }[];
  statusData: { name: string; value: number }[];
  infractionData: { name: string; value: number }[];
  funnelData?: { name: string; value: number; fill: string }[];
  geminiRequestsToday?: number;
  chatRequestsToday?: number;
}

export function useAnalyticsStats(auth: Auth | null) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!auth?.currentUser) return;
    setIsLoading(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await getAnalyticsStats(idToken);
      if (res.success && res.stats) {
        setData(res.stats);
      } else {
        setError(res.error || 'Error al cargar analíticas');
      }
    } catch (_err) {
      setError('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.currentUser?.uid]); // ✅ solo el UID — string estable, no el objeto Auth completo

  useEffect(() => {
    if (auth?.currentUser?.uid) {
      fetchAnalytics();
    }
  }, [auth?.currentUser?.uid, fetchAnalytics]); // ✅ se dispara solo al cambiar de usuario o si la función cambia

  return {
    data,
    isLoading,
    error,
    refresh: fetchAnalytics,
  };
}
