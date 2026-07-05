'use client';
import React, { useMemo } from 'react';
import { FirebaseConsumptionWidget } from '@/app/admin/components/FirebaseConsumptionWidget';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AnalyticsData } from '@/hooks/useAnalyticsStats';
import {
  TrendingUp,
  Users,
  Briefcase,
  Target,
  Loader2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

// ─── Paleta neutral y semántica ────────────────────────────────────────────────
const PALETTE = [
  'hsl(220,80%,55%)',
  'hsl(160,60%,40%)',
  'hsl(38,90%,50%)',
  'hsl(0,65%,55%)',
  'hsl(270,55%,55%)',
];

// ─── Tooltip personalizado ─────────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  valueLabel = '',
}: {
  active?: boolean;
  payload?: readonly {
    value?: number | string | readonly (number | string)[];
    name?: string | number;
    color?: string;
  }[];
  label?: string | number;
  valueLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border/60 rounded-xl shadow-lg px-4 py-3 text-sm">
      {label && <p className="text-muted-foreground mb-1 text-xs">{label}</p>}
      <p className="font-semibold text-foreground">
        {Number(payload[0].value).toLocaleString('es-CO')}{' '}
        <span className="font-normal text-muted-foreground">{valueLabel}</span>
      </p>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  trend: string;
  trendType?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
}

function KPICard({
  title,
  value,
  icon,
  description,
  trend,
  trendType = 'up',
  highlight = false,
}: KPICardProps) {
  const TrendIcon =
    trendType === 'up' ? ArrowUpRight : trendType === 'down' ? ArrowDownRight : Minus;
  const trendColor =
    trendType === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trendType === 'down'
        ? 'text-red-500'
        : 'text-muted-foreground';

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all hover:shadow-sm ${
        highlight ? 'bg-primary/[0.03] border-primary/20' : 'bg-card border-border/60'
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`p-2 rounded-xl ${highlight ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
        >
          {icon}
        </div>
        <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
          <TrendIcon size={12} />
          {trend}
        </span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
          {title}
        </p>
        <div className="text-3xl font-semibold tracking-tight leading-none">{value}</div>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </div>
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface AnalyticsViewProps {
  data: AnalyticsData | null;
  isLoading: boolean;
  error?: string | null;
}

export function AnalyticsView({ data, isLoading, error }: AnalyticsViewProps) {
  // Formato para eje X de fechas
  const growthData = data?.growthData;
  const formattedGrowthData = useMemo(() => {
    if (!growthData) return [];
    return growthData.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
    }));
  }, [growthData]);

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
        <p className="text-sm text-muted-foreground">Cargando métricas…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/40 bg-muted/20">
        <TrendingUp className="w-7 h-7 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground max-w-xs text-center">
          {error || 'No se pudieron cargar las métricas. Verifica tu conexión.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── Widget de Consumo Firebase ── */}
      <FirebaseConsumptionWidget totalLeads={data.totalLeads} />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Prospectos"
          value={data.prospectosTotales.toLocaleString('es-CO')}
          icon={<Users size={16} />}
          description="Calculadoras y OCR"
          trend="+15%"
          trendType="up"
        />
        <KPICard
          title="Consultas"
          value={data.totalLeads.toLocaleString('es-CO')}
          icon={<Target size={16} />}
          description="Formularios enviados"
          trend="+12%"
          trendType="up"
        />
        <KPICard
          title="Casos activos"
          value={data.totalCases.toLocaleString('es-CO')}
          icon={<Briefcase size={16} />}
          description="En trámite legal"
          trend="+5%"
          trendType="up"
        />
        <KPICard
          title="Conversión"
          value={`${data.conversionGlobal}%`}
          icon={<TrendingUp size={16} />}
          description="Prospecto → caso real"
          trend="+2.4%"
          trendType="up"
          highlight
        />
        <KPICard
          title="Resolución"
          value={data.averageResolutionTime}
          icon={<Clock size={16} />}
          description="Promedio ciclo de vida"
          trend="-15%"
          trendType="down"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crecimiento */}
        <ChartCard title="Crecimiento de consultas">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={formattedGrowthData}
              margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
            >
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(220,80%,55%)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="hsl(220,80%,55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 4"
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                width={32}
              />
              <Tooltip
                content={({ active, payload, label }) => (
                  <ChartTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    valueLabel="consultas"
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(220,80%,55%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#areaGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(220,80%,55%)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tipos de infracción */}
        <ChartCard title="Tipos de infracción (top 5)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={data.infractionData}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
              barSize={14}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                horizontal={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
              />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={110}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => (
                  <ChartTooltip active={active} payload={payload} valueLabel="casos" />
                )}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.infractionData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribución de estados */}
        <ChartCard title="Distribución de estados">
          <div className="flex items-center gap-8">
            {/* Leyenda */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {data.statusData.map((item, index) => {
                const total = data.statusData.reduce((a, b) => a + b.value, 0);
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                    />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-xs font-medium tabular-nums">
                      {item.value.toLocaleString('es-CO')}
                    </span>
                    <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Donut */}
            <div className="flex-shrink-0">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={data.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={64}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => (
                      <ChartTooltip active={active} payload={payload} valueLabel="expedientes" />
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        {/* Summary stats */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 flex flex-col gap-4">
          <h3 className="text-sm font-semibold">Resumen operativo</h3>
          <div className="space-y-3">
            {[
              {
                label: 'Tasa de conversión lead→caso',
                value: `${data.conversionRate}%`,
                max: 100,
                current: parseFloat(data.conversionRate),
                color: 'bg-blue-500',
              },
              {
                label: 'Tasa conversión global',
                value: `${data.conversionGlobal}%`,
                max: 100,
                current: parseFloat(data.conversionGlobal),
                color: 'bg-emerald-500',
              },
              {
                label: 'Ocupación del pipeline',
                value: `${data.totalLeads + data.totalCases} activos`,
                max: Math.max(data.prospectosTotales, 1),
                current: data.totalLeads + data.totalCases,
                color: 'bg-amber-500',
              },
            ].map(({ label, value, max, current, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-semibold tabular-nums">{value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${Math.min(100, (current / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-2 border-t border-border/40">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Tiempo promedio de resolución</span>
              <span className="text-sm font-semibold">{data.averageResolutionTime}</span>
            </div>
          </div>
        </div>

        {/* ── Embudo de Conversión (Drop-off del Formulario) ── */}
        <div className="lg:col-span-2">
          <ChartCard title="Embudo del Formulario (Drop-off entre pasos)">
            {data.funnelData && data.funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.funnelData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    content={({ active, payload }) => (
                      <ChartTooltip active={active} payload={payload} valueLabel="usuarios" />
                    )}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                    {data.funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Sin datos de abandono registrados aún.
              </div>
            )}
          </ChartCard>
        </div>

        {/* ── Embudo de Conversión de Negocio (Growth Funnel) ── */}
        <div className="lg:col-span-2">
          <ChartCard title="Embudo de Conversión (Growth Funnel)">
            <div className="flex flex-col md:flex-row items-center gap-4 py-4 w-full justify-between">
              <div className="flex-1 w-full bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center relative">
                <Users className="w-8 h-8 text-primary mx-auto mb-3 opacity-80" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Prospectos
                </h4>
                <p className="text-3xl font-black">
                  {data.prospectosTotales.toLocaleString('es-CO')}
                </p>
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-background p-1.5 rounded-full border border-border shadow-sm text-muted-foreground">
                  <TrendingUp size={16} />
                </div>
              </div>

              <div className="flex-1 w-full bg-primary/10 border border-primary/30 rounded-2xl p-6 text-center relative transform md:scale-95 shadow-sm">
                <Target className="w-8 h-8 text-primary mx-auto mb-3 opacity-90" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Leads (Forms)
                </h4>
                <p className="text-3xl font-black">{data.totalLeads.toLocaleString('es-CO')}</p>
                <p className="text-[10px] text-muted-foreground mt-2 font-bold bg-background/80 inline-block px-2 py-1 rounded-full">
                  {data.conversionGlobal}% Conv.
                </p>
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-background p-1.5 rounded-full border border-border shadow-sm text-muted-foreground">
                  <TrendingUp size={16} />
                </div>
              </div>

              <div className="flex-1 w-full bg-primary/20 border border-primary/50 rounded-2xl p-6 text-center transform md:scale-90 shadow-md">
                <Briefcase className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Casos Activos
                </h4>
                <p className="text-3xl font-black text-primary">
                  {data.totalCases.toLocaleString('es-CO')}
                </p>
                <p className="text-[10px] text-primary mt-2 font-bold bg-background/80 inline-block px-2 py-1 rounded-full shadow-sm">
                  {data.conversionRate}% Conv.
                </p>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
