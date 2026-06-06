export default function LoadingBlog() {
  return (
    <div className="min-h-screen bg-background px-6 pt-36 pb-24 max-w-4xl mx-auto">
      <div className="h-10 bg-muted/40 rounded-2xl animate-pulse w-1/2 mb-4" />
      <div className="h-5 bg-muted/25 rounded-xl animate-pulse w-1/3 mb-16" />
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-3xl p-8 space-y-4 animate-pulse"
          >
            <div className="h-4 bg-muted/40 rounded-lg w-1/4" />
            <div className="h-7 bg-muted/30 rounded-xl w-3/4" />
            <div className="h-4 bg-muted/20 rounded-lg w-full" />
            <div className="h-4 bg-muted/20 rounded-lg w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
