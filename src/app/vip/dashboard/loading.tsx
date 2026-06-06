export default function LoadingVipDashboard() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-5">
        <div className="h-8 bg-muted/40 rounded-2xl animate-pulse w-2/3 mx-auto" />
        <div className="h-5 bg-muted/25 rounded-xl animate-pulse w-1/2 mx-auto" />
        <div className="mt-8 h-48 bg-muted/25 rounded-3xl animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 bg-muted/30 rounded-full animate-pulse flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted/25 rounded-lg animate-pulse w-3/4" />
              <div className="h-3 bg-muted/15 rounded-lg animate-pulse w-1/2" />
            </div>
          </div>
        ))}
        <div className="h-14 bg-muted/30 rounded-2xl animate-pulse mt-6" />
      </div>
    </div>
  );
}
