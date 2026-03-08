import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { getBlogPosts } from '@/lib/mdx';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';


export default async function BlogIndex() {
  const posts = await getBlogPosts();
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
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group active:scale-95"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            <span className="font-black tracking-tighter text-lg uppercase text-foreground">
              {brandName}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24">
        {/* Hero Blog */}
        <div className="mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-6 shadow-pill">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 text-foreground tracking-tight leading-[0.95] uppercase">
            Guía Legal <br />
            <span className="text-primary italic underline decoration-primary/20 underline-offset-8">
              Profesional
            </span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Información técnica y jurídica actualizada para su defensa vial en Colombia.
          </p>
        </div>

        {/* Grilla de Artículos */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <TarjetaPremium 
              key={post.slug} 
              className="p-8 hover:border-primary/50 transition-all animate-in fade-in slide-in-from-bottom-6 duration-700"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="space-y-4">
                <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                  {post.date}
                </span>
                <h2 className="text-2xl font-black text-foreground line-clamp-2 leading-tight min-h-[3.5rem]">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center text-xs font-black text-primary pt-4 hover:translate-x-1 transition-transform group"
                >
                  LEER ARTÍCULO COMPLETO
                  <ArrowUpRight size={14} className="ml-1 group-hover:rotate-45 transition-transform" />
                </Link>
              </div>
            </TarjetaPremium>
          ))}
        </div>
      </main>

      <footer className="py-20 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          Desmulta © {new Date().getFullYear()} — Ingeniería de Clase Mundial
        </p>
      </footer>
    </div>
  );
}
