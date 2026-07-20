'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ShieldAlert,
  MessageCircle,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { DOCUMENT_TEMPLATES } from '@/lib/legal/document-templates';
import dynamic from 'next/dynamic';

const MeshBackground = dynamic(
  () => import('@/components/ui/MeshBackground').then((m) => m.MeshBackground),
  { ssr: false }
);

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
  const [downloadError, setDownloadError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!ref) return;

    const checkStatus = async (): Promise<boolean> => {
      try {
        // 🛡️ MODO PRUEBA DE UI (Solo para propósitos de diseño visual)
        if (params.get('test_error') === 'true') {
          setStatus('APPROVED');
          setPurchaseData({ status: 'APPROVED', productType: 'poder_especial' });
          setDownloadError(true);
          return true;
        }

        const testStatus = params.get('test_status');
        if (testStatus === 'DECLINED' || testStatus === 'ERROR' || testStatus === 'PENDING') {
          setStatus(testStatus);
          return true;
        }

        // 🛡️ FIX: Token ya no viaja por URL, se lee desde las Cookies HttpOnly
        const res = await fetch(`/api/payments/status?ref=${ref}`);
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
  }, [ref, params]);

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
        setDownloading(true);
        setDownloadError(false);
        const res = await fetch(`/api/documentos/download?ref=${ref}&format=pdf`);
        if (!res.ok) {
          throw new Error('Fallo en la descarga');
        }

        // Recuperar el nombre original (ej: Documento_Desmulta_CASE181796.pdf)
        const disposition = res.headers.get('Content-Disposition');
        let filename = `Documento_${ref}.pdf`;
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) {
            filename = match[1];
          }
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error('Error iniciando descarga PDF:', err);
        setDownloadError(true);
      } finally {
        setDownloading(false);
      }
    };

    const handleDownloadWord = async () => {
      try {
        setDownloading(true);
        setDownloadError(false);
        const res = await fetch(`/api/documentos/download?ref=${ref}&format=docx`);
        if (!res.ok) {
          throw new Error('Fallo en la descarga');
        }

        const disposition = res.headers.get('Content-Disposition');
        let filename = `Documento_${ref}.docx`;
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) {
            filename = match[1];
          }
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error('Error iniciando descarga Word:', err);
        setDownloadError(true);
      } finally {
        setDownloading(false);
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
          <ShieldAlert className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
          <span className="text-xl font-black tracking-widest text-slate-900 dark:text-white">
            DESMULTA
          </span>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 rounded-full w-24 h-24 mx-auto animate-pulse" />
          <CheckCircle2 className="w-24 h-24 text-yellow-500 dark:text-yellow-400 mb-6 relative z-10 drop-shadow-xl" />
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight drop-shadow-[0_0_10px_rgba(250,204,21,0.1)]">
          ¡Aprobado!
        </h2>
        <p className="text-slate-600 dark:text-zinc-400 mt-2 max-w-md mx-auto text-lg mb-6">
          Tu documento legal ha sido redactado con tus datos y está listo para descargar.
        </p>

        {/* 🛡️ AVISO DE CORREO (Safety Net 1) */}
        <div className="mb-10 bg-blue-900/20 border border-blue-500/30 p-4 rounded-2xl flex items-center gap-3 text-left max-w-md w-full mx-auto">
          <Mail className="w-6 h-6 text-blue-400 shrink-0" />
          <p className="text-sm text-blue-200">
            <strong>Copia de seguridad enviada.</strong> Si no puedes descargar ahora, revisa tu
            correo (incluyendo Spam) para descargar tu documento en cualquier momento.
          </p>
        </div>

        {isSelfService ? (
          <div className="w-full space-y-8">
            {/* 🛡️ RESCATE WHATSAPP (Safety Net 2) */}
            {downloadError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-3xl p-6 md:p-8 text-center animate-in fade-in zoom-in">
                <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                  Error de Descarga
                </h3>
                <p className="text-slate-700 dark:text-zinc-300 text-sm mb-6 max-w-md mx-auto">
                  Tuvimos un problema técnico al entregar tu PDF, pero tu pago está{' '}
                  <strong>seguro y confirmado</strong>. Por favor, contáctanos inmediatamente por
                  WhatsApp para enviarte el documento de forma manual.
                </p>
                <a
                  href={`https://wa.me/573000000000?text=Hola,%20pagué%20mi%20documento%20con%20referencia%20${ref}%20pero%20tuve%20un%20error%20al%20descargarlo.%20¿Me%20ayudan?`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-extrabold py-4 px-8 rounded-full transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center gap-3 text-lg mx-auto"
                >
                  <MessageCircle className="w-6 h-6" />
                  Contactar Soporte Técnico
                </a>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mt-4">
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold py-3 px-8 rounded-full transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-wait"
                  >
                    {downloading ? <Loader2 className="w-6 h-6 animate-spin" /> : '📄'}
                    {downloading ? 'Descargando...' : 'Descargar PDF'}
                  </button>
                  <button
                    onClick={handleDownloadWord}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-8 rounded-full transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 text-sm opacity-90"
                  >
                    📝 Descargar en Word
                  </button>
                </div>

                <button
                  onClick={handleDownloadInstructions}
                  className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold py-4 px-8 rounded-full transition-all hover:scale-105 flex items-center justify-center gap-3 text-lg h-full self-start sm:mt-0 mt-2"
                >
                  📋 Guía de Envío
                </button>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 text-left">
              <h3 className="font-bold text-yellow-600 dark:text-yellow-400 text-xl mb-6 flex items-center gap-2">
                Instrucciones de Radicación
              </h3>
              <ol className="list-decimal pl-5 space-y-4 text-slate-700 dark:text-zinc-300 mb-8 text-lg">
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

              <div className="bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
                <h4 className="font-bold text-slate-500 dark:text-zinc-500 mb-4 text-sm uppercase tracking-wider">
                  Copia y pega esto en tu correo:
                </h4>
                <div className="mb-5">
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase">
                    Asunto:
                  </span>
                  <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl text-[15px] font-medium text-slate-800 dark:text-zinc-200 select-all mt-2 tracking-wide shadow-inner">
                    DERECHO DE PETICIÓN (ART 23 CP) - C.C. [Tu Cédula] - [Tu Placa]
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase">
                    Cuerpo del Mensaje:
                  </span>
                  <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl text-[15px] font-medium text-slate-800 dark:text-zinc-200 select-all whitespace-pre-wrap mt-2 leading-relaxed shadow-inner">
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
        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-3">Pago Rechazado</h2>
        <p className="text-slate-600 dark:text-zinc-400 mt-2 max-w-md text-lg mb-8">
          Lo sentimos, tu entidad bancaria ha rechazado el pago o la transacción ha fallado. Por
          favor, intenta nuevamente.
        </p>

        {/* 🛡️ RESCATE WHATSAPP PAGO RECHAZADO */}
        <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md">
          <p className="text-sm text-slate-700 dark:text-zinc-300 mb-4">
            ¿Sientes que te cobraron pero sale rechazado? Estamos aquí para ayudarte.
          </p>
          <a
            href={`https://wa.me/573000000000?text=Hola,%20tuve%20un%20problema%20con%20el%20pago%20de%20referencia%20${ref}.%20El%20dinero%20se%20debitó%20pero%20dice%20Rechazado.`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 font-bold py-3 px-6 rounded-full transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Soporte por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 relative z-10">
      <Clock className="w-20 h-20 text-yellow-500 dark:text-yellow-400 mb-6 animate-pulse" />
      <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-3">
        Procesando pago...
      </h2>
      <p className="text-slate-700 dark:text-zinc-300 mt-2 max-w-md text-lg">
        Estamos esperando la confirmación de Wompi y tu banco.
      </p>
      <div className="mt-8 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full py-3 px-6 inline-block shadow-sm dark:shadow-none">
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Esta página se actualizará automáticamente.
        </p>
      </div>
    </div>
  );
}

export default function ConfirmacionPago() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-zinc-100 flex items-center justify-center relative selection:bg-yellow-400 selection:text-black overflow-hidden transition-colors duration-500">
      <MeshBackground />

      {/* Patrón de puntos para modo oscuro (solicitado) */}
      <div
        className="absolute inset-0 z-0 hidden dark:block opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#f59e0b 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Luces sutiles de fondo para darle "vida" */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-yellow-400/10 dark:bg-yellow-400/5 blur-[100px] md:blur-[150px] pointer-events-none z-0" />

      <div className="max-w-3xl w-full mx-4 my-8 relative z-10">
        <div className="bg-white dark:bg-[#0f0f0f] border border-slate-200 dark:border-zinc-800/80 rounded-[2rem] shadow-2xl relative transition-colors duration-500">
          {/* Acento superior amarillo muy sutil */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-yellow-400 rounded-b-xl opacity-80 dark:opacity-50" />

          <div className="p-8 sm:p-12">
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                  <Loader2 className="w-12 h-12 text-yellow-500 dark:text-yellow-400 animate-spin" />
                  <p className="text-slate-500 dark:text-zinc-500 mt-6 font-medium tracking-wide uppercase text-sm">
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
