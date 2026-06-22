/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { ShieldCheck, Edit3, Lock, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GeneradorPeticion() {
  useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado del formulario
  const [formData, setFormData] = useState({
    ciudad: 'Bogotá D.C.',
    fecha: new Date().toLocaleDateString('es-CO'),
    autoridad: 'Secretaría Distrital de Movilidad',
    nombre: '',
    cedula: '',
    direccion: '',
    emailPersonal: '',
    celular: '',
    placa: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePay = async () => {
    // Validar datos obligatorios (Los usuarios pueden olvidar la dirección)
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
        productType: 'peticion_general',
        customerEmail: formData.emailPersonal,
        cedula: formData.cedula,
        celular: formData.celular || '0000000000',
        caseData: {
          infractorName: formData.nombre,
          infractorId: formData.cedula,
          licensePlate: formData.placa,
          ciudadEmision: formData.ciudad,
          autoridadTransito: formData.autoridad,
          direccionNotificacion: formData.direccion,
          shortId: `CASE${Date.now().toString().slice(-6)}`, // ID temporal para el checkout
        },
      };

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando la orden');

      // Función para inicializar el widget una vez cargado el script
      const initWompiWidget = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkout = new (window as any).WidgetCheckout({
          currency: 'COP',
          amountInCents: data.amountCop,
          reference: data.wompiReference,
          publicKey: data.publicKey,
          signature: { integrity: data.signature },
          // redirectUrl no es necesario aquí porque controlamos el callback en React
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

      // Cargar dinámicamente el script de Wompi si no existe
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
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión. Intenta de nuevo.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Panel Izquierdo: Formulario */}
      <div className="w-full md:w-1/3 bg-white border-r border-slate-200 p-8 flex flex-col shadow-2xl z-10 h-screen overflow-y-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-4">
            <FileText className="w-3.5 h-3.5" />
            Plantilla Estándar
          </div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Derecho de Petición
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

        <div className="space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Tu Nombre Completo
              </label>
              <input
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Cédula
              </label>
              <input
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                placeholder="Ej. 1090..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Placa del Vehículo
              </label>
              <input
                name="placa"
                value={formData.placa}
                onChange={handleChange}
                placeholder="Ej. ABC123"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Celular
              </label>
              <input
                name="celular"
                value={formData.celular}
                onChange={handleChange}
                placeholder="Ej. 300..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Correo Electrónico (Para envío)
            </label>
            <input
              name="emailPersonal"
              value={formData.emailPersonal}
              onChange={handleChange}
              placeholder="tu@correo.com"
              type="email"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <hr className="my-4 border-slate-100" />

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Ciudad del Tránsito
            </label>
            <input
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Autoridad a la que va dirigida
            </label>
            <input
              name="autoridad"
              value={formData.autoridad}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Tu Dirección Física (Para respuestas)
            </label>
            <input
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Calle 1 # 2-3"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 bg-white">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-600">Total a pagar:</span>
            <span className="text-2xl font-black text-slate-900">$25.000 COP</span>
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

      {/* Panel Derecho: Previsualización con Efecto Blur y Marca de Agua */}
      <div className="w-full md:w-2/3 bg-slate-200 p-4 md:p-8 h-screen overflow-y-auto flex justify-center relative select-none">
        <div
          className="bg-white w-full max-w-[800px] shadow-sm p-12 min-h-[1056px] relative text-slate-800 text-sm leading-relaxed"
          style={{ fontFamily: 'Times New Roman, serif' }}
        >
          {/* Marca de agua */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
            <span className="text-[120px] font-black transform -rotate-45">VISTA PREVIA</span>
          </div>

          <div className="relative z-10">
            <div className="text-right mb-12 text-slate-600">
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
              <p className="font-bold text-center mb-6 underline">
                REF: DERECHO DE PETICIÓN (ART. 23 C.P.)
              </p>
              <p className="text-justify mb-4">
                Yo,{' '}
                <strong className="bg-yellow-100 px-1">
                  {formData.nombre || 'NOMBRE DEL CIUDADANO'}
                </strong>
                , mayor de edad, identificado(a) con la Cédula de Ciudadanía número{' '}
                <strong className="bg-yellow-100 px-1">
                  {formData.cedula || 'NÚMERO DE CÉDULA'}
                </strong>
                , obrando en nombre propio, acudo ante su despacho muy respetuosamente para
                interponer el presente <strong>DERECHO DE PETICIÓN</strong>, en virtud de lo
                consagrado en el Artículo 23 de la Constitución Política de Colombia y la Ley 1755
                de 2015.
              </p>
              <p className="text-justify mb-4">
                La presente solicitud se rige en torno a la orden de comparendo y/o fotomulta
                asociada al vehículo de placa{' '}
                <strong className="bg-yellow-100 px-1">{formData.placa || 'PLACA'}</strong>.
              </p>
            </div>

            <div className="mb-8 blur-[3px]">
              <p className="font-bold uppercase mb-2">Hechos y Fundamentos de Derecho:</p>
              <p className="text-justify mb-2">
                1. El documento cuenta con una estructura legal fundamentada en la Sentencia C-038
                de 2020 de la Corte Constitucional.
              </p>
              <p className="text-justify mb-2">
                2. Se solicita la aplicación del principio de plena identificación del infractor, ya
                que los sistemas de fotodetección no pueden imponer responsabilidad solidaria al
                propietario del vehículo.
              </p>
              <p className="text-justify mb-2">
                3. Al adquirir este documento, el sistema revelará todos los fundamentos jurídicos
                exactos para su caso, redactados por expertos.
              </p>
            </div>

            <div className="mb-12">
              <p className="font-bold uppercase mb-4">Peticiones:</p>
              <ol className="list-decimal pl-6 space-y-2 text-justify font-bold">
                <li>Que se revoque y se deje sin efectos legales la orden de comparendo.</li>
                <li>Que se elimine de forma inmediata mi reporte negativo del sistema SIMIT.</li>
                <li>
                  <span className="blur-[4px]">
                    Que se aplique la caducidad según el artículo 161 del CPACA.
                  </span>
                </li>
              </ol>
            </div>

            <div className="mt-24">
              <p>Atentamente,</p>
              <div className="mt-16 border-t border-slate-800 w-64 pt-2">
                <p className="font-bold uppercase">{formData.nombre || 'FIRMA DEL CIUDADANO'}</p>
                <p>C.C. {formData.cedula || '________________'}</p>
                <p>Dir: {formData.direccion || '________________'}</p>
                <p>Email: {formData.emailPersonal || '________________'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
