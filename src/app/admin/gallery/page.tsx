'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Trash2,
  Upload,
  Loader2,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface SuccessCase {
  id: string;
  title: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  createdAt: string;
}

export default function GalleryAdminPage() {
  const auth = useAuth();
  const user = auth.currentUser;
  const { toast } = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [cases, setCases] = useState<SuccessCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    try {
      const res = await fetch('/api/gallery');
      const data = await res.json();
      setCases(data.cases ?? []);
    } catch (e) {
      console.error('[Galería] Error al cargar casos:', e);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los casos existentes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
    previewSetter: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0] ?? null;
    setter(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => previewSetter(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      previewSetter(null);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Sin sesión',
        description: 'Debes iniciar sesión para subir casos.',
        variant: 'destructive',
      });
      return;
    }
    if (!title.trim() || !beforeFile || !afterFile) {
      toast({
        title: 'Campos incompletos',
        description: 'Completa el título y selecciona ambas imágenes.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = await user.getIdToken(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('beforeImage', beforeFile);
      formData.append('afterImage', afterFile);

      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Error al subir');

      toast({ title: '✅ Caso subido', description: `"${title}" ya está visible en la galería.` });

      // Resetear formulario
      setTitle('');
      setBeforeFile(null);
      setAfterFile(null);
      setBeforePreview(null);
      setAfterPreview(null);
      if (formRef.current) formRef.current.reset();

      await loadCases();
    } catch (error) {
      toast({
        title: 'Error al subir',
        description: error instanceof Error ? error.message : 'Intenta de nuevo',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: SuccessCase) => {
    if (!user || !confirm(`¿Eliminar el caso "${item.title}"? Esta acción no se puede deshacer.`))
      return;

    try {
      const token = await user.getIdToken(true);
      const res = await fetch('/api/gallery', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: item.id,
          beforeImageUrl: item.beforeImageUrl,
          afterImageUrl: item.afterImageUrl,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Error al eliminar');

      toast({ title: 'Eliminado', description: `Caso "${item.title}" borrado correctamente.` });
      await loadCases();
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el caso.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Tablero
        </Button>
        <h1 className="text-3xl font-bold">Gestión de Galería de Casos de Éxito</h1>
      </div>

      {/* Formulario de carga */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-primary" />
            Añadir Nuevo Caso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleUpload} className="space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Título del caso <span className="text-destructive">*</span>
              </Label>
              <input
                id="title"
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Multa de velocidad Cali — Condonada al 100%"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Imágenes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Antes */}
              <div className="space-y-3">
                <Label htmlFor="beforeImage" className="text-rose-500 font-bold">
                  📷 Captura SIMIT — ANTES <span className="text-destructive">*</span>
                </Label>
                <label
                  htmlFor="beforeImage"
                  className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-rose-300/60 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-500/5 transition-all overflow-hidden relative"
                >
                  {beforePreview ? (
                    <>
                      <Image
                        src={beforePreview}
                        alt="Vista previa antes"
                        fill
                        className="object-contain p-2"
                      />
                      <div className="absolute top-2 right-2 bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Lista
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <Upload className="w-8 h-8 text-rose-400" />
                      <span className="text-sm text-muted-foreground">
                        Haz clic para seleccionar la imagen ANTES
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        PNG, JPG o WEBP · Máx. 5MB
                      </span>
                    </div>
                  )}
                </label>
                <input
                  id="beforeImage"
                  name="beforeImage"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => handleFileChange(e, setBeforeFile, setBeforePreview)}
                />
              </div>

              {/* Después */}
              <div className="space-y-3">
                <Label htmlFor="afterImage" className="text-emerald-500 font-bold">
                  ✅ Captura SIMIT — DESPUÉS <span className="text-destructive">*</span>
                </Label>
                <label
                  htmlFor="afterImage"
                  className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-emerald-300/60 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-500/5 transition-all overflow-hidden relative"
                >
                  {afterPreview ? (
                    <>
                      <Image
                        src={afterPreview}
                        alt="Vista previa después"
                        fill
                        className="object-contain p-2"
                      />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Lista
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <Upload className="w-8 h-8 text-emerald-400" />
                      <span className="text-sm text-muted-foreground">
                        Haz clic para seleccionar la imagen DESPUÉS
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        PNG, JPG o WEBP · Máx. 5MB
                      </span>
                    </div>
                  )}
                </label>
                <input
                  id="afterImage"
                  name="afterImage"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => handleFileChange(e, setAfterFile, setAfterPreview)}
                />
              </div>
            </div>

            {/* Estado del formulario */}
            {(beforeFile || afterFile || title) && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className={`flex items-center gap-1 px-3 py-1 rounded-full font-medium ${title.trim() ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
                >
                  {title.trim() ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}{' '}
                  Título
                </span>
                <span
                  className={`flex items-center gap-1 px-3 py-1 rounded-full font-medium ${beforeFile ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
                >
                  {beforeFile ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}{' '}
                  Imagen Antes
                </span>
                <span
                  className={`flex items-center gap-1 px-3 py-1 rounded-full font-medium ${afterFile ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
                >
                  {afterFile ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}{' '}
                  Imagen Después
                </span>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !title.trim() || !beforeFile || !afterFile}
              className="w-full h-12 text-base font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 animate-spin" /> Subiendo a Vercel Blob...
                </>
              ) : (
                <>
                  <Upload className="mr-2" /> Publicar Caso de Éxito
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de casos existentes */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Casos Publicados
          <span className="text-sm font-normal text-muted-foreground">
            ({loading ? '…' : cases.length} {cases.length === 1 ? 'caso' : 'casos'})
          </span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-muted rounded-2xl text-center gap-3">
            <ImagePlus className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">No hay casos publicados aún.</p>
            <p className="text-sm text-muted-foreground/60">
              Usa el formulario de arriba para añadir el primer caso de éxito.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cases.map((c) => (
              <Card key={c.id} className="overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle
                    className="text-base font-semibold truncate max-w-[200px]"
                    title={c.title}
                  >
                    {c.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(c)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 size={16} />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="relative aspect-[9/16] w-full border rounded-lg bg-muted/20 overflow-hidden">
                      <Image
                        src={c.beforeImageUrl}
                        alt={`Antes - ${c.title}`}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                      <span className="absolute bottom-2 left-2 bg-rose-600/80 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Antes
                      </span>
                    </div>
                    <div className="relative aspect-[9/16] w-full border rounded-lg bg-muted/20 overflow-hidden">
                      <Image
                        src={c.afterImageUrl}
                        alt={`Después - ${c.title}`}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                      <span className="absolute bottom-2 right-2 bg-emerald-600/80 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Después
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {new Date(c.createdAt).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
