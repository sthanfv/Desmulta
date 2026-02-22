'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, X, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadedUrl(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        throw new Error('Falló la subida de la imagen.');
      }

      const blob = (await response.json()) as { url: string };
      setUploadedUrl(blob.url);
    } catch (err) {
      console.error(err);
      const e = err as Error;
      setError(e.message || 'Error desconocido al subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setUploadedUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="floating-card bg-card/50 backdrop-blur-sm border border-white/10 p-8 text-card-foreground shadow-2xl">
      <h3 className="text-xl font-black text-foreground mb-6 uppercase tracking-wider">
        Cargar Evidencia
      </h3>

      {!uploadedUrl ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-primary/20 rounded-[2rem] bg-muted/20 hover:bg-primary/5 transition-all duration-300 group">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform shadow-inner">
            <UploadCloud className="w-10 h-10" />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer bg-primary text-primary-foreground px-8 py-3 rounded-2xl text-sm font-black transition-all hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/20"
          >
            Seleccionar archivo
          </label>
          {file && (
            <div className="mt-6 flex items-center gap-3 bg-card px-4 py-2 rounded-2xl text-sm font-medium border border-white/5 shadow-md">
              <span className="truncate max-w-[200px]">{file.name}</span>
              <button
                onClick={clearSelection}
                className="text-muted-foreground hover:text-destructive p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
          <div className="glass bg-green-500/10 text-green-600 dark:text-green-400 p-6 rounded-3xl w-full mb-6 flex items-start gap-4 border border-green-500/20 shadow-lg shadow-green-500/5">
            <CheckCircle2 className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <p className="font-black text-sm uppercase tracking-wider">¡Éxito!</p>
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs break-all underline hover:opacity-80 mt-1 block font-medium"
              >
                {uploadedUrl}
              </a>
            </div>
          </div>

          <div className="relative w-full h-80 rounded-[2.5rem] border border-white/10 overflow-hidden mb-6 shadow-3xl bg-black/5 dark:bg-black/20">
            <Image src={uploadedUrl} alt="Uploaded preview" fill className="object-contain" />
          </div>

          <Button
            onClick={clearSelection}
            variant="outline"
            className="w-full h-14 rounded-2xl border-border hover:bg-muted font-black active:scale-95 transition-all"
          >
            Nueva Subida
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-2xl flex items-center gap-3 shadow-lg shadow-red-500/5">
          <X className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {file && !uploadedUrl && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full h-16 mt-8 bg-primary text-primary-foreground font-black text-lg rounded-[2rem] shadow-xl shadow-primary/20 active:scale-95 transition-all border-none"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 mr-3 animate-spin" /> SUBIENDO...
            </>
          ) : (
            'PROCESAR CARGA'
          )}
        </Button>
      )}
    </div>
  );
}
