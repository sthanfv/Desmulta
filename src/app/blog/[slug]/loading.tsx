export default function LoadingBlogPost() {
  return (
    <div className="min-h-screen bg-background px-6 pt-36 pb-24 max-w-4xl mx-auto">
      <div className="h-7 bg-muted/30 rounded-full animate-pulse w-36 mb-8" />
      <div className="space-y-3 mb-6">
        <div className="h-12 bg-muted/40 rounded-2xl animate-pulse w-full" />
        <div className="h-12 bg-muted/35 rounded-2xl animate-pulse w-4/5" />
      </div>
      <div className="h-5 bg-muted/20 rounded-lg animate-pulse w-40 mb-16" />
      <div className="bg-card/20 rounded-3xl border border-white/5 p-8 space-y-4">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={`h-5 bg-muted/20 rounded-lg animate-pulse ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`}
          />
        ))}
      </div>
    </div>
  );
}
