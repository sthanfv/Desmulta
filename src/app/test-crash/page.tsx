export default function TestCrashPage() {
  // Simulamos un error fatal de React Server Component
  throw new Error("💥 CRASH DE PRUEBA: Probando el sistema de telemetría de Desmulta");
  
  return (
    <div>
      Esta página nunca debería cargar.
    </div>
  );
}
