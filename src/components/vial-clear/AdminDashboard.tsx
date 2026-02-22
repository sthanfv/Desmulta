'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { deleteExpiredConsultations, uploadImage } from '@/app/admin/actions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Trash2,
  Image as ImageIcon,
  Upload,
  ShieldCheck,
  LogOut,
  Sparkle,
} from 'lucide-react';
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

type ShowcaseFormData = z.infer<typeof showcaseSchema>;

export function AdminDashboard() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const showcaseRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'site_config', 'showcase') : null),
    [firestore]
  );
  const { data: showcaseData, isLoading } = useDoc<{
    beforeImageUrl: string;
    afterImageUrl: string;
    counterValue: string;
    counterLabel: string;
  }>(showcaseRef);

  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  const form = useForm<ShowcaseFormData>({
    resolver: zodResolver(showcaseSchema),
    defaultValues: {
      counterValue: showcaseData?.counterValue || '',
      counterLabel: showcaseData?.counterLabel || '',
    },
  });

  // Update form when data loads
  useState(() => {
    if (showcaseData) {
      form.reset({
        ...form.getValues(),
        counterValue: showcaseData.counterValue || '',
        counterLabel: showcaseData.counterLabel || '',
      });
    }
  });

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

  const onSubmit = async (data: ShowcaseFormData) => {
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

      await setDoc(
        showcaseRef,
        {
          beforeImageUrl,
          afterImageUrl,
          counterValue: data.counterValue || showcaseData?.counterValue || '1k+',
          counterLabel: data.counterLabel || showcaseData?.counterLabel || 'Sanciones Eliminadas',
        },
        { merge: true }
      );
      toast({
        title: 'Éxito',
        description: 'Las imágenes del caso de éxito han sido actualizadas.',
      });
      setBeforePreview(null);
      setAfterPreview(null);
      form.reset({
        counterValue: data.counterValue || showcaseData?.counterValue || '',
        counterLabel: data.counterLabel || showcaseData?.counterLabel || '',
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

  const handleClearShowcase = async () => {
    setIsSubmitting(true);
    try {
      if (showcaseRef) {
        await setDoc(showcaseRef, { beforeImageUrl: null, afterImageUrl: null }, { merge: true });
        toast({
          title: 'Caso eliminado',
          description: 'El caso de éxito fue retirado de la vista pública.',
        });
        setBeforePreview(null);
        setAfterPreview(null);
        form.reset();
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
                Desmulta Admin v2.0
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => auth?.signOut()}
            className="rounded-full hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all gap-2 font-bold"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 space-y-12">
        {/* Showcase Management Card */}
        <section className="floating-card bg-card/40 backdrop-blur-md border border-white/10 p-10 shadow-3xl overflow-hidden relative group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="mb-12">
            <h2 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <Sparkle className="text-primary w-8 h-8" />
              Historias de Éxito
            </h2>
            <p className="text-muted-foreground mt-3 text-lg max-w-2xl font-medium leading-relaxed">
              Actualiza las imágenes que demuestran la efectividad de nuestros procesos legales ante
              la opinión pública.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              {/* Counter Configuration */}
              <div className="grid md:grid-cols-2 gap-10 bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
                  name="beforeImage"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70 pl-1">
                        Estado Anterior (Antes)
                      </FormLabel>
                      <div className="aspect-video relative bg-black/5 dark:bg-black/20 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center transition-all hover:bg-primary/5">
                        {isLoading ? (
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
                  control={form.control}
                  name="afterImage"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-sm font-black text-foreground uppercase tracking-widest opacity-70 pl-1">
                        Resultado (Después)
                      </FormLabel>
                      <div className="aspect-video relative bg-black/5 dark:bg-black/20 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-primary/20 flex items-center justify-center transition-all hover:bg-primary/5">
                        {isLoading ? (
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
                  SINCRONIZAR CAMBIOS
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

        {/* Maintenance Card */}
        <section className="floating-card bg-destructive/5 dark:bg-destructive/[0.02] border border-destructive/10 p-10 shadow-3xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex-1 space-y-3">
              <h2 className="text-2xl font-black text-destructive flex items-center gap-3">
                <Trash2 className="w-8 h-8" />
                Mantenimiento de Base de Datos
              </h2>
              <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                El sistema detectará y eliminará automáticamente las consultas que tengan más de 7
                días de antigüedad para preservar el cumplimiento de la Ley de Protección de Datos.
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
