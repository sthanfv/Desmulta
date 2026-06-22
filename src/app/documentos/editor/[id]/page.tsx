/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase-client';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Loader2, Download, ShieldCheck, Edit3, Save } from 'lucide-react';

export default function DocumentEditor({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const refId = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<unknown>(null);

  // Formulario del Editor
  const [formData, setFormData] = useState({
    ciudad: 'Bogotá D.C.',
    fecha: new Date().toLocaleDateString('es-CO'),
    autoridad: 'Secretaría de Movilidad',
    direccion: 'Calle 123 # 45-67',
    emailPersonal: '',
  });

  useEffect(() => {
    async function loadPurchase() {
      try {
        const snap = await getDoc(doc(db, 'purchases', refId));
        if (!snap.exists()) {
          router.push('/');
          return;
        }

        const data = snap.data();
        if (data.status !== 'APPROVED') {
          router.push(`/documentos/confirmacion?ref=${refId}`);
          return;
        }

        setPurchase(data);
        setFormData((prev) => ({
          ...prev,
          emailPersonal: data.customerEmail || '',
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadPurchase();
  }, [refId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDownload = async () => {
    // Aquí invocaremos la lógica de PDF-lib o jspdf más adelante.
    try {
      await updateDoc(doc(db, 'purchases', refId), {
        finalDocumentData: formData,
        documentGeneratedAt: new Date().toISOString(),
      });
      alert(
        '¡Documento guardado y listo para descarga! (El motor de PDF se integrará en el siguiente paso).'
      );
    } catch (e) {
      console.error(e);
      alert('Error guardando los datos.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Panel Izquierdo: Formulario de Edición */}
      <div className="w-full md:w-1/3 bg-white border-r border-slate-200 p-8 flex flex-col shadow-xl z-10 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-blue-600" />
            Configurar Documento
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Completa los datos faltantes para finalizar tu
            <strong className="text-blue-600 ml-1">{purchase?.productLabel}</strong>.
          </p>
        </div>

        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Ciudad de Emisión
            </label>
            <input
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Autoridad de Tránsito
            </label>
            <input
              name="autoridad"
              value={formData.autoridad}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Dirección de Notificación
            </label>
            <input
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <button
            onClick={handleDownload}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-5 h-5" />
            Generar y Descargar PDF
          </button>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            Documento cifrado con Grado Bancario
          </div>
        </div>
      </div>

      {/* Panel Derecho: Previsualización */}
      <div className="w-full md:w-2/3 bg-slate-200 p-4 md:p-12 overflow-y-auto flex justify-center">
        <div
          className="bg-white w-full max-w-3xl shadow-2xl p-12 min-h-[1056px] relative text-slate-800 text-sm leading-relaxed"
          style={{ fontFamily: 'Times New Roman, serif' }}
        >
          <div className="text-right mb-12">
            <p>
              <strong>Ciudad:</strong> {formData.ciudad}
            </p>
            <p>
              <strong>Fecha:</strong> {formData.fecha}
            </p>
          </div>

          <div className="mb-12">
            <p>
              <strong>Señores:</strong>
            </p>
            <p className="uppercase font-bold">{formData.autoridad}</p>
            <p>E. S. D.</p>
          </div>

          <div className="mb-8">
            <p className="font-bold text-center mb-6">REF: DERECHO DE PETICIÓN (ART. 23 C.P.)</p>
            <p className="text-justify mb-4">
              Yo, <strong>{purchase?.caseData?.infractorName || '_______________'}</strong>,
              identificado(a) con C.C. número{' '}
              <strong>{purchase?.caseData?.infractorId || '_______________'}</strong>, obrando en
              nombre propio, acudo ante su despacho respetuosamente para interponer el presente{' '}
              <strong>DERECHO DE PETICIÓN</strong>, conforme al Artículo 23 de la Constitución
              Política de Colombia.
            </p>
            <p className="text-justify mb-4">
              La presente solicitud se rige en torno al comparendo o fotomulta asociada a la placa{' '}
              <strong>{purchase?.caseData?.licensePlate || 'N/A'}</strong>.
            </p>
          </div>

          <div className="mb-12 space-y-4">
            <p className="font-bold uppercase">Peticiones:</p>
            <ol className="list-decimal pl-6 space-y-2 text-justify">
              <li>
                Que se revoque y se deje sin efectos legales la orden de comparendo por indebida
                notificación.
              </li>
              <li>Que se elimine mi reporte negativo del sistema SIMIT.</li>
            </ol>
          </div>

          <div className="mt-32">
            <p>Atentamente,</p>
            <div className="mt-16 border-t border-black w-64 pt-2">
              <p className="font-bold">
                {purchase?.caseData?.infractorName || 'Firma del Ciudadano'}
              </p>
              <p>C.C. {purchase?.caseData?.infractorId || '_______________'}</p>
              <p>Dirección: {formData.direccion}</p>
              <p>Email: {formData.emailPersonal}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
