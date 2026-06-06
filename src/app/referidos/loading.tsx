export default function LoadingReferidos() {
  return (
    <div className="min-h-screen bg-background px-6 pt-24 pb-20 max-w-2xl mx-auto">
      {/* Título skeleton */}
      <div className="h-10 bg-muted/40 rounded-2xl animate-pulse w-2/3 mb-4" />
      <div className="h-5 bg-muted/25 rounded-xl animate-pulse w-full mb-12" />

      {/* Formulario skeleton */}
      <div className="space-y-4 bg-card border border-border rounded-3xl p-8">
        <div className="h-5 bg-muted/30 rounded-lg animate-pulse w-1/3" />
        <div className="h-12 bg-muted/20 rounded-2xl animate-pulse" />
        <div className="h-5 bg-muted/30 rounded-lg animate-pulse w-1/3 mt-4" />
        <div className="h-12 bg-muted/20 rounded-2xl animate-pulse" />
        <div className="h-14 bg-primary/20 rounded-2xl animate-pulse mt-4" />
      </div>
    </div>
  );
}
