import { cn } from '@/lib/utils';

/**
 * Skeleton Base — Bloque de construcción para carga predictiva.
 * MANDATO-FILTRO: Animación suave y colores adaptativos.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800/50', className)}
      {...props}
    />
  );
}
