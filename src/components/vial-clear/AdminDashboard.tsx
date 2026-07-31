'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  deleteExpiredConsultations,
  deleteSimitCaptures,
  updateShowcaseConfig,
  updateFooterConfig,
} from '@/app/admin/actions';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { ToastAction } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SHOWCASE_DEFAULTS } from '@/lib/config-constants';
import {
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Globe,
  Loader2,
  Trash2,
  Image as ImageIcon,
  Upload,
  ShieldCheck,
  LogOut,
  BarChart3,
  LayoutGrid,
  RotateCcw,
  Gift,
  Key,
  CreditCard,
  FileDown,
} from 'lucide-react';
import { TableroFlujoTrabajo } from '@/components/vial-clear/TableroFlujoTrabajo';
import { AnalyticsView } from '@/components/vial-clear/AnalyticsView';
import { ReferralsAdminView } from '@/components/vial-clear/ReferralsAdminView';
import { SalesAdminView } from '@/components/vial-clear/SalesAdminView';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { ThemeToggle } from '@/components/vial-clear/ThemeToggle';
import { ModalAuthPin } from '@/components/vial-clear/ModalAuthPin';
import { ModalAuthGodMode } from '@/components/vial-clear/ModalAuthGodMode';
// Removed HiddenAuditPanel
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const showcaseSchema = z.object({
  counterValue: z.string().optional(),
  counterLabel: z.string().optional(),
});

const footerSchema = z.object({
  whatsapp: z.string().min(10, 'El número debe tener al menos 10 dígitos'),
  email: z.string().email('Email inválido'),
  address: z.string().min(5, 'Dirección muy corta'),
  instagramUrl: z.string().url('URL inválida').or(z.literal('')),
  facebookUrl: z.string().url('URL inválida').or(z.literal('')),
});

type ShowcaseFormData = z.infer<typeof showcaseSchema>;
type FooterFormData = z.infer<typeof footerSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-8 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-7">
      <div className="mt-0.5 p-2 rounded-xl bg-muted text-muted-foreground">{icon}</div>
      <div>
        <h2 className="text-base font-semibold text-foreground leading-snug">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-5">{children}</div>;
}

function ActionButton({
  onClick,
  disabled,
  loading,
  icon,
  label,
  variant = 'primary',
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const base =
    'h-11 px-5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50';
  const variants = {
    primary: 'bg-foreground text-background hover:opacity-90',
    secondary: 'border border-border/70 bg-transparent hover:bg-muted text-foreground',
    danger:
      'bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCleaningSimit, setIsCleaningSimit] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [pinAuth, setPinAuth] = useState<{
    isOpen: boolean;
    actionName: string;
    onSuccess: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, actionName: '', onSuccess: () => {} });

  const [godModeAuth, setGodModeAuth] = useState<{
    isOpen: boolean;
    actionName: string;
    onSuccess: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, actionName: '', onSuccess: () => {} });

  const handleDownloadGeneric = async (type: string) => {
    try {
      const res = await fetch(`/api/admin/documentos/generate-generic?type=${type}&format=pdf`);
      if (!res.ok) {
        toast({
          title: 'Acceso Denegado',
          description: 'No autorizado. La sesión de Modo Dios expiró o es inválida.',
          variant: 'destructive',
        });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_${type}.pdf`; // Cambiado a PDF a petición
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (_error) {
      toast({
        title: 'Error de red',
        description: 'Fallo al procesar la descarga de la plantilla.',
        variant: 'destructive',
      });
    }
  };
  // Removed isAuditOpen state

  const showcaseRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'site_config', 'showcase') : null),
    [firestore]
  );
  const footerRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'site_config', 'footer') : null),
    [firestore]
  );

  const { data: showcaseData } = useDoc<{
    beforeImageUrl: string;
    afterImageUrl: string;
    counterValue: string;
    counterLabel: string;
  }>(showcaseRef, { suppressGlobalError: true });

  const { data: footerData } = useDoc<{
    whatsapp: string;
    email: string;
    address: string;
    instagramUrl: string;
    facebookUrl: string;
  }>(footerRef, { suppressGlobalError: true });

  const tasasRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'config', 'tasas_legales') : null),
    [firestore]
  );
  const { data: tasasData } = useDoc<{
    usuraEA: number;
    updatedAt: any;
    history: any[];
  }>(tasasRef, { suppressGlobalError: true });

  const {
    leadsParaKanban,
    casosParaKanban,
    isLoadingKanban,
    loadMoreLeads,
    loadMoreCases,
    hasMoreLeads,
    hasMoreCases,
    isLoadingMore,
    refreshKanban,
    realtimeNewLeadsCount,
  } = useAdminStats(auth);

  // 📊 Cálculo de Carga de Trabajo por Operador (Round-Robin)
  const workloadByOperator = useMemo(() => {
    const combined = [...(leadsParaKanban || []), ...(casosParaKanban || [])];
    const stats: Record<string, { count: number; name: string }> = {};

    combined.forEach((item) => {
      // Excluir finalizados o descartados
      if (item.estado === 'FINALIZADO' || item.estado === 'DESCARTADO') return;

      if (item.assignedToEmail) {
        const email = item.assignedToEmail;
        if (!stats[email]) {
          stats[email] = { count: 0, name: email.split('@')[0] };
        }
        stats[email].count += 1;
      }
    });

    const total = Object.values(stats).reduce((acc, curr) => acc + curr.count, 0);
    return {
      stats: Object.values(stats).sort((a, b) => b.count - a.count),
      total: total || 1, // Evitar división por cero
    };
  }, [leadsParaKanban, casosParaKanban]);

  // 🔒 Tab-Lock Removido por petición del usuario (Soporte Multi-Pestaña)

  // 🔒 Auto-logout por inactividad
  useInactivityLogout({
    timeoutMs: 15 * 60 * 1000,
    enabled: !!auth?.currentUser,
    onWarning: () => {
      toast({
        title: '⚠️ Sesión expirará pronto',
        description: 'Cierre automático en 60 segundos por inactividad.',
        duration: 55000,
        action: (
          <ToastAction
            altText="Mantener sesión"
            onClick={() => {
              window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
            }}
          >
            Mantener sesión
          </ToastAction>
        ),
      });
    },
    onLogout: () => {
      window.location.href = '/logout?reason=inactividad';
    },
  });

  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    if (analyticsEnabled && auth?.currentUser) {
      auth.currentUser.getIdToken().then(setIdToken);
    }
  }, [analyticsEnabled, auth?.currentUser]);

  const {
    analytics: analyticsData,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
  } = useAdminAnalytics(idToken);

  const showcaseForm = useForm<ShowcaseFormData>({
    resolver: zodResolver(showcaseSchema),
    defaultValues: {
      counterValue: showcaseData?.counterValue || '204+',
      counterLabel: showcaseData?.counterLabel || 'Casos Exitosos',
    },
  });

  const footerForm = useForm<FooterFormData>({
    resolver: zodResolver(footerSchema),
    defaultValues: {
      whatsapp: footerData?.whatsapp || '573005648309',
      email: footerData?.email || 'contacto@desmulta.vercel.app',
      address: footerData?.address || 'Colombia, Servicio Nacional',
      instagramUrl: footerData?.instagramUrl || '',
      facebookUrl: footerData?.facebookUrl || '',
    },
  });

  useEffect(() => {
    if (showcaseData) {
      showcaseForm.reset({
        counterValue: showcaseData.counterValue || '204+',
        counterLabel: showcaseData.counterLabel || 'Casos Exitosos',
      });
    }
  }, [showcaseData, showcaseForm]);

  useEffect(() => {
    if (footerData) {
      footerForm.reset({
        whatsapp: footerData.whatsapp || '573005648309',
        email: footerData.email || 'contacto@desmulta.vercel.app',
        address: footerData.address || 'Colombia, Servicio Nacional',
        instagramUrl: footerData.instagramUrl || '',
        facebookUrl: footerData.facebookUrl || '',
      });
    }
  }, [footerData, footerForm]);

  const onShowcaseSubmit = useCallback(
    async (data: ShowcaseFormData) => {
      setIsSubmitting(true);
      if (!firestore || !showcaseRef) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Sin conexión a base de datos.',
        });
        setIsSubmitting(false);
        return;
      }
      try {
        const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
        const updateRes = await updateShowcaseConfig(idToken, {
          beforeImageUrl: showcaseData?.beforeImageUrl || '',
          afterImageUrl: showcaseData?.afterImageUrl || '',
          counterValue: data.counterValue || showcaseData?.counterValue || '754+',
          counterLabel: data.counterLabel || showcaseData?.counterLabel || 'Casos Exitosos',
        });
        if (!updateRes.success) throw new Error(updateRes.error);
        toast({ title: 'Contador actualizado', description: 'Los cambios ya son visibles.' });
        showcaseForm.reset({
          counterValue: data.counterValue || showcaseData?.counterValue || '754+',
          counterLabel: data.counterLabel || showcaseData?.counterLabel || 'Casos Exitosos',
        });
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Error al actualizar',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [auth, firestore, showcaseData, showcaseForm, showcaseRef, toast]
  );

  const onFooterSubmit = useCallback(
    async (data: FooterFormData) => {
      setIsSubmitting(true);
      try {
        const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
        const updateRes = await updateFooterConfig(idToken, data);
        if (!updateRes.success) throw new Error(updateRes.error);
        toast({ title: 'Datos de contacto guardados' });
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Error al actualizar',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [auth, toast]
  );

  const handleClearShowcase = useCallback(async () => {
    setIsSubmitting(true);
    try {
      if (showcaseRef) {
        const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
        const updateRes = await updateShowcaseConfig(idToken, {
          ...SHOWCASE_DEFAULTS,
          counterValue: showcaseData?.counterValue || '0',
          counterLabel: showcaseData?.counterLabel || 'Casos',
        });
        if (!updateRes.success) throw new Error(updateRes.error);
        toast({ title: 'Contador restablecido' });
        showcaseForm.reset();
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo restablecer.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [auth, showcaseData, showcaseForm, showcaseRef, toast]);

  const handleDeleteExpired = useCallback(async () => {
    setIsCleaning(true);
    try {
      const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
      const result = await deleteExpiredConsultations(idToken);
      if (result.error) throw new Error(result.error);
      toast({
        title: result.count === 0 ? 'Sin pendientes' : `${result.count} consultas eliminadas`,
        description:
          result.count === 0
            ? 'No hay consultas vencidas.'
            : 'Consultas de más de 7 días depuradas.',
      });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error en mantenimiento.',
      });
    } finally {
      setIsCleaning(false);
    }
  }, [auth, toast]);

  const handleDeleteSimitCaptures = useCallback(async () => {
    setIsCleaningSimit(true);
    try {
      const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
      const result = await deleteSimitCaptures(idToken);
      if (result.error) throw new Error(result.error);
      toast({
        title: result.count === 0 ? 'Storage limpio' : `${result.count} archivos eliminados`,
      });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al limpiar.',
      });
    } finally {
      setIsCleaningSimit(false);
    }
  }, [auth, toast]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-default select-none touch-manipulation"
            onClick={(e) => {
              if (e.detail === 3) window.location.href = '/admin/auditoria';
            }}
          >
            <ShieldCheck size={18} className="text-primary" />
            <span className="font-semibold text-sm tracking-tight">Panel Desmulta</span>
            <span className="hidden sm:inline text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
              Administración
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/api-keys"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Gestión de API Keys B2B"
            >
              <Key size={16} />
            </a>
            <a
              href="/admin/gallery"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Galería"
            >
              <ImageIcon size={16} />
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground rounded-xl"
                  title="Plantillas Genéricas (Modo Dios)"
                >
                  <FileDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 rounded-xl shadow-lg border-border/50"
              >
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                  <span>Modo Dios</span>
                  <span className="text-[10px] font-black bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">
                    .PDF
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem
                  onClick={() =>
                    setGodModeAuth({
                      isOpen: true,
                      actionName: 'Generar Petición General',
                      onSuccess: () => handleDownloadGeneric('peticion_general'),
                    })
                  }
                  className="justify-between cursor-pointer rounded-lg hover:bg-muted/50 focus:bg-muted/50 my-1"
                >
                  <span className="font-medium text-sm">Petición General</span>
                  <span className="text-muted-foreground text-xs">$39,000</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setGodModeAuth({
                      isOpen: true,
                      actionName: 'Generar Prescripción Directa',
                      onSuccess: () => handleDownloadGeneric('prescripcion_directa'),
                    })
                  }
                  className="justify-between cursor-pointer rounded-lg hover:bg-muted/50 focus:bg-muted/50 my-1"
                >
                  <span className="font-medium text-sm">Prescripción Directa</span>
                  <span className="text-muted-foreground text-xs">$59,000</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setGodModeAuth({
                      isOpen: true,
                      actionName: 'Generar Doble Prescripción',
                      onSuccess: () => handleDownloadGeneric('doble_prescripcion'),
                    })
                  }
                  className="justify-between cursor-pointer rounded-lg hover:bg-muted/50 focus:bg-muted/50 my-1"
                >
                  <span className="font-medium text-sm">Doble Prescripción</span>
                  <span className="text-muted-foreground text-xs">$79,000</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setGodModeAuth({
                      isOpen: true,
                      actionName: 'Generar Nulidad Notificación',
                      onSuccess: () => handleDownloadGeneric('nulidad_notificacion'),
                    })
                  }
                  className="justify-between cursor-pointer rounded-lg hover:bg-muted/50 focus:bg-muted/50 my-1"
                >
                  <span className="font-medium text-sm">Nulidad por Notificación</span>
                  <span className="text-muted-foreground text-xs">$49,000</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setGodModeAuth({
                      isOpen: true,
                      actionName: 'Generar Tutela',
                      onSuccess: () => handleDownloadGeneric('tutela_silencio'),
                    })
                  }
                  className="justify-between cursor-pointer rounded-lg hover:bg-muted/50 focus:bg-muted/50 my-1"
                >
                  <span className="font-medium text-sm">Tutela (Silencio Admin)</span>
                  <span className="text-muted-foreground text-xs">$39,000</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setGodModeAuth({
                      isOpen: true,
                      actionName: 'Generar Caducidad 1 Año',
                      onSuccess: () => handleDownloadGeneric('caducidad_1_anio'),
                    })
                  }
                  className="justify-between cursor-pointer rounded-lg hover:bg-muted/50 focus:bg-muted/50 my-1"
                >
                  <span className="font-medium text-sm">Caducidad 1 Año</span>
                  <span className="text-muted-foreground text-xs">$59,000</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setGodModeAuth({
                      isOpen: true,
                      actionName: 'Generar Nulidad Identidad',
                      onSuccess: () => handleDownloadGeneric('nulidad_falta_identidad'),
                    })
                  }
                  className="justify-between cursor-pointer rounded-lg hover:bg-muted/50 focus:bg-muted/50 my-1"
                >
                  <span className="font-medium text-sm">Nulidad por Identidad</span>
                  <span className="text-muted-foreground text-xs">$49,000</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.location.href = '/logout?reason=manual';
              }}
              className="gap-1.5 text-muted-foreground hover:text-foreground rounded-xl text-xs"
            >
              <LogOut size={14} />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* ── Page title ── */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Panel principal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de expedientes, métricas y configuración institucional.
          </p>
        </div>

        {/* ── Tabs ── */}
        <Tabs
          defaultValue="kanban"
          className="space-y-6"
          onValueChange={(v) => {
            if (v === 'analytics') setAnalyticsEnabled(true);
          }}
        >
          <TabsList className="bg-muted/60 rounded-xl h-11 p-1 w-full md:w-auto overflow-x-auto flex flex-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger
              value="kanban"
              className="rounded-lg px-5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all gap-2"
            >
              <LayoutGrid size={14} />
              Gestión Operativa
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-lg px-5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all gap-2"
            >
              <BarChart3 size={14} />
              Estadísticas
            </TabsTrigger>
            <TabsTrigger
              value="referrals"
              className="rounded-lg px-5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all gap-2"
            >
              <Gift size={14} />
              Referidos VIP
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="rounded-lg px-5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all gap-2"
            >
              <CreditCard size={14} />
              Ventas
            </TabsTrigger>
          </TabsList>

          {/* ── Kanban ── */}
          <TabsContent value="kanban" className="outline-none space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Flujo de trabajo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conversión de ciudadanos a expedientes activos.
                </p>
              </div>
              <ActionButton
                onClick={refreshKanban}
                loading={isLoadingKanban}
                icon={<RotateCcw size={14} />}
                label="Actualizar"
                variant="secondary"
              />
            </div>

            {/* 📊 Indicador de Carga de Trabajo */}
            {workloadByOperator.stats.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Distribución de Carga (Consultas Activas)
                </h3>
                <div className="space-y-3">
                  {workloadByOperator.stats.map((op: { name: string; count: number }) => {
                    const percentage = Math.round((op.count / workloadByOperator.total) * 100);
                    return (
                      <div key={op.name} className="flex items-center gap-3">
                        <div
                          className="w-24 truncate text-sm font-medium text-slate-700 dark:text-slate-300"
                          title={op.name}
                        >
                          {op.name}
                        </div>
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-xs font-semibold text-slate-500">
                          {op.count} <span className="opacity-50">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <TableroFlujoTrabajo
              leadsReales={leadsParaKanban}
              casosReales={casosParaKanban}
              refreshKanban={refreshKanban}
              loadMoreLeads={loadMoreLeads}
              loadMoreCases={loadMoreCases}
              hasMoreLeads={hasMoreLeads}
              hasMoreCases={hasMoreCases}
              _isLoadingMore={isLoadingMore}
              realtimeNewLeadsCount={realtimeNewLeadsCount}
            />
          </TabsContent>

          {/* ── Analytics ── */}
          <TabsContent value="analytics" className="outline-none space-y-4">
            {/* ── Tasas Legales ── */}
            <SectionCard>
              <SectionHeader
                icon={<BarChart3 size={16} />}
                title="Tasas Legales y Financieras"
                description="La Tasa de Usura es administrada y actualizada automáticamente por un Cron Job."
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-xl bg-muted/30 border border-border/50 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Tasa de Usura Actual (E.A.)
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight">
                      {tasasData?.usuraEA ? (tasasData.usuraEA * 100).toFixed(2) : '---'}%
                    </span>
                    <span className="text-xs text-muted-foreground">Efectivo Anual</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Última actualización:{' '}
                    {tasasData?.updatedAt?.toDate
                      ? tasasData.updatedAt.toDate().toLocaleString('es-CO')
                      : 'Sincronizando...'}
                  </p>
                </div>
                <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Sincronización Automática Activa
                </div>
              </div>
            </SectionCard>

            <AnalyticsView
              data={analyticsData}
              isLoading={isAnalyticsLoading}
              error={analyticsError}
            />
          </TabsContent>

          {/* ── Referidos VIP ── */}
          <TabsContent value="referrals" className="outline-none">
            <ReferralsAdminView auth={auth} />
          </TabsContent>

          {/* ── Ventas y Pagos ── */}
          <TabsContent value="sales" className="outline-none">
            <SalesAdminView />
          </TabsContent>
        </Tabs>

        {/* ── Divider ── */}
        <div className="h-px bg-border/40" />

        {/* ── Showcase Config ── */}
        <SectionCard>
          <SectionHeader
            icon={<BarChart3 size={16} />}
            title="Estadísticas públicas"
            description="Actualiza los contadores visibles en la página de inicio."
          />
          <Form {...showcaseForm}>
            <form onSubmit={showcaseForm.handleSubmit(onShowcaseSubmit)} className="space-y-5">
              <FieldRow>
                <FormField
                  control={showcaseForm.control}
                  name="counterValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Valor
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="204+" className="h-11 rounded-xl text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={showcaseForm.control}
                  name="counterLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Etiqueta
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Casos Exitosos"
                          className="h-11 rounded-xl text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldRow>
              <div className="flex gap-3 pt-1">
                <ActionButton
                  loading={isSubmitting}
                  icon={<Upload size={14} />}
                  label="Guardar cambios"
                  variant="primary"
                />
                <ActionButton
                  onClick={handleClearShowcase}
                  disabled={isSubmitting}
                  icon={<RotateCcw size={14} />}
                  label="Restablecer"
                  variant="secondary"
                />
              </div>
            </form>
          </Form>
        </SectionCard>

        {/* ── Footer Config ── */}
        <SectionCard>
          <SectionHeader
            icon={<Globe size={16} />}
            title="Datos institucionales"
            description="Información de contacto visible en el pie de página del sitio."
          />
          <Form {...footerForm}>
            <form onSubmit={footerForm.handleSubmit(onFooterSubmit)} className="space-y-5">
              <FieldRow>
                <FormField
                  control={footerForm.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Phone size={11} /> WhatsApp
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 rounded-xl text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={footerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Mail size={11} /> Email
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 rounded-xl text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldRow>
              <FormField
                control={footerForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <MapPin size={11} /> Dirección
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="h-11 rounded-xl text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FieldRow>
                <FormField
                  control={footerForm.control}
                  name="instagramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Instagram size={11} /> Instagram
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://instagram.com/..."
                          className="h-11 rounded-xl text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={footerForm.control}
                  name="facebookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Facebook size={11} /> Facebook
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://facebook.com/..."
                          className="h-11 rounded-xl text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldRow>
              <div className="pt-1">
                <ActionButton
                  loading={isSubmitting}
                  icon={<Upload size={14} />}
                  label="Guardar datos de contacto"
                  variant="primary"
                />
              </div>
            </form>
          </Form>
        </SectionCard>

        {/* ── Maintenance ── */}
        <SectionCard>
          <SectionHeader
            icon={<Trash2 size={16} />}
            title="Mantenimiento"
            description="Acciones de limpieza irreversibles. Requieren confirmación."
          />
          <div className="space-y-4">
            {/* Row 1: Consultas vencidas */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border/40">
              <div>
                <p className="text-sm font-medium">Consultas vencidas</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Elimina registros de más de 7 días sin actividad.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ActionButton
                    disabled={isCleaning}
                    loading={isCleaning}
                    icon={<Trash2 size={14} />}
                    label="Depurar"
                    variant="danger"
                  />
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base">
                      ¿Depurar consultas vencidas?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      Esta acción es irreversible. Se eliminarán todas las consultas de más de 7
                      días.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-sm">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setPinAuth({
                          isOpen: true,
                          actionName: 'Depurar Consultas Vencidas',
                          onSuccess: handleDeleteExpired,
                        });
                      }}
                      className="rounded-xl bg-destructive text-sm"
                    >
                      Sí, depurar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Row 2: Capturas SIMIT */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border/40">
              <div>
                <p className="text-sm font-medium">Capturas SIMIT</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Borra archivos temporales del almacenamiento de SIMIT.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <ActionButton
                    disabled={isCleaningSimit}
                    loading={isCleaningSimit}
                    icon={<ImageIcon size={14} />}
                    label="Limpiar"
                    variant="secondary"
                  />
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base">
                      ¿Vaciar almacenamiento SIMIT?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      Se eliminarán todas las capturas temporales. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-sm">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setPinAuth({
                          isOpen: true,
                          actionName: 'Vaciar SIMIT',
                          onSuccess: handleDeleteSimitCaptures,
                        });
                      }}
                      className="rounded-xl text-sm"
                    >
                      Sí, limpiar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </SectionCard>
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-7xl mx-auto px-6 py-8 mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground/50">
          <span>Desmulta Admin v1.0.0</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={11} />
            Sesión cifrada · HttpOnly cookie
          </span>
        </div>
      </footer>

      <ModalAuthPin
        isOpen={pinAuth.isOpen}
        actionName={pinAuth.actionName}
        onSuccess={pinAuth.onSuccess}
        onCancel={pinAuth.onCancel}
        onClose={() => setPinAuth((prev) => ({ ...prev, isOpen: false }))}
      />

      <ModalAuthGodMode
        isOpen={godModeAuth.isOpen}
        actionName={godModeAuth.actionName}
        onSuccess={godModeAuth.onSuccess}
        onCancel={godModeAuth.onCancel}
        onClose={() => setGodModeAuth((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* HiddenAuditPanel was moved to /admin/auditoria */}
    </div>
  );
}
