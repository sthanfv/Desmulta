// src/lib/calculadora-legal.ts
/**
 * 🛡️ AUDITORÍA 2026-08-04: (Seguridad T-FE-01)
 * Este archivo fue refactorizado. La lógica iterativa y reglas de negocio fueron extraídas
 * al Backend for Frontend (BFF) y al Motor en Go, para evitar exponer la propiedad intelectual
 * en el bundle de Next.js y reducir el peso del cliente.
 */

// ─── Tipos Públicos (Mantenemos los contratos para TypeScript) ──────────────────

export interface ResultadoPrescripcion {
  tiempoTranscurrido: {
    anos: number;
    meses: number;
    dias: number;
  };
  diasTotales: number;
  estado: 'VIGENTE' | 'ALERTA' | 'CADUCIDAD ESTIMADA';
  estadoLegal: 'PRESCRITO' | 'CADUCADO' | 'IMPUGNABLE_C038' | 'VIGENTE' | 'REQUIERE_REVISION';
  porcentajeCaducidad: number;
  probabilidadExito: string;
  disclaimerLegal: string;
  isViable: boolean;
}

export interface ResultadoCalculadoraCompleta {
  prescripcion: ResultadoPrescripcion;
  financiero: {
    valorOriginal: number;
    interesesAcumulados: number;
    valorTotalActual: number;
    tasaEAVigente: number;
    valorEnSMMLV: number;
    valorEnSMDLV: number;
    smmlvVigente: number;
    smdlvVigente: number;
    vigenciaAnio: number;
    fechaCalculo: string;
  };
}

/**
 * Función proxy ligera para la UI. Delega el cálculo pesado y la IP al backend.
 */
export async function calcularMultaCompleta(
  valorMulta2026: number,
  fechaInfraccionISO: string,
  tieneCobroCoactivo: boolean = false,
  textoOCR: string = ''
): Promise<ResultadoCalculadoraCompleta> {
  const response = await fetch('/api/internal/calculadora', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valorMulta2026, fechaInfraccionISO, tieneCobroCoactivo, textoOCR }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Fallo interno en el motor de cálculo');
  }

  return response.json();
}
