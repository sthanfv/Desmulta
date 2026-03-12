'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  deleteExpiredConsultations,
  uploadImage,
  deleteSimitCaptures,
  getConsultations,
  getCases,
  updateShowcaseConfig,
  updateFooterConfig,
} from '@/app/admin/actions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

import { useToast } from '@/hooks/use-toast';
import { SHOWCASE_DEFAULTS } from '@/lib/config-constants';
import {
  Sparkle,
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
} from 'lucide-react';
import { TableroKanbanReal, KanbanItem } from '@/components/vial-clear/TableroKanbanReal';
import { ThemeToggle } from '@/components/vial-clear/ThemeToggle';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
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

const showcaseSchema = z.object({
  beforeImage: z.instanceof(FileList).optional(),
  afterImage: z.instanceof(FileList).optional(),
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

export function AdminDashboard() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCleaningSimit, setIsCleaningSimit] = useState(false);

  const showcaseRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'site_config', 'showcase') : null),
    [firestore]
  );
  const footerRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'site_config', 'footer') : null),
    [firestore]
  );

  const { data: showcaseData, isLoading: isShowcaseLoading } = useDoc<{
    beforeImageUrl: string;
    afterImageUrl: string;
    counterValue: string;
    counterLabel: string;
  }>(showcaseRef);

  const { data: footerData } = useDoc<{
    whatsapp: string;
    email: string;
    address: string;
    instagramUrl: string;
    facebookUrl: string;
  }>(footerRef);

  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  // Mapeo seguro de estados
  const mapStatusToKanban = (status: string, tipo: 'lead' | 'caso') => {
    const s = status?.toLowerCase() || '';
    if (tipo === 'lead') {
      if (s === 'contactado') return 'CONTACTADO';
      if (s === 'estudio' || s === 'en_proceso') return 'ESTUDIO';
      if (s === 'descartado') return 'DESCARTADO';
      if (s === 'finalizado' || s === 'terminado') return 'ESTUDIO'; // Por ahora, si terminó lead, se queda en el último paso visible
      return 'NUEVO';
    } else {
      if (s === 'radicado') return 'RADICADO';
      if (s === 'tramite' || s === 'resolucion' || s === 'en_espera') return 'TRAMITE';
      if (s === 'finalizado' || s === 'archivo' || s === 'descartado') return 'FINALIZADO';
      return 'APERTURA';
    }
  };

  const [leadsParaKanban, setLeadsParaKanban] = useState<KanbanItem[]>([]);
  const [casosParaKanban, setCasosParaKanban] = useState<KanbanItem[]>([]);
  const [isLoadingKanban, setIsLoadingKanban] = useState(true);

  useEffect(() => {
    const fetchKanbanData = async () => {
      setIsLoadingKanban(true);
      try {
        const [leadsRes, casesRes] = await Promise.all([getConsultations(50), getCases(50)]);

        const leadsBuffer: KanbanItem[] = [];
        const casosBuffer: KanbanItem[] = [];

        if (leadsRes.success && leadsRes.data) {
          const rawLeads = leadsRes.data as unknown as Array<{
            id: string;
            placa?: string;
            ciudad?: string;
            status: string;
            antiguedad?: string;
            createdAt?: string;
            evidenceUrl?: string;
            nombre?: string;
            cedula?: string;
            contacto?: string;
          }>;
          rawLeads.forEach((l) => {
            let ahorro = undefined;
            if (l.antiguedad?.includes('Más de 3 años')) ahorro = '$800k - $1.5M';
            else if (l.antiguedad?.includes('Entre 1 y 3 años')) ahorro = '$400k - $800k';

            leadsBuffer.push({
              id: l.id,
              placa: l.placa || 'N/A',
              ciudad: l.ciudad || 'Por definir',
              estado: mapStatusToKanban(l.status, 'lead'),
              ahorro,
              createdAt: l.createdAt,
              evidenceUrl: l.evidenceUrl,
              nombre: l.nombre,
              cedula: l.cedula,
              contacto: l.contacto,
              tipo: 'lead',
            });
          });
        }

        if (casesRes.success && casesRes.data) {
          const rawCases = casesRes.data as unknown as Array<{
            id: string;
            placa?: string;
            cedula?: string;
            ciudad?: string;
            status: string;
            createdAt?: string;
            evidenceUrl?: string;
            nombre?: string;
            contacto?: string;
          }>;
          rawCases.forEach((c) => {
            casosBuffer.push({
              id: c.id,
              placa: c.placa || c.cedula || 'N/A',
              ciudad: c.ciudad || 'Por definir',
              estado: mapStatusToKanban(c.status, 'caso'),
              createdAt: c.createdAt,
              evidenceUrl: c.evidenceUrl,
              nombre: c.nombre,
              cedula: c.cedula,
              contacto: c.contacto,
              tipo: 'caso',
            });
          });
        }
        setLeadsParaKanban(leadsBuffer);
        setCasosParaKanban(casosBuffer);
      } catch (err) {
        console.error('Error fetching kanban data', err);
      } finally {
        setIsLoadingKanban(false);
      }
    };

    fetchKanbanData();
  }, []);

  const showcaseForm = useForm<ShowcaseFormData>({
    resolver: zodResolver(showcaseSchema),
    defaultValues: {
      counterValue: showcaseData?.counterValue || '754+',
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

  // Actualizar formularios cuando los datos carguen
  useEffect(() => {
    if (showcaseData) {
      showcaseForm.reset({
        counterValue: showcaseData.counterValue || '754+',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'before') setBeforePreview(reader.result as string);
        else setAfterPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onShowcaseSubmit = async (data: ShowcaseFormData) => {
    setIsSubmitting(true);
    if (!firestore || !showcaseRef) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo conectar a la base de datos.',
      });
      setIsSubmitting(false);
      return;
    }

    let beforeImageUrl = showcaseData?.beforeImageUrl;
    let afterImageUrl = showcaseData?.afterImageUrl;

    try {
      if (data.beforeImage && data.beforeImage.length > 0) {
        const formData = new FormData();
        formData.append('beforeImage', data.beforeImage[0]);
        const result = await uploadImage(formData, 'beforeImage');
        if ('url' in result) {
          beforeImageUrl = result.url;
        } else {
          throw new Error(result.error);
        }
      }

      if (data.afterImage && data.afterImage.length > 0) {
        const formData = new FormData();
        formData.append('afterImage', data.afterImage[0]);
        const result = await uploadImage(formData, 'afterImage');
        if ('url' in result) {
          afterImageUrl = result.url;
        } else {
          throw new Error(result.error);
        }
      }

      const updateRes = await updateShowcaseConfig({
        beforeImageUrl: beforeImageUrl || '',
        afterImageUrl: afterImageUrl || '',
        counterValue: data.counterValue || showcaseData?.counterValue || '754+',
        counterLabel: data.counterLabel || showcaseData?.counterLabel || 'Casos Exitosos',
      });

      if (!updateRes.success) {
        throw new Error(updateRes.error);
      }

      toast({
        title: 'Éxito',
        description: 'Las imágenes del caso de éxito han sido actualizadas.',
      });
      setBeforePreview(null);
      setAfterPreview(null);
      showcaseForm.reset({
        counterValue: data.counterValue || showcaseData?.counterValue || '754+',
        counterLabel: data.counterLabel || showcaseData?.counterLabel || 'Casos Exitosos',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar las imágenes.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFooterSubmit = async (data: FooterFormData) => {
    setIsSubmitting(true);
    if (!firestore || !footerRef) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo conectar a la base de datos.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const updateRes = await updateFooterConfig(data);
      if (!updateRes.success) {
        throw new Error(updateRes.error);
      }
      toast({
        title: 'Footer Actualizado',
        description: 'Los datos de contacto han sido guardados correctamente.',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el footer.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearShowcase = async () => {
    setIsSubmitting(true);
    try {
      if (showcaseRef) {
        const updateRes = await updateShowcaseConfig({
          ...SHOWCASE_DEFAULTS, // Usamos defaults para vaciar
          beforeImageUrl: '',
          afterImageUrl: '',
          counterValue: showcaseData?.counterValue || '0',
          counterLabel: showcaseData?.counterLabel || 'Casos',
        });

        if (!updateRes.success) {
          throw new Error(updateRes.error);
        }

        toast({
          title: 'Caso eliminado',
          description: 'El caso de éxito fue retirado de la vista pública.',
        });
        setBeforePreview(null);
        setAfterPreview(null);
        showcaseForm.reset();
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el caso actual.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpired = async () => {
    setIsCleaning(true);
    try {
      const result = await deleteExpiredConsultations();

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error de limpieza',
          description: result.error,
        });
        return;
      }

      if (result.count === 0) {
        toast({
          title: 'Todo limpio',
          description: 'No se encontraron consultas vencidas para eliminar.',
        });
      } else {
        toast({
          title: '¡Limpieza completada!',
          description: `Se eliminaron ${result.count} consultas vencidas.`,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error interno',
        description: 'Ocurrió un problema de servidor al intentar eliminar las consultas.',
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleDeleteSimitCaptures = async () => {
    setIsCleaningSimit(true);
    try {
      const result = await deleteSimitCaptures();

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error de limpieza SIMIT',
          description: result.error,
        });
        return;
      }

      if (result.count === 0) {
        toast({
          title: 'Storage Limpio',
          description: 'No se encontraron capturas de SIMIT para eliminar.',
        });
      } else {
        toast({
          title: '¡SIMIT Limpio!',
          description: `Se eliminaron ${result.count} capturas del servidor Vercel Blob.`,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error interno',
        description: 'Ocurrió un problema al intentar conectar con Vercel Blob.',
      });
    } finally {
      setIsCleaningSimit(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background radial gradient for consistency */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,191,0,0.06)_0%,transparent_40%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,191,0,0.04)_0%,transparent_40%)] pointer-events-none" />

      <header className="px-6 py-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto glass rounded-[2.5rem] px-8 py-4 flex justify-between items-center shadow-2xl border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground tracking-tight leading-none">
                PANEL CONTROL
              </h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-70">
                Desmulta Administrador v2.4.4
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={() => auth?.signOut()}
              className="rounded-full hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all gap-2 font-bold px-4"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 space-y-24">
        <section className="space-y-12 shrink-0 pt-0 animate-in fade-in zoom-in-95 duration-500">
          {isLoadingKanban ? (
            <div className="flex flex-col items-center justify-center p-20 opacity-60">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">
                Cargando Centro de Comando...
              </p>
            </div>
          ) : (
            <TableroKanbanReal leadsReales={leadsParaKanban} casosReales={casosParaKanban} />
          )}
        </section>

        {/* Tarjeta de Gestión de Casos de Éxito */}
        <section className="floating-card bg-card/40 backdrop-blur-md border border-white/10 p-10 shadow-3xl overflow-hidden relative group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <Sparkle className="text-primary w-8 h-8" />
              Historias de Éxito
            </h2>
            <p className="text-muted-foreground mt-3 text-lg max-w-2xl font-medium leading-relaxed">
              Actualiza los datos e imágenes que demuestran la efectividad de nuestra gestión
              administrativa.
            </p>
          </div>

          <Form {...showcaseForm}>
            <form onSubmit={showcaseForm.handleSubmit(onShowcaseSubmit)} className="space-y-12">
              {/* Configuración del Contador */}
              <div className="grid md:grid-cols-2 gap-10 bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10">
                <FormField
                  control={showcaseForm.control}
                  name="counterValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70">
                        Valor del Contador (Ej: 1k+, 500+)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1k+"
                          className="bg-background border-border/50 rounded-2xl h-14"
                          {...field}
                        />
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
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70">
                        Etiqueta (Ej: Sanciones Eliminadas)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sanciones Eliminadas"
                          className="bg-background border-border/50 rounded-2xl h-14"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <FormField
                  control={showcaseForm.control}
                  name="beforeImage"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70 pl-1">
                        Estado Anterior (Antes)
                      </FormLabel>
                      <div className="aspect-video relative bg-black/5 dark:bg-black/20 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center transition-all hover:bg-primary/5">
                        {isShowcaseLoading ? (
                          <Loader2 className="animate-spin text-primary w-10 h-10" />
                        ) : beforePreview || showcaseData?.beforeImageUrl ? (
                          <Image
                            src={beforePreview || showcaseData?.beforeImageUrl || ''}
                            alt="Vista previa de la imagen de Antes"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center gap-4">
                            <ImageIcon className="h-16 w-16 opacity-20" />
                            <p className="text-sm font-bold opacity-60">No hay imagen cargada</p>
                          </div>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          className="bg-background border-border/50 rounded-2xl h-14 py-3 active:ring-primary/20"
                          onChange={(e) => {
                            field.onChange(e.target.files);
                            handleFileChange(e, 'before');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={showcaseForm.control}
                  name="afterImage"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70 pl-1">
                        Resultado (Después)
                      </FormLabel>
                      <div className="aspect-video relative bg-black/5 dark:bg-black/20 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center transition-all hover:bg-primary/5">
                        {isShowcaseLoading ? (
                          <Loader2 className="animate-spin text-primary w-10 h-10" />
                        ) : afterPreview || showcaseData?.afterImageUrl ? (
                          <Image
                            src={afterPreview || showcaseData?.afterImageUrl || ''}
                            alt="Vista previa de la imagen de Después"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center gap-4">
                            <ImageIcon className="h-16 w-16 opacity-20" />
                            <p className="text-sm font-bold opacity-60">Sin imagen de resultado</p>
                          </div>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          className="bg-background border-border/50 rounded-2xl h-14 py-3 active:ring-primary/20"
                          onChange={(e) => {
                            field.onChange(e.target.files);
                            handleFileChange(e, 'after');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-6 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-16 rounded-[2rem] bg-primary text-primary-foreground font-black text-lg active:scale-95 transition-all shadow-xl shadow-primary/20 border-none"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  ) : (
                    <Upload className="mr-3 h-6 w-6" />
                  )}
                  SINCRONIZAR CASO
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    isSubmitting || (!showcaseData?.beforeImageUrl && !showcaseData?.afterImageUrl)
                  }
                  onClick={handleClearShowcase}
                  className="flex-1 h-16 rounded-[2rem] border-destructive/20 text-destructive hover:bg-destructive hover:text-white active:scale-95 transition-all font-black"
                >
                  <Trash2 className="mr-3 h-6 w-6" />
                  VACIAR MÓDULO
                </Button>
              </div>
            </form>
          </Form>
        </section>

        {/* Tarjeta de Configuración del Pie de Página */}
        <section className="floating-card bg-card/40 backdrop-blur-md border border-white/10 p-10 shadow-3xl overflow-hidden relative group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="mb-12">
            <h2 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <Globe className="text-primary w-8 h-8" />
              Identidad Institucional
            </h2>
            <p className="text-muted-foreground mt-3 text-lg max-w-2xl font-medium leading-relaxed">
              Gestiona la información de contacto y enlaces sociales que aparecen en el pie de
              página de la plataforma.
            </p>
          </div>

          <Form {...footerForm}>
            <form onSubmit={footerForm.handleSubmit(onFooterSubmit)} className="space-y-10">
              <div className="grid md:grid-cols-2 gap-8">
                <FormField
                  control={footerForm.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70 flex items-center gap-2">
                        <Phone size={14} className="text-primary" />
                        WhatsApp (Sin espacios)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="57300..."
                          className="bg-background border-border/50 rounded-2xl h-14"
                          {...field}
                        />
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
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70 flex items-center gap-2">
                        <Mail size={14} className="text-primary" />
                        Email de Soporte
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="contacto@desmulta.vercel.app"
                          className="bg-background border-border/50 rounded-2xl h-14"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={footerForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70 flex items-center gap-2">
                      <MapPin size={14} className="text-primary" />
                      Ubicación / Oficina
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Dirección física o ciudad"
                        className="bg-background border-border/50 rounded-2xl h-14"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-8">
                <FormField
                  control={footerForm.control}
                  name="instagramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70 flex items-center gap-2">
                        <Instagram size={14} className="text-primary" />
                        Perfil Instagram (URL)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://instagram.com/..."
                          className="bg-background border-border/50 rounded-2xl h-14"
                          {...field}
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
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70 flex items-center gap-2">
                        <Facebook size={14} className="text-primary" />
                        Perfil Facebook (URL)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://facebook.com/..."
                          className="bg-background border-border/50 rounded-2xl h-14"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-16 rounded-[2rem] bg-foreground text-background hover:bg-foreground/90 font-black text-lg active:scale-95 transition-all shadow-xl shadow-foreground/10 border-none"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="mr-3 h-6 w-6" />
                )}
                ACTUALIZAR DATOS INSTITUCIONALES
              </Button>
            </form>
          </Form>
        </section>

        {/* Maintenance Card */}
        <section className="floating-card bg-destructive/5 dark:bg-destructive/[0.02] border border-destructive/10 p-10 shadow-3xl space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex-1 space-y-3">
              <h2 className="text-2xl font-black text-destructive flex items-center gap-3">
                <Trash2 className="w-8 h-8" />
                Mantenimiento de Base de Datos
              </h2>
              <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                El sistema detectará y eliminará <strong>únicamente</strong> las consultas que
                tengan más de 7 días de antigüedad para cumplimiento de ley y ahorro de recursos.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isCleaning}
                  className="h-16 px-10 rounded-3xl font-black text-lg active:scale-95 transition-all shadow-2xl shadow-destructive/20"
                >
                  {isCleaning ? (
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  ) : (
                    <Trash2 className="mr-3 h-6 w-6" />
                  )}
                  DEPURAR AHORA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-white/10 p-0 overflow-hidden m-4 rounded-[3rem]">
                <div className="p-10 text-center">
                  <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={40} />
                  </div>
                  <AlertDialogHeader className="space-y-4">
                    <AlertDialogTitle className="text-3xl font-black text-foreground text-center">
                      Confirmar Depuración
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-lg text-muted-foreground text-center leading-relaxed">
                      Esta acción eliminará de forma irreversible todas las consultas de más de una
                      semana. ¿Está seguro de proceder con el mantenimiento?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                    <AlertDialogCancel className="h-14 rounded-2xl px-8 font-bold text-foreground border-border hover:bg-muted active:scale-95 transition-all">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteExpired}
                      disabled={isCleaning}
                      className="h-14 rounded-2xl px-8 font-black bg-destructive hover:bg-destructive/90 active:scale-95 transition-all shadow-xl shadow-destructive/20"
                    >
                      SÍ, DEPURAR PERMANENTEMENTE
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="h-px bg-destructive/10 w-full" />

          {/* SIMIT BLOB CLEANING */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex-1 space-y-3">
              <h2 className="text-2xl font-black text-primary flex items-center gap-3">
                <ImageIcon className="w-8 h-8" />
                Limpieza de Archivos SIMIT
              </h2>
              <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                Libera espacio en el servidor de almacenamiento eliminando{' '}
                <strong>únicamente</strong> las capturas de pantalla enviadas por usuarios en el
                flujo SIMIT.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isCleaningSimit}
                  className="h-16 px-10 rounded-3xl font-black text-lg active:scale-95 transition-all border-primary/20 text-primary hover:bg-primary hover:text-white shadow-xl shadow-primary/5"
                >
                  {isCleaningSimit ? (
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  ) : (
                    <ImageIcon className="mr-3 h-6 w-6" />
                  )}
                  LIMPIAR CAPTURAS
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-white/10 p-0 overflow-hidden m-4 rounded-[3rem]">
                <div className="p-10 text-center">
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                    <ImageIcon size={40} />
                  </div>
                  <AlertDialogHeader className="space-y-4">
                    <AlertDialogTitle className="text-3xl font-black text-foreground text-center">
                      Vaciar Storage SIMIT
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-lg text-muted-foreground text-center leading-relaxed">
                      Se eliminarán todas las imágenes de capturas de SIMIT del servidor. Esto NO
                      afecta las fotos de testimonios ni de casos legales avanzados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                    <AlertDialogCancel className="h-14 rounded-2xl px-8 font-bold text-foreground border-border hover:bg-muted active:scale-95 transition-all">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSimitCaptures}
                      disabled={isCleaningSimit}
                      className="h-14 rounded-2xl px-8 font-black bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                      SÍ, LIMPIAR ARCHIVOS
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </main>

      <footer className="p-12 text-center">
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-40">
          Desmulta Admin Control Center • Bogotá D.C.
        </p>
      </footer>
    </div>
  );
}
