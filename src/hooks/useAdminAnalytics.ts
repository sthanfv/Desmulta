/**
 * useAdminAnalytics
 * Hook que encapsula la carga y estado de las métricas del dashboard admin.
 * Separa la lógica de negocio del componente AdminDashboard.
 */
import { useState, useEffect, useCallback } from 'react';
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
}

export function useAdminAnalytics(idToken: string | null) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarAnalytics = useCallback(async () => {
    if (!idToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getAnalyticsStats(idToken);
      if (data.success && data.stats) {
        setAnalytics(data.stats as AnalyticsData);
      } else {
        setError((data.error as string) || 'Error');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando analytics');
    } finally {
      setIsLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    cargarAnalytics();
  }, [cargarAnalytics]);

  return { analytics, isLoading, error, recargar: cargarAnalytics };
}
