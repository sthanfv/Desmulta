'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { dispatchOTP, verifyOTP } from '@/actions/legal-auth';

interface InterceptorProps {
  documentId: string;
  email: string;
  operatorPhone: string; // Para el WhatsApp Invertido
  onAuthorizationComplete: (payload: { method: string; proof: string }) => void;
}

export default function SignatureInterceptor({
  documentId,
  email,
  operatorPhone,
  onAuthorizationComplete,
}: InterceptorProps) {
  const [activeTab, setActiveTab] = useState<'OTP' | 'WA_INVERTED'>('OTP');
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendOTP = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await dispatchOTP(email, documentId);
    setLoading(false);
    if (res.status === 200) {
      setSuccessMsg(`Código enviado a ${email}. Revise también su carpeta de spam.`);
    } else {
      setErrorMsg(
        res.error && typeof res.error === 'string'
          ? res.error
          : 'No pudimos enviar el código. Por favor, intente de nuevo.'
      );
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await verifyOTP(documentId, otpInput);
    setLoading(false);
    if (res.status === 200) {
      onAuthorizationComplete({ method: 'OTP_EMAIL', proof: 'VERIFIED' });
    } else {
      const msg =
        res.error && typeof res.error === 'string'
          ? res.error
          : res.status === 429
            ? 'Ha superado el número máximo de intentos. Por seguridad, solicite un nuevo código.'
            : res.status === 403
              ? 'El código ha expirado. Solicite uno nuevo.'
              : 'Código incorrecto. Verifique e intente de nuevo.';
      setErrorMsg(msg);
    }
  };

  const generateWhatsAppLink = () => {
    const authString = `Autorizo_tramite_${documentId.substring(0, 6)}`;
    return `https://wa.me/57${operatorPhone}?text=${authString}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card text-card-foreground border border-border p-6 rounded-2xl shadow-xl w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4">Firma Electrónica Requerida</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Para que nuestro operador radique la solicitud en tu nombre, requerimos tu autorización
          bajo la Ley 527.
        </p>

        <div className="flex gap-4 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('OTP')}
            className={`p-2 -mb-[1px] font-medium transition-colors ${activeTab === 'OTP' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Vía Email OTP
          </button>
          <button
            onClick={() => setActiveTab('WA_INVERTED')}
            className={`p-2 -mb-[1px] font-medium transition-colors ${activeTab === 'WA_INVERTED' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Vía WhatsApp
          </button>
        </div>

        {activeTab === 'OTP' && (
          <div className="flex flex-col gap-4">
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 p-2.5 rounded-lg disabled:opacity-50 transition-colors font-medium text-sm"
            >
              {loading ? 'Enviando...' : `1. Enviar Código a ${email}`}
            </button>
            {successMsg && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg p-3">
                {successMsg}
              </p>
            )}
            <input
              type="text"
              maxLength={6}
              placeholder="Código de 6 dígitos"
              className="border border-input bg-background text-foreground p-3 rounded-lg text-center tracking-widest text-xl font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => {
                setOtpInput(e.target.value);
                setErrorMsg(null);
              }}
            />
            <button
              onClick={handleVerifyOTP}
              disabled={loading || otpInput.length !== 6}
              className="bg-primary text-primary-foreground hover:bg-primary/90 p-2.5 rounded-lg disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? 'Verificando...' : '2. Validar y Firmar'}
            </button>
            {errorMsg && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 rounded-lg p-3">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'WA_INVERTED' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Envía el código de seguridad a nuestro operador para liberar el trámite.
            </p>
            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white p-3 rounded-lg text-center block font-medium transition-colors"
              onClick={() =>
                onAuthorizationComplete({ method: 'WA_INVERTED', proof: 'PENDING_MANUAL_REVIEW' })
              }
            >
              Abrir WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
