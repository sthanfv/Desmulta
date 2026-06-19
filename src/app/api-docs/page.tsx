import React from 'react';
import { Metadata } from 'next';
import { Header } from '@/components/sections/Header';
import { Footer } from '@/components/sections/Footer';
import { Terminal, ShieldCheck, Zap, Database, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'API de Desmulta B2B - Documentación Oficial',
  description: 'Integra nuestro potente motor OCR y calculadora legal en tu propio software. API RESTful de grado empresarial para firmas de abogados, fintechs y flotas.',
};

export default function ApiDocsPage() {
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
      <Header onOpenModal={() => {}} />
      
      <main className="pt-32 pb-24 px-6 max-w-5xl mx-auto space-y-24">
        
        {/* HERO SECTION */}
        <section className="text-center space-y-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10" />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-4">
            <Zap size={16} /> API B2B Oficial
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.1]">
            Integra nuestro <span className="text-primary">Motor Legal</span> en tu Software
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Accede al mismo motor OCR avanzado y calculador determinista que procesa expedientes en Desmulta, directo en tu sistema vía REST.
          </p>
        </section>

        {/* FEATURES */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-card border border-border/50 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold">Seguridad Enterprise</h3>
            <p className="text-sm text-muted-foreground">Autenticación mediante API Keys HMAC SHA-256. Prevención contra timing attacks y protección Zero-PII incorporada.</p>
          </div>
          <div className="p-8 rounded-3xl bg-card border border-border/50 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Terminal size={24} />
            </div>
            <h3 className="text-lg font-bold">Respuesta JSON Estructurada</h3>
            <p className="text-sm text-muted-foreground">Recibe directamente el dictamen legal procesado (prescrito, caducado, impugnable) con los valores en Salarios Mínimos (SMLMV).</p>
          </div>
          <div className="p-8 rounded-3xl bg-card border border-border/50 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Database size={24} />
            </div>
            <h3 className="text-lg font-bold">Infraestructura Elástica</h3>
            <p className="text-sm text-muted-foreground">Respaldados por Vercel Edge y Redis, nuestra API escala automáticamente garantizando latencias ultra bajas.</p>
          </div>
        </section>

        {/* DOCS: AUTH */}
        <section className="space-y-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Key className="text-primary" /> Autenticación
            </h2>
            <p className="text-muted-foreground mt-2">Todas las solicitudes a la API deben incluir el header de autenticación con tu API Key provista por un administrador comercial de Desmulta.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 font-mono text-sm overflow-x-auto text-zinc-300">
            <span className="text-zinc-500"># Header Requerido</span>
            <br />
            X-Desmulta-Key: dm_live_...
          </div>
        </section>

        {/* DOCS: ENDPOINTS */}
        <section className="space-y-12">
          
          {/* Endpoint 1 */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">1. Analizar Comparendo (OCR + Legal)</h2>
            <p className="text-muted-foreground">Endpoint unificado que recibe la imagen, ejecuta OCR estructurado con IA y evalúa el dictamen jurídico de caducidad y prescripción.</p>
            
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded bg-green-500/20 text-green-500 font-bold text-sm">POST</span>
              <code className="text-sm">https://desmulta.online/api/v1/analizar-comparendo</code>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 font-mono text-sm overflow-x-auto">
              <div className="text-zinc-500 mb-2"># Petición (cURL)</div>
              <pre className="text-zinc-300">
{`curl -X POST https://desmulta.online/api/v1/analizar-comparendo \\
  -H "X-Desmulta-Key: dm_live_tu_api_key_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "imageBase64": "data:image/jpeg;base64,...",
    "cobroCoactivo": false
  }'`}
              </pre>
            </div>
          </div>

          {/* Endpoint 2 */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">2. Calculadora Legal Directa</h2>
            <p className="text-muted-foreground">Si ya dispones de los datos extraídos (ej. desde el SIMIT), envíalos para obtener el análisis legal y cálculo financiero en SMLMV.</p>
            
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded bg-green-500/20 text-green-500 font-bold text-sm">POST</span>
              <code className="text-sm">https://desmulta.online/api/v1/calcular-multa</code>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 font-mono text-sm overflow-x-auto">
              <div className="text-zinc-500 mb-2"># Petición (cURL)</div>
              <pre className="text-zinc-300">
{`curl -X POST https://desmulta.online/api/v1/calcular-multa \\
  -H "X-Desmulta-Key: dm_live_tu_api_key_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "valorMulta": 1500000,
    "fechaInfraccion": "2020-05-10T00:00:00.000Z",
    "tieneCobroCoactivo": false
  }'`}
              </pre>
            </div>
          </div>

        </section>

        {/* CALL TO ACTION */}
        <section className="p-12 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-background to-background border border-primary/20 text-center space-y-6">
          <h2 className="text-3xl font-black">¿Listo para integrar Desmulta?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Nuestros planes B2B comienzan desde 500 consultas al mes. Contáctanos para emitir tu API Key comercial.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button size="lg" className="bg-primary text-primary-foreground font-bold rounded-xl" onClick={() => window.location.href = '#contacto'}>
              Contactar a Ventas
            </Button>
          </div>
        </section>

      </main>

      <Footer footerData={footerData} onOpenWhatsAppWarning={() => { window.location.href = '#contacto'; }} />
    </div>
  );
}
