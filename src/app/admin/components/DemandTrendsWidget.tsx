'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, MapPin, Users, Activity, RefreshCw } from 'lucide-react';

interface DemandData {
  month: string;
  totalQueries: number;
  topics: Array<{
    id: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  cities: Array<{
    city: string;
    count: number;
    percentage: number;
  }>;
}

export function DemandTrendsWidget() {
  const [data, setData] = useState<DemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDemand = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const response = await fetch('/api/admin/analytics/demand');
      if (!response.ok) throw new Error('Failed to fetch');
      const json = await response.json();
      setData(json);
      setLastUpdate(new Date());
      setError(false);
    } catch (_err) {
      setError(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDemand();
    // Auto-refresco cada 5 minutos
    const interval = setInterval(() => fetchDemand(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDemand]);

  if (loading && !data) {
    return (
      <Card className="col-span-2 border-primary/20 bg-background/50 backdrop-blur-sm">
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return null; // Ocultar si falla (Fail-Open/Graceful degradation)
  }

  // Paleta de colores para los tópicos (glassmorphism feel)
  const getTopicColor = (index: number) => {
    const colors = [
      'bg-amber-500',
      'bg-blue-500',
      'bg-emerald-500',
      'bg-purple-500',
      'bg-red-500',
      'bg-gray-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className="col-span-2 lg:col-span-5 border-amber-500/30 bg-card/40 backdrop-blur-xl shadow-xl relative overflow-hidden group transition-all duration-500 hover:border-amber-500/50">
      {/* Insignia visual (Fondo) */}
      <div className="absolute -top-10 -right-10 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
        <Activity className="w-64 h-64 text-amber-500" />
      </div>

      <CardHeader className="flex flex-row items-start justify-between pb-2 relative z-10">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Radar de Demanda Ciudadana
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
          </CardTitle>
          <CardDescription>
            Inteligencia de mercado en tiempo real extraída del Agente IA (Periodo: {data?.month})
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDemand(true)}
          disabled={isRefreshing}
          className="h-8 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-500"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {lastUpdate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </Button>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4 relative z-10">
        {/* Columna Izquierda: Gráfico de Temas (7 columnas) */}
        <div className="md:col-span-7 space-y-5">
          <h4 className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
            <Users className="w-4 h-4" /> Motivos de Consulta (Dolor Legal)
          </h4>

          {data?.topics.length === 0 ? (
            <div className="h-32 flex items-center justify-center border border-dashed border-border/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Esperando telemetría del mes actual...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.topics.map((topic, idx) => (
                <div key={topic.id} className="space-y-1.5">
                  <div className="flex justify-between text-sm items-end">
                    <span className="font-semibold text-foreground/90">{topic.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">{topic.count} casos</span>
                      <span className="font-mono font-bold text-foreground">
                        {topic.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-secondary/50 h-3 rounded-full overflow-hidden border border-border/30">
                    <div
                      className={`h-full rounded-full ${getTopicColor(idx)} transition-all duration-1000 ease-out`}
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Ciudades y Global (5 columnas) */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
              <MapPin className="w-4 h-4" /> Top Ciudades Afectadas
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {data?.cities.length === 0 ? (
                <div className="h-24 col-span-2 flex items-center justify-center border border-dashed border-border/50 rounded-lg">
                  <p className="text-sm text-muted-foreground col-span-2">
                    Sin geocontexto reciente
                  </p>
                </div>
              ) : (
                data?.cities.map((city, idx) => (
                  <div
                    key={idx}
                    className="bg-secondary/40 p-3 rounded-xl border border-border/40 flex flex-col justify-center items-center hover:bg-secondary/60 transition-colors"
                  >
                    <span className="text-lg font-black text-foreground/90">{city.city}</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {city.percentage}% de consultas
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <p className="text-xs font-bold text-amber-500/80 uppercase tracking-wider mb-1">
                Volumen Analizado
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-amber-500 tracking-tighter">
                  {data?.totalQueries}
                </h3>
                <span className="text-sm text-amber-500/70 font-medium">conductores</span>
              </div>
            </div>
            <Activity className="w-10 h-10 text-amber-500/40" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
