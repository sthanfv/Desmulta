import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBlogPostBySlug } from '@/lib/mdx';
import { notFound } from 'next/navigation';

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { content, meta } = post;
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Desmulta';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30">
      {/* Fondos */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,191,0,0.05)_0%,transparent_40%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_90%_90%,rgba(255,191,0,0.03)_0%,transparent_40%)] pointer-events-none" />

      {/* Header Glassmorphic */}
      <header className="fixed top-0 w-full z-50 p-6">
        <div className="max-w-4xl mx-auto glass rounded-3xl px-8 h-16 flex items-center justify-between shadow-2xl border-white/10">
          <Link
            href="/blog"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group active:scale-95"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Volver al Blog</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            <span className="font-black tracking-tighter text-lg uppercase text-foreground">
              {brandName}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        {/* Cabecera del Artículo */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 mb-8">
            Guía Legal • Educación Vial
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 text-foreground tracking-tight leading-[0.95]">
            {meta.title}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground font-medium">
            <span className="bg-muted px-3 py-1 rounded-lg text-xs italic">
              Publicado el {meta.date}
            </span>
            {meta.author && (
              <span className="text-xs uppercase tracking-widest font-black opacity-60">
                Por {meta.author}
              </span>
            )}
          </div>
        </div>

        {/* Contenido */}
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-p:text-lg prose-p:leading-relaxed prose-headings:font-black prose-headings:tracking-tight prose-a:text-primary prose-strong:text-foreground prose-img:rounded-3xl shadow-article bg-card/20 backdrop-blur-sm p-8 md:p-12 rounded-[2.5rem] border border-white/5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          {content}
        </article>

        {/* Call to Action Final */}
        <div className="mt-20 relative group animate-in zoom-in-95 duration-700 delay-200">
          <div className="absolute inset-0 bg-primary/10 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-primary text-primary-foreground p-12 rounded-[3rem] text-center space-y-8 overflow-hidden">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="bg-foreground/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/10">
              <BookOpen className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black tracking-tight relative z-10 selection:bg-white/20">
              ¿Tu multa cumple estas características?
            </h3>
            <p className="text-lg opacity-90 font-medium max-w-xl mx-auto relative z-10">
              No pagues sin antes consultar con nuestros expertos. Evaluamos tu caso 100% gratis en
              menos de 2 minutos.
            </p>
            <div className="relative z-10">
              <Link href="/">
                <Button 
                  className="h-16 px-12 bg-foreground text-background hover:bg-foreground/90 font-black rounded-2xl active:scale-95 transition-all text-lg shadow-xl border-none"
                >
                  ANALIZAR MI CASO GRATIS
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-20 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          Guía Legal — Desmulta Tecnologías v1.8.8
        </p>
      </footer>
    </div>
  );
}
