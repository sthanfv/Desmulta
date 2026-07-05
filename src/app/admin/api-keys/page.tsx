import { Metadata } from 'next';
import { ApiKeysTable } from '@/components/admin/ApiKeysTable';

export const metadata: Metadata = {
  title: 'Gestión de API Keys | Desmulta',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ApiKeysPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <a
              href="/admin"
              className="font-semibold text-sm tracking-tight hover:text-primary transition-colors"
            >
              Panel Desmulta
            </a>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">API Keys B2B</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestión de API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crea, visualiza y revoca claves de acceso para clientes B2B.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-8">
          <ApiKeysTable />
        </div>
      </main>
    </div>
  );
}
