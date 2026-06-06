import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <h2 className="text-xl font-bold tracking-tight">Cargando el blog legal...</h2>
      <p className="text-muted-foreground mt-2">Preparando los mejores artículos sobre fotomultas</p>
    </div>
  );
}
