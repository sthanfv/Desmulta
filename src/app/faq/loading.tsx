export default function LoadingFaq() {
  return (
    <div className="min-h-screen bg-background px-6 pt-24 pb-20 max-w-3xl mx-auto">
      {/* Título skeleton */}
      <div className="h-10 bg-muted/40 rounded-2xl animate-pulse w-1/2 mx-auto mb-4" />
      <div className="h-5 bg-muted/25 rounded-xl animate-pulse w-2/3 mx-auto mb-16" />

      {/* Items FAQ skeleton */}
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-2xl p-6 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 bg-muted/35 rounded-lg w-3/4" />
              <div className="h-5 w-5 bg-muted/25 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
