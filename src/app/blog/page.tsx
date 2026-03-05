import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { getBlogPosts } from "@/lib/mdx";

export const metadata = {
    title: "Blog | Desmulta - Expertos en Fotomultas",
    description: "Artículos legales y guías sobre cómo defenderte de fotomultas injustas en Colombia.",
};

export default async function BlogIndex() {
    const posts = await getBlogPosts();
    return (
        <main className="min-h-screen bg-background py-20 px-6">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="space-y-4 text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-4">
                        <BookOpen className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                        Guía Legal <span className="text-primary">Desmulta</span>
                    </h1>
                    <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                        Conoce tus derechos como conductor en Colombia y aprende a defenderte de cobros injustos.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 mt-12">
                    {posts.map((post) => (
                        <Link
                            key={post.slug}
                            href={`/blog/${post.slug}`}
                            className="group block p-6 bg-card border border-border/50 rounded-3xl hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5"
                        >
                            <div className="space-y-4">
                                <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">
                                    {post.date}
                                </span>
                                <h2 className="text-2xl font-bold group-hover:text-primary transition-colors line-clamp-2">
                                    {post.title}
                                </h2>
                                <p className="text-muted-foreground line-clamp-3">
                                    {post.excerpt}
                                </p>
                                <div className="flex items-center text-sm font-bold text-primary pt-2">
                                    Leer artículo
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
