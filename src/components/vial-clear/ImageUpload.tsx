'use client';

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
  onClear: () => void;
  className?: string;
  required?: boolean;
}

export function ImageUpload({ onUploadSuccess, onClear, className, required }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validaciones de seguridad (MANDATO-FILTRO)
    if (!selectedFile.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB.');
      return;
    }

    setError(null);

    // Generar previsualización
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);

    // Subir a Vercel Blob via API para obtener URL pública real (MANDATO-FILTRO)
    setIsUploading(true);
    try {
      const response = await fetch(
        `/api/upload?filename=${encodeURIComponent(selectedFile.name)}`,
        {
          method: 'POST',
          body: selectedFile,
        }
      );

      if (!response.ok) {
        throw new Error('Error al subir la imagen al servidor.');
      }

      const blob = (await response.json()) as { url: string };
      onUploadSuccess(blob.url);
    } catch {
      setError('Fallo al subir la imagen. Intente de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    onClear();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
          <ImageIcon size={16} className="text-primary" />
          Captura del SIMIT {required ? '(Obligatoria)' : '(Opcional)'}
        </label>
        {preview && (
          <button
            onClick={handleClear}
            className="text-[10px] font-bold text-red-500 uppercase hover:underline"
          >
            Eliminar
          </button>
        )}
      </div>

      <div
        onClick={() => !preview && fileInputRef.current?.click()}
        className={cn(
          'relative min-h-[140px] rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-4 cursor-pointer overflow-hidden',
          preview
            ? 'border-primary/50 bg-primary/5'
            : 'border-white/10 hover:border-primary/40 hover:bg-white/5 bg-black/20',
          error && 'border-red-500/50 bg-red-500/5'
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl"
            >
              <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest text-center px-2">
                      Subiendo captura...
                    </span>
                  </div>
                </div>
              )}
              {!isUploading && (
                <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
                  <CheckCircle2 size={16} />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              className="flex flex-col items-center text-center space-y-3 p-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <Upload size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Click para subir captura</p>
                <p className="text-xs text-muted-foreground">JPG, PNG hasta 5MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 right-4 p-2 rounded-xl bg-red-500/90 text-white text-[10px] font-bold flex items-center gap-2"
          >
            <AlertCircle size={14} />
            {error}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {preview && !isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-2xl"
          >
            <p className="text-[10px] text-green-600 dark:text-green-400 font-medium leading-relaxed">
              <strong>Captura recibida con éxito.</strong> Un analista especializado revisará la
              viabilidad de su caso manualmente. Le daremos respuesta en nuestro horario laboral
              (Lunes a Viernes 8am - 6pm). Sus datos están protegidos.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
