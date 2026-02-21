'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { uploadImage } from '@/app/admin/actions';
import { ImageUploader } from '@/components/admin/ImageUploader';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Trash2 } from 'lucide-react';
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

  const form = useForm<ShowcaseFormData>();

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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: error.message || 'Ocurrió un problema al guardar los cambios.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpired = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo conectar a la base de datos.',
      });
      return;
    }

    setIsCleaning(true);

    try {
      const consultationsRef = collection(firestore, 'consultations');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

      // Query for documents older than 7 days
      const q = query(consultationsRef, where('createdAt', '<=', sevenDaysAgoTimestamp));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: 'Todo limpio',
          description: 'No se encontraron consultas vencidas para eliminar.',
        });
        setIsCleaning(false);
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      toast({
        title: '¡Limpieza completada!',
        description: `Se eliminaron ${querySnapshot.size} consultas vencidas.`,
      });
    } catch (error: any) {
      console.error('Error durante la limpieza de consultas:', error);
      toast({
        variant: 'destructive',
        title: 'Error en la limpieza',
        description: error.message || 'Ocurrió un problema al intentar eliminar las consultas.',
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
              Suba las imágenes de "antes" y "después" que se mostrarán en la página principal.
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
                        <FormLabel className="text-lg font-semibold">Imagen "Antes"</FormLabel>
                        <div className="aspect-video relative bg-muted rounded-md overflow-hidden border-2 border-dashed flex items-center justify-center">
                          {isLoading ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Image
                              src={
                                beforePreview ||
                                showcaseData?.beforeImageUrl ||
                                'https://picsum.photos/seed/before/600/400'
                              }
                              alt="Vista previa de la imagen de Antes"
                              fill
                              className="object-cover"
                            />
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
                        <FormLabel className="text-lg font-semibold">Imagen "Después"</FormLabel>
                        <div className="aspect-video relative bg-muted rounded-md overflow-hidden border-2 border-dashed flex items-center justify-center">
                          {isLoading ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Image
                              src={
                                afterPreview ||
                                showcaseData?.afterImageUrl ||
                                'https://picsum.photos/seed/after/600/400'
                              }
                              alt="Vista previa de la imagen de Después"
                              fill
                              className="object-cover"
                            />
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
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Guardar Cambios
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Sección de Carga de Vercel Blob */}
        <Card className="border-primary/20 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Subidor Rápido a Vercel Blob
            </CardTitle>
            <CardDescription className="text-slate-400">
              Sube imágenes sueltas (como capturas del SIMIT) para usarlas luego en el Lightbox de la web pública. Reemplazarán las imágenes de muestra con URLs reales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader />
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
