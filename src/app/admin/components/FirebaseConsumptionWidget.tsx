'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Database, Zap, ArrowDownCircle, ShieldCheck } from 'lucide-react';

interface FirebaseConsumptionWidgetProps {
  totalLeads: number;
}

export function FirebaseConsumptionWidget({ totalLeads }: FirebaseConsumptionWidgetProps) {
  // Estimaciones basadas en la arquitectura actual:
  // Cada lead genera ~4 escrituras
  const estimatedWrites = totalLeads * 4;

  // Con la optimización, cada carga del panel hace ~8 lecturas en vez de 8000
  // Estimamos un ahorro del 99.9%
  const oldReadsPerLoad = 8000;
  const newReadsPerLoad = 8;
  const savedReadsPerLoad = oldReadsPerLoad - newReadsPerLoad;

  // Costos de Google Cloud Firestore (Tier 1)
  // $0.036 por 100k lecturas
  // $0.108 por 100k escrituras
  const writeCost = (estimatedWrites / 100000) * 0.108;
  const savedCostPer100Loads = ((savedReadsPerLoad * 100) / 100000) * 0.036;

  return (
    <Card className="border-indigo-500/20 shadow-lg bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Control de Consumo Firestore (Estimado)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-orange-500" /> Escrituras Acumuladas
            </p>
            <p className="text-2xl font-bold">{estimatedWrites.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Costo est: ${writeCost.toFixed(4)} USD</p>
          </div>

          <div className="space-y-1 border-l pl-4 border-indigo-100 dark:border-indigo-800/30">
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="h-3 w-3" /> Optimización Activa
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">99.9%</p>
            <p className="text-xs text-muted-foreground">Ahorro en lecturas del panel</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-800/30">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowDownCircle className="h-3 w-3 text-indigo-500" />
            Arquitectura de Contadores Distribuidos previene {savedReadsPerLoad.toLocaleString()}{' '}
            lecturas por carga, ahorrando ~${savedCostPer100Loads.toFixed(3)} USD cada 100 recargas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
