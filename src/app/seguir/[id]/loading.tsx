/**
 * Skeleton de carga para /seguir/[id]
 * Se muestra automáticamente por el App Router de Next.js mientras
 * el servidor ejecuta await getExpedienteCacheado(targetId) en page.tsx.
 * Previene la pantalla en blanco durante cold starts de Firestore o alta latencia de red.
 */
export default function LoadingSeguimiento() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="space-y-5 w-full max-w-md">
        {/* Encabezado del expediente */}
        <div className="h-8 bg-muted/40 rounded-2xl animate-pulse" />

        {/* Tarjeta principal de estado */}
        <div className="h-36 bg-muted/25 rounded-3xl animate-pulse" />

        {/* Línea de estado */}
        <div className="h-6 bg-muted/25 rounded-xl animate-pulse w-2/3" />

        {/* Detalle secundario */}
        <div className="space-y-3">
          <div className="h-4 bg-muted/20 rounded-lg animate-pulse w-full" />
          <div className="h-4 bg-muted/20 rounded-lg animate-pulse w-4/5" />
        </div>

        {/* Botón skeleton */}
        <div className="h-14 bg-muted/30 rounded-2xl animate-pulse mt-6" />
      </div>
    </div>
  );
}
