export const metadata = {
  title: 'Portal VIP | Desmulta',
  description: 'Acceso seguro sin contraseña para clientes Desmulta',
};

export default function VipLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white selection:bg-[#D4AF37] selection:text-black antialiased font-sans flex flex-col">
      {/* Background Decorators */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37] opacity-5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 opacity-5 blur-[150px] rounded-full"></div>
      </div>

      <main className="flex-grow flex flex-col items-center justify-center relative z-10 w-full mx-auto px-4 sm:px-6">
        {children}
      </main>
    </div>
  );
}
