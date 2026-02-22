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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Image as ImageIcon, Upload } from 'lucide-react';
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
  }>(showcaseRef);

  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  const form = useForm<ShowcaseFormData>({
    resolver: zodResolver(showcaseSchema),
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

      if (beforeImageUrl && afterImageUrl) {
        setDoc(showcaseRef, { beforeImageUrl, afterImageUrl }, { merge: true }).catch((err) => {
          console.error('Error writing to Firestore:', err);
        });
        toast({
          title: 'Éxito',
          description: 'Las imágenes del caso de éxito han sido actualizadas.',
        });
        setBeforePreview(null);
        setAfterPreview(null);
        form.reset();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Ocurrió un problema al guardar los cambios.';
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: message,
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
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Panel de Administración</h1>
        <Button variant="outline" onClick={() => auth?.signOut()}>
          Cerrar Sesión
        </Button>
      </header>
      <main className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Gestionar Caso de Éxito</CardTitle>
            <CardDescription>
              Suba las imágenes de &quot;antes&quot; y &quot;después&quot; que se mostrarán en la
              página principal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="beforeImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Imagen &quot;Antes&quot;
                        </FormLabel>
                        <div className="aspect-video relative bg-muted rounded-md overflow-hidden border-2 border-dashed flex items-center justify-center">
                          {isLoading ? (
                            <Loader2 className="animate-spin text-muted-foreground" />
                          ) : beforePreview || showcaseData?.beforeImageUrl ? (
                            <Image
                              src={beforePreview || showcaseData?.beforeImageUrl || ''}
                              alt="Vista previa de la imagen de Antes"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                              <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                              <span className="text-sm font-medium">Sin imagen</span>
                              <span className="text-xs opacity-70">
                                Sube una para el estado original
                              </span>
                            </div>
                          )}
                        </div>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
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
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Imagen &quot;Después&quot;
                        </FormLabel>
                        <div className="aspect-video relative bg-muted rounded-md overflow-hidden border-2 border-dashed flex items-center justify-center">
                          {isLoading ? (
                            <Loader2 className="animate-spin text-muted-foreground" />
                          ) : afterPreview || showcaseData?.afterImageUrl ? (
                            <Image
                              src={afterPreview || showcaseData?.afterImageUrl || ''}
                              alt="Vista previa de la imagen de Después"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                              <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                              <span className="text-sm font-medium">Sin imagen</span>
                              <span className="text-xs opacity-70">Sube una para el resultado</span>
                            </div>
                          )}
                        </div>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
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
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button type="submit" disabled={isSubmitting} className="flex-1" size="lg">
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Guardar Cambios
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      isSubmitting ||
                      (!showcaseData?.beforeImageUrl && !showcaseData?.afterImageUrl)
                    }
                    onClick={handleClearShowcase}
                    className="flex-1 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    size="lg"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Borrar Caso Actual
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mantenimiento de Datos</CardTitle>
            <CardDescription>
              Elimine manualmente las consultas que tengan más de 7 días para mantener la base de
              datos optimizada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isCleaning}>
                  {isCleaning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Limpiar Consultas de más de 7 días
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar limpieza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción buscará y eliminará permanentemente todas las consultas con más de 7
                    días de antigüedad. Esta operación no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteExpired}
                    disabled={isCleaning}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isCleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sí, eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
