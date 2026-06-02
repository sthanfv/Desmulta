'use client';

import { CheckCircle2, BellRing, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WatermarkedEvidence from '@/components/security/WatermarkedEvidence';
import { useToast } from '@/hooks/use-toast';
import { QRCodeCanvas } from 'qrcode.react';

interface StepSuccessProps {
  successData: { docId: string; trackingUuid?: string };
  evidenceUrl: string | undefined;
  proofId: string;
  fcmToken: string | null;
  hasInteractedWithPush: boolean;
  isHandlingPermission: boolean;
  requestNotificationPermission: (docId: string) => Promise<string | null>;
  setHasInteractedWithPush: (interacted: boolean) => void;
  onSuccess: () => void;
  toast: ReturnType<typeof useToast>['toast'];
  isSimitMode?: boolean;
}

export default function StepSuccess({
  successData,
  evidenceUrl,
  proofId,
  fcmToken,
  hasInteractedWithPush,
  isHandlingPermission,
  requestNotificationPermission,
  setHasInteractedWithPush,
  onSuccess,
  toast,
  isSimitMode,
}: StepSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-8 text-center min-h-[450px] animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-8 shadow-Inner border border-green-500/20">
        <CheckCircle2 className="w-14 h-14" />
      </div>
      <h3 className="text-2xl md:text-3xl font-black mb-4 text-foreground tracking-tight uppercase">
        Consulta Recibida
      </h3>
      <p className="text-muted-foreground text-lg max-w-sm leading-relaxed font-medium mb-6">
        Su caso está siendo procesado por nuestro{' '}
        <strong>equipo de analistas especializados</strong>.
        {isSimitMode ? (
          <>
            {' '}
            Nos pondremos en contacto a través del número que registró para coordinar el proceso.
          </>
        ) : (
          <>
            {' '}
            Recibirá un correo electrónico de confirmación con los detalles iniciales. Por favor,
            revise tanto su bandeja principal como la carpeta de{' '}
            <span className="text-primary font-bold">Spam o Correo No Deseado</span>.
          </>
        )}
      </p>

      {evidenceUrl && (
        <div className="w-full max-w-xs mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 text-center">
            Constancia Desmulta Zero-PII
          </p>
          <WatermarkedEvidence imageUrl={evidenceUrl} caseId={proofId} />
        </div>
      )}

      {isSimitMode && successData.trackingUuid && (
        <div className="mb-8 p-6 rounded-[2rem] border-2 border-red-500/40 bg-red-500/10 flex flex-col items-center gap-4 w-full max-w-md shadow-lg shadow-red-500/5">
          <div className="flex flex-col items-center">
            <h4 className="text-red-600 font-black uppercase text-lg mb-1 tracking-wider text-center">
              ⚠️ ¡ACCIÓN OBLIGATORIA!
            </h4>
            <p className="text-sm text-foreground/90 text-center font-bold leading-tight">
              COPIA ESTE ENLACE AHORA O PERDERÁS EL ACCESO A TU CASO
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center font-medium leading-relaxed px-2">
            ⚠️ <strong>ATENCIÓN:</strong> Como usaste la captura automática de SIMIT y no ingresaste
            correo electrónico, el sistema no podrá enviarte confirmación. Guarda tu código de
            seguimiento o perderás tu caso:
          </p>

          <div className="bg-white dark:bg-black border border-red-500/30 p-1 pl-4 rounded-xl w-full flex items-center justify-between gap-2 shadow-inner">
            <a
              href={`https://desmulta.online/seguir/${successData.trackingUuid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-bold text-xs truncate max-w-[200px] hover:underline"
            >
              desmulta.online/seguir/{successData.trackingUuid}
            </a>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://desmulta.online/seguir/${successData?.trackingUuid}`
                );
                toast({
                  title: '¡Enlace Copiado!',
                  description: 'Pégalo en WhatsApp, block de notas o donde no se te pierda.',
                });
              }}
              className="rounded-lg font-black uppercase text-[10px] bg-red-600 hover:bg-red-700 text-white"
            >
              Copiar Enlace
            </Button>
          </div>

          {/* CÓDIGO QR DE RESPALDO */}
          <div className="flex flex-col items-center gap-2 mt-4 w-full bg-white dark:bg-black p-4 rounded-2xl border border-red-500/20 shadow-inner">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">
              Código QR de Respaldo
            </p>
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
              <QRCodeCanvas
                id={`qr-client-${successData.trackingUuid}`}
                value={`https://desmulta.online/seguir/${successData.trackingUuid}`}
                size={120}
                level="M"
                includeMargin={false}
              />
            </div>
            <Button
              onClick={() => {
                const qrCanvas = document.getElementById(
                  `qr-client-${successData.trackingUuid}`
                ) as HTMLCanvasElement;
                if (!qrCanvas) return;

                const targetSize = 320;
                const HEADER_H = 60;
                const PADDING = 20;
                const BOTTOM_H = 60;

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = targetSize + PADDING * 2;
                tempCanvas.height = targetSize + HEADER_H + BOTTOM_H + PADDING * 2;
                const ctx = tempCanvas.getContext('2d');
                if (!ctx) return;

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                // Franja dorada superior (Header completo)
                ctx.fillStyle = '#F5A800';
                ctx.fillRect(0, 0, tempCanvas.width, HEADER_H);

                // Texto de marca en el header
                ctx.fillStyle = '#000000';
                ctx.font = '900 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('DESMULTA.ONLINE', tempCanvas.width / 2, HEADER_H / 2 + 8);

                // Dibujar el QR centrado
                ctx.drawImage(
                  qrCanvas,
                  0,
                  0,
                  qrCanvas.width,
                  qrCanvas.height,
                  PADDING,
                  HEADER_H + PADDING,
                  targetSize,
                  targetSize
                );

                // Texto del ID en el bottom
                ctx.fillStyle = '#666666';
                ctx.font = '16px sans-serif';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(
                  `ID: ${(successData.trackingUuid || 'N-A').slice(0, 8)}`,
                  tempCanvas.width / 2,
                  tempCanvas.height - 25
                );

                tempCanvas.toBlob((blob) => {
                  if (!blob) return;
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `QR_Desmulta_${(successData.trackingUuid || 'N-A').slice(0, 8)}.png`;
                  a.click();
                  URL.revokeObjectURL(url);
                }, 'image/png');
              }}
              variant="outline"
              size="sm"
              className="w-full text-[10px] uppercase font-black tracking-widest mt-2 border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Download className="w-3 h-3 mr-2" />
              Descargar QR
            </Button>
          </div>
        </div>
      )}

      {!fcmToken && !hasInteractedWithPush && (
        <div
          className={`mb-8 p-4 rounded-[2rem] border-2 flex flex-col items-center gap-3 w-full max-w-sm ${isSimitMode ? 'border-amber-500/40 bg-amber-500/10' : 'border-primary/20 bg-primary/5'}`}
        >
          <div
            className={`flex items-center gap-2 font-black uppercase text-xs ${isSimitMode ? 'text-amber-600' : 'text-primary'}`}
          >
            <BellRing size={16} className="animate-bounce" />
            {isSimitMode ? '⚠️ IMPRESCINDIBLE: Activa las Alertas' : 'Alertas en Tiempo Real'}
          </div>
          <p className="text-xs text-muted-foreground text-center font-medium leading-tight">
            {isSimitMode
              ? 'Como no tienes correo registrado, DEBES activar las notificaciones push para enterarte cuando nuestro analista te responda.'
              : 'Permítenos enviarte una notificación nativa en cuanto nuestro analista termine de evaluar tu expediente.'}
          </p>
          <Button
            onClick={async () => {
              if (successData.docId !== 'OFFLINE_PENDING') {
                await requestNotificationPermission(successData.docId);
                setHasInteractedWithPush(true);
              } else {
                toast({
                  title: 'Conexión Necesaria',
                  description: 'Espera a recuperar la señal para activar esto.',
                });
              }
            }}
            disabled={isHandlingPermission || successData.docId === 'OFFLINE_PENDING'}
            className={`w-full mt-2 h-12 rounded-xl text-primary-foreground font-black uppercase tracking-widest text-xs active:scale-95 transition-all pwa-native-feel shadow-lg ${isSimitMode ? 'bg-amber-600 shadow-amber-600/20' : 'bg-primary shadow-primary/20'}`}
          >
            {isHandlingPermission ? 'Configurando...' : 'Activar Alerta Automática'}
          </Button>
        </div>
      )}

      <Button
        onClick={onSuccess}
        variant="outline"
        className="rounded-2xl w-full sm:w-auto px-6 md:px-12 border-primary/20 hover:bg-primary/5 text-primary font-black active:scale-95 transition-all relative overflow-hidden h-14 uppercase tracking-widest text-xs md:text-sm"
      >
        Cerrar Notificación
      </Button>
    </div>
  );
}
