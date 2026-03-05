import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBlogPostBySlug } from "@/lib/mdx";
import { notFound } from "next/navigation";

export default async function BlogPost({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;
    const post = await getBlogPostBySlug(slug);

    if (!post) {
        notFound();
    }

    const { content, meta } = post;

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Botón de volver */}
            <div className="max-w-3xl mx-auto px-6 pt-10 pb-6">
                <Link
                    href="/blog"
                    className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a los artículos
                </Link>
            </div>

            {/* Cabecera del Artículo */}
            <header className="max-w-3xl mx-auto px-6 space-y-6 pb-10 border-b border-border/50">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
                    Educación Legal
                </div>
                <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                    {meta.title}
                </h1>
                <p className="text-muted-foreground">
                    Publicado el {meta.date} {meta.author && `• ${meta.author}`}
                </p>
            </header>

            {/* Contenido (Aquí irá el Markdown después) */}
            <article className="max-w-3xl mx-auto px-6 py-10 prose prose-neutral dark:prose-invert prose-p:text-lg prose-headings:font-black">
                {content}
            </article>

            {/* El "Imán" (Call to Action al final de cada artículo) */}
            <section className="max-w-3xl mx-auto px-6 mt-10">
                <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 md:p-12 text-center space-y-6">
                    <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
                    <h3 className="text-2xl font-black">¿Tienes una multa que cumple estas características?</h3>
                    <p className="text-muted-foreground text-lg">
                        No pagues sin antes consultar con nuestros expertos. Evaluamos tu caso 100% gratis en menos de 2 minutos.
                    </p>
                    <Link href="/">
                        <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-2xl w-full sm:w-auto shadow-xl shadow-primary/20">
                            Analizar mi caso gratis
                        </Button>
                    </Link>
                </div>
            </section>
        </main>
    );
}
