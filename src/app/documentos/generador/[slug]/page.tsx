'use client';

import { useState, useEffect, use } from 'react';
import { ShieldCheck, ShieldAlert, Lock, FileText, Loader2, ChevronDown } from 'lucide-react';
import { useExpedienteStore } from '@/store/useExpedienteStore';
import { useRouter } from 'next/navigation';
import {
  DocumentType,
  DOCUMENT_TEMPLATES,
  DOCUMENT_TYPE_LABELS,
  DocumentBlock,
} from '@/lib/legal/document-templates';
import { TRANSIT_AUTHORITIES } from '@/data/transit-authorities';

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
  const [selectedAuthId, setSelectedAuthId] = useState<string>('');
  const [isManualAuth, setIsManualAuth] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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

  // Cargar datos almacenados de forma segura en Zustand para autocompletar el formulario
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { nombre, cedula, placa, ciudad, autoridad, direccion, email, celular } =
        useExpedienteStore.getState();

      const cityToMatch = ciudad || '';
      const auth = TRANSIT_AUTHORITIES.find(
        (a) =>
          a.ciudad.toLowerCase() === cityToMatch.toLowerCase() ||
          `${a.ciudad} (${a.departamento})`.toLowerCase() === cityToMatch.toLowerCase()
      );

      if (auth) {
        setSelectedAuthId(auth.id);
        setIsManualAuth(false);
      } else {
        setIsManualAuth(true);
      }

      setFormData((prev) => ({
        ...prev,
        fecha: new Date().toLocaleDateString('es-CO'),
        nombre: nombre || prev.nombre,
        cedula: cedula || prev.cedula,
        placa: (placa === 'N/A' ? '' : placa) || prev.placa,
        ciudad: cityToMatch,
        autoridad: autoridad || auth?.nombreOficial || prev.autoridad,
        direccion: direccion || prev.direccion,
        emailPersonal: email || prev.emailPersonal,
        celular: celular || prev.celular,
      }));
    }
  }, []);

  // Cargar el precio dinámicamente desde el servidor al montar el componente
  useEffect(() => {
    if (!tmpl) return;
    const FALLBACK_PRICES: Record<string, string> = {
      peticion_general: '$39.000',
      prescripcion_directa: '$59.000',
      doble_prescripcion: '$79.000',
      nulidad_notificacion: '$49.000',
      tutela_silencio: '$39.000',
      caducidad_1_anio: '$59.000',
      nulidad_falta_identidad: '$49.000',
    };

    fetch('/api/payments/prices')
      .then((res) => res.json())
      .then((precios) => {
        const precioConfig = precios[slug] || precios['peticion_general'];
        if (precioConfig?.display) {
          setPrecioDisplay(precioConfig.display);
        }
      })
      .catch(() => {
        const key = slug.replace(/-/g, '_');
        setPrecioDisplay(FALLBACK_PRICES[key] || '$14.900');
      });
  }, [slug, tmpl]);

  if (!tmpl) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCiudadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    const auth = TRANSIT_AUTHORITIES.find(
      (a) =>
        a.ciudad.toLowerCase() === val.toLowerCase() ||
        `${a.ciudad} (${a.departamento})`.toLowerCase() === val.toLowerCase()
    );

    if (auth) {
      setIsManualAuth(false);
      setSelectedAuthId(auth.id);
      setFormData({
        ...formData,
        ciudad: auth.ciudad,
        autoridad: auth.nombreOficial,
      });
    } else {
      setIsManualAuth(true);
      setSelectedAuthId('');
      setFormData({
        ...formData,
        ciudad: val,
      });
    }
  };

  const handlePay = async () => {
    if (loading) return;
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

      // 🛡️ FIX: sessionStorage eliminado. El downloadToken se maneja vía Cookie HttpOnly desde el backend.

      interface WompiResult {
        transaction: { status: string };
      }
      interface ExtendedWindow extends Window {
        WidgetCheckout?: new (options: Record<string, unknown>) => { open: (cb: (res: WompiResult) => void) => void };
      }
      const extWindow = window as unknown as ExtendedWindow;

      const initWompiWidget = () => {
        if (!extWindow.WidgetCheckout) return;
        
        const checkout = new extWindow.WidgetCheckout({
          currency: 'COP',
          amountInCents: data.amountCop,
          reference: data.wompiReference,
          publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
          signature: { integrity: data.signature },
        });

        checkout.open((result) => {
          const transaction = result.transaction;
          if (transaction.status === 'APPROVED') {
            window.location.href = `/documentos/confirmacion?ref=${data.wompiReference}`;
          } else {
            setError(`El pago fue ${transaction.status}. Por favor intenta nuevamente.`);
            setLoading(false);
          }
        });
      };

      if (!extWindow.WidgetCheckout) {
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

          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Ciudad del Tránsito</span>
              {!isManualAuth && selectedAuthId && (
                <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[9px]">
                  Directorio Oficial
                </span>
              )}
            </label>
            <div className="relative">
              <input
                name="ciudad"
                value={formData.ciudad}
                onChange={handleCiudadInputChange}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                autoComplete="off"
                placeholder="Ej. Cali, Bogotá, Envigado..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-slate-900 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm mb-3"
              />
              <ChevronDown
                className={`absolute right-4 top-[14px] w-5 h-5 text-slate-400 transition-transform duration-200 pointer-events-none ${showDropdown ? 'rotate-180' : ''}`}
              />
            </div>
            {showDropdown && (
              <div className="absolute z-50 w-full bg-white border-2 border-slate-200 rounded-xl mt-[-10px] shadow-xl max-h-56 overflow-y-auto">
                {TRANSIT_AUTHORITIES.filter(
                  (a) =>
                    a.ciudad.toLowerCase().includes(formData.ciudad.toLowerCase()) ||
                    a.departamento.toLowerCase().includes(formData.ciudad.toLowerCase())
                ).map((auth) => (
                  <div
                    key={auth.id}
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-100 last:border-0 transition-colors"
                    onClick={() => {
                      setIsManualAuth(false);
                      setSelectedAuthId(auth.id);
                      setFormData({
                        ...formData,
                        ciudad: auth.ciudad,
                        autoridad: auth.nombreOficial,
                      });
                      setShowDropdown(false);
                    }}
                  >
                    <span className="font-bold text-slate-900">{auth.ciudad}</span>
                    <span className="text-slate-500 text-xs ml-1">({auth.departamento})</span>
                  </div>
                ))}
                {TRANSIT_AUTHORITIES.filter(
                  (a) =>
                    a.ciudad.toLowerCase().includes(formData.ciudad.toLowerCase()) ||
                    a.departamento.toLowerCase().includes(formData.ciudad.toLowerCase())
                ).length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-500 italic">
                    Sin coincidencias. Ingreso manual activado.
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Autoridad a la que va dirigida
            </label>
            <input
              name="autoridad"
              value={formData.autoridad}
              onChange={handleChange}
              disabled={!isManualAuth}
              placeholder="Ej. Secretaría de Movilidad..."
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {!isManualAuth && selectedAuthId && (
              <div className="mt-2 text-xs text-slate-500 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                <p>📍 {TRANSIT_AUTHORITIES.find((a) => a.id === selectedAuthId)?.direccion}</p>
                <p>
                  📧 {TRANSIT_AUTHORITIES.find((a) => a.id === selectedAuthId)?.emailNotificaciones}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  ℹ️ Datos extraídos de directorios públicos. Verifica su disponibilidad.
                </p>
              </div>
            )}
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
          {/* Alerta de Disclaimer Legal Obligatorio */}
          <div className="mb-6 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex gap-3 items-start text-left shadow-sm">
            <ShieldAlert className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-black text-[11px] text-yellow-700 dark:text-yellow-400 uppercase tracking-widest mb-1.5">
                Aviso de Alcance Legal
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                Esta petición inicia un trámite de defensa formal. La decisión de exonerar o
                eliminar la multa depende de forma exclusiva de la Secretaría de Tránsito y de los
                hechos de tu caso. Desmulta no garantiza ni puede asegurar un resultado positivo del
                100% de la radicación.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-600">Total a pagar:</span>
            {precioDisplay ? (
              <span className="text-2xl font-black text-slate-900">{precioDisplay}</span>
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
              <p className="uppercase font-bold text-slate-900">
                {formData.autoridad || '[Autoridad de Tránsito]'}
              </p>

              {!isManualAuth && selectedAuthId && (
                <div className="text-slate-600 mt-1">
                  <p>{TRANSIT_AUTHORITIES.find((a) => a.id === selectedAuthId)?.direccion}</p>
                  <p>
                    {TRANSIT_AUTHORITIES.find((a) => a.id === selectedAuthId)?.emailNotificaciones}
                  </p>
                </div>
              )}

              <p className="mt-2">E. S. D.</p>
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
              <div className="flex flex-col gap-2 mt-3">
                <p className="font-bold bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-fit">
                  Física: {formData.direccion || '[Tu Dirección Física]'}
                </p>
                <p className="font-bold bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-fit">
                  Email: {formData.emailPersonal || '[Tu Correo Electrónico]'}
                </p>
              </div>
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
