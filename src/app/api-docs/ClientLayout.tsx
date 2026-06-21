'use client';

import React from 'react';
import { Header } from '@/components/sections/Header';
import { Footer } from '@/components/sections/Footer';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Footer data dummy para la documentación
  const footerData = {
    whatsapp: '573005648309',
    email: 'contacto@desmulta.online',
    address: 'Colombia, Nacional',
    instagramUrl: '',
    facebookUrl: ''
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      <Header onOpenModal={() => { window.location.href = '#contacto'; }} />
      {children}
      <Footer footerData={footerData} onOpenWhatsAppWarning={() => { window.location.href = '#contacto'; }} />
    </div>
  );
}
