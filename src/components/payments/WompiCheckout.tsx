'use client';
import { ExternalLink } from 'lucide-react';

interface WompiCheckoutProps {
  wompiReference: string;
  amountCop: number;
  signature: string;
  publicKey: string;
  customerEmail: string;
  redirectUrl: string;
}

export function WompiCheckout({
  wompiReference,
  amountCop,
  signature,
  publicKey,
  customerEmail,
  redirectUrl,
}: WompiCheckoutProps) {
  // Construir la URL del Web Checkout de Wompi
  const params = new URLSearchParams({
    'public-key': publicKey,
    currency: 'COP',
    'amount-in-cents': String(amountCop),
    reference: wompiReference,
    'signature:integrity': signature,
    'redirect-url': redirectUrl,
    'customer-data:email': customerEmail,
  });

  const wompiUrl = `https://checkout.wompi.co/p/?${params.toString()}`;

  return (
    <a href={wompiUrl} target="_blank" rel="noopener noreferrer" className="inline-block w-full sm:w-auto">
      <button
        type="button"
        className="w-full sm:w-auto px-8 py-4 bg-[#1E293B] hover:bg-[#0F172A] dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3"
      >
        <span>Pagar con Wompi</span>
        <ExternalLink className="w-5 h-5" />
      </button>
    </a>
  );
}
