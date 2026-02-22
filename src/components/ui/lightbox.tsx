'use client';

import { useState } from 'react';
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className={`relative group cursor-zoom-in overflow-hidden rounded-lg ${className}`}>
          {/* Imagen miniatura */}
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay interactivo */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <ZoomIn className="w-8 h-8 text-white drop-shadow-md" />
          </div>
        </div>
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

        <div className="relative w-full h-full animate-in zoom-in-95 duration-300">
          <Image src={src} alt={alt} fill className="object-contain drop-shadow-2xl" priority />
        </div>
      </DialogContent>
    </Dialog>
  );
}
