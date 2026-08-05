'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Landmark, RefreshCw } from 'lucide-react';

interface TasasLegalesWidgetProps {
  tasasData:
    | {
        usuraEA: number;
        updatedAt: string | number | null;
        history: Record<string, unknown>[];
      }
    | undefined
    | null;
}

export function TasasLegalesWidget({ tasasData }: TasasLegalesWidgetProps) {
  const isSyncing = !tasasData || !tasasData.usuraEA;
  const rate = tasasData?.usuraEA ? (tasasData.usuraEA * 100).toFixed(2) : '---';

  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isSyncing) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, [isSyncing]);

  return (
    <Card className="border shadow-lg bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-background border-amber-500/20 flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between text-amber-700 dark:text-amber-500">
          <div className="flex items-center gap-2 truncate pr-2">
            <Landmark className="h-4 w-4 shrink-0" />
            <span className="truncate">Tasa de Usura Legal</span>
          </div>
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-amber-500/70" />
          ) : (
            <span className="flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 justify-between">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1 flex-shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Interés E.A.
            </p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{rate}%</p>
          </div>

          <div className="space-y-1 border-l pl-2 border-amber-100 dark:border-amber-900/30 text-muted-foreground min-w-0 flex-1 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider truncate">Actualizado</p>
            <div className="text-xs font-medium truncate">
              {tasasData?.updatedAt ? (
                new Date(
                  typeof tasasData.updatedAt === 'string'
                    ? tasasData.updatedAt
                    : (tasasData.updatedAt as string | number)
                ).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
              ) : (
                <span className="flex items-center justify-end">
                  Sync<span className="inline-block w-2 text-left">{dots}</span>
                </span>
              )}
            </div>
            <p className="text-[9px] uppercase tracking-wider text-amber-600/70 dark:text-amber-500/70 truncate">
              {isSyncing ? 'Esperando GCP' : 'vía Cron Job'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-900/30">
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 font-medium leading-tight">
            Sincronización mensual inteligente. El motor Go usa caché RAM de 1 hora.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
