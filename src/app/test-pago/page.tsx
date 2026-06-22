'use client';

import { useState } from 'react';
import { WompiCheckout } from '@/components/payments/WompiCheckout';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

interface CheckoutData {
  wompiReference: string;
  amountCop: number;
  signature: string;
  publicKey: string;
  customerEmail: string;
  redirectUrl: string;
}

export default function TestPagoPage() {
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      productType: formData.get('productType') as string,
      customerEmail: formData.get('email') as string,
      cedula: formData.get('cedula') as string,
      celular: formData.get('celular') as string,
      caseData: {
        infractorName: formData.get('nombre') as string,
        infractorId: formData.get('cedula') as string,
        shortId: 'CASE-TEST-' + Math.floor(Math.random() * 10000),
        licensePlate: 'ABC-123',
        ticketNumber: '123456789',
      },
    };

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Error validation details:', data.details);
        throw new Error(
          data.error + (data.details ? ' Detalles: ' + JSON.stringify(data.details) : '')
        );
      }

      setCheckoutData({
        wompiReference: data.wompiReference,
        amountCop: data.amountCop,
        signature: data.signature,
        publicKey: data.publicKey,
        customerEmail: payload.customerEmail,
        redirectUrl: data.redirectUrl || '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido al crear la orden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2 shadow-sm border border-primary/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Checkout de Prueba</h1>
          <p className="text-muted-foreground text-sm">
            Entorno Sandbox. Permite simular la transacción con Wompi sin usar dinero real.
          </p>
        </div>

        {!checkoutData ? (
          <form
            onSubmit={handleCreateOrder}
            className="bg-card border border-border p-6 md:p-8 rounded-[2rem] shadow-xl shadow-black/5 space-y-6"
          >
            {error && (
              <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-2xl text-sm flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="break-words w-full">{error}</div>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5 ml-1">
                  Producto a Facturar
                </label>
                <select
                  name="productType"
                  className="w-full px-5 py-3.5 bg-background border border-border text-foreground rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none shadow-sm"
                >
                  <option value="peticion_general">Derecho de Petición General ($25.000)</option>
                  <option value="prescripcion_directa">Prescripción Directa ($35.000)</option>
                  <option value="poder_especial">Poder Especial ($20.000)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5 ml-1">
                  Nombre del Infractor
                </label>
                <input
                  type="text"
                  name="nombre"
                  defaultValue="Juan Pérez"
                  required
                  className="w-full px-5 py-3.5 bg-background border border-border text-foreground rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5 ml-1">
                    Cédula
                  </label>
                  <input
                    type="text"
                    name="cedula"
                    defaultValue="1090123456"
                    required
                    className="w-full px-5 py-3.5 bg-background border border-border text-foreground rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5 ml-1">
                    Celular
                  </label>
                  <input
                    type="text"
                    name="celular"
                    defaultValue="3001234567"
                    required
                    className="w-full px-5 py-3.5 bg-background border border-border text-foreground rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5 ml-1">
                  Correo Electrónico (Notificación PDF)
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue="test@desmulta.online"
                  required
                  className="w-full px-5 py-3.5 bg-background border border-border text-foreground rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider text-sm rounded-2xl transition-all shadow-lg hover:shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Procesando Orden...
                </>
              ) : (
                'Crear Orden de Pago'
              )}
            </button>
          </form>
        ) : (
          <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl shadow-black/5 space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Orden Generada</h2>
            <p className="text-muted-foreground mb-8">
              Referencia:{' '}
              <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                {checkoutData.wompiReference}
              </span>
            </p>

            {/* Widget de Wompi */}
            <div className="flex justify-center pt-2 pb-4">
              <WompiCheckout {...checkoutData} />
            </div>

            <p className="text-xs text-muted-foreground/60 mt-6 pt-6 border-t border-border">
              Al dar clic, se abrirá el widget seguro de Wompi para ingresar los datos de prueba.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
