'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Clock, ShieldAlert } from 'lucide-react';
import { DOCUMENT_TEMPLATES } from '@/lib/legal/document-templates';

// Interfaz que representa los datos de una compra almacenados en Firestore
interface PurchaseData {
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR' | 'VOIDED';
  productType?: string;
  productLabel?: string;
  customerEmail?: string;
  celular?: string;
  caseData?: {
    infractorName?: string;
    infractorId?: string;
    licensePlate?: string;
    autoridadTransito?: string;
    direccionNotificacion?: string;
  };
}

function ConfirmacionContent() {
  const params = useSearchParams();
  const ref = params.get('ref');
  const [status, setStatus] = useState<
    'loading' | 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR' | 'VOIDED'
  >('loading');
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null);

  useEffect(() => {
    if (!ref) return;

    const checkStatus = async (): Promise<boolean> => {
      try {
        const downloadToken =
          (typeof window !== 'undefined' &&
            (sessionStorage.getItem(`download_token_${ref}`) ||
              localStorage.getItem(`download_token_${ref}`))) ||
          '';
        const res = await fetch(`/api/payments/status?ref=${ref}&downloadToken=${downloadToken}`);
        if (!res.ok) return false;
        const data = await res.json();
        if (data.status) {
          setStatus(data.status);
          setPurchaseData({
            status: data.status,
            productType: data.productType,
            caseData: data.caseData,
          });
          if (
            data.status === 'APPROVED' ||
            data.status === 'DECLINED' ||
            data.status === 'ERROR' ||
            data.status === 'VOIDED'
          ) {
            return true;
          }
        }
      } catch (err) {
        console.error('Error al consultar estado del pago:', err);
      }
      return false;
    };

    // Consultar inmediatamente
    checkStatus();

    // Polling cada 4 segundos
    const intervalId = setInterval(async () => {
      const shouldStop = await checkStatus();
      if (shouldStop) {
        clearInterval(intervalId);
      }
    }, 4000);

    const timeout = setTimeout(
      () => {
        clearInterval(intervalId);
        setStatus((s) => (s === 'PENDING' || s === 'loading' ? 'PENDING' : s));
      },
      5 * 60 * 1000
    );

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeout);
    };
  }, [ref]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Cargando estado del pago...</h2>
        <p className="text-slate-500 mt-2">Por favor espera un momento.</p>
      </div>
    );
  }

  if (status === 'APPROVED') {
    const isSelfService =
      purchaseData?.productType === 'poder_especial' ||
      (purchaseData?.productType && purchaseData.productType in DOCUMENT_TEMPLATES);

    const handleDownload = async () => {
      try {
        // Recuperar el token de descarga de sessionStorage (o fallback a localStorage)
        const downloadToken =
          (typeof window !== 'undefined' &&
            (sessionStorage.getItem(`download_token_${ref}`) ||
              localStorage.getItem(`download_token_${ref}`))) ||
          '';
        // Usar el cerebro premium del servidor para descargar el archivo unificado
        window.location.href = `/api/documentos/download?ref=${ref}&downloadToken=${downloadToken}`;
      } catch (err) {
        console.error('Error iniciando descarga:', err);
        alert('Ocurrió un error al descargar el PDF. Por favor, recarga la página.');
      }
    };

    const handleDownloadInstructions = async () => {
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138); // blue-900
        doc.text('GUÍA DE ENVÍO - DESMULTA', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        let cursorY = 35;

        doc.text('Paso 1: REVISAR EL DOCUMENTO LEGAL', 20, cursorY);
        doc.setFont('helvetica', 'normal');
        cursorY += 7;
        doc.text('- Revisa que todos los datos en tu Petición estén correctos.', 25, cursorY);
        cursorY += 6;
        doc.text('- Guarda el archivo PDF en un lugar seguro.', 25, cursorY);

        cursorY += 12;
        doc.setFont('helvetica', 'bold');
        doc.text('Paso 2: PREPARAR LOS ANEXOS OBLIGATORIOS', 20, cursorY);
        doc.setFont('helvetica', 'normal');
        cursorY += 7;
        const lines = doc.splitTextToSize(
          '- Es obligatorio adjuntar copia de tu cédula por ambas caras y un pantallazo de tus comparendos en el SIMIT. Usa iLovePDF.com para unir todo en 1 solo archivo.',
          160
        );
        doc.text(lines, 25, cursorY);
        cursorY += lines.length * 6;

        cursorY += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Paso 3: ENVIAR POR CORREO', 20, cursorY);
        doc.setFont('helvetica', 'normal');
        cursorY += 7;
        const autoridad = purchaseData?.caseData?.autoridadTransito || 'Secretaría de Tránsito';
        doc.text(
          `- Envía tu PDF final (Petición + Anexos) a la PQRS de la ${autoridad}.`,
          25,
          cursorY
        );

        cursorY += 15;
        doc.setFillColor(248, 250, 252);
        doc.rect(20, cursorY, 170, 75, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('PLANTILLA SUGERIDA PARA TU CORREO:', 25, cursorY + 10);

        cursorY += 20;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`ASUNTO: DERECHO DE PETICIÓN (ART 23 CP) - C.C. [Tu Cédula]`, 25, cursorY);

        cursorY += 10;
        doc.text(`Señores\n${autoridad}`, 25, cursorY);
        cursorY += 10;
        const bodyLines = doc.splitTextToSize(
          `Cordial saludo,\n\nAdjunto a este correo el documento PDF contentivo del DERECHO DE PETICIÓN, debidamente firmado, ejerciendo mis derechos constitucionales.\n\nSolicito amablemente acusar recibo de este correo y asignarle número de radicado.\n\nAtentamente,\n[Tu Nombre]\nC.C. [Tu Cédula]`,
          160
        );
        doc.text(bodyLines, 25, cursorY);

        doc.save('Guia_Envio_Desmulta.pdf');
      } catch (err) {
        console.error('Error generando instrucciones:', err);
        alert('Ocurrió un error generando la guía. Por favor, recarga la página.');
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 relative z-10 animate-in fade-in zoom-in duration-500">
        {/* Branding Desmulta */}
        <div className="flex items-center gap-2 mb-10 opacity-80">
          <ShieldAlert className="w-6 h-6 text-yellow-400" />
          <span className="text-xl font-black tracking-widest text-white">DESMULTA</span>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 rounded-full w-24 h-24 mx-auto animate-pulse" />
          <CheckCircle2 className="w-24 h-24 text-yellow-400 mb-6 relative z-10 drop-shadow-xl" />
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-[0_0_10px_rgba(250,204,21,0.1)]">
          ¡Aprobado!
        </h2>
        <p className="text-zinc-400 mt-2 max-w-md mx-auto text-lg mb-10">
          Tu documento legal ha sido redactado con tus datos y está listo para descargar.
        </p>

        {isSelfService ? (
          <div className="w-full space-y-8">
            {/* Botones - AMBOS AMARILLOS */}
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mt-4">
              <button
                onClick={handleDownload}
                className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold py-4 px-8 rounded-full transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] flex items-center justify-center gap-3 text-lg"
              >
                📄 Descargar Petición
              </button>

              <button
                onClick={handleDownloadInstructions}
                className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold py-4 px-8 rounded-full transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] flex items-center justify-center gap-3 text-lg"
              >
                📋 Guía de Envío
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 text-left">
              <h3 className="font-bold text-yellow-400 text-xl mb-6 flex items-center gap-2">
                Instrucciones de Radicación
              </h3>
              <ol className="list-decimal pl-5 space-y-4 text-zinc-300 mb-8 text-lg">
                <li>
                  <strong>Descarga el PDF</strong> haciendo clic en el botón amarillo.
                </li>
                <li>
                  <strong>Revísalo:</strong> Asegúrate de que los datos estén correctos y guárdalo.
                </li>
                <li>
                  <strong>Envíalo:</strong> Adjunta el PDF y envíalo al correo oficial de PQRS de la{' '}
                  <strong>
                    {purchaseData?.caseData?.autoridadTransito || 'Secretaría de Tránsito'}
                  </strong>
                  .
                </li>
              </ol>

              <div className="bg-black border border-zinc-800 rounded-2xl p-5">
                <h4 className="font-bold text-zinc-500 mb-4 text-sm uppercase tracking-wider">
                  Copia y pega esto en tu correo:
                </h4>
                <div className="mb-5">
                  <span className="text-xs font-bold text-yellow-500 uppercase">Asunto:</span>
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-[15px] font-medium text-zinc-200 select-all mt-2 tracking-wide shadow-inner">
                    DERECHO DE PETICIÓN (ART 23 CP) - C.C. [Tu Cédula] - [Tu Placa]
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-yellow-500 uppercase">
                    Cuerpo del Mensaje:
                  </span>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-[15px] font-medium text-zinc-200 select-all whitespace-pre-wrap mt-2 leading-relaxed shadow-inner">
                    {`Señores
${purchaseData?.caseData?.autoridadTransito || 'Secretaría de Tránsito'}

Cordial saludo,

Adjunto a este correo electrónico el documento en formato PDF contentivo del DERECHO DE PETICIÓN, ejerciendo mis derechos constitucionales.

Solicito amablemente acusar recibo de este correo y asignarle un número de radicado para mi seguimiento.

Atentamente,
[Tu Nombre]
C.C. [Tu Cédula]
Teléfono: [Tu Teléfono]
Dirección de notificaciones: [Tu Dirección]`}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-zinc-800/50">
              <Link
                href="/"
                className="text-zinc-400 hover:text-white font-medium transition-colors inline-flex items-center gap-2"
              >
                ← Volver a la página principal
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <p className="text-zinc-300 mt-2 text-lg">
              Tu pago ha sido procesado correctamente. Nuestro equipo jurídico especializado
              (Humano) ha sido notificado y tomará tu caso de inmediato.
            </p>
            <div className="mt-8 p-6 bg-zinc-900 border border-yellow-400/30 rounded-3xl text-sm text-zinc-300">
              <strong className="text-yellow-400 text-base block mb-2">Siguiente paso:</strong> Te
              enviaremos notificaciones a tu correo y a WhatsApp a medida que avancemos en la
              recolección de pruebas, redacción y radicación de tu caso.
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 relative z-10">
        <XCircle className="w-20 h-20 text-red-500 mb-6" />
        <h2 className="text-4xl font-black text-white mb-3">Pago Rechazado</h2>
        <p className="text-zinc-400 mt-2 max-w-md text-lg">
          Lo sentimos, tu entidad bancaria ha rechazado el pago o la transacción ha fallado. Por
          favor, intenta nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 relative z-10">
      <Clock className="w-20 h-20 text-yellow-400 mb-6 animate-pulse" />
      <h2 className="text-4xl font-black text-white mb-3">Procesando pago...</h2>
      <p className="text-zinc-300 mt-2 max-w-md text-lg">
        Estamos esperando la confirmación de Wompi y tu banco.
      </p>
      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-full py-3 px-6 inline-block">
        <p className="text-sm text-zinc-400">Esta página se actualizará automáticamente.</p>
      </div>
    </div>
  );
}

export default function ConfirmacionPago() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex items-center justify-center relative selection:bg-yellow-400 selection:text-black overflow-hidden">
      {/* Luces sutiles de fondo para darle "vida" */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-yellow-400/5 blur-[150px] pointer-events-none" />

      <div className="max-w-3xl w-full mx-4 my-8 relative z-10">
        <div className="bg-[#0f0f0f] border border-zinc-800/80 rounded-[2rem] shadow-2xl relative">
          {/* Acento superior amarillo muy sutil */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-yellow-400 rounded-b-xl opacity-50" />

          <div className="p-8 sm:p-12">
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                  <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
                  <p className="text-zinc-500 mt-6 font-medium tracking-wide uppercase text-sm">
                    Validando transacción...
                  </p>
                </div>
              }
            >
              <ConfirmacionContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
