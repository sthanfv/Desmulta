export default function LoadingMultasCiudad() {
  return (
    <div className="min-h-screen bg-black text-white px-6 pt-32 pb-20 max-w-4xl mx-auto">
      <div className="h-8 bg-white/10 rounded-full animate-pulse w-32 mx-auto mb-8" />
      <div className="h-12 bg-white/10 rounded-2xl animate-pulse w-full mx-auto mb-3" />
      <div className="h-12 bg-white/8 rounded-2xl animate-pulse w-4/5 mx-auto mb-12" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-16">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3 animate-pulse"
          >
            <div className="h-6 bg-white/10 rounded-xl w-2/3" />
            <div className="h-4 bg-white/8 rounded-lg w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
