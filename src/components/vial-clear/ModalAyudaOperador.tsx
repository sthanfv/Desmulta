import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Search, RefreshCw, Download, FileArchive, Filter, Wallet, Undo2 } from 'lucide-react';

interface ModalAyudaOperadorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalAyudaOperador({ isOpen, onClose }: ModalAyudaOperadorProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Guía de Herramientas del Tablero
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Aprende a filtrar y buscar eficientemente sin consumir cuota de la base de datos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 flex gap-4">
            <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-300">¡Búsquedas Gratuitas!</h4>
              <p className="text-xs text-blue-800 dark:text-blue-200/80 mt-1">
                Todas las búsquedas y filtros en esta barra se hacen en la memoria de tu
                dispositivo. Esto significa que puedes buscar y filtrar mil veces y{' '}
                <strong>no generará costos en Firebase</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Buscador Inteligente
                </h4>
                <p className="text-xs text-slate-500">
                  Escribe un nombre, número de cédula o placa para encontrar un cliente al instante
                  en todo el tablero.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Filtros de Ciudad, Fecha y Estado
                </h4>
                <p className="text-xs text-slate-500">
                  Usa estos menús para reducir el ruido visual. Si solo quieres trabajar los casos
                  de &quot;Bogotá&quot; o los que están en estado de &quot;Estudio&quot;, aquí es
                  donde debes seleccionarlo.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Exportar a Excel
                </h4>
                <p className="text-xs text-slate-500">
                  Descarga un archivo .xlsx con las tarjetas que estás viendo en este momento. Ideal
                  para pasarle un listado a contabilidad o gerencia.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <FileArchive className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Generar PDF (Requiere SIMIT)
                </h4>
                <p className="text-xs text-slate-500">
                  Crea un reporte formal en formato PDF. <strong>Importante:</strong> El sistema
                  ahora exige que primero se haya subido la captura SIMIT del cliente para poder
                  generar documentos legales.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Undo2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Retroceso de Estados
                </h4>
                <p className="text-xs text-slate-500">
                  Si mueves una tarjeta hacia atrás (ej. de Trámite a Estudio), el sistema te pedirá
                  obligatoriamente una nota justificando la razón. Esto queda registrado para
                  auditoría.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Refrescar Tablero
                </h4>
                <p className="text-xs text-slate-500">
                  <strong>¡Ojo!</strong> Este es el único botón que vuelve a descargar los datos
                  desde la nube y gasta lecturas. Úsalo solo si crees que hay clientes nuevos que no
                  te han aparecido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
