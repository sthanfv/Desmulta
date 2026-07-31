'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Landmark, RefreshCw } from 'lucide-react';

interface TasasLegalesWidgetProps {
  tasasData: {
    usuraEA: number;
    updatedAt: any;
    history: any[];
  } | undefined | null;
}

export function TasasLegalesWidget({ tasasData }: TasasLegalesWidgetProps) {
  const isSyncing = !tasasData || !tasasData.usuraEA;
  const rate = tasasData?.usuraEA ? (tasasData.usuraEA * 100).toFixed(2) : '---';
  
  return (
    <Card className="border shadow-lg bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-background border-amber-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between text-amber-700 dark:text-amber-500">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Tasa de Usura Legal (SFC)
          </div>
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Interés E.A.</p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {rate}%
            </p>
          </div>

          <div className="space-y-1 border-l pl-4 border-amber-100 dark:border-amber-900/30 text-muted-foreground">
            <p className="text-[10px] font-medium uppercase tracking-wider">Última actualización</p>
            <p className="text-sm font-medium">
              {tasasData?.updatedAt?.toDate
                ? tasasData.updatedAt.toDate().toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                : 'Sincronizando...'}
            </p>
            <p className="text-[10px]">vía Cron Job Automático</p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-900/30">
          <p className="text-xs flex items-center gap-1.5 text-amber-700/80 dark:text-amber-400/80 font-medium">
            Sincronización mensual inteligente. El motor Go usa caché RAM de 1 hora.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
