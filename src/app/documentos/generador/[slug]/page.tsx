'use client';

import { useState, useEffect, use } from 'react';
import { ShieldCheck, Lock, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DocumentType,
  DOCUMENT_TEMPLATES,
  DOCUMENT_TYPE_LABELS,
  DocumentBlock,
} from '@/lib/legal/document-templates';

interface GeneradorDinamicoProps {
  params: Promise<{ slug: string }>;
}

export default function GeneradorDinamico({ params }: GeneradorDinamicoProps) {
  const router = useRouter();
  const { slug: rawSlug } = use(params);

  // Normalizar el slug de la URL (guiones a guiones bajos)
  const slug = rawSlug.replace(/-/g, '_') as DocumentType;
  const tmpl: DocumentBlock | undefined = DOCUMENT_TEMPLATES[slug];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [precioDisplay, setPrecioDisplay] = useState<string | null>(null);

  // Redirigir a inicio si la plantilla no es válida
  useEffect(() => {
    if (!tmpl) {
      router.push('/');
    }
  }, [tmpl, router]);

  // Estado del formulario
  const [formData, setFormData] = useState({
    ciudad: 'Bogotá D.C.',
    fecha: '', // Inicializar vacío para evitar mismatch de hidratación SSR
    autoridad: tmpl?.nombreArchivo.toLowerCase().includes('bucaramanga')
      ? 'Secretaría de Tránsito de Bucaramanga'
      : 'Secretaría Distrital de Movilidad',
    nombre: '',
    cedula: '',
    direccion: '',
    emailPersonal: '',
    celular: '',
    placa: '',
    ticketNumber: '',
    fechaHechos: '',
  });

  // Cargar query parameters de la URL para autocompletar el formulario y establecer fecha local
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const nombre = search.get('nombre');
      const cedula = search.get('cedula');
      const placa = search.get('placa');
      const ciudad = search.get('ciudad');
      const autoridad = search.get('autoridad');
      const direccion = search.get('direccion');
      const email = search.get('email');
      const celular = search.get('celular');
      const ticketNumber = search.get('ticketNumber');
      const fechaHechos = search.get('fechaHechos');

      setFormData((prev) => ({
        ...prev,
        fecha: new Date().toLocaleDateString('es-CO'),
        nombre: nombre || prev.nombre,
        cedula: cedula || prev.cedula,
        placa: (placa === 'N/A' ? '' : placa) || prev.placa,
        ciudad: ciudad || prev.ciudad,
        autoridad: autoridad || prev.autoridad,
        direccion: direccion || prev.direccion,
        emailPersonal: email || prev.emailPersonal,
        celular: celular || prev.celular,
        ticketNumber: ticketNumber || prev.ticketNumber,
        fechaHechos: fechaHechos || prev.fechaHechos,
      }));
    }
  }, []);

  // Cargar el precio dinámicamente desde el servidor al montar el componente
  useEffect(() => {
    if (!tmpl) return;
    fetch('/api/payments/prices')
      .then((res) => res.json())
      .then((precios) => {
        const precioConfig = precios[slug] || precios['peticion_general'];
        if (precioConfig?.display) {
          setPrecioDisplay(precioConfig.display);
        }
      })
      .catch(() => {
        setPrecioDisplay('$25.000');
      });
  }, [slug, tmpl]);

  if (!tmpl) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePay = async () => {
    if (
      !formData.nombre ||
      !formData.cedula ||
      !formData.emailPersonal ||
      !formData.direccion ||
      !formData.ciudad ||
      !formData.autoridad
    ) {
      setError(
        'Por favor, completa todos los campos obligatorios (Nombre, Cédula, Email, Dirección, Ciudad y Autoridad) para continuar.'
      );
      return;
    }
    setError('');
    setLoading(true);

    try {
      const payload = {
        productType: slug.replace(/-/g, '_'),
        customerEmail: formData.emailPersonal,
        cedula: formData.cedula,
        celular: formData.celular || '0000000000',
        caseData: {
          infractorName: formData.nombre,
          infractorId: formData.cedula,
          licensePlate: formData.placa || 'N/A',
          ticketNumber: formData.ticketNumber || 'POR_DEFINIR',
          fechaHechos: formData.fechaHechos || '',
          ciudadEmision: formData.ciudad,
          autoridadTransito: formData.autoridad,
          direccionNotificacion: formData.direccion,
          shortId: `CASE${Date.now().toString().slice(-6)}`,
        },
      };

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando la orden');

      if (typeof window !== 'undefined' && data.downloadToken) {
        sessionStorage.setItem(`download_token_${data.wompiReference}`, data.downloadToken);
      }

      const initWompiWidget = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkout = new (window as any).WidgetCheckout({
          currency: 'COP',
          amountInCents: data.amountCop,
          reference: data.wompiReference,
          publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
          signature: { integrity: data.signature },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checkout.open((result: any) => {
          const transaction = result.transaction;
          if (transaction.status === 'APPROVED') {
            window.location.href = `/documentos/confirmacion?ref=${data.wompiReference}`;
          } else {
            setError(`El pago fue ${transaction.status}. Por favor intenta nuevamente.`);
            setLoading(false);
          }
        });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).WidgetCheckout) {
        const script = document.createElement('script');
        script.src = 'https://checkout.wompi.co/widget.js';
        script.async = true;
        script.onload = initWompiWidget;
        script.onerror = () => {
          setError('No se pudo cargar la pasarela de pagos. Verifica tu conexión.');
          setLoading(false);
        };
        document.body.appendChild(script);
      } else {
        initWompiWidget();
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'Error de conexión. Intenta de nuevo.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const labelDocumento = DOCUMENT_TYPE_LABELS[slug] || 'Documento Legal';
  const cleanLabel = labelDocumento
    .replace(/anos/gi, 'años')
    .replace(/prescripcion/gi, 'prescripción');

  const dataForPDF = {
    infractorName: formData.nombre || 'NOMBRE DEL CIUDADANO',
    infractorId: formData.cedula || 'NÚMERO DE CÉDULA',
    licensePlate: formData.placa || 'PLACA',
    ticketNumber: formData.ticketNumber || '110010002233',
    fechaHechos: formData.fechaHechos,
    antiguedad: 'más de 3 años',
    estadoCoactivo: 'SÍ',
    tipoInfraccion: 'C29 (Exceso de velocidad)',
    shortId: 'TEST12',
  };

  // Obtener líneas del cuerpo para la previsualización
  const cuerpoLineas = tmpl.cuerpo(dataForPDF);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Panel Izquierdo: Formulario */}
      <div className="w-full md:w-1/3 bg-white border-r border-slate-200 p-8 flex flex-col shadow-2xl z-10 h-screen overflow-y-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-4">
            <FileText className="w-3.5 h-3.5" />
            Plantilla Activa: {cleanLabel}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Personaliza tu Documento
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Completa tus datos. A la derecha verás cómo se redacta tu documento al instante.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-5 flex-1 mt-2">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tu Nombre Completo
              </label>
              <input
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cédula
              </label>
              <input
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                placeholder="Ej. 1090..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Placa del Vehículo (Opcional)
              </label>
              <input
                name="placa"
                value={formData.placa}
                onChange={handleChange}
                placeholder="Ej. ABC123"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Celular
              </label>
              <input
                name="celular"
                value={formData.celular}
                onChange={handleChange}
                placeholder="Ej. 300..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico (Para envío)
            </label>
            <input
              name="emailPersonal"
              value={formData.emailPersonal}
              onChange={handleChange}
              placeholder="tu@correo.com"
              type="email"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Resoluciones / Comparendos
              </label>
              <input
                name="ticketNumber"
                value={formData.ticketNumber}
                onChange={handleChange}
                placeholder="Ej. 231133, 261950..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fecha Hechos (Opcional)
              </label>
              <input
                name="fechaHechos"
                value={formData.fechaHechos}
                onChange={handleChange}
                placeholder="Ej. años 2016 y 2017"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
              />
            </div>
          </div>

          <hr className="my-6 border-slate-200" />

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ciudad del Tránsito
            </label>
            <input
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Autoridad a la que va dirigida
            </label>
            <input
              name="autoridad"
              value={formData.autoridad}
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tu Dirección Física (Para respuestas)
            </label>
            <input
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Calle 1 # 2-3"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 bg-white">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-600">Total a pagar:</span>
            {precioDisplay ? (
              <span className="text-2xl font-black text-slate-900">{precioDisplay} COP</span>
            ) : (
              <span className="text-2xl font-black text-slate-400 animate-pulse">Cargando...</span>
            )}
          </div>
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            Pagar y Descargar PDF
          </button>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            Pago seguro procesado por Wompi Bancolombia
          </div>
        </div>
      </div>

      {/* Panel Derecho: Previsualización de Hojas Múltiples (Estilo Word) */}
      <div className="hidden print-only print:flex items-center justify-center w-full h-screen bg-white">
        <div className="text-center p-8 max-w-2xl border-4 border-slate-900">
          <ShieldCheck className="w-20 h-20 mx-auto text-slate-900 mb-6" />
          <h1 className="text-3xl font-black mb-4">Vista Previa Protegida</h1>
          <p className="text-xl">
            Debes completar el proceso de pago para descargar e imprimir el documento legal final
            con los fundamentos jurídicos exactos.
          </p>
        </div>
      </div>

      <div className="no-print w-full md:w-2/3 bg-[#0c0d0e] p-4 md:p-8 h-screen overflow-y-auto flex flex-col items-center gap-8 relative select-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-400/5 blur-[120px] pointer-events-none z-0" />

        {/* 📄 PÁGINA 1: Encabezado, Hechos y Fundamentos de Derecho */}
        <div
          className="bg-white w-full max-w-[800px] shadow-2xl p-12 min-h-[1056px] h-fit relative text-slate-800 text-sm leading-relaxed z-10 flex flex-col justify-between"
          style={{ fontFamily: 'Times New Roman, serif' }}
        >
          {/* Marca de agua */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] z-0">
            <span className="text-[90px] font-black transform -rotate-45">DESMULTA</span>
          </div>

          <div className="relative z-10">
            <div className="text-right mb-10 text-slate-600">
              <p>
                <strong>Ciudad:</strong> {formData.ciudad}
              </p>
              <p>
                <strong>Fecha:</strong> {formData.fecha}
              </p>
            </div>

            <div className="mb-10">
              <p>
                <strong>Señores:</strong>
              </p>
              <p className="uppercase font-bold">{formData.autoridad}</p>
              <p>E. S. D.</p>
            </div>

            <div className="mb-6">
              <p className="font-bold text-center mb-6 underline uppercase">
                REF:{' '}
                {tmpl.titulo.replace(/anos/gi, 'años').replace(/prescripcion/gi, 'prescripción')}
              </p>
              <p className="text-slate-400 text-xs text-center italic mb-4">
                {tmpl.subtitulo.replace(/anos/gi, 'años').replace(/prescripcion/gi, 'prescripción')}
              </p>
              <p className="text-justify mb-4">
                Yo,{' '}
                <strong className="bg-yellow-100/80 px-1">
                  {formData.nombre || '[Nombre del Peticionario]'}
                </strong>
                , mayor de edad, identificado(a) con la Cédula de Ciudadanía número{' '}
                <strong className="bg-yellow-100/80 px-1">
                  {formData.cedula || '[Documento de Identidad]'}
                </strong>
                , obrando en nombre propio, acudo ante su despacho muy respetuosamente para
                interponer el presente recurso, con fundamento en el Artículo 23 de la Constitución
                Política y las normas vigentes.
              </p>
              {formData.placa && (
                <p className="text-justify mb-4">
                  La presente reclamación versa sobre la orden de comparendo y/o resolución de multa
                  asociada al vehículo de placa{' '}
                  <strong className="bg-yellow-100/80 px-1">{formData.placa}</strong>.
                </p>
              )}
            </div>

            {/* Hechos y Fundamentos de Derecho: DIFUMINADOS pero visibles debajo (sin líneas negras) */}
            <div className="mt-8">
              <p className="font-bold uppercase mb-3">I. HECHOS Y FUNDAMENTOS DE DERECHO:</p>
              <div className="space-y-3 text-justify text-slate-700/80 blur-[4.5px] pointer-events-none select-none leading-relaxed">
                {cuerpoLineas.length > 0 ? (
                  cuerpoLineas.map((linea, idx) => (
                    <p key={idx} className="mb-2">
                      {linea ||
                        'Establece la norma nacional que las sanciones e infracciones de tránsito prescriben en el término correspondiente.'}
                    </p>
                  ))
                ) : (
                  <>
                    <p>
                      1. Que en la base de datos de la secretaría de movilidad figura un cobro
                      coactivo notificado que excede los términos establecidos por la ley.
                    </p>
                    <p>
                      2. Conforme al artículo 159 de la ley 769 de 2002 y el estatuto tributario, la
                      acción de cobro prescribe por inoperancia administrativa.
                    </p>
                    <p>
                      3. La administración no ejerció la acción de cobro coactivo de manera
                      oportuna, operando la pérdida de fuerza ejecutoria.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-right text-[10px] text-slate-400 font-bold mt-8 border-t border-slate-100 pt-2 relative z-10">
            Página 1 de 2
          </div>
        </div>

        {/* 📄 PÁGINA 2: Peticiones, Notificaciones y Firmas */}
        <div
          className="bg-white w-full max-w-[800px] shadow-2xl p-12 min-h-[1056px] h-fit relative text-slate-800 text-sm leading-relaxed z-10 flex flex-col justify-between"
          style={{ fontFamily: 'Times New Roman, serif' }}
        >
          {/* Marca de agua */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] z-0">
            <span className="text-[90px] font-black transform -rotate-45">DESMULTA</span>
          </div>

          <div className="relative z-10">
            {/* Peticiones: las 2 primeras legibles, la última difuminada */}
            <div className="mb-8">
              <p className="font-bold uppercase mb-4">
                {tmpl.seccion1Titulo || 'II. PETICIONES CONCRETAS:'}
              </p>
              <ol className="list-decimal pl-6 space-y-3 text-justify">
                {tmpl.facultades.slice(0, 2).map((fac, idx) => (
                  <li key={idx} className="font-medium text-slate-850">
                    {fac.replace(/prescripcion/gi, 'prescripción')}
                  </li>
                ))}
                <li className="blur-[4.5px] pointer-events-none select-none text-slate-600">
                  {tmpl.facultades[2] ||
                    'Que se actualice el sistema SIMIT y RUNT eliminando de manera definitiva cualquier reporte negativo asociado.'}
                </li>
              </ol>
            </div>

            {/* Notificaciones y Anexos */}
            <div className="mb-8">
              <p className="font-bold uppercase mb-3">
                {tmpl.seccion2Titulo || 'III. NOTIFICACIONES Y ANEXOS:'}
              </p>
              <p className="text-justify mb-2">
                Recibiré notificaciones físicas y respuestas oficiales en la dirección aportada en
                este escrito, así como en el correo electrónico registrado para el envío del
                expediente:
              </p>
              <p className="font-bold bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 inline-block">
                {formData.emailPersonal || '[Tu Correo Electrónico]'}
              </p>
              <p className="text-xs text-slate-500 mt-3 italic">
                Anexo: Copia de la Cédula de Ciudadanía y captura de pantalla del estado de cuenta
                SIMIT.
              </p>
            </div>

            {/* Firma del Peticionario */}
            <div className="mt-20">
              <p className="mb-14">Cordialmente,</p>
              <div className="border-t border-slate-800 w-72 pt-3">
                <p className="font-bold uppercase text-slate-900">
                  {formData.nombre || 'FIRMA DEL CIUDADANO'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  C.C. {formData.cedula || '_________________________'}
                </p>
                <p className="text-xs text-slate-500">
                  Dirección: {formData.direccion || '_________________________'}
                </p>
                <p className="text-xs text-slate-500">
                  Celular: {formData.celular || '_________________________'}
                </p>
              </div>
            </div>
          </div>

          <div className="text-right text-[10px] text-slate-400 font-bold mt-8 border-t border-slate-100 pt-2 relative z-10">
            Página 2 de 2
          </div>
        </div>
      </div>
    </div>
  );
}
