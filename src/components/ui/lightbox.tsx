'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ZoomIn } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Image from 'next/image';

interface LightboxProps {
  src: string;
  alt: string;
  className?: string; // Para estilizar la miniatura
}

export function Lightbox({ src, alt, className = '' }: LightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerContent = (
    <div className={`relative group cursor-zoom-in overflow-hidden ${className}`}>
      {/* Imagen miniatura */}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {/* Overlay interactivo */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <ZoomIn className="w-8 h-8 text-white drop-shadow-md" />
      </div>
    </div>
  );

  if (!mounted) {
    return triggerContent;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerContent}
      </DialogTrigger>

      {/* 
        Utilizamos la variante max-w-7xl para permitir que la imagen sea inmensa y
        borramos paddings y colores de fondo del DialogContent tradicional para dar un look premium.
       */}
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 bg-transparent border-none shadow-none flex flex-col justify-center items-center">
        {/* Escondemos el título por accesibilidad sin mostrarlo en UI */}
        <DialogPrimitive.Title className="sr-only">
          {alt || 'Vista ampliada de la imagen'}
        </DialogPrimitive.Title>

        <div className="relative w-full h-[85vh] animate-in zoom-in-95 duration-300">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="95vw"
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>

        <div className="flex justify-center mt-6">
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl backdrop-blur-md transition-all font-bold border border-white/10"
          >
            <ZoomIn size={20} />
            Ver Resolución Completa
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
