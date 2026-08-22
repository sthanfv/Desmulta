'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ChatConsumptionWidgetProps {
  requestsToday: number;
}

export function ChatConsumptionWidget({ requestsToday }: ChatConsumptionWidgetProps) {
  const DAILY_LIMIT = 1500;
  const remaining = Math.max(0, DAILY_LIMIT - requestsToday);
  const percentageUsed = (requestsToday / DAILY_LIMIT) * 100;

  // Si quedan 50 o menos, consideramos que es un estado crítico
  const isCritical = remaining <= 50;
  // Si quedan entre 51 y 200, es una advertencia
  const isWarning = remaining > 50 && remaining <= 200;

  let statusColor = 'text-green-600 dark:text-green-400';
  let progressColor = 'bg-green-500';
  let StatusIcon = CheckCircle2;

  if (isCritical) {
    statusColor = 'text-red-600 dark:text-red-400';
    progressColor = 'bg-red-500';
    StatusIcon = AlertTriangle;
  } else if (isWarning) {
    statusColor = 'text-yellow-600 dark:text-yellow-400';
    progressColor = 'bg-yellow-500';
    StatusIcon = AlertTriangle;
  }

  return (
    <Card
      className={`border shadow-lg bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-background ${isCritical ? 'border-red-500/50 animate-pulse' : 'border-teal-500/20'}`}
    >
      <CardHeader className="pb-2">
        <CardTitle
          className={`text-sm font-medium flex items-center gap-2 ${isCritical ? 'text-red-600' : 'text-teal-700 dark:text-teal-400'}`}
        >
          <MessageSquare className="h-4 w-4" />
          Consumo Motor IA (Chat)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Consumo Hoy (Free Tier)</p>
            <p className="text-2xl font-bold">
              {requestsToday.toLocaleString()} / {DAILY_LIMIT.toLocaleString()}
            </p>
          </div>

          <div
            className={`space-y-1 border-l pl-4 border-teal-100 dark:border-teal-800/30 ${statusColor}`}
          >
            <p className="text-xs flex items-center gap-1 font-medium">
              <StatusIcon className="h-3 w-3" /> Estado
            </p>
            <p className="text-2xl font-bold">{remaining.toLocaleString()}</p>
            <p className="text-xs">consultas restantes</p>
          </div>
        </div>

        {/* Barra de progreso visual */}
        <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-500 ease-in-out`}
            style={{ width: `${Math.min(100, percentageUsed)}%` }}
          />
        </div>

        {(isCritical || isWarning) && (
          <div
            className={`mt-4 pt-3 border-t ${isCritical ? 'border-red-200 dark:border-red-900/50' : 'border-yellow-200 dark:border-yellow-900/50'}`}
          >
            <p
              className={`text-xs flex items-center gap-1 ${isCritical ? 'text-red-600 dark:text-red-400 font-bold' : 'text-yellow-600 dark:text-yellow-400'}`}
            >
              <AlertTriangle className="h-3 w-3" />
              {isCritical
                ? '¡Nivel crítico de consultas! El chat perderá el modelo Gemini cuando llegue a 0. Se puede caer al modo hardcodeado.'
                : 'Atención: Nos acercamos al límite diario gratuito del Chat. Considerar contingencia.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
