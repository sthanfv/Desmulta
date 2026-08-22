'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, TrendingUp, MapPin, Users, Activity } from 'lucide-react';

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

  useEffect(() => {
    async function fetchDemand() {
      try {
        const response = await fetch('/api/admin/analytics/demand');
        if (!response.ok) throw new Error('Failed to fetch');
        const json = await response.json();
        setData(json);
      } catch (_err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchDemand();
  }, []);

  if (loading) {
    return (
      <Card className="col-span-2 border-primary/20 bg-background/50 backdrop-blur-sm">
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Ocultar si falla (Fail-Open/Graceful degradation)
  }

  // Paleta de colores para los tópicos (glassmorphism feel)
  const getTopicColor = (index: number) => {
    const colors = [
      'bg-red-500', 
      'bg-amber-500', 
      'bg-blue-500', 
      'bg-emerald-500', 
      'bg-purple-500',
      'bg-gray-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className="col-span-2 md:col-span-3 lg:col-span-4 border-amber-500/20 bg-background/50 backdrop-blur-xl shadow-lg relative overflow-hidden">
      {/* Insignia visual */}
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Activity className="w-32 h-32 text-amber-500" />
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          Demanda Ciudadana (Top Tendencias)
        </CardTitle>
        <CardDescription>
          Inteligencia de mercado en vivo extraída del Asistente IA (Mes actual: {data.month})
        </CardDescription>
      </CardHeader>
      
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Columna Izquierda: Gráfico de Temas */}
        <div className="space-y-4 relative z-10">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider mb-4">
            <Users className="w-4 h-4" /> Motivos de Consulta (Dolor Ciudadano)
          </h4>
          
          {data.topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay suficientes datos este mes.</p>
          ) : (
            data.topics.map((topic, idx) => (
              <div key={topic.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{topic.label}</span>
                  <span className="text-muted-foreground">{topic.percentage}% ({topic.count})</span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getTopicColor(idx)}`} 
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Columna Derecha: Ciudades y Global */}
        <div className="space-y-8 relative z-10">
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider mb-4">
              <MapPin className="w-4 h-4" /> Top Ciudades Afectadas
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {data.cities.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-2">Sin datos de geocontexto.</p>
              ) : (
                data.cities.map((city, idx) => (
                  <div key={idx} className="bg-secondary/50 p-3 rounded-lg border border-border/50 flex flex-col justify-center items-center">
                    <span className="text-lg font-bold text-foreground">{city.city}</span>
                    <span className="text-xs text-muted-foreground">{city.percentage}% de casos</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-500/80">Volumen Total Analizado</p>
              <h3 className="text-3xl font-black text-amber-500">{data.totalQueries}</h3>
            </div>
            <Activity className="w-8 h-8 text-amber-500/50" />
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
