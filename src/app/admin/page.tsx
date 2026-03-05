import { AdminDashboard } from '@/components/vial-clear/AdminDashboard';
import { Suspense } from 'react';

// Este es el componente fantasma que simula la tabla cargando
function AdminSkeleton() {
  return (
    <div className="flex flex-col h-screen w-full bg-background p-8 gap-6 animate-pulse">
      {/* Header simulado */}
      <div className="h-12 w-1/4 bg-muted rounded-xl"></div>
      {/* Tarjetas de estadísticas simuladas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-muted rounded-xl"></div>
        <div className="h-32 bg-muted rounded-xl"></div>
        <div className="h-32 bg-muted rounded-xl"></div>
      </div>
      {/* Tabla simulada */}
      <div className="flex-1 bg-muted rounded-xl opacity-50"></div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminDashboard />
    </Suspense>
  );
}
