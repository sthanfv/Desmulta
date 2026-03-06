// src/lib/calculadora-legal.ts

export interface ResultadoPrescripcion {
  tiempoTranscurrido: {
    anos: number;
    meses: number;
    dias: number;
  };
  diasTotales: number;
  estado: 'VIGENTE' | 'ALERTA' | 'PRESCRITA';
  porcentajeCaducidad: number;
  probabilidadExito: string;
  disclaimerLegal: string;
}

/**
 * Motor Matemático de Prescripción (Alta Precisión)
 * Calcula el tiempo exacto transcurrido mitigando errores de Timezone.
 */
export function calcularViabilidadLegal(
  fechaInfraccionISO: string,
  tieneCobroCoactivo: boolean
): ResultadoPrescripcion {
  // 1. Sanitización estricta (Forzamos UTC para evitar saltos de día por zona horaria de Colombia UTC-5)
  const fechaInfraccion = new Date(`${fechaInfraccionISO}T00:00:00Z`);
  const hoy = new Date();

  // Congelamos 'hoy' a las 00:00:00 UTC para comparar manzanas con manzanas
  const hoyUTC = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));

  if (isNaN(fechaInfraccion.getTime())) {
    throw new Error('Falla Crítica: Formato de fecha inválido inyectado al motor.');
  }

  // 2. Cálculo de la fecha límite teórica (El umbral de la ley)
  // Ley 1843 y CNT: 3 años normales. Si hay coactivo, son 3 años adicionales desde la resolución.
  // Para el motor, si hay coactivo, el "horizonte" de prescripción se aleja a 6 años totales como peor escenario.
  const anosParaPrescribir = tieneCobroCoactivo ? 6 : 3;
  const fechaLimite = new Date(fechaInfraccion.getTime());
  fechaLimite.setUTCFullYear(fechaLimite.getUTCFullYear() + anosParaPrescribir);

  // 3. Diferencia cronológica exacta (Manejo de bisiestos intrínseco en JS Date)
  let anos = hoyUTC.getUTCFullYear() - fechaInfraccion.getUTCFullYear();
  let meses = hoyUTC.getUTCMonth() - fechaInfraccion.getUTCMonth();
  let dias = hoyUTC.getUTCDate() - fechaInfraccion.getUTCDate();

  if (dias < 0) {
    meses--;
    // Tomamos los días del mes anterior
    const ultimoDiaMesAnterior = new Date(
      Date.UTC(hoyUTC.getUTCFullYear(), hoyUTC.getUTCMonth(), 0)
    ).getUTCDate();
    dias += ultimoDiaMesAnterior;
  }
  if (meses < 0) {
    anos--;
    meses += 12;
  }

  // 4. Cálculos de progreso y días absolutos
  const msPorDia = 1000 * 60 * 60 * 24;
  const diasTotales = Math.floor((hoyUTC.getTime() - fechaInfraccion.getTime()) / msPorDia);
  const diasMeta = Math.floor((fechaLimite.getTime() - fechaInfraccion.getTime()) / msPorDia);

  let porcentaje = (diasTotales / diasMeta) * 100;
  if (porcentaje > 100) porcentaje = 100;
  if (porcentaje < 0) porcentaje = 0;

  // 5. Motor de Decisión (Triage)
  let estado: 'VIGENTE' | 'ALERTA' | 'PRESCRITA';
  let probabilidadExito: string;

  if (porcentaje >= 100) {
    estado = 'PRESCRITA';
    probabilidadExito = '95% - Altamente Viable';
  } else if (porcentaje >= 90) {
    estado = 'ALERTA';
    probabilidadExito = '70% - En zona de riesgo de cobro / Cerca a caducar';
  } else {
    estado = 'VIGENTE';
    probabilidadExito = '30% - Viable solo si existen fallas de notificación (Sentencia C-038)';
  }

  // 6. La Capa de Protección Legal (El Disclaimer Aprox)
  const disclaimer = `⚠️ Cálculo aproximado. Llevas exactamente ${anos} años, ${meses} meses y ${dias} días desde la infracción. Este sistema asume una probabilidad de éxito del ${
    probabilidadExito.split('%')[0]
  }% basándose en el tiempo calendario bruto. La exactitud técnica de la prescripción puede variar entre 3 y 15 días hábiles debido a los tiempos de notificación en oficinas de correo certificado y edictos de la Secretaría de Tránsito.`;

  return {
    tiempoTranscurrido: { anos, meses, dias },
    diasTotales,
    estado,
    porcentajeCaducidad: Number(porcentaje.toFixed(2)),
    probabilidadExito,
    disclaimerLegal: disclaimer,
  };
}
