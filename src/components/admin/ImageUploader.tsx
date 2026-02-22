'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, X, CheckCircle2 } from 'lucide-react';

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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200">
      <h3 className="text-lg font-bold text-white mb-4">Cargar Evidencia (Vercel Blob)</h3>

      {!uploadedUrl ? (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-lg bg-slate-950/50 hover:bg-slate-900/50 transition-colors">
          <UploadCloud className="w-10 h-10 text-slate-400 mb-4" />
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
            className="cursor-pointer bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Seleccionar Imagen
          </label>
          {file && (
            <div className="mt-4 flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full text-sm">
              <span className="truncate max-w-[200px]">{file.name}</span>
              <button onClick={clearSelection} className="text-slate-400 hover:text-red-400">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="bg-green-500/10 text-green-400 p-4 rounded-lg w-full mb-4 flex items-start gap-3 border border-green-500/20">
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">¡Subida exitosa!</p>
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs break-all underline hover:text-green-300 mt-1 block"
              >
                {uploadedUrl}
              </a>
            </div>
          </div>

          <img
            src={uploadedUrl}
            alt="Uploaded preview"
            className="w-full max-h-64 object-contain rounded-lg border border-slate-700 mb-4"
          />

          <Button onClick={clearSelection} variant="outline" className="w-full">
            Subir otra imagen
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      {file && !uploadedUrl && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full mt-4 bg-primary text-primary-foreground font-bold"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...
            </>
          ) : (
            'Subir a Vercel Blob'
          )}
        </Button>
      )}
    </div>
  );
}
